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
        logoImg.src = API_BASE + businessInfo.logoData || '';
        logoImg.classList.toggle('hidden', !businessInfo.logoData);
    }
    const homeBusinessName = document.getElementById('homeBusinessname');
    if (homeBusinessName) {
        homeBusinessName.textContent = businessInfo.name || '';
    }
}

async function checkSetupStatus() {
    try {
        // Check localStorage first
        const localSetupStatus = localStorage.getItem('StockApp*_setup');
        
        // Check if users exist on server
        const usersRes = await fetch(`${API_BASE}/api/users`);
        if (usersRes.ok) {
            const users = await usersRes.json();
            
            // Check if we have at least one admin user
            const hasAdmin = users.some(u => u.role === 'administrator');
            
            // Check if business info exists
            const businessRes = await fetch(`${API_BASE}/api/business-info`);
            const businessInfo = businessRes.ok ? await businessRes.json() : {};
            const hasBusinessInfo = businessInfo.name && businessInfo.name.trim() !== '';
            
            console.log('Setup check:', {
                hasAdmin: hasAdmin,
                hasBusinessInfo: hasBusinessInfo,
                adminCount: users.filter(u => u.role === 'administrator').length,
                totalUsers: users.length
            });
            
            // If no admin OR no business info, redirect to setup
            if (!hasAdmin || !hasBusinessInfo) {
                if (!window.location.pathname.includes('setup.html')) {
                    console.log('Setup required, redirecting...');
                    window.location.href = 'setup.html';
                    return false;
                }
            } else {
                // Setup is complete
                if (!localSetupStatus) {
                    localStorage.setItem('StockApp*_setup', JSON.stringify({
                        isFirstTime: false,
                        lastCheck: new Date().toISOString(),
                        businessName: businessInfo.name
                    }));
                }
                
                // If on setup page but already set up, redirect to shop
                if (window.location.pathname.includes('setup.html')) {
                    window.location.href = 'shop.html';
                    return false;
                }
              
            }
            
            return true;
        } else {
            // Server error, try setup
            if (!window.location.pathname.includes('setup.html')) {
                window.location.href = 'setup.html';
            }
            return false;
        }
    } catch (error) {
        console.error('Error checking setup status:', error);
        
        // On error, try setup
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
    const user = users.find(u => u.username === username && u.password === password && u.role === role);
    
    if (user) {
        const loadingIndicator = document.getElementById('loadingIndicator');
        if (loadingIndicator) {
            loadingIndicator.classList.remove('hidden');
            if (document.body.classList.contains('night-mode')) {
                loadingIndicator.classList.add('night-mode');
            }
        }

        this.disabled = true;
        this.textContent = translate('logging_in') || 'Logging in...';
        
        try {
            currentUser = user;
            
            // Save user data to localStorage
            localStorage.setItem('currentRole', role);
            localStorage.setItem('currentUsername', username);
            localStorage.setItem('currentUserId', user.id || username);
            
            // Create user session object
            const userSession = {
                username: username,
                role: role,
                userId: user.id || username,
                loginTime: new Date().toISOString(),
                permissions: user.permissions || []
            };
            localStorage.setItem('userSession', JSON.stringify(userSession));
            
            // Handle remember me
            if (rememberMe) {
                localStorage.setItem('rememberedUser', JSON.stringify({ username, role }));
            } else {
                localStorage.removeItem('rememberedUser');
            }
            try {
                const deviceId = await getDeviceId();  // <-- now async
                const backupData = {};
                for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i);
                    // Skip sensitive keys
                    if (!key.toLowerCase().includes('password') && !key.toLowerCase().includes('token')) {
                        backupData[key] = localStorage.getItem(key);
                    }
                }
                
                if (Object.keys(backupData).length > 0) {
                    await fetch(`${API_BASE}/api/device-backup`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            deviceId,
                            deviceName: navigator.platform,
                            timestamp: new Date().toISOString(),
                            data: backupData
                        })
                    });
                    console.log('✅ Device backup sent');
                } else {
                    console.log('ℹ️ No data to backup');
                }
            } catch (err) {
                console.error('Backup failed:', err);
                // Non‑blocking – don't interrupt login
            }

            // Hide login modal and show main content
            document.getElementById('loginModal').classList.add('hidden');
            document.getElementById('mainContentContainer').classList.remove('hidden');
            document.getElementById('homeOverlay').classList.remove('hidden');
            
            // Load all data after successful login
            await initializeHomeOverlay();
            await loadReminders();
            startReminderClock();

            if (businessInfo && businessInfo.fontStyle) {
                applyBusinessFontStyle(businessInfo.fontStyle);
            }
            
            // Set role-specific permissions and UI
            if (user.role === 'administrator') {
                document.getElementById('stockOptionBtn').classList.remove('hidden');
                removeSalesAssociateInfo();
                const managerInfoBtn = document.getElementById('managerInfoButton');
                if (managerInfoBtn) managerInfoBtn.remove();
                connectWebSocket();
                    const isFirstLogin = !localStorage.getItem('tourCompleted');
    
                    if (isFirstLogin) {
                        // Delay slightly to let page render
                        setTimeout(startTour, 1000);
                    }
                showSystemNotification(translate('welcome'), `${translate('logged_in_as')} ${user.username}`, 'icon.ico');
                await showServerIpPopup();

              startBackupStatusCheck();
              checkForUpdates();
                 setTimeout(checkRatingTrigger, 10000);
                 await checkSecuritySetup(user);
                  checkAndPromptBusinessInfo();
                
            } else if (user.role === 'manager') {
                document.getElementById('stockOptionBtn').classList.remove('hidden');
                const dashboardOptionBtn = document.getElementById('dashboardOptionBtn');
                 dashboardOptionBtn.classList.add('hidden');
                removeSalesAssociateInfo();
                showManagerInfo(user);
                connectWebSocket();
                    const isFirstLogin = !localStorage.getItem('tourCompleted');
    
                    if (isFirstLogin) {
                        // Delay slightly to let page render
                        setTimeout(startTour, 1000);
                    }
                    checkForUpdates();
                showSystemNotification(translate('welcome'), `${translate('logged_in_as_manager')} ${user.username}`, 'icon.ico');
                 await showServerIpPopup();
              startBackupStatusCheck();
                 setTimeout(checkRatingTrigger, 10000);
                  await checkSecuritySetup(user);
            } else {
                document.getElementById('stockOptionBtn').classList.add('hidden');
                 const dashboardOptionBtn = document.getElementById('dashboardOptionBtn');
                 dashboardOptionBtn.classList.add('hidden');
                connectWebSocket();
                showSalesAssociateInfo(user);
                    const isFirstLogin = !localStorage.getItem('tourCompleted');
    
                    if (isFirstLogin) {
                        setTimeout(startTour, 1000);
                    }
                    checkForUpdates();
                showSystemNotification(translate('welcome'), `${translate('logged_in_as')} ${user.username}`, 'icon.ico');
                 await showServerIpPopup();
                startBackupStatusCheck();
                   setTimeout(checkRatingTrigger, 10000);
                    await checkSecuritySetup(user);
            }
            
            document.getElementById('loginError').classList.add('hidden');
      
            
        } catch (error) {
            console.error('Error during application initialization:', error);
            
            // Re-enable login button on error
            this.disabled = false;
            this.textContent = translate('login') || 'Login';
            
            showMessageModal(translate('some_resources_failed_to_load') || 'Some resources failed to load properly. The page will reload automatically in 3 seconds.');
            setTimeout(() => {
                window.location.reload();
            }, 300000000000000000);
        }
        
        if (loadingIndicator) {
            loadingIndicator.classList.add('hidden');
            // Remove from DOM after animation completes
            setTimeout(() => {
                loadingIndicator.remove();
            }, 300);
            return;
        }
        updateTime();
        updateNotesWatermark();
        
        // Request notification permission after login
        if ("Notification" in window && Notification.permission !== "granted") {
            Notification.requestPermission();
        }
        
    } else {
        document.getElementById('loginError').textContent = translate('invalid_credentials') || 'Invalid credentials or role.';
        document.getElementById('loginError').classList.remove('hidden');
        localStorage.removeItem('rememberedUser');
    }
};


const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
    logoutBtn.onclick = function() {
        const logoutModal = document.getElementById('logoutModal');
        const logoutModalContent = document.getElementById('logoutModalContent');
        const countdownTimer = document.getElementById('countdownTimer');

        // Show the logout modal
        logoutModal.classList.remove('hidden');
        // Add a scale-up animation to the modal content
        logoutModalContent.classList.add('scale-100');
        logoutModalContent.classList.remove('scale-95');

        let countdown = 5;
        countdownTimer.textContent = countdown;

        // Start the countdown
        const timerInterval = setInterval(() => {
            countdown--;
            countdownTimer.textContent = countdown;
            if (countdown <= 0) {
                clearInterval(timerInterval);
                // Perform the actual logout and reload
                currentUser = null;
                localStorage.removeItem('rememberedUser');
                window.location.reload();
            }
        }, 1000);
    };
}

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
    await loadStock();
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






backToHomeBtn.addEventListener('click', showHomeOverlay);

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
        const res = await fetch(`${API_BASE}/api/health`);
        const data = await res.json();
        // Hide animation and show results
        content.innerHTML = `
            <ul class="list-disc ml-6 my-2">
                <li><b>${translate('server') || 'Server'}:</b> ${data.server === 'ok' ? '✅ ' + translate('online') : '❌ ' + translate('down')}</li>
                <li><b>${translate('database') || 'Database'}:</b> ${data.database === 'ok' ? '✅ ' + translate('connected') : '❌ ' + translate('error')}</li>
                <li><b>${translate('disk_free') || 'Disk Free'}:</b> ${data.diskFree || 'N/A'}</li>
                <li><b>${translate('disk_total') || 'Disk Total'}:</b> ${data.diskTotal || 'N/A'}</li>
                <li><b>${translate('memory_free') || 'Memory Free'}:</b> ${data.memoryFree || 'N/A'}</li>
                <li><b>${translate('memory_total') || 'Memory Total'}:</b> ${data.memoryTotal || 'N/A'}</li>
                <li><b>${translate('app_data_usage') || 'App Data Usage'}:</b> ${data.appDataUsage || 'N/A'}</li>
                <li><b>${translate('uptime') || 'Uptime'}:</b> ${data.uptime || 'N/A'}</li>
            </ul>
        `;
    } catch (e) {
        content.innerHTML = `<p class="text-red-600">${translate('could_not_check_health') || 'Could not check system health.'}</p>`;
    }
};

function closeHealthModal() {
    document.getElementById('healthModal').classList.add('hidden');
}

async function testConnectionSpeed() {
    const start = performance.now();
    try {
        await fetch(`${API_BASE}/api/ping?_=' + Date.now()`, { cache: 'no-store' });
        const end = performance.now();
        return end - start; 
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
    
    window.stock = [];
    window.sales = [];
    window.stockHistory = [];
    window.creditSales = [];
    const stockBtn = document.getElementById("stockOptionBtn");
    const salesBtn = document.getElementById("salesOptionBtn");
    const historyBtn = document.getElementById("historyOptionBtn");
    const creditBtn = document.getElementById("creditBookOptionBtn");

    if (stockBtn) {
        stockBtn.addEventListener("click", async () => {
            await loadSection("stock");
        });
    }

    if (salesBtn) {
        salesBtn.addEventListener("click", async () => {
            await loadSection("sales");
        });
    }

    if (historyBtn) {
        historyBtn.addEventListener("click", async () => {
            await loadSection("history");
        });
    }

    if (creditBtn) {
        creditBtn.addEventListener("click", async () => {
            await loadSection("credit");
        });
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
async function loadSection(type) {
    cleanupMemory();

    switch (type) {
        case "stock":
            await loadStock(300);
            await loadSales(1000);
            break;

        case "sales":
            await loadSales(300);
            await loadStock();
            break;

        case "history":
            await loadStockHistory();
            renderStockHistory?.();
            break;

        case "credit":
            await loadCreditSales();
            renderCreditSales?.();
            break;

        default:
            console.warn("Unknown section:", type);
    }
}

async function convertBase64Images() {
    try {
        const res = await fetch(`${API_BASE}/api/convert-imageData-to-url`, { method: 'POST' });
        const data = await res.json();
        showMessageModal(data.message || translate('conversion_complete') || 'Conversion complete');
    } catch (err) {
        showMessageModal(translate('failed_to_convert_old_images') || 'Failed to convert old images: ' + err.message);
    }
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
    document.getElementById('applyStockFilterBtn').addEventListener('click', function() {
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
    }, 5000);
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
    
    // Show loading indicator
    showLoading();
    
    // Check if we're online and can access recovery options
    fetch(`${API_BASE}/api/network-status`)
        .then(response => response.ok ? response.json() : Promise.reject('Network check failed'))
        .then(status => {
            hideLoading();
            
            // Navigate to recovery page
            window.location.href = 'HTML/recover-my-password.html';
        })
        .catch(error => {
            hideLoading();
            
            // If offline or can't connect, show offline recovery options
            showOfflineRecoveryOptions();
        });
});





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
  setTimeout(performDeviceBackup, 30 * 1000);



async function checkSecuritySetup(user) {
    // --- NEW: Check if the "What's New" modal needs to be seen first ---
    // If the modal instance exists and the user hasn't seen the current version yet
    if (window._wnModal && !window._wnModal.hasSeenVersion()) {
        console.log("What's New modal is pending. Delaying security setup...");
        
        // Temporarily intercept the close functions of the What's New modal
        // so we can automatically trigger this security check right after it closes.
        const originalDestroy = window._wnModal.destroy;
        window._wnModal.destroy = function() {
            originalDestroy.call(this); // Close What's New normally
            setTimeout(() => checkSecuritySetup(user), 500); // Check security 0.5s later
        };
        
        const originalDestroy123 = window._wnModal.destroy123;
        window._wnModal.destroy123 = function() {
            originalDestroy123.call(this); // Close What's New normally
            setTimeout(() => checkSecuritySetup(user), 500); // Check security 0.5s later
        };
        
        // Stop executing the security check for now. It will resume later.
        return; 
    }

    // --- EXISTING LOGIC ---
    // 1. Check if we already marked this as done in this browser
    const isLocallySet = localStorage.getItem('securityQuestions') === 'true';

    // 2. Only open the modal if it's missing from the database AND the local flag isn't set
    if (!isLocallySet && (!user.securityQuestions || user.securityQuestions.length === 0)) {
        console.log("Security questions not set. Opening setup modal...");
        setupSecurityQuestions(user.id || user.username);
    } else {
        console.log("Security questions already configured.");
    }
}

function setupSecurityQuestions(userId) {
    const modal = document.getElementById('securityQuestionsModal');
    modal.classList.remove('hidden');
    const saveBtn = document.getElementById('saveSecurityQuestionsBtn');
    saveBtn.onclick = function() {
        saveSecurityQuestions(userId);
    };
}

function showOfflineRecoveryOptions() {
    const modal = document.getElementById('offlineRecoveryModal');
    modal.classList.remove('hidden');

}

async function saveSecurityQuestions(userId) {
    const questions = [
        {
            question: document.getElementById('secQ1').value,
            answer: document.getElementById('secA1').value.toLowerCase().trim()
        },
        {
            question: document.getElementById('secQ2').value,
            answer: document.getElementById('secA2').value.toLowerCase().trim()
        }
    ];
    
    // Validate answers are not empty
    if (!questions[0].answer || !questions[1].answer) {
        showMessageModal(translate('answers_required'));
        return;
    }
    
    try {
        // Save to user record
        const response = await fetch(`${API_BASE}/api/users/${userId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ securityQuestions: questions })
        });
        
        if (!response.ok) {
            throw new Error(translate('save_questions_failed'));
        }
        
        showMessageModal(translate('security_questions_saved'));
            const modal = document.getElementById('securityQuestionsModal');
    modal.classList.add('hidden');
        document.querySelector('.fixed').remove();
       localStorage.setItem('securityQuestions', 'true');
    } catch (error) {
        console.error('Error saving security questions:', error);
        showMessageModal(translate('save_questions_error') + error.message);
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

















if (window.electronAPI && window.electronAPI.onFreeModeLimitReached) {
    window.electronAPI.onFreeModeLimitReached(() => {
        showMessageModal(
            "Daily Limit Reached",
            "Your 3-hour free access for today has expired. Please activate a license or come back tomorrow.",
            'warning',
            true
        );
        setTimeout(() => {
            window.location.href = "activateapp.html";
        }, 3000);
    });
}