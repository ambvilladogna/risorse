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
        window.location.href = './index.html';
    }
}