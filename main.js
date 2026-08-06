// ==UserScript==
// @name         prehrajto paywall bypass
// @namespace    http://tampermonkey.net/
// @version      0
// @description  try to take over the world!
// @match        https://prehraj.to/*
// @include      https://prehrajto.cz/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=prehraj.to
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    /* =========================================================
     *  PART 1: Block tracking requests that set cookies
     * ========================================================= */

    // Any request URL containing one of these substrings will be blocked.
    // "videoVisit" sets the free-view tracking cookie server-side.
    // The others (from video-js-player.js) log progress/commission - also blocked defensively.
    var BLOCKED_URL_PATTERNS = [
        'videoVisit',
        'video-view-progress',
        'videoViewCommission',
        'video-started'
    ];

    function isBlockedUrl(url) {
        if (!url || typeof url !== 'string') return false;
        for (var i = 0; i < BLOCKED_URL_PATTERNS.length; i++) {
            if (url.indexOf(BLOCKED_URL_PATTERNS[i]) !== -1) return true;
        }
        return false;
    }

    var originalFetch = window.fetch;
    window.fetch = function (input, init) {
        var url = typeof input === 'string' ? input : (input && input.url);
        if (isBlockedUrl(url)) {
            console.log('[Bypass] Blocked fetch:', url);
            return Promise.reject(new Error('Blocked by userscript'));
        }
        return originalFetch.apply(this, arguments);
    };

    var originalOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function (method, url) {
        if (isBlockedUrl(url)) {
            console.log('[Bypass] Blocked XHR:', url);
            this.abort();
            return;
        }
        return originalOpen.apply(this, arguments);
    };


    /* =========================================================
     *  PART 2: Disable view-time counter / free-limit redirect
     * ========================================================= */

    var _videojs;

    function patchPlayer(player) {
        if (!player || typeof player.on !== 'function' || player.__viewLimitPatched) {
            return player;
        }
        player.__viewLimitPatched = true;

        var originalOn = player.on.bind(player);

        player.on = function (type, fn) {
            try {
                if (type === 'timeupdate' &&
                    typeof fn === 'function' &&
                    fn.toString().indexOf('freeLimitPlay') !== -1) {
                    console.log('%c[Bypass] Blocked free-limit / view-counter handler', 'color:orange;font-weight:bold');
                    return player;
                }
            } catch (e) {}
            return originalOn.apply(player, arguments);
        };

        return player;
    }

    function wrapVideojs(realVideojs) {
        if (typeof realVideojs !== 'function' || realVideojs.__bypassWrapped) {
            return realVideojs;
        }

        var wrapped = function () {
            var result = realVideojs.apply(this, arguments);
            if (result && typeof result.on === 'function') {
                patchPlayer(result);
            }
            return result;
        };

        Object.getOwnPropertyNames(realVideojs).forEach(function (key) {
            try {
                var desc = Object.getOwnPropertyDescriptor(realVideojs, key);
                Object.defineProperty(wrapped, key, desc);
            } catch (e) {
                try { wrapped[key] = realVideojs[key]; } catch (e2) {}
            }
        });

        wrapped.prototype = realVideojs.prototype;
        wrapped.__bypassWrapped = true;

        return wrapped;
    }

    try {
        Object.defineProperty(window, 'videojs', {
            configurable: true,
            enumerable: true,
            get: function () { return _videojs; },
            set: function (v) { _videojs = wrapVideojs(v); }
        });
    } catch (e) {
        console.error('[Bypass] Failed to hook window.videojs', e);
    }

    var safetyInterval = setInterval(function () {
        if (window.videojs && typeof window.videojs.getPlayer === 'function') {
            try {
                var p = window.videojs.getPlayer('content_video');
                if (p) patchPlayer(p);
            } catch (e) {}
        }
    }, 1000);
    setTimeout(function () { clearInterval(safetyInterval); }, 30000);

})();
