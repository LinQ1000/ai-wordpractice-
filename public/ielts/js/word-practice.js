(function () {
    'use strict';
    var frame = document.getElementById('word-practice-frame');
    var mode = new URLSearchParams(location.search).get('wordMode');
    if (['study', 'review', 'mistakes', 'stats', 'settings'].includes(mode)) {
        frame.src = '/?embedded=1#' + mode;
    }
    document.querySelectorAll('[data-word-practice-entry]').forEach(function (button) {
        button.addEventListener('click', function () {
            document.querySelector('.main-nav [data-view="word-practice"]').click();
        });
    });
    window.addEventListener('message', function (event) {
        if (event.origin !== location.origin || event.source !== frame.contentWindow) return;
        if (!event.data || event.data.type !== 'word-practice-height') return;
        var height = event.data.height;
        if (typeof height === 'number' && Number.isFinite(height) && height > 0) {
            frame.style.height = Math.max(480, Math.ceil(height) + 8) + 'px';
        }
    });
    // Stop word audio when returning to a reading tab; keep the exercise mounted.
    var view = document.getElementById('word-practice-view');
    new MutationObserver(function () {
        if (!view.classList.contains('active') && 'speechSynthesis' in window) {
            window.speechSynthesis.cancel();
        }
    }).observe(view, { attributes: true, attributeFilter: ['class'] });
})();
