// Bloat Hider Configuration
const CONFIG = {
    ENABLE_BLOAT_HIDER: true,
    HIDE_PREMIUM_BANNER: true,
    HIDE_FEEDBACK_WIDGET: true,
    HIDE_ADS: true,
    HIDE_PROMOTIONS: true
};

// Banners to hide with their selectors and conditions
const BANNERS_TO_HIDE = [
    {
        name: 'premium-banner',
        selector: '.upper-banner-small.upper-banner-small-green',
        enabled: () => CONFIG.HIDE_PREMIUM_BANNER
    },
    {
        name: 'feedback-widget',
        selector: '#feedback__handle, .feedback__handle',
        enabled: () => CONFIG.HIDE_FEEDBACK_WIDGET
    }
];

// Function to hide matching elements
function hideElements() {
    if (!CONFIG.ENABLE_BLOAT_HIDER) return;
    
    BANNERS_TO_HIDE.forEach(banner => {
        if (banner.enabled()) {
            const elements = document.querySelectorAll(banner.selector);
            elements.forEach(el => {
                el.style.display = 'none';
            });
        }
    });
}

// Hide elements when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', hideElements);
} else {
    hideElements();
}

// Watch for dynamically added content
const observer = new MutationObserver(hideElements);
observer.observe(document.body, { childList: true, subtree: true });
