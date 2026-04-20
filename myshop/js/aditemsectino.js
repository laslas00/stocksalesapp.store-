        addItemBtn.addEventListener('click', addItem);
    quantityInput.addEventListener('keypress', function(event) { if (event.key === 'Enter') addItem(); });
    priceInput.addEventListener('keypress', function(event) { if (event.key === 'Enter') addItem(); });
    productNameInput.addEventListener('keypress', function(event) { if (event.key === 'Enter') addItem(); });
    addOptionBtn.addEventListener('click', showAddItemSection);
       async function showAddItemSection() {
        stockOptionsModal.classList.add('hidden');
        hideAllStockSubSections();
       addItemSection.classList.remove('hidden');
        addItemSection.classList.add('MODAL-LOCK-OPEN');
        document.querySelector('input[name="itemType"][value="product"]').checked = true;
        updateAddItemFormLabels(); 
         await loadStock();
         setTimeout(checkRatingTrigger, 1000);
    }
    
    function updateAddItemFormLabels() {
        const selectedType = document.querySelector('input[name="itemType"]:checked').value;
        if (selectedType === 'product') {
            quantityLabel.textContent = 'Quantity';
            priceLabel.textContent = `Price (${getCurrencySymbol()})`;
            imageLabel.classList.remove('hidden');
            itemImageInput.classList.remove('hidden');
        } else { 
            quantityLabel.textContent = 'quantity';
            priceLabel.textContent = `PRICE (${getCurrencySymbol()})`;
            imageLabel.classList.add('hidden');
            itemImageInput.classList.add('hidden');
            itemImageInput.value = '';
        }
    }
        itemTypeRadios.forEach(radio => {
        radio.addEventListener('change', updateAddItemFormLabels);
    });



 async function openBackupSettings() {
    const btn = document.getElementById('backup-settings-btn');
   const originalText = document.getElementById('backbtn-text').textContent;
    
    // Show loading state
    btn.classList.add('loading');
    btn.setAttribute('disabled', 'true');
    
    try {
        console.log('🔄 Opening backup settings...');
        
        // First, check if electronAPI is available
        if (!window.electronAPI || typeof window.electronAPI.createNewWindow !== 'function') {
            throw new Error('Electron API not available');
        }
        
        // Open backup settings with a small delay for better UX
        await new Promise(resolve => setTimeout(resolve, 300));
        
        const backupUrl = 'backup-settings.html';
        
        // Call the electron API
        const result = await window.electronAPI.createNewWindow(backupUrl);
        
        if (result && result.success) {
            // Success state
            btn.classList.remove('loading');
            btn.classList.add('success');
            btn.querySelector('.btn-text').textContent = 'Opened Successfully!';
            
            setTimeout(() => {
                btn.classList.remove('success');
                btn.querySelector('.btn-text').textContent = originalText;
                btn.removeAttribute('disabled');
            }, 1500);
            
        } else {
            // Handle API error
            throw new Error(result?.error || 'Failed to open window');
        }
        
    } catch (error) {
        console.error('❌ Error opening backup settings:', error);
        
        // Error state
        btn.classList.remove('loading');
        btn.classList.add('error');
        btn.querySelector('.btn-text').textContent = 'Error Opening!';
        
        // Show error notification
       
        
        setTimeout(() => {
            btn.classList.remove('error');
            btn.querySelector('.btn-text').textContent = originalText;
            btn.removeAttribute('disabled');
        }, 2000);
        
        // Fallback: Try to open in current window if electron fails
        if (!window.electronAPI) {
            setTimeout(() => {
                window.location.href = 'backup-settings.html';
            }, 500);
        }
    }
}
// Backup status globals
let backupCheckInterval;
let backupNotificationTimer;

// Update backup status indicator and show notifications
async function updateBackupStatus() {
    try {
        const stats = await window.backupAPI.getBackupStats();
        const badge = document.getElementById('backupBadge');
        if (!badge) return;

        const lastBackup = stats.lastBackup ? new Date(stats.lastBackup) : null;
        const now = new Date();
        let daysSince = Infinity;
        if (lastBackup) {
            daysSince = (now - lastBackup) / (1000 * 60 * 60 * 24);
        }

        // Determine status
        if (!lastBackup) {
            badge.style.backgroundColor = '#ef4444'; // red
            badge.title = translate('never_backed_up_title');
            showBackupNotification(translate('never_backed_up_message'));
        } else if (daysSince > 7) {
            badge.style.backgroundColor = '#ef4444';
            badge.title = translate('backup_overdue_title').replace('{days}', Math.round(daysSince));
            showBackupNotification(translate('backup_overdue_message').replace('{days}', Math.round(daysSince)));
        } else if (daysSince > 3) {
            badge.style.backgroundColor = '#f59e0b'; // orange
            badge.title = translate('backup_consider_title').replace('{days}', Math.round(daysSince));
        } else {
            badge.style.backgroundColor = '#10b981'; // green
            badge.title = translate('backup_recent_title').replace('{date}', lastBackup ? lastBackup.toLocaleString() : '');
        }
    } catch (error) {
        console.error('Error checking backup status:', error);
    }
}

// Show a non‑intrusive notification
function showBackupNotification(message) {
    if (document.getElementById('backupNotification')) return; // already showing

    const notif = document.createElement('div');
    notif.id = 'backupNotification';
    notif.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: #f59e0b;
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        z-index: 10000;
        display: flex;
        align-items: center;
        gap: 10px;
        cursor: pointer;
        animation: slideIn 0.3s;
        font-size: 14px;
    `;
    notif.innerHTML = `
        <span>⚠️</span>
        <span>${message}</span>
        <button style="background:transparent; border:none; color:white; font-size:18px; margin-left:10px; cursor:pointer;">×</button>
    `;
    notif.addEventListener('click', (e) => {
        if (e.target.tagName === 'BUTTON') {
            notif.remove();
        } else {
          const adminPanelModal = document.getElementById('adminPanelModal');
                    if (adminPanelModal) {
                adminPanelModal.classList.remove('hidden');
                setTimeout(() => adminPanelModal.classList.add('show'), 10);
            }
               openBackupSettings(); 
            notif.remove();
        }
    });
    document.body.appendChild(notif);

    // Auto‑hide after 10 seconds
    setTimeout(() => {
        if (notif.parentElement) notif.remove();
    }, 19000);
}

// Perform a quick backup (Backup Now button)
async function performQuickBackup() {
    const btn = document.getElementById('backup-now-btn');
    const originalHtml = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = `<span>${translate('backing_up_text')}</span> <div class="btn-loader" style="display:inline-flex; margin-left:8px;"></div>`;

    try {
        const result = await window.backupAPI.manualBackup();
        if (result.success) {
            showSimpleAlert(translate('backup_completed_success'), 'success');
            updateBackupStatus(); // refresh badge
        } else {
            showSimpleAlert(translate('backup_failed') + ': ' + result.message, 'danger');
        }
    } catch (error) {
        showSimpleAlert(translate('error_text') + ': ' + error.message, 'danger');
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalHtml;
    }
}

// Simple toast alert (you may reuse your existing showAlert function)
function showSimpleAlert(message, type = 'info') {
    const colors = { info: '#3498db', success: '#10b981', danger: '#ef4444' };
    const alert = document.createElement('div');
    alert.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${colors[type]};
        color: white;
        padding: 10px 20px;
        border-radius: 6px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.15);
        z-index: 10001;
        font-size: 14px;
        animation: slideIn 0.3s;
    `;
    alert.textContent = message;
    document.body.appendChild(alert);
    setTimeout(() => alert.remove(), 4000);
}

// Start periodic status check
function startBackupStatusCheck() {
    updateBackupStatus();
    backupCheckInterval = setInterval(updateBackupStatus, 60 * 60 * 1000); // check every hour
}

// Stop check when page unloads
window.addEventListener('beforeunload', () => {
    if (backupCheckInterval) clearInterval(backupCheckInterval);
});

