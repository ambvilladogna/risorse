let allSpecies = [];
let filteredSpecies = [];
let allTaxons = new Set();
let currentTab = 'genus-species';
let selectedAutocompleteIndex = -1;

// DOM elements
const genusSelect = document.getElementById('genus-select');
const speciesSelect = document.getElementById('species-select');
const freeSearchInput = document.getElementById('free-search-input');
const autocompleteList = document.getElementById('autocomplete-list');
const speciesList = document.getElementById('species-list');
const resultsCount = document.getElementById('results-count');
const totalCount = document.getElementById('total-count');
const resetBtn = document.getElementById('reset-btn');
const freeResetBtn = document.getElementById('free-reset-btn');
const tabButtons = document.querySelectorAll('.tab-button');
const tabPanes = document.querySelectorAll('.tab-pane');

// Initialize the application
function init() {
    loadExternalData('./census.json');
    setupEventListeners();
}

// Function to load external JSON data
async function loadExternalData(jsonUrl) {
    try {
        const response = await fetch(jsonUrl);
        const data = await response.json();
        allSpecies = data.species.sort((a, b) => {
            if (a.genus !== b.genus) return a.genus.localeCompare(b.genus);
            return a.species.localeCompare(b.species);
        });
        filteredSpecies = [...allSpecies];
        buildTaxonList();
        populateDropdowns();
        updateResults();
        updateTotalCount(data);
    } catch (error) {
        console.error('Error loading data:', error);
        speciesList.innerHTML = '<div class="no-results">Errore nel caricamento dei dati</div>';
    }
}

// Build complete taxon list for autocomplete
function buildTaxonList() {
    allSpecies.forEach(species => {
        // Add genus and species
        allTaxons.add(species.genus);
        allTaxons.add(species.species);

        // Parse lineage and add all taxons
        const lineageParts = species.lineage.split(' > ');
        lineageParts.forEach(part => {
            const colonIndex = part.indexOf(':');
            if (colonIndex !== -1) {
                const taxonName = part.substring(colonIndex + 2).trim();
                if (taxonName) {
                    allTaxons.add(taxonName);
                }
            }
        });
    });
}

// Populate dropdown menus
function populateDropdowns() {
    // Get unique genera
    const genera = [...new Set(allSpecies.map(s => s.genus))].sort();
    genera.forEach(genus => {
        const option = document.createElement('option');
        option.value = genus;
        option.textContent = genus;
        genusSelect.appendChild(option);
    });

    updateSpeciesDropdown();
}

// Update species dropdown based on selected genus
function updateSpeciesDropdown() {
    const selectedGenus = genusSelect.value;
    speciesSelect.innerHTML = '<option value="">Tutte le specie</option>';

    let availableSpecies = allSpecies;
    if (selectedGenus) {
        availableSpecies = allSpecies.filter(s => s.genus === selectedGenus);
    }

    const species = [...new Set(availableSpecies.map(s => s.species))].sort();
    species.forEach(spec => {
        const option = document.createElement('option');
        option.value = spec;
        option.textContent = spec;
        speciesSelect.appendChild(option);
    });
}

// Handle autocomplete for free search
function handleAutocomplete(query) {
    if (!query) {
        hideAutocomplete();
        return;
    }

    const matches = [...allTaxons]
        .filter(taxon => taxon.toLowerCase().includes(query.toLowerCase()))
        .sort()
        .slice(0, 10);

    if (matches.length === 0) {
        hideAutocomplete();
        return;
    }

    showAutocomplete(matches);
}

function showAutocomplete(matches) {
    autocompleteList.innerHTML = matches.map((match, index) =>
        `<div class="autocomplete-item" data-value="${match}" data-index="${index}">${match}</div>`
    ).join('');
    autocompleteList.style.display = 'block';
    selectedAutocompleteIndex = -1;
}

function hideAutocomplete() {
    autocompleteList.style.display = 'none';
    selectedAutocompleteIndex = -1;
}

function selectAutocompleteItem(value) {
    freeSearchInput.value = value;
    hideAutocomplete();
    performFreeSearch();
}

// Filter species based on selections
function filterSpecies() {
    const selectedGenus = genusSelect.value;
    const selectedSpecies = speciesSelect.value;

    filteredSpecies = allSpecies.filter(species => {
        const genusMatch = !selectedGenus || species.genus === selectedGenus;
        const speciesMatch = !selectedSpecies || species.species === selectedSpecies;
        return genusMatch && speciesMatch;
    });

    updateResults();
}

// Perform free search
function performFreeSearch() {
    const query = freeSearchInput.value.trim().toLowerCase();

    if (!query) {
        filteredSpecies = [...allSpecies];
    } else {
        filteredSpecies = allSpecies.filter(species => {
            return species.genus.toLowerCase().includes(query) ||
                species.species.toLowerCase().includes(query) ||
                species.lineage.toLowerCase().includes(query);
        });
    }

    updateResults();
}

function hasWord(str, word) {
    const pattern = new RegExp(`\\b${word}\\b`, 'i');
    return pattern.test(str);
}

// Perform taxon search
function performTaxonSearch(taxonValue) {
    // Switch to free search tab
    switchTab('free-search');

    // Set the search value
    freeSearchInput.value = taxonValue;
    hideAutocomplete();

    taxonValue = taxonValue.trim().toLowerCase();

    // perform search with exact matches only
    filteredSpecies = allSpecies.filter(species => {
        if (species.genus.toLowerCase() === taxonValue) return true;
        if (species.genus.toLowerCase() === taxonValue) return true;
        if (hasWord(species.lineage, taxonValue)) return true;
    });

    updateResults();
}

// Handle taxon link clicks
function handleTaxonClick(taxonValue) {
    // Switch to free search tab
    switchTab('free-search');

    // Set the search value
    freeSearchInput.value = taxonValue;
    hideAutocomplete();

    // Perform the search
    performFreeSearch();
}

function handleSpeciesClick(genus, species) {
    // parent.postMessage({
    //     type: 'navigate',
    //     page: `fungi-census/species-detail.html?genus=${encodeURIComponent(genus)}&species=${encodeURIComponent(species)}`
    // }, '*');
    // Navigate to species detail page with parameters
    window.location.href = `species-detail-demo.html?genus=${encodeURIComponent(genus)}&species=${encodeURIComponent(species)}`;
    resetFreeSearch();
}

// Switch between tabs
function switchTab(tabId) {
    currentTab = tabId;

    // reset search filters to avoid inconsistencies
    resetFilters();
    resetFreeSearch();

    // Update tab buttons
    tabButtons.forEach(btn => {
        if (btn.dataset.tab === tabId) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    // Update tab panes
    tabPanes.forEach(pane => {
        if (pane.id === `${tabId}-pane`) {
            pane.classList.add('active');
        } else {
            pane.classList.remove('active');
        }
    });
}

// Create clickable lineage with taxon links
function createLineageWithLinks(lineage) {
    return lineage.split(' > ').map(part => {
        const colonIndex = part.indexOf(':');
        if (colonIndex !== -1) {
            const prefix = part.substring(0, colonIndex + 2);
            const taxonName = part.substring(colonIndex + 2).trim();
            return `${prefix}<span class="taxon-link" onclick="performTaxonSearch('${taxonName}')">${taxonName}</span>`;
        }
        return part;
    }).join(' > ');
}

// Update results display
function updateResults() {
    speciesList.scrollTop = 0;
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

        const genusLink = `<span class="taxon-link" onclick="performTaxonSearch('${species.genus}')">${species.genus}</span>`;
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

    // communicate the final height of the page to the parent 
    // window.parent.postMessage({
    //     type: 'contentLoaded',
    //     height: document.body.scrollHeight
    // }, '*');
}

// Update total count display
function updateTotalCount(data) {
    totalCount.textContent = `${data.totalSpecies} specie censite - Ultimo aggiornamento: ${new Date(data.generatedAt).toLocaleDateString('it-IT')}`;
}

// Reset genus/species filters
function resetFilters() {
    genusSelect.value = '';
    speciesSelect.value = '';
    updateSpeciesDropdown();
    filteredSpecies = [...allSpecies];
    updateResults();
}

// Reset free search
function resetFreeSearch() {
    freeSearchInput.value = '';
    hideAutocomplete();
    filteredSpecies = [...allSpecies];
    updateResults();
}

// Setup event listeners
function setupEventListeners() {
    // Tab switching
    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            switchTab(btn.dataset.tab);
        });
    });

    // Genus/Species search
    genusSelect.addEventListener('change', () => {
        updateSpeciesDropdown();
        filterSpecies();
    });

    speciesSelect.addEventListener('change', filterSpecies);
    resetBtn.addEventListener('click', resetFilters);

    // Free search
    freeSearchInput.addEventListener('input', (e) => {
        handleAutocomplete(e.target.value);
    });

    freeSearchInput.addEventListener('keydown', (e) => {
        const items = autocompleteList.querySelectorAll('.autocomplete-item');

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            selectedAutocompleteIndex = Math.min(selectedAutocompleteIndex + 1, items.length - 1);
            updateAutocompleteSelection(items);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            selectedAutocompleteIndex = Math.max(selectedAutocompleteIndex - 1, -1);
            updateAutocompleteSelection(items);
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (selectedAutocompleteIndex >= 0 && items[selectedAutocompleteIndex]) {
                selectAutocompleteItem(items[selectedAutocompleteIndex].dataset.value);
            } else {
                hideAutocomplete();
                performFreeSearch();
            }
        } else if (e.key === 'Escape') {
            hideAutocomplete();
        }
    });

    // Autocomplete clicks
    autocompleteList.addEventListener('click', (e) => {
        if (e.target.classList.contains('autocomplete-item')) {
            selectAutocompleteItem(e.target.dataset.value);
        }
    });

    // Hide autocomplete when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.autocomplete-container')) {
            hideAutocomplete();
        }
    });

    freeResetBtn.addEventListener('click', resetFreeSearch);
}

function updateAutocompleteSelection(items) {
    items.forEach((item, index) => {
        if (index === selectedAutocompleteIndex) {
            item.classList.add('selected');
        } else {
            item.classList.remove('selected');
        }
    });
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', init);