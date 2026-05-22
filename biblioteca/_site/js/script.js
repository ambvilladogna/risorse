// Global state
let books = [];
let config = {};
let activeTag = null;
let activeRating = 3;

// DOM elements
const booksGrid = document.getElementById('booksGrid');
const searchInput = document.getElementById('searchInput');
const tagsContainer = document.getElementById('filter-tags');
const ratingFilters = document.querySelectorAll('.rating-filter');
const visibleCount = document.getElementById('visibleCount');
const totalCount = document.getElementById('totalCount');
const noResults = document.getElementById('noResults');

// Advanced sorting function that can handle multiple properties and sort directions
// Books sort by titolo + volume; riviste sort by data + issue_number.
// Mixed collections: riviste always sort by data/issue; books by titolo/volume.
const advancedSort = (props) => {
    return (a, b) => {
        for (let prop of props) {
            let desc = false;
            if (prop.startsWith("-")) {
                desc = true;
                prop = prop.substr(1);
            }

            const valA = String(a[prop] || "");
            const valB = String(b[prop] || "");

            const comparison = valA.localeCompare(valB, undefined, {
                numeric: true,
                sensitivity: 'base'
            });

            if (comparison !== 0) {
                return desc ? comparison * -1 : comparison;
            }
        }
        return 0;
    };
};

function sortMixed(items) {
    return [...items].sort((a, b) => {
        const aIsRivista = a.tipo === 'rivista';
        const bIsRivista = b.tipo === 'rivista';

        // Tipo as primary key: libri (0) before riviste (1)
        if (aIsRivista !== bIsRivista) return aIsRivista ? 1 : -1;

        // Within same tipo: riviste by data + issue_number, libri by titolo + volume
        const keyA = aIsRivista
            ? [String(a.data || '').padStart(4, '0'), String(a.issue_number || 0).padStart(4, '0')]
            : [a.titolo || '', a.volume || ''];
        const keyB = bIsRivista
            ? [String(b.data || '').padStart(4, '0'), String(b.issue_number || 0).padStart(4, '0')]
            : [b.titolo || '', b.volume || ''];

        for (let i = 0; i < keyA.length; i++) {
            const cmp = keyA[i].localeCompare(keyB[i], undefined, { numeric: true, sensitivity: 'base' });
            if (cmp !== 0) return cmp;
        }
        return 0;
    });
}

// Load data on page load
async function loadData() {
    try {
        const [booksResponse, configResponse] = await Promise.all([
            fetch('./data/books.json'),
            fetch('./data/config.json')
        ]);

        books = await booksResponse.json();
        books = sortMixed(books);
        config = await configResponse.json();

        initializeFilters();
        // Use filterBooks when initial filters exist,
        // filerBooks will call renderCards; if no filters, just render all.
        // renderCards(books);
        filterBooks();
    } catch (error) {
        console.error('Error loading data:', error);
        booksGrid.innerHTML = '<p style="text-align: center; color: var(--color-primary);">Errore nel caricamento dei dati.</p>';
    }
}

// Initialize filter buttons from config
function initializeFilters() {
    totalCount.textContent = books.length;

    tagsContainer.innerHTML = config.tags.map(tag =>
        `<button class="tag-filter" data-tag="${tag.label}">${tag.label}</button>`
    ).join('');
}

// ── Render ────────────────────────────────────────────────────────────────────

function renderCards(filteredBooks) {
    booksGrid.innerHTML = '';

    if (filteredBooks.length === 0) {
        booksGrid.style.display = 'none';
        noResults.style.display = 'block';
    } else {
        booksGrid.style.display = 'grid';
        noResults.style.display = 'none';

        const libri = filteredBooks.filter(i => i.tipo !== 'rivista');
        const riviste = filteredBooks.filter(i => i.tipo === 'rivista');
        const hasBoth = libri.length > 0 && riviste.length > 0;

        function appendSection(items, label) {
            if (items.length === 0) return;
            if (hasBoth) {
                const sep = document.createElement('div');
                sep.className = 'section-header';
                sep.innerHTML = `<span class="section-header__label">${label}</span><span class="section-header__count">${items.length}</span>`;
                booksGrid.appendChild(sep);
            }
            items.forEach(item => {
                const card = item.tipo === 'rivista'
                    ? _buildRivistaCard(item)
                    : _buildBookCard(item);
                booksGrid.appendChild(card);
            });
        }

        appendSection(libri, 'Testi');
        appendSection(riviste, 'Riviste');
    }

    visibleCount.textContent = filteredBooks.length;
}

function _buildBookCard(book) {
    const card = document.createElement('div');
    card.className = 'book-card';

    const volumeDisplay = book.volume ? `<div class="book-volume">${book.volume}</div>` : '';
    const ratingStars = getRatingStars(book.rating);

    // add "copie" tag if multiple copies
    const displayTags = [...(book.tags || [])];
    if (book.copie > 1 && !displayTags.some(t => t.includes('copie'))) {
        displayTags.push(`${book.copie} copie`);
    }

    const tagsHtml = displayTags.length > 0
        ? `<div class="book-tags">${displayTags.map(tag =>
            `<span class="${tag.includes('copie') ? 'copies-tag' : 'tag'}">${tag}</span>`
        ).join('')}</div>`
        : '';

    card.innerHTML = `
        <div class="book-header">
            <div class="book-series">${book.titolo}</div>
            ${ratingStars}
        </div>
        ${volumeDisplay}
        <div class="book-meta">
            ${book.autori ? `<div class="meta-row"><span class="meta-label">Autori:</span><span class="meta-value">${book.autori}</span></div>` : ''}
            ${book.editore ? `<div class="meta-row"><span class="meta-label">Editore:</span><span class="meta-value">${book.editore}</span></div>` : ''}
            ${book.data ? `<div class="meta-row"><span class="meta-label">Anno:</span><span class="meta-value">${book.data}</span></div>` : ''}
        </div>
        ${tagsHtml}
    `;

    return card;
}

function _buildRivistaCard(rivista) {
    const card = document.createElement('div');
    card.className = 'book-card book-card--rivista';

    const ratingStars = getRatingStars(rivista.rating);

    // Volume line: "Anno IV · N° 9"
    const volumeParts = [];
    if (rivista.volume) volumeParts.push(rivista.volume);
    if (rivista.issue_number != null) volumeParts.push(`N° ${rivista.issue_number}`);
    const volumeDisplay = volumeParts.length > 0
        ? `<div class="book-volume">${volumeParts.join(' · ')}</div>`
        : '';

    // Period/date line
    const periodoDisplay = rivista.period
        ? `<div class="rivista-period">${rivista.period}</div>`
        : '';

    // Article count badge
    const nArticoli = rivista.articoli?.length ?? 0;
    const articleBadge = nArticoli > 0
        ? `<span class="rivista-badge">${nArticoli} articoli</span>`
        : '';

    // Tags (including copie if needed)
    const displayTags = [...(rivista.tags || [])];
    if (rivista.copie > 1 && !displayTags.some(t => t.includes('copie'))) {
        displayTags.push(`${rivista.copie} copie`);
    }
    const tagsHtml = displayTags.length > 0
        ? `<div class="book-tags">${displayTags.map(tag =>
            `<span class="${tag.includes('copie') ? 'copies-tag' : 'tag'}">${tag}</span>`
        ).join('')}</div>`
        : '';

    card.innerHTML = `
        <div class="book-header">
            <div class="book-series">${rivista.titolo}</div>
            ${ratingStars}
        </div>
        ${volumeDisplay}
        ${periodoDisplay}
        <div class="book-meta">
            ${rivista.editore ? `<div class="meta-row"><span class="meta-label">Editore:</span><span class="meta-value">${rivista.editore}</span></div>` : ''}
            ${rivista.data && !rivista.period ? `<div class="meta-row"><span class="meta-label">Anno:</span><span class="meta-value">${rivista.data}</span></div>` : ''}
            ${rivista.print_date ? `<div class="meta-row"><span class="meta-label">Stampa:</span><span class="meta-value">${rivista.print_date}</span></div>` : ''}
        </div>
        ${tagsHtml}
        ${nArticoli > 0 ? `<div class="rivista-footer">${articleBadge}<button class="rivista-articles-btn" aria-label="Apri sommario">Sommario →</button></div>` : ''}
    `;

    // Open detail panel on card click or button click
    if (nArticoli > 0) {
        const btn = card.querySelector('.rivista-articles-btn');
        btn.addEventListener('click', e => {
            e.stopPropagation();
            rivistaPanel.open(rivista);
        });
        card.addEventListener('click', () => rivistaPanel.open(rivista));
        card.style.cursor = 'pointer';
    }

    return card;
}

// ── Rivista detail panel ──────────────────────────────────────────────────────

const rivistaPanel = (() => {
    let backdrop, panel, panelTitle, panelSubtitle, panelBody;
    let initialized = false;

    function _init() {
        if (initialized) return;
        initialized = true;

        // Backdrop
        backdrop = document.createElement('div');
        backdrop.className = 'panel-backdrop';
        backdrop.addEventListener('click', close);
        document.body.appendChild(backdrop);

        // Panel shell
        panel = document.createElement('div');
        panel.className = 'editor-panel rivista-panel';
        panel.setAttribute('role', 'dialog');
        panel.setAttribute('aria-modal', 'true');
        panel.setAttribute('aria-labelledby', 'rivista-panel-title');

        // Header
        const header = document.createElement('div');
        header.className = 'panel-header';

        const titleBlock = document.createElement('div');
        panelTitle = document.createElement('div');
        panelTitle.className = 'panel-title';
        panelTitle.id = 'rivista-panel-title';
        panelSubtitle = document.createElement('div');
        panelSubtitle.className = 'panel-subtitle';
        titleBlock.appendChild(panelTitle);
        titleBlock.appendChild(panelSubtitle);

        const closeBtn = document.createElement('button');
        closeBtn.className = 'panel-close';
        closeBtn.setAttribute('aria-label', 'Chiudi pannello');
        closeBtn.textContent = '×';
        closeBtn.addEventListener('click', close);

        header.appendChild(titleBlock);
        header.appendChild(closeBtn);

        // Body
        panelBody = document.createElement('div');
        panelBody.className = 'panel-body';

        panel.appendChild(header);
        panel.appendChild(panelBody);
        document.body.appendChild(panel);

        // Escape key
        document.addEventListener('keydown', e => {
            if (e.key === 'Escape' && panel.classList.contains('editor-panel--open')) {
                close();
            }
        });
    }

    function open(rivista) {
        _init();

        // Header text
        const volumeParts = [];
        if (rivista.volume) volumeParts.push(rivista.volume);
        if (rivista.issue_number != null) volumeParts.push(`N° ${rivista.issue_number}`);

        panelTitle.textContent = rivista.titolo;
        panelSubtitle.textContent = [
            volumeParts.join(' · '),
            rivista.period || rivista.data || ''
        ].filter(Boolean).join(' — ');

        // Body: article list
        panelBody.innerHTML = '';

        const articoli = rivista.articoli || [];

        if (articoli.length === 0) {
            panelBody.innerHTML = '<p class="rivista-panel__empty">Nessun articolo indicizzato.</p>';
        } else {
            const list = document.createElement('ol');
            list.className = 'rivista-articles-list';

            articoli.forEach(art => {
                const li = document.createElement('li');
                li.className = 'rivista-article';

                const authorsText = (art.authors || []).join(', ');
                const tagsHtml = (art.tags || []).length > 0
                    ? `<div class="rivista-article__tags">${art.tags.map(t =>
                        `<span class="rivista-article__tag">${t}</span>`
                    ).join('')}</div>`
                    : '';
                const rubricaHtml = art.rubrica && art.rubrica !== art.title
                    ? `<span class="rivista-article__rubrica">${art.rubrica}</span>`
                    : '';

                li.innerHTML = `
                    <div class="rivista-article__page">p. ${art.page_start ?? '—'}</div>
                    <div class="rivista-article__body">
                        ${rubricaHtml}
                        <div class="rivista-article__title">${art.title}</div>
                        ${authorsText ? `<div class="rivista-article__authors">${authorsText}</div>` : ''}
                        ${tagsHtml}
                    </div>
                `;

                list.appendChild(li);
            });

            panelBody.appendChild(list);
        }

        backdrop.classList.add('panel-backdrop--visible');
        panel.classList.add('editor-panel--open');
    }

    function close() {
        if (!initialized) return;
        backdrop.classList.remove('panel-backdrop--visible');
        panel.classList.remove('editor-panel--open');
    }

    return { open, close };
})();

// ── Star rating display ───────────────────────────────────────────────────────

function getRatingStars(rating) {
    if (!rating) return '';

    const stars = [];
    for (let i = 0; i < 3; i++) {
        stars.push(i < rating
            ? '<span class="star star--filled">★</span>'
            : '<span class="star star--empty">☆</span>'
        );
    }

    return `<div class="book-rating">${stars.join('')}</div>`;
}

// ── Filter ────────────────────────────────────────────────────────────────────

function filterBooks() {
    const searchTokens = searchInput.value.toLowerCase().split(/\s+/).filter(t => t.length > 0);

    let filtered = books.filter(item => {
        const isRivista = item.tipo === 'rivista';

        const matchesSearch = searchTokens.every(token => {
            // Common fields
            const inCommon =
                (item.titolo || '').toLowerCase().includes(token) ||
                (item.volume || '').toLowerCase().includes(token) ||
                (item.editore || '').toLowerCase().includes(token) ||
                (item.data || '').toLowerCase().includes(token) ||
                (item.tags || []).some(tag => tag.toLowerCase().includes(token));

            if (inCommon) return true;

            if (isRivista) {
                // Search in article titles and article tags
                return (item.articoli || []).some(art =>
                    (art.title || '').toLowerCase().includes(token) ||
                    (art.authors || []).some(a => a.toLowerCase().includes(token)) ||
                    (art.tags || []).some(t => t.toLowerCase().includes(token)) ||
                    (art.rubrica || '').toLowerCase().includes(token)
                );
            } else {
                // Book-only field: autori
                return (item.autori || '').toLowerCase().includes(token);
            }
        });

        const matchesTag = !activeTag || (item.tags || []).includes(activeTag);
        const matchesRating = !activeRating || item.rating === activeRating;

        return matchesSearch && matchesTag && matchesRating;
    });

    renderCards(filtered);
}

// ── Event listeners ───────────────────────────────────────────────────────────

searchInput.addEventListener('input', filterBooks);

tagsContainer.addEventListener('click', (e) => {
    const tagFilters = document.querySelectorAll('.tag-filter');
    const button = e.target.closest('.tag-filter');
    if (!button) return;

    const tag = button.dataset.tag;

    if (activeTag === tag) {
        activeTag = null;
        button.classList.remove('active');
    } else {
        tagFilters.forEach(b => b.classList.remove('active'));
        activeTag = tag;
        button.classList.add('active');
    }

    button.blur();
    filterBooks();
});

ratingFilters.forEach(button => {
    button.addEventListener('click', () => {
        const rating = parseInt(button.dataset.rating);

        if (activeRating === rating) {
            activeRating = null;
            button.classList.remove('active');
        } else {
            ratingFilters.forEach(b => b.classList.remove('active'));
            activeRating = rating;
            button.classList.add('active');
        }

        button.blur();
        filterBooks();
    });
});

// ── Init ──────────────────────────────────────────────────────────────────────

loadData();