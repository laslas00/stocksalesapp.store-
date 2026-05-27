const urlParams = new URLSearchParams(window.location.search);
const isFromSplash = urlParams.get('splash') === 'true';

if (!sessionStorage.getItem('cameFromSplash') && !isFromSplash) {
    // First time - set flag and redirect to splash
    sessionStorage.setItem('cameFromSplash', 'true');
    window.location.href = "main.html";
} else {
    // Already came from splash or was redirected
    sessionStorage.removeItem('cameFromSplash');
    
    // Remove splash param from URL if present
    if (isFromSplash) {
        const newUrl = window.location.pathname;
        window.history.replaceState({}, document.title, newUrl);
    }
}



document.addEventListener('DOMContentLoaded', function() {
    
    // Register Service Worker
    async function askNotificationPermission() {
        if (!('Notification' in window)) {
            console.log('Notifications are not supported by this browser.');
            return 'unsupported';
        }

        if (Notification.permission === 'granted') {
            return 'granted';
        }

        if (Notification.permission === 'denied') {
            console.log('Notification permission already denied.');
            return 'denied';
        }

        try {
            const permission = await Notification.requestPermission();
            console.log('Notification permission:', permission);
            return permission;
        } catch (error) {
            console.error('Notification permission request failed:', error);
            return 'default';
        }
    }

    async function sendLocalNotification(title, body, data = {}) {
        if (!('Notification' in window) || Notification.permission !== 'granted') {
            console.warn('Cannot send notification: permission not granted or unsupported.');
            return;
        }

        if ('serviceWorker' in navigator) {
            try {
                const registration = await navigator.serviceWorker.ready;
                await registration.showNotification(title, {
                    body,
                    icon: 'image/logo.jpg',
                    badge: 'image/logo.jpg',
                    data: { ...data, url: data.url || 'shop.html' },
                    vibrate: [100, 50, 100],
                    tag: data.tag || 'stockapp-notification'
                });
            } catch (error) {
                console.error('Service worker notification failed:', error);
            }
        } else {
            try {
                new Notification(title, {
                    body,
                    icon: 'image/logo.jpg',
                    data
                });
            } catch (error) {
                console.error('Notification creation failed:', error);
            }
        }
    }

    window.sendLocalNotification = sendLocalNotification;
    window.askNotificationPermission = askNotificationPermission;

    if ('serviceWorker' in navigator) {
        window.addEventListener('load', function () {
            navigator.serviceWorker.register('sw.js')
                .then(function (registration) {
                    console.log('Service worker registered with scope:', registration.scope);
                    askNotificationPermission();
                })
                .catch(function (error) {
                    console.error('Service worker registration failed:', error);
                });
        });
    }
    
    // ========================================
    // UNINSTALL DETECTION LOGIC
    // ========================================
    
    // Check if app is running in standalone mode (installed PWA)
    function isAppInstalled() {
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                             window.matchMedia('(display-mode: fullscreen)').matches ||
                             window.navigator.standalone === true;
        
        const isFromHomeScreen = window.navigator.standalone === true;
        const wasInstalledFlag = localStorage.getItem('pwaInstalled') === 'true';
        
        return isStandalone || isFromHomeScreen || wasInstalledFlag;
    }
    
    // Track installation status
    let wasPreviouslyInstalled = localStorage.getItem('pwaInstalled') === 'true';
    let isCurrentlyInstalled = isAppInstalled();
    
    // Detect uninstall
    const wasUninstalled = wasPreviouslyInstalled && !isCurrentlyInstalled;
    
    if (wasUninstalled) {
        console.log('🔴 App was uninstalled! Resetting banner state...');
        localStorage.removeItem('pwaInstalled');
        localStorage.removeItem('pwaBannerDismissed');
        localStorage.removeItem('pwaBannerDismissedAt');
        localStorage.removeItem('pwaInstallCompleted');
        sessionStorage.removeItem('pwaInstallShown');
        wasPreviouslyInstalled = false;
    }
    
    if (isCurrentlyInstalled && !wasPreviouslyInstalled) {
        console.log('✅ App is installed (display mode: standalone)');
        localStorage.setItem('pwaInstalled', 'true');
    }
    
    // ========================================
    // BANNER DISMISSAL WITH EXPIRY
    // ========================================
    
    const BANNER_DISMISSAL_DAYS = 7;
    const BANNER_DISMISSAL_KEY = 'pwaBannerDismissed';
    const BANNER_DISMISSAL_TIME_KEY = 'pwaBannerDismissedAt';
    
    function isBannerDismissedValid() {
        const dismissedAt = localStorage.getItem(BANNER_DISMISSAL_TIME_KEY);
        if (!dismissedAt) return false;
        const daysSinceDismissal = (Date.now() - parseInt(dismissedAt)) / (1000 * 60 * 60 * 24);
        return daysSinceDismissal < BANNER_DISMISSAL_DAYS;
    }
    
    function shouldShowBanner() {
        if (isAppInstalled()) return false;
        const isDismissed = localStorage.getItem(BANNER_DISMISSAL_KEY) === 'true';
        const isDismissalValid = isBannerDismissedValid();
        if (isDismissed && isDismissalValid) return false;
        if (isDismissed && !isDismissalValid) {
            localStorage.removeItem(BANNER_DISMISSAL_KEY);
            localStorage.removeItem(BANNER_DISMISSAL_TIME_KEY);
        }
        return true;
    }
    
    // ========================================
    // SERVICE WORKER COMMUNICATION
    // ========================================
    
    if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({ type: 'CHECK_INSTALL_STATUS' });
    }
    
    navigator.serviceWorker.addEventListener('message', function(event) {
        if (event.data && event.data.type === 'INSTALL_STATUS') {
            if (!event.data.installed && localStorage.getItem('pwaInstalled') === 'true') {
                localStorage.removeItem('pwaInstalled');
                console.log('🔄 Sync: Uninstall detected via service worker');
                localStorage.removeItem('pwaBannerDismissed');
                localStorage.removeItem('pwaBannerDismissedAt');
                if (deferredInstallPrompt && shouldShowBanner()) {
                    pwaInstallBanner?.classList.add('show');
                }
            }
        }
    });
    
    // ========================================
    // PERIODIC INSTALL STATUS CHECK
    // ========================================
    
    document.addEventListener('visibilitychange', function() {
        if (!document.hidden) {
            setTimeout(() => {
                const currentlyInstalled = isAppInstalled();
                const storedInstalled = localStorage.getItem('pwaInstalled') === 'true';
                
                if (storedInstalled && !currentlyInstalled) {
                    console.log('🔴 Uninstall detected on visibility change');
                    localStorage.removeItem('pwaInstalled');
                    localStorage.removeItem('pwaBannerDismissed');
                    localStorage.removeItem('pwaBannerDismissedAt');
                    if (deferredInstallPrompt && shouldShowBanner()) {
                        pwaInstallBanner?.classList.add('show');
                    }
                } else if (currentlyInstalled && !storedInstalled) {
                    console.log('✅ Install detected on visibility change');
                    localStorage.setItem('pwaInstalled', 'true');
                    pwaInstallBanner?.classList.remove('show');
                }
            }, 500);
        }
    });
    
    window.addEventListener('focus', function() {
        setTimeout(() => {
            const currentlyInstalled = isAppInstalled();
            const storedInstalled = localStorage.getItem('pwaInstalled') === 'true';
            
            if (storedInstalled && !currentlyInstalled) {
                console.log('🔴 Uninstall detected on window focus');
                localStorage.removeItem('pwaInstalled');
                localStorage.removeItem('pwaBannerDismissed');
                localStorage.removeItem('pwaBannerDismissedAt');
                if (deferredInstallPrompt && shouldShowBanner()) {
                    pwaInstallBanner?.classList.add('show');
                }
            }
        }, 300);
    });
    
    // ========================================
    // PWA INSTALL BANNER LOGIC
    // ========================================
    
    let deferredInstallPrompt = null;
    const pwaInstallBanner = document.getElementById('pwaInstallBanner');
    const pwaInstallBtn = document.getElementById('pwaInstallBtn');
    const pwaInstallCloseBtn = document.getElementById('pwaInstallCloseBtn');
    
    if (shouldShowBanner()) {
        window.addEventListener('beforeinstallprompt', function (event) {
            event.preventDefault();
            deferredInstallPrompt = event;
            if (shouldShowBanner() && !isAppInstalled()) {
                pwaInstallBanner?.classList.add('show');
                console.log('📱 Showing install banner');
            }
        });
    }
    
    pwaInstallBtn?.addEventListener('click', async function () {
        if (!deferredInstallPrompt) {
            if (isIOS()) {
                alert('To install: Tap the Share button (box with arrow) then select "Add to Home Screen"');
            } else {
                alert('To install, open this site in Chrome/Firefox and look for the install icon in the address bar.');
            }
            return;
        }
        
        pwaInstallBanner?.classList.remove('show');
        deferredInstallPrompt.prompt();
        const choiceResult = await deferredInstallPrompt.userChoice;
        deferredInstallPrompt = null;
        
        if (choiceResult.outcome === 'accepted') {
            console.log('✅ User accepted installation');
        } else {
            console.log('❌ User dismissed installation');
            localStorage.setItem(BANNER_DISMISSAL_KEY, 'true');
            localStorage.setItem(BANNER_DISMISSAL_TIME_KEY, Date.now().toString());
        }
    });
    
    pwaInstallCloseBtn?.addEventListener('click', function () {
        pwaInstallBanner?.classList.remove('show');
        localStorage.setItem(BANNER_DISMISSAL_KEY, 'true');
        localStorage.setItem(BANNER_DISMISSAL_TIME_KEY, Date.now().toString());
        console.log('📱 User dismissed banner for', BANNER_DISMISSAL_DAYS, 'days');
    });
    
    window.addEventListener('appinstalled', function () {
        deferredInstallPrompt = null;
        pwaInstallBanner?.classList.remove('show');
        localStorage.setItem('pwaInstalled', 'true');
        localStorage.removeItem(BANNER_DISMISSAL_KEY);
        localStorage.removeItem(BANNER_DISMISSAL_TIME_KEY);
        console.log('🎉 PWA was installed successfully!');
        
        if (typeof showMessageModal === 'function') {
            showMessageModal('✅ StockApp* installed! Check your home screen.', 3000);
        }
    });
    
    function isIOS() {
        return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    }
    
    if (isIOS() && !isAppInstalled() && shouldShowBanner()) {
        setTimeout(() => {
            if (pwaInstallBanner && !pwaInstallBanner.classList.contains('show')) {
                pwaInstallBanner.classList.add('show');
                const bannerText = pwaInstallBanner.querySelector('.pwa-install-text p');
                if (bannerText) {
                    bannerText.textContent = 'Tap Share → Add to Home Screen';
                }
                const installBtn = document.getElementById('pwaInstallBtn');
                if (installBtn) {
                    installBtn.textContent = 'How to Install';
                }
            }
        }, 1000);
    }
    
    console.log('🚀 PWA System Ready - Uninstall detection active');
    
    // ========================================
    // FORCE SERVICE WORKER UPDATE CHECKER
    // ========================================
    
    function forceServiceWorkerUpdate() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.ready.then(registration => {
                // Check for updates every minute
                setInterval(() => {
                    registration.update();
                    console.log('🔄 Checking for Service Worker updates...');
                }, 60000);
            });
            
            // Listen for new service worker
            navigator.serviceWorker.addEventListener('controllerchange', () => {
                console.log('🔄 New Service Worker activated! Reloading...');
                window.location.reload();
            });
        }
    }
    
    // Call the force update checker
    forceServiceWorkerUpdate();
    
}); // ← This closes the DOMContentLoaded event listener