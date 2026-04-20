class EmailScheduler {
    constructor() {
        this.currentSchedule = null;
        this.isEnabled = false;
        this.setupStatus = null;
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadSettings();
        this.checkSetupStatus();
        this.checkEmailScheduleStatus();
    }
 
bindEvents() {
    // Modal controls
    const openSchedulerBtn = document.getElementById('openSchedulerBtn');
    if (openSchedulerBtn) {
        openSchedulerBtn.addEventListener('click', () => this.openScheduler());
    }

    const closeSchedulerModal = document.getElementById('closeSchedulerModal');
    if (closeSchedulerModal) {
        closeSchedulerModal.addEventListener('click', () => this.closeScheduler());
    }

    const closeEmailModal = document.getElementById('closeEmailModal');
    if (closeEmailModal) {
        closeEmailModal.addEventListener('click', () => this.closeEmailSettings());
    }

    // Schedule buttons
    document.querySelectorAll('.schedule-option').forEach(btn => {
        btn.addEventListener('click', (e) => 
            this.selectSchedule(e.target.closest('[data-schedule]').dataset.schedule)
        );
    });

    // Action buttons
    const saveScheduleBtn = document.getElementById('saveScheduleBtn');
    if (saveScheduleBtn) {
        saveScheduleBtn.addEventListener('click', () => this.saveSchedule());
    }

    const pauseScheduleBtn = document.getElementById('pauseScheduleBtn');
    if (pauseScheduleBtn) {
        pauseScheduleBtn.addEventListener('click', () => this.togglePause());
    }

    const testEmailBtn = document.getElementById('testEmailBtn');
    if (testEmailBtn) {
        testEmailBtn.addEventListener('click', () => this.sendTestEmail());
    }

    const sendNowBtn = document.getElementById('sendNowBtn');
    if (sendNowBtn) {
        sendNowBtn.addEventListener('click', () => this.sendNow());
    }

    const completeSetupBtn = document.getElementById('completeSetupBtn');
    if (completeSetupBtn) {
        completeSetupBtn.addEventListener('click', () => this.completeSetup());
    }

    const saveEmailSettingsBtn = document.getElementById('saveEmailSettingsBtn');
    if (saveEmailSettingsBtn) {
        saveEmailSettingsBtn.addEventListener('click', () => this.saveEmailSettings());
    }


    // Close modals on overlay click
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                this.closeScheduler();
                this.closeEmailSettings();
            }
        });
    });
}

    async loadSettings() {
        try {
            const response = await fetch(`${API_BASE}/api/settings/email`);
            if (response.ok) {
                const settings = await response.json();
                this.populateSettings(settings);
            }
        } catch (error) {
            console.error('Failed to load email settings:', error);
            showMessageModal(translate('error_loading_email_settings'), 'error');
        }
    }

    async checkSetupStatus() {
        try {
            const response = await fetch(`${API_BASE}/api/setup-status`);
            if (response.ok) {
                const setup = await response.json();
                this.setupStatus = setup;
                this.updateSetupUI(setup);
            }
        } catch (error) {
            console.error('Failed to check setup status:', error);
        }
    }

    async checkEmailScheduleStatus() {
        try {
            const response = await fetch(`${API_BASE}/api/email-schedule-status`);
            if (response.ok) {
                const status = await response.json();
                this.updateScheduleUI(status);
            }
        } catch (error) {
            console.error('Failed to check schedule status:', error);
        }
    }

    updateSetupUI(setup) {
        const statusCard = document.getElementById('setupStatusCard');
        const statusIcon = document.getElementById('setupStatusIcon');
        const statusText = document.getElementById('setupStatusText');
        const completeBtn = document.getElementById('completeSetupBtn');

        if (!setup.isFirstTime && setup.completedAt) {
            // Setup complete
            statusCard.classList.remove('hidden');
            statusIcon.innerHTML = `
                <svg class="w-5 h-5 text-green-600" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
                </svg>
            `;
            statusIcon.className = 'w-8 h-8 rounded-full bg-green-100 flex items-center justify-center mr-3';
            statusText.textContent = translate('setup_completed_on') + ' ' + new Date(setup.completedAt).toLocaleDateString();
            completeBtn.classList.add('hidden');
        } else {
            // Setup incomplete
            statusCard.classList.remove('hidden');
            statusIcon.innerHTML = `
                <svg class="w-5 h-5 text-yellow-600" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/>
                </svg>
            `;
            statusIcon.className = 'w-8 h-8 rounded-full bg-yellow-100 flex items-center justify-center mr-3';
            statusText.textContent = translate('complete_setup_to_enable');
            completeBtn.classList.remove('hidden');
        }
    }

updateScheduleUI(status) {
    console.log('📊 updateScheduleUI received:', status);
    
    this.isEnabled = status.isEnabled;
    this.currentSchedule = status.frequency;
    
    // Update status badge
    const badge = document.getElementById('scheduleStatusBadge');
    if (badge) {
        if (this.isEnabled) {
            badge.textContent = translate('active_status') || "Active";
            badge.className = 'px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800';
        } else {
            badge.textContent = translate('inactive_status') || "Paused";
            badge.className = 'px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800';
        }
    }

    // Update the Pause/Resume Button
    const pauseBtn = document.getElementById('pauseScheduleBtn');
    if (pauseBtn) {
        if (this.isEnabled) {
            pauseBtn.innerHTML = `<span>${translate('pause_all_emails_btn') || 'Pause All Emails'}</span>`;
            pauseBtn.className = 'w-full bg-gray-200 hover:bg-gray-300 text-base font-bold py-3 rounded-lg transition-colors';
        } else {
            pauseBtn.innerHTML = `<span>${translate('resume_scheduling_btn') || 'Resume Scheduling'}</span>`;
            pauseBtn.className = 'w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-lg transition-colors';
        }
    }

    // CRITICAL FIX: Force boolean conversion and log values
    const lowStockEnabled = status.lowStockEnabled === true;
    const restockEnabled = status.restockEnabled === true;
    
    console.log('🔍 Alert Status:', {
        rawLowStock: status.lowStockEnabled,
        rawRestock: status.restockEnabled,
        lowStockEnabled,
        restockEnabled,
        typeOfLowStock: typeof status.lowStockEnabled,
        typeOfRestock: typeof status.restockEnabled
    });
    
    // Update Low Stock Status with explicit text and styling
    const lowStockElement = document.getElementById('lowStockStatus');
    if (lowStockElement) {
        // Force update regardless of current value
        lowStockElement.textContent = lowStockEnabled ? 'Enabled' : 'Disabled';
        lowStockElement.className = lowStockEnabled ? 
            'px-2 py-1  text-green-800 rounded text-sm font-medium' : 
            'px-2 py-1  text-gray-800 rounded text-sm font-medium';
        
        console.log('📝 Low Stock Element Updated:', {
            element: lowStockElement,
            text: lowStockElement.textContent,
            className: lowStockElement.className,
            shouldBeEnabled: lowStockEnabled
        });
    } else {
        console.error('❌ Low Stock Status element not found!');
    }
    
    // Update Restock Status with explicit text and styling
    const restockElement = document.getElementById('restockStatus');
    if (restockElement) {
        // Force update regardless of current value
        restockElement.textContent = restockEnabled ? 'Enabled' : 'Disabled';
        restockElement.className = restockEnabled ? 
            'px-2 py-1  text-green-800 rounded text-sm font-medium' : 
            'px-2 py-1 text-gray-800 rounded text-sm font-medium';
        
        console.log('📝 Restock Element Updated:', {
            element: restockElement,
            text: restockElement.textContent,
            className: restockElement.className,
            shouldBeEnabled: restockEnabled
        });
    } else {
        console.error('❌ Restock Status element not found!');
    }
    
    // Update last email date
    const lastEmailElement = document.getElementById('lastEmailDate');
    if (lastEmailElement) {
        if (status.lastEmailSentDate) {
            try {
                const date = new Date(status.lastEmailSentDate);
                // Format as DD/MM/YYYY HH:MM:SS to match your example
                const day = String(date.getDate()).padStart(2, '0');
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const year = date.getFullYear();
                const hours = String(date.getHours()).padStart(2, '0');
                const minutes = String(date.getMinutes()).padStart(2, '0');
                const seconds = String(date.getSeconds()).padStart(2, '0');
                
                lastEmailElement.textContent = `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
            } catch (e) {
                console.error('Error formatting date:', e);
                lastEmailElement.textContent = status.lastEmailSentDate || 'Never';
            }
        } else {
            lastEmailElement.textContent = 'Never';
        }
    }
    
    // Update next check time
    const nextCheckElement = document.getElementById('nextCheckTime');
    if (nextCheckElement) {
        nextCheckElement.textContent = this.calculateNextCheckTime(
            status.lastEmailSentDate, 
            status.frequency
        );
    }
    
    // Update selected schedule in UI
    if (status.frequency) {
        this.selectSchedule(status.frequency);
    }
}

calculateNextCheckTime(lastSentStr, frequency) {
    if (!lastSentStr || lastSentStr === "Never" || lastSentStr === "never_text") {
        return "Waiting for first send...";
    }

    try {
        // Parse the ISO date string properly
        const lastSent = new Date(lastSentStr);
        
        // Check if date is valid
        if (isNaN(lastSent.getTime())) {
            console.error('Invalid date:', lastSentStr);
            return "Invalid date";
        }
        
        console.log('📅 Calculating next check from:', {
            lastSentStr,
            lastSent: lastSent.toISOString(),
            frequency
        });
        
        let nextCheck = new Date(lastSent);

        // Add the frequency interval
        if (frequency === 'daily') {
            nextCheck.setDate(lastSent.getDate() + 1);
        } else if (frequency === 'every3days') {
            nextCheck.setDate(lastSent.getDate() + 3);
        } else if (frequency === 'weekly') {
            nextCheck.setDate(lastSent.getDate() + 7);
        } else {
            return "Unknown frequency";
        }

        // Set to beginning of the day
        nextCheck.setHours(0, 0, 0, 0);
        
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        
        console.log('📅 Comparison:', {
            nextCheck: nextCheck.toISOString(),
            now: now.toISOString(),
            isDue: nextCheck <= now
        });
        
        // If the next check time is today or earlier, it's due now
        if (nextCheck <= now) {
            return "Due Now";
        }

        // Format as DD/MM/YYYY HH:MM
        const day = String(nextCheck.getDate()).padStart(2, '0');
        const month = String(nextCheck.getMonth() + 1).padStart(2, '0');
        const year = nextCheck.getFullYear();
        const hours = String(nextCheck.getHours()).padStart(2, '0');
        const minutes = String(nextCheck.getMinutes()).padStart(2, '0');
        
        return `${day}/${month}/${year} ${hours}:${minutes}`;
    } catch (error) {
        console.error('Error calculating next check time:', error);
        return "Unknown";
    }
}

populateSettings(settings) {
    const emailInput = document.getElementById('alertEmail');
    if (emailInput && settings.email) emailInput.value = settings.email;

    // Populate alert type checkboxes
    if (settings.alertTypes) {
        const lowStockCheckbox = document.getElementById('enableLowStock');
        const restockCheckbox = document.getElementById('enableRestock');
        const expiryCheckbox = document.getElementById('enableExpiry');

        if (lowStockCheckbox) lowStockCheckbox.checked = settings.alertTypes.lowStock === true;
        if (restockCheckbox) restockCheckbox.checked = settings.alertTypes.restock === true;
        if (expiryCheckbox) expiryCheckbox.checked = settings.alertTypes.expiry === true;
    }
}

    selectSchedule(scheduleType) {
        // Remove active class from all schedule options
        document.querySelectorAll('.schedule-option').forEach(option => {
            option.classList.remove('active');
        });
        
        // Add active class to selected option
        const selectedOption = document.querySelector(`[data-schedule="${scheduleType}"]`);
        if (selectedOption) {
            selectedOption.classList.add('active');
            this.currentSchedule = scheduleType;
        }
    }

    async saveSchedule() {
        if (!this.currentSchedule) {
            showMessageModal(translate('select_schedule_warning'), 'warning');
            return;
        }

        try {
            const response = await fetch(`${API_BASE}/api/schedule-emails`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ schedule: this.currentSchedule })
            });

            const result = await response.json();
            
            if (result.success) {
                showMessageModal(translate('schedule_saved_success'), 'success');
                this.closeScheduler();
                setTimeout(() => this.checkEmailScheduleStatus(), 1000);
            } else {
                showMessageModal(result.message || translate('schedule_save_failed'), 'error');
            }
        } catch (error) {
            showMessageModal(translate('schedule_save_error'), 'error');
        }
    }

async togglePause() {
        const nextState = !this.isEnabled; // Calculate what we WANT it to be
        
        try {
            const response = await fetch(`${API_BASE}/api/schedule-emails`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    enabled: nextState,
                    frequency: this.currentSchedule,
                    // Pull the current email from the input field or stored setting
                    email: document.getElementById('alertEmail')?.value || this.email 
                })
            });

            const result = await response.json();
            if (result.success) {
                // Let the refresh update the buttons correctly
                this.checkEmailScheduleStatus(); 
                
                const msg = nextState ? translate('email_scheduling_resumed') : translate('email_scheduling_paused');
                showMessageModal(msg, nextState ? 'success' : 'warning');
            }
        } catch (error) {
            console.error("Toggle Error:", error);
            showMessageModal(translate('toggle_schedule_error'), 'error');
        }
    }
    async sendTestEmail() {
        const btn = document.getElementById('testEmailBtn');
        const originalText = btn.innerHTML;
        
        btn.innerHTML = '<div class="loading-spinner"></div>';
        btn.disabled = true;

        try {
            const response = await fetch(`${API_BASE}/api/send-test-email`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });

            const result = await response.json();
            
            if (result.success) {
                showMessageModal(translate('test_email_sent_success'), 'success');
            } else {
                showMessageModal(result.message || translate('test_email_failed'), 'error');
            }
        } catch (error) {
            showMessageModal(translate('test_email_error'), 'error');
        } finally {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    }

    async sendNow() {
        const btn = document.getElementById('sendNowBtn');
        const originalText = btn.innerHTML;
        
        btn.innerHTML = '<div class="loading-spinner"></div>';
        btn.disabled = true;

        try {
            const response = await fetch(`${API_BASE}/api/send-emails-now`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });

            const result = await response.json();
            
            if (result.success) {
                showMessageModal(translate('emails_sent_success'), 'success');
                this.updateScheduleUI({ lastEmailSentDate: new Date().toLocaleDateString() });
            } else {
                showMessageModal(result.message || translate('emails_send_failed'), 'error');
            }
        } catch (error) {
            showMessageModal(translate('emails_send_error'), 'error');
        } finally {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    }

async completeSetup() {
    try {
        // 1. Try to get business info from the global object (already loaded)
        let businessName = '';
        let ownerName = '';

        if (window.businessInfo && window.businessInfo.name) {
            businessName = window.businessInfo.name;
            ownerName = window.businessInfo.ownerName || 'Admin';
        } else {
            // 2. Fallback: fetch business info from the server
            const bizRes = await fetch(`${API_BASE}/api/business-info`);
            if (bizRes.ok) {
                const bizData = await bizRes.json();
                businessName = bizData.name || '';
                ownerName = bizData.ownerName || '';
            }
        }

        // 3. Use defaults if still empty
        if (!businessName) businessName = 'My Business';
        if (!ownerName) ownerName = 'Admin';

        // 4. Call the fix endpoint
        const response = await fetch(`${API_BASE}/api/admin/fix-setup-status`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ businessName, ownerName })
        });

        const result = await response.json();
        if (result.success) {
            showMessageModal(
                translate('setup_completed_success') || 'Setup marked as complete!',
                'success'
            );
            this.checkSetupStatus(); // refresh UI
            this.closeScheduler();   // close the modal
        } else {
            showMessageModal(result.message || translate('setup_complete_failed'), 'error');
        }
    } catch (error) {
        console.error('Error completing setup:', error);
        showMessageModal(translate('setup_complete_error'), 'error');
    }
}

    async saveEmailSettings() {
        const email = document.getElementById('alertEmail').value;
        const enableLowStock = document.getElementById('enableLowStock').checked;
        const enableRestock = document.getElementById('enableRestock').checked;
        const enableExpiry = document.getElementById('enableExpiry').checked;

        if (!email || !email.includes('@')) {
            showMessageModal(translate('valid_email_required'), 'warning');
            return;
        }

        const settings = {
            email: email,
            enabled: true,
            alertTypes: {
                lowStock: enableLowStock,
                restock: enableRestock,
                expiry: enableExpiry
            }
        };

        try {
            const response = await fetch(`${API_BASE}/api/settings/email`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(settings)
            });
                await fetch(`${API_BASE}/api/schedule-emails`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: email })
                });
            if (response.ok) {
                showMessageModal(translate('email_settings_saved'), 'success');
                this.closeEmailSettings();
            } else {
                const error = await response.json();
                showMessageModal(error.message || translate('email_settings_save_failed'), 'error');
            }
        } catch (error) {
            showMessageModal(translate('email_settings_save_error'), 'error');
        }
    }

    openScheduler() {
        document.getElementById('emailSchedulerModal').classList.remove('hidden');
        console.log('📅 Opened Scheduler Modal. Current Schedule:', this.currentSchedule);
        this.checkEmailScheduleStatus();
    }

    closeScheduler() {
        document.getElementById('emailSchedulerModal').classList.add('hidden');
    }

    openEmailSettings() {
        document.getElementById('emailSettingsModal').classList.remove('hidden');
        this.loadSettings();
    }

    closeEmailSettings() {
        document.getElementById('emailSettingsModal').classList.add('hidden');
    }
}

// Initialize when DOM is loaded
    document.addEventListener('DOMContentLoaded', () => {
        new EmailScheduler();
    });