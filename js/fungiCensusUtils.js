// Get URL parameters
function getUrlParameter(name) {
    name = name.replace(/[\[]/, '\\[').replace(/[\]]/, '\\]');
    const regex = new RegExp('[\\?&]' + name + '=([^&#]*)');
    const results = regex.exec(location.search);
    return results === null ? '' : decodeURIComponent(results[1].replace(/\+/g, ' '));
}

// Go back function
function goBack() {
    // Check if there is a referrer and it belongs to your internal site
    if (document.referrer && document.referrer.includes(window.location.hostname)) {
        // Force the browser to navigate straight to the actual previous URL
        window.location.href = document.referrer;
    } else {
        // Fallback if they arrived from an external site or a new tab
        window.location.href = './index.html';
    }
}