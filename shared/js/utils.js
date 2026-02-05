/**
 * URL Parameter Utilities
 * Usage: const genus = URLParams.get('genus');
 */
const URLParams = {
    get: function (key) {
        return new URLSearchParams(window.location.search).get(key);
    },

    navigate: function (url, params) {
        const query = new URLSearchParams(params).toString();
        window.location.href = `${url}${query ? '?' + query : ''}`;
    },

    back: function () {
        window.history.back();
    }
};