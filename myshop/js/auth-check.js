/**
 * Security Guard: Ensures the user has an active license or trial.
 * Redirects to activateapp.html if access is unauthorized.
 */

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


let isVerifying = false;
const DAILY_LIMIT_MS = 3 * 60 * 60 * 1000; // 3 hours (must match activat.js)
const TIME_CHECK_INTERVAL = 30000; 
async function validateAccess() {
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

console.log("📡 App connecting to API via:", API_BASE);

console.log("📡 App connecting to API via:", API_BASE);
    const REDIRECT_PAGE = "activateapp.html";
    const TRIAL_DAYS = 30;

    // Don't redirect if we are already on the activation page
    if (window.location.pathname.includes(REDIRECT_PAGE)) return;

    try {
        // 0. Check for Restricted Free Mode (Bypass)
        const freeState = await window.electronAPI.freeModeCheck();
        if (freeState.active && !freeState.limitReached) {
            console.log(`Access Granted: Free Mode (${Math.max(0, freeState.dailyLimit - freeState.timeUsed) / (60*60*1000)}h remaining)`);
            return; // allow access
        } else if (freeState.active && freeState.limitReached) {
            console.log('Free Mode limit reached – redirecting to activation');
            window.location.href = "activateapp.html";
            return;
        }

        // 1. Fetch License Data from Server
        const response = await fetch(`${API_BASE}/api/license-check`);
        if (!response.ok) throw new Error("Server communication failed");
        
        const data = await response.json();

        // ---------------------------------------------------------
        // LOGIC FOR PAID LICENSE (Monthly / Yearly)
        // ---------------------------------------------------------
        // We check if it is active AND not just a generic "Trial" type from the old system
        if (data.active && data.type && data.type !== 'Trial') {
            // Normalize dates to midnight to ensure accurate day calculations
            const now = new Date();
            now.setHours(0,0,0,0);

            const activationDate = new Date(data.activatedAt);
            activationDate.setHours(0,0,0,0);

            const expiryDate = new Date(data.nextToactvate);
            expiryDate.setHours(0,0,0,0);

            // A. Calculate Total Duration of the license (e.g., 30 days or 365 days)
            const totalDurationMs = expiryDate - activationDate;
            const totalDurationDays = Math.round(totalDurationMs / (1000 * 60 * 60 * 24));

            // B. Calculate Days Used So Far
            const usedMs = now - activationDate;
            const daysUsed = Math.round(usedMs / (1000 * 60 * 60 * 24));
            
            // C. Calculate Days Remaining
            const remainingMs = expiryDate - now;
            const daysRemaining = Math.round(remainingMs / (1000 * 60 * 60 * 24));

            // Determine display day (e.g. Day 1, even if 0 time passed)
            // We clamp it so it doesn't show negative days if clocks are slightly off
            const currentDay = daysUsed < 0 ? 1 : daysUsed + 1;

            if (daysRemaining >= 0) {
                // SUCCESS: Log the specific detailed format requested
                console.log(`%cAccess Granted: Valid Paid License (${data.type}) - Day ${currentDay} of ${totalDurationDays} (${daysRemaining} days remaining)`, "color: green; font-weight: bold; font-size: 14px;");
                       localStorage.removeItem('freeModeActive');
        localStorage.removeItem('usage_stats');
        localStorage.removeItem('obkyetk');
                return; // Stop here, user is verified
            } else {
                // FAILURE: License Expired
                console.log(`%cAccess Denied: License expired on ${data.nextToactvate}`, "color: red; font-weight: bold;");
                throw new Error(`License expired on ${data.nextToactvate}`);
            }
        }

        // ---------------------------------------------------------
        // LOGIC FOR TRIAL STATUS
        // ---------------------------------------------------------
        // If we reach here, there is no active Paid License. Check for Trial.
        const trialResponse = await fetch(`${API_BASE}/api/install-date`);
        if (trialResponse.ok) {
            const trialData = await trialResponse.json();
            const installDate = parseInt(trialData.installDate);
            
            const daysSinceInstall = Math.floor((Date.now() - installDate) / (1000 * 60 * 60 * 24));
            const daysRemaining = TRIAL_DAYS - daysSinceInstall;

            if (daysSinceInstall < TRIAL_DAYS) {
                // SUCCESS: Log Trial details
                console.log(`%cAccess Granted: Trial Mode - Day ${daysSinceInstall + 1} of ${TRIAL_DAYS} (${daysRemaining} days remaining)`, "color: orange; font-weight: bold;");
                return; 
            } else {
                // FAILURE: Trial Expired
                console.log(`%cAccess Denied: Trial Expired (${daysSinceInstall} days used)`, "color: red; font-weight: bold;");
                throw new Error("Trial Expired");
            }
        }

        // ---------------------------------------------------------
        // FALLBACK: LocalStorage Check (Redundancy)
        // ---------------------------------------------------------
        // If server check fails entirely, check local storage
        const localInstallDate = localStorage.getItem('install_date');
        if (localInstallDate) {
            const daysSinceInstall = Math.floor((Date.now() - parseInt(localInstallDate)) / (1000 * 60 * 60 * 24));
            if (daysSinceInstall >= TRIAL_DAYS) {
                throw new Error("Trial Expired (Local Check)");
            }
        } else {
            // No record found at all, must activate
            throw new Error("No License Found");
        }

    } catch (err) {
        console.warn("Access Denied:", err.message);
        window.location.href = REDIRECT_PAGE;
    }
}
function hasLicenseActivation(data) {
    // Check if there's any activation in the data
    if (data.currentActivation) return true;
    if (data.type && (data.type === 'Monthly' || data.type === 'Yearly')) return true;
    if (data.history && Array.isArray(data.history)) {
        return data.history.some(item => item.type && (item.type === 'Monthly' || item.type === 'Yearly'));
    }
    return false;
}
function isLicenseExpired(activationData) {
    if (!activationData || !activationData.nextToactvate) return true;
    
    const today = new Date();
    const nextDate = new Date(activationData.nextToactvate);
    
    // Reset time part for accurate date comparison
    today.setHours(0, 0, 0, 0);
    nextDate.setHours(0, 0, 0, 0);
    
    // If today is on or after the next activation date, license is expired
    return today >= nextDate;
}

async function checkLicenseStatus() {
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

console.log("📡 App connecting to API via:", API_BASE);   
    const TRIAL_DAYS = 30;
    const REDIRECT_PAGE = "activateapp.html";
    if (isVerifying) return;
    isVerifying = true;
    
    console.log('Starting license verification...', 'info');
    
    try {
        if (localStorage.getItem('freeModeActive') === 'true') {
            console.log("Access Granted: Restricted Free Mode active");
            return; // Allow access to shop.html
        }
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Server response timeout after 10 seconds')), 10000)
        );
        console.log('Testing server connection...', 'server');
        const testResponse = await fetch(`${API_BASE}/api/ping`);
        if (testResponse.ok) {
            console.log('✓ Server connection established', 'success');
        } else {
            console.log('⚠ Server responded with non-OK status', 'warning');
        }
        console.log('Fetching license data from server...', 'server');
        const fetchPromise = fetch(`${API_BASE}/api/license-check`);
        const response = await Promise.race([fetchPromise, timeoutPromise]);
        
        if (!response.ok) {
            throw new Error(`Server error: ${response.status}`);
        }
        
        const data = await response.json();
        console.log(`Server response received: ${JSON.stringify(data).substring(0, 100)}...`, 'server');
        
        // Check if user has EVER had a license activation
        if (hasLicenseActivation(data)) {
            console.log('User has license activation record', 'info');
            
            // Check if license is currently active and not expired
            if (data.active && data.currentActivation && !isLicenseExpired(data.currentActivation)) {
                console.log('✓ Valid active license found', 'success');
                // Save creation date from server if available
                if (data.createdTimestamp || data.createdDate) {
                    localStorage.setItem('install_date', data.createdTimestamp || data.createdDate);
                    localStorage.setItem('file_created_date', data.createdDate || new Date().toISOString());
                    console.log('Saved license creation date', 'info');
                }
                return;
            }
            
            // License exists but is expired
            if (data.currentActivation && isLicenseExpired(data.currentActivation)) {
                console.log('⚠️ License has expired based on nextToactvate date', 'warning');
                console.warn("Access Denied:", err.message);
                window.location.href = REDIRECT_PAGE;
            }
        }
        

    } catch (err) {
        console.log(`Verification error: ${err.message}`, 'error');
                console.warn("Access Denied:", err.message);
        window.location.href = REDIRECT_PAGE;
            
    } finally {
        console.log('Verification process completed', 'info');
    }
}



validateAccess();
checkLicenseStatus();

