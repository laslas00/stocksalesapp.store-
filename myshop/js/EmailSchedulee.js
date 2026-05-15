class EmailScheduler {
    constructor() {
        this.currentSchedule = null;
        this.isEnabled = false;
        this.setupStatus = null;
        this.email = '';
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

    // ==================== SUPABASE HELPER ====================
    _getClient() {
        if (typeof getSB === 'function') return getSB();
        if (window.supabase?.createClient) {
            const SUPABASE_URL =window.ENV?.MYSHOPSUPABASE_URL || 'https://zexxdoxuzvkovszfqcio.supabase.co';
            const SUPABASE_ANON_KEY = window.ENV?.MYSHOPSUPABASE_ANON_KEY || 'your-anon-key-here';
            return window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        }
        return null;
    }

// ==================== LOAD SETTINGS ====================
async loadSettings() {
    try {
        const client = this._getClient();
        if (!client) return;

        const businessId = window.businessInfo?.id || localStorage.getItem('businessId');
        if (!businessId) {
            console.warn('No business ID found for loading settings');
            return;
        }

        const { data, error } = await client
            .from('business_info')
            .select('email, alert_types, email_schedule')
            .eq('id', businessId)
            .maybeSingle();

        if (error) throw error;
        
        this.email = data?.email || '';
        const alertTypes = data?.alert_types || {};
        const schedule = data?.email_schedule || {};

        this.populateSettings({
            email: data?.email,
            alertTypes: {
                lowStock: alertTypes.lowStock === true,
                restock: alertTypes.restock === true,
                expiry: alertTypes.expiry === true
            }
        });

        this.currentSchedule = schedule.frequency || null;
        this.isEnabled = schedule.enabled === true;

    } catch (error) {
        console.error('Failed to load email settings:', error);
    }
}

// ==================== CHECK SETUP STATUS ====================
async checkSetupStatus() {
    try {
        const client = this._getClient();
        if (!client) return;

        const businessId = window.businessInfo?.id || localStorage.getItem('businessId');
        if (!businessId) {
            // No business ID - check localStorage
            const localSetup = localStorage.getItem('StockApp_setup');
            if (localSetup) {
                const setup = JSON.parse(localSetup);
                this.setupStatus = {
                    isFirstTime: setup.isFirstTime !== false,
                    completedAt: setup.completedAt || null,
                    businessName: setup.businessName || ''
                };
                this.updateSetupUI(this.setupStatus);
            }
            return;
        }

        const { data, error } = await client
            .from('business_info')
            .select('setup_completed, created_at, name')
            .eq('id', businessId)
            .maybeSingle();

        if (error) throw error;

        this.setupStatus = {
            isFirstTime: !data?.setup_completed,
            completedAt: data?.setup_completed ? data.created_at : null,
            businessName: data?.name || ''
        };
        this.updateSetupUI(this.setupStatus);

    } catch (error) {
        console.error('Failed to check setup status:', error);
    }
}

// ==================== CHECK EMAIL SCHEDULE STATUS ====================
async checkEmailScheduleStatus() {
    try {
        const client = this._getClient();
        if (!client) return;

        const businessId = window.businessInfo?.id || localStorage.getItem('businessId');
        if (!businessId) {
            console.warn('No business ID for schedule check');
            return;
        }

        const { data, error } = await client
            .from('business_info')
            .select('email_schedule, email, alert_types')
            .eq('id', businessId)
            .maybeSingle();

        if (error) throw error;

        const schedule = data?.email_schedule || {};
        const alertTypes = data?.alert_types || {};

        const status = {
            isEnabled: schedule.enabled === true,
            frequency: schedule.frequency || 'daily',
            lastEmailSentDate: schedule.last_sent || null,
            lowStockEnabled: alertTypes.lowStock === true,
            restockEnabled: alertTypes.restock === true,
            email: data?.email || ''
        };

        this.updateScheduleUI(status);

    } catch (error) {
        console.error('Failed to check schedule status:', error);
    }
}

    // ==================== UPDATE SETUP UI ====================
    updateSetupUI(setup) {
        const statusCard = document.getElementById('setupStatusCard');
        const statusIcon = document.getElementById('setupStatusIcon');
        const statusText = document.getElementById('setupStatusText');
        const completeBtn = document.getElementById('completeSetupBtn');

        if (!statusCard) return;

        if (!setup.isFirstTime && setup.completedAt) {
            statusCard.classList.remove('hidden');
            if (statusIcon) {
                statusIcon.innerHTML = `
                    <svg class="w-5 h-5 text-green-600" viewBox="0 0 20 20" fill="currentColor">
                        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
                    </svg>`;
                statusIcon.className = 'w-8 h-8 rounded-full bg-green-100 flex items-center justify-center mr-3';
            }
            if (statusText) statusText.textContent = (translate('setup_completed_on') || 'Setup completed on') + ' ' + new Date(setup.completedAt).toLocaleDateString();
            if (completeBtn) completeBtn.classList.add('hidden');
        } else {
            statusCard.classList.remove('hidden');
            if (statusIcon) {
                statusIcon.innerHTML = `
                    <svg class="w-5 h-5 text-yellow-600" viewBox="0 0 20 20" fill="currentColor">
                        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/>
                    </svg>`;
                statusIcon.className = 'w-8 h-8 rounded-full bg-yellow-100 flex items-center justify-center mr-3';
            }
            if (statusText) statusText.textContent = translate('complete_setup_to_enable') || 'Complete setup to enable email alerts';
            if (completeBtn) completeBtn.classList.remove('hidden');
        }
    }

    // ==================== UPDATE SCHEDULE UI (unchanged logic) ====================
    updateScheduleUI(status) {
        console.log('📊 updateScheduleUI received:', status);
        
        this.isEnabled = status.isEnabled;
        this.currentSchedule = status.frequency;
        this.email = status.email || this.email;
        
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

        const lowStockEnabled = status.lowStockEnabled === true;
        const restockEnabled = status.restockEnabled === true;
        
        const lowStockElement = document.getElementById('lowStockStatus');
        if (lowStockElement) {
            lowStockElement.textContent = lowStockEnabled ? 'Enabled' : 'Disabled';
            lowStockElement.className = lowStockEnabled ? 
                'px-2 py-1 text-green-800 rounded text-sm font-medium' : 
                'px-2 py-1 text-gray-800 rounded text-sm font-medium';
        }
        
        const restockElement = document.getElementById('restockStatus');
        if (restockElement) {
            restockElement.textContent = restockEnabled ? 'Enabled' : 'Disabled';
            restockElement.className = restockEnabled ? 
                'px-2 py-1 text-green-800 rounded text-sm font-medium' : 
                'px-2 py-1 text-gray-800 rounded text-sm font-medium';
        }
        
        const lastEmailElement = document.getElementById('lastEmailDate');
        if (lastEmailElement) {
            if (status.lastEmailSentDate) {
                try {
                    const date = new Date(status.lastEmailSentDate);
                    const day = String(date.getDate()).padStart(2, '0');
                    const month = String(date.getMonth() + 1).padStart(2, '0');
                    const year = date.getFullYear();
                    const hours = String(date.getHours()).padStart(2, '0');
                    const minutes = String(date.getMinutes()).padStart(2, '0');
                    const seconds = String(date.getSeconds()).padStart(2, '0');
                    lastEmailElement.textContent = `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
                } catch (e) {
                    lastEmailElement.textContent = status.lastEmailSentDate || 'Never';
                }
            } else {
                lastEmailElement.textContent = 'Never';
            }
        }
        
        const nextCheckElement = document.getElementById('nextCheckTime');
        if (nextCheckElement) {
            nextCheckElement.textContent = this.calculateNextCheckTime(status.lastEmailSentDate, status.frequency);
        }
        
        if (status.frequency) {
            this.selectSchedule(status.frequency);
        }
    }

    // ==================== CALCULATE NEXT CHECK TIME (unchanged) ====================
    calculateNextCheckTime(lastSentStr, frequency) {
        if (!lastSentStr || lastSentStr === "Never" || lastSentStr === "never_text") {
            return "Waiting for first send...";
        }
        try {
            const lastSent = new Date(lastSentStr);
            if (isNaN(lastSent.getTime())) return "Invalid date";
            
            let nextCheck = new Date(lastSent);
            if (frequency === 'daily') nextCheck.setDate(lastSent.getDate() + 1);
            else if (frequency === 'every3days') nextCheck.setDate(lastSent.getDate() + 3);
            else if (frequency === 'weekly') nextCheck.setDate(lastSent.getDate() + 7);
            else return "Unknown frequency";

            nextCheck.setHours(0, 0, 0, 0);
            const now = new Date();
            now.setHours(0, 0, 0, 0);
            
            if (nextCheck <= now) return "Due Now";

            const day = String(nextCheck.getDate()).padStart(2, '0');
            const month = String(nextCheck.getMonth() + 1).padStart(2, '0');
            const year = nextCheck.getFullYear();
            const hours = String(nextCheck.getHours()).padStart(2, '0');
            const minutes = String(nextCheck.getMinutes()).padStart(2, '0');
            return `${day}/${month}/${year} ${hours}:${minutes}`;
        } catch (error) {
            return "Unknown";
        }
    }

    // ==================== POPULATE SETTINGS (unchanged) ====================
    populateSettings(settings) {
        const emailInput = document.getElementById('alertEmail');
        if (emailInput && settings.email) emailInput.value = settings.email;

        if (settings.alertTypes) {
            const lowStockCheckbox = document.getElementById('enableLowStock');
            const restockCheckbox = document.getElementById('enableRestock');
            const expiryCheckbox = document.getElementById('enableExpiry');
            if (lowStockCheckbox) lowStockCheckbox.checked = settings.alertTypes.lowStock === true;
            if (restockCheckbox) restockCheckbox.checked = settings.alertTypes.restock === true;
            if (expiryCheckbox) expiryCheckbox.checked = settings.alertTypes.expiry === true;
        }
    }

    // ==================== SELECT SCHEDULE (unchanged) ====================
    selectSchedule(scheduleType) {
        document.querySelectorAll('.schedule-option').forEach(option => {
            option.classList.remove('active');
        });
        const selectedOption = document.querySelector(`[data-schedule="${scheduleType}"]`);
        if (selectedOption) {
            selectedOption.classList.add('active');
            this.currentSchedule = scheduleType;
        }
    }
// ==================== SAVE SCHEDULE ====================
async saveSchedule() {
    if (!this.currentSchedule) {
        if (typeof showMessageModal === 'function') showMessageModal(translate('select_schedule_warning'), 'warning');
        return;
    }

    try {
        const client = this._getClient();
        if (!client) throw new Error('Database not available');

        const businessId = window.businessInfo?.id || localStorage.getItem('businessId');
        if (!businessId) throw new Error('Business ID not found');

        const { error } = await client
            .from('business_info')
            .update({
                email_schedule: {
                    frequency: this.currentSchedule,
                    enabled: true,
                    last_sent: null
                }
            })
            .eq('id', businessId);  // Target specific business by ID

        if (error) throw error;

        if (typeof showMessageModal === 'function') showMessageModal(translate('schedule_saved_success'), 'success');
        this.closeScheduler();
        setTimeout(() => this.checkEmailScheduleStatus(), 1000);

    } catch (error) {
        console.error('Save schedule error:', error);
        if (typeof showMessageModal === 'function') showMessageModal(translate('schedule_save_error'), 'error');
    }
}

// ==================== TOGGLE PAUSE ====================
async togglePause() {
    const nextState = !this.isEnabled;
    
    try {
        const client = this._getClient();
        if (!client) throw new Error('Database not available');

        const businessId = window.businessInfo?.id || localStorage.getItem('businessId');
        if (!businessId) throw new Error('Business ID not found');

        const { error } = await client
            .from('business_info')
            .update({
                email_schedule: {
                    frequency: this.currentSchedule || 'daily',
                    enabled: nextState,
                    last_sent: null
                }
            })
            .eq('id', businessId);  // Target specific business by ID

        if (error) throw error;

        this.checkEmailScheduleStatus();
        const msg = nextState ? translate('email_scheduling_resumed') : translate('email_scheduling_paused');
        if (typeof showMessageModal === 'function') showMessageModal(msg, nextState ? 'success' : 'warning');

    } catch (error) {
        console.error("Toggle Error:", error);
        if (typeof showMessageModal === 'function') showMessageModal(translate('toggle_schedule_error'), 'error');
    }
}

// ==================== SAVE EMAIL SETTINGS ====================
async saveEmailSettings() {
    const email = document.getElementById('alertEmail')?.value;
    const enableLowStock = document.getElementById('enableLowStock')?.checked;
    const enableRestock = document.getElementById('enableRestock')?.checked;
    const enableExpiry = document.getElementById('enableExpiry')?.checked;

    if (!email || !email.includes('@')) {
        if (typeof showMessageModal === 'function') showMessageModal(translate('valid_email_required'), 'warning');
        return;
    }

    try {
        const client = this._getClient();
        if (!client) throw new Error('Database not available');

        const businessId = window.businessInfo?.id || localStorage.getItem('businessId');
        if (!businessId) throw new Error('Business ID not found');

        const { error } = await client
            .from('business_info')
            .update({
                email: email,
                alert_types: {
                    lowStock: enableLowStock === true,
                    restock: enableRestock === true,
                    expiry: enableExpiry === true
                }
            })
            .eq('id', businessId);  // Target specific business by ID

        if (error) throw error;

        // Update local state
        if (window.businessInfo) {
            window.businessInfo.email = email;
            window.businessInfo.alert_types = {
                lowStock: enableLowStock === true,
                restock: enableRestock === true,
                expiry: enableExpiry === true
            };
        }

        if (typeof showMessageModal === 'function') showMessageModal(translate('email_settings_saved'), 'success');
        this.closeEmailSettings();

    } catch (error) {
        console.error('Save email settings error:', error);
        if (typeof showMessageModal === 'function') showMessageModal(translate('email_settings_save_error'), 'error');
    }
}

// ==================== COMPLETE SETUP ====================
async completeSetup() {
    try {
        const client = this._getClient();
        if (!client) throw new Error('Database not available');

        const businessId = window.businessInfo?.id || localStorage.getItem('businessId');

        if (businessId) {
            // Update specific business by ID
            const { error } = await client
                .from('business_info')
                .update({ setup_completed: true })
                .eq('id', businessId);

            if (error) throw error;
        } else {
            // Fallback: update any incomplete setup
            const { error } = await client
                .from('business_info')
                .update({ setup_completed: true })
                .eq('setup_completed', false);

            if (error) throw error;
        }

        if (typeof showMessageModal === 'function') {
            showMessageModal(translate('setup_completed_success') || 'Setup marked as complete!', 'success');
        }
        this.checkSetupStatus();
        this.closeScheduler();

    } catch (error) {
        console.error('Error completing setup:', error);
        if (typeof showMessageModal === 'function') showMessageModal(translate('setup_complete_error'), 'error');
    }
}
    // ==================== MODAL CONTROLS (unchanged) ====================
    openScheduler() {
        document.getElementById('emailSchedulerModal')?.classList.remove('hidden');
        this.checkEmailScheduleStatus();
    }

    closeScheduler() {
        document.getElementById('emailSchedulerModal')?.classList.add('hidden');
    }

    openEmailSettings() {
        document.getElementById('emailSettingsModal')?.classList.remove('hidden');
        this.loadSettings();
    }

    closeEmailSettings() {
        document.getElementById('emailSettingsModal')?.classList.add('hidden');
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new EmailScheduler();
});