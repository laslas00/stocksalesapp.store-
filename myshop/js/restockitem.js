
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

    // Validate recipient for certain actions
    if (['ship', 'give'].includes(selectedAction) && !recipient) {
        showMessageModal('⚠️ ' + (translations[currentLanguage].enterRecipientForAction || 'Please enter a recipient for {action} action.').replace('{action}', selectedAction));
        return;
    }
    showLoading();
if (isCancelled) return;
    try {
        await loadStock(); // Make sure we have fresh stock data

        let originalItemIndex = -1;
        if (selectedItem.id) {
            originalItemIndex = stock.findIndex(item =>
                String(item.id) === String(selectedItem.id)
            );
        }

        if (originalItemIndex === -1 && selectedItem.name) {
            originalItemIndex = stock.findIndex(item =>
                item.name?.toLowerCase() === selectedItem.name?.toLowerCase()
            );
        }

        if (originalItemIndex === -1 && selectedItem.productName) {
            originalItemIndex = stock.findIndex(item =>
                item.name?.toLowerCase() === selectedItem.productName?.toLowerCase()
            );
        }

        if (originalItemIndex === -1) {
            console.warn('Item not found:', selectedItem);
            showMessageModal('❌ ' + (translations[currentLanguage].itemNotFoundInStock || 'Error: Item not found in stock for update.'));
            closeQuantityActionModal();
            closeItemDetailsModal();
            return;
        }

        const originalItem = stock[originalItemIndex];
        const oldQuantity = Number(originalItem.quantity) || 0;
        let newQuantity = oldQuantity;
        let quantityChange = '';

        // Calculate new quantity based on action type
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
                    const cannotActionText = translations[currentLanguage].cannotActionAmount 
                        ? translations[currentLanguage].cannotActionAmount.replace('{action}', selectedAction).replace('{amount}', actionAmount).replace('{oldQuantity}', oldQuantity)
                        : `Cannot ${selectedAction} ${actionAmount} items. Only ${oldQuantity} available.`;
                    showMessageModal(`❌ ${cannotActionText}`);
                    return;
                }
                quantityChange = `-${actionAmount}`;
                break;
            default:
                newQuantity = oldQuantity;
        }

        const updatedItem = {
            ...originalItem,
            quantity: newQuantity,
            username: currentUser.username,
            id: String(originalItem.id || selectedItem.id),
            lastUpdated: new Date().toISOString()
        };

        stock[originalItemIndex] = updatedItem;

        // Prepare history entry - translate action text
        let actionText = '';
        switch(selectedAction) {
            case 'restock': actionText = translations[currentLanguage].restocked || 'Restocked'; break;
            case 'ship': actionText = translations[currentLanguage].shipped || 'Shipped'; break;
            case 'give': actionText = translations[currentLanguage].givenAway || 'Given Away'; break;
            case 'reduce': actionText = translations[currentLanguage].reduced || 'Reduced'; break;
            case 'damage': actionText = translations[currentLanguage].damagedLost || 'Damaged/Lost'; break;
            case 'return': actionText = translations[currentLanguage].returned || 'Returned'; break;
        }

        // Add notes/recipient to history entry
        let details = notes;
        if (recipient) {
            const toText = translations[currentLanguage].to || 'To';
            details = details ? `${notes} (${toText}: ${recipient})` : `${toText}: ${recipient}`;
        }

        const response = await fetch(`${API_BASE}/api/stock`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedItem)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || (translations[currentLanguage].failedUpdateItemServer || 'Failed to update item on server.'));
        }

        // Add to stock history
        await addStockHistoryEntry({
            action: `${actionText} ${details}`,
            itemName: updatedItem.name || updatedItem.productName,
            quantityChange: quantityChange,
            newQuantity: newQuantity,
            details: details,
            timestamp: new Date().toLocaleString('fr-FR'),
            username: currentUser.username,
        });

        // Success message - translated
        let successMessage = `✅ ${updatedItem.name || updatedItem.productName} `;
        switch(selectedAction) {
            case 'restock':
                const restockedText = translations[currentLanguage].restockedByAmount 
                    ? translations[currentLanguage].restockedByAmount.replace('{amount}', actionAmount)
                    : `restocked by ${actionAmount}.`;
                successMessage += restockedText;
                break;
            case 'ship':
                const shippedText = translations[currentLanguage].shippedToRecipient 
                    ? translations[currentLanguage].shippedToRecipient.replace('{amount}', actionAmount).replace('{recipient}', recipient)
                    : `shipped ${actionAmount} to ${recipient}.`;
                successMessage += shippedText;
                break;
            case 'give':
                const givenText = translations[currentLanguage].givenToRecipient 
                    ? translations[currentLanguage].givenToRecipient.replace('{amount}', actionAmount).replace('{recipient}', recipient)
                    : `given away ${actionAmount} to ${recipient}.`;
                successMessage += givenText;
                break;
            case 'reduce':
                const reducedText = translations[currentLanguage].reducedByAmount 
                    ? translations[currentLanguage].reducedByAmount.replace('{amount}', actionAmount)
                    : `reduced by ${actionAmount}.`;
                successMessage += reducedText;
                break;
            case 'damage':
                const damagedText = translations[currentLanguage].markedAsDamaged 
                    ? translations[currentLanguage].markedAsDamaged.replace('{amount}', actionAmount)
                    : `${actionAmount} marked as damaged/lost.`;
                successMessage += damagedText;
                break;
            case 'return':
                const returnedText = translations[currentLanguage].returnedToStock 
                    ? translations[currentLanguage].returnedToStock.replace('{amount}', actionAmount)
                    : `${actionAmount} returned to stock.`;
                successMessage += returnedText;
                break;
        }

        showMessageModal(successMessage);
                       const checkInterval = setInterval(() => {
            checkCancelled();
        }, 100);
          resetCancellation();
        clearInterval(checkInterval);
        

        checkCancelled();
        
        hideLoading();
        closeQuantityActionModal();
        closeItemDetailsModal();

        await loadStock();
        renderStock();
        if (typeof renderStockHistory === 'function') renderStockHistory();

    } catch (err) {
        console.error('❌ ' + (translations[currentLanguage].errorProcessingStockAction || 'Error processing stock action:'), err);
        showMessageModal('❌ ' + (translations[currentLanguage].errorUpdatingStock || 'Error updating stock. Please try again.'));
        closeQuantityActionModal();
                           const checkInterval = setInterval(() => {
            checkCancelled();
        }, 100);
          resetCancellation();
        clearInterval(checkInterval);
        

        checkCancelled();
        
        hideLoading();
        closeItemDetailsModal();
    }
}

// 🔹 Bind modal buttons
document.getElementById('cancelActionBtn').addEventListener('click', closeQuantityActionModal);
document.getElementById('confirmActionBtn').addEventListener('click',  confirmQuantityAction);