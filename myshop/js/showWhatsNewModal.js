class WhatsNewModal {
    constructor(version, slides, storageKey = 'whatsnew_seen_versions') {
        this.version = version;
        this.slides = slides;   // slides contain translation keys for title/desc
        this.currentIndex = 0;
        this.modal = null;
        this.storageKey = storageKey;
        
        this.initStyles();
    }

    /**
     * Check if the current version has already been viewed
     */
    hasSeenVersion() {
        const seen = localStorage.getItem(this.storageKey);
        if (!seen) return false;
        const versions = JSON.parse(seen);
        return versions.includes(this.version);
    }

    /**
     * Mark the current version as seen
     */
    markVersionSeen() {
        const seen = localStorage.getItem(this.storageKey);
        let versions = seen ? JSON.parse(seen) : [];
        if (!versions.includes(this.version)) {
            versions.push(this.version);
            localStorage.setItem(this.storageKey, JSON.stringify(versions));
        }
    }

    /**
     * Helper to get translated string; falls back to key if translation missing
     */
    t(key) {
        if (typeof translate === 'function') {
            return translate(key);
        }
        return key;
    }

    /**
     * Extracts YouTube ID from various URL formats
     */
    getYouTubeId(url) {
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
        const match = url.match(regExp);
        return (match && match[2].length === 11) ? match[2] : null;
    }

    initStyles() {
        if (document.getElementById('whats-new-styles')) return;
        const style = document.createElement('style');
        style.id = 'whats-new-styles';
        style.textContent = `
            :root {
                --wn-bg: #0f172a;
                --wn-card: #1e293b;
                --wn-accent: #3b82f6;
                --wn-text: #f8fafc;
                --wn-text-muted: #94a3b8;
                --wn-border: #334155;
            }

                .wn-overlay.active {
                display: flex;
                justify-content: center;
                align-items: flex-start; /* Ensure modal starts at the top of the viewport */
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                 background: var(--wn-bg);
                overflow-y: auto; /* Enable scrolling for the whole overlay */
                padding: 40px 0; /* Add space at top and bottom for better look */
                z-index: 1000;
                }

                .wn-modal {
                width: 90%;
                max-width: 600px;
                    background: var(--wn-bg);
                height: auto; /* Allow height to grow based on content */
                max-height: none; /* Remove any height restrictions */
             
                border-radius: 8px;
                margin: 0 auto; /* Center horizontally */
                    transform: scale(0.8);

                }
            .wn-overlay.active { opacity: 1; }
            .wn-overlay.active .wn-modal { transform: scale(1); }

            .wn-header { padding: 24px; border-bottom: 1px solid var(--wn-border); display: flex; justify-content: space-between; align-items: center; }
            .wn-version { font-size: 12px; font-weight: 700; color: var(--wn-accent); text-transform: uppercase; letter-spacing: 1px; }
            
            .wn-media-container { width: 100%; aspect-ratio: 16/9; background: #000; overflow: hidden; position: relative; }
            .wn-media-content { width: 100%; height: 100%; object-fit: cover; transition: opacity 0.3s ease; }

            .wn-body { padding: 32px; text-align: center; }
            .wn-icon-box { 
                width: 56px; height: 56px; margin: -60px auto 16px; 
                background: var(--wn-card); border: 1px solid var(--wn-border);
                border-radius: 16px; display: flex; align-items: center; justify-content: center;
                font-size: 24px; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.3);
            }

            .wn-title { font-size: 24px; font-weight: 700; color: var(--wn-text); margin-bottom: 8px; }
            .wn-desc { font-size: 16px; color: var(--wn-text-muted); line-height: 1.6; }

            .wn-footer { padding: 0 32px 32px; display: flex; flex-direction: column; gap: 16px; }
            .wn-dots { display: flex; justify-content: center; gap: 8px; }
            .wn-dot { width: 8px; height: 8px; border-radius: 4px; background: var(--wn-border); transition: all 0.3s ease; border: none; padding: 0; cursor: pointer; }
            .wn-dot.active { width: 24px; background: var(--wn-accent); }

            .wn-btn-primary { 
                background: var(--wn-accent); color: white; border: none; 
                padding: 14px; border-radius: 12px; font-weight: 600; font-size: 16px;
                cursor: pointer; transition: transform 0.2s ease, filter 0.2s ease;
            }
            .wn-btn-primary:hover { filter: brightness(1.1); }
            .wn-btn-primary:active { transform: scale(0.98); }

            .wn-close { background: none; border: none; color: var(--wn-text-muted); cursor: pointer; padding: 8px; border-radius: 50%; transition: background 0.2s; }
            .wn-close:hover { background: var(--wn-border); color: white; }
        `;
        document.head.appendChild(style);
    }

    render() {
        this.modal = document.createElement('div');
        this.modal.className = 'wn-overlay';
        this.modal.role = 'dialog';
        this.modal.ariaModal = 'true';

        // Translate the header text
        const headerTitle = this.t('whats_new_title') || "What's New";
        const nextBtnText = this.t('whats_new_button_next') || "Next";
        const getStartedText = this.t('whats_new_button_get_started') || "Get Started";

        this.modal.innerHTML = `
            <div class="wn-modal">
                <div class="wn-header">
                    <div>
                        <span class="wn-version">Version ${this.version}</span>
                        <h2 style="margin:0; font-size: 18px; color: white;">${headerTitle}</h2>
                    </div>
                    <button class="wn-close" aria-label="${this.t('close')}">
                        <svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                    </button>
                </div>
                
                <div class="wn-media-container" id="wn-media-root"></div>

                <div class="wn-body">
                    <div class="wn-icon-box" id="wn-icon"></div>
                    <h3 class="wn-title" id="wn-title"></h3>
                    <p class="wn-desc" id="wn-desc"></p>
                </div>

                <div class="wn-footer">
                    <div class="wn-dots" id="wn-dots"></div>
                    <button class="wn-btn-primary" id="wn-main-btn">${nextBtnText}</button>
                </div>
            </div>
        `;

        document.body.appendChild(this.modal);
        
        // Store button texts for later use
        this.nextBtnText = nextBtnText;
        this.getStartedText = getStartedText;
        
        // Event Listeners
        this.modal.querySelector('.wn-close').onclick = () => this.destroy123();
        this.modal.querySelector('#wn-main-btn').onclick = () => this.handleNext();
        this.modal.onclick = (e) => { if (e.target === this.modal) this.destroy(); };
        
        // Show with animation
        requestAnimationFrame(() => this.modal.classList.add('active'));

        this.updateSlide();
    }

    updateSlide() {
        const slide = this.slides[this.currentIndex];
        const isLast = this.currentIndex === this.slides.length - 1;

        // Translate the title and description
        const title = this.t(slide.titleKey);
        const description = this.t(slide.descKey);
        const icon = slide.icon;  // icon is a static string (emoji), no translation needed

        // Update Text Content
        document.getElementById('wn-title').textContent = title;
        document.getElementById('wn-desc').textContent = description;
        document.getElementById('wn-icon').textContent = icon;
        
        // Update button text
        const mainBtn = document.getElementById('wn-main-btn');
        mainBtn.textContent = isLast ? this.getStartedText : this.nextBtnText;

        // Update Media
        const mediaRoot = document.getElementById('wn-media-root');

        if (slide.type === 'youtube') {
            const ytId = this.getYouTubeId(slide.media);
            mediaRoot.innerHTML = `
                <iframe class="wn-media-content" 
                        src="https://www.youtube.com/embed/${ytId}?autoplay=1&mute=1&rel=0&modestbranding=1" 
                        frameborder="0" 
                        allow="autoplay; encrypted-media" 
                        allowfullscreen>
                </iframe>`;
        } else if (slide.type === 'video') {
            mediaRoot.innerHTML = `
                <video class="wn-media-content" 
                    src="${slide.media}" 
                    autoplay 
                    muted 
                    loop 
                    playsinline
                    style="object-fit: cover;">
                </video>`;
        } else {
            mediaRoot.innerHTML = `<img src="${slide.media}" class="wn-media-content" alt="${title}">`;
        }

        // Update Dots
        const dotsRoot = document.getElementById('wn-dots');
        dotsRoot.innerHTML = this.slides.map((_, i) => `
            <button class="wn-dot ${i === this.currentIndex ? 'active' : ''}" data-index="${i}"></button>
        `).join('');
        
        // Attach click handlers for dots
        dotsRoot.querySelectorAll('.wn-dot').forEach(dot => {
            dot.onclick = () => this.goTo(parseInt(dot.dataset.index));
        });
    }

    handleNext() {
        if (this.currentIndex < this.slides.length - 1) {
            this.currentIndex++;
            this.updateSlide();
        } else {
            this.destroy();
        }
    }

    goTo(index) {
        this.currentIndex = index;
        this.updateSlide();
    }

    destroy() {
        // Mark version as seen only when the modal is fully closed
        this.markVersionSeen();
        this.modal.classList.remove('active');
        setTimeout(() => this.modal.remove(), 300);
    }
   destroy123() {
        // Mark version as seen only when the modal is fully closed
 
        this.modal.classList.remove('active');
        setTimeout(() => this.modal.remove(), 300);
    }

    /**
     * Show the modal if the user hasn't seen this version yet.
     * Returns the instance if shown, otherwise null.
     */
    showIfNew() {
        if (!this.hasSeenVersion()) {
            this.render();
            return this;
        }
        return null;
    }

    /**
     * Force show the modal regardless of version tracking.
     * Returns the instance.
     */
    forceShow() {
        this.render();
        return this;
    }
}

// --- Slide definitions with translation keys ---
const newFeatures = [
    {
        type: 'video',
        titleKey: 'whats_new_slide1_title',
        descKey: 'whats_new_slide1_desc',
        media: 'newfeture/001.mp4',
        icon: '🔔'
    },
    {
        type: 'video',
        titleKey: 'whats_new_slide2_title',
        descKey: 'whats_new_slide2_desc',
        media: 'newfeture/002.mp4',
        icon: '⚡'
    },
    {
        type: 'video',
        titleKey: 'whats_new_slide3_title',
        descKey: 'whats_new_slide3_desc',
        media: 'newfeture/003.mp4',
        icon: '🔒'
    },
    {
        type: 'video',
        titleKey: 'whats_new_slide4_title',
        descKey: 'whats_new_slide4_desc',
        media: 'newfeture/004.mp4',
        icon: '🛡️'
    },
    {
        type: 'video',
        titleKey: 'whats_new_slide5_title',
        descKey: 'whats_new_slide5_desc',
        media: 'newfeture/005.mp4',
        icon: '🛡️'
    },
    {
        type: 'photo',
        titleKey: 'whats_new_slide6_title',
        descKey: 'whats_new_slide6_desc',
        media: 'newfeture/image2.png',
        icon: '🙏 '
    },
    {
        type: 'video',
        titleKey: 'print_item_report_title',
        descKey: 'print_item_report_desc',
        media: 'newfeture/125.mp4',
        icon: '📊 '
    },
    {
        type: 'video',
        titleKey: 'dashboard_intro_title',
        descKey: 'dashboard_intro_desc',
        media: 'newfeture/006.mp4',
        icon: '🙏 '
    }
];

// Initialize and automatically show if new version

window._wnModal = new WhatsNewModal('5.2.1', newFeatures);


if (localStorage.getItem('tourCompleted') === 'true') {
    window._wnModal.showIfNew();
}

