// calendar.js
// Fetches speciesCalendar.json + searchCorpus.json, renders month sections,
// handles sort, filter (controlled autocomplete) and modal.

(async function () {
    // ── State ──────────────────────────────────────────────────────────────────
    let allSpecies = [];
    let corpus = [];          // pre-built search suggestions
    let sortMode = 'earliest';  // 'earliest' | 'latest'
    let activeFilter = null;        // corpus item currently applied, or null

    // ── Italian month names & abbreviations ───────────────────────────────────
    const MONTHS = [
        { full: 'Gennaio', abbr: 'GEN' },
        { full: 'Febbraio', abbr: 'FEB' },
        { full: 'Marzo', abbr: 'MAR' },
        { full: 'Aprile', abbr: 'APR' },
        { full: 'Maggio', abbr: 'MAG' },
        { full: 'Giugno', abbr: 'GIU' },
        { full: 'Luglio', abbr: 'LUG' },
        { full: 'Agosto', abbr: 'AGO' },
        { full: 'Settembre', abbr: 'SET' },
        { full: 'Ottobre', abbr: 'OTT' },
        { full: 'Novembre', abbr: 'NOV' },
        { full: 'Dicembre', abbr: 'DIC' },
    ];

    const TYPE_ORDER = ['genus', 'species', 'synonym', 'taxon'];
    const TYPE_LABEL = {
        genus: 'Genere',
        species: 'Specie',
        synonym: 'Nome corrente',
        taxon: 'Taxon',
    };

    // ── Fetch ──────────────────────────────────────────────────────────────────
    try {
        const [calRes, corpusRes] = await Promise.all([
            fetch('./speciesCalendar.json'),
            fetch('./searchCorpus.json'),
        ]);
        if (!calRes.ok) throw new Error(`speciesCalendar.json: HTTP ${calRes.status}`);
        if (!corpusRes.ok) throw new Error(`searchCorpus.json: HTTP ${corpusRes.status}`);

        const calData = await calRes.json();
        const corpusData = await corpusRes.json();

        allSpecies = calData.species || [];
        corpus = corpusData.corpus || [];
    } catch (err) {
        console.error('Failed to load data:', err);
        document.getElementById('calendar-container').innerHTML =
            '<p class="no-species">Errore nel caricamento dei dati.</p>';
        return;
    }

    // ── Helpers ────────────────────────────────────────────────────────────────

    function monthIndex(mmdd) { return parseInt(mmdd.split('-')[0], 10) - 1; }
    function dayOfMonth(mmdd) { return parseInt(mmdd.split('-')[1], 10); }

    function formatDate(isoDate) {
        if (!isoDate) return '—';
        const [y, m, d] = isoDate.split('-');
        return `${d}/${m}/${y}`;
    }

    function buildMonthBars(monthlyCount) {
        const max = Math.max(...monthlyCount, 1);
        return monthlyCount.map((count, i) => {
            const pct = Math.round((count / max) * 100);
            const hasData = count > 0 ? 'has-data' : '';
            return `
        <div class="month-bar-wrap" title="${MONTHS[i].abbr}: ${count}">
          <div class="month-bar ${hasData}" style="height:${pct}%"></div>
          <span class="month-bar-label">${MONTHS[i].abbr.charAt(0)}</span>
        </div>`;
        }).join('');
    }

    /** Returns the subset of allSpecies to show given the active filter */
    function visibleSpecies() {
        if (!activeFilter) return allSpecies;
        const allowed = new Set(activeFilter.matchSpecies);
        return allSpecies.filter(sp => allowed.has(sp.fullName));
    }

    // ── Render ─────────────────────────────────────────────────────────────────

    function render() {
        const container = document.getElementById('calendar-container');
        const dateKey = sortMode === 'earliest' ? 'earliestDate' : 'latestDate';
        const dayKey = sortMode === 'earliest' ? 'earliestDayOfYear' : 'latestDayOfYear';
        const sampleKey = sortMode === 'earliest' ? 'earliestSample' : 'latestSample';

        const subset = visibleSpecies();
        const sorted = [...subset].sort((a, b) => a[dayKey] - b[dayKey]);

        // Group into 12 buckets
        const buckets = Array.from({ length: 12 }, () => []);
        sorted.forEach(sp => {
            const idx = monthIndex(sp[dateKey]);
            if (idx >= 0 && idx < 12) buckets[idx].push(sp);
        });

        // Build HTML — skip empty months when a filter is active
        const html = MONTHS.map((m, i) => {
            const species = buckets[i];
            const count = species.length;

            // Collapse empty months when filtering
            if (count === 0 && activeFilter) return '';

            const cardsHTML = count === 0
                ? '<div class="no-species">Nessuna specie registrata in questo mese</div>'
                : `<div class="grid grid--3col">${species.map(sp => buildCard(sp, dateKey, sampleKey)).join('')}</div>`;

            return `
        <div class="month-section">
          <div class="month-header">
            <div class="month-icon">${m.abbr}</div>
            <h2 class="month-title">${m.full}</h2>
            <span class="month-count">${count} ${count === 1 ? 'specie' : 'specie'}</span>
          </div>
          ${cardsHTML}
        </div>`;
        }).join('');

        container.innerHTML = html || '<p class="no-species">Nessuna specie corrisponde al filtro.</p>';

        container.querySelectorAll('.species-card').forEach(card => {
            card.addEventListener('click', () => {
                const idx = parseInt(card.dataset.idx, 10);
                openModal(allSpecies[idx], sampleKey);
            });
        });
    }

    function buildCard(sp, dateKey, sampleKey) {
        const originalIdx = allSpecies.indexOf(sp);
        const day = dayOfMonth(sp[dateKey]);
        return `
      <div class="card species-card" data-idx="${originalIdx}" role="button" tabindex="0" aria-label="Dettagli ${sp.fullName}">
        <div class="card-row">
          <span class="dayOfMonth" aria-label="Giorno ${day}">${day}</span>
          <span class="species-name">${sp.fullName}</span>
        </div>
      </div>`;
    }

    // ── Filter / autocomplete ──────────────────────────────────────────────────

    const filterInput = document.getElementById('filter-input');
    const filterClear = document.getElementById('filter-clear');
    const filterDropdown = document.getElementById('filter-dropdown');
    const activePill = document.getElementById('active-filter');
    const activePillText = document.getElementById('active-filter-text');
    const activeCount = document.getElementById('active-filter-count');
    const activeRemove = document.getElementById('active-filter-remove');

    let ddCursor = -1;  // keyboard cursor inside dropdown

    function ddItems() {
        return Array.from(filterDropdown.querySelectorAll('.dropdown-item'));
    }

    function openDropdown(query) {
        const q = query.trim().toLowerCase();
        if (!q) { closeDropdown(); return; }

        const matches = corpus.filter(c =>
            c.value.toLowerCase().includes(q)
        );

        if (!matches.length) {
            filterDropdown.innerHTML = '<div class="dropdown-empty">Nessun risultato</div>';
            filterDropdown.classList.add('open');
            filterInput.setAttribute('aria-expanded', 'true');
            return;
        }

        // Group by type
        const groups = {};
        TYPE_ORDER.forEach(t => { groups[t] = []; });
        matches.forEach(m => { if (groups[m.type]) groups[m.type].push(m); });

        let html = '';
        TYPE_ORDER.forEach(type => {
            if (!groups[type].length) return;
            html += `<div class="dropdown-group-label">${TYPE_LABEL[type]}</div>`;
            groups[type].forEach(item => {
                const italic = type !== 'taxon';
                const label = italic ? `<em>${item.value}</em>` : item.value;
                const n = item.matchSpecies.length;
                html += `
          <div class="dropdown-item" data-value="${item.value}" data-type="${item.type}" role="option">
            <span class="type-badge type-badge--${type}">${TYPE_LABEL[type]}</span>
            <span class="dropdown-item-label">${label}</span>
            <span class="dropdown-item-count">${n} sp.</span>
          </div>`;
            });
        });

        filterDropdown.innerHTML = html;
        filterDropdown.classList.add('open');
        filterInput.setAttribute('aria-expanded', 'true');
        ddCursor = -1;

        filterDropdown.querySelectorAll('.dropdown-item').forEach(el => {
            el.addEventListener('mousedown', e => {
                e.preventDefault(); // keep focus on input
                applyFilter(el.dataset.value, el.dataset.type);
            });
        });
    }

    function closeDropdown() {
        filterDropdown.classList.remove('open');
        filterInput.setAttribute('aria-expanded', 'false');
        ddCursor = -1;
    }

    function applyFilter(value, type) {
        activeFilter = corpus.find(c => c.value === value && c.type === type) || null;
        filterInput.value = '';
        filterClear.classList.remove('visible');
        closeDropdown();

        if (activeFilter) {
            const italic = type !== 'taxon';
            const label = italic ? `<em>${value}</em>` : value;
            activePillText.innerHTML = `${TYPE_LABEL[type]}: ${label}`;
            const n = activeFilter.matchSpecies.length;
            activeCount.textContent = `— ${n} speci${n === 1 ? 'e' : 'e'}`;
            activePill.classList.add('visible');
        }

        render();
    }

    function clearFilter() {
        activeFilter = null;
        activePill.classList.remove('visible');
        filterInput.value = '';
        filterClear.classList.remove('visible');
        closeDropdown();
        render();
        filterInput.focus();
    }

    filterInput.addEventListener('input', () => {
        filterClear.classList.toggle('visible', filterInput.value.length > 0);
        // Typing clears any applied filter first
        if (activeFilter) {
            activeFilter = null;
            activePill.classList.remove('visible');
        }
        openDropdown(filterInput.value);
    });

    filterInput.addEventListener('keydown', e => {
        const items = ddItems();
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            ddCursor = Math.min(ddCursor + 1, items.length - 1);
            items.forEach((el, i) => el.classList.toggle('is-active', i === ddCursor));
            items[ddCursor]?.scrollIntoView({ block: 'nearest' });
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            ddCursor = Math.max(ddCursor - 1, 0);
            items.forEach((el, i) => el.classList.toggle('is-active', i === ddCursor));
            items[ddCursor]?.scrollIntoView({ block: 'nearest' });
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (ddCursor >= 0 && items[ddCursor]) {
                const el = items[ddCursor];
                applyFilter(el.dataset.value, el.dataset.type);
            }
        } else if (e.key === 'Escape') {
            closeDropdown();
        }
    });

    filterInput.addEventListener('focus', () => {
        if (filterInput.value && !activeFilter) openDropdown(filterInput.value);
    });

    filterClear.addEventListener('click', () => {
        filterInput.value = '';
        filterClear.classList.remove('visible');
        closeDropdown();
        if (activeFilter) clearFilter(); else filterInput.focus();
    });

    activeRemove.addEventListener('click', clearFilter);

    document.addEventListener('click', e => {
        if (!e.target.closest('.filter-wrap')) closeDropdown();
    });

    // ── Sort controls ──────────────────────────────────────────────────────────

    document.querySelectorAll('.sort-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            sortMode = btn.dataset.sort;
            document.querySelectorAll('.sort-btn').forEach(b =>
                b.classList.toggle('active', b === btn)
            );
            render();
        });
    });

    // ── Modal ──────────────────────────────────────────────────────────────────

    const modal = document.getElementById('species-modal');
    const modalClose = document.getElementById('modal-close');
    const modalOverlay = document.getElementById('modal-overlay');

    function openModal(sp, sampleKey) {
        const sample = sp[sampleKey] || {};
        const otherKey = sampleKey === 'earliestSample' ? 'latestSample' : 'earliestSample';
        const otherSample = sp[otherKey] || {};

        document.getElementById('modal-species-name').textContent = sp.fullName;
        document.getElementById('modal-authority').textContent = sp.authority || '';
        document.getElementById('modal-species-current-name').textContent = sp.currentName || '';
        document.getElementById('modal-current-authority').textContent = sp.currentAuthority || '';
        if (sp.currentName) {
            document.getElementById('modal-current-name').classList.remove('hidden');
        } else {
            document.getElementById('modal-current-name').classList.add('hidden');
        }
        document.getElementById('modal-lineage').textContent = sp.lineage || '';
        document.getElementById('modal-total-samples').textContent = sp.totalSamples;
        document.getElementById('modal-month-bars').innerHTML = buildMonthBars(sp.monthlyCount);

        renderSampleBlock('modal-featured-sample',
            sampleKey === 'earliestSample' ? 'Prima raccolta' : 'Ultima raccolta', sample);
        renderSampleBlock('modal-other-sample',
            otherKey === 'earliestSample' ? 'Prima raccolta' : 'Ultima raccolta', otherSample);

        modal.classList.add('is-open');
        modal.setAttribute('aria-hidden', 'false');
        document.body.classList.add('modal-open');
        modalClose.focus();
    }

    function renderSampleBlock(containerId, label, sample) {
        const el = document.getElementById(containerId);
        if (!sample || !sample.collectionDate) {
            el.innerHTML = `<div class="sample-block"><strong>${label}</strong><p>—</p></div>`;
            return;
        }
        const [lat, lon] = sample.localityCoordinates.split(',').map(s => s.trim());
        el.innerHTML = `
      <div class="sample-block">
        <h4 class="sample-label">${label}</h4>
        <dl class="sample-dl">
          <dt>Data</dt>          <dd>${formatDate(sample.collectionDate)}</dd>
          <dt>Legit</dt>         <dd>${sample.collector || '—'}</dd>
          <dt>Determinatore</dt> <dd>${sample.determiner || '—'}</dd>
          <dt>Località</dt>      <dd><a href="https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}&zoom=14" target="_blank" rel="noopener">${sample.locality}</a></dd>
          <dt>Habitat</dt>       <dd>${sample.habitat || '—'}</dd>
        </dl>
      </div>`;
    }

    function closeModal() {
        modal.classList.remove('is-open');
        modal.setAttribute('aria-hidden', 'true');
        document.body.classList.remove('modal-open');
    }

    modalClose.addEventListener('click', closeModal);
    modalOverlay.addEventListener('click', closeModal);
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape' && modal.classList.contains('is-open')) closeModal();
    });

    // ── Init ───────────────────────────────────────────────────────────────────
    render();

})();