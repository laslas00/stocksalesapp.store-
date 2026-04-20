// MODIFIED: Restrict settings access to administrators
settingsBtn.addEventListener('click', async () => {
    if (currentUser && currentUser.role === 'administrator') {
        showLoading(translate('loading_settings'));
        
        try {
            // If showBusinessSettingsModal is async
            await showBusinessSettingsModal();
        } catch (error) {
            console.error('Error loading settings:', error);
            showMessageModal(translate('error_loading_settings'));
        } finally {
                           const checkInterval = setInterval(() => {
            checkCancelled();
        }, 100);
          resetCancellation();
        clearInterval(checkInterval);
        

        checkCancelled();
        
        hideLoading();
        }
        
    } else {
        showMessageModal(translate('only_admins_modify_settings'));
    }
});

async function checkAndPromptBusinessInfo() {
    // Load current business info (if not already in memory)
    let currentInfo = businessInfo;
    if (!currentInfo || !currentInfo.name) {
        try {
            const res = await fetch(`${API_BASE}/api/business-info`);
            if (res.ok) currentInfo = await res.json();
        } catch (e) { console.warn('Could not fetch business info', e); }
    }
    // If name or email is missing, prompt
    if (!currentInfo.name || currentInfo.name.trim() === '' || !currentInfo.email || currentInfo.email.trim() === '') {
        const result = await showBusinessInfoPrompt();
        if (result && result.email) {
            // Only update email and website – keep everything else
            const updated = { ...currentInfo, email: result.email, Website: result.website || '' };
            try {
                const response = await fetch(`${API_BASE}/api/business-info`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(updated)
                });
                if (response.ok) {
                    businessInfo = updated;
                    showMessageModal(translate('business_info_saved') || 'Business email saved.', '', 'success', false);
                } else {
                    throw new Error('Save failed');
                }
            } catch (err) {
                console.error('Failed to save email/website:', err);
                showMessageModal(translate('error_saving_info') || 'Could not save email. You can update it later in settings.', 'error', false);
            }
        } else if (result === null) {
            showMessageModal(translate('fill_business_info_continue') || 'Please provide your business email later in settings.', 'warning', false);
        }
    }
}

function showBusinessSettingsModal() {
    businessNameInput.value = businessInfo.name;
    addressInput.value = businessInfo.address; 
    shopNumberInput.value = businessInfo.shopNumber;
    phoneNumberTwoInput.value = businessInfo.phoneNumberTwo; 
    emailInput.value = businessInfo.email; 
     WebsiteInput.value = businessInfo.Website; 
    socialMediaHandlesInput.value = businessInfo.socialMediaHandles;
    document.getElementById('warrantyDurationInput').value = businessInfo.warrantyDuration || 0;
    document.getElementById('warrantyUnitSelect').value = businessInfo.warrantyUnit || 'days';
    document.getElementById('warrantyTextInput').value = businessInfo.warrantyText || '';
    document.getElementById('businessDetailsInput').value = businessInfo.details || ''; 
    document.getElementById('businessFontStyleInput').value = businessInfo.fontStyle || 'default';

    if (businessInfo.logoData) {
          logoPreview.src = API_BASE + businessInfo.logoData;
        logoPreview.classList.remove('hidden');
    } else {
        logoPreview.classList.add('hidden');
    }
    logoFileInput.value = ''; 
    const badgeToggle = document.getElementById('toggleBadgeswithc');
    if (badgeToggle) {
        // Pull the state from the database object (businessInfo)
        badgeToggle.checked = businessInfo.festiveBadgeEnabled || false;
    }
    // Initialize character counter
    initializeBusinessDetailsCounter();

     openModal('businessSettingsModal');
                     const checkInterval = setInterval(() => {
            checkCancelled();
        }, 100);
          resetCancellation();
        clearInterval(checkInterval);
        

        checkCancelled();
        
        hideLoading();
}

function closeBusinessSettingsModal() {
    businessSettingsModal.classList.add('hidden');
     businessSettingsModal.classList.remove('show');
    document.body.style.overflow = '';

    setTimeout(() => {
        businessSettingsModal.classList.add('hidden');
    }, 300);
}

async function saveBusinessSettings() { 
    showLoading(translate('saving_settings'));
    isCancelled = false;
    abortController = new AbortController(); 
    const updatedBusinessInfo = { ...businessInfo }; // Create a copy to modify

    updatedBusinessInfo.name = businessNameInput.value.trim();
    updatedBusinessInfo.address = addressInput.value.trim(); // New
    updatedBusinessInfo.shopNumber = shopNumberInput.value.trim();
    updatedBusinessInfo.phoneNumberTwo = phoneNumberTwoInput.value.trim(); // New
    updatedBusinessInfo.email = emailInput.value.trim(); // New
     updatedBusinessInfo.Website = WebsiteInput.value.trim(); // New
    updatedBusinessInfo.socialMediaHandles = socialMediaHandlesInput.value.trim(); // New
    updatedBusinessInfo.details = document.getElementById('businessDetailsInput').value; // New
    updatedBusinessInfo.currency = currentCurrency;
    updatedBusinessInfo.warrantyDuration = parseInt(warrantyDurationInput.value, 10) || 0;
    updatedBusinessInfo.warrantyUnit = warrantyUnitSelect.value;
    updatedBusinessInfo.warrantyText = warrantyTextInput.value.trim();
    updatedBusinessInfo.currentLanguage = currentLanguage;
    updatedBusinessInfo.festiveBadgeEnabled = document.getElementById('toggleBadgeswithc').checked,
         updatedBusinessInfo.currentBadgeIndex = currentBadgeIndex // This ensures "Independence" stays set globally
    const businessFontStyleInput = document.getElementById('businessFontStyleInput');
    if (businessFontStyleInput) {
        updatedBusinessInfo.fontStyle = businessFontStyleInput.value;
    }
    const logoFile = logoFileInput.files[0]; 
    if (logoFile) {
        const formData = new FormData();
        formData.append('image', logoFile);
        try {
            const uploadRes = await fetch(`${API_BASE}/api/upload-image`, {
                method: 'POST',
                body: formData
            });
            const uploadData = await uploadRes.json();
            if (!uploadRes.ok) throw new Error(uploadData.error || translate('logo_upload_failed'));
            updatedBusinessInfo.logoData = uploadData.url; // ← store URL
        } catch (error) {
            console.error(translate('logo_upload_error'), error);
            showMessageModal(translate('failed_upload_logo'));
                           const checkInterval = setInterval(() => {
            checkCancelled();
        }, 100);
          resetCancellation();
        clearInterval(checkInterval);
        

        checkCancelled();
        
        hideLoading();
            return;
        }
    } else if (logoFileInput.value === '' && !businessInfo.logoData) {
        updatedBusinessInfo.logoData = '';
    }
    
    const businessDetailsInput = document.getElementById('businessDetailsInput');
    if (businessDetailsInput && businessInfo.details) {
        // Truncate if it's already longer than 143 characters
        businessDetailsInput.value = businessInfo.details.length > 143 
            ? businessInfo.details.substring(0, 143) 
            : businessInfo.details;
    }

    try {
        const response = await fetch(`${API_BASE}/api/business-info`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedBusinessInfo)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || translate('failed_save_business_settings_server'));
        }

        businessInfo = updatedBusinessInfo; 
        
        if (businessInfo.fontStyle) {
            applyBusinessFontStyle(businessInfo.fontStyle);
        }
                       const checkInterval = setInterval(() => {
            checkCancelled();
        }, 100);
          resetCancellation();
        clearInterval(checkInterval);
        

        checkCancelled();
        
        hideLoading();
        showMessageModal(translate('business_settings_saved'));
        closeBusinessSettingsModal();
        updatePrintLayoutInfo(); 
       await loadData();
    } catch (error) {
        console.error(translate('error_saving_business_settings'), error);
        showMessageModal(error.message || translate('failed_save_business_settings'));
                         const checkInterval = setInterval(() => {
            checkCancelled();
        }, 100);
          resetCancellation();
        clearInterval(checkInterval);
        

        checkCancelled();
        
        hideLoading();
    }
}

function applyBusinessFontStyle(fontStyle) {
    let fontFamily = '';
    switch (fontStyle) {
        case 'modern': fontFamily = "'Poppins', sans-serif"; break;
        case 'elegant': fontFamily = "serif"; break;
        case 'roboto': fontFamily = "'Roboto', sans-serif"; break;
        case 'montserrat': fontFamily = "'Montserrat', sans-serif"; break;
        case 'lato': fontFamily = "'Lato', sans-serif"; break;
        case 'oswald': fontFamily = "'Oswald', sans-serif"; break;
        case 'raleway': fontFamily = "'Raleway', sans-serif"; break;
        case 'merriweather': fontFamily = "'Merriweather', serif"; break;
        case 'playfair': fontFamily = "'Playfair Display', serif"; break;
        case 'nunito': fontFamily = "'Nunito', sans-serif"; break;
        case 'bangers': fontFamily = "'Bangers', cursive"; break;
        case 'pacifico': fontFamily = "'Pacifico', cursive"; break;
        case 'caveat': fontFamily = "'Caveat', cursive"; break;
        default: fontFamily = "inherit";
    }
    document.body.style.fontFamily = fontFamily;
}

saveBusinessSettingsBtn.addEventListener('click', saveBusinessSettings);

logoFileInput.addEventListener('change', () => {
    const file = logoFileInput.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            logoPreview.src = e.target.result;
            logoPreview.classList.remove('hidden');
        };
        reader.onerror = (error) => {
            console.error(translate('error_reading_file'), error);
            logoPreview.classList.add('hidden');
            showMessageModal(translate('could_not_read_image_file'));
        };
        reader.readAsDataURL(file);
    }
});

const currencySelector = document.getElementById('currencySelector');
if (currencySelector) {
    currencySelector.value = currentCurrency;
    currencySelector.addEventListener('change', async function() {
        showSyncingOverlay && showSyncingOverlay(); // Optional: show overlay if defined
        try {
            currentCurrency = this.value;
            currencysigns = currencySymbols[currentCurrency] || 'FCFA';   // ✅ Fixed: get symbol, not code
            localStorage.setItem('currency', currentCurrency);
            localStorage.setItem('currencysigns', currencysigns);
            updateCurrencyLabels();
            renderStock();
            renderSales();
            drawWeeklySalesChart();
            drawMonthlySalesChart();
            calculateProfitLoss();

            businessInfo.currency = currentCurrency;
            await saveBusinessSettings();
            showMessageModal(translate('currency_changed_to') + currentCurrency + currencysigns);
        } finally {
            hideSyncingOverlay && hideSyncingOverlay(); // Optional: hide overlay if defined
        }
    });
}

const businessNameCounter = document.getElementById('businessNameCounter');
const businessNameWarning = document.getElementById('businessNameWarning');

// Set max length attribute
businessNameInput.setAttribute('maxlength', '26');

// Update counter on input
businessNameInput.addEventListener('input', function() {
    const currentLength = this.value.length;
    const maxLength = 26;
    
    // Update counter text - keep as is since it's dynamic
    businessNameCounter.textContent = `${currentLength}/${maxLength} ${translate('characters')}`;
    
    // Show warning if near or at limit
    if (currentLength >= maxLength) {
        businessNameCounter.classList.add('text-red-500', 'font-bold');
        businessNameCounter.classList.remove('text-gray-500');
        businessNameWarning.classList.remove('hidden');
        showMessageModal(translate('business_name_max_length'));
        
        // Prevent further input if somehow exceeds
        if (currentLength > maxLength) {
            this.value = this.value.substring(0, maxLength);
        }
    } else if (currentLength >= maxLength - 5) {
        // Warning when approaching limit
        businessNameCounter.classList.add('text-orange-500', 'font-medium');
        businessNameCounter.classList.remove('text-gray-500', 'text-red-500', 'font-bold');
        businessNameWarning.classList.add('hidden');
    } else {
        // Normal state
        businessNameCounter.classList.remove('text-red-500', 'text-orange-500', 'font-bold', 'font-medium');
        businessNameCounter.classList.add('text-gray-500');
        businessNameWarning.classList.add('hidden');
    }
});

// Also check on page load if there's already a value
if (businessNameInput.value) {
    businessNameInput.dispatchEvent(new Event('input'));
}

// Prevent paste from exceeding limit
businessNameInput.addEventListener('paste', function(e) {
    const pastedText = e.clipboardData.getData('text');
    const currentText = this.value;
    const newText = currentText + pastedText;
    
    if (newText.length > 25) {
        e.preventDefault();
        // Only allow paste up to the limit
        const allowedPaste = pastedText.substring(0, 25 - currentText.length);
        this.value = currentText + allowedPaste;
        // Trigger input event to update counter
        this.dispatchEvent(new Event('input'));
    }
});

function initializeBusinessDetailsCounter() {
    const businessDetailsInput = document.getElementById('businessDetailsInput');
    const businessDetailsCounter = document.getElementById('businessDetailsCounter');
    
    if (!businessDetailsInput || !businessDetailsCounter) return;

    updateBusinessDetailsCounter();
    businessDetailsInput.addEventListener('input', updateBusinessDetailsCounter);
    
    function updateBusinessDetailsCounter() {
        const currentLength = businessDetailsInput.value.length;
        const maxLength = 159;
        
        // Update counter text - keep as is since it's dynamic
        businessDetailsCounter.textContent = `${currentLength}/${maxLength}`;
        
        // Change color if approaching or exceeding limit
        if (currentLength >= maxLength) {
            businessDetailsCounter.classList.remove('text-gray-500', 'text-yellow-500');
            businessDetailsCounter.classList.add('text-red-500', 'font-bold');
            showMessageModal(translate('business_details_max_length'));
        } else if (currentLength >= maxLength - 10) { // Last 10 characters
            businessDetailsCounter.classList.remove('text-gray-500', 'text-red-500');
            businessDetailsCounter.classList.add('text-yellow-500');
        } else {
            businessDetailsCounter.classList.remove('text-red-500', 'text-yellow-500', 'font-bold');
            businessDetailsCounter.classList.add('text-gray-500');
        }
    }
}



/**
 * Shows a modal prompting for business email (required) and website (optional).
 * @returns {Promise<{email: string, website: string} | null>} - Resolves with entered data or null if cancelled.
 */
function showBusinessInfoPrompt() {
    return new Promise((resolve) => {
        const modal = document.getElementById('businessInfoModal');
        const emailInput = document.getElementById('businessEmailInput');
        const websiteInput = document.getElementById('businessWebsiteInput');
        const confirmBtn = document.getElementById('businessInfoConfirmBtn');
        const cancelBtn = document.getElementById('businessInfoCancelBtn');
        
        // Clear previous values
        emailInput.value = '';
        websiteInput.value = '';
        
        // Show modal and add 'active' class
        modal.classList.remove('hidden');
        modal.classList.add('active');  // Add active class for styling
        emailInput.focus();
        
        const cleanup = () => {
            modal.classList.add('hidden');
            modal.classList.remove('active');
            confirmBtn.removeEventListener('click', confirmHandler);
            cancelBtn.removeEventListener('click', cancelHandler);
            emailInput.removeEventListener('keypress', keyHandler);
        };
        
        const confirmHandler = () => {
            const email = emailInput.value.trim();
            const website = websiteInput.value.trim();
            
            if (!email) {
                // Show error inside modal
                const errorMsg = document.createElement('p');
                errorMsg.className = 'text-red-500 text-sm mt-2';
                errorMsg.innerText = translate('email_required') || 'Email is required.';
                modal.querySelector('.bg-white').appendChild(errorMsg);
                setTimeout(() => errorMsg.remove(), 2000);
                emailInput.focus();
                return;
            }
            
            if (!email.includes('@')) {
                const errorMsg = document.createElement('p');
                errorMsg.className = 'text-red-500 text-sm mt-2';
                errorMsg.innerText = translate('invalid_email_format') || 'Please enter a valid email address.';
                modal.querySelector('.bg-white').appendChild(errorMsg);
                setTimeout(() => errorMsg.remove(), 2000);
                emailInput.focus();
                return;
            }
            
            cleanup();
            resolve({ email, website });
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
        emailInput.addEventListener('keypress', keyHandler);
    });
}