// Sidebar Component - Injects a responsive left sidebar navigation
(function() {
    'use strict';

    // Safe fixImagePath function that doesn't break if the original isn't available
function safeFixImagePath(path) {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    if (path.startsWith('data:')) return path;
    
    // Supabase storage paths - convert to full URL
    const SUPABASE_STORAGE_URL = 'https://axndkzmmzwpvwuftbkuw.supabase.co/storage/v1/object/public';
    
    // If it's a Supabase storage path (logos/, photos/, images/, public/)
    if (path.includes('logos/') || path.includes('photos/') || path.includes('images/') || path.includes('public/')) {
        return `${SUPABASE_STORAGE_URL}/${path}`;
    }
    
    // Local asset - return as-is
    return path;
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

        // Setup logout button - FIXED: moved inside setupEventListeners
        const logoutBtn = document.getElementById('sidebar-logout-btn');
        if (logoutBtn) {
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

                // Show the logout modal
                logoutModal.classList.remove('hidden');
                if (logoutModalContent) {
                    logoutModalContent.classList.add('scale-100');
                    logoutModalContent.classList.remove('scale-95');
                }

                let countdown = 5;
                if (countdownTimer) countdownTimer.textContent = countdown;

                // Start the countdown
                const timerInterval = setInterval(() => {
                    countdown--;
                    if (countdownTimer) countdownTimer.textContent = countdown;
                    if (countdown <= 0) {
                        clearInterval(timerInterval);
                        // Perform the actual logout and reload
                        window.currentUser = null;
                        currentUser = null;
                        localStorage.removeItem('rememberedUser');
                        localStorage.removeItem('userSession');
                        localStorage.removeItem('currentRole');
                        localStorage.removeItem('currentUsername');
                        window.location.reload();
                    }
                }, 1000);
            };
        }

        setupUserSectionClickHandler();
        updateUserDisplay();
    }

    // Helper function to create logout modal if it doesn't exist
    function createLogoutModal() {
        const modal = document.createElement('div');
        modal.id = 'logoutModal';
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 hidden';
        modal.innerHTML = `
            <div id="logoutModalContent" class="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-sm w-full mx-4 transform transition-all scale-95">
                <div class="text-center">
                    <div class="w-16 h-16 mx-auto mb-4 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center">
                        <i class="fas fa-sign-out-alt text-2xl text-red-500"></i>
                    </div>
                    <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">Logging Out</h3>
                    <p class="text-gray-600 dark:text-gray-300 mb-4">You will be logged out in <span id="countdownTimer" class="font-bold text-red-500">5</span> seconds</p>
                    <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-4">
                        <div class="bg-red-500 h-2 rounded-full animate-pulse" style="width: 100%"></div>
                    </div>
                    <p class="text-xs text-gray-500 dark:text-gray-400">Please wait...</p>
                </div>
            </div>
        `;
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

function hideDashboard() {}

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