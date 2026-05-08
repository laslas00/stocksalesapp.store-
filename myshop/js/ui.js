

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
    
    // Close/hide the Electron notification window if it exists
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

// ============================================
// GREETING ANIMATION WITH TRANSLATION SUPPORT
// ============================================

// Global variables
let greetingTimeout = null;
let originalWelcomePrefix = '';

// CSS Animation Styles (add this once when page loads)
function injectGreetingStyles() {
    const styleId = 'greeting-animation-styles';
    if (document.getElementById(styleId)) return;
    
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
        /* Greeting Container Animation */
        .greeting-wrapper {
            display: inline-block;
            overflow: hidden;
            position: relative;
        }
        
        #greetings {
            display: inline-block;
            transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), 
                        opacity 0.3s ease-in-out;
            transform: translateY(0);
            opacity: 1;
        }
        
        /* Slide out animation */
        #greetings.slide-out {
            transform: translateY(-20px);
            opacity: 0;
        }
        
        /* Slide in animation */
        #greetings.slide-in {
            transform: translateY(0);
            opacity: 1;
            animation: gentleBounce 0.5s ease-out;
        }
        
        /* Gentle bounce effect */
        @keyframes gentleBounce {
            0% {
                transform: translateY(-15px);
                opacity: 0;
            }
            60% {
                transform: translateY(3px);
                opacity: 1;
            }
            100% {
                transform: translateY(0);
                opacity: 1;
            }
        }
        
        /* Pulse animation for greeting */
        #greetings.greeting-active {
            animation: softPulse 1.5s ease-in-out;
        }
        
        @keyframes softPulse {
            0% {
                text-shadow: 0 0 0 rgba(255, 255, 255, 0);
            }
            50% {
                text-shadow: 0 0 20px rgba(255, 255, 255, 0.3);
            }
            100% {
                text-shadow: 0 0 0 rgba(255, 255, 255, 0);
            }
        }
        
        /* Dark mode support */
        .dark-mode #greetings.greeting-active {
            animation: softPulseDark 1.5s ease-in-out;
        }
        
        @keyframes softPulseDark {
            0% {
                text-shadow: 0 0 0 rgba(255, 255, 255, 0);
            }
            50% {
                text-shadow: 0 0 25px rgba(255, 255, 255, 0.2);
            }
            100% {
                text-shadow: 0 0 0 rgba(255, 255, 255, 0);
            }
        }
        
        /* Emoji animation */
        .greeting-emoji {
            display: inline-block;
            animation: wave 0.8s ease-in-out;
        }
        
        @keyframes wave {
            0%, 100% {
                transform: rotate(0deg);
            }
            25% {
                transform: rotate(15deg);
            }
            75% {
                transform: rotate(-10deg);
            }
        }
    `;
    document.head.appendChild(style);
}

// Call this when page loads
document.addEventListener('DOMContentLoaded', () => {
    injectGreetingStyles();
});

// NEW FUNCTION: Show greeting temporarily with slide animation
function showGreetingTemporarily() {
    const greetingsElement = document.getElementById('greetings');
    
    if (!greetingsElement) {
        console.warn('Greetings element not found');
        return;
    }
    
    // Ensure styles are injected
    injectGreetingStyles();
    
    // Store the original text with translation
    if (!greetingsElement.dataset.originalText) {
        const translatedWelcome = typeof translate === 'function' 
            ? translate('welcomePrefix', 'Welcome to') 
            : 'Welcome to';
        greetingsElement.dataset.originalText = translatedWelcome;
    }
    
    // Clear any existing timeout
    if (greetingTimeout) {
        clearTimeout(greetingTimeout);
    }
    
    // Remove any existing animation classes
    greetingsElement.classList.remove('slide-in', 'slide-out', 'greeting-active');
    
    // Step 1: Slide out current text
    greetingsElement.classList.add('slide-out');
    
    setTimeout(() => {
        // Step 2: Change text to greeting (with translation)
        const greeting = getGreetingMessageWithEmoji();
        greetingsElement.textContent = greeting;
        
        // Step 3: Remove slide-out and add slide-in
        greetingsElement.classList.remove('slide-out');
        greetingsElement.classList.add('slide-in', 'greeting-active');
        
        // Add wave animation to emoji if present
        const emojiSpan = document.createElement('span');
        emojiSpan.className = 'greeting-emoji';
        
    }, 300); // Wait for slide-out animation
    
    // Step 4: Remove greeting-active after pulse animation completes
    setTimeout(() => {
        greetingsElement.classList.remove('greeting-active');
    }, 1500);
    
    // Step 5: After 6 seconds, revert back to original welcome text
    greetingTimeout = setTimeout(() => {
        revertToWelcomeText();
    }, 6000); // 6 seconds display
}

// NEW FUNCTION: Revert back to original welcome text with slide animation
function revertToWelcomeText() {
    const greetingsElement = document.getElementById('greetings');
    
    if (!greetingsElement) return;
    
    const originalText = greetingsElement.dataset.originalText || 
        (typeof translate === 'function' ? translate('welcomePrefix', 'Welcome to') : 'Welcome to');
    
    // Remove current classes
    greetingsElement.classList.remove('slide-in', 'greeting-active');
    
    // Slide out greeting
    greetingsElement.classList.add('slide-out');
    
    setTimeout(() => {
        // Restore original translated text
        greetingsElement.textContent = originalText;
        
        // Slide back in
        greetingsElement.classList.remove('slide-out');
        greetingsElement.classList.add('slide-in');
        
        // Clear the timeout reference
        greetingTimeout = null;
        
        // Remove slide-in class after animation completes
        setTimeout(() => {
            greetingsElement.classList.remove('slide-in');
        }, 400);
        
    }, 300); // Wait for slide-out animation
}

// MODIFIED: Get greeting message with translation support
function getGreetingMessage() {
    const hrs = new Date().getHours();
    
    if (hrs < 12) {
        return typeof translate === 'function' 
            ? translate('good_morning_label', 'Good Morning') 
            : 'Good Morning';
    } else if (hrs < 18) {
        return typeof translate === 'function' 
            ? translate('good_afternoon_label', 'Good Afternoon') 
            : 'Good Afternoon';
    } else {
        return typeof translate === 'function' 
            ? translate('good_evening_label', 'Good Evening') 
            : 'Good Evening';
    }
}

// NEW: Get greeting with emoji (for better UX)
function getGreetingMessageWithEmoji() {
    const hrs = new Date().getHours();
    const greeting = getGreetingMessage();
    
    if (hrs < 12) {
        return `☀️ ${greeting}`;
    } else if (hrs < 18) {
        return `🌤️ ${greeting}`;
    } else {
        return `🌙 ${greeting}`;
    }
}

// OPTIONAL: Get personalized greeting with user name
function getPersonalizedGreeting() {
    const greeting = getGreetingMessageWithEmoji();
    
    try {
        // Try to get user name from localStorage
        const userData = JSON.parse(localStorage.getItem('userData') || '{}');
        const businessInfo = JSON.parse(localStorage.getItem('businessInfo') || '{}');
        
        const userName = userData.name || businessInfo.ownerName || '';
        
        if (userName) {
            return `${greeting}, ${userName}`;
        }
    } catch (e) {
        // Ignore parsing errors
    }
    
    return greeting;
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
    
    // 🎯 Show greeting with slide animation
    showGreetingTemporarily();
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

// Optional: Function to manually trigger greeting display
function refreshGreeting() {
    if (!homeOverlay.classList.contains('hidden')) {
        showGreetingTemporarily();
    }
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


    function updateSaleFormLabels(itemType) {
        if (itemType === 'product') {
            saleQuantityLabel.textContent = 'Quantity Sold';
            salePriceLabel.textContent = `Sale Price (${getCurrencySymbol()})`;
            saleProductImageContainer.classList.remove('hidden');
        } else { 
            saleQuantityLabel.textContent = 'quantity Sold';
            salePriceLabel.textContent = `PRICE (${getCurrencySymbol()})`;
            saleProductImageContainer.classList.add('hidden');
        }
    }



    function updateTime() {
    const now = new Date(); 
    const timeOptions = {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true 
    };
    const timeString = now.toLocaleTimeString('en-US', timeOptions); 
    const dateOptions = {
        weekday: 'long', 
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    };
    const dateString = now.toLocaleDateString('en-US', dateOptions); 
    document.getElementById('currentTime').textContent = timeString;
    document.getElementById('currentDate').textContent = dateString;
    }


    function showSyncingOverlay() {
        document.getElementById('syncingOverlay').hidden = false;
    }
    function hideSyncingOverlay() {
        document.getElementById('syncingOverlay').hidden = true;
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
    function showConvertProgressModal() {
  document.getElementById("convertProgressModal").classList.remove("hidden");
}

function hideConvertProgressModal() {
  document.getElementById("convertProgressModal").classList.add("hidden");
}


function changeAnalyticsYear(delta) {
    const currentYearDisplay = document.getElementById('currentYearDisplay');
    const selectedYearInput = document.getElementById('selectedYear');
    
    if (!currentYearDisplay) {
        console.error('Year display element not found');
        return;
    }
     showLoading();
if (isCancelled) return;
    // Get current year from display
    let currentYear = parseInt(currentYearDisplay.textContent);
    if (isNaN(currentYear)) {
        currentYear = new Date().getFullYear();
    }
    
    // Update the year
    currentAnalyticsYear = currentYear + delta;
    
    console.log('Changing year from', currentYear, 'to', currentAnalyticsYear);
    
    // Update the display
    currentYearDisplay.textContent = currentAnalyticsYear;
    
    // Update hidden input
    if (selectedYearInput) {
        selectedYearInput.value = currentAnalyticsYear;
    }
    
    // Check global variable directly (removed window.)
    if (typeof currentAnalyticsItemId !== 'undefined' && currentAnalyticsItemId) {
        console.log('Loading analytics for item:', currentAnalyticsItemId, 'year:', currentAnalyticsYear);
        loadAnalyticsForYear(currentAnalyticsItemId, currentAnalyticsYear);
    } else {
        // Fallback: Check if we can recover the ID from the item currently being edited
        if (currentItemBeingEdited && currentItemBeingEdited.id) {
            console.warn('Recovered Item ID from currentItemBeingEdited');
            currentAnalyticsItemId = currentItemBeingEdited.id;
            loadAnalyticsForYear(currentAnalyticsItemId, currentAnalyticsYear);
        } else {
            console.error('No currentAnalyticsItemId found');
        }
    }
}
function updateConvertProgress(current, total) {
  const text = document.getElementById("convertProgressText");
  const bar = document.getElementById("convertProgressBar");
  const percent = Math.floor((current / total) * 100);
  text.textContent = `Converting ${current} of ${total} images... (${percent}%)`;
  bar.style.width = percent + "%";
}

// Get current user from localStorage (adjust to how you store it)
function getCurrentUser() {
    try {
        const userStr = localStorage.getItem('currentUser') || sessionStorage.getItem('currentUser');
        return userStr ? JSON.parse(userStr) : null;
    } catch {
        return null;
    }
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
                'Enter admin password to confirm reset',
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