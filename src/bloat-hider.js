// ==UserScript==
// @name         prehrajto bloat hider
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Hide promotional banners and UI bloat
// @match        https://prehraj.to/*
// @include      https://prehrajto.cz/*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    /* =========================================================
     *  CONFIGURATION - Toggle what to hide
     * ========================================================= */
    var CONFIG = {
        // Master switch - set to false to disable all hiding
        ENABLE_BLOAT_HIDER: true,

        // Individual banner toggles (all enabled by default)
        HIDE_PREMIUM_BANNER: true,
        HIDE_ADS: true,
        HIDE_PROMOTIONS: true
    };

    /* =========================================================
     *  BANNERS DEFINITION - Easy to extend with new selectors
     * ========================================================= */
    var BANNERS_TO_HIDE = [
        {
            name: 'premium-banner',
            selector: '.upper-banner-small.upper-banner-small-green',
            enabled: function() { return CONFIG.HIDE_PREMIUM_BANNER; }
        },
        // Add more banners here in the future:
        // {
        //     name: 'ad-banner',
        //     selector: '.ad-container',
        //     enabled: function() { return CONFIG.HIDE_ADS; }
        // }
    ];

    /* =========================================================
     *  CORE LOGIC
     * ========================================================= */

    /**
     * Hide a single element by selector
     * @param {string} selector - CSS selector
     * @returns {boolean} - true if element was found and hidden
     */
    function hideElement(selector) {
        var elements = document.querySelectorAll(selector);
        if (elements.length === 0) return false;

        for (var i = 0; i < elements.length; i++) {
            var el = elements[i];
            if (el && el.style.display !== 'none') {
                el.style.display = 'none';
            }
        }
        return elements.length > 0;
    }

    /**
     * Scan and hide all configured banners
     */
    function scanAndHideBanners() {
        if (!CONFIG.ENABLE_BLOAT_HIDER) return;

        var hiddenCount = 0;

        for (var i = 0; i < BANNERS_TO_HIDE.length; i++) {
            var banner = BANNERS_TO_HIDE[i];

            try {
                if (banner.enabled()) {
                    if (hideElement(banner.selector)) {
                        hiddenCount++;
                        console.log('[BloatHider] Hidden:', banner.name);
                    }
                }
            } catch (e) {
                console.warn('[BloatHider] Error processing banner:', banner.name, e);
            }
        }

        if (hiddenCount > 0) {
            console.log('[BloatHider] Hidden', hiddenCount, 'element(s)');
        }
    }

    /**
     * Initialize observer to watch for dynamically added content
     */
    function initMutationObserver() {
        if (!CONFIG.ENABLE_BLOAT_HIDER) return;

        var observer = new MutationObserver(function (mutations) {
            scanAndHideBanners();
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        console.log('[BloatHider] Mutation observer initialized');
    }

    /* =========================================================
     *  INITIALIZATION
     * ========================================================= */

    function init() {
        if (!CONFIG.ENABLE_BLOAT_HIDER) {
            console.log('[BloatHider] Disabled via config');
            return;
        }

        console.log('[BloatHider] Initialized');

        // Run immediately
        scanAndHideBanners();

        // Set up observer for dynamic content
        if (document.body) {
            initMutationObserver();
        } else {
            document.addEventListener('DOMContentLoaded', function () {
                initMutationObserver();
            });
        }
    }

    // Start when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
