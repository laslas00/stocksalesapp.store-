

function showMessageModal(message) {
    const messageModal = document.getElementById('messageModal');
        messageModalText.textContent = message;
           messageModalBody.classList.add('hidden');
        messageModal.classList.remove('hidden');
    }

function closeMessageModal() {
    const messageModal = document.getElementById('messageModal');
    if (messageModal) {
        messageModal.classList.add('hidden'); // Add hidden class if you have CSS for it
    }
    
    if (window.electronAPI) {
        if (typeof window.electronAPI.hideNotifyWindow === 'function') {
            window.electronAPI.hideNotifyWindow();
        }
        
    }
}

    function showConfirmationModal(message, onConfirm, onCancel) {
        confirmationModalText.textContent = message;
        confirmationModal.classList.remove('hidden');
        confirmYesBtn.onclick = null;
        confirmNoBtn.onclick = null;
        confirmYesBtn.onclick = () => {
            confirmationModal.classList.add('hidden');
            onConfirm();
        };
        confirmNoBtn.onclick = () => {
            confirmationModal.classList.add('hidden');
            if (onCancel) onCancel();
        };
    }

    async function setupBusinessInfo(cashierName) {
        try {
            if (!businessInfo) {
                console.warn('Business info not loaded');
                return;
            }
            
    if (receiptBusinessLogo) {
        const logoUrl = businessInfo?.logo_url || businessInfo?.logoData || '';
        if (logoUrl) {
            receiptBusinessLogo.src = logoUrl;
            receiptBusinessLogo.classList.remove('hidden');
        } else {
            receiptBusinessLogo.classList.add('hidden');
        }
    }
            if (receiptBusinessName) {
                receiptBusinessName.textContent = businessInfo.name || 'Your Business Name';
            }
            
            if (receiptBusinessAddress) {
                receiptBusinessAddress.textContent = businessInfo.address || '';
            }
            
            const cashierElement = document.getElementById('receiptCashierName');
            if (cashierElement) {
                cashierElement.textContent = cashierName;
            }
            
            let contactInfo = [];
            if (businessInfo.shopNumber) contactInfo.push(businessInfo.shopNumber);
            if (businessInfo.phoneNumberTwo) contactInfo.push(businessInfo.phoneNumberTwo);
            if (businessInfo.email) contactInfo.push(businessInfo.email);
                if (businessInfo.Website) contactInfo.push(businessInfo.Website);
            if (receiptBusinessContact) {
                receiptBusinessContact.textContent = contactInfo.join(' | ');
            }
            
            if (receiptBusinessSocial) {
                receiptBusinessSocial.textContent = businessInfo.socialMediaHandles || '';
            }
            
            if (receiptBusinessDetails) {
                receiptBusinessDetails.textContent = businessInfo.details || '';
            }
            
            // Setup watermark
            await setupReceiptWatermark();
            
        } catch (error) {
            console.error('Error setting up business info:', error);
        }
    }




function closeCalculator() {
    if (window.calculator) {
        window.calculator.closeCalculator();
    }
}

async function openLicenseModal() {
    const modal = document.getElementById('licenseStatusModal');
    const loading = document.getElementById('licenseLoading');
    const dataContainer = document.getElementById('licenseData');
    
    modal.classList.remove('hidden');
    loading.classList.remove('hidden');
    dataContainer.classList.add('hidden');
    
    try {
        // 1. Fetch Paid/Trial data from backend
        const response = await fetch(`${API_BASE}/api/license-check`);
        const data = await response.json();
        
        const badge = document.getElementById('licenseStatusBadge');
        const typeTxt = document.getElementById('licenseTypeTxt');
        const activatedTxt = document.getElementById('licenseActivatedTxt');
        const expiresTxt = document.getElementById('licenseExpiresTxt');
        
        const formatDate = (dateString) => {
            if (!dateString) return translate('na_text');
            return new Date(dateString).toLocaleDateString(undefined, { 
                year: 'numeric', month: 'short', day: 'numeric' 
            });
        };

        // 2. CHECK FOR FREE MODE (LocalStorage Fallback)
        const isFreeMode = localStorage.getItem('freeModeActive') === 'true';
        const usageStats = JSON.parse(localStorage.getItem('usage_stats') || '{}');
        const DAILY_LIMIT_MS = 3 * 60 * 60 * 1000;

        badge.className = 'px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider ';

        if (data.active && !data.isExpired) {
            // --- PAID OR TRIAL LICENSE ---
            typeTxt.textContent = data.type || translate('standard_text');
            activatedTxt.textContent = formatDate(data.activatedAt || data.createdDate);
            expiresTxt.textContent = formatDate(data.nextToactvate);
            
            if (data.type === 'Trial') {
                badge.textContent = translate('trial_active_text');
                badge.classList.add('bg-blue-500/20', 'text-blue-400', 'border', 'border-blue-500/30');
            } else {
                badge.textContent = translate('active_text');
                badge.classList.add('bg-green-500/20', 'text-green-400', 'border', 'border-green-500/30');
            }
        } 
        else if (isFreeMode) {
            // --- FREE MODE (3H DAILY) ---
            typeTxt.textContent = translate('free_mode_limited');
            activatedTxt.textContent = usageStats.date || formatDate(new Date());
            
            // Calculate remaining time for the label
            const remainingMs = Math.max(0, DAILY_LIMIT_MS - (usageStats.timeUsed || 0));
            const hours = Math.floor(remainingMs / (1000 * 60 * 60));
            const mins = Math.round((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
            
            expiresTxt.textContent = `${hours}h ${mins}m ${translate('time_left_today')}`;
            
            badge.textContent = translate('free_access_text');
            badge.classList.add('bg-orange-500/20', 'text-orange-400', 'border', 'border-orange-500/30');
            
            const progressContainer = document.getElementById('freeModeProgress');
            if (progressContainer) {
                progressContainer.classList.remove('hidden');
                const percent = Math.min(100, Math.round((usageStats.timeUsed / DAILY_LIMIT_MS) * 100));
                document.getElementById('usageBar').style.width = percent + '%';
                document.getElementById('usagePercent').textContent = percent + '%';
            }
        } 
        else {
            // --- EXPIRED OR INACTIVE ---
            typeTxt.textContent = translate('none_text');
            activatedTxt.textContent = translate('na_text');
            expiresTxt.textContent = translate('expired_text');
            badge.textContent = translate('inactive_text');
            badge.classList.add('bg-red-500/20', 'text-red-400', 'border', 'border-red-500/30');
        }
        
        loading.classList.add('hidden');
        dataContainer.classList.remove('hidden');
        
    } catch (error) {
        console.error('Failed to load license data:', error);
        loading.innerHTML = `<p class="text-red-400 text-sm" data-translate="communication_error">${translate('communication_error')}</p>`;
    }
}

function closeLicenseModal() {
    document.getElementById('licenseStatusModal').classList.add('hidden');
}

async function showDashboard() {
    document.title = "StockApp* -> Dashboard";

    // Check free mode
    if (localStorage.getItem('freeModeActive') === 'true') {
        if (typeof showMessageModal === 'function') {
            showMessageModal(translate('feature_locked_free_mode'));
        } else {
            alert("Printing is disabled in Free Mode. Please activate your license.");
        }
        return;
    }
   mainContentContainer.classList.add('hidden');
    // Show loading indicator
    if (typeof showLoading === 'function') {
        showLoading(translate('loading_dashboard'));
    }

    // Use requestAnimationFrame for smoother UI updates
    requestAnimationFrame(() => {
        // Safely hide all other sections
        const homeOverlay = document.getElementById('homeOverlay');
        if (homeOverlay) homeOverlay.classList.add('hidden');
        
        if (typeof stockManagementSection !== 'undefined' && stockManagementSection) {
            stockManagementSection.classList.add('hidden');
        }
        if (typeof salesManagementSection !== 'undefined' && salesManagementSection) {
            salesManagementSection.classList.add('hidden');
        }
        if (typeof stockOptionsModal !== 'undefined' && stockOptionsModal) {
            stockOptionsModal.classList.add('hidden');
        }
        if (typeof salesOptionsModal !== 'undefined' && salesOptionsModal) {
            salesOptionsModal.classList.add('hidden');
        }
        
        // Close any open modals
        if (typeof closeBusinessSettingsModal === 'function') {
            closeBusinessModal();
        }
        if (typeof closeMessageModal === 'function') {
            closeMessageModal();
        }
           closeReminder();
        // Show dashboard container FIRST (immediate visual feedback)
        const dashboardContainer = document.getElementById('main-dashboard-container');
        if (dashboardContainer) {
            dashboardContainer.classList.remove('nosee', 'hidden');
            dashboardContainer.classList.add('see');
        }
        
        // Show dashcontainer immediately
        const dashcontainer = document.getElementById('dashcontainer');
        if (dashcontainer) {
            dashcontainer.classList.remove('hidden');
        }
    });

    // Destroy existing dashboard instance
    if (window.unifiedDashboard && typeof window.unifiedDashboard.destroy === 'function') {
        window.unifiedDashboard.destroy();
        window.unifiedDashboard = null;
    }
    
    // Clear any existing timeout to prevent conflicts
    if (window.dashboardInitTimeout) {
        clearTimeout(window.dashboardInitTimeout);
    }
    
    // Initialize dashboard with a slight delay to allow DOM to settle
    window.dashboardInitTimeout = setTimeout(async () => {
        try {
            // Initialize dashboard
            window.unifiedDashboard = await initUnifiedDashboard('main-dashboard-container');
            
            // Ensure visibility after initialization
            const dashcontainer = document.getElementById('dashcontainer');
            if (dashcontainer) dashcontainer.classList.remove('hidden');
            
            // Track event
            if (typeof currentUser !== 'undefined' && currentUser && currentUser.username) {
                trackAppEvent('dashboard_shown', {}, currentUser.username);
            }
        } catch (error) {
            console.error('Dashboard initialization error:', error);
            if (typeof showMessageModal === 'function') {
                showMessageModal(translate('error_loading_dashboard'));
            }
        } finally {
            // Hide loading indicator
            if (typeof hideLoading === 'function') {
                hideLoading();
            }
        }
    }, 10);
}


// MODIFIED: Show home overlay with greeting
async function showHomeOverlay() {
    document.title = "StockApp* -> StockApp* home";
    homeOverlay.classList.remove('hidden');
    mainContentContainer.classList.add('hidden');
    stockManagementSection.classList.add('hidden');
    salesManagementSection.classList.add('hidden');
    stockOptionsModal.classList.add('hidden');
    salesOptionsModal.classList.add('hidden');
    document.getElementById('expensesSection').classList.add('hidden');
    
    await initializeHomeOverlay();
    cleanupMemory();
    
    const dashboardContainer = document.getElementById('main-dashboard-container');
    if (dashboardContainer) dashboardContainer.classList.add('nosee');
    dashboardContainer.classList.remove('see');
    stopUnifiedDashboard();
    
    const dashcontainer = document.getElementById('dashcontainer');
    if (dashcontainer) {
        dashcontainer.classList.add('hidden');
    }
    
    hideAllStockSubSections();
    hideAllSalesSubSections();
    updateLowStockAlert(); 
    closeCalculator();
    
}

    function hideAllStockSubSections() {
        addItemSection.classList.add('hidden');
        currentStockSection.classList.add('hidden');
        stockHistorySection.classList.add('hidden');
        profitLossSection.classList.add('hidden');
        weeklySalesSection.classList.add('hidden'); // NEW: Added weekly sales section
        monthlySalesSection.classList.add('hidden'); // NEW: Added monthly sales section
        creditSalesSection.classList.add('hidden'); // NEW: Added credit sales section
        groupedBySubcategorySection.classList.add('hidden'); 
       
    }
    function hideAllSalesSubSections() {
        recordNewSaleSection.classList.add('hidden');
        salesHistorySection.classList.add('hidden');
         
    }
     function closeStockOptionsModal() {
        stockOptionsModal.classList.add('hidden');
        if (addItemSection.classList.contains('hidden') &&
            currentStockSection.classList.contains('hidden') &&
            stockHistorySection.classList.contains('hidden') &&
            profitLossSection.classList.contains('hidden') &&
            weeklySalesSection.classList.contains('hidden') && // NEW
            monthlySalesSection.classList.contains('hidden') && // NEW
            creditSalesSection.classList.contains('hidden')) { // NEW
            showHomeOverlay();
        }
    }
    function closeSalesOptionsModal() {
        salesOptionsModal.classList.add('hidden');
        if (recordNewSaleSection.classList.contains('hidden') &&
            salesHistorySection.classList.contains('hidden')) { 
            cleanupMemory();
            showHomeOverlay();
        }
    }
// Clean up function for when leaving home overlay
function hideHomeOverlay() {
    // Cancel any pending greeting timeout
    if (greetingTimeout) {
        clearTimeout(greetingTimeout);
        greetingTimeout = null;
    }
    
    // Immediately revert to welcome text (no animation needed)
    const greetingsElement = document.getElementById('greetings');
    if (greetingsElement) {
        greetingsElement.classList.remove('slide-in', 'slide-out', 'greeting-active');
        const originalText = greetingsElement.dataset.originalText || 
            (typeof translate === 'function' ? translate('welcomePrefix', 'Welcome to') : 'Welcome to');
        greetingsElement.textContent = originalText;
        greetingsElement.style.opacity = '1';
        greetingsElement.style.transform = 'translateY(0)';
    }
    
    // Your existing hide logic...
    homeOverlay.classList.add('hidden');
}


function closeCalculator() {
    if (window.calculator) {
        window.calculator.closeCalculator();
    }
}
    function hideHomeOverlay() {
        homeOverlay.classList.add('hidden');
        mainContentContainer.classList.remove('hidden');
    }



  async function showCurrentStockSection() {
        stockOptionsModal.classList.add('hidden');
        hideAllStockSubSections();
        currentStockSection.classList.remove('hidden');
          await loadStock();
        await loadSalesForYear(year);
        renderStock();
        
    }



    function showSyncingOverlay() {
        document.getElementById('syncingOverlay').hidden = false;
    }
    function hideSyncingOverlay() {
        document.getElementById('syncingOverlay').hidden = true;
    }

// Helper to show password prompt
function showPasswordPrompt(title, onConfirm, onCancel) {
    const modal = document.getElementById('passwordModal');
    const input = document.getElementById('passwordInput');
    const confirmBtn = document.getElementById('passwordConfirmBtn');
    const cancelBtn = document.getElementById('passwordCancelBtn');
    const titleEl = document.getElementById('passwordModalTitle');
    
    titleEl.textContent = title;
    input.value = '';
    modal.classList.remove('hidden');
    input.focus();
    
    const cleanUp = () => {
        modal.classList.add('hidden');
        confirmBtn.removeEventListener('click', confirmHandler);
        cancelBtn.removeEventListener('click', cancelHandler);
        input.removeEventListener('keypress', keyHandler);
    };
    
    const confirmHandler = () => {
        const pwd = input.value;
        cleanUp();
        onConfirm(pwd);
    };
    
    const cancelHandler = () => {
        cleanUp();
        if (onCancel) onCancel();
    };
    
    const keyHandler = (e) => {
        if (e.key === 'Enter') confirmHandler();
    };
    
    confirmBtn.addEventListener('click', confirmHandler);
    cancelBtn.addEventListener('click', cancelHandler);
    input.addEventListener('keypress', keyHandler);
}

async function handleFullReset() {
    const currentUser = getCurrentUser();
    if (!currentUser || currentUser.role !== 'administrator') {
        showMessageModal(translate('onlyAdminReset') || 'Only administrators can reset the system.', '', 'error', false);
        return;
    }
    
    // Combine title and message for the confirmation modal
    const confirmMessage = `⚠️ DANGER: Full System Reset\n\nThis will DELETE ALL DATA: sales, stock, users (except admin), settings, and license. This action cannot be undone. Are you absolutely sure?`;
    
    showConfirmationModal(
        confirmMessage,
        () => {
            // Show password prompt
            showPasswordPrompt(
                'Enter admin password to confirm reset ',
                (enteredPassword) => {
                    if (enteredPassword === 'admin123') {
                        performFullReset();
                    } else if (enteredPassword !== '') {
                        showMessageModal('Access Denied', 'Incorrect admin password. Reset cancelled.', 'error', false);
                    }
                },
                () => console.log('Password prompt cancelled')
            );
        },
        () => console.log('Reset cancelled')
    );
}

async function performFullReset() {
    const resetBtn = document.getElementById('fullResetBtn');
    
    const client = getSB();
    if (!client) {
        showMessageModal('❌ Reset Failed', 'Database connection failed.', 'error');
        return;
    }

    try {
        if (resetBtn) {
            resetBtn.disabled = true;
            resetBtn.classList.add('opacity-50', 'cursor-not-allowed');
            const span = resetBtn.querySelector('span');
            if (span) span.textContent = translate('resetting') || 'Resetting...';
        }

        // Get current business ID for safe deletion
        const currentBusinessId = currentUser?.business_id || businessInfo?.id || null;

        if (currentBusinessId) {
            // Delete only current business data (safer multi-tenant reset)
            await Promise.all([
                client.from('sales').delete().eq('business_id', currentBusinessId),
                client.from('stock').delete().eq('business_id', currentBusinessId),
                client.from('stock_history').delete().eq('business_id', currentBusinessId),
                client.from('credit_sales').delete().eq('business_id', currentBusinessId),
                client.from('expenses').delete().eq('business_id', currentBusinessId),
                client.from('tasks').delete().eq('business_id', currentBusinessId),
                client.from('reminders').delete().eq('business_id', currentBusinessId),
                client.from('customers').delete().eq('business_id', currentBusinessId),
                client.from('loans').delete().eq('business_id', currentBusinessId),
            ]);
        } else {
            // No business ID - delete all data (use with caution)
            await Promise.all([
                client.from('sales').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
                client.from('stock').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
                client.from('stock_history').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
                client.from('credit_sales').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
                client.from('expenses').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
                client.from('tasks').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
                client.from('reminders').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
                client.from('customers').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
                client.from('loans').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
            ]);
        }

        // Don't delete business_info or users - keep the account

        showMessageModal('✅ Reset Complete', 'All data has been wiped. Reloading...', 'success');
        
        setTimeout(() => {
            localStorage.clear();
            sessionStorage.clear();
            window.location.reload();
        }, 3000);

    } catch (err) {
        console.error('Reset error:', err);
        showMessageModal('❌ Reset Failed', err.message || 'Could not reset system.', 'error');
        
        if (resetBtn) {
            resetBtn.disabled = false;
            resetBtn.classList.remove('opacity-50', 'cursor-not-allowed');
            const span = resetBtn.querySelector('span');
            if (span) span.textContent = translate('reset_system') || 'Reset system';
        }
    }
}





/**
 * Show a custom prompt modal (replaces window.prompt)
 * @param {string} message - The prompt message/title
 * @param {string} defaultValue - Default value for the input
 * @returns {Promise<string|null>} - Resolves with user input or null if cancelled
 */
function showPrompt(message, defaultValue = '') {
    return new Promise((resolve) => {
        const modal = document.getElementById('promptModal');
        const titleEl = document.getElementById('promptModalTitle');
        const input = document.getElementById('promptInput');
        const confirmBtn = document.getElementById('promptConfirmBtn');
        const cancelBtn = document.getElementById('promptCancelBtn');
        
        titleEl.textContent = message;
        input.value = defaultValue;
        modal.classList.remove('hidden');
        input.focus();
        input.select();
        
        const cleanup = () => {
            modal.classList.add('hidden');
            confirmBtn.removeEventListener('click', confirmHandler);
            cancelBtn.removeEventListener('click', cancelHandler);
            input.removeEventListener('keypress', keyHandler);
        };
        
        const confirmHandler = () => {
            const value = input.value;
            cleanup();
            resolve(value);
        };
        
        const cancelHandler = () => {
            cleanup();
            resolve(null);
        };
        
        const keyHandler = (e) => {
            if (e.key === 'Enter') confirmHandler();
        };
        
        confirmBtn.addEventListener('click', confirmHandler);
        cancelBtn.addEventListener('click', cancelHandler);
        input.addEventListener('keypress', keyHandler);
    });
}
function scrollModalToTop() {
  const modalContent = document.querySelector('.modalcontent');
  if (modalContent) {
    modalContent.scrollTo({ top: 0, behavior: 'smooth' });
  }
}
    const scrollTopBtn = document.getElementById('scrollTopBtn');
    if (scrollTopBtn) {
      scrollTopBtn.style.display = 'none';
      window.addEventListener('scroll', () => {
        scrollTopBtn.style.display = window.scrollY > 300 ? 'flex' : 'none';
      });
      scrollTopBtn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
    }