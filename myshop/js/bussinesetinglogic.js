

async function checkAndPromptBusinessInfo() {
    // Load current business info from memory or Supabase
    let currentInfo = businessInfo;
    
    if (!currentInfo || !currentInfo.name) {
        try {
            const client = getSB();
            if (client) {
                const { data, error } = await client
                    .from('business_info')
                    .select('*')
                    .limit(1)
                    .maybeSingle();

                if (!error && data) {
                    currentInfo = data;
                    businessInfo = data; // Update global variable
                    
                    // ========== CACHE BUSINESS ID ==========
                    if (data.id) {
                        localStorage.setItem('businessId', data.id);
                        console.log('🔍 Cached business_id:', data.id);
                    }
                }
            }
        } catch (e) { 
            console.warn('Could not fetch business info', e); 
        }
    }

    // ========== CACHE EXISTING BUSINESS ID ==========
    if (currentInfo?.id) {
        localStorage.setItem('businessId', currentInfo.id);
    }

    // If name or email is missing, prompt the user
    if (!currentInfo || !currentInfo.name || currentInfo.name.trim() === '' || 
        !currentInfo.email || currentInfo.email.trim() === '') {
        
        const result = await showBusinessInfoPrompt();
        
        if (result && result.email) {
            // Only update email and website – keep everything else
            const updated = { 
                ...currentInfo, 
                email: result.email, 
                website: result.website || currentInfo?.website || '' 
            };

            try {
                const client = getSB();
                if (!client) throw new Error('Database not connected');

                // Check if business info already exists
                const { data: existingBiz } = await client
                    .from('business_info')
                    .select('id')
                    .limit(1)
                    .maybeSingle();

                let saveError = null;
                let savedId = existingBiz?.id;

                if (existingBiz) {
                    // Update existing record
                    const { error } = await client
                        .from('business_info')
                        .update({
                            email: updated.email,
                            website: updated.website
                        })
                        .eq('id', existingBiz.id);
                    saveError = error;
                } else {
                    // Insert new record with defaults
                    const { data: newBiz, error } = await client
                        .from('business_info')
                        .insert([{
                            name: currentInfo?.name || 'My Business',
                            email: updated.email,
                            website: updated.website,
                            setup_completed: true,
                            created_at: new Date().toISOString()
                        }])
                        .select()
                        .single();
                    saveError = error;
                    if (newBiz) savedId = newBiz.id;
                }

                if (saveError) throw saveError;

                // Update global variable with ID
                businessInfo = { ...updated, id: savedId };
                
                // Save to localStorage
                localStorage.setItem('businessInfo', JSON.stringify(businessInfo));
                if (savedId) localStorage.setItem('businessId', savedId);
                
                console.log('🔍 Business info saved, business_id:', savedId);
                
                showMessageModal(
                    translate('business_info_saved') || 'Business email saved successfully!',
                    'success'
                );

            } catch (err) {
                console.error('Failed to save email/website:', err);
                showMessageModal(
                    translate('error_saving_info') || 'Could not save email. You can update it later in Settings.',
                    'error'
                );
            }
        } else if (result === null) {
            // User cancelled the prompt
            showMessageModal(
                translate('fill_business_info_continue') || 'Please provide your business email later in Settings.',
                'warning'
            );
        }
    }
}

function showBusinessSettingsModal() {
    hideAllStockSubSections();
    hideAllSalesSubSections();
    hideHomeOverlay();

    // Populate form fields from businessInfo
    businessNameInput.value = businessInfo.name || '';
    addressInput.value = businessInfo.address || ''; 
    shopNumberInput.value = businessInfo.shopNumber || '';
    phoneNumberTwoInput.value = businessInfo.phoneNumberTwo || ''; 
    emailInput.value = businessInfo.email || ''; 
    WebsiteInput.value = businessInfo.website || businessInfo.Website || ''; 
    socialMediaHandlesInput.value = businessInfo.socialMediaHandles || '';
    document.getElementById('warrantyDurationInput').value = businessInfo.warrantyDuration || 0;
    document.getElementById('warrantyUnitSelect').value = businessInfo.warrantyUnit || 'days';
    document.getElementById('warrantyTextInput').value = businessInfo.warrantyText || '';
    document.getElementById('businessDetailsInput').value = businessInfo.details || ''; 
    document.getElementById('businessFontStyleInput').value = businessInfo.fontStyle || 'default';

    // Logo - check both logo_url (Supabase) and logoData (old format)
    const logoUrl = businessInfo.logo_url || businessInfo.logoData || '';
    if (logoUrl) {
        // If it's already a full URL (from Supabase Storage), use as-is
        // If it's a relative path (old format), it won't work on web - show placeholder
        if (logoUrl.startsWith('http')) {
            logoPreview.src = logoUrl;
        } else {
            logoPreview.src = logoUrl; // Will try to load, may fail gracefully
        }
        logoPreview.classList.remove('hidden');
    } else {
        logoPreview.classList.add('hidden');
    }
    logoFileInput.value = '';

    // Festive badge toggle
    const badgeToggle = document.getElementById('toggleBadgeswithc');
    if (badgeToggle) {
        badgeToggle.checked = businessInfo.festiveBadgeEnabled || false;
    }

    // Initialize character counter
    initializeBusinessDetailsCounter();

    openModal('businessSettingsModal');
    
    if (typeof hideLoading === 'function') hideLoading();
}

function closeBusinessSettingsModal() {
    businessSettingsModal.classList.add('hidden');
     businessSettingsModal.classList.remove('show');
    document.body.style.overflow = '';
    showHomeOverlay();

    setTimeout(() => {
        businessSettingsModal.classList.add('hidden');
    }, 300);
}
function closeBusinessModal() {
    businessSettingsModal.classList.add('hidden');
     businessSettingsModal.classList.remove('show');
    document.body.style.overflow = '';
  ;

    setTimeout(() => {
        businessSettingsModal.classList.add('hidden');
    }, 300);
}
async function saveBusinessSettings() { 
    if (typeof showLoading === 'function') showLoading(translate('saving_settings'));
    
    const updatedBusinessInfo = { ...businessInfo };

    // Text fields
    updatedBusinessInfo.name = businessNameInput.value.trim();
    updatedBusinessInfo.address = addressInput.value.trim();
    updatedBusinessInfo.shopNumber = shopNumberInput.value.trim();
    updatedBusinessInfo.phoneNumberTwo = phoneNumberTwoInput.value.trim();
    updatedBusinessInfo.email = emailInput.value.trim();
    updatedBusinessInfo.website = WebsiteInput.value.trim();
    updatedBusinessInfo.socialMediaHandles = socialMediaHandlesInput.value.trim();
    updatedBusinessInfo.details = document.getElementById('businessDetailsInput').value;
    updatedBusinessInfo.currency = currentCurrency;
    updatedBusinessInfo.warrantyDuration = parseInt(warrantyDurationInput.value, 10) || 0;
    updatedBusinessInfo.warrantyUnit = warrantyUnitSelect.value;
    updatedBusinessInfo.warrantyText = warrantyTextInput.value.trim();
    updatedBusinessInfo.language = currentLanguage;
    updatedBusinessInfo.festiveBadgeEnabled = document.getElementById('toggleBadgeswithc')?.checked || false;
    updatedBusinessInfo.currentBadgeIndex = currentBadgeIndex;

    const businessFontStyleInput = document.getElementById('businessFontStyleInput');
    if (businessFontStyleInput) {
        updatedBusinessInfo.fontStyle = businessFontStyleInput.value;
    }

// ========== UPLOAD LOGO TO CLOUDINARY ==========
const logoFile = logoFileInput.files[0]; 

// Upload logo with Cloudinary
if (logoFile) {
    try {
        const client = getSB();
        if (!client) throw new Error('Database not connected');
        
        // Get business ID for organization
        const currentBusinessId = currentUser?.business_id || businessInfo?.id || localStorage.getItem('businessId') || 'general';
        
        // Show uploading status (optional)
        if (typeof showLoading === 'function') {
            showLoading('📸 Uploading logo...');
        }
        
        // Upload to Cloudinary
        const uploadResult = await uploadToCloudinary(logoFile, {
            folder: `businesses/${currentBusinessId}/logos`,
            publicId: `logo_${Date.now()}`
        });
        
        updatedBusinessInfo.logo_url = uploadResult.url;
        updatedBusinessInfo.logoData = uploadResult.url;
        console.log('✅ Logo uploaded successfully to Cloudinary:', uploadResult.url);
        
    } catch (error) {
        console.error('Logo upload error:', error);
        showMessageModal(translate('failed_upload_logo') || 'Failed to upload logo: ' + error.message);
        if (typeof hideLoading === 'function') hideLoading();
        return;
    }
}
    // ========== SAVE TO SUPABASE ==========
    try {
        const client = getSB();
        if (!client) throw new Error('Database not connected');

        // Map to Supabase column names
        const supabaseData = {
            name: updatedBusinessInfo.name,
            address: updatedBusinessInfo.address,
            phone: updatedBusinessInfo.shopNumber,
            email: updatedBusinessInfo.email,
            website: updatedBusinessInfo.website,
            details: updatedBusinessInfo.details,
            logo_url: updatedBusinessInfo.logo_url || updatedBusinessInfo.logoData || '',
            currency: updatedBusinessInfo.currency,
            language: updatedBusinessInfo.language || updatedBusinessInfo.currentLanguage,
            setup_completed: true,
            updated_at: new Date().toISOString()
        };

        // Check if business info already exists
        const { data: existingBiz } = await client
            .from('business_info')
            .select('id')
            .limit(1)
            .maybeSingle();

        let saveError;
        let savedId = existingBiz?.id;

        if (existingBiz) {
            const { error } = await client
                .from('business_info')
                .update(supabaseData)
                .eq('id', existingBiz.id);
            saveError = error;
        } else {
            const { data: newBiz, error } = await client
                .from('business_info')
                .insert([{ ...supabaseData, created_at: new Date().toISOString() }])
                .select()
                .single();
            saveError = error;
            if (newBiz) savedId = newBiz.id;
        }

        if (saveError) throw saveError;

        // ========== UPDATE LOCAL STATE & CACHE BUSINESS ID ==========
        updatedBusinessInfo.id = savedId;
        businessInfo = updatedBusinessInfo;
        
        localStorage.setItem('businessInfo', JSON.stringify(businessInfo));
        if (savedId) {
            localStorage.setItem('businessId', savedId);
            console.log('🔍 Business settings saved, business_id cached:', savedId);
        }

        // Apply font style if changed
        if (businessInfo.fontStyle && typeof applyBusinessFontStyle === 'function') {
            applyBusinessFontStyle(businessInfo.fontStyle);
        }

        if (typeof hideLoading === 'function') hideLoading();
        showMessageModal(translate('business_settings_saved') || 'Business settings saved successfully!');
        closeBusinessSettingsModal();
        
        if (typeof updatePrintLayoutInfo === 'function') updatePrintLayoutInfo();
        if (typeof updateHomeLogo === 'function') updateHomeLogo();
        if (typeof loadData === 'function') await loadData();

    } catch (error) {
        console.error('Error saving business settings:', error);
        showMessageModal(error.message || translate('failed_save_business_settings') || 'Failed to save settings');
        if (typeof hideLoading === 'function') hideLoading();
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