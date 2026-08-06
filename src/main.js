// ==UserScript==
// @name         prehrajto paywall bypass
// @namespace    http://tampermonkey.net/
// @version      0
// @description  try to take over the world!
// @match        https://prehraj.to/*
// @include      https://prehrajto.cz/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=prehraj.to
// @grant        none
// @require      file:///workspace/src/iframe-handler.js
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

    /* =========================================================
     *  PART 3: Player Mode Toggle Buttons
     * ========================================================= */

    var currentMode = 'native'; // 'native' or 'iframe'
    var originalVideoState = null; // Store original video element state

    function createToggleButton(text, onClick) {
        var btn = document.createElement('button');
        btn.textContent = text;
        btn.style.padding = '8px 16px';
        btn.style.margin = '0 4px';
        btn.style.cursor = 'pointer';
        btn.style.border = '1px solid #ccc';
        btn.style.backgroundColor = '#f0f0f0';
        btn.style.borderRadius = '4px';
        btn.addEventListener('click', onClick);
        return btn;
    }

    function switchToNativePlayer() {
        if (currentMode === 'native') return;
        
        // Revert iframe and restore native video
        IframeHandler.revertIframe();
        
        // Update button visibility
        updateButtonVisibility();
        
        currentMode = 'native';
        console.log('[Bypass] Switched to Native Player');
    }

    function switchToIframePlayer() {
        if (currentMode === 'iframe') return;
        
        // Replace native video with iframe
        IframeHandler.replaceWithIframe();
        
        // Update button visibility
        updateButtonVisibility();
        
        currentMode = 'iframe';
        console.log('[Bypass] Switched to Iframe Player');
    }

    function updateButtonVisibility() {
        var nativeBtn = document.getElementById('btn-native-player');
        var iframeBtn = document.getElementById('btn-iframe-player');
        
        if (!nativeBtn || !iframeBtn) return;
        
        // Show only the button for the inactive mode
        if (currentMode === 'native') {
            nativeBtn.style.display = 'none';
            iframeBtn.style.display = 'inline-block';
        } else {
            nativeBtn.style.display = 'inline-block';
            iframeBtn.style.display = 'none';
        }
    }

    function initializeToggleButtons() {
        var controlContainer = document.querySelector('.tabs__control-players');
        if (!controlContainer) {
            console.log('[Bypass] Control container not found, retrying...');
            setTimeout(initializeToggleButtons, 500);
            return;
        }

        // Check if buttons already exist
        if (document.getElementById('btn-native-player')) {
            return;
        }

        // Create Native Player button
        var nativeBtn = createToggleButton('Native Player', switchToNativePlayer);
        nativeBtn.id = 'btn-native-player';
        nativeBtn.style.display = 'none'; // Hidden initially since native is default

        // Create Iframe Player button
        var iframeBtn = createToggleButton('Iframe Player', switchToIframePlayer);
        iframeBtn.id = 'btn-iframe-player';
        iframeBtn.style.display = 'inline-block'; // Visible initially

        // Append buttons to the control container
        controlContainer.appendChild(nativeBtn);
        controlContainer.appendChild(iframeBtn);

        console.log('[Bypass] Toggle buttons initialized');
    }

    // Initialize buttons after DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeToggleButtons);
    } else {
        initializeToggleButtons();
    }

})();

