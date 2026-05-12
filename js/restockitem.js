
let selectedAction = 'restock';

// 🔹 Open modal with action types
function openQuantityActionModal(item) {
if (!item) {
    showMessageModal('⚠️ ' + (translations[currentLanguage].noItemSelected || 'No item selected.'));
    return;
}

    // Ensure an ID is always present
    if (!item.id) {
        const existing = stock.find(s =>
            s.name && item.name &&
            s.name.toLowerCase() === item.name.toLowerCase()
        );
        if (existing && existing.id) item.id = existing.id;
        else item.id = Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
    }

    selectedItem = { ...item };
    selectedAction = 'restock'; // Default action

    const nameEl = document.getElementById('actionItemName');
    const idEl = document.getElementById('actionItemId');
    if (nameEl) nameEl.textContent = `Item: ${item.name} (Current Qty: ${item.quantity || 0})`;
    if (idEl) idEl.textContent = `ID: ${item.id}`;

    // Reset form
    document.getElementById('actionQtyInput').value = '';
    document.getElementById('actionNotes').value = '';
    document.getElementById('recipientInput').value = '';
    
    // Reset button styles and set default
    document.querySelectorAll('.action-type-btn').forEach(btn => {
        btn.classList.remove('bg-blue-600', 'text-white', 'border-blue-600');
        btn.classList.add('border-gray-300', 'text-gray-700', 'hover:bg-gray-50');
    });
    
    // Set default action
    const defaultBtn = document.querySelector('[data-action="restock"]');
    if (defaultBtn) {
        defaultBtn.classList.add('bg-blue-600', 'text-white', 'border-blue-600');
        defaultBtn.classList.remove('border-gray-300', 'text-gray-700', 'hover:bg-gray-50');
    }
    
    // Hide recipient field initially
    document.getElementById('recipientField').classList.add('hidden');

   openModal('quantityActionModal');
}

// 🔹 Close modal
function closeQuantityActionModal() {
   closeModal('quantityActionModal');
    selectedItem = null;
    selectedAction = 'restock';
}

// 🔹 Handle action type selection
document.querySelectorAll('.action-type-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        selectedAction = this.dataset.action;
        
        // Update button styles
        document.querySelectorAll('.action-type-btn').forEach(b => {
            b.classList.remove('bg-blue-600', 'text-white', 'border-blue-600');
            b.classList.add('border-gray-300', 'text-gray-700', 'hover:bg-gray-50');
        });
        
        this.classList.add('bg-blue-600', 'text-white', 'border-blue-600');
        this.classList.remove('border-gray-300', 'text-gray-700', 'hover:bg-gray-50');
        
        // Show/hide recipient field for relevant actions
        const recipientField = document.getElementById('recipientField');
        if (['ship', 'give'].includes(selectedAction)) {
            recipientField.classList.remove('hidden');
        } else {
            recipientField.classList.add('hidden');
        }
    });
});

// 🔹 Confirm action and update item
async function confirmQuantityAction() {
    const qtyInput = document.getElementById('actionQtyInput');
    const actionAmount = parseInt(qtyInput.value);
    const notes = document.getElementById('actionNotes').value.trim();
    const recipient = document.getElementById('recipientInput').value.trim();

    if (isNaN(actionAmount) || actionAmount <= 0) {
        showMessageModal('⚠️ ' + (translations[currentLanguage].enterValidQuantity || 'Please enter a valid quantity greater than 0.'));
        return;
    }

    if (!selectedItem) {
        showMessageModal('⚠️ ' + (translations[currentLanguage].noItemSelected || 'No item selected.'));
        return;
    }

    if (['ship', 'give'].includes(selectedAction) && !recipient) {
        showMessageModal('⚠️ ' + (translations[currentLanguage].enterRecipientForAction || 'Please enter a recipient.').replace('{action}', selectedAction));
        return;
    }

    if (typeof showLoading === 'function') showLoading();

    const client = getSB();
    if (!client) {
        if (typeof hideLoading === 'function') hideLoading();
        showMessageModal('Database connection failed.');
        return;
    }

    try {
        await loadStock();

        const currentBusinessId = currentUser?.business_id || businessInfo?.id || localStorage.getItem('businessId') || null;

        // Find item in stock
        let originalItem = null;
        if (selectedItem.id) {
            originalItem = stock.find(item => String(item.id) === String(selectedItem.id));
        }
        if (!originalItem && selectedItem.name) {
            originalItem = stock.find(item => item.name?.toLowerCase() === selectedItem.name?.toLowerCase());
        }

        if (!originalItem) {
            showMessageModal('❌ Item not found in stock.');
            if (typeof closeQuantityActionModal === 'function') closeQuantityActionModal();
            if (typeof closeItemDetailsModal === 'function') closeItemDetailsModal();
            return;
        }

        const oldQuantity = Number(originalItem.quantity) || 0;
        let newQuantity = oldQuantity;
        let quantityChange = '';

        switch(selectedAction) {
            case 'restock':
                newQuantity = oldQuantity + actionAmount;
                quantityChange = `+${actionAmount}`;
                break;
            case 'ship':
            case 'return':
            case 'give':
            case 'reduce':
            case 'damage':
                newQuantity = oldQuantity - actionAmount;
                if (newQuantity < 0) {
                    showMessageModal(`❌ Cannot ${selectedAction} ${actionAmount} items. Only ${oldQuantity} available.`);
                    return;
                }
                quantityChange = `-${actionAmount}`;
                break;
            default:
                newQuantity = oldQuantity;
        }

        // Update stock in Supabase (with business safety)
        let updateQuery = client.from('stock').update({
            quantity: newQuantity,
            updated_at: new Date().toISOString()
        }).eq('id', originalItem.id);
        if (currentBusinessId) updateQuery = updateQuery.eq('business_id', currentBusinessId);

        const { error: updateError } = await updateQuery;
        if (updateError) throw new Error(updateError.message);

        // Update local stock
        originalItem.quantity = newQuantity;

        const actionTextMap = {
            restock: translations[currentLanguage].restocked || 'Restocked',
            ship: translations[currentLanguage].shipped || 'Shipped',
            give: translations[currentLanguage].givenAway || 'Given Away',
            reduce: translations[currentLanguage].reduced || 'Reduced',
            damage: translations[currentLanguage].damagedLost || 'Damaged/Lost',
            return: translations[currentLanguage].returned || 'Returned'
        };
        const actionText = actionTextMap[selectedAction] || selectedAction;

        let details = notes;
        if (recipient) {
            const toText = translations[currentLanguage].to || 'To';
            details = details ? `${notes} (${toText}: ${recipient})` : `${toText}: ${recipient}`;
        }

        // Add stock history (with business_id)
        await client.from('stock_history').insert([{
            item_name: originalItem.name,
            action: details ? `${actionText}: ${details}` : actionText,
            quantity_change: quantityChange,
            username: currentUser?.username || 'Unknown',
            business_id: currentBusinessId,
            timestamp: new Date().toISOString()
        }]);

        let successMessage = `✅ ${originalItem.name} `;
        switch(selectedAction) {
            case 'restock': successMessage += `restocked by ${actionAmount}.`; break;
            case 'ship': successMessage += `${actionAmount} shipped to ${recipient}.`; break;
            case 'give': successMessage += `${actionAmount} given to ${recipient}.`; break;
            case 'reduce': successMessage += `reduced by ${actionAmount}.`; break;
            case 'damage': successMessage += `${actionAmount} marked as damaged/lost.`; break;
            case 'return': successMessage += `${actionAmount} returned to stock.`; break;
        }

        if (typeof hideLoading === 'function') hideLoading();
        showMessageModal(successMessage);
        if (typeof closeQuantityActionModal === 'function') closeQuantityActionModal();
        if (typeof closeItemDetailsModal === 'function') closeItemDetailsModal();

        await loadStock();
        if (typeof renderStock === 'function') renderStock();
        if (typeof renderStockHistory === 'function') renderStockHistory();

    } catch (err) {
        console.error('Error processing stock action:', err);
        if (typeof hideLoading === 'function') hideLoading();
        showMessageModal('❌ Error updating stock. Please try again.');
        if (typeof closeQuantityActionModal === 'function') closeQuantityActionModal();
        if (typeof closeItemDetailsModal === 'function') closeItemDetailsModal();
    }
}

// 🔹 Bind modal buttons
document.getElementById('cancelActionBtn').addEventListener('click', closeQuantityActionModal);
document.getElementById('confirmActionBtn').addEventListener('click',  confirmQuantityAction);