
    if (!sessionStorage.getItem('cameFromSplash')) {
        window.location.href = "main.html";
    } else {
        sessionStorage.removeItem('cameFromSplash');
    }

    if ('serviceWorker' in navigator) {
        window.addEventListener('load', function () {
            navigator.serviceWorker.register('sw.js')
                .then(function (registration) {
                    console.log('Service worker registered with scope:', registration.scope);
                })
                .catch(function (error) {
                    console.error('Service worker registration failed:', error);
                });
        });
    }

    let deferredInstallPrompt = null;
    const pwaInstallBanner = document.getElementById('pwaInstallBanner');
    const pwaInstallBtn = document.getElementById('pwaInstallBtn');
    const pwaInstallCloseBtn = document.getElementById('pwaInstallCloseBtn');

    window.addEventListener('beforeinstallprompt', function (event) {
        event.preventDefault();
        deferredInstallPrompt = event;
        if (pwaInstallBanner) {
            pwaInstallBanner.classList.add('show');
        }
    });

    pwaInstallBtn?.addEventListener('click', async function () {
        if (!deferredInstallPrompt) return;
        pwaInstallBanner?.classList.remove('show');
        deferredInstallPrompt.prompt();
        const choiceResult = await deferredInstallPrompt.userChoice;
        deferredInstallPrompt = null;
        console.log('PWA install choice:', choiceResult.outcome);
    });

    pwaInstallCloseBtn?.addEventListener('click', function () {
        if (pwaInstallBanner) {
            pwaInstallBanner.classList.remove('show');
        }
    });

    window.addEventListener('appinstalled', function () {
        deferredInstallPrompt = null;
        if (pwaInstallBanner) {
            pwaInstallBanner.classList.remove('show');
        }
        console.log('PWA was installed');
    });
