
    if (!sessionStorage.getItem('cameFromSplash')) {
        window.location.href = "main.html";
    } else {
        sessionStorage.removeItem('cameFromSplash');
    }


// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', function() {
    
    // Register Service Worker
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', function () {
            navigator.serviceWorker.register('/myshop/sw.js')
                .then(function (registration) {
                    console.log('Service worker registered with scope:', registration.scope);
                })
                .catch(function (error) {
                    console.error('Service worker registration failed:', error);
                });
        });
    }
    
    // PWA Install Banner Logic
    let deferredInstallPrompt = null;
    const pwaInstallBanner = document.getElementById('pwaInstallBanner');
    const pwaInstallBtn = document.getElementById('pwaInstallBtn');
    const pwaInstallCloseBtn = document.getElementById('pwaInstallCloseBtn');
    
    // Check if already installed (PWA mode)
    const isPWAInstalled = window.matchMedia('(display-mode: standalone)').matches || 
                           window.navigator.standalone === true;
    
    // Check if user already dismissed the banner
    const hasDismissedBanner = localStorage.getItem('pwaBannerDismissed') === 'true';
    
    // Only show banner if NOT already installed and NOT dismissed
    if (!isPWAInstalled && !hasDismissedBanner) {
        window.addEventListener('beforeinstallprompt', function (event) {
            event.preventDefault();
            deferredInstallPrompt = event;
            if (pwaInstallBanner) {
                pwaInstallBanner.classList.add('show');
            }
        });
    }
    
    // Install button click
    pwaInstallBtn?.addEventListener('click', async function () {
        if (!deferredInstallPrompt) {
            // Fallback for browsers that don't support beforeinstallprompt
            alert('To install, open this site in Chrome and look for the install icon in the address bar.');
            return;
        }
        
        // Hide banner
        pwaInstallBanner?.classList.remove('show');
        
        // Show install prompt
        deferredInstallPrompt.prompt();
        const choiceResult = await deferredInstallPrompt.userChoice;
        deferredInstallPrompt = null;
        console.log('PWA install choice:', choiceResult.outcome);
        
        // If user declined, store that they saw the prompt
        if (choiceResult.outcome === 'dismissed') {
            localStorage.setItem('pwaBannerDismissed', 'true');
        }
    });
    
    // Close button click
    pwaInstallCloseBtn?.addEventListener('click', function () {
        if (pwaInstallBanner) {
            pwaInstallBanner.classList.remove('show');
            // Store that user dismissed the banner (won't show again for 30 days)
            localStorage.setItem('pwaBannerDismissed', 'true');
            localStorage.setItem('pwaBannerDismissedAt', Date.now());
        }
    });
    
    // App installed event
    window.addEventListener('appinstalled', function () {
        deferredInstallPrompt = null;
        if (pwaInstallBanner) {
            pwaInstallBanner.classList.remove('show');
        }
        console.log('PWA was installed successfully');
        
        // Optional: Show success message
        if (typeof showMessageModal === 'function') {
            showMessageModal('✅ StockApp* installed successfully! Check your home screen.', 3000);
        }
    });
    
    // Optional: Reset banner after 30 days
    const dismissedAt = localStorage.getItem('pwaBannerDismissedAt');
    if (dismissedAt && (Date.now() - dismissedAt) > 30 * 24 * 60 * 60 * 1000) {
        localStorage.removeItem('pwaBannerDismissed');
        localStorage.removeItem('pwaBannerDismissedAt');
    }
    
    // For iOS devices (which don't support beforeinstallprompt)
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    if (isIOS && !isPWAInstalled && !localStorage.getItem('pwaBannerDismissed')) {
        // Show custom iOS instruction banner
        setTimeout(() => {
            if (pwaInstallBanner && !pwaInstallBanner.classList.contains('show')) {
                pwaInstallBanner.classList.add('show');
                // Change text for iOS users
                const bannerText = pwaInstallBanner.querySelector('.pwa-install-text p');
                if (bannerText) {
                    bannerText.textContent = 'Tap Share → Add to Home Screen';
                }
                const installBtn = document.getElementById('pwaInstallBtn');
                if (installBtn) {
                    installBtn.textContent = 'How to Install';
                    installBtn.onclick = () => {
                        alert('To install: Tap the Share button (box with arrow) then select "Add to Home Screen"');
                        pwaInstallBanner.classList.remove('show');
                        localStorage.setItem('pwaBannerDismissed', 'true');
                    };
                }
            }
        }, 1000);
    }
});