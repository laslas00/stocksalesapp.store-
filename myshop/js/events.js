let currentYear = new Date().getFullYear();
// ==================== PERSISTENT DEVICE ID ====================
// IndexedDB wrapper (promise-based)
const DB_NAME = 'StockApp*DeviceDB';
const STORE_NAME = 'device';
const DB_VERSION = 1;

function openDB() {
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

// Generate a simple fingerprint (you can improve with more entropy)
function generateFingerprint() {
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

// Main device ID function
async function getDeviceId() {
    // 1. Try Electron machine ID (if in Electron)
    if (window.electronAPI && typeof window.electronAPI.getMachineId === 'function') {
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
    const newFp = generateFingerprint();
    await setStoredFingerprint(newFp);
    localStorage.setItem('deviceId', newFp);
    return newFp;
}
function updateHomeLogo() {
    const logoImg = document.getElementById('homeBusinessLogo');
    if (logoImg) {
        let logoUrl = businessInfo.logoData || businessInfo.logo_url || '';
        
        // Fix image path for Supabase storage
        if (logoUrl && !logoUrl.startsWith('http') && !logoUrl.startsWith('data:')) {
            // If it's a local path (not from Supabase storage), use as-is
            if (logoUrl.startsWith('image/') || logoUrl.startsWith('/')) {
                // Local asset - keep as-is
            } else {
                // Supabase storage path - convert to full URL
                logoUrl = `https://zexxdoxuzvkovszfqcio.supabase.co/storage/v1/object/public/${logoUrl}`;
            }
        }
        
        logoImg.src = logoUrl;
        logoImg.classList.toggle('hidden', !logoUrl);
    }
    
    const homeBusinessName = document.getElementById('homeBusinessname');
    if (homeBusinessName) {
        homeBusinessName.textContent = businessInfo.name || '';
    }
}

async function checkSetupStatus() {
    try {
        // ========== NEW: If user came from login button, don't force setup ==========
        const cameFromLogin = localStorage.getItem('cameFromLogin') || 
                             localStorage.getItem('userChoseLogin');
        
        if (cameFromLogin === 'true') {
            console.log('User came from login button - skipping setup redirect');
            // Clear the flag after use
            localStorage.removeItem('cameFromLogin');
            return true; // Allow them to see login page
        }

        const localSetup = localStorage.getItem('StockApp_setup');
        if (localSetup) {
            const setup = JSON.parse(localSetup);
            if (setup.isFirstTime === false) return true;
        }
        
        const setupCompleted = localStorage.getItem('setup_completed');
        if (setupCompleted === 'true') return true;

        const client = getSB();
        if (!client) {
            if (!window.location.pathname.includes('setup.html')) {
                window.location.href = 'setup.html';
            }
            return false;
        }

        const { data, error } = await client
            .from('business_info')
            .select('name')
            .limit(1);

        if (!error && data && data.length > 0 && data[0].name) {
            localStorage.setItem('setup_completed', 'true');
            return true;
        }

        if (!window.location.pathname.includes('setup.html')) {
            window.location.href = 'setup.html';
        }
        return false;
    } catch (error) {
        console.error('Error checking setup:', error);
        if (!window.location.pathname.includes('setup.html')) {
            window.location.href = 'setup.html';
        }
        return false;
    }
}

document.getElementById('loginBtn').onclick = async function() {
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value;
    const role = document.getElementById('loginRole').value;
    const rememberMe = document.getElementById('rememberMe').checked;
    const errorEl = document.getElementById('loginError');

    // ========== STEP 1: Validate inputs ==========
    if (!username) {
        errorEl.textContent = 'Please enter your username.';
        errorEl.classList.remove('hidden');
        return;
    }
    if (!password) {
        errorEl.textContent = 'Please enter your password.';
        errorEl.classList.remove('hidden');
        return;
    }

    // ========== STEP 2: Disable button & show loading ==========
    this.disabled = true;
    this.textContent = 'Logging in...';
    errorEl.classList.add('hidden');

    // ========== STEP 3: Check database connection ==========
    const client = getSB();
    if (!client) {
        errorEl.textContent = '⚠️ Cannot connect to database. Check your internet connection and try again.';
        errorEl.classList.remove('hidden');
        this.disabled = false;
        this.textContent = 'Login';
        return;
    }

    try {
        // ========== STEP 4: Find user by username AND role ==========
        const { data: users, error: queryError } = await client
            .from('users')
            .select('*')
            .eq('username', username)
            .eq('role', role);

        if (queryError) {
            console.error('Database query error:', queryError);
            errorEl.textContent = '❌ Database error. Please try again later.';
            errorEl.classList.remove('hidden');
            this.disabled = false;
            this.textContent = 'Login';
            return;
        }

        // ========== STEP 5: NO USERS FOUND - Redirect to setup ==========
        if (!users || users.length === 0) {
            const { data: allUsers, error: countError } = await client
                .from('users')
                .select('id')
                .limit(1);

            if (!countError && (!allUsers || allUsers.length === 0)) {
                errorEl.innerHTML = '👋 Welcome! No account found.<br><br><button onclick="window.location.href=\'setup.html\'" style="background:#3b82f6;color:white;border:none;padding:8px 20px;border-radius:6px;cursor:pointer;font-weight:600;">Click here to setup your shop</button>';
                errorEl.classList.remove('hidden');
                localStorage.removeItem('setup_completed');
                localStorage.removeItem('StockApp_setup');
                localStorage.removeItem('cameFromLogin');
                localStorage.removeItem('userChoseLogin');
            } else {
                errorEl.textContent = '❌ No account found with that username and role combination. Please check and try again.';
                errorEl.classList.remove('hidden');
            }
            this.disabled = false;
            this.textContent = 'Login';
            return;
        }

        const user = users[0];
        
        // Fix missing business_id
        if (!user.business_id) {
            console.log('⚠️ User has no business_id, fetching from business_info...');
            const { data: bizInfo } = await client
                .from('business_info')
                .select('id')
                .limit(1)
                .maybeSingle();
            
            if (bizInfo?.id) {
                user.business_id = bizInfo.id;
                await client.from('users')
                    .update({ business_id: bizInfo.id })
                    .eq('id', user.id);
                console.log('✅ Updated user business_id:', bizInfo.id);
            }
        }

        // ========== STEP 6: Check password ==========
        if (user.password !== password) {
            errorEl.textContent = '❌ Incorrect password. Please try again.';
            errorEl.classList.remove('hidden');
            this.disabled = false;
            this.textContent = 'Login';
            return;
        }

        // ========== STEP 7: LICENSE CHECK ==========
        let licenseValid = false;
        let licenseData = null;
        let errorMessage = null;

        if (user.business_id) {
            console.log('🔍 Checking license from business_info for business:', user.business_id);
            
            const { data: bizInfo, error: bizError } = await client
                .from('business_info')
                .select('license_plan, license_status, license_expires_at, license_activated_at')
                .eq('id', user.business_id)
                .maybeSingle();

            if (bizError) {
                console.error('Business info query error:', bizError);
                errorMessage = '❌ Database error checking license. Please try again.';
            } else if (bizInfo) {
                console.log('📋 Business info license data:', bizInfo);
                
                const hasValidStatus = bizInfo.license_status === 'active' || bizInfo.license_status === 'trial' || bizInfo.license_status === 'trialing';
                
                if (bizInfo.license_plan && hasValidStatus) {
                    licenseData = {
                        plan: bizInfo.license_plan,
                        status: bizInfo.license_status,
                        expires_at: bizInfo.license_expires_at,
                        activated_at: bizInfo.license_activated_at,
                        source: 'business_info_table'
                    };
                } else if (bizInfo.license_status === 'expired') {
                    errorMessage = `⏰ <strong>License Expired</strong><br><br>Your license has expired.<br><br><a href="pricing.html" style="color:#3b82f6;font-weight:600;text-decoration:underline;">Renew now →</a>`;
                } else if (bizInfo.license_status === 'inactive') {
                    errorMessage = `❌ <strong>License Inactive</strong><br><br>Your license is inactive. Please contact support.<br><br><a href="pricing.html" style="color:#3b82f6;font-weight:600;text-decoration:underline;">View plans →</a>`;
                } else {
                    errorMessage = `❌ <strong>No Active License Found</strong><br><br>Your business doesn't have an active license or subscription.<br><br><a href="pricing.html" style="color:#3b82f6;font-weight:600;text-decoration:underline;">Purchase a plan to continue →</a>`;
                }
            } else {
                errorMessage = `❌ <strong>Business Not Found</strong><br><br>Your account is not properly configured. Please contact support.`;
            }

            if (licenseData && !errorMessage) {
                const expiresAt = licenseData.expires_at ? new Date(licenseData.expires_at) : null;
                const now = new Date();
                
                if (expiresAt) {
                    if (expiresAt < now) {
                        const planName = licenseData.plan.charAt(0).toUpperCase() + licenseData.plan.slice(1);
                        const expiryDate = expiresAt.toLocaleDateString('en-US', { 
                            weekday: 'long', 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric' 
                        });
                        
                        errorMessage = `⏰ <strong>License Expired</strong><br><br>Your ${planName} ${licenseData.status === 'trial' ? 'trial' : 'plan'} expired on <strong>${expiryDate}</strong>.<br><br><a href="pricing.html" style="color:#3b82f6;font-weight:600;text-decoration:underline;">Renew now →</a>`;
                        
                        await client.from('business_info')
                            .update({ license_status: 'expired' })
                            .eq('id', user.business_id);
                    } else {
                        licenseValid = true;
                        const daysLeft = Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24));
                        const planName = licenseData.plan.charAt(0).toUpperCase() + licenseData.plan.slice(1);
                        
                        console.log(`✅ LICENSE VALID: ${planName} | ${licenseData.status} | ${daysLeft} days remaining`);
                        
                        localStorage.setItem('licensePlan', licenseData.plan);
                        localStorage.setItem('licenseStatus', licenseData.status);
                        localStorage.setItem('licenseExpires', licenseData.expires_at);
                        localStorage.setItem('licenseDaysLeft', daysLeft);
                        
                        if ((licenseData.status === 'trial' || licenseData.status === 'trialing') && daysLeft <= 3) {
                            setTimeout(() => {
                                if (typeof showMessageModal === 'function') {
                                    showMessageModal(`⚠️ Your free trial ends in ${daysLeft} day${daysLeft > 1 ? 's' : ''}! Upgrade to keep using the app.`);
                                }
                            }, 2000);
                        }
                    }
                } else {
                    licenseValid = true;
                    console.log(`✅ LICENSE VALID (no expiry): ${licenseData.plan}`);
                    localStorage.setItem('licensePlan', licenseData.plan);
                    localStorage.setItem('licenseStatus', licenseData.status);
                }
            }
        } else {
            console.warn('⚠️ No business_id found for user');
            errorMessage = `❌ <strong>Setup Incomplete</strong><br><br>Your account is not linked to a business. Please contact the administrator.<br><br><a href="setup.html" style="color:#3b82f6;font-weight:600;text-decoration:underline;">Complete setup →</a>`;
        }

        // ========== STEP 8: BLOCK LOGIN IF LICENSE INVALID ==========
        if (!licenseValid) {
            errorEl.innerHTML = errorMessage || '❌ License validation failed. Please contact support.';
            errorEl.classList.remove('hidden');
            this.disabled = false;
            this.textContent = 'Login';
            return;
        }

        // ========== STEP 9: Login successful! ==========
        console.log('✅ Login successful:', user.username, '| Role:', user.role);
        
        // ========== FETCH FULL BUSINESS INFO (including festive badge settings) ==========
        const { data: businessInfoData } = await client
            .from('business_info')
            .select('*')  // Get all fields including festive badge settings
            .eq('id', user.business_id)
            .maybeSingle();
        
        localStorage.setItem('setup_completed', 'true');
        
        // Set current user WITH business_id
        const finalBusinessId = user.business_id || null;
        window.currentUser = { ...user, business_id: finalBusinessId };
        currentUser = window.currentUser;

        // Cache business ID
        if (finalBusinessId) {
            localStorage.setItem('businessId', finalBusinessId);
            console.log('🔍 Cached business_id:', finalBusinessId);
        }

        // Set global businessInfo
        window.businessInfo = businessInfoData;
        
        // Update current language from business info
        if (businessInfoData?.language) {
            currentLanguage = businessInfoData.language;
            localStorage.setItem('language', currentLanguage);
        }

        // ========== INITIALIZE FESTIVE BADGE AFTER LOGIN ==========
        initializeFestiveBadgeAfterLogin(businessInfoData);
          await initializePushAfterLogin();

        // Create business name slug
        const businessName = (businessInfoData?.name || 'shop').toLowerCase().replace(/\s+/g, '-');
        
        // Build URL parameters
        const urlParams = new URLSearchParams({
            lang: currentLanguage || 'en',
            user: user.username,
            role: user.role,
            business: businessName,
            id: finalBusinessId,
            name: username,
            userid: user.id || username
        });

        const newUrl = `shop.html?${urlParams.toString()}`;
        window.history.replaceState({}, '', newUrl);
        document.title = `StockApp* -> ${businessInfoData?.name || 'Shop'} | ${user.username} (${user.role})`;

        console.log('🔗 URL updated:', newUrl);

        // Save session to localStorage
        localStorage.setItem('currentRole', role);
        localStorage.setItem('currentUsername', username);
        localStorage.setItem('currentUserId', user.id || username);
        
        const userSession = {
            username: username,
            role: role,
            userId: user.id || username,
            business_id: user.business_id || null,
            loginTime: new Date().toISOString(),
            permissions: user.permissions || [],
            photo: user.photo_url || user.photo || null,
            email: user.email || null,
            fullName: user.full_name || username,
            firstName: user.firstName || null,
            surname: user.surname || null,
            phone: user.phone || null,
            address: user.address || null
        };
        localStorage.setItem('userSession', JSON.stringify(userSession));

        // Handle "Remember Me"
        if (rememberMe) {
            localStorage.setItem('rememberedUser', JSON.stringify({ username, role }));
        } else {
            localStorage.removeItem('rememberedUser');
        }

        // ========== STEP 10: Show main content ==========
        if (typeof restoreDeviceBackup === 'function') await restoreDeviceBackup();
        document.getElementById('loginModal').classList.add('hidden');
        const loadingIndicator = document.getElementById('loadingIndicator');
        if (loadingIndicator) loadingIndicator.classList.add('hidden');
        document.getElementById('mainContentContainer').classList.remove('hidden');
        document.getElementById('homeOverlay').classList.remove('hidden');

        // ========== STEP 11: Load data & initialize ==========
        errorEl.classList.add('hidden');
        this.disabled = false;
        this.textContent = 'Login';

        if (typeof initializeHomeOverlay === 'function') await initializeHomeOverlay();
        if (typeof updateTime === 'function') updateTime();
        
        // Update sidebar user display
        if (typeof updateSidebarUserDisplay === 'function') {
            updateSidebarUserDisplay();
        }
        
        // Request notification permission
        if ("Notification" in window && Notification.permission !== "granted") {
            Notification.requestPermission();
        }

        // Track login event
        if (typeof trackAppEvent === 'function') {
            const licensePlan = localStorage.getItem('licensePlan') || 'starter';
            const licenseStatus = localStorage.getItem('licenseStatus') || 'active';
            trackAppEvent('login', { licensePlan: licensePlan, licenseStatus: licenseStatus }, username);
        }

        // Role-specific setup
        if (user.role === 'administrator') {
            if (typeof removeSalesAssociateInfo === 'function') removeSalesAssociateInfo();
            const managerInfoBtn = document.getElementById('managerInfoButton');
            if (managerInfoBtn) managerInfoBtn.remove();
            const isFirstLogin = !localStorage.getItem('tourCompleted');
            if (isFirstLogin && typeof startTour === 'function') setTimeout(startTour, 1000);
            if (typeof showDashboard === 'function') showDashboard();
            if (typeof showSystemNotification === 'function') showSystemNotification(translate('welcome'), `${translate('logged_in_as')} ${user.username}`, 'icon.ico');
            if (typeof startBackupStatusCheck === 'function') startBackupStatusCheck();
            if (typeof checkForUpdates === 'function') checkForUpdates();
            if (typeof checkRatingTrigger === 'function') setTimeout(checkRatingTrigger, 10000);
            if (typeof connectWebSocket === 'function') connectWebSocket();
            if (typeof checkSecuritySetup === 'function') checkSecuritySetup(user);
        } else if (user.role === 'manager') {
            if (typeof removeSalesAssociateInfo === 'function') removeSalesAssociateInfo();
            if (typeof showManagerInfo === 'function') showManagerInfo(user);
            const isFirstLogin = !localStorage.getItem('tourCompleted');
            if (isFirstLogin && typeof startTour === 'function') setTimeout(startTour, 1000);
            if (typeof showSystemNotification === 'function') showSystemNotification(translate('welcome'), `${translate('logged_in_as_manager')} ${user.username}`, 'icon.ico');
            if (typeof checkForUpdates === 'function') checkForUpdates();
            if (typeof checkRatingTrigger === 'function') setTimeout(checkRatingTrigger, 10000);
            if (typeof connectWebSocket === 'function') connectWebSocket();
            if (typeof checkSecuritySetup === 'function') checkSecuritySetup(user);
            if (typeof startNotificationListener === 'function') startNotificationListener();
            if (typeof startUserRoleListener === 'function') startUserRoleListener();
        } else {
            if (typeof showSalesAssociateInfo === 'function') showSalesAssociateInfo(user);
            const isFirstLogin = !localStorage.getItem('tourCompleted');
            if (isFirstLogin && typeof startTour === 'function') setTimeout(startTour, 1000);
            if (typeof showSystemNotification === 'function') showSystemNotification(translate('welcome'), `${translate('logged_in_as')} ${user.username}`, 'icon.ico');
            if (typeof checkForUpdates === 'function') checkForUpdates();
            if (typeof checkRatingTrigger === 'function') setTimeout(checkRatingTrigger, 10000);
            if (typeof connectWebSocket === 'function') connectWebSocket();
            if (typeof checkSecuritySetup === 'function') checkSecuritySetup(user);
            if (typeof startNotificationListener === 'function') startNotificationListener();
            if (typeof startUserRoleListener === 'function') startUserRoleListener();
        }

    } catch (err) {
        console.error('❌ Unexpected login error:', err);
        errorEl.textContent = '⚠️ Something went wrong. Please refresh the page and try again.';
        errorEl.classList.remove('hidden');
        this.disabled = false;
        this.textContent = 'Login';
    }
};

// Add this function to update sidebar user display after login
window.updateSidebarUserDisplay = function() {
    const userNameEl = document.getElementById('sidebar-user-name');
    const userAvatarEl = document.getElementById('sidebar-user-avatar');
    const userRoleEl = document.getElementById('sidebar-user-role');
    
    if (!userNameEl) return;
    
    if (window.currentUser) {
        // Update username
        userNameEl.textContent = window.currentUser.username;
        
        // Update role
        if (userRoleEl) {
            const roleText = window.currentUser.role === 'administrator' ? 'Admin' : 
                            (window.currentUser.role === 'manager' ? 'Manager' : 'Sales Associate');
            userRoleEl.textContent = roleText;
        }
        
        // Update avatar
        if (userAvatarEl) {
            const userPhoto = window.currentUser.photo || window.currentUser.avatar;
            if (userPhoto && userPhoto !== '') {
                const photoSrc = typeof fixImagePath === 'function' ? fixImagePath(userPhoto) : userPhoto;
                userAvatarEl.innerHTML = `<img src="${photoSrc}" alt="${window.currentUser.username}" class="w-8 h-8 rounded-full object-cover">`;
            } else {
                userAvatarEl.innerHTML = '<i class="fas fa-user"></i>';
            }
        }
    }
};

// Also listen for storage events to update sidebar when userSession changes
window.addEventListener('storage', function(e) {
    if (e.key === 'userSession' && e.newValue) {
        try {
            const userSession = JSON.parse(e.newValue);
            if (userSession && userSession.username) {
                window.currentUser = window.currentUser || {};
                window.currentUser.username = userSession.username;
                window.currentUser.role = userSession.role;
                window.currentUser.photo = userSession.photo;
                if (typeof updateSidebarUserDisplay === 'function') {
                    updateSidebarUserDisplay();
                }
            }
        } catch (err) {
            console.warn('Failed to parse userSession on storage event:', err);
        }
    }
});

async function restoreDeviceBackup() {
    try {
        const client = getSB();
        if (!client) {
            console.warn('⚠️ Cannot restore backup - no database connection');
            return;
        }

        const userId = currentUser?.id || localStorage.getItem('currentUserId');
        if (!userId) {
            console.warn('⚠️ Cannot restore backup - no user ID found');
            return;
        }

        console.log('📥 Checking for backup for user:', userId);

        const { data: backup, error } = await client
            .from('user_backups')
            .select('*')
            .eq('user_id', userId)
            .maybeSingle();

        if (error || !backup) {
            console.log('ℹ️ No backup found for this user');
            return { success: false, message: 'No backup found' };
        }

        const backupData = backup.data || {};
        let restoredCount = 0;

        // Restore each item to localStorage
        for (const [key, value] of Object.entries(backupData)) {
            try {
                const stringValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
                localStorage.setItem(key, stringValue);
                restoredCount++;
            } catch (e) {
                console.warn(`⚠️ Could not restore key: ${key}`);
            }
        }

        console.log(`✅ Restored ${restoredCount} items from backup`);
        console.log('📅 Backup from:', backup.created_at);

        return { 
            success: true, 
            restoredCount,
            backupDate: backup.created_at,
            deviceInfo: backup.device_info
        };

    } catch (error) {
        console.error('❌ Restore failed:', error.message);
        return { success: false, error: error.message };
    }
}

// Auto-backup every 30 minutes
function startAutoBackup() {
    // Run first backup after 30 seconds
    setTimeout(async () => {
        console.log('🔄 Running auto-backup...');
        await performDeviceBackup();
    }, 30000);

    // Then backup every 30 minutes
    setInterval(async () => {
        console.log('🔄 Running scheduled backup...');
        await performDeviceBackup();
    }, 30 * 60 * 1000); // 30 minutes
}
startAutoBackup()
function showSyncingOverlayPersistent() {
    if (syncingTimeout) clearTimeout(syncingTimeout);
    showSyncingOverlay();
}

function hideSyncingOverlaySafe() {
    if (syncingTimeout) clearTimeout(syncingTimeout);
    hideSyncingOverlay();
}

function updateCategoryFilterOptions() {
    const categories = [...new Set(stock.map(item => item.category || '#'))];
    categories.sort();
    const currentValue = stockCategoryFilter.value;
    stockCategoryFilter.innerHTML = `<option value="All">${translate('all_brands') || 'All brands'}</option>`;
    categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category;
        stockCategoryFilter.appendChild(option);
    });
    if (categories.includes(currentValue)) {
        stockCategoryFilter.value = currentValue;
    }
}

function showCurrentStockSection() {
    stockOptionsModal.classList.add('hidden');
    hideAllStockSubSections();
    currentStockSection.classList.remove('hidden');
    renderStock(); 
}

async function loadSalesForCurrentYear() {
    const now = new Date();
    const currentYear = now.getFullYear();
    await loadSalesForYear(currentYear);
    console.log(`✅ ${translate('loaded_sales_for_year') || 'Loaded'} ${sales.length} ${translate('sales_for_year') || 'sales for the current year'} (${currentYear}).`);
}

stockTypeFilter.addEventListener('change', async () => {
    await loadStockTOSAVE();
    renderStock();
});

document.getElementById('makeAdBtn').addEventListener('click', function() {
    makeAdForItem(currentItemBeingEdited);
});

function makeAdForItem(currentItemBeingEdited) {
    let contactParts = [];
    if (businessInfo.shopNumber) contactParts.push('📞 ' + businessInfo.shopNumber);
    if (businessInfo.phoneNumberTwo) contactParts.push('📞 ' + businessInfo.phoneNumberTwo);
    if (businessInfo.email) contactParts.push('📧 ' + businessInfo.email);
     if (businessInfo.Website) contactParts.push('🌐' + businessInfo.Website);
    if (businessInfo.address) contactParts.push('🏠 ' + businessInfo.address);
    if (businessInfo.socialMediaHandles) contactParts.push('🔗 ' + businessInfo.socialMediaHandles);

    // Prepare data for localStorage
    const adData = {
        name: currentItemBeingEdited.name,
        price: currentItemBeingEdited.price,
        image: currentItemBeingEdited.imageUrl || '', 
        category: currentItemBeingEdited.category || '',
        type: currentItemBeingEdited.type || '',
        business: {
            name: businessInfo.name,
            logo: businessInfo.logoData || '',
            shopNumber: businessInfo.shopNumber || '',
            phoneNumberTwo: businessInfo.phoneNumberTwo || '',
            email: businessInfo.email || '',
            Website: businessInfo.Website || '',
            address: businessInfo.address || '',
            socialMediaHandles: businessInfo.socialMediaHandles || '',
            contactInfo: contactParts.join('\n')
        }
    };
    localStorage.setItem('adMakerItem', JSON.stringify(adData));
    // Open ad makker.html in a new tab
    window.location.href = 'HTML/ad makker.html';
}

currentStockOptionBtn.addEventListener('click', async () => {
            if (localStorage.getItem('freeModeActive') === 'true') {
        if (typeof showMessageModal === 'function') {
        showMessageModal(translate('feature_locked_free_mode'));
        } else {
            alert("Printing is disabled in Free Mode. Please activate your license.");
        }
        return; // STOP execution here
    }
     showLoading();

if (isCancelled) return;

    try {
        await loadStock();
                       const checkInterval = setInterval(() => {
            checkCancelled();
        }, 100);
          resetCancellation();
        clearInterval(checkInterval);
        

        checkCancelled();
        
        hideLoading();
        showCurrentStockSection();
    } catch (error) {
        console.error("❌ Error loading current stock:", error);
        showMessageModal(translate('failed_to_load_current_stock') || 'Failed to load current stock. Please try again.');
    }
});

applyStockFilterBtn.addEventListener('click', function () {
    showLoading();
if (isCancelled) return;

    setTimeout(() => {
        renderStockHistory();
                       const checkInterval = setInterval(() => {
            checkCancelled();
        }, 100);
          resetCancellation();
        clearInterval(checkInterval);
        

        checkCancelled();
        
        hideLoading();
    }, 300);
});

async function showServerIpPopup() {
      localStorage.removeItem('serverIpInfo');
    try {
        const saved = JSON.parse(localStorage.getItem('serverIpInfo') || '{}');
        const now = Date.now();
        let useSaved = false;

        if (saved.ip && saved.port && saved.timestamp) {
            if (now - saved.timestamp < 90 * 24 * 60 * 60 * 1000) {
                useSaved = true;
            }
        }

        let ip, port;
        if (useSaved) {
            ip = saved.ip;
            port = saved.port;
        } else {
            const res = await fetch(`${API_BASE}/api/local-ip`);
            const data = await res.json();
            ip = data.ip;
            port = data.port;
        }

        const isElectron = typeof window !== 'undefined' && !!window.electronAPI;
                    
        if (isElectron) {
            showMessageModal((translate('device_is_server') || 'This device is the server.\nShare this link with others on your WiFi:\n\n') + `https://${ip}:${port}/`);
        } else {
            showMessageModal((translate('share_link_on_wifi') || 'Share this with others on the same WiFi:\n\n') + `https://${ip}:${port}/`);
        }
    } catch (err) {
        showMessageModal(translate('could_not_fetch_server_ip') || 'Could not fetch server IP address.');
    }
}

async function showServerIpPopup25() {
    try {
        // Show modal immediately
        const modal = document.getElementById('ipAddressModal');
        modal.classList.remove('hidden');
        
        // Show loading state
        const modalText = document.getElementById('ipAddressModalText');
        const qrContainer = document.getElementById('qrCode');
        
        modalText.textContent = "Fetching server information...";
        qrContainer.innerHTML = '<div class="text-gray-500">Loading QR code...</div>';
        
        // Check saved data
        const saved = JSON.parse(localStorage.getItem('serverIpInfo') || '{}');
        const now = Date.now();
        let useSaved = false;
        let ip, port;

        if (saved.ip && saved.port && saved.timestamp) {
            // Check if saved data is less than 24 hours old (more reasonable for IP changes)
            if (now - saved.timestamp < 24 * 60 * 60 * 1000) {
                useSaved = true;
                ip = saved.ip;
                port = saved.port;
            }
        }

        // Fetch fresh data if needed
        if (!useSaved) {
            const res = await fetch(`${API_BASE}/api/local-ip`);
            if (!res.ok) {
                throw new Error('Failed to fetch IP address');
            }
            const data = await res.json();
            ip = data.ip;
            port = data.port || 3000; // Default port if not provided
            
            // Save to localStorage
            localStorage.setItem('serverIpInfo', JSON.stringify({
                ip: ip,
                port: port,
                timestamp: Date.now()
            }));
        }

        // Construct the link - Use https if local network, https only if SSL is configured
        const isLocalIP = ip.startsWith('192.168.') || 
                         ip.startsWith('10.') || 
                         ip.startsWith('172.') ||
                         ip === '127.0.0.1' ||
                         ip === 'localhost';
        
        const protocol = isLocalIP ? 'https' : 'https';
        const link = `${protocol}://${ip}:${port}/`;
        
        // Update modal text
        const isElectron = typeof window !== 'undefined' && window.electronAPI;
        if (isElectron) {
            modalText.textContent = (translate('device_is_server') || 'This device is the server.\nShare this link with others on your WiFi:\n\n') + link;
        } else {
            modalText.textContent = (translate('share_link_on_wifi') || 'Share this with others on the same WiFi:\n\n') + link;
        }
        
        // Generate QR code
        qrContainer.innerHTML = ''; // Clear loading message
        
        // Check if QRCode library is available
        if (typeof QRCode !== 'undefined') {
            // Clear any existing QR code first
            while (qrContainer.firstChild) {
                qrContainer.removeChild(qrContainer.firstChild);
            }
            
            // Create a container with better contrast
            const qrWrapper = document.createElement('div');
            qrWrapper.className = 'qr-wrapper';
            qrContainer.appendChild(qrWrapper);
            
            // Generate QR with better settings
            new QRCode(qrWrapper, {
                text: link,
                width: 200, // Increased for better readability
                height: 200,
                colorDark: "#000000",
                colorLight: "#FFFFFF",
                correctLevel: QRCode.CorrectLevel.Q, // 25% error correction
                margin: 2 // Add margin (quiet zone) around QR code
            });
            
            // Add white background for better contrast
            qrWrapper.style.backgroundColor = '#FFFFFF';
            qrWrapper.style.padding = '10px';
            qrWrapper.style.borderRadius = '8px';
            qrWrapper.style.display = 'inline-block';
            
        } else {
            qrContainer.innerHTML = `
                <div class="text-center">
                    <div class="text-red-500 mb-2">QR Code library not loaded</div>
                    <p class="text-sm text-gray-600">Please scan the link above</p>
                </div>
            `;
        }

        // Ensure modal stays visible until user closes it
        modalText.className = 'mb-4 text-gray-800 font-mono break-all text-center whitespace-pre-line';
        
        // Add copy button functionality (optional enhancement)
        const copyButton = document.createElement('button');
        copyButton.textContent = translate('copy_link') || 'Copy Link';
        copyButton.className = 'mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition';
        copyButton.onclick = () => {
            navigator.clipboard.writeText(link).then(() => {
                copyButton.textContent = translate('copied') || 'Copied!';
                setTimeout(() => {
                    copyButton.textContent = translate('copy_link') || 'Copy Link';
                }, 2000);
            });
        };
        
        modalText.parentNode.insertBefore(copyButton, modalText.nextSibling);

    } catch (err) {
        console.error('Error fetching server IP:', err);
        
        // Show error in modal
        const modalText = document.getElementById('ipAddressModalText');
        const qrContainer = document.getElementById('qrCode');
        
        modalText.textContent = translate('could_not_fetch_server_ip') || 
                               'Could not fetch server IP address. Please check your connection.';
        modalText.className = 'mb-4 text-red-600 font-mono break-all text-center';
        
        qrContainer.innerHTML = `
            <div class="text-center p-4">
                <div class="text-red-500 text-4xl mb-2">❌</div>
                <p class="text-sm text-gray-600">Unable to generate QR code</p>
            </div>
        `;
    }
}

function closeIpModal() {
    document.getElementById('ipAddressModal').classList.add('hidden');
        wifiToggle.classList.remove("active");
}



    const wifiToggle = document.getElementById("wifiToggle");
    
    if (wifiToggle) {
        wifiToggle.addEventListener("click", function(event) {
            event.preventDefault();
            wifiToggle.classList.toggle("active");
            showServerIpPopup25();
        });
    }
    




document.getElementById('healthBtn').onclick = async function() {
    const modal = document.getElementById('healthModal');
    const content = document.getElementById('healthStatusContent');
    modal.classList.remove('hidden');
    content.innerHTML = `
        <div id="healthScanAnimation" class="flex justify-center items-center my-4">
            <div class="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-green-500"></div>
            <span class="ml-4 text-black-600 dark:text-gray-300 font-semibold">${translate('scanning') || 'Scanning...'}</span>
        </div>
    `;
    
    try {
        const client = typeof getSB === 'function' ? getSB() : null;
        
        // Test items to check
        let serverStatus = 'ok';
        let dbStatus = 'ok';
        let dbResponseTime = 'N/A';
        let totalUsers = 'N/A';
        let totalStock = 'N/A';
        let totalSales = 'N/A';
        let lastBackup = 'N/A';
        
        if (client) {
            const startTime = Date.now();
            
            // Run health checks in parallel
            const [
                usersResult,
                stockResult,
                salesResult,
                bizResult
            ] = await Promise.allSettled([
                client.from('users').select('id', { count: 'exact', head: true }),
                client.from('stock').select('id', { count: 'exact', head: true }),
                client.from('sales').select('id', { count: 'exact', head: true }),
                client.from('business_info').select('created_at').limit(1)
            ]);
            
            const endTime = Date.now();
            dbResponseTime = `${endTime - startTime}ms`;
            
            // Check users table
            if (usersResult.status === 'fulfilled' && !usersResult.value.error) {
                totalUsers = usersResult.value.count || 0;
            } else {
                dbStatus = 'error';
            }
            
            // Check stock table
            if (stockResult.status === 'fulfilled' && !stockResult.value.error) {
                totalStock = stockResult.value.count || 0;
            }
            
            // Check sales table
            if (salesResult.status === 'fulfilled' && !salesResult.value.error) {
                totalSales = salesResult.value.count || 0;
            }
            
            // Get setup date
            if (bizResult.status === 'fulfilled' && bizResult.value.data?.length > 0) {
                lastBackup = new Date(bizResult.value.data[0].created_at).toLocaleDateString();
            }
        } else {
            serverStatus = 'down';
            dbStatus = 'error';
        }
        
        // Calculate app data usage from localStorage
        let appDataSize = 0;
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            const value = localStorage.getItem(key);
            appDataSize += (key.length + value.length) * 2; // UTF-16 bytes
        }
        const appDataUsage = appDataSize < 1024 * 1024 
            ? `${(appDataSize / 1024).toFixed(1)} KB`
            : `${(appDataSize / (1024 * 1024)).toFixed(1)} MB`;
        
        // Calculate uptime (time since page load)
        const uptimeSeconds = Math.floor((Date.now() - (window.pageLoadTime || Date.now())) / 1000);
        const uptime = uptimeSeconds < 60 
            ? `${uptimeSeconds}s`
            : uptimeSeconds < 3600 
                ? `${Math.floor(uptimeSeconds / 60)}m ${uptimeSeconds % 60}s`
                : `${Math.floor(uptimeSeconds / 3600)}h ${Math.floor((uptimeSeconds % 3600) / 60)}m`;
        
        // Get browser info
        const memoryInfo = performance.memory || {};
        const memoryUsed = memoryInfo.usedJSHeapSize 
            ? `${(memoryInfo.usedJSHeapSize / (1024 * 1024)).toFixed(1)} MB`
            : 'N/A';
        const memoryTotal = memoryInfo.totalJSHeapSize 
            ? `${(memoryInfo.totalJSHeapSize / (1024 * 1024)).toFixed(1)} MB`
            : 'N/A';
        
        // Hide animation and show results
        content.innerHTML = `
            <div class="space-y-3">
                <h3 class="text-lg font-bold text-center mb-4">${translate('system_health') || 'System Health'}</h3>
                <ul class="space-y-2">
                    <li class="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-700 rounded">
                        <span><b>${translate('server') || 'Supabase Server'}:</b></span>
                        <span>${serverStatus === 'ok' ? '✅ ' + (translate('online') || 'Online') : '❌ ' + (translate('down') || 'Down')}</span>
                    </li>
                    <li class="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-700 rounded">
                        <span><b>${translate('database') || 'Database'}:</b></span>
                        <span>${dbStatus === 'ok' ? '✅ ' + (translate('connected') || 'Connected') : '❌ ' + (translate('error') || 'Error')}</span>
                    </li>
                    <li class="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-700 rounded">
                        <span><b>${translate('response_time') || 'Response Time'}:</b></span>
                        <span>${dbResponseTime}</span>
                    </li>
                    <li class="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-700 rounded">
                        <span><b>${translate('total_users') || 'Total Users'}:</b></span>
                        <span>${totalUsers}</span>
                    </li>
                    <li class="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-700 rounded">
                        <span><b>${translate('total_products') || 'Total Products'}:</b></span>
                        <span>${totalStock}</span>
                    </li>
                    <li class="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-700 rounded">
                        <span><b>${translate('total_sales') || 'Total Sales'}:</b></span>
                        <span>${totalSales}</span>
                    </li>
                    <li class="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-700 rounded">
                        <span><b>${translate('app_data_usage') || 'Local Storage'}:</b></span>
                        <span>${appDataUsage}</span>
                    </li>
                    <li class="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-700 rounded">
                        <span><b>${translate('memory_used') || 'Memory Used'}:</b></span>
                        <span>${memoryUsed}</span>
                    </li>
                    <li class="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-700 rounded">
                        <span><b>${translate('memory_total') || 'Memory Total'}:</b></span>
                        <span>${memoryTotal}</span>
                    </li>
                    <li class="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-700 rounded">
                        <span><b>${translate('uptime') || 'Session Uptime'}:</b></span>
                        <span>${uptime}</span>
                    </li>
                    <li class="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-700 rounded">
                        <span><b>${translate('last_backup') || 'Setup Date'}:</b></span>
                        <span>${lastBackup}</span>
                    </li>
                </ul>
            </div>
        `;
        
    } catch (e) {
        console.error('Health check error:', e);
        content.innerHTML = `
            <div class="text-center">
                <p class="text-red-600 text-lg mb-2">❌ ${translate('could_not_check_health') || 'Could not check system health.'}</p>
                <p class="text-sm text-gray-500">${e.message}</p>
                <button onclick="document.getElementById('healthBtn').click()" class="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                    ${translate('retry') || 'Retry'}
                </button>
            </div>
        `;
    }
};

// Set page load time for uptime calculation
if (!window.pageLoadTime) {
    window.pageLoadTime = Date.now();
}

function closeHealthModal() {
    document.getElementById('healthModal').classList.add('hidden');
}

async function testConnectionSpeed() {
    const start = performance.now();
    try {
        const client = getSB();
        if (!client) return null;
        
        // Simple query to test connection
        const { error } = await client
            .from('business_info')
            .select('id')
            .limit(1);
        
        const end = performance.now();
        if (!error) return end - start;
        return null;
    } catch {
        return null;
    }
}

homeOverlay.addEventListener('click', function(event) {
    const colors = ['ripple-1', 'ripple-2', 'ripple-3', 'ripple-4'];
    const randomColorClass = colors[Math.floor(Math.random() * colors.length)];
    const ripple = document.createElement('div');
    ripple.classList.add('ripple', randomColorClass);
    const size = Math.floor(Math.random() * 180) + 180;
    ripple.style.width = `${size}px`;
    ripple.style.height = `${size}px`;
    ripple.style.left = `${event.clientX - size / 2}px`;
    ripple.style.top = `${event.clientY - size / 2}px`;
    homeOverlay.appendChild(ripple);
    setTimeout(() => {
        ripple.remove();
    }, 1000);
});

document.getElementById('userDailyBtn').addEventListener('click', function() {
    const role = localStorage.getItem('currentRole') || 'administrator';
    window.location.href = 'HTML/UserGuide.html';
    window.location.href = 'HTML/UserGuide.html';});

async function initializeHomeOverlay() {
    console.log(translate('initializing_home_overlay') || "Initializing Home Overlay...");
    try {
        await loadBusinessInfo();
        await loadTasks();
        await loadStockHistory();
        await loadCreditSales(); 
        await loadExpenses();
        await loadTasks();
        updateHomeLogo();
        updateTime();
        console.log(translate('home_overlay_loaded') || "Home overlay loaded with light data only.");
    } catch (err) {
        console.error("Error initializing home overlay:", err);
    }
    
}

function cleanupMemory() {
    // Don't clear stock if we're recording a sale
    if (!window.isRecordingSale) {
        stock = [];
    }
    
    sales = [];
    stockHistory = [];
    creditSales = [];
    console.log(`✅ ${translate('memory_cleaned') || 'Memory cleaned'}`);
}




document.addEventListener("DOMContentLoaded", () => {
  const shareBtn = document.getElementById("shareBtn");
  const shareModal = document.getElementById("shareModal");
  const closeBtn = document.getElementById("closeShareModal");
  const shareQR = document.getElementById("shareQR");
  const shareLinkText = document.getElementById("shareLink");

  const stars = document.querySelectorAll("#ratingStars span");
  const ratingText = document.getElementById("ratingText");

  const SHARE_LINK = "https://apps.microsoft.com/detail/9p2chlwqg9vl?hl=fr&gl=CI&ocid=pdpshare";

  /* OPEN */
  shareBtn.addEventListener("click", () => {
    shareModal.classList.add("show");
    shareBtn.classList.add("active");
    shareLinkText.textContent = SHARE_LINK;
    shareQR.innerHTML = "";

    new QRCode(shareQR, {
      text: SHARE_LINK,
      width: 150,
      height: 150,
      correctLevel: QRCode.CorrectLevel.H
    });

    loadRating();
  });

  /* CLOSE */
  closeBtn.addEventListener("click", () => {
    shareModal.classList.remove("show");
    shareBtn.classList.remove("active");
  });

  /* RATING */
  stars.forEach(star => {
    star.addEventListener("click", () => {
      const value = star.dataset.value;
      localStorage.setItem("appRating", value);
      setRating(value);
    });
  });

  function setRating(value) {
    stars.forEach(s => {
      s.classList.toggle("active", s.dataset.value <= value);
    });
    ratingText.textContent = `You rated ${value} / 5`;
  }

  function loadRating() {
    const saved = localStorage.getItem("appRating");
    if (saved) setRating(saved);
  }
});

    const helpBtn = document.getElementById("helpBtn");
    const helpModal = document.getElementById("helpModal");
    const closeBtn = document.getElementById("closeHelpModal");
    const emailLink = document.getElementById("supportEmail");

    // OPEN HELP
    helpBtn.addEventListener("click", () => {
        helpBtn.classList.add("active");
        helpModal.classList.add("show");

        // Use your existing smart email system
        setupSmartEmailLink(
            "User Support Request",
            "The user clicked Contact Support from the Help menu.",
            "N/A",
            emailLink
        );
    });

    // CLOSE HELP
    closeBtn.addEventListener("click", () => {
        helpBtn.classList.remove("active");
        helpModal.classList.remove("show");
    });



    const supportEmail2 = document.getElementById("supportEmail2");

    // OPEN HELP
   supportEmail2.addEventListener("click", () => {
    showLoading();

        setupSmartEmailLink(
            "User Support Request",
            "the user neds support with the zero-knowledge privacy policy.",
            "N/A",
            supportEmail2
        );
      setTimeout(() => {
                       const checkInterval = setInterval(() => {
            checkCancelled();
        }, 100);
          resetCancellation();
        clearInterval(checkInterval);
        

        checkCancelled();
        
        hideLoading();
      }, 8000);//1 second delay to simulate loading
    });



    document.getElementById('itemImage').addEventListener('change', function (e) {
    const file = e.target.files[0];
    const preview = document.getElementById('itemImagePreview');
    const svgIcon = preview.previousElementSibling; // The SVG is just before the img
    const uploadLabel = this.closest('label').querySelector('span'); // Get the <span> inside the label

    if (file) {
        const reader = new FileReader();
        reader.onload = function (evt) {
            preview.src = evt.target.result;
            preview.classList.remove('hidden');
            if (svgIcon && svgIcon.tagName.toLowerCase() === 'svg') {
                svgIcon.style.display = 'none';
            }
            if (uploadLabel) {
                uploadLabel.textContent = 'Change Image';
            }
        };
        reader.readAsDataURL(file);
    } else {
        preview.src = '';
        preview.classList.add('hidden');
        if (svgIcon && svgIcon.tagName.toLowerCase() === 'svg') {
            svgIcon.style.display = '';
        }
        if (uploadLabel) {
            uploadLabel.textContent = 'Upload a file';
        }
    }
    });


    // Example usage for filter buttons (add these after your DOM loads):
    document.getElementById('applySalesFilterBtn').addEventListener('click', function() {
    showLoading();
    if (isCancelled) return;
    setTimeout(() => {
        renderSales();
                       const checkInterval = setInterval(() => {
            checkCancelled();
        }, 100);
          resetCancellation();
        clearInterval(checkInterval);
        

        checkCancelled();
        
        hideLoading();
    }, 5000); // 5 seconds
    });

    const container = document.querySelector('.bricks-asyncing');
    const colors = ['#25eb50', '#2563eb', '#eb2525'];
    let bounceCount = 0;
    let currentSet = 0;

    function updateBricks() {
    const containers = container.querySelectorAll('.brick-container');
    const bricks = container.querySelectorAll('.brick');
    bounceCount++;

    if (bounceCount >= 4) {
    bounceCount = 0;
    currentSet = (currentSet + 1) % colors.length;

    const reordered = Array.from(containers).sort(() => Math.random() - 0.5);
    reordered.forEach(el => container.appendChild(el));

    reordered.forEach((el, i) => {
    el.querySelector('.brick').style.backgroundColor = colors[(i + currentSet) % colors.length];
    });
    }
    }

    setInterval(updateBricks, 1200);

    function toggleDropdown(btn) {
    const content = btn.nextElementSibling;
    const isOpen = content && !content.hasAttribute('hidden');
    if (content) {
    if (isOpen) {
    content.setAttribute('hidden', '');
    btn.setAttribute('aria-expanded', 'false');
    } else {
    content.removeAttribute('hidden');
    btn.setAttribute('aria-expanded', 'true');
    }
    }
    }

    // Open a new page in a new tab/window
    function openNewPage(url) {
    if (typeof url === 'string' && url.trim() !== '') {
    // If running in Electron, use Electron API if available
    if (window.electronAPI && window.electronAPI.openShop) {
    window.electronAPI.openShop(url);
    } else {
    window.location.href = url;
    }
    }
    }

    // Optional: collapse dropdown when clicking outside
    document.addEventListener('click', function (e) {
    const isInside = e.target.closest('.dropdown');
    if (!isInside) {
    document.querySelectorAll('.dropdown-content').forEach((el) => el.setAttribute('hidden', ''));
    document.querySelectorAll('#openStockAppBtn').forEach((btn) =>
    btn.setAttribute('aria-expanded', 'false')
    );
    }
    });

// Enhanced password recovery with super support
document.getElementById('loginHelpLink').addEventListener('click', function(e) {
    e.preventDefault();
    
    // Check if Supabase is available
    const client = typeof getSB === 'function' ? getSB() : null;
    
    if (client) {
        // Online - can access Supabase recovery
        console.log('✅ Online - navigating to password recovery');
        window.location.href = 'HTML/recover-my-password.html';
    } else if (navigator.onLine) {
        // Online but Supabase not initialized yet - try to initialize
        console.log('⚠️ Online but Supabase not ready, retrying...');
        if (typeof getSB === 'function') {
            const retryClient = getSB();
            if (retryClient) {
                window.location.href = 'HTML/recover-my-password.html';
                return;
            }
        }
        // Still failed - show offline options
        showOfflineRecoveryOptions();
    } else {
        // Truly offline
        console.log('📡 Offline - showing offline recovery options');
        showOfflineRecoveryOptions();
    }
});




async function performDeviceBackup() {
    try {
        const client = getSB();
        if (!client) {
            console.warn('⚠️ Cannot perform backup - no database connection');
            return;
        }

        const userId = currentUser?.id || localStorage.getItem('currentUserId');
        if (!userId) {
            console.warn('⚠️ Cannot perform backup - no user ID found');
            return;
        }

        // Collect all localStorage data (excluding sensitive keys)
        const backupData = {};
        const sensitiveKeys = ['password', 'token', 'secret', 'key', 'supabase'];

        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            
            // Skip sensitive keys
            const isSensitive = sensitiveKeys.some(sensitive => 
                key.toLowerCase().includes(sensitive)
            );
            
            if (!isSensitive) {
                try {
                    const value = localStorage.getItem(key);
                    // Try to parse JSON
                    try {
                        backupData[key] = JSON.parse(value);
                    } catch {
                        backupData[key] = value;
                    }
                } catch (e) {
                    // Skip items that can't be read
                }
            }
        }

        // Add metadata
        const backupEntry = {
            user_id: userId,
            username: currentUser?.username || localStorage.getItem('currentUsername') || 'Unknown',
            data: backupData,
            device_info: {
                userAgent: navigator.userAgent,
                platform: navigator.platform,
                language: navigator.language,
                screenResolution: `${screen.width}x${screen.height}`,
                timestamp: new Date().toISOString()
            },
            created_at: new Date().toISOString()
        };

        console.log('📤 Uploading backup for user:', userId);
        console.log('📤 Backup size:', JSON.stringify(backupData).length, 'chars');

        // Check if backup already exists for this user
        const { data: existingBackup } = await client
            .from('user_backups')
            .select('id')
            .eq('user_id', userId)
            .maybeSingle();

        let result;
        if (existingBackup) {
            // Update existing backup
            const { data, error } = await client
                .from('user_backups')
                .update({
                    data: backupData,
                    device_info: backupEntry.device_info,
                    updated_at: new Date().toISOString()
                })
                .eq('user_id', userId)
                .select()
                .single();

            if (error) throw error;
            result = data;
            console.log('✅ Backup updated:', result.id);
        } else {
            // Create new backup
            const { data, error } = await client
                .from('user_backups')
                .insert([backupEntry])
                .select()
                .single();

            if (error) throw error;
            result = data;
            console.log('✅ Backup created:', result.id);
        }

        // Save backup timestamp locally
        localStorage.setItem('lastBackupTime', new Date().toISOString());
        
        return { success: true, id: result.id };

    } catch (error) {
        console.error('❌ Backup failed (non-blocking):', error.message);
        return { success: false, error: error.message };
    }
}

 



async function checkSecuritySetup(user) {
    // Check localStorage first
    const isLocallySet = localStorage.getItem('securityQuestions') === 'true';
    if (isLocallySet) {
        console.log("Security questions already set (localStorage).");
        return;
    }

    // ========== FIX: Check both camelCase and snake_case ==========
    const securityQuestions = user.securityQuestions || user.security_questions;
    const hasValidQuestions = securityQuestions && 
                              Array.isArray(securityQuestions) && 
                              securityQuestions.length >= 2 &&
                              securityQuestions[0]?.answer?.trim() &&
                              securityQuestions[1]?.answer?.trim();

    if (!hasValidQuestions) {
        console.log("Security questions not set. Opening setup modal...");
        setupSecurityQuestions(user.id || user.username);
    } else {
        console.log("Security questions already configured.");
        localStorage.setItem('securityQuestions', 'true');
    }
}



function showOfflineRecoveryOptions() {
    const modal = document.getElementById('offlineRecoveryModal');
    modal.classList.remove('hidden');

}

function setupSecurityQuestions(userId) {
    const modal = document.getElementById('securityQuestionsModal');
    if (!modal) {
        console.error('Security questions modal not found!');
        return;
    }
    
    // Pre-select first options as defaults
    const secQ1 = document.getElementById('secQ1');
    const secQ2 = document.getElementById('secQ2');
    const secA1 = document.getElementById('secA1');
    const secA2 = document.getElementById('secA2');
    
    if (secQ1) secQ1.selectedIndex = 0;
    if (secQ2) secQ2.selectedIndex = 1;
    if (secA1) secA1.value = '';
    if (secA2) secA2.value = '';
    
    modal.classList.remove('hidden');
    
    const saveBtn = document.getElementById('saveSecurityQuestionsBtn');
    if (saveBtn) {
        // Remove old listener by cloning
        const newBtn = saveBtn.cloneNode(true);
        saveBtn.parentNode.replaceChild(newBtn, saveBtn);
        
        newBtn.onclick = function() {
            saveSecurityQuestions(userId);
        };
    }
}

async function saveSecurityQuestions(userId) {
    const questions = [
        {
            question: document.getElementById('secQ1')?.value || 'What is your mother\'s maiden name?',
            answer: (document.getElementById('secA1')?.value || '').toLowerCase().trim()
        },
        {
            question: document.getElementById('secQ2')?.value || 'What was your favorite childhood book?',
            answer: (document.getElementById('secA2')?.value || '').toLowerCase().trim()
        }
    ];
    
    // Validate answers are not empty
    if (!questions[0].answer || !questions[1].answer) {
        showMessageModal(translate('answers_required') || 'Please answer both security questions.');
        return;
    }

    // Validate questions are selected
    if (!questions[0].question || !questions[1].question) {
        showMessageModal('Please select both security questions.');
        return;
    }

    // Validate minimum answer length
    if (questions[0].answer.length < 2 || questions[1].answer.length < 2) {
        showMessageModal('Answers must be at least 2 characters long.');
        return;
    }
    
    try {
        const client = getSB();
        if (!client) throw new Error('Database not connected');

        const currentBusinessId = currentUser?.business_id || businessInfo?.id || localStorage.getItem('businessId');

        console.log('🔒 Saving security questions for user:', userId);
        console.log('🔒 Questions:', questions);

        let query = client
            .from('users')
            .update({ 
                security_questions: questions,
                updated_at: new Date().toISOString()
            })
            .eq('id', userId);

        if (currentBusinessId) {
            query = query.eq('business_id', currentBusinessId);
        }

        const { error } = await query;

        if (error) {
            console.error('Supabase update error:', error);
            throw new Error(error.message);
        }
        
        // Update local user object
        if (currentUser && currentUser.id === userId) {
            currentUser.security_questions = questions;
            currentUser.securityQuestions = questions;
        }
        
        showMessageModal(translate('security_questions_saved') || 'Security questions saved successfully!');
        
        // Close modal
        const modal = document.getElementById('securityQuestionsModal');
        if (modal) modal.classList.add('hidden');
        
        // Mark as set
        localStorage.setItem('securityQuestions', 'true');
        
    } catch (error) {
        console.error('Error saving security questions:', error);
        showMessageModal(
            (translate('save_questions_error') || 'Failed to save: ') + error.message
        );
    }
}
// Offline recovery options (when server is inaccessible)

function sendSupportEmail() {
    const email = 'support@stocksalesapp.store';
    const subject = encodeURIComponent(translate('password_recovery_subject'));
    const body = encodeURIComponent(
        translate('password_recovery_body') + '\n\n' +
        translate('username_label') + `: ${localStorage.getItem('currentUsername') || translate('not_logged_in')}\n` +
        translate('device_label') + `: ${navigator.userAgent}\n` +
        translate('time_label') + `: ${new Date().toLocaleString()}`
    );
    
    window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
}

function copyAdminInfo() {
    const username = localStorage.getItem('currentUsername') || translate('your_username');
    const text = translate('admin_info_text')
        .replace('{username}', username);
    
    navigator.clipboard.writeText(text).then(() => {
        showMessageModal(translate('admin_info_copied'));
    }).catch(() => {
        showMessageModal(translate('copy_failed'));
    });
}






function logoutAndRedirect(event) {
    // Prevent immediate navigation to let storage clear completely
    event.preventDefault(); 
    
    // Clear global state variables
    window.currentUser = null;
    if (typeof currentUser !== 'undefined') {
        currentUser = null;
    }
    
        localStorage.removeItem('setup_completed');
        localStorage.removeItem('StockApp_setup');
        localStorage.removeItem('cameFromLogin');
        localStorage.removeItem('userChoseLogin');
        localStorage.removeItem('rememberedUser');
        localStorage.removeItem('userSession');
        localStorage.removeItem('currentRole');
        localStorage.removeItem('currentUsername');
        localStorage.removeItem('userSession');
        localStorage.removeItem('rememberedUser');
        localStorage.removeItem('currentUsername');
        localStorage.removeItem('currentRole');
        localStorage.removeItem('currentUserId');
    
    // Safely redirect to target page
    window.location.href = event.currentTarget.getAttribute('href');
}