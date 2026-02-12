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
window.addEventListener('scroll', () => {
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;

    if (scrollTop > 50) {
        header.classList.add('header--scrolled');
    } else {
        header.classList.remove('header--scrolled');
    }

    // Update height after class change (with small delay for transition)
    setTimeout(updateHeaderHeight, 10);
});

// Update on window resize
window.addEventListener('resize', updateHeaderHeight);

// Handle back-to-top button with proper offset
document.querySelector('.back-to-top')?.addEventListener('click', (e) => {
    e.preventDefault();
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
});