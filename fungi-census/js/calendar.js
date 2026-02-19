// calendar.js
// Fetches species-calendar.json, renders month sections, handles sort and modal.

(async function () {
    // ── State ──────────────────────────────────────────────────────────────────
    let allSpecies = [];
    let sortMode = 'earliest'; // 'earliest' | 'latest'

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

    // ── Fetch ──────────────────────────────────────────────────────────────────
    try {
        const response = await fetch('./speciesCalendar.json');
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        allSpecies = data.species || [];
    } catch (err) {
        console.error('Failed to load species-calendar.json:', err);
        document.getElementById('calendar-container').innerHTML =
            '<p class="no-species">Errore nel caricamento dei dati.</p>';
        return;
    }

    // ── Helpers ────────────────────────────────────────────────────────────────

    /** Returns 0-based month index from "MM-DD" string */
    function monthIndex(mmdd) {
        return parseInt(mmdd.split('-')[0], 10) - 1;
    }

    /** Returns day-of-month number from "MM-DD" string */
    function dayOfMonth(mmdd) {
        return parseInt(mmdd.split('-')[1], 10);
    }

    /** Formats a full ISO date string to DD/MM/YYYY */
    function formatDate(isoDate) {
        if (!isoDate) return '—';
        const [y, m, d] = isoDate.split('-');
        return `${d}/${m}/${y}`;
    }

    /** Builds a small monthly bar chart from the 12-element monthlyCount array */
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

    // ── Render ─────────────────────────────────────────────────────────────────

    function render() {
        const container = document.getElementById('calendar-container');

        // Decide which date key to group/sort by
        const dateKey = sortMode === 'earliest' ? 'earliestDate' : 'latestDate';
        const dayKey = sortMode === 'earliest' ? 'earliestDayOfYear' : 'latestDayOfYear';
        const sampleKey = sortMode === 'earliest' ? 'earliestSample' : 'latestSample';

        // Sort by day-of-year
        const sorted = [...allSpecies].sort((a, b) => a[dayKey] - b[dayKey]);

        // Group into 12 buckets
        const buckets = Array.from({ length: 12 }, () => []);
        sorted.forEach(sp => {
            const idx = monthIndex(sp[dateKey]);
            if (idx >= 0 && idx < 12) buckets[idx].push(sp);
        });

        // Build HTML
        const html = MONTHS.map((m, i) => {
            const species = buckets[i];
            const count = species.length;

            const cardsHTML = count === 0
                ? '<div class="no-species">Nessuna specie registrata in questo mese</div>'
                : `<div class="grid grid--3col">${species.map(sp => buildCard(sp, dateKey, dayKey, sampleKey)).join('')}</div>`;

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

        container.innerHTML = html;

        // Attach card click listeners
        container.querySelectorAll('.species-card').forEach(card => {
            card.addEventListener('click', () => {
                const idx = parseInt(card.dataset.idx, 10);
                openModal(allSpecies[idx], sortMode === 'earliest' ? 'earliestSample' : 'latestSample');
            });
        });
    }

    function buildCard(sp, dateKey, dayKey, sampleKey) {
        const originalIdx = allSpecies.indexOf(sp);
        const day = dayOfMonth(sp[dateKey]);
        return `
      <div class="card species-card" data-idx="${originalIdx}" role="button" tabindex="0" aria-label="Dettagli ${sp.fullName}">
        <div class="card-row">
          <span class="dayOfMonth" aria-label="Giorno ${day}">${day}</span>
          <span class="species-name">${sp.fullName}</span>
        </div>
        <!-- <div class="card-samples">${sp.totalSamples} campion${sp.totalSamples === 1 ? 'e' : 'i'}</div> -->
      </div>`;
    }

    // ── Modal ──────────────────────────────────────────────────────────────────

    const modal = document.getElementById('species-modal');
    const modalClose = document.getElementById('modal-close');
    const modalOverlay = document.getElementById('modal-overlay');

    function openModal(sp, sampleKey) {
        const sample = sp[sampleKey] || {};
        const otherSampleKey = sampleKey === 'earliestSample' ? 'latestSample' : 'earliestSample';
        const otherSample = sp[otherSampleKey] || {};

        document.getElementById('modal-species-name').textContent = sp.fullName;
        document.getElementById('modal-authority').textContent = sp.authority || '';
        document.getElementById('modal-lineage').textContent = sp.lineage || '';
        document.getElementById('modal-total-samples').textContent = sp.totalSamples;

        // Month bars
        document.getElementById('modal-month-bars').innerHTML = buildMonthBars(sp.monthlyCount);

        // Featured sample (whichever sort mode is active)
        const sampleLabel = sampleKey === 'earliestSample' ? 'Prima raccolta' : 'Ultima raccolta';
        renderSampleBlock('modal-featured-sample', sampleLabel, sample);

        // Other endpoint
        const otherLabel = otherSampleKey === 'earliestSample' ? 'Prima raccolta' : 'Ultima raccolta';
        renderSampleBlock('modal-other-sample', otherLabel, otherSample);

        modal.classList.add('is-open');
        modal.setAttribute('aria-hidden', 'false');
        document.body.classList.add('modal-open');
        modalClose.focus();
    }

    function renderSampleBlock(containerId, label, sample) {
        const el = document.getElementById(containerId);
        if (!sample || !sample.collectionDate) {
            el.innerHTML = `<div class="sample-block"><strong>${label}</strong><p class="no-data">—</p></div>`;
            return;
        }
        el.innerHTML = `
      <div class="sample-block">
        <h4 class="sample-label">${label}</h4>
        <dl class="sample-dl">
          <dt>Data</dt>       <dd>${formatDate(sample.collectionDate)}</dd>
          <dt>Raccoglitore</dt><dd>${sample.collector || '—'}</dd>
          <dt>Determinatore</dt><dd>${sample.determiner || '—'}</dd>
          <dt>Località</dt>   <dd>${sample.locality || '—'}</dd>
          <dt>Habitat</dt>    <dd>${sample.habitat || '—'}</dd>
          ${sample.localityCoordinates ? `<dt>Coordinate</dt><dd><a href="https://www.openstreetmap.org/?mlat=${sample.localityCoordinates.split(',')[0].trim()}&mlon=${sample.localityCoordinates.split(',')[1].trim()}&zoom=14" target="_blank" rel="noopener">${sample.localityCoordinates}</a></dd>` : ''}
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

    // ── Sort controls ──────────────────────────────────────────────────────────

    document.querySelectorAll('.sort-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            sortMode = btn.dataset.sort;
            document.querySelectorAll('.sort-btn').forEach(b => b.classList.toggle('active', b === btn));
            render();
        });
    });

    // ── Init ───────────────────────────────────────────────────────────────────
    render();

})();