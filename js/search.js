// search.js

(async function () {
    // ── State ──────────────────────────────────────────────────────────────────
    let allSpecies = [];
    let corpus = [];          // pre-built search suggestions
    let activeFilter = null;        // corpus item currently applied, or null

    const TYPE_ORDER = ['genus', 'species', 'famiglia', 'ordine', 'classe', 'phylum', 'regno'];
    const TYPE_LABEL = {
        genus: 'Genere',
        species: 'Specie',
        regno: 'Regno',
        phylum: 'Phylum',
        classe: 'Classe',
        ordine: 'Ordine',
        famiglia: 'Famiglia',
    };

    // ── Fetch ──────────────────────────────────────────────────────────────────
    const subTitle = document.getElementById('sub-title');
    const totalCount = document.getElementById('total-count');

    const area = getUrlParameter('area');
    try {
        let speciesFile = './census.json';
        let corpusFile = './searchCorpus.json';
        if (area) {
            speciesFile = `./${area}.json`;
            corpusFile = `./searchCorpus-${area}.json`;
        }
        const [speciesRes, corpusRes] = await Promise.all([
            fetch(speciesFile),
            fetch(corpusFile),
        ]);
        if (!speciesRes.ok) throw new Error(`${speciesFile}: HTTP ${speciesRes.status}`);
        if (!corpusRes.ok) throw new Error(`${corpusFile}: HTTP ${corpusRes.status}`);

        const speciesData = await speciesRes.json();
        const corpusData = await corpusRes.json();

        allSpecies = speciesData.species || [];
        corpus = corpusData.corpus || [];

        if (area) {
            updateSubtitle(speciesData);
        }
        updateTotalCount(speciesData);
    } catch (err) {
        console.error('Failed to load data:', err);
        document.getElementById('species-list').innerHTML =
            '<div class="no-results">Errore nel caricamento dei dati.</div>';
        return;
    }

    // ── Helpers ────────────────────────────────────────────────────────────────

    // Update total count display
    function updateSubtitle(data) {
        subTitle.textContent = data.title;
        subTitle.classList.remove('hidden');
    }

    // Update total count display
    function updateTotalCount(data) {
        totalCount.textContent = `${data.totalSpecies} specie censite - ${data.totalSamples} campioni  - Ultimo aggiornamento: ${new Date(data.generatedAt).toLocaleDateString('it-IT')}`;
    }
    function monthIndex(mmdd) { return parseInt(mmdd.split('-')[0], 10) - 1; }
    function dayOfMonth(mmdd) { return parseInt(mmdd.split('-')[1], 10); }

    function formatDate(isoDate) {
        if (!isoDate) return '—';
        const [y, m, d] = isoDate.split('-');
        return `${d}/${m}/${y}`;
    }

    /** Returns the subset of allSpecies to show given the active filter */
    function visibleSpecies() {
        if (!activeFilter) return allSpecies;
        const allowed = new Set(activeFilter.matchSpecies);
        return allSpecies.filter(sp => allowed.has(sp.fullName));
    }

    // Create clickable lineage with taxon links
    function createLineageWithLinks(lineage) {
        return lineage.split(' > ').map(part => {
            const colonIndex = part.indexOf(':');
            if (colonIndex !== -1) {
                const prefix = part.substring(0, colonIndex + 2);          // e.g. "Famiglia: "
                const taxonName = part.substring(colonIndex + 2).trim();   // e.g. "Agaricaceae"
                const onclickAttr = `onclick="performTaxonSearch('${taxonName}','${prefix.slice(0, -2).trim()}')"`;
                return `${prefix}<span class="taxon-link" ${onclickAttr}>${taxonName}</span>`;
            }
            return part;
        }).join(' > ');
    }

    // ── Render ─────────────────────────────────────────────────────────────────

    function render() {
        const container = document.getElementById('species-list');
        const speciesList = document.getElementById('species-list');
        const resultsCount = document.getElementById('results-count');

        const filteredSpecies = visibleSpecies();

        container.scrollTop = 0;
        resultsCount.textContent = `Risultati: ${filteredSpecies.length}`;

        if (filteredSpecies.length === 0) {
            speciesList.innerHTML = '<div class="no-results">Nessuna specie trovata con i criteri selezionati</div>';
            return;
        }

        const html = filteredSpecies.map(species => {
            let synonymInfo = '';
            if (species.currentName && species.currentName !== species.fullName) {
                synonymInfo = `
                        <div class="synonym-info">
                            <span class="synonym-label">Sinonimo di:</span> <em>${species.currentName}</em> ${species.currentAuthority}
                        </div>
                    `;
            }

            const genusLink = `<span class="taxon-link" onclick="performTaxonSearch('${species.genus}','genus')">${species.genus}</span>`;
            const speciesLink = `<span class="taxon-link" onclick="handleSpeciesClick('${species.genus}','${species.species}')">${species.species}</span>`;
            const lineageWithLinks = createLineageWithLinks(species.lineage);

            return `
                    <div class="species-item">
                        <div class="species-name"><em>${genusLink} ${speciesLink}</em> ${species.authority}</div>
                        <div class="species-lineage">${lineageWithLinks}</div>
                        ${synonymInfo}
                    </div>
                `;
        }).join('');

        speciesList.innerHTML = html;

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
                const italic = type === 'genus' || type === 'species';
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
            const italic = type === 'genus' || type === 'species';
            const label = italic ? `<em>${value}</em>` : value;
            activePillText.innerHTML = `${TYPE_LABEL[type]}: ${label}`;
            // avoid duplicate count display
            // const n = activeFilter.matchSpecies.length;
            // activeCount.textContent = `— ${n} speci${n === 1 ? 'e' : 'e'}`;
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

    window.performTaxonSearch = function (value, type) {
        applyFilter(value, type);
    };

    // ── Init ───────────────────────────────────────────────────────────────────
    render();

})();

function handleSpeciesClick(genus, species) {
    // Navigate to species detail page with parameters
    const area = getUrlParameter('area');
    if (area) {
        window.location.href = `./species-detail.html?genus=${encodeURIComponent(genus)}&species=${encodeURIComponent(species)}&area=${encodeURIComponent(area)}`;
    } else {
        window.location.href = `./species-detail.html?genus=${encodeURIComponent(genus)}&species=${encodeURIComponent(species)}`;
    }
}