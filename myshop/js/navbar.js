// Sidebar Component - Injects a responsive left sidebar navigation
(function() {
    'use strict';

    // Global variable to track current open modal (for back button)
    window.currentModalId = window.currentModalId || null;
    window._logoutTimer = null;

    // Safe fixImagePath function that doesn't break if the original isn't available
    function safeFixImagePath(path) {
        if (!path) return '';
        if (path.startsWith('http')) return path;
        if (path.startsWith('data:')) return path;
        
        // Supabase storage paths - convert to full URL
        const SUPABASE_STORAGE_URL = 'https://zexxdoxuzvkovszfqcio.supabase.co/storage/v1/object/public';
        
        // If it's a Supabase storage path (logos/, photos/, images/, public/)
        if (path.includes('logos/') || path.includes('photos/') || path.includes('images/') || path.includes('public/')) {
            return `${SUPABASE_STORAGE_URL}/${path}`;
        }
        
        // Local asset - return as-is
        return path;
    }

    // ========== MODAL HISTORY HELPERS ==========
    
    /**
     * Show modal with history state for Android back button
     */
    function showModalWithHistory(modalId) {
        const modal = document.getElementById(modalId);
        if (!modal) return false;
        
        // Add history state for back button
        window.history.pushState({ modal: modalId }, '', window.location.href);
        
        // Show the modal
        modal.classList.remove('hidden');
        
        // Handle scale classes if they exist
        const content = modal.querySelector('.scale-95, .scale-100');
        if (content) {
            content.classList.remove('scale-95');
            content.classList.add('scale-100');
        }
        
        // Track which modal is open
        window.currentModalId = modalId;
        
        // Prevent body scroll
        document.body.style.overflow = 'hidden';
        
        return true;
    }

    /**
     * Hide modal with history cleanup
     */
    function hideModalWithHistory(modalId, isFromBackButton = false) {
        const modal = document.getElementById(modalId);
        if (!modal) return false;
        
        // Hide the modal
        modal.classList.add('hidden');
        
        // Handle scale classes if they exist
        const content = modal.querySelector('.scale-100');
        if (content) {
            content.classList.remove('scale-100');
            content.classList.add('scale-95');
        }
        
        // Restore body scroll
        document.body.style.overflow = '';
        
        // Update history if not from back button
        if (!isFromBackButton && window.currentModalId === modalId) {
            window.history.pushState({ modal: null }, '', window.location.href);
            window.currentModalId = null;
        } else if (isFromBackButton) {
            window.currentModalId = null;
        }
        
        return true;
    }

    /**
     * Close current modal (generic)
     */
    function closeCurrentModal() {
        if (window.currentModalId) {
            const modal = document.getElementById(window.currentModalId);
            if (modal && !modal.classList.contains('hidden')) {
                hideModalWithHistory(window.currentModalId);
            }
        }
    }

    /**
     * Navigate app views using history state
     */
    function navigateToView(viewName) {
        const dashboardContainer = document.getElementById('main-dashboard-container');
        const dashcontainer = document.getElementById('dashcontainer');
        const stockManagementSection = document.getElementById('stockManagementSection');
        const salesManagementSection = document.getElementById('salesManagementSection');
        const stockOptionsModal = document.getElementById('stockOptionsModal');
        const salesOptionsModal = document.getElementById('salesOptionsModal');

        if (viewName === 'stock') {
            if (stockOptionsModal) stockOptionsModal.classList.remove('hidden');
            if (salesOptionsModal) salesOptionsModal.classList.add('hidden');
            if (stockManagementSection) stockManagementSection.classList.remove('hidden');
            if (salesManagementSection) salesManagementSection.classList.add('hidden');
            if (dashboardContainer) { dashboardContainer.classList.add('nosee'); dashboardContainer.classList.remove('see'); }
            if (dashcontainer) dashcontainer.classList.add('hidden');
            if (typeof hideHomeOverlay === 'function') hideHomeOverlay();
            document.title = "StockApp* -> Let's take a look at the shop inventory items";
        } else if (viewName === 'sales') {
            if (stockOptionsModal) stockOptionsModal.classList.add('hidden');
            if (salesOptionsModal) salesOptionsModal.classList.remove('hidden');
            if (stockManagementSection) stockManagementSection.classList.add('hidden');
            if (salesManagementSection) salesManagementSection.classList.remove('hidden');
            if (dashboardContainer) { dashboardContainer.classList.add('nosee'); dashboardContainer.classList.remove('see'); }
            if (dashcontainer) dashcontainer.classList.add('hidden');
            if (typeof hideHomeOverlay === 'function') hideHomeOverlay();
            document.title = "StockApp* -> Sales Registry";
        } else {
            if (stockOptionsModal) stockOptionsModal.classList.add('hidden');
            if (salesOptionsModal) salesOptionsModal.classList.add('hidden');
            if (stockManagementSection) stockManagementSection.classList.add('hidden');
            if (salesManagementSection) salesManagementSection.classList.add('hidden');
            if (dashboardContainer) { dashboardContainer.classList.remove('nosee'); dashboardContainer.classList.add('see'); }
            if (dashcontainer) dashcontainer.classList.remove('hidden');
            if (typeof showHomeOverlay === 'function') showHomeOverlay();
            document.title = "StockApp*";
        }
    }

    function initializeAppHistoryState() {
        const currentState = window.history.state;
        if (!currentState || currentState.view !== 'dashboard') {
            window.history.replaceState({ view: 'dashboard' }, '', window.location.href);
        }
    }

    window.navigateToView = navigateToView;
    window.initializeAppHistoryState = initializeAppHistoryState;

    /**
     * Setup global back button handler for all modals
     */
    function setupGlobalBackButtonHandler() {
        if (window._backButtonHandlerSetup) return;
        window._backButtonHandlerSetup = true;
        
        window.addEventListener('popstate', function(event) {
            // Check if any modal is open
            if (window.currentModalId) {
                const modal = document.getElementById(window.currentModalId);
                if (modal && !modal.classList.contains('hidden')) {
                    // Close the modal based on type
                    if (window.currentModalId === 'logoutModal') {
                        // Cancel logout timer and close modal
                        if (window._logoutTimer) {
                            clearInterval(window._logoutTimer);
                            window._logoutTimer = null;
                        }
                        hideModalWithHistory(window.currentModalId, true);
                    } else if (window.currentModalId === 'imageZoomModal' && typeof closeImageZoom === 'function') {
                        closeImageZoom(true);
                    } else if (window.currentModalId === 'businessSettingsModal' && typeof closeBusinessSettingsModal === 'function') {
                        closeBusinessSettingsModal(true);
                    } else if (window.currentModalId === 'adminProfileModal' && typeof closeAdminProfileModal === 'function') {
                        closeAdminProfileModal(true);
                    } else {
                        hideModalWithHistory(window.currentModalId, true);
                    }
                    event.preventDefault();
                    return;
                }
            }
            // No modal open, handle app view navigation if state exists
            const view = event.state && event.state.view ? event.state.view : 'dashboard';
            if (view) {
                navigateToView(view);
                event.preventDefault();
                return;
            }
        });
    }

    // Sidebar configuration
    const sidebarConfig = {
        appName: 'StockSalesApp',
        logo: 'image/logo.jpg',
        items: [
            { label: 'Home', href: '#', icon: 'fas fa-home', translate: 'home' },
            { label: 'Dashboard', href: '#', icon: 'fas fa-chart-line', translate: 'dashboard' },
            { label: 'Shop', href: '#', icon: 'fas fa-store', translate: 'salesManagement' },
            { label: 'Inventory', href: '#', icon: 'fas fa-box', translate: 'stockManagement', notificationDot: true },
            { label: 'My Customers', href: '#', icon: 'fas fa-users', translate: 'mycustomers' },
            { label: 'Settings', href: '#', icon: 'fas fa-cog', translate: 'settings_button' },
            { label: 'MY Reminders', href: '#', icon: 'fas fa-bell', translate: 'Reminders' } 
        ]
    };

    /**
     * Initialize sidebar and inject into page
     */
    function initSidebar() {
        if (document.getElementById('sidebar-container')) {
            return;
        }

        const sidebarContainer = createSidebarHTML();
        document.body.insertBefore(sidebarContainer, document.body.firstChild);
        setupEventListeners();
        adjustBodyPadding();
        setupGlobalBackButtonHandler();
        initializeAppHistoryState();
    }

    /**
     * Create sidebar HTML structure
     */
    function createSidebarHTML() {
        const container = document.createElement('div');
        container.id = 'sidebar-container';
        container.className = 'sidebar-wrapper';

        container.innerHTML = `
            <div class="sidebar-overlay" id="sidebar-overlay"></div>
            <aside class="sidebar-main" id="sidebar-main">
                <div class="sidebar-header">
                    <a class="sidebar-brand">
                        <img id="homeBusinessLogo" src="image/logo.jpg" alt="${sidebarConfig.logo}" class="sidebar-logo" onerror="this.src='image/logo.jpg'">
                        <span id="homeBusinessname" class="sidebar-app-name" data-translate="app_name"></span>
                    </a>
                </div>
                <nav class="sidebar-nav">
                    <ul class="nav-list">
                        ${sidebarConfig.items.map((item, index) => `
                            <li class="nav-item">
                                <a href="${item.href}" class="nav-link" data-nav-item="${index}">
                                    <i class="${item.icon}"></i>
                                    <span class="nav-label" data-translate="${item.translate}">${item.label}</span>
                                    ${item.notificationDot ? '<span class="notification-dot"></span>' : ''}
                                </a>
                            </li>
                        `).join('')}
                    </ul>
                </nav>
                <a href="pricing.html" class="nav-link" id="plan-badge-link">
                    <i class="fas fa-crown"></i>
                    <span id="current-plan-badge">Loading...</span>
                </a>
                <div class="sidebar-footer">
                    <div class="user-section" id="sidebar-user-section">
                        <div class="user-avatar" id="sidebar-user-avatar">
                            <i class="fas fa-user"></i>
                        </div>
                        <div class="user-info">
                            <div class="user-name" id="sidebar-user-name">User</div>
                            <div class="user-role" id="sidebar-user-role">Active</div>
                        </div>
                    </div>
                    <button id="sidebar-logout-btn" class="sidebar-logout-btn" type="button" title="Logout" data-translate-title="logout">
                        <i class="fas fa-sign-out-alt"></i>
                        <span class="logout-label" data-translate="logout">Logout</span>
                    </button>
                </div>
            </aside>
            <button class="sidebar-toggle" id="sidebar-toggle" aria-label="Toggle sidebar" data-translate-aria-label="toggle_sidebar">
                <i class="fas fa-bars"></i>
            </button>
        `;

        return container;
    }

    /**
     * Update plan badge from business_info (not licenses table)
     */
    async function updatePlanBadgeFromBusinessInfo() {
        const planBadge = document.getElementById('current-plan-badge');
        if (!planBadge) return;

        // First check localStorage for cached license info
        let licensePlan = localStorage.getItem('licensePlan');
        let licenseStatus = localStorage.getItem('licenseStatus');
        let licenseExpires = localStorage.getItem('licenseExpires');

        // If we have cached data, use it immediately
        if (licensePlan && licenseStatus) {
            updateBadgeDisplay(planBadge, licensePlan, licenseStatus, licenseExpires);
        }

        // Then try to get fresh data from Supabase business_info
        const client = getSB ? getSB() : null;
        const businessId = localStorage.getItem('businessId');
        
        if (client && businessId) {
            try {
                // Query business_info table directly (licenses table is DEPRECATED)
                const { data: bizInfo, error } = await client
                    .from('business_info')
                    .select('license_plan, license_status, license_expires_at')
                    .eq('id', businessId)
                    .maybeSingle();

                if (!error && bizInfo) {
                    // Update localStorage with fresh data
                    localStorage.setItem('licensePlan', bizInfo.license_plan || 'trial');
                    localStorage.setItem('licenseStatus', bizInfo.license_status || 'trial');
                    if (bizInfo.license_expires_at) {
                        localStorage.setItem('licenseExpires', bizInfo.license_expires_at);
                    }
                    
                    // Update badge display
                    updateBadgeDisplay(planBadge, bizInfo.license_plan, bizInfo.license_status, bizInfo.license_expires_at);
                } else if (error) {
                    console.warn('Error fetching license from business_info:', error);
                    // Fallback to localStorage if already displayed
                    if (!licensePlan) {
                        planBadge.textContent = 'Free Trial';
                        planBadge.style.color = '#f59e0b';
                    }
                }
            } catch (err) {
                console.error('Failed to fetch business_info license:', err);
            }
        } else if (!licensePlan) {
            // No license info available
            planBadge.textContent = 'Free Trial';
            planBadge.style.color = '#f59e0b';
        }
    }

    /**
     * Update badge display with plan and status
     */
    function updateBadgeDisplay(badgeElement, plan, status, expiresAt) {
        if (!badgeElement) return;
        
        const planColors = {
            starter: '#10b981',
            professional: '#3b82f6',
            business: '#8b5cf6',
            trial: '#f59e0b'
        };
        
        const planNames = {
            starter: 'Starter',
            professional: 'Pro',
            business: 'Business',
            trial: 'Trial'
        };
        
        const displayPlan = planNames[plan] || (plan ? plan.charAt(0).toUpperCase() + plan.slice(1) : 'Trial');
        const color = planColors[plan] || planColors.trial;
        
        if (status === 'trial' || status === 'trialing') {
            let daysLeft = 7; // Default trial days
            if (expiresAt) {
                try {
                    const expiryDate = new Date(expiresAt);
                    const now = new Date();
                    daysLeft = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));
                    daysLeft = Math.max(0, daysLeft);
                } catch(e) {
                    console.warn('Failed to parse expiry date:', e);
                }
            }
            badgeElement.textContent = `Trial (${daysLeft}d left)`;
            badgeElement.style.color = planColors.trial;
        } else if (status === 'active') {
            badgeElement.textContent = displayPlan;
            badgeElement.style.color = color;
        } else if (status === 'expired') {
            badgeElement.textContent = 'Expired';
            badgeElement.style.color = '#ef4444';
        } else if (status === 'inactive') {
            badgeElement.textContent = 'Inactive';
            badgeElement.style.color = '#6b7280';
        } else {
            badgeElement.textContent = displayPlan;
            badgeElement.style.color = color;
        }
    }

    /**
     * Setup event listeners for sidebar interactions
     */
    function setupEventListeners() {
        const sidebarToggle = document.getElementById('sidebar-toggle');
        const sidebarOverlay = document.getElementById('sidebar-overlay');
        const sidebar = document.getElementById('sidebar-main');
        const navLinks = document.querySelectorAll('.nav-link');

        const functionMapping = {
            0: () => { if (typeof showHomeOverlay === 'function') showHomeOverlay(); },
            1: () => { if (typeof showDashboard === 'function') showDashboard(); },
            2: () => { if (typeof showSalesManagement === 'function') showSalesManagement(); },
            3: () => { if (typeof showStockManagement === 'function') showStockManagement(); },
            4: () => { if (typeof openCustomerSearchModal === 'function') openCustomerSearchModal(); },
            5: () => { if (typeof handleSettingsClick === 'function') handleSettingsClick(); },
            6: () => { if (typeof showReminderListPanel === 'function') openReminderList(); }
        };
        
        if (sidebarToggle) {
            sidebarToggle.addEventListener('click', function(e) {
                e.stopPropagation();
                sidebar.classList.toggle('active');
                sidebarOverlay.classList.toggle('active');
                sidebarToggle.classList.toggle('active');
            });
        }

        if (sidebarOverlay) {
            sidebarOverlay.addEventListener('click', function() {
                sidebar.classList.remove('active');
                sidebarOverlay.classList.remove('active');
                if (sidebarToggle) sidebarToggle.classList.remove('active');
            });
        }

        navLinks.forEach(link => {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                const itemIndex = parseInt(this.getAttribute('data-nav-item'));
                if (functionMapping[itemIndex]) {
                    functionMapping[itemIndex]();
                } else {
                    const href = this.getAttribute('href');
                    if (href && !href.startsWith('#')) window.location.href = href;
                }
                if (window.innerWidth <= 768) {
                    sidebar.classList.remove('active');
                    sidebarOverlay.classList.remove('active');
                    if (sidebarToggle) sidebarToggle.classList.remove('active');
                }
            });
        });

        document.addEventListener('click', function(e) {
            if (sidebar && sidebarToggle && sidebarOverlay) {
                const isClickInside = sidebar.contains(e.target) || 
                                     sidebarToggle.contains(e.target) || 
                                     sidebarOverlay.contains(e.target);
                if (!isClickInside && sidebar.classList.contains('active')) {
                    sidebar.classList.remove('active');
                    sidebarOverlay.classList.remove('active');
                    sidebarToggle.classList.remove('active');
                }
            }
        });

        // Setup logout button with history support
        const logoutBtn = document.getElementById('sidebar-logout-btn');
        if (logoutBtn) {
            setupLogoutWithHistory(logoutBtn);
        }

        setupUserSectionClickHandler();
        updateUserDisplay();
        
        // Update plan badge from business_info
        updatePlanBadgeFromBusinessInfo();
        
        // Also listen for visibility change to refresh badge when tab becomes active
        document.addEventListener('visibilitychange', function() {
            if (!document.hidden) {
                updatePlanBadgeFromBusinessInfo();
            }
        });
    }

    /**
     * Setup logout button with modal history support
     */
    function setupLogoutWithHistory(logoutBtn) {
        logoutBtn.onclick = function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            // Check if logout modal exists, if not create it
            let logoutModal = document.getElementById('logoutModal');
            if (!logoutModal) {
                logoutModal = createLogoutModal();
                document.body.appendChild(logoutModal);
            }
            
            const logoutModalContent = document.getElementById('logoutModalContent');
            const countdownTimer = document.getElementById('countdownTimer');

            // Show the logout modal with history state
            showModalWithHistory('logoutModal');

            let countdown = 5;
            if (countdownTimer) countdownTimer.textContent = countdown;

            // Clear any existing timer
            if (window._logoutTimer) clearInterval(window._logoutTimer);
            
            // Start the countdown
            window._logoutTimer = setInterval(() => {
                countdown--;
                if (countdownTimer) countdownTimer.textContent = countdown;
                if (countdown <= 0) {
                    clearInterval(window._logoutTimer);
                    window._logoutTimer = null;
                    // Perform the actual logout and reload
                    window.currentUser = null;
                    if (typeof currentUser !== 'undefined') window.currentUser = null;
                    localStorage.removeItem('rememberedUser');
                    localStorage.removeItem('userSession');
                    localStorage.removeItem('currentRole');
                    localStorage.removeItem('currentUsername');
                    localStorage.removeItem('currentUserId');
                    localStorage.removeItem('licensePlan');
                    localStorage.removeItem('licenseStatus');
                    localStorage.removeItem('licenseExpires');
                    localStorage.removeItem('licenseDaysLeft');
                    window.location.reload();
                }
            }, 1000);
        };
    }

    /**
     * Helper function to create logout modal if it doesn't exist
     */
    function createLogoutModal() {
        const modal = document.createElement('div');
        modal.id = 'logoutModal';
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 hidden';
        modal.innerHTML = `
            <div id="logoutModalContent" class="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-sm w-full mx-4 transform transition-all scale-95">
                <div class="text-center relative">
                    <button id="closeLogoutBtn" class="absolute top-0 right-0 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                        <i class="fas fa-times"></i>
                    </button>
                    <div class="w-16 h-16 mx-auto mb-4 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center">
                        <i class="fas fa-sign-out-alt text-2xl text-red-500"></i>
                    </div>
                    <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">Logging Out</h3>
                    <p class="text-gray-600 dark:text-gray-300 mb-4">You will be logged out in <span id="countdownTimer" class="font-bold text-red-500">5</span> seconds</p>
                    <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-4">
                        <div class="bg-red-500 h-2 rounded-full animate-pulse" style="width: 100%"></div>
                    </div>
                    <p class="text-xs text-gray-500 dark:text-gray-400">Press back button or click X to cancel</p>
                </div>
            </div>
        `;
        
        // Add close button functionality after DOM is ready
        setTimeout(() => {
            const closeBtn = document.getElementById('closeLogoutBtn');
            if (closeBtn) {
                closeBtn.onclick = function() {
                    if (window._logoutTimer) {
                        clearInterval(window._logoutTimer);
                        window._logoutTimer = null;
                    }
                    hideModalWithHistory('logoutModal');
                };
            }
        }, 0);
        
        return modal;
    }

    function setupUserSectionClickHandler() {
        const userSection = document.getElementById('sidebar-user-section');
        const sidebar = document.getElementById('sidebar-main');
        const sidebarOverlay = document.getElementById('sidebar-overlay');
        const sidebarToggle = document.getElementById('sidebar-toggle');

        if (userSection) {
            userSection.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                
                if (typeof window.onProfileInfoClick === 'function') {
                    window.onProfileInfoClick();
                } else {
                    handleProfileClick();
                }
                
                if (window.innerWidth <= 768 && sidebar) {
                    sidebar.classList.remove('active');
                    if (sidebarOverlay) sidebarOverlay.classList.remove('active');
                    if (sidebarToggle) sidebarToggle.classList.remove('active');
                }
            });
            userSection.style.cursor = 'pointer';
        }
    }

    function handleProfileClick() {
        if (!window.currentUser) {
            if (typeof showMessageModal === 'function') showMessageModal('Please log in first.');
            return;
        }
        
        const role = window.currentUser.role;
        const user = window.currentUser;
        
        removeExistingFloatingCards();
        
        switch(role) {
            case 'administrator':
                if (typeof window.showAdminProfileModal === 'function') {
                    window.showAdminProfileModal(user.username);
                } else if (typeof showAdminProfileModal === 'function') {
                    showAdminProfileModal(user.username);
                }
                break;
            case 'manager':
                if (typeof showManagerInfo === 'function') showManagerInfo(user);
                break;
            case 'sales':
                if (typeof showSalesAssociateInfo === 'function') showSalesAssociateInfo(user);
                break;
            default:
                console.warn('Unknown user role:', role);
        }
    }

    function removeExistingFloatingCards() {
        if (typeof removeSalesAssociateInfo === 'function') removeSalesAssociateInfo();
        const existingManagerInfo = document.getElementById('managerInfoButton');
        if (existingManagerInfo) existingManagerInfo.remove();
        const salesAssociateInfo = document.getElementById('salesAssociateInfo');
        if (salesAssociateInfo) salesAssociateInfo.remove();
    }

    function updateUserDisplay() {
        const userNameEl = document.getElementById('sidebar-user-name');
        const userAvatarEl = document.getElementById('sidebar-user-avatar');
        
        if (!userNameEl) return;

        let userName = 'User';
        let userPhoto = null;
        let userRole = '';
        
        if (window.currentUser && window.currentUser.username) {
            userName = window.currentUser.username;
            userRole = window.currentUser.role || '';
            userPhoto = window.currentUser.photo || window.currentUser.avatar || null;
        } else if (localStorage.getItem('userSession')) {
            try {
                const userSession = JSON.parse(localStorage.getItem('userSession'));
                userName = userSession.username || 'User';
                userRole = userSession.role || '';
                userPhoto = userSession.photo || null;
            } catch (e) {}
        } else if (localStorage.getItem('currentUsername')) {
            userName = localStorage.getItem('currentUsername');
            userRole = localStorage.getItem('currentRole') || '';
        } else if (localStorage.getItem('cashierName')) {
            userName = localStorage.getItem('cashierName');
        } else if (localStorage.getItem('username')) {
            userName = localStorage.getItem('username');
        } else if (localStorage.getItem('user')) {
            try {
                const user = JSON.parse(localStorage.getItem('user'));
                userName = user.name || user.username || 'User';
                userPhoto = user.photo || user.avatar || null;
                userRole = user.role || '';
            } catch (e) {}
        }
        
        userNameEl.textContent = userName;
        
        const userRoleEl = document.getElementById('sidebar-user-role');
        if (userRoleEl && userRole) {
            const roleText = userRole === 'administrator' ? 'Admin' : (userRole === 'manager' ? 'Manager' : 'Sales Associate');
            userRoleEl.textContent = roleText;
        }
        
        if (userAvatarEl) {
            if (userPhoto && userPhoto !== '') {
                const photoSrc = safeFixImagePath(userPhoto);
                userAvatarEl.innerHTML = `<img src="${photoSrc}" alt="${userName}" class="w-8 h-8 rounded-full object-cover" onerror="this.onerror=null;this.parentElement.innerHTML='<i class=\'fas fa-user\'></i>';">`;
            } else {
                userAvatarEl.innerHTML = '<i class="fas fa-user"></i>';
            }
        }
        
        updateOtherUserDisplays(userName, userPhoto, userRole);
    }

    function updateOtherUserDisplays(userName, userPhoto, userRole) {
        const topBarUserName = document.getElementById('top-bar-username');
        if (topBarUserName) topBarUserName.textContent = userName;
        
        const userProfileBtn = document.getElementById('userProfileBtn');
        if (userProfileBtn) {
            const avatarContainer = userProfileBtn.querySelector('.user-avatar');
            if (avatarContainer) {
                if (userPhoto) {
                    const photoSrc = safeFixImagePath(userPhoto);
                    avatarContainer.innerHTML = `<img src="${photoSrc}" alt="${userName}" class="w-8 h-8 rounded-full object-cover" onerror="this.onerror=null;this.parentElement.innerHTML='<i class=\'fas fa-user-circle text-2xl\'></i>';">`;
                } else {
                    avatarContainer.innerHTML = '<i class="fas fa-user-circle text-2xl"></i>';
                }
            }
            const nameSpan = userProfileBtn.querySelector('.user-name');
            if (nameSpan) nameSpan.textContent = userName;
        }
    }

    function setUserPhoto(photoUrl) {
        if (!photoUrl) return;
        const fixedPhotoUrl = safeFixImagePath(photoUrl);
        if (window.currentUser) window.currentUser.photo = fixedPhotoUrl;
        if (localStorage.getItem('userSession')) {
            try {
                const userSession = JSON.parse(localStorage.getItem('userSession'));
                userSession.photo = fixedPhotoUrl;
                localStorage.setItem('userSession', JSON.stringify(userSession));
            } catch (e) {}
        }
        updateUserDisplay();
    }

    function updateCurrentUserInfo(userData) {
        if (window.currentUser) window.currentUser = { ...window.currentUser, ...userData };
        if (localStorage.getItem('userSession')) {
            try {
                const userSession = JSON.parse(localStorage.getItem('userSession'));
                const updatedSession = { ...userSession, ...userData };
                localStorage.setItem('userSession', JSON.stringify(updatedSession));
            } catch (e) {}
        }
        updateUserDisplay();
    }

    function adjustBodyPadding() {
        const sidebar = document.querySelector('.sidebar-main');
        if (sidebar) {
            const sidebarWidth = sidebar.offsetWidth || 280;
            document.body.style.paddingLeft = sidebarWidth + 'px';
        }
    }

    // Expose functions globally
    window.setUserPhoto = setUserPhoto;
    window.updateCurrentUserInfo = updateCurrentUserInfo;
    window.updateSidebarUserDisplay = updateUserDisplay;
    window.refreshPlanBadge = updatePlanBadgeFromBusinessInfo;
    window.showModalWithHistory = showModalWithHistory;
    window.hideModalWithHistory = hideModalWithHistory;
    window.closeCurrentModal = closeCurrentModal;

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initSidebar);
    } else {
        initSidebar();
    }
})();

// Global function for profile click handler
window.onProfileInfoClick = function() {
    if (!window.currentUser) {
        if (typeof showMessageModal === 'function') showMessageModal('Please log in first.');
        return;
    }
    
    const role = window.currentUser.role;
    const user = window.currentUser;
    
    if (typeof removeSalesAssociateInfo === 'function') removeSalesAssociateInfo();
    const existingManagerInfo = document.getElementById('managerInfoButton');
    if (existingManagerInfo) existingManagerInfo.remove();
    const salesAssociateInfo = document.getElementById('salesAssociateInfo');
    if (salesAssociateInfo) salesAssociateInfo.remove();
    
    switch(role) {
        case 'administrator':
            if (typeof window.showAdminProfileModal === 'function') {
                window.showAdminProfileModal(user.username);
            } else if (typeof showAdminProfileModal === 'function') {
                showAdminProfileModal(user.username);
            }
            break;
        case 'manager':
            if (typeof showManagerInfo === 'function') showManagerInfo(user);
            break;
        case 'sales':
            if (typeof showSalesAssociateInfo === 'function') showSalesAssociateInfo(user);
            break;
        default:
            console.warn('Unknown user role:', role);
    }
};

async function handleSettingsClick() {
    if (currentUser && currentUser.role === 'administrator') {
        showLoading(translate('loading_settings'));
        
        try {
            const dashboardContainer = document.getElementById('main-dashboard-container');
            if (dashboardContainer) {
                dashboardContainer.classList.add('nosee');
                dashboardContainer.classList.remove('see');
            }
            
            stopUnifiedDashboard();
            
            const dashcontainer = document.getElementById('dashcontainer');
            if (dashcontainer) dashcontainer.classList.add('hidden');
            stockManagementSection.classList.add('hidden');
            salesManagementSection.classList.add('hidden');
            stockOptionsModal.classList.add('hidden');
            salesOptionsModal.classList.add('hidden');
            const panel = document.getElementById('reminderListPanel');
            panel.classList.add('hidden');
            await showBusinessSettingsModal();
           
        } catch (error) {
            console.error('Error loading settings:', error);
            showMessageModal(translate('error_loading_settings'));
        } finally {
            const checkInterval = setInterval(() => { checkCancelled(); }, 100);
            resetCancellation();
            clearInterval(checkInterval);
            checkCancelled();
            hideLoading();
        }
    } else {
        showMessageModal(translate('only_admins_modify_settings'));
    }
}

function showShopSection() {
    document.title = "StockApp* → Shop";
    if (typeof hideAllStockSubSections === 'function') hideAllStockSubSections();
    if (typeof hideAllSalesSubSections === 'function') hideAllSalesSubSections();
    if (typeof cleanupMemory === 'function') cleanupMemory();
    if (typeof showHomeOverlay === 'function') showHomeOverlay();
    if (typeof salesOptionsModal !== 'undefined' && salesOptionsModal) salesOptionsModal.classList.remove('hidden');
}

function showInventorySection() {
    document.title = "StockApp* → Inventory";
    if (typeof hideAllStockSubSections === 'function') hideAllStockSubSections();
    if (typeof hideAllSalesSubSections === 'function') hideAllSalesSubSections();
    if (typeof cleanupMemory === 'function') cleanupMemory();
    if (typeof showHomeOverlay === 'function') showHomeOverlay();
    if (typeof closeBusinessModal === 'function') closeBusinessModal();
    if (typeof stockOptionsModal !== 'undefined' && stockOptionsModal) stockOptionsModal.classList.remove('hidden');
}

function showReportsSection() {
    document.title = "StockApp* → Reports";
    if (typeof hideAllStockSubSections === 'function') hideAllStockSubSections();
    if (typeof hideAllSalesSubSections === 'function') hideAllSalesSubSections();
    if (typeof showHomeOverlay === 'function') showHomeOverlay();
}

function showSettingsSection() {
    document.title = "StockApp* → Settings";
}

function showReminderListPanel() {
    stockManagementSection.classList.add('hidden');
    salesManagementSection.classList.add('hidden');
    stockOptionsModal.classList.add('hidden');
    salesOptionsModal.classList.add('hidden');
    closeBusinessModal();
    const dashboardContainer = document.getElementById('main-dashboard-container');
    if (dashboardContainer) {
        dashboardContainer.classList.add('nosee');
        dashboardContainer.classList.remove('see');
    }
    stopUnifiedDashboard();
    const dashcontainer = document.getElementById('dashcontainer');
    if (dashcontainer) dashcontainer.classList.add('hidden');
    
    openReminderList();
}