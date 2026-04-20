// --- State Management ---
let audioContext = null; // For advanced audio
let secretClickCount = 0;
let secretClickTimer = null;
let reminderCheckInterval = null;
let allReminders = []; // Store all reminders for "See More" feature
let MAX_VISIBLE_REMINDERS = 3;
let escapeHandler = null;


// --- Reminder List Panel Functions ---
document.getElementById('openReminderListBtn').onclick = function(event) {
    event.stopPropagation(); // Add this to prevent immediate closing
    openReminderList();
};

async function openReminderList() {
    showReminderLoading();
    const panel = document.getElementById('reminderListPanel');
    panel.classList.remove('hidden');
    setTimeout(() => {
        panel.classList.remove('-translate-x-full');
        panel.classList.add('translate-x-0');
    }, 10);
    await loadDataforreminder();
    await loadReminders();
    drawredmierselbarchart();
    renderTasksInReminderPanel();
}

function closeReminderList() {
    const panel = document.getElementById('reminderListPanel');
    panel.classList.add('-translate-x-full');
    panel.classList.remove('translate-x-0');
    setTimeout(() => {
        panel.classList.add('hidden');
    }, 300);
    cleanupMemory();
}

// Close panel when clicking outside
document.addEventListener('click', function(event) {
    const panel = document.getElementById('reminderListPanel');
    if (!panel.classList.contains('hidden') && !panel.contains(event.target)) {
        closeReminderList();
    }
});

// Also add Escape key support
document.addEventListener('keydown', function(event) {
    const panel = document.getElementById('reminderListPanel');
    if (event.key === 'Escape' && !panel.classList.contains('hidden')) {
        closeReminderList();
    }
});


function updateReminderDisplay() {
    const visibleContainer = document.getElementById('visibleReminders');
    const seeMoreContainer = document.getElementById('seeMoreContainer');
    const noRemindersMsg = document.getElementById('noRemindersMessage');
    const countBadge = document.getElementById('reminderCountBadge');
    
    // Clear current visible reminders
    if (visibleContainer) visibleContainer.innerHTML = '';
    
    // Update count badge
    const totalReminders = allReminders.length;
    const activeReminders = allReminders.filter(r => r.isActive !== false).length;
    
    if (countBadge) {
        countBadge.textContent = `${totalReminders} reminder${totalReminders !== 1 ? 's' : ''}`;
        countBadge.className = `text-xs font-semibold px-2.5 py-0.5 rounded-full ${
            activeReminders > 0 ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200' : 
            'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
        }`;
    }
    
    // Show/hide empty state
    if (totalReminders === 0) {
        if (noRemindersMsg) noRemindersMsg.classList.remove('hidden');
        if (seeMoreContainer) seeMoreContainer.classList.add('hidden');
        return;
    } else {
        if (noRemindersMsg) noRemindersMsg.classList.add('hidden');
    }
    
    // CHANGE: Use allReminders instead of filtering for only active ones
    const listToDisplay = allReminders; 
    
    // Show "See More" if there are more than MAX_VISIBLE_REMINDERS
    if (seeMoreContainer) {
        // CHANGE: Check against the length of the full list
        if (listToDisplay.length > MAX_VISIBLE_REMINDERS) {
            seeMoreContainer.classList.remove('hidden');
            
            // Update the "more" count based on the full list
            const moreCount = listToDisplay.length - MAX_VISIBLE_REMINDERS;
            const moreCountElement = document.getElementById('moreCount');
            if (moreCountElement) {
                moreCountElement.textContent = `+${moreCount}`;
            }
            
            // Show first 3 reminders (can be active or inactive)
            const remindersToShow = listToDisplay.slice(0, MAX_VISIBLE_REMINDERS);
            
            remindersToShow.forEach(r => {
                const reminderItem = createReminderItem(r);
                if (visibleContainer) visibleContainer.appendChild(reminderItem);
            });
        } else {
            seeMoreContainer.classList.add('hidden');
            
            // Display all reminders if the count is 3 or less
            listToDisplay.forEach(r => {
                const reminderItem = createReminderItem(r);
                if (visibleContainer) visibleContainer.appendChild(reminderItem);
            });
        }
    }
}

// Helper function to create a reminder item
// Helper function to create a reminder item
function createReminderItem(reminder) {
    const li = document.createElement('li');
    const dateObj = new Date(reminder.dueDate);
    const isActive = reminder.isActive !== false;
    
    li.className = `reminder-item ${!isActive ? 'completed' : ''}`;
    li.dataset.id = reminder.id;
    
    li.innerHTML = `
        <div class="flex justify-between items-start">
            <div class="flex-1">
                <div class="flex items-center gap-2 mb-1">
                    <div class="font-medium ${!isActive ? 'text-gray-500 line-through' : 'text-gray-800 dark:text-gray-200'}">
                        ${reminder.title}
                    </div>
                    ${!isActive ? 
                        `<span class="text-xs bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-400 px-2 py-0.5 rounded-full">Completed</span>` :
                        `<span class="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-0.5 rounded-full">Active</span>`
                    }
                </div>
                <div class="text-sm ${!isActive ? 'text-gray-400' : 'text-gray-500 dark:text-gray-400'}">
                    <span>${dateObj.toLocaleDateString()} • ${dateObj.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                </div>
                ${reminder.description ? 
                    `<p class="text-sm text-gray-600 dark:text-gray-400 mt-1 truncate max-w-md">${reminder.description}</p>` : 
                    ''
                }
                <div class="text-xs text-gray-400 mt-2 flex items-center gap-2">
                    <span>${translate('reminders.frequency.' + reminder.frequency)}</span>
                    <span>•</span>
                    <span>${reminder.username || translate('unknown')}</span>
                </div>
            </div>
            <div class="flex items-center gap-1 ml-2">
                <button class="p-3.5 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md transition"
                        onclick="event.stopPropagation(); openEditModal(${JSON.stringify(reminder).replace(/"/g, '&quot;')})"
                        title="Edit">
                    <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                </button>
                ${isActive ?
                    `<button class="p-3.5 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-md transition"
                            onclick="event.stopPropagation(); completeReminder(${reminder.id})"
                            title="Mark as done">
                        <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                        </svg>
                    </button>` :
                    `<button class="p-3.5 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-md transition"
                            onclick="event.stopPropagation(); reactivateReminder(${reminder.id})"
                            title="Reactivate">
                        <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                    </button>`
                }
                <!-- DELETE BUTTON ADDED HERE -->
                <button class="p-3.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition"
                        onclick="event.stopPropagation(); deleteReminder(${reminder.id})"
                        title="Delete">
                    <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                </button>
            </div>
        </div>
    `;
    
    // Make the whole item clickable for editing
    li.addEventListener('click', (e) => {
        if (!e.target.closest('button')) {
            openEditModal(reminder);
        }
    });
    
    return li;
}
// --- "See More" Modal Functions ---
function openAllRemindersModal() {
    updateModalReminders();
    updateStatistics();
    openModal('allRemindersModal');
    escapeHandler = (e) => {
        if (e.key === 'Escape') closeAllRemindersModal();
    };
    // Add escape key listener
    const escapeHandler = (e) => {
        if (e.key === 'Escape') {
            closeAllRemindersModal();
        }
    };
    document.addEventListener('keydown', escapeHandler);
    document.getElementById('allRemindersModal').dataset.escapeHandler = escapeHandler;
}

function closeAllRemindersModal() {
    const modal = document.getElementById('allRemindersModal');
    closeModal('allRemindersModal');
    
    // Remove escape key listener
    if (modal.dataset.escapeHandler) {
        document.removeEventListener('keydown', modal.dataset.escapeHandler);
        delete modal.dataset.escapeHandler;
    }
    if (escapeHandler) {
        document.removeEventListener('keydown', escapeHandler);
        escapeHandler = null; // Reset it to null after removing
    }
}

// Update reminders in the modal
function updateModalReminders(filter = 'all') {
    const container = document.getElementById('modalRemindersContainer');
    const modalCount = document.getElementById('modalReminderCount');
    
    if (!container || !modalCount) return;
    
    container.innerHTML = '';
    
    let filteredReminders = [];
    
    switch(filter) {
        case 'active':
            filteredReminders = allReminders.filter(r => r.isActive !== false);
            break;
        case 'completed':
            filteredReminders = allReminders.filter(r => r.isActive === false);
            break;
        default: // 'all'
            filteredReminders = [...allReminders];
    }
    
    // Sort by date (soonest first)
    filteredReminders.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
    
    // Update count
    modalCount.textContent = `${filteredReminders.length} reminder${filteredReminders.length !== 1 ? 's' : ''}`;
    
    if (filteredReminders.length === 0) {
        container.innerHTML = `
            <div class="text-center py-12">
                <svg class="w-20 h-20 mx-auto text-gray-300 dark:text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p class="text-gray-500 dark:text-gray-400" data-translate="no_reminders_filter">No reminders match this filter</p>
            </div>
        `;
        return;
    }
    
    // Create and append reminder items
    filteredReminders.forEach(reminder => {
        const reminderItem = createReminderItem(reminder);
        container.appendChild(reminderItem);
    });
}

// Filter reminders in modal
function filterReminders(filterType) {
    // Remove active state from all tabs
    document.querySelectorAll('.filter-tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    // Add active state to selected tab
    const activeTab = document.getElementById(
        `filter${filterType.charAt(0).toUpperCase() + filterType.slice(1)}`
    );

    if (activeTab) {
        activeTab.classList.add('active');
    }

    // Update modal content
    updateModalReminders(filterType);
}

// Update statistics
function updateStatistics() {
    const total = allReminders.length;
    const active = allReminders.filter(r => r.isActive !== false).length;
    const completed = allReminders.filter(r => r.isActive === false).length;
    
    const statsTotal = document.getElementById('statsTotal');
    const statsActive = document.getElementById('statsActive');
    const statsCompleted = document.getElementById('statsCompleted');
    
    if (statsTotal) statsTotal.textContent = total;
    if (statsActive) statsActive.textContent = active;
    if (statsCompleted) statsCompleted.textContent = completed;
    
    // Update tab badges
    const countAll = document.getElementById('countAll');
    const countActive = document.getElementById('countActive');
    const countCompleted = document.getElementById('countCompleted');
    
    if (countAll) countAll.textContent = total;
    if (countActive) countActive.textContent = active;
    if (countCompleted) countCompleted.textContent = completed;
}

// Open new reminder modal
function openNewReminderModal() {
    closeAllRemindersModal();
    openModal('reminderModal');
    const toggle = document.getElementById("alarmToggle");
    if (toggle) toggle.classList.add("active");
}

// --- Reminder Creation & Editing ---
async function saveReminder() {
    const currentUsername = currentUser ? currentUser.username : translate('unknown');
    const title = document.getElementById('reminderTitle').value.trim();
    const description = document.getElementById('reminderDescription').value.trim();
    const frequency = document.getElementById('reminderFrequency').value;
    const dateVal = document.getElementById('reminderDueDate').value;
    const timeVal = document.getElementById('reminderDueTime').value || '09:00';

    if (!title || !dateVal) {
       showMessageModal(translate('provideTitleAndDate'));
        return;
    }
    
    showLoading();
    
    // Create ISO string correctly based on local time
    const fullDate = `${dateVal}T${timeVal}`; 
    
    const reminder = { 
        id: Date.now(),
        title, 
        description, 
        frequency, 
        dueDate: fullDate,
        snoozedUntil: null,
        username: currentUsername,
        isActive: true // New reminders are active by default
    };

    await fetch(`${API_BASE}/api/reminders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reminder)
    });
    
                   const checkInterval = setInterval(() => {
            checkCancelled();
        }, 100);
          resetCancellation();
        clearInterval(checkInterval);
        

        checkCancelled();
        
        hideLoading();
    showMessageModal(translate('reminderSaved'));
    closeModal('reminderModal');
    const toggle = document.getElementById("alarmToggle");
    if (toggle) toggle.classList.remove("active");
    await loadReminders();
}

function closeReminderModal() {
    closeModal('reminderModal');
    const toggle = document.getElementById("alarmToggle");
    if (toggle) toggle.classList.remove("active");
}

// --- Alarm Functions ---
function startReminderClock() {
    if (reminderCheckInterval) clearInterval(reminderCheckInterval);

    reminderCheckInterval = setInterval(() => {
        const now = new Date();

        // Only check active reminders for current user
        reminders.forEach(reminder => {
            if (reminder.isActive === false || 
                reminder.username !== (currentUser ? currentUser.username : translate('unknown'))) return;

            const due = new Date(reminder.dueDate);
            const snooze = reminder.snoozedUntil ? new Date(reminder.snoozedUntil) : null;
            const isDue = now >= due;
            const isSnoozeOver = snooze ? now >= snooze : true;

            if (isDue && isSnoozeOver && !reminder.isTriggered) {
                triggerAlarm(reminder);
            }
        });
    }, 30000);
}

function triggerAlarm(reminder) {
    // 1. Play Sound
    const audio = document.getElementById('reminderSound');
    if (audio) { 
        audio.currentTime = 0; 
        audio.play().catch(e => console.log(translate('audioBlocked'))); 
    }

    // 2. Browser Notification (Advanced)
    if (Notification.permission === "granted") {
        new Notification(`${translate('reminders.reminder')}: ${reminder.title}`, {
            body: reminder.description || translate('reminders.itsTime'),
            icon: '/path/to/icon.png' // Add your icon path here
        });
    }

    // 3. Show Modal
    document.getElementById('dueReminderTitle').innerText = reminder.title;
    document.getElementById('dueReminderDesc').innerText = reminder.description || '';
    document.getElementById('dueReminderTimeDisplay').innerText = new Date().toLocaleString();
    
    openModal('dueReminderModal');

    // 4. Bind Buttons
    document.getElementById('markDoneBtn').onclick = () => handleCompletion(reminder);
    document.getElementById('snoozeBtn').onclick = () => handleSnooze(reminder);

    reminder.isTriggered = true; 
}

// --- Recurrence & Completion Logic ---
async function handleCompletion(reminder) {
    stopSound();
    closeModal('dueReminderModal');

    if (reminder.frequency === 'once') {
        // Mark as disabled
        const disabledReminder = {
            ...reminder,
            isActive: false,
            disabledAt: new Date().toISOString()
        };

        await fetch(`${API_BASE}/api/reminders`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(disabledReminder)
        });
        
        showMessageModal(translate('reminderCompleted'));
    } else {
        // Calculate Next Date
        const nextDate = calculateNextDate(reminder.dueDate, reminder.frequency);
        
        const updatedReminder = {
            ...reminder,
            dueDate: nextDate.toISOString().slice(0, 16),
            snoozedUntil: null,
            isTriggered: false,
            isActive: true
        };

        await fetch(`${API_BASE}/api/reminders`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedReminder)
        });
        
        showMessageModal(translate('reminderRescheduled'));
    }
    await loadReminders();
}

function calculateNextDate(currentDateStr, freq) {
    let date = new Date(currentDateStr);
    switch(freq) {
        case 'daily': date.setDate(date.getDate() + 1); break;
        case 'weekly': date.setDate(date.getDate() + 7); break;
        case 'monthly': date.setMonth(date.getMonth() + 1); break;
        case 'yearly': date.setFullYear(date.getFullYear() + 1); break;
    }
    return date;
}

// --- Snooze Logic ---
async function handleSnooze(reminder) {
    stopSound();
    closeModal('dueReminderModal');

    const minutes = parseInt(document.getElementById('snoozeDuration').value);
    const snoozeUntil = new Date(Date.now() + minutes * 60000).toISOString();

    // Update local state immediately for UI responsiveness
    reminder.snoozedUntil = snoozeUntil;
    reminder.isTriggered = false;
}

// --- Helper Functions ---
function stopSound() {
    const audio = document.getElementById('reminderSound');
    if (audio) { audio.pause(); audio.currentTime = 0; }
}

// --- Secret Click Feature ---
function handleSecretClick(e) {
    // Ignore clicks on interactive elements
    if (['input', 'textarea', 'button', 'select'].includes(e.target.tagName.toLowerCase())) return;

    secretClickCount++;
    
    if (secretClickTimer) clearTimeout(secretClickTimer);
    
    secretClickTimer = setTimeout(() => {
        secretClickCount = 0; // Reset if too slow
    }, 2000);

    if (secretClickCount === 3) {
        // Optional: Show a subtle toast "2 more..."
        console.log(translate('reminders.twoMoreClicks'));
    }

    if (secretClickCount >= 5) {
        openModal('reminderModal');
        const toggle = document.getElementById("alarmToggle");
        if (toggle) toggle.classList.add("active");
        secretClickCount = 0;
    }
}

// --- Edit Modal Functions ---
let currentEditingReminder = null;

function openEditModal(reminder) {
    currentEditingReminder = reminder;
    
    // Fill form with reminder data
    const dateObj = new Date(reminder.dueDate);
    const dateStr = dateObj.toISOString().split('T')[0];
    const timeStr = dateObj.toTimeString().slice(0, 5);
    
    document.getElementById('editReminderTitle').value = reminder.title || '';
    document.getElementById('editReminderDescription').value = reminder.description || '';
    document.getElementById('editReminderDate').value = dateStr;
    document.getElementById('editReminderTime').value = timeStr;
    document.getElementById('editReminderFrequency').value = reminder.frequency || 'once';
    
    // Set active checkbox (default to true if not specified)
    const activeCheckbox = document.getElementById('editReminderActive');
    if (activeCheckbox) {
        activeCheckbox.checked = reminder.isActive !== false;
    }
    
    // Update modal title
    document.getElementById('editModalTitle').textContent = `Edit: ${reminder.title}`;
    
    // Show modal
    openModal('reminderEditModal');
}

function closeEditModal() {
    closeModal('reminderEditModal');
    currentEditingReminder = null;
    
    // Hide status indicator
    const statusIndicator = document.getElementById('editStatusIndicator');
    if (statusIndicator) statusIndicator.classList.add('hidden');
}

async function saveEditedReminder() {
    if (!currentEditingReminder) {
        showMessageModal('No reminder selected for editing');
        return;
    }
    
    const title = document.getElementById('editReminderTitle').value.trim();
    const description = document.getElementById('editReminderDescription').value.trim();
    const dateVal = document.getElementById('editReminderDate').value;
    const timeVal = document.getElementById('editReminderTime').value || '09:00';
    const frequency = document.getElementById('editReminderFrequency').value;
    const isActive = document.getElementById('editReminderActive') ? 
                     document.getElementById('editReminderActive').checked : true;
    
    if (!title || !dateVal) {
        showMessageModal(translate('provideTitleAndDate'));
        return;
    }
    
    // Create ISO string
    const fullDate = `${dateVal}T${timeVal}`;
    
    // Show loading state
    const statusIndicator = document.getElementById('editStatusIndicator');
    const statusText = document.getElementById('editStatusText');
    if (statusIndicator && statusText) {
        statusText.textContent = 'Saving changes...';
        statusIndicator.classList.remove('hidden');
    }
    
    try {
        // Prepare updated reminder
        const updatedReminder = {
            ...currentEditingReminder,
            title,
            description,
            dueDate: fullDate,
            frequency,
            isActive,
            snoozedUntil: null,
            isTriggered: false,
            lastEdited: new Date().toISOString()
        };
        
        // Save to server
        const response = await fetch(`${API_BASE}/api/reminders`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedReminder)
        });
        
        if (response.ok) {
            if (statusText) {
                statusText.textContent = '✓ Changes saved!';
                statusText.classList.add('text-green-600', 'dark:text-green-400');
            }
            
            // Update local state immediately
            const index = reminders.findIndex(r => r.id === currentEditingReminder.id);
            if (index !== -1) {
                reminders[index] = updatedReminder;
            }
            
            // Refresh the list
            setTimeout(async () => {
                await loadReminders();
                closeEditModal();
                showMessageModal(translate('reminderUpdated'));
            }, 1000);
        } else {
            throw new Error('Failed to save reminder');
        }
    } catch (error) {
        console.error('Error saving reminder:', error);
        if (statusText) {
            statusText.textContent = '✗ Failed to save. Please try again.';
            statusText.classList.add('text-red-600', 'dark:text-red-400');
        }
        
        setTimeout(() => {
            if (statusIndicator) statusIndicator.classList.add('hidden');
            if (statusText) statusText.classList.remove('text-red-600', 'dark:text-red-400');
        }, 3000);
    }
}

// --- Reminder Action Functions ---
window.completeReminder = async (id) => {
    const reminder = reminders.find(r => r.id === id);
    if (!reminder) return;
    
    if (confirm(translate('confirmCompleteReminder'))) {
        showLoading();
        
        const completedReminder = {
            ...reminder,
            isActive: false,
            disabledAt: new Date().toISOString(),
            completedAt: new Date().toISOString()
        };
        
        await fetch(`${API_BASE}/api/reminders`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(completedReminder)
        });
        
                       const checkInterval = setInterval(() => {
            checkCancelled();
        }, 100);
          resetCancellation();
        clearInterval(checkInterval);
        

        checkCancelled();
        
        hideLoading();
        showMessageModal(translate('reminderCompleted'));
        await loadReminders();
    }
};

window.reactivateReminder = async (id) => {
    const reminder = reminders.find(r => r.id === id);
    if (!reminder) return;
    
    if (confirm(translate('confirmReactivateReminder'))) {
        showLoading();
        
        const reactivatedReminder = {
            ...reminder,
            isActive: true,
            disabledAt: null,
            isTriggered: false,
            snoozedUntil: null
        };
        
        await fetch(`${API_BASE}/api/reminders`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(reactivatedReminder)
        });
        
                       const checkInterval = setInterval(() => {
            checkCancelled();
        }, 100);
          resetCancellation();
        clearInterval(checkInterval);
        

        checkCancelled();
        
        hideLoading();
        showMessageModal(translate('reminderReactivated'));
        await loadReminders();
    }
};

window.deleteReminder = async (id) => {
    const reminder = reminders.find(r => r.id === id);
    const isActive = reminder && reminder.isActive !== false;
    
    let message = translate('confirmDeleteReminder');
    if (!isActive) {
        message = translate('confirmDeleteDisabledReminder');
    }
    
    if(!confirm(message)) return;
    
    await fetch(`${API_BASE}/api/reminders/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
    });
    
    await loadReminders();
    showMessageModal(translate('reminderDeleted'));
};

// --- Keyboard Support ---
document.addEventListener('keydown', function(event) {
    // Close edit modal with Escape
    const editModal = document.getElementById('reminderEditModal');
    if (event.key === 'Escape' && !editModal.classList.contains('hidden')) {
        closeEditModal();
    }
    
    // Save edit with Ctrl+Enter
    if (event.key === 'Enter' && event.ctrlKey && !editModal.classList.contains('hidden')) {
        saveEditedReminder();
    }
});

// --- Alarm Toggle ---
const toggle = document.getElementById("alarmToggle");
if (toggle) {
    toggle.addEventListener("click", () => {
        toggle.classList.toggle("active");
        openModal('reminderModal');
    });
}

// Initialize clock on load
if (document.getElementById('alarmToggle')) {
    document.getElementById('alarmToggle').addEventListener('click', () => {
        startReminderClock();
    });
}