/**
 * Prehraj.to Video Player Module
 * Lightweight HLS/MP4 player inspired by p-stream's player architecture
 * Dependencies: hls.js (loaded via CDN if not present)
 */

(function() {
    'use strict';

    // Configuration
    const CONFIG = {
        ENABLE_PLAYER: true,
        AUTO_PLAY: true,
        SHOW_CONTROLS: true,
        DEFAULT_QUALITY: 'auto', // 'auto', '1080', '720', '480', '360'
        VOLUME: 1.0,
        CONTROLS_TIMEOUT: 3000,
        KEYBOARD_SHORTCUTS: true
    };

    // State
    let playerInstance = null;
    let hlsInstance = null;
    let controlsTimeout = null;
    let isFullscreen = false;
    let wasPausedBeforeSeek = false;

    /**
     * Check if HLS.js is available, load from CDN if not
     */
    function ensureHlsJs() {
        return new Promise((resolve, reject) => {
            if (window.Hls && typeof window.Hls === 'function') {
                resolve(window.Hls);
                return;
            }

            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/hls.js@latest/dist/hls.min.js';
            script.onload = () => resolve(window.Hls);
            script.onerror = () => reject(new Error('Failed to load HLS.js'));
            document.head.appendChild(script);
        });
    }

    /**
     * Create player container with controls
     */
    function createPlayerContainer() {
        const container = document.createElement('div');
        container.className = 'prehrajto-player-container';
        container.innerHTML = `
            <div class="prehrajto-player-wrapper">
                <video class="prehrajto-player-video" playsinline preload="metadata"></video>
                <div class="prehrajto-player-controls">
                    <div class="prehrajto-player-top-controls">
                        <button class="prehrajto-player-btn prehrajtoback-btn" title="Back">
                            <svg viewBox="0 0 24 24" width="24" height="24"><path fill="currentColor" d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>
                        </button>
                    </div>
                    <div class="prehrajto-player-center-controls">
                        <button class="prehrajto-player-btn prehrajtobplay-btn" title="Play/Pause">
                            <svg class="play-icon" viewBox="0 0 24 24" width="48" height="48"><path fill="currentColor" d="M8 5v14l11-7z"/></svg>
                            <svg class="pause-icon" viewBox="0 0 24 24" width="48" height="48" style="display:none;"><path fill="currentColor" d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                        </button>
                    </div>
                    <div class="prehrajto-player-bottom-controls">
                        <div class="prehrajto-player-progress-container">
                            <div class="prehrajto-player-progress-bar">
                                <div class="prehrajto-player-progress-buffered"></div>
                                <div class="prehrajto-player-progress-filled"></div>
                                <div class="prehrajto-player-progress-thumb"></div>
                            </div>
                        </div>
                        <div class="prehrajto-player-controls-row">
                            <div class="prehrajto-player-controls-left">
                                <button class="prehrajto-player-btn prehrajtobplay-small-btn" title="Play/Pause">
                                    <svg class="play-icon" viewBox="0 0 24 24" width="24" height="24"><path fill="currentColor" d="M8 5v14l11-7z"/></svg>
                                    <svg class="pause-icon" viewBox="0 0 24 24" width="24" height="24" style="display:none;"><path fill="currentColor" d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                                </button>
                                <div class="prehrajto-player-volume-container">
                                    <button class="prehrajto-player-btn prehrajtobvolume-btn" title="Mute/Unmute">
                                        <svg class="volume-high" viewBox="0 0 24 24" width="24" height="24"><path fill="currentColor" d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>
                                        <svg class="volume-mute" viewBox="0 0 24 24" width="24" height="24" style="display:none;"><path fill="currentColor" d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73 4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>
                                    </button>
                                    <input type="range" class="prehrajto-player-volume-slider" min="0" max="1" step="0.05" value="1">
                                </div>
                                <div class="prehrajto-player-time">
                                    <span class="prehrajto-player-current-time">0:00</span>
                                    <span class="prehrajto-player-duration">0:00</span>
                                </div>
                            </div>
                            <div class="prehrajto-player-controls-right">
                                <button class="prehrajto-player-btn prehrajtobquality-btn" title="Quality">
                                    <svg viewBox="0 0 24 24" width="24" height="24"><path fill="currentColor" d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14h-2v-4H6v-2h4V7h2v4h4v2h-4v4z"/></svg>
                                    <span class="prehrajto-player-quality-label">AUTO</span>
                                </button>
                                <button class="prehrajto-player-btn prehrajtobpip-btn" title="Picture in Picture">
                                    <svg viewBox="0 0 24 24" width="24" height="24"><path fill="currentColor" d="M19 11h-8v6h8v-6zm4 8V4.98C23 3.88 22.1 3 21 3H3c-1.1 0-2 .88-2 1.98V19c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2zm-2 .02H3V4.97h18v14.05z"/></svg>
                                </button>
                                <button class="prehrajto-player-btn prehrajtobfullscreen-btn" title="Fullscreen">
                                    <svg class="fullscreen-enter" viewBox="0 0 24 24" width="24" height="24"><path fill="currentColor" d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/></svg>
                                    <svg class="fullscreen-exit" viewBox="0 0 24 24" width="24" height="24" style="display:none;"><path fill="currentColor" d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"/></svg>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="prehrajto-player-overlay"></div>
            </div>
        `;
        return container;
    }

    /**
     * Format time in MM:SS or HH:MM:SS
     */
    function formatTime(seconds) {
        if (isNaN(seconds)) return '0:00';
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        
        if (hrs > 0) {
            return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    /**
     * Initialize player on a video element or container
     */
    async function initPlayer(containerOrVideo, sourceUrl, options = {}) {
        if (!CONFIG.ENABLE_PLAYER) return null;

        await ensureHlsJs();

        const Hls = window.Hls;
        const container = containerOrVideo.tagName === 'VIDEO' 
            ? containerOrVideo.parentElement 
            : containerOrVideo;
        
        // Remove existing player if present
        const existingPlayer = container.querySelector('.prehrajto-player-container');
        if (existingPlayer) {
            destroyPlayer(existingPlayer);
        }

        const playerContainer = createPlayerContainer();
        const wrapper = playerContainer.querySelector('.prehrajto-player-wrapper');
        const video = playerContainer.querySelector('.prehrajto-player-video');
        const controls = playerContainer.querySelector('.prehrajto-player-controls');
        const overlay = playerContainer.querySelector('.prehrajto-player-overlay');
        
        // Buttons
        const playBtnLarge = playerContainer.querySelector('.prehrajto-play-btn');
        const playBtnSmall = playerContainer.querySelector('.prehrajto-play-small-btn');
        const volumeBtn = playerContainer.querySelector('.prehrajto-volume-btn');
        const volumeSlider = playerContainer.querySelector('.prehrajto-volume-slider');
        const qualityBtn = playerContainer.querySelector('.prehrajto-quality-btn');
        const qualityLabel = playerContainer.querySelector('.prehrajto-quality-label');
        const pipBtn = playerContainer.querySelector('.prehrajto-pip-btn');
        const fullscreenBtn = playerContainer.querySelector('.prehrajto-fullscreen-btn');
        const backBtn = playerContainer.querySelector('.prehrajto-back-btn');
        
        // Progress
        const progressContainer = playerContainer.querySelector('.prehrajto-player-progress-container');
        const progressBar = playerContainer.querySelector('.prehrajto-player-progress-bar');
        const progressFilled = playerContainer.querySelector('.prehrajto-player-progress-filled');
        const progressBuffered = playerContainer.querySelector('.prehrajto-player-progress-buffered');
        const currentTimeEl = playerContainer.querySelector('.prehrajto-player-current-time');
        const durationEl = playerContainer.querySelector('.prehrajto-player-duration');

        // Icons
        const playIcons = playerContainer.querySelectorAll('.play-icon');
        const pauseIcons = playerContainer.querySelectorAll('.pause-icon');
        const volumeHighIcons = playerContainer.querySelectorAll('.volume-high');
        const volumeMuteIcons = playerContainer.querySelectorAll('.volume-mute');
        const fullscreenEnterIcons = playerContainer.querySelectorAll('.fullscreen-enter');
        const fullscreenExitIcons = playerContainer.querySelectorAll('.fullscreen-exit');

        // Apply options
        const settings = { ...CONFIG, ...options };
        video.volume = settings.VOLUME;
        volumeSlider.value = settings.VOLUME;

        // Insert player into DOM
        if (containerOrVideo.tagName === 'VIDEO') {
            containerOrVideo.style.display = 'none';
            container.insertBefore(playerContainer, containerOrVideo.nextSibling);
        } else {
            container.appendChild(playerContainer);
        }

        // Load source
        function loadSource(url) {
            if (Hls.isSupported() && url.includes('.m3u8')) {
                if (hlsInstance) {
                    hlsInstance.destroy();
                }
                
                hlsInstance = new Hls({
                    enableWorker: true,
                    lowLatencyMode: true,
                    backBufferLength: 90
                });

                hlsInstance.loadSource(url);
                hlsInstance.attachMedia(video);
                
                hlsInstance.on(Hls.Events.MANIFEST_PARSED, () => {
                    if (settings.AUTO_PLAY) {
                        video.play().catch(() => {});
                    }
                });

                hlsInstance.on(Hls.Events.LEVEL_SWITCHED, (_, data) => {
                    const level = hlsInstance.levels[data.level];
                    if (level) {
                        qualityLabel.textContent = level.height >= 2160 ? '4K' : 
                                                   level.height >= 1080 ? '1080' :
                                                   level.height >= 720 ? '720' :
                                                   level.height >= 480 ? '480' : '360';
                    }
                });
            } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
                // Native HLS support (Safari)
                video.src = url;
                video.addEventListener('loadedmetadata', () => {
                    if (settings.AUTO_PLAY) {
                        video.play().catch(() => {});
                    }
                });
            } else {
                // MP4 or other formats
                video.src = url;
                video.addEventListener('loadedmetadata', () => {
                    if (settings.AUTO_PLAY) {
                        video.play().catch(() => {});
                    }
                });
            }
        }

        loadSource(sourceUrl);

        // Play/Pause toggle
        function togglePlay() {
            if (video.paused) {
                video.play().catch(() => {});
            } else {
                video.pause();
            }
        }

        function updatePlayPauseUI() {
            playIcons.forEach(icon => icon.style.display = video.paused ? '' : 'none');
            pauseIcons.forEach(icon => icon.style.display = video.paused ? 'none' : '');
        }

        playBtnLarge.addEventListener('click', togglePlay);
        playBtnSmall.addEventListener('click', togglePlay);
        video.addEventListener('click', (e) => {
            if (e.target !== progressBar && e.target !== progressContainer) {
                togglePlay();
            }
        });
        video.addEventListener('play', updatePlayPauseUI);
        video.addEventListener('pause', updatePlayPauseUI);

        // Volume control
        volumeBtn.addEventListener('click', () => {
            if (video.volume > 0) {
                video.dataset.lastVolume = video.volume;
                video.volume = 0;
                volumeSlider.value = 0;
            } else {
                video.volume = video.dataset.lastVolume || 0.5;
                volumeSlider.value = video.volume;
            }
            updateVolumeUI();
        });

        volumeSlider.addEventListener('input', (e) => {
            video.volume = parseFloat(e.target.value);
            updateVolumeUI();
        });

        function updateVolumeUI() {
            const isMuted = video.volume === 0;
            volumeHighIcons.forEach(icon => icon.style.display = isMuted ? 'none' : '');
            volumeMuteIcons.forEach(icon => icon.style.display = isMuted ? '' : 'none');
        }

        // Progress bar
        function updateProgress() {
            const percent = (video.currentTime / video.duration) * 100;
            progressFilled.style.width = `${percent}%`;
            currentTimeEl.textContent = formatTime(video.currentTime);
            durationEl.textContent = formatTime(video.duration);
        }

        function updateBuffered() {
            if (video.buffered.length > 0) {
                const bufferedEnd = video.buffered.end(video.buffered.length - 1);
                const duration = video.duration;
                const percent = (bufferedEnd / duration) * 100;
                progressBuffered.style.width = `${percent}%`;
            }
        }

        video.addEventListener('timeupdate', updateProgress);
        video.addEventListener('progress', updateBuffered);

        // Seek
        function seek(e) {
            const rect = progressBar.getBoundingClientRect();
            const pos = (e.clientX - rect.left) / rect.width;
            video.currentTime = pos * video.duration;
        }

        progressBar.addEventListener('click', seek);
        
        let isDragging = false;
        progressContainer.addEventListener('mousedown', () => isDragging = true);
        progressContainer.addEventListener('mouseup', () => isDragging = false);
        progressContainer.addEventListener('mousemove', (e) => {
            if (isDragging) seek(e);
        });

        // Quality selector (simple implementation)
        qualityBtn.addEventListener('click', () => {
            if (hlsInstance) {
                const currentLevel = hlsInstance.currentLevel;
                const levels = hlsInstance.levels;
                
                if (currentLevel === -1) {
                    // Auto -> Highest
                    hlsInstance.currentLevel = levels.length - 1;
                } else if (currentLevel === 0) {
                    // Lowest -> Auto
                    hlsInstance.currentLevel = -1;
                } else {
                    // Downgrade
                    hlsInstance.currentLevel = currentLevel - 1;
                }
            }
        });

        // Picture in Picture
        pipBtn.addEventListener('click', async () => {
            try {
                if (document.pictureInPictureElement) {
                    await document.exitPictureInPicture();
                } else {
                    await video.requestPictureInPicture();
                }
            } catch (err) {
                console.warn('PiP not supported:', err);
            }
        });

        // Fullscreen
        fullscreenBtn.addEventListener('click', () => {
            if (!document.fullscreenElement) {
                wrapper.requestFullscreen().catch(() => {});
            } else {
                document.exitFullscreen().catch(() => {});
            }
        });

        document.addEventListener('fullscreenchange', () => {
            isFullscreen = !!document.fullscreenElement;
            fullscreenEnterIcons.forEach(icon => icon.style.display = isFullscreen ? 'none' : '');
            fullscreenExitIcons.forEach(icon => icon.style.display = isFullscreen ? '' : 'none');
        });

        // Back button
        if (backBtn && options.onBack) {
            backBtn.addEventListener('click', options.onBack);
        } else if (backBtn) {
            backBtn.style.display = 'none';
        }

        // Controls visibility
        function showControls() {
            controls.style.opacity = '1';
            controls.style.pointerEvents = 'auto';
            
            if (controlsTimeout) clearTimeout(controlsTimeout);
            
            if (!video.paused) {
                controlsTimeout = setTimeout(() => {
                    controls.style.opacity = '0';
                    controls.style.pointerEvents = 'none';
                }, settings.CONTROLS_TIMEOUT);
            }
        }

        wrapper.addEventListener('mousemove', showControls);
        wrapper.addEventListener('click', showControls);
        video.addEventListener('play', showControls);
        video.addEventListener('pause', showControls);

        // Keyboard shortcuts
        if (settings.KEYBOARD_SHORTCUTS) {
            document.addEventListener('keydown', (e) => {
                if (playerContainer !== document.activeElement && 
                    !playerContainer.contains(document.activeElement)) {
                    return;
                }

                switch(e.key.toLowerCase()) {
                    case ' ':
                    case 'k':
                        e.preventDefault();
                        togglePlay();
                        break;
                    case 'f':
                        e.preventDefault();
                        fullscreenBtn.click();
                        break;
                    case 'm':
                        e.preventDefault();
                        volumeBtn.click();
                        break;
                    case 'arrowleft':
                        e.preventDefault();
                        video.currentTime -= 5;
                        break;
                    case 'arrowright':
                        e.preventDefault();
                        video.currentTime += 5;
                        break;
                    case 'arrowup':
                        e.preventDefault();
                        video.volume = Math.min(1, video.volume + 0.1);
                        volumeSlider.value = video.volume;
                        updateVolumeUI();
                        break;
                    case 'arrowdown':
                        e.preventDefault();
                        video.volume = Math.max(0, video.volume - 0.1);
                        volumeSlider.value = video.volume;
                        updateVolumeUI();
                        break;
                }
            });
        }

        // Store instance
        playerInstance = {
            container: playerContainer,
            video: video,
            hls: hlsInstance,
            play: () => video.play(),
            pause: () => video.pause(),
            togglePlay: togglePlay,
            setVolume: (vol) => {
                video.volume = vol;
                volumeSlider.value = vol;
                updateVolumeUI();
            },
            seek: (time) => { video.currentTime = time; },
            destroy: () => destroyPlayer(playerContainer),
            loadSource: (url) => loadSource(url)
        };

        // Initial show
        showControls();

        return playerInstance;
    }

    /**
     * Destroy player instance
     */
    function destroyPlayer(playerContainer) {
        if (!playerContainer) return;
        
        const video = playerContainer.querySelector('.prehrajto-player-video');
        if (video) {
            video.pause();
            video.src = '';
        }
        
        if (hlsInstance) {
            hlsInstance.destroy();
            hlsInstance = null;
        }
        
        playerContainer.remove();
        playerInstance = null;
    }

    /**
     * Replace iframe or video elements with our player
     */
    function autoReplaceVideoElements(selector = 'iframe, video') {
        if (!CONFIG.ENABLE_PLAYER) return;
        
        const elements = document.querySelectorAll(selector);
        elements.forEach(el => {
            // Skip if already processed
            if (el.classList.contains('prehrajto-processed')) return;
            
            let sourceUrl = null;
            
            if (el.tagName === 'IFRAME') {
                sourceUrl = el.src || el.getAttribute('data-src');
                // Only process if it looks like a video source
                if (sourceUrl && (sourceUrl.includes('.m3u8') || sourceUrl.includes('.mp4'))) {
                    el.classList.add('prehrajto-processed');
                    initPlayer(el, sourceUrl);
                }
            } else if (el.tagName === 'VIDEO') {
                sourceUrl = el.src || el.querySelector('source')?.src;
                if (sourceUrl) {
                    el.classList.add('prehrajto-processed');
                    initPlayer(el, sourceUrl);
                }
            }
        });
    }

    // Expose to global scope
    window.PrehrajtoPlayer = {
        init: initPlayer,
        destroy: destroyPlayer,
        autoReplace: autoReplaceVideoElements,
        config: CONFIG,
        getInstance: () => playerInstance
    };

    // Auto-initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => autoReplaceVideoElements());
    } else {
        autoReplaceVideoElements();
    }

    // Watch for dynamically added content
    const observer = new MutationObserver(() => autoReplaceVideoElements());
    observer.observe(document.body, { childList: true, subtree: true });

})();
