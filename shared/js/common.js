const header = document.querySelector('.header');
const root = document.documentElement;

// Function to update header height CSS variable
function updateHeaderHeight() {
    const headerHeight = header.offsetHeight;
    root.style.setProperty('--header-height', `${headerHeight}px`);
}

// Update on page load
updateHeaderHeight();

// Update on scroll
let isScrolled = false;

window.addEventListener('scroll', () => {
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;

    // hysteresys to prevent flickering when scrolling around the threshold
    if (!isScrolled && scrollTop > 80) {
        isScrolled = true;
        header.classList.add('header--scrolled');
        header.addEventListener('transitionend', updateHeaderHeight, { once: true });
    } else if (isScrolled && scrollTop < 10) {
        isScrolled = false;
        header.classList.remove('header--scrolled');
        header.addEventListener('transitionend', updateHeaderHeight, { once: true });
    }
    // In the dead zone (10–80px): do nothing
});

// Update on window resize
window.addEventListener('resize', updateHeaderHeight);

// ── HTML escaping ────────────────────────────────────────────────────────────
// All data coming from JSON files maintained in separate repos must be treated 
// as untrusted text whenever it's interpolated into an innerHTML template.
// This never touches values inserted via .textContent, which are already safe.
const ESCAPE_MAP = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
    '': '&#x60;'
};
function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, ch => (ESCAPE_MAP[ch]));
}