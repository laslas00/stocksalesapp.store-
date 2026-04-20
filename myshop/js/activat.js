const API_BASE = (() => {
    if (window.location.protocol === 'file:') {
        return 'https://localhost:54221';
    }
    if (window.location.port === '9999') {
        return window.location.origin;
    }
    return `${window.location.protocol}//${window.location.hostname}:54221`;
})();

console.log("📡 App connecting to API via:", API_BASE);
const TRIAL_DAYS = 30;
let isVerifying = false;
let isRestrictedMode = false;
let isDarkMode = localStorage.getItem('darkMode') === 'true';

// SAFE GUARD: Only runs in browsers, does nothing in Electron
if (typeof window.electronAPI === 'undefined') {
    window.electronAPI = {
        freeModeCheck: async () => ({ active: false, limitReached: false, timeUsed: 0, dailyLimit: 10800000 }),
        freeModeActivate: async () => ({ success: false }),
        freeModeClear: async () => ({ success: true }),
        ensureLanguageFile: async () => { console.log("Browser mode: Language file check skipped"); },
        getMachineId: async () => 'BROWSER_USER'
    };
}

async function showConfirm(title, message, confirmCallback, type = 'warning') {
    const modal = document.getElementById('messageModal');
    const icon = document.getElementById('messageIcon');
    const titleEl = document.getElementById('messageTitle');
    const textEl = document.getElementById('messageText');
    const primaryBtn = document.getElementById('messagePrimaryBtn');
    const secondaryBtn = document.getElementById('messageSecondaryBtn');
    
    // Set content - TRANSLATE THESE
    titleEl.textContent = title;
    textEl.textContent = message;
    
    // Set icon
icon.className = 'message-icon ' + type;
if (type === 'warning') {
    icon.innerHTML = `
        <svg class="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
            <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
        </svg>`;
} else {
    icon.innerHTML = `
        <svg class="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
            <path d="M11 18h2v-2h-2v2zm1-16C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm0-14c-2.21 0-4 1.79-4 4h2c0-1.1.9-2 2-2s2 .9 2 2c0 2-3 1.75-3 5h2c0-2.25 3-2.5 3-5 0-2.21-1.79-4-4-4z"/>
        </svg>`;
}
    
    // Set up buttons - TRANSLATE THESE
    primaryBtn.textContent = translate('messages.yesContinue');
    primaryBtn.onclick = () => {
        closeMessage();
        if (confirmCallback) confirmCallback();
    };
    
    secondaryBtn.textContent = translate('messages.cancel');
    secondaryBtn.onclick = closeMessage;
    secondaryBtn.classList.remove('hidden');
    
    // Hide contact section
    document.getElementById('contactSupportSection').classList.add('hidden');
    
    // Show modal
    modal.style.display = 'flex';
    console.log(`Showing confirmation: ${title}`, 'info');
}

async function closeMessage() {
    document.getElementById('messageModal').style.display = 'none';
}

// Close message modal on ESC or clicking outside
document.addEventListener('keydown', async function(event) {
    if (event.key === 'Escape') {
        closeMessage();
    }
});

document.getElementById('messageModal').addEventListener('click', async function(e) {
    if (e.target === this) {
        closeMessage();
    }
});

// Toggle dark mode
async function toggleDarkMode() {
    isDarkMode = !isDarkMode;
    document.body.classList.toggle('dark-mode', isDarkMode);
    
    const themeToggle = document.getElementById('theme-toggle');
    if (isDarkMode) {
        themeToggle.innerHTML = `
            <svg class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zM2 13h2c.55 0 1-.45 1-1s-.45-1-1-1H2c-.55 0-1 .45-1 1s.45 1 1 1zm18 0h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1zM11 2v2c0 .55.45 1 1 1s1-.45 1-1V2c0-.55-.45-1-1-1s-1 .45-1 1zm0 18v2c0 .55.45 1 1 1s1-.45 1-1v-2c0-.55-.45-1-1-1s-1 .45-1 1zM5.99 4.58c-.39-.39-1.03-.39-1.41 0-.39.39-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0s.39-1.03 0-1.41L5.99 4.58zm12.37 12.37c-.39-.39-1.03-.39-1.41 0-.39.39-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0 .39-.39.39-1.03 0-1.41l-1.06-1.06zm1.06-10.96c.39-.39.39-1.03 0-1.41-.39-.39-1.03-.39-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06zM7.05 18.36c.39-.39.39-1.03 0-1.41-.39-.39-1.03-.39-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06z"/>
            </svg>`;
    } else {
        themeToggle.innerHTML = `
            <svg class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M9.37 5.51A7.35 7.35 0 0 0 9.1 7.5c0 4.08 3.32 7.4 7.4 7.4.68 0 1.35-.09 1.99-.27A7.014 7.014 0 0 1 12 19c-3.86 0-7-3.14-7-7 0-2.93 1.81-5.45 4.37-6.49z"/>
                <path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9c0-.46-.04-.92-.1-1.36a5.389 5.389 0 0 1-4.4 2.26 5.403 5.403 0 0 1-3.14-9.8c-.44-.06-.9-.1-1.36-.1z"/>
            </svg>`;
    }
    
    localStorage.setItem('darkMode', isDarkMode);
    console.log(`Dark mode ${isDarkMode ? 'enabled' : 'disabled'}`, 'info');
}

// Initialize theme
if (isDarkMode) {
    document.body.classList.add('dark-mode');
    document.getElementById('theme-toggle').innerHTML = `
        <svg class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zM2 13h2c.55 0 1-.45 1-1s-.45-1-1-1H2c-.55 0-1 .45-1 1s.45 1 1 1zm18 0h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1zM11 2v2c0 .55.45 1 1 1s1-.45 1-1V2c0-.55-.45-1-1-1s-1 .45-1 1zm0 18v2c0 .55.45 1 1 1s1-.45 1-1v-2c0-.55-.45-1-1-1s-1 .45-1 1zM5.99 4.58c-.39-.39-1.03-.39-1.41 0-.39.39-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0s.39-1.03 0-1.41L5.99 4.58zm12.37 12.37c-.39-.39-1.03-.39-1.41 0-.39.39-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0 .39-.39.39-1.03 0-1.41l-1.06-1.06zm1.06-10.96c.39-.39.39-1.03 0-1.41-.39-.39-1.03-.39-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06zM7.05 18.36c.39-.39.39-1.03 0-1.41-.39-.39-1.03-.39-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06z"/>
        </svg>`;
}

// Helper async function to check if license is expired - DO NOT TRANSLATE
async function isLicenseExpired(activationData) {
    console.log('Checking expiration:', activationData);

    if (!activationData || !activationData.nextToactvate) return true;

    const today = new Date();
    const nextDate = new Date(activationData.nextToactvate);

    console.log('Today:', today);
    console.log('Next Date:', nextDate);

    today.setHours(0,0,0,0);
    nextDate.setHours(0,0,0,0);

    return today >= nextDate;
}
// Check if user has ever activated a license (even if expired) - DO NOT TRANSLATE
function hasLicenseActivation(data) {
    // If data is an array, check if any item is a license
    if (Array.isArray(data)) {
        return data.some(item => item.type === 'Monthly' || item.type === 'Yearly');
    }
    // Fallback if data is a single object
    if (data.currentActivation) return true;
    if (data.type && (data.type === 'Monthly' || data.type === 'Yearly')) return true;
    if (data.history && Array.isArray(data.history)) {
        return data.history.some(item => item.type === 'Monthly' || item.type === 'Yearly');
    }
    return false;
}

async function checkLicenseStatus() {
    console.log(`API_BASE is: "${API_BASE}"`, 'server');
    const testUrl = `${API_BASE}/api/license-check`;
    console.log(`Calling: ${testUrl}`, 'server');
    if (isVerifying) return;
    isVerifying = true;
    
    console.log('Starting license verification...', 'info');
    
    try {
        // Update status badge to show verifying
        const badge = document.getElementById('status-badge');
        badge.className = "status-badge verifying";
        badge.innerHTML = translate('verifying') + '<span class="loading-dots"></span>';
        
        // Set timeout for slow server response
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error(translate('errors.serverTimeout'))), 10000)
        );
        
        // Test server connection first
        console.log('Testing server connection...', 'server');
        const testResponse = await fetch(`${API_BASE}/api/ping`);
        if (testResponse.ok) {
            console.log('✓ Server connection established', 'success');
        } else {
            console.log('⚠ Server responded with non-OK status', 'warning');
        }
        
        // 1. Fetch license data from server
        console.log('Fetching license data from server...', 'server');
        const fetchPromise = fetch(`${API_BASE}/api/license-check`);
        const response = await Promise.race([fetchPromise, timeoutPromise]);
        
        if (!response.ok) {
            throw new Error(translate('errors.serverError').replace('${status}', response.status));
        }
        
        const data = await response.json();
        console.log(`Server response received: ${JSON.stringify(data).substring(0, 100)}...`, 'server');
        
        // ✅ NEW: Trust the server's 'active' and 'isExpired' flags
        if (data.active === true && data.isExpired === false) {
            console.log('✓ Valid active license found (server confirmed)', 'success');
            // Save creation date from server if available
            if (data.createdTimestamp || data.createdDate) {
                localStorage.setItem('install_date', data.createdTimestamp || data.createdDate);
                localStorage.setItem('file_created_date', data.createdDate || new Date().toISOString());
                console.log('Saved license creation date', 'info');
            }
            showActiveState(data.type, data.link, false);
            return;
        }
        
        // Check if user has EVER had a license activation (even if expired)
        if (hasLicenseActivation(data)) {
            console.log('User has license activation record, but license is not active or expired', 'info');
            
            // License exists but is expired (or server says it's expired)
            if (data.isExpired === true || (data.currentActivation && isLicenseExpired(data.currentActivation))) {
                console.log('⚠️ License has expired', 'warning');
                // Use the activation object that contains type and nextToactvate
                const expiredActivation = data.currentActivation || data;
                showLicenseExpiredState(expiredActivation);
                return;
            }
        }
        
        // 2. If no license or license not active, check Trial Status
        console.log('No valid license found, checking trial status...', 'info');
        await handleTrialLogic();

    } catch (err) {
        console.log(`Verification error: ${err.message}`, 'error');
        
        // Show offline mode message
        showMessage(
            translate('messages.offlineMode'),
            translate('messages.cannotConnectServer'),
            'warning',
            false
        );
        
        document.getElementById('status-badge').className = "px-3 py-1 rounded-full text-xs font-bold bg-yellow-100 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400 uppercase tracking-wider";
        document.getElementById('status-badge').innerText = translate('status.offline');
        console.log('Switching to offline mode', 'warning');
        
        // Fallback for demo/offline
        fallbackToLocalStorage();
            
    } finally {
        isVerifying = false;
        // Hide loading screen with fade out
        const loadingScreen = document.getElementById('loading-screen');
        loadingScreen.style.opacity = '0';
        setTimeout(() => {
            loadingScreen.classList.add('hidden');
        }, 300);
        console.log('Verification process completed', 'info');
    }
}

async function handleTrialLogic() {
    try {
        console.log('Checking trial status...', 'info');
        
        // Set timeout for trial check
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error(translate('errors.trialCheckTimeout'))), 5000)
        );
        
        // Get installation date from server
        const fetchPromise = fetch(`${API_BASE}/api/install-date`);
        const response = await Promise.race([fetchPromise, timeoutPromise]);
        
        if (!response.ok) throw new Error(translate('errors.serverError').replace('${status}', response.status));
        
        const data = await response.json();
        console.log(`Trial data received from server`, 'server');
        
        if (data.installDate) {
            // Store both in local storage
            localStorage.setItem('install_date', data.installDate);
            localStorage.setItem('file_created_date', data.createdDate || new Date().toISOString());
            console.log(`Installation date set: ${new Date(parseInt(data.installDate)).toLocaleDateString()}`, 'info');
            
            const daysSinceInstall = Math.floor((Date.now() - parseInt(data.installDate)) / (1000 * 60 * 60 * 24));
            const daysRemaining = TRIAL_DAYS - daysSinceInstall;
            console.log(`Days since install: ${daysSinceInstall}, Days remaining: ${daysRemaining}`, 'info');

            if (daysRemaining > 0) {
                console.log(`✓ Trial active: ${daysRemaining} days remaining`, 'success');
                // Show "Free Mode" Dashboard
                showActiveState("Free Trial", "", true, daysRemaining);
            } else {
                console.log('✗ Trial period has expired', 'warning');
                
                // Double-check if user has license activation before showing trial expired
                try {
                    const licenseCheck = await fetch(`${API_BASE}/api/license-check`);
                    if (licenseCheck.ok) {
                        const licenseData = await licenseCheck.json();
                        if (hasLicenseActivation(licenseData)) {
                            if (licenseData.currentActivation && isLicenseExpired(licenseData.currentActivation)) {
                                console.log('User has expired license, showing license expired state', 'info');
                                showLicenseExpiredState(licenseData.currentActivation);
                                return;
                            }
                        }
                    }
                } catch (licenseErr) {
                    console.log('Could not verify license status, showing trial expired', 'warning');
                }
                
                // Only show trial expired if truly never had a license
                showTrialExpiredState();
                document.getElementById('activation-view').classList.remove('hidden');
                document.getElementById('trial-expired-msg').classList.remove('hidden');
                document.getElementById('trial-expired-msg').textContent = translate('activation.trialExpired');
            }
        } else {
            console.log('No installation date from server, using fallback', 'warning');
            // Fallback
            fallbackToLocalStorage();
        }
    } catch (err) {
        console.log(`Trial check failed: ${err.message}`, 'error');
        showMessage(
            translate('messages.trialCheckFailed'),
            translate('messages.usingLocalStorage'),
            'warning',
            false
        );
        fallbackToLocalStorage();
    }
}

async function showTrialExpiredState() {
    isRestrictedMode = true;
    console.log('✗ Trial period has expired', 'error');
    
    // Hide dashboard, show activation
    document.getElementById('active-dashboard').classList.add('hidden');
    document.getElementById('activation-view').classList.remove('hidden');
    
    // Update the Badge
    const badge = document.getElementById('status-badge');
    badge.innerText = translate('status.trialExpired');
    badge.className = "status-badge error";
    
    // Show a one-time message to the user - TRANSLATE THESE
    showMessage(
        translate('messages.trialExpired'),
        translate('messages.activateLicenseToContinue'),
        'warning',
        true
    );
    
    // Show the urgent CTA bar at the bottom
    document.getElementById('urgent-cta').classList.remove('hidden');
}

async function showLicenseExpiredState(activationData) {
    console.log('⏰ License expired - next activation date passed', 'error');
    
    const badge = document.getElementById('status-badge');
    badge.innerText = translate('licenseExpired');
    badge.className = "status-badge error";
    
    document.getElementById('active-dashboard').classList.add('hidden');
    document.getElementById('activation-view').classList.remove('hidden');
    
    // Show the urgent CTA bar at the bottom
    document.getElementById('urgent-cta').classList.remove('hidden');
    
    // Show specific message for expired license - TRANSLATE THIS
    const expiredMsg = document.getElementById('trial-expired-msg');
    if (expiredMsg) {
        expiredMsg.classList.remove('hidden');
        expiredMsg.textContent = translate('messages.licenseExpiredMessage')
            .replace('${type}', activationData.type)
            .replace('${date}', activationData.nextToactvate);
    }
    
    // Show a modal with renewal options - TRANSLATE THESE
    showMessage(
        translate('messages.licenseRenewalRequired'),
        translate('messages.licensePeriodEnded')
            .replace('${type}', activationData.type)
            .replace('${date}', activationData.nextToactvate),
        'warning',
        true
    );
}

async function fallbackToLocalStorage() {
    console.log('Using local storage fallback...', 'warning');
    let installDate = localStorage.getItem('install_date');
    
    // If first time opening, set the install date
    if (!installDate) {
        installDate = Date.now().toString();
        localStorage.setItem('install_date', installDate);
        console.log('First time installation, setting new date', 'info');
    } else {
        console.log(`Found existing installation date in local storage`, 'info');
    }

    const daysSinceInstall = Math.floor((Date.now() - parseInt(installDate)) / (1000 * 60 * 60 * 24));
    const daysRemaining = TRIAL_DAYS - daysSinceInstall;
    console.log(`Local storage - Days since install: ${daysSinceInstall}, Days remaining: ${daysRemaining}`, 'info');

    // Try to check server for license data even in fallback
    fetch(`${API_BASE}/api/license-check`)
        .then(response => response.ok ? response.json() : null)
        .then(licenseData => {
            if (licenseData && hasLicenseActivation(licenseData)) {
                if (licenseData.currentActivation && isLicenseExpired(licenseData.currentActivation)) {
                    console.log('License expired in fallback mode', 'warning');
                    showLicenseExpiredState(licenseData.currentActivation);
                    return;
                }
            }
            
            // Only proceed with trial check if no license found
            if (daysRemaining > 0) {
                console.log(`✓ Trial active via local storage: ${daysRemaining} days remaining`, 'success');
                // Show "Free Mode" Dashboard
                showActiveState("Free Trial", "", true, daysRemaining);
            } else {
                console.log('✗ Trial expired via local storage', 'warning');
                showTrialExpiredState();
                document.getElementById('activation-view').classList.remove('hidden');
                const expiredMsg = document.getElementById('trial-expired-msg');
                if (expiredMsg) {
                    expiredMsg.classList.remove('hidden');
                    expiredMsg.textContent = translate('activation.trialExpired');
                }
            }
        })
        .catch(() => {
            // If can't check license, fall back to trial logic
            if (daysRemaining > 0) {
                console.log(`✓ Trial active via local storage: ${daysRemaining} days remaining`, 'success');
                showActiveState("Free Trial", "", true, daysRemaining);
            } else {
                console.log('✗ Trial expired via local storage', 'warning');
                showTrialExpiredState();
                document.getElementById('activation-view').classList.remove('hidden');
                const expiredMsg = document.getElementById('trial-expired-msg');
                if (expiredMsg) {
                    expiredMsg.classList.remove('hidden');
                    expiredMsg.textContent = translate('activation.trialExpired');
                }
            }
        });
}

// Helper to create Font Awesome icons
function createIcon(iconName, className = '') {
    const i = document.createElement('i');
    i.className = `fas fa-${iconName} ${className}`.trim();
    return i;
}

async function showActiveState(type, link, isTrial = false, daysLeft = 0) {
    isRestrictedMode = isTrial;
    console.log(`Showing active state: ${type}, Trial: ${isTrial}, Days left: ${daysLeft}`, 'info');

    // Toggle main views
    document.getElementById('activation-view').classList.add('hidden');
    document.getElementById('active-dashboard').classList.remove('hidden');

    // Update common elements
    const typeLabel = document.getElementById('active-type-label');
    if (typeLabel) typeLabel.innerText = type;

    const badge = document.getElementById('status-badge');
    const icon = document.getElementById('success-icon');
    const trialInfo = document.getElementById('trial-info');
    const title = document.getElementById('dashboard-title');
    const dashboardActions = document.getElementById('dashboard-actions');

    // Clear actions panel (will be rebuilt for paid users)
    dashboardActions.innerHTML = '';

    if (isTrial) {
        // ---------- Trial / Free mode ----------
        if (badge) {
            badge.innerText = translate('status.trialMode');
            badge.className = "status-badge trial";
        }
        if (icon) icon.className = "success-icon trial";
        if (title) title.innerText = translate('trialTitle');

        // --- UPDATED HIDE LOGIC ---
        const freeState = await window.electronAPI.freeModeCheck();
        let timeRemaining = 0;
        if (freeState.active && !freeState.limitReached) {
            timeRemaining = freeState.dailyLimit - freeState.timeUsed;
        }
        const hoursRemaining = Math.floor(timeRemaining / (60 * 60 * 1000));
        const minutesRemaining = Math.floor((timeRemaining % (60 * 60 * 1000)) / (60 * 1000));
        
        // Update trial info display
        const trialInfo = document.getElementById('trial-info');
        if (trialInfo) {
            if (timeRemaining <= 0) {
                trialInfo.classList.add('hidden');
            } else {
                trialInfo.classList.remove('hidden');
                const daysElem = document.getElementById('days-left');
                if (daysElem) daysElem.innerText = `${hoursRemaining}h ${minutesRemaining}m`;
            }
        }

        const homeBtn = document.createElement('button');
        homeBtn.className = 'btn btn-secondary';
        homeBtn.appendChild(createIcon('home', 'mr-2'));
        homeBtn.appendChild(document.createTextNode(translate('goToHome')));
        homeBtn.onclick = () => {
            console.log('Redirecting to home...', 'info');
            sessionStorage.setItem('cameFromSplash', '1');
            window.location.href = "shop.html";
        };
        dashboardActions.appendChild(homeBtn);

        const dashboardButton = document.getElementById('dashboardLink');
        if (dashboardButton) {
            dashboardButton.onclick = () => {
                console.log('Redirecting to home...', 'info');
                sessionStorage.setItem('cameFromSplash', '1');
                window.location.href = "shop.html";
            };
        }
    } else {
        // ---------- Paid user (Monthly or Yearly) ----------
        if (badge) {
            badge.innerText = translate('status.verified');
            badge.className = "status-badge active";
        }
        if (icon) icon.className = "success-icon active";
        if (title) title.innerText = translate('activeTitle');
        if (trialInfo) trialInfo.classList.add('hidden');

        // 1. Home button
        const homeBtn = document.createElement('button');
        homeBtn.className = 'btn btn-secondary';
        homeBtn.appendChild(createIcon('home', 'mr-2'));
        homeBtn.appendChild(document.createTextNode(translate('goToHome')));
        homeBtn.onclick = () => {
            console.log('Redirecting to home...', 'info');
            sessionStorage.setItem('cameFromSplash', '1');
            window.location.href = "shop.html";
        };
        dashboardActions.appendChild(homeBtn);

        if (type === 'Monthly') {
            const upsellText = document.createElement('div');
            upsellText.className = 'text-sm text-center my-4';
            upsellText.textContent = translate('wantMoreValue');
            dashboardActions.appendChild(upsellText);
            
            // Clean up trial flags for paid users
            localStorage.removeItem('freeModeActive');
            localStorage.removeItem('usage_stats');
            localStorage.removeItem('obkyetk');

            const yearlyBtn = document.createElement('button');
            yearlyBtn.className = 'btn btn-indigo';
            yearlyBtn.appendChild(createIcon('star', 'mr-2'));
            yearlyBtn.appendChild(document.createTextNode(translate('upgradeToYearly')));
            yearlyBtn.onclick = () => {
                document.getElementById('active-dashboard').classList.add('hidden');
                document.getElementById('activation-view').classList.remove('hidden');
                setTimeout(() => openActivation('Yearly'), 300);
            };
            dashboardActions.appendChild(yearlyBtn);

            const benefitsDiv = document.createElement('div');
            benefitsDiv.className = 'benefits-box';
            benefitsDiv.innerHTML = `
                <div class="benefits-title">${translate('yearlyBenefits')}</div>
                <div class="benefit-item"><i class="fas fa-check-circle benefit-check"></i>${translate('save20Percent')}</div>
                <div class="benefit-item"><i class="fas fa-check-circle benefit-check"></i>${translate('noMonthlyRenewals')}</div>
                <div class="benefit-item"><i class="fas fa-check-circle benefit-check"></i>${translate('prioritySupport')}</div>
            `;
            dashboardActions.appendChild(benefitsDiv);

        } else if (type === 'Yearly') {
            localStorage.removeItem('freeModeActive');
            localStorage.removeItem('usage_stats');
            localStorage.removeItem('obkyetk');
            const thankYouDiv = document.createElement('div');
            thankYouDiv.className = 'thank-you';
            thankYouDiv.appendChild(createIcon('heart', 'mr-2 text-red-500'));
            thankYouDiv.appendChild(document.createTextNode(translate('thankYouYearly')));
            dashboardActions.appendChild(thankYouDiv);
        }
    }
}


let activeTarget = null;
let activeType = '';
let isProcessing = false;

async function openActivation(type) {
    if (isProcessing) return;
    console.log(`Opening activation modal for: ${type}`, 'info');
    activeType = type;
    activeTarget = type === 'Monthly' ? monthDetails[currentMonthIndex] : yearlyData;
    
    // Update modal title with current month for Monthly activation
    if (type === 'Monthly') {
        const currentMonthName = monthDetails[currentMonthIndex].name;
        document.getElementById('modalTitle').innerText = translate('activate').replace('${month}', currentMonthName);
    } else {
        document.getElementById('modalTitle').innerText = translate('activate').replace('${month}', activeTarget.name);
    }
    
    document.getElementById('step-get-code').classList.remove('hidden');
    document.getElementById('step-enter-code').classList.add('hidden');
    document.getElementById('activationModal').style.display = 'flex';
}

// Add this to update the button text with current month on page load
document.addEventListener('DOMContentLoaded', async function() {
    const currentMonthName = monthDetails[currentMonthIndex].name;
    const monthlyButton = document.querySelector('.business-card:first-child .btn-text');
    if (monthlyButton) {
        // Don't translate month names
        monthlyButton.innerHTML = translate('activateMonthly').replace('${month}', currentMonthName);
    }
});

async function fetchCode() {
    console.log(`Opening external link: ${activeTarget.link}`, 'info');
    window.open(activeTarget.link, '_blank');
    document.getElementById('step-get-code').classList.add('hidden');
    document.getElementById('step-enter-code').classList.remove('hidden');
}

async function validateCode() {
    if (isProcessing) return;
    
    const input = document.getElementById('userInputCode').value.trim().toUpperCase();
    if (!input) {
        showMessage(translate('messages.missingCode'), translate('messages.enterActivationCode'), 'error', false);
        return;
    }
    
    console.log(`Validating activation code: ${input}`, 'info');
    
    // 1. Check if code matches the expected format
    if (!activeTarget.codes.includes(input)) {
        showMessage(
            translate('messages.invalidCode'), 
            translate('messages.codeNotValid').replace('${code}', input).replace('${name}', activeTarget.name), 
            'error', 
            true
        );
        return;
    }
    
    // 2. Check if code is available for use (3-year cooldown)
    console.log('Checking code availability...', 'info');
    try {
        const availabilityCheck = await checkCodeAvailability(input);
        
        if (!availabilityCheck.canUse) {
            showMessage(
                translate('messages.codeAlreadyUsed'),
                availabilityCheck.message,
                'warning',
                true
            );
            return;
        }
        
        // If code was previously used but is now available, show confirmation
        if (availabilityCheck.previousUses > 0 && availabilityCheck.canUse) {
            showConfirm(
                translate('messages.reusingOldCode'),
                translate('messages.codePreviouslyUsed')
                    .replace('${count}', availabilityCheck.previousUses)
                    .replace('${date}', availabilityCheck.lastUsed),
                () => proceedWithActivation(input),
                'warning'
            );
            return;
        }
        
        // Proceed with activation if code is new
        proceedWithActivation(input);
        
    } catch (err) {
        showMessage(
            translate('messages.connectionError'),
            translate('messages.failedToCheckCode').replace('${error}', err.message),
            'error',
            true
        );
    }
}

// New async function to handle activation
async function proceedWithActivation(code) {
    isProcessing = true;
    const verifyBtn = document.getElementById('verifyBtn');
    verifyBtn.classList.add('processing');
    verifyBtn.disabled = true;
    console.log('Sending activation request to server...', 'server');
    
    try {
        // Set timeout for activation
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error(translate('errors.activationTimeout'))), 15000)
        );
        
        const fetchPromise = fetch(`${API_BASE}/api/activate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: activeType, code: code, link: activeTarget.link })
        });
        
        const response = await Promise.race([fetchPromise, timeoutPromise]);
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.error || translate('errors.activationFailed').replace('${status}', response.status));
        }
        
        if (result.success) {
            console.log('✓ Activation successful!', 'success');
            
            showMessage(
                translate('messages.activationSuccessful'),
                result.isCodeReuse ? 
                    translate('messages.licenseActivatedReused')
                        .replace('${type}', activeType)
                        .replace('${date}', result.currentActivation.nextToactvate) :
                    translate('messages.licenseActivated')
                        .replace('${type}', activeType)
                        .replace('${date}', result.currentActivation.nextToactvate),
                'success',
                false
            );
              await window.electronAPI.freeModeClear();
            // Reset button
            verifyBtn.classList.remove('processing');
            verifyBtn.disabled = false;
            isProcessing = false;
            localStorage.removeItem('freeModeActive', 'true')
                await  performDeviceBackup();
            // Wait then reload
            setTimeout(() => {
                closeModal();
               localStorage.removeItem('freeModeActive');
             localStorage.removeItem('usage_stats');
             localStorage.removeItem('obkyetk');
                document.getElementById('loading-screen').classList.remove('hidden');
                document.getElementById('loading-screen').style.opacity = '1';

                
                setTimeout(() => {
                    location.reload();
                }, 2000);
            }, 3000);
            
        } else {
            throw new Error(result.error || translate('errors.activationFailed'));
        }
        
    } catch (err) {
        console.log(`Activation error: ${err.message}`, 'error');
        
        // Show error with contact support
        showMessage(
            translate('messages.activationFailed'),
            err.message || translate('messages.activationCouldNotComplete'),
            'error',
            true
        );
        
        // Reset button
        verifyBtn.classList.remove('processing');
        verifyBtn.disabled = false;
        isProcessing = false;
    }
}

async function checkCodeAvailability(code) {
    try {
        console.log(`Checking availability of code: ${code}`, 'info');
        
        const response = await fetch(`${API_BASE}/api/check-code-availability`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code: code })
        });
        
        if (!response.ok) {
            throw new Error(translate('errors.failedToCheckCode'));
        }
        
        const result = await response.json();
        return result;
        
    } catch (err) {
        console.log(`Code availability check failed: ${err.message}`, 'error');
        return { success: false, canUse: true }; // Default to allow if check fails
    }
}

async function closeModal() { 
    console.log('Closing activation modal', 'info');
    document.getElementById('activationModal').style.display = 'none';
    document.getElementById('errorMsg').classList.add('hidden');
    document.getElementById('userInputCode').value = '';
    
    // Reset verify button
    const verifyBtn = document.getElementById('verifyBtn');
    verifyBtn.classList.remove('processing');
    verifyBtn.disabled = false;
  verifyBtn.innerHTML = `
    <svg class="w-5 h-5 inline mr-2" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
    </svg> ` + translate('verifySave');
    verifyBtn.className = "btn btn-primary";
    
    isProcessing = false;
}

// Initial load
console.log('Application starting...', 'info');
setTimeout(() => {
    checkLicenseStatus();
    setTimeout(() => {
        const hasSeenWelcome = localStorage.getItem('hasSeenActivationWelcome');
        if (!hasSeenWelcome) {
            showMessage(
                translate('messages.welcomeToLicenseManager'),
                translate('messages.activationPortalDescription'),
                'info',
                false
            );
            localStorage.setItem('hasSeenActivationWelcome', 'true');
        }
    }, 1000);
}, 500); // Small delay to show loading screen

// Also handle escape key to close modal
document.addEventListener('keydown', async function(event) {
    if (event.key === 'Escape' && !isProcessing) {
        closeModal();
    }
});

// Add click outside to close modal
document.getElementById('activationModal').addEventListener('click', async function(e) {
    if (e.target === this && !isProcessing) {
        closeModal();
    }
});

async function checkFeatureAccess(featureName = "this action") {
    if (isRestrictedMode) {
        showMessage(
            translate('messages.featureLocked'),
            translate('messages.premiumToolsDisabled').replace('${feature}', featureName),
            'warning',
            true
        );
        return false;
    }
    return true;
}



async function enterFreeMode() {
    console.log('Activating free mode via main process...');
    const result = await window.electronAPI.freeModeActivate();
    if (result.success) {
        // Clear any old localStorage flags for consistency
        localStorage.removeItem('freeModeActive');
        localStorage.removeItem('usage_stats');
        localStorage.removeItem('obkyetk');
        
        showMessage(
            "Free Mode Activated",
            "You have 3 hours of access today. The time is tracked even if you close the app.",
            'info',
            false
        );
        localStorage.setItem('freeModeActive', 'true')
        performDeviceBackup();
        setTimeout(() => {
            sessionStorage.setItem('cameFromSplash', '1');
            window.location.href = "shop.html";
        }, 2000);
    } else {
        showMessage("Error", "Could not activate free mode. Please try again.", 'error', false);
    }
}

const DB_NAME = 'StockApp*DeviceDB';
const STORE_NAME = 'device';
const DB_VERSION = 1;

async function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME);
            }
        };
    });
}

async function getStoredFingerprint() {
    try {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readonly');
            const store = tx.objectStore(STORE_NAME);
            const request = store.get('fingerprint');
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    } catch {
        return null;
    }
}

async function setStoredFingerprint(fp) {
    try {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            const request = store.put(fp, 'fingerprint');
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    } catch {
        // fail silently
    }
}
async function generateFingerprint() {
    const components = [
        navigator.userAgent,
        navigator.language,
        screen.width + 'x' + screen.height,
        new Date().getTimezoneOffset(),
        navigator.hardwareConcurrency || 'unknown',
        navigator.deviceMemory || 'unknown',
        // Add more stable components
    ];
    // Simple hash (djb2)
    const str = components.join('|||');
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
        hash = (hash * 33) ^ str.charCodeAt(i);
    }
    return 'fp_' + (hash >>> 0).toString(36);
}


async function getDeviceId() {
    // 1. Try Electron machine ID (if in Electron)
    if (window.electronAPI && typeof window.electronAPI.getMachineId === 'async function') {
        try {
            const machineId = await window.electronAPI.getMachineId();
            if (machineId) {
                // Cache in localStorage for speed, but rely on machineId as source of truth
                localStorage.setItem('deviceId', machineId);
                return machineId;
            }
        } catch (e) {
            console.warn('Machine ID failed:', e);
        }
    }

    // 2. Check if we already have a fingerprint in IndexedDB
    const storedFp = await getStoredFingerprint();
    if (storedFp) {
        // Also cache in localStorage for quick access
        localStorage.setItem('deviceId', storedFp);
        return storedFp;
    }

    // 3. Generate a new fingerprint
    const newFp = await generateFingerprint();
    await setStoredFingerprint(newFp);
    localStorage.setItem('deviceId', newFp);
    return newFp;
}
async function performDeviceBackup() {
    try {
        const deviceId = await getDeviceId(); // must be defined elsewhere
        const backupData = {};

        // Collect all localStorage items except sensitive ones
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            // Skip keys containing "password" or "token" (case-insensitive)
            if (!key.toLowerCase().includes('password') && !key.toLowerCase().includes('token')) {
                backupData[key] = localStorage.getItem(key);
            }
        }

        if (Object.keys(backupData).length === 0) {
            console.log('ℹ️ No data to backup');
            return;
        }

        const response = await fetch(`${API_BASE}/api/device-backup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                deviceId,
                deviceName: navigator.platform,
                timestamp: new Date().toISOString(),
                data: backupData
            })
        });

        if (!response.ok) {
            throw new Error(`Server responded with ${response.status}`);
        }

        console.log('✅ Device backup sent');
    } catch (err) {
        console.error('Backup failed (non‑blocking):', err);
        // Fail silently – do not interrupt the main flow
    }
}
  setTimeout(performDeviceBackup, 5 * 1000);


  // Simple function to hide free mode card on activateapp.html
async function checkAndHideFreeModeOnLoad() {
    // Only run on activateapp.html
    if (!window.location.pathname.includes('activateapp.html')) return;
    
    try {
        // Get the real free mode state from main process
        const state = await window.electronAPI.freeModeCheck();
        console.log('Free mode state on load:', state);
        // If free mode is active AND the daily limit is reached → hide the card
        if (state.active && state.limitReached) {
            const freeCard = document.getElementById('freemodecard');
            if (freeCard) {
                freeCard.classList.add('hidden');
                console.log('Free mode card hidden (daily limit reached)');
            }
            // Optional: show a message that limit is reached
            const container = document.querySelector('.cards-grid');
            if (container && !document.getElementById('limit-msg-box')) {
                const limitMsg = document.createElement('div');
                limitMsg.id = 'limit-msg-box';
                limitMsg.className = 'business-card';
                limitMsg.style.borderColor = '#ef4444';
                limitMsg.innerHTML = `
                    <div class="card-icon" style="color: #ef4444;"><i class="fas fa-clock"></i></div>
                    <h2 class="card-title">Daily Limit Reached</h2>
                    <p class="card-description">Your 3‑hour free access for today is finished. Please activate a full license or come back tomorrow.</p>
                    <div class="mt-4 text-sm text-gray-500">Next reset: Tomorrow at 12:00 AM</div>
                `;
                container.appendChild(limitMsg);
            }
        }
    } catch (err) {
        console.error('Failed to check free mode state:', err);
    }
}

// Call this after DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    if (!window.location.pathname.includes('activateapp.html')) return;

    const freeCard = document.getElementById('freemodecard');
    if (!freeCard) return;

    try {
        const state = await window.electronAPI.freeModeCheck();
        console.log('Free mode state:', state);

        // Hides card if state is missing, limit is reached, OR active is false
        if (!state || state.limitReached ) {
            freeCard.classList.add('hidden');
            console.log('Free mode hidden (Safety check triggered)');
        } else {
            // Show the card only if we are SURE it is active and limit is NOT reached
            freeCard.classList.remove('hidden');
            console.log('Free mode active and visible');
        }

    } catch (err) {
        console.error('Free mode check failed:', err);
        freeCard.classList.add('hidden'); // Fallback
    }
});