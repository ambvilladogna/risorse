// Global variables
let allSpecies = [];
let filteredSpecies = [];
let currentTab = 'genus-species';
let selectedAutocompleteIndex = -1;

// DOM Elements
const subTitle = document.getElementById('sub-title');
const totalCount = document.getElementById('total-count');
const genusSelect = document.getElementById('genus-select');
const speciesSelect = document.getElementById('species-select');
const resetBtn = document.getElementById('reset-btn');
const freeSearchInput = document.getElementById('free-search');
const freeResetBtn = document.getElementById('free-reset-btn');
const speciesList = document.getElementById('species-list');
const resultsCount = document.getElementById('results-count');
const tabButtons = document.querySelectorAll('.tab-button');
const tabPanes = document.querySelectorAll('.tab-pane');
const autocompleteList = document.getElementById('autocomplete-list');

// Initialize the app
async function init() {
    const area = getUrlParameter('area');
    let data;
    try {
        if (area) {
            const response = await fetch(`./${area}.json`);
            data = await response.json();
        } else {
            const response = await fetch('./census.json');
            data = await response.json();
        }
        allSpecies = data.species;
        filteredSpecies = [...allSpecies];

        populateGenusDropdown();
        if (area) {
            updateSubtitle(data);
        }
        updateTotalCount(data);
        updateResults();
        setupEventListeners();
    } catch (error) {
        console.error('Error loading data:', error);
        speciesList.innerHTML = '<div class="no-results">Errore nel caricamento dei dati</div>';
    }
}

// Populate genus dropdown
function populateGenusDropdown() {
    const genera = [...new Set(allSpecies.map(s => s.genus))].sort();
    genera.forEach(genus => {
        const option = document.createElement('option');
        option.value = genus;
        option.textContent = genus;
        genusSelect.appendChild(option);
    });
}

// Update species dropdown based on selected genus
function updateSpeciesDropdown() {
    const selectedGenus = genusSelect.value;
    speciesSelect.innerHTML = '<option value="">Tutte le specie</option>';

    if (selectedGenus) {
        const speciesInGenus = [...new Set(
            allSpecies
                .filter(s => s.genus === selectedGenus)
                .map(s => s.species)
        )].sort();

        speciesInGenus.forEach(species => {
            const option = document.createElement('option');
            option.value = species;
            option.textContent = species;
            speciesSelect.appendChild(option);
        });
    }
}

// Autocomplete functionality
function handleAutocomplete(query) {
    if (!query.trim()) {
        hideAutocomplete();
        performFreeSearch();
        return;
    }

    const lowerQuery = query.toLowerCase();
    const suggestions = new Set();

    allSpecies.forEach(species => {
        if (species.genus.toLowerCase().includes(lowerQuery)) {
            suggestions.add(species.genus);
        }
        if (species.species.toLowerCase().includes(lowerQuery)) {
            suggestions.add(`${species.genus} ${species.species}`);
        }

        const lineageParts = species.lineage.split(' > ');
        lineageParts.forEach(part => {
            const colonIndex = part.indexOf(':');
            if (colonIndex !== -1) {
                const taxonName = part.substring(colonIndex + 2).trim();
                if (taxonName.toLowerCase().includes(lowerQuery)) {
                    suggestions.add(taxonName);
                }
            }
        });
    });

    showAutocomplete([...suggestions].slice(0, 10));
}

function showAutocomplete(suggestions) {
    if (suggestions.length === 0) {
        hideAutocomplete();
        return;
    }

    selectedAutocompleteIndex = -1;
    autocompleteList.innerHTML = suggestions.map(s =>
        `<div class="autocomplete-item" data-value="${s}">${s}</div>`
    ).join('');
    autocompleteList.style.display = 'block';
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

// Filter species by genus and species
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
        updateResults();
        return;
    }

    // Split query into words
    const words = query.split(/\s+/);

    if (words.length === 1) {
        // Single word: search in genus, species, and lineage
        filteredSpecies = allSpecies.filter(species => {
            return species.genus.toLowerCase().includes(query) ||
                species.species.toLowerCase().includes(query) ||
                species.lineage.toLowerCase().includes(query);
        });
    } else if (words.length === 2) {
        // Two words: likely "genus species" - try exact match first, then fallback
        const [word1, word2] = words;

        filteredSpecies = allSpecies.filter(species => {
            return species.fullName.toLowerCase().includes(query);
        });
    } else {
        // Three or more words: start searching full query in fullName
        filteredSpecies = allSpecies.filter(species => {
            // Check if full query is in fullName
            if (species.fullName.toLowerCase().includes(query)) return true;

            return false;
        });

        if (filteredSpecies.length === 0) {
            // If no results, try matching all words in any order
            filteredSpecies = allSpecies.filter(species => {
                return words.every(word =>
                    species.genus.toLowerCase().includes(word) ||
                    species.species.toLowerCase().includes(word) ||
                    species.lineage.toLowerCase().includes(word)
                );
            });
        }
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
    const area = getUrlParameter('area');
    if (area) {
        window.location.href = `./species-detail.html?genus=${encodeURIComponent(genus)}&species=${encodeURIComponent(species)}&area=${encodeURIComponent(area)}`;
    } else {
        window.location.href = `./species-detail.html?genus=${encodeURIComponent(genus)}&species=${encodeURIComponent(species)}`;
    }
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
function updateSubtitle(data) {
    subTitle.textContent = data.title;
    subTitle.classList.remove('hidden');
}

// Update total count display
function updateTotalCount(data) {
    totalCount.textContent = `${data.totalSpecies} specie censite - ${data.totalSamples} campioni  - Ultimo aggiornamento: ${new Date(data.generatedAt).toLocaleDateString('it-IT')}`;
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