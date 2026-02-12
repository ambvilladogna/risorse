let map;
let seasonalityChart;

// Get URL parameters
function getUrlParameter(name) {
    name = name.replace(/[\[]/, '\\[').replace(/[\]]/, '\\]');
    const regex = new RegExp('[\\?&]' + name + '=([^&#]*)');
    const results = regex.exec(location.search);
    return results === null ? '' : decodeURIComponent(results[1].replace(/\+/g, ' '));
}

// Go back function
function goBack() {
    if (document.referrer && document.referrer.includes(window.location.hostname)) {
        // parent.postMessage({
        //     type: 'navigate',
        //     page: `fungi-census/search.html`
        // }, '*');
        window.history.back();
    } else {
        window.location.href = 'index.html';
    }
}

const getSpeciesFilename = (genus, species) => {
    const cleanGenus = genus.toLowerCase().replace(/[\s.]/g, '_');
    const cleanSpecies = species.toLowerCase().replace(/[\s.]/g, '_');
    const filename = `${cleanGenus}_${cleanSpecies}.json`;
    return filename.replace(/_+/g, '_');
};

// Format sample details for display
function formatSampleDetails(sample) {
    let details = [];

    if (sample.collectionDate) {
        details.push(`${sample.collectionDate}`);
    }
    if (sample.locality) {
        details.push(`${sample.locality}`);
    }
    if (sample.habitat) {
        details.push(`${sample.habitat}`);
    }
    if (sample.collector) {
        details.push(`Legit.: ${sample.collector}`);
    }
    if (sample.determiner) {
        details.push(`Det.: ${sample.determiner}`);
    }
    if (sample.exsiccataCode) {
        details.push(`Codice exsiccata: ${sample.exsiccataCode}`);
    }

    return details.join(' • ');
}

function formatDayAndMonth(dateString) {
    const [day, month] = dateString.split('/');
    const months = [
        '',
        'gennaio',
        'febbraio',
        'marzo',
        'aprile',
        'maggio',
        'giugno',
        'luglio',
        'agosto',
        'settembre',
        'ottobre',
        'novembre',
        'dicembre'
    ];

    return `${day} ${months[Number(month)]}`;
};

// Initialize map
function initializeMap() {
    map = L.map('map', {
        center: [45.896178, 9.982462],
        zoom: 12.50,
        zoomControl: false
    });

    L.control.zoom({
        position: 'bottomright'
    }).addTo(map);

    L.tileLayer('https://tile.thunderforest.com/landscape/{z}/{x}/{y}.png?apikey=dff0ad45dc8e41d4822ee38d63417f4b', {
        attribution: 'Maps &copy; <a href="https://www.thunderforest.com">Thunderforest</a>, Data &copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);
}

// Add samples to map
function addSamplesToMap(samples) {
    if (!samples || samples.length === 0) return;

    const bounds = [];

    // Group samples by coordinates
    const samplesByCoordinates = {};

    samples.forEach(sample => {
        if (sample.localityCoordinates) {
            const coords = sample.localityCoordinates.split(',').map(c => parseFloat(c.trim()));
            if (coords.length === 2 && !isNaN(coords[0]) && !isNaN(coords[1])) {
                const coordKey = `${coords[0]},${coords[1]}`;
                if (!samplesByCoordinates[coordKey]) {
                    samplesByCoordinates[coordKey] = {
                        coordinates: coords,
                        samples: []
                    };
                }
                samplesByCoordinates[coordKey].samples.push(sample);
            }
        }
    });

    // Create markers for each coordinate group
    Object.values(samplesByCoordinates).forEach(group => {
        const [lat, lng] = group.coordinates;
        const samplesAtLocation = group.samples;

        // Determine marker color based on sample types
        const hasExsiccata = samplesAtLocation.some(s => s.sampleType === 'exsiccata');
        const markerColor = hasExsiccata ? '#e74c3c' : '#2c5530';

        // Adjust marker size based on number of samples
        const markerRadius = Math.min(6 + (samplesAtLocation.length - 1) * 2, 12);

        const marker = L.circleMarker([lat, lng], {
            radius: markerRadius,
            fillColor: markerColor,
            color: '#fff',
            weight: 2,
            opacity: 1,
            fillOpacity: 0.8
        }).addTo(map);

        // Create popup content with better formatting for many samples
        let popupContent = `<div class="sample-popup-container">`;

        if (samplesAtLocation.length > 1) {
            popupContent += `
                        <div class="popup-header">
                            <strong>${samplesAtLocation.length} campioni in questa località</strong>
                        </div>
                    `;
        }

        // Detailed view for few samples
        popupContent += `<div class="popup-content">`;
        samplesAtLocation.forEach((sample, index) => {
            if (index > 0) {
                popupContent += `<div class="sample-divider"></div>`;
            }
            popupContent += `
                            <div class="sample-item">
                                ${formatSampleDetails(sample)}
                            </div>
                        `;
        });
        popupContent += `</div>`;

        popupContent += `</div>`;

        // Enhanced popup options
        const popupOptions = {
            maxWidth: Math.min(350, window.innerWidth * 0.6), // Responsive width
            maxHeight: Math.min(400, window.innerHeight * 0.6), // Responsive height
            autoPan: true, // Automatically pan map to show popup
            autoPanPadding: [20, 20], // Padding when auto-panning
            closeButton: true,
            keepInView: true, // Keep popup in view when map is moved
            className: 'custom-popup' // For additional CSS styling
        };

        marker.bindPopup(popupContent, popupOptions);
        bounds.push([lat, lng]);
    });

    if (bounds.length > 0) {
        map.fitBounds(bounds, { padding: [20, 20] });
    }
}

// Create seasonality chart
function createSeasonalityChart(monthlyData) {
    const ctx = document.getElementById('seasonalityChart').getContext('2d');

    const monthNames = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];

    if (seasonalityChart) {
        seasonalityChart.destroy();
    }

    seasonalityChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: monthNames,
            datasets: [{
                label: 'Campioni per mese',
                data: monthlyData,
                backgroundColor: '#2c5530',
                borderColor: '#1a3a1f',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                }
            }
        }
    });
}

// Load species data
async function loadSpeciesData() {
    const genus = getUrlParameter('genus');
    const species = getUrlParameter('species');
    const filename = getSpeciesFilename(genus, species);

    // Update page title and header
    document.title = `${genus} ${species} - Specie fungine della Valseriana`;
    document.getElementById('genus-name').textContent = genus;
    document.getElementById('species-name').textContent = species;

    try {
        const response = await fetch(`species/${filename}`);

        if (!response.ok) {
            throw new Error(`File non trovato: ${filename}`);
        }

        const data = await response.json();
        displaySpeciesData(data);

    } catch (error) {
        console.error('Error loading species data:', error);
        displayError(error.message);
    }
}

// Display species data
function displaySpeciesData(data) {
    // Update authority and lineage
    if (data.autore) {
        document.getElementById('species-authority').textContent = data.autore;
    }

    if (data.nomeCorrente) {
        document.getElementById('synonym').textContent = 'sinonimo di ';
        document.getElementById('nomeCorrente').textContent = data.nomeCorrente;
    }

    if (data.autoreCorrente) {
        document.getElementById('autoreCorrente').textContent = data.autoreCorrente;
    }

    if (data.filogenesi) {
        document.getElementById('filogenesi').textContent = data.filogenesi;
    }

    // Display total samples
    displayTotalSamples(data.statistiche?.totaleCampioni || 0);

    // Display seasonality
    displaySeasonality(data);

    // Initialize and populate map
    initializeMap();

    // Combine collected and exsiccata samples for map
    const allSamples = [];
    if (data.campioniRaccolti) {
        allSamples.push(...data.campioniRaccolti.map(s => ({ ...s, sampleType: 'collected' })));
    }
    if (data.campioniExsiccata) {
        allSamples.push(...data.campioniExsiccata.map(s => ({ ...s, sampleType: 'exsiccata' })));
    }
    addSamplesToMap(allSamples);

    // Display exsiccata list
    displayExsiccataList(data.campioniExsiccata || []);

    // communicate the final height of the page to the parent 
    // window.parent.postMessage({
    //     type: 'contentLoaded',
    //     height: document.body.scrollHeight
    // }, '*');
}

// Display total samples count
function displayTotalSamples(count) {
    const totalSamplesDiv = document.getElementById('total-samples');
    totalSamplesDiv.innerHTML = `
                <div>
                    <span class="count-number">${count}</span>
                    <span class="count-label">campioni</span>
                </div>
            `;
}

// Display seasonality section
// Display seasonality section
function displaySeasonality(data) {
    const seasonalityContent = document.getElementById('seasonality-content');

    let html = '<div class="seasonality-grid">';

    // Container for earliest and latest items
    html += '<div class="season-info-container">';

    // Earliest and latest samples from fenologia
    if (data.fenologia) {
        if (data.fenologia.raccoltaPiuPrecoce) {
            html += `
                <div class="season-item">
                    <h4>Raccolta più precoce</h4>
                    <p>${formatDayAndMonth(data.fenologia.raccoltaPiuPrecoce)}</p>
                </div>
            `;
        }

        if (data.fenologia.raccoltaPiuTarda) {
            html += `
                <div class="season-item">
                    <h4>Raccolta più tardiva</h4>
                    <p>${formatDayAndMonth(data.fenologia.raccoltaPiuTarda)}</p>
                </div>
            `;
        }
    }

    html += '</div>'; // Close season-info-container

    // Chart container
    html += `
                        <div class="chart-container">
                            <h4>Distribuzione mensile</h4>
                            <div>
                                <canvas id="seasonalityChart"></canvas>
                            </div>
                        </div>
                    `;

    html += '</div>'; // Close seasonality-grid

    seasonalityContent.innerHTML = html;

    // Create chart if data available
    if (data.fenologia?.campioniPerMese) {
        setTimeout(() => {
            // Convert monthly data from object format to array
            const monthlyArray = data.fenologia.campioniPerMese.map(monthObj => {
                const monthKey = Object.keys(monthObj)[0];
                return monthObj[monthKey];
            });
            createSeasonalityChart(monthlyArray);
        }, 100);
    }
}

// Display exsiccata list
function displayExsiccataList(exsiccataList) {
    const exsiccataListDiv = document.getElementById('exsiccata-list');

    if (!exsiccataList || exsiccataList.length === 0) {
        exsiccataListDiv.innerHTML = '<p>Nessun campione exsiccata disponibile.</p>';
        return;
    }

    let html = '<div class="exsiccata-items">';

    exsiccataList.forEach((sample, index) => {
        html += `
                    <div class="exsiccata-item">
                        <div class="exsiccata-number">${index + 1}</div>
                        <div class="exsiccata-details">
                            ${formatSampleDetails(sample)}
                        </div>
                    </div>
                `;
    });

    html += '</div>';
    exsiccataListDiv.innerHTML = html;
}

// Display error message
function displayError(message) {
    const elements = [
        document.getElementById('total-samples'),
        document.getElementById('seasonality-content'),
        document.getElementById('exsiccata-list')
    ];

    elements.forEach(element => {
        if (element) {
            element.innerHTML = `
                        <div class="error-message">
                            <strong>Errore nel caricamento dei dati:</strong><br>
                            ${message}
                        </div>
                    `;
        }
    });
}

// Initialize page when DOM is loaded
document.addEventListener('DOMContentLoaded', function () {
    loadSpeciesData();
});

// Cleanup on page unload
window.addEventListener('beforeunload', function () {
    if (seasonalityChart) {
        seasonalityChart.destroy();
    }
});