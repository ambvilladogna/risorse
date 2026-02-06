// Sample data (in production, this would be loaded from your CSV or converted JSON)
const books = [
    {
        id: 1,
        opera: "Monografia illustrata del Genere Russula in Europa",
        volume: "Tomo Primo",
        copie: 1,
        autori: "Mauro Sarnari",
        editore: "AMB Fondazione Centro Studi Micologici",
        data: "2007",
        tags: ["russole", "amb", "monografia"],
        note: ""
    },
    {
        id: 2,
        opera: "Monografia illustrata del Genere Russula in Europa",
        volume: "Tomo Secondo",
        copie: 1,
        autori: "Mauro Sarnari",
        editore: "AMB Fondazione Centro Studi Micologici",
        data: "2007",
        tags: ["russole", "amb", "monografia"],
        note: ""
    },
    {
        id: 3,
        opera: "Nuovo Trattato di Micologia",
        volume: "*",
        copie: 1,
        autori: "Mario Galli",
        editore: "MAZZOTTA",
        data: "",
        tags: [],
        note: ""
    },
    {
        id: 30,
        opera: "Le guide des Champignos France et Europe",
        volume: "",
        copie: 1,
        autori: "Guillaume Eyssartier, Pierre Roux",
        editore: "",
        data: "",
        tags: [],
        note: ""
    },
    {
        id: 80,
        opera: "Funghi Europaei",
        volume: "1 – Agaricus L: Fr. (Psalliota Fr.)",
        copie: 1,
        autori: "A. Cappelli",
        editore: "Candusso Editrice",
        data: "1984",
        tags: [],
        note: ""
    },
    {
        id: 89,
        opera: "Mycena d'Europa",
        volume: "",
        copie: 1,
        autori: "Giovanni Robich",
        editore: "AMB Fondazione Centro Studi Micologici",
        data: "",
        tags: [],
        note: ""
    },
    {
        id: 90,
        opera: "Mycena d'Europa",
        volume: "2ª Edizione",
        copie: 1,
        autori: "Giovanni Robich",
        editore: "AMB Fondazione Centro Studi Micologici",
        data: "",
        tags: [],
        note: ""
    }

];

const booksGrid = document.getElementById('booksGrid');
const searchInput = document.getElementById('searchInput');
const tagFilters = document.querySelectorAll('.tag-filter');
const visibleCount = document.getElementById('visibleCount');
const totalCount = document.getElementById('totalCount');
const noResults = document.getElementById('noResults');

let activeTag = null;

function renderBooks(filteredBooks) {
    booksGrid.innerHTML = '';

    if (filteredBooks.length === 0) {
        booksGrid.style.display = 'none';
        noResults.style.display = 'block';
    } else {
        booksGrid.style.display = 'grid';
        noResults.style.display = 'none';

        filteredBooks.forEach(book => {
            const card = document.createElement('div');
            card.className = 'book-card';

            const volumeDisplay = book.volume ? `<div class="book-volume">${book.volume}</div>` : '';
            const copiesDisplay = book.copie > 1 ? `<div class="copies-badge">${book.copie} copie</div>` : '';

            const tagsHtml = book.tags.length > 0 ?
                `<div class="book-tags">${book.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}</div>` : '';

            card.innerHTML = `
                        ${copiesDisplay}
                        <div class="book-series">${book.opera}</div>
                        ${volumeDisplay}
                        <div class="book-meta">
                            ${book.autori ? `<div class="meta-row"><span class="meta-label">Autori:</span><span class="meta-value">${book.autori}</span></div>` : ''}
                            ${book.editore ? `<div class="meta-row"><span class="meta-label">Editore:</span><span class="meta-value">${book.editore}</span></div>` : ''}
                            ${book.data ? `<div class="meta-row"><span class="meta-label">Anno:</span><span class="meta-value">${book.data}</span></div>` : ''}
                        </div>
                        ${tagsHtml}
                    `;

            booksGrid.appendChild(card);
        });
    }

    visibleCount.textContent = filteredBooks.length;
    totalCount.textContent = books.length;
}

function filterBooks() {
    const searchTerm = searchInput.value.toLowerCase();

    let filtered = books.filter(book => {
        const matchesSearch = !searchTerm ||
            book.opera.toLowerCase().includes(searchTerm) ||
            (book.volume && book.volume.toLowerCase().includes(searchTerm)) ||
            (book.autori && book.autori.toLowerCase().includes(searchTerm)) ||
            (book.editore && book.editore.toLowerCase().includes(searchTerm));

        const matchesTag = !activeTag || book.tags.includes(activeTag);

        return matchesSearch && matchesTag;
    });

    renderBooks(filtered);
}

searchInput.addEventListener('input', filterBooks);

tagFilters.forEach(button => {
    button.addEventListener('click', () => {
        const tag = button.dataset.tag;

        if (activeTag === tag) {
            activeTag = null;
            button.classList.remove('active');
        } else {
            tagFilters.forEach(b => b.classList.remove('active'));
            activeTag = tag;
            button.classList.add('active');
        }

        filterBooks();
    });
});

// Initial render
renderBooks(books);