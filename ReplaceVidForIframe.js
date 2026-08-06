// ==UserScript==
// @name         free prehraj.to
// @namespace    http://tampermonkey.net/
// @version      10.01.2025
// @description  replace div for iframe, block cookie from being stored
// @match        https://prehraj.to/*
// @include      https://prehrajto.cz/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';
    const blockUrl = 'videoVisit';

    window.fetch = (...args) => {
        if (args[0].includes(blockUrl)) {
            console.log('Blocked:', args[0]);
            return Promise.reject(new Error('Blocked'));
        }
        return fetch(...args);
    };

    XMLHttpRequest.prototype.open = function(method, url) {
        if (url.includes(blockUrl)) {
            console.log('Blocked:', url);
            this.abort();
        } else {
            return XMLHttpRequest.prototype.open.apply(this, arguments);
        }
    };

    const parentDiv = document.getElementById('content_video');
    if (parentDiv) {
        const videoElement = parentDiv.querySelector('video.vjs-tech[src*="storage"]');
        if (videoElement) {
            const videoUrl = videoElement.getAttribute('src');
            console.log(`1/2 - Found <video> with URL: ${videoUrl}`);

            const iframeElement = document.createElement('iframe');
            iframeElement.src = videoUrl;
            iframeElement.style.width = "100%";
            iframeElement.style.aspectRatio = "16 / 9";
            iframeElement.frameBorder = "0";
            iframeElement.allowFullscreen = true;

            parentDiv.parentNode.replaceChild(iframeElement, parentDiv);
            console.log(`2/2 - Replaced <div id="content_video"> with <iframe>: ${videoUrl}`);
        } else {
            console.log('No <video> element with "storage" in src found inside <div id="content_video">.');
        }
    } else {
        console.log('<div id="content_video"> not found on the page.');
    }
})();
