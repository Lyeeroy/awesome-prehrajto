/**
 * Iframe Handler Module
 * Handles iframe-based video player implementation
 */

var IframeHandler = (function() {
    'use strict';

    var originalVideoElement = null;
    var iframeElement = null;
    var parentContainer = null;
    var videoUrl = null;

    /**
     * Replace the native video element with an iframe
     */
    function replaceWithIframe() {
        var parentDiv = document.getElementById('content_video');
        if (!parentDiv) {
            console.log('[IframeHandler] <div id="content_video"> not found on the page.');
            return false;
        }

        // Check if already replaced
        if (iframeElement && iframeElement.parentNode) {
            console.log('[IframeHandler] Iframe already in place.');
            return true;
        }

        // Find the video element
        var videoElement = parentDiv.querySelector('video.vjs-tech[src*="storage"]');
        if (!videoElement) {
            // Try alternative selector
            videoElement = parentDiv.querySelector('video[src*="storage"]');
        }

        if (videoElement) {
            videoUrl = videoElement.getAttribute('src');
            console.log('[IframeHandler] Found <video> with URL: ' + videoUrl);

            // Store reference to original video and its container
            originalVideoElement = videoElement;
            parentContainer = parentDiv;

            // Create iframe element
            iframeElement = document.createElement('iframe');
            iframeElement.src = videoUrl;
            iframeElement.style.width = "100%";
            iframeElement.style.aspectRatio = "16 / 9";
            iframeElement.frameBorder = "0";
            iframeElement.allowFullscreen = true;

            // Replace parent div with iframe
            if (parentDiv.parentNode) {
                parentDiv.parentNode.replaceChild(iframeElement, parentDiv);
                console.log('[IframeHandler] Replaced <div id="content_video"> with <iframe>: ' + videoUrl);
            }

            return true;
        } else {
            console.log('[IframeHandler] No <video> element with "storage" in src found inside <div id="content_video">.');
            return false;
        }
    }

    /**
     * Revert iframe back to native video element
     */
    function revertIframe() {
        if (!iframeElement || !iframeElement.parentNode) {
            console.log('[IframeHandler] No iframe to revert.');
            return false;
        }

        if (parentContainer && originalVideoElement) {
            // Replace iframe with original container
            iframeElement.parentNode.replaceChild(parentContainer, iframeElement);
            console.log('[IframeHandler] Reverted to native video player.');

            // Clear references
            iframeElement = null;
            
            // Restore video element visibility if it was hidden
            if (originalVideoElement) {
                originalVideoElement.style.display = '';
            }
            
            return true;
        } else {
            console.log('[IframeHandler] Cannot revert: missing container or video reference.');
            return false;
        }
    }

    /**
     * Get current video URL
     */
    function getVideoUrl() {
        return videoUrl;
    }

    /**
     * Check if iframe mode is active
     */
    function isIframeActive() {
        return iframeElement !== null && iframeElement.parentNode !== null;
    }

    // Public API
    return {
        replaceWithIframe: replaceWithIframe,
        revertIframe: revertIframe,
        getVideoUrl: getVideoUrl,
        isIframeActive: isIframeActive
    };

})();
