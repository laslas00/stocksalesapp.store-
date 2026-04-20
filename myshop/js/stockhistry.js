     historyOptionBtn.addEventListener('click', showStockHistorySection);


async function renderStockHistory() {
    const stockHistoryTableBody = document.getElementById('stockHistoryTableBody');
    const stockHistoryStartDateFilter = document.getElementById('stockHistoryStartDateFilter');
    const stockHistoryEndDateFilter = document.getElementById('stockHistoryEndDateFilter');
    const noHistoryMessage = document.getElementById('noHistoryMessage');
    const startDateStr = stockHistoryStartDateFilter.value;
    const endDateStr = stockHistoryEndDateFilter.value;
    
    // Validate elements exist
    if (!stockHistoryTableBody || !stockHistoryStartDateFilter || !stockHistoryEndDateFilter || !noHistoryMessage) {
        console.error(translate('stockHistoryElementsNotFound'));
        return;
    }
    
    try {
        // ✅ Fetch filtered stock history from backend based on date range
        let displayedHistory = await loadStockHistory(startDateStr, endDateStr);

        // Apply hideSoldItems filter if enabled
        if (hideSoldItems) {
            displayedHistory = displayedHistory.filter(entry => {
                const isSoldAction = entry.action && entry.action.toLowerCase().includes('sold');
                return !isSoldAction;
            });
        }

        if (!displayedHistory || displayedHistory.length === 0) {
            stockHistoryTableBody.innerHTML = '';
            noHistoryMessage.classList.remove('hidden');
            return;
        } else {
            noHistoryMessage.classList.add('hidden');
        }

        stockHistoryTableBody.innerHTML = '';

        // Sort by date (newest first or oldest first)
        if (sortOldestFirst) {
            displayedHistory.sort((a, b) => new Date(a.timestamp || a.date) - new Date(b.timestamp || b.date)); // Oldest → Newest
        } else {
            displayedHistory.sort((a, b) => new Date(b.timestamp || b.date) - new Date(a.timestamp || a.date)); // Newest → Oldest
        }

        // --- Group by date and add header row ---
        const groupedByDate = {};

        displayedHistory.forEach(entry => {
            let entryDate = null;

            try {
                entryDate = parseStockTimestamp(entry.timestamp || entry.date);
                if (isNaN(entryDate)) throw new Error(translate('invalidTimestamp'));
            } catch (err) {
                console.warn(translate('skippingInvalidTimestamp'), entry.timestamp, err);
                return; // skip this entry
            }

            // Format to YYYY-MM-DD safely
            const dateKey = entryDate.toISOString().split('T')[0];

            if (!groupedByDate[dateKey]) {
                groupedByDate[dateKey] = [];
            }

            groupedByDate[dateKey].push(entry);
        });

        const sortedDateKeys = sortOldestFirst 
            ? Object.keys(groupedByDate).sort((a, b) => new Date(a) - new Date(b)) // Oldest first
            : Object.keys(groupedByDate).sort((a, b) => new Date(b) - new Date(a)); // Newest first

        sortedDateKeys.forEach(dateKey => {
            // Add date header row
            const dateHeaderRow = document.createElement('tr');
            dateHeaderRow.classList.add('bg-indigo-200', 'font-bold');
            
            let dateDisplay = '';
            if (dateKey !== 'Invalid Date') {
                const dateObj = new Date(dateKey);
                const weekday = currentLanguage === 'fr' 
                    ? translate('da.' + dateObj.getDay())
                    : dateObj.toLocaleDateString('en-US', { weekday: 'long' });
                
                dateDisplay = `${translate('date')}: ${weekday}, ${dateObj.toLocaleDateString(undefined, { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                })}`;
            } else {
                dateDisplay = translate('invalidDate');
            }
            
            dateHeaderRow.innerHTML = `
                <td colspan="5" class="px-6 py-3 text-left text-sm text-black-800">
                    ${dateDisplay}
                </td>
            `;
            stockHistoryTableBody.appendChild(dateHeaderRow);

            // Add all entries for this date
            groupedByDate[dateKey].forEach(entry => {
                const row = document.createElement('tr');
                row.classList.add('hover:bg-gray-50');

                // Action Cell
                const actionCell = document.createElement('td');
                actionCell.classList.add('px-6', 'py-4', 'text-sm', 'font-medium', 'text-gray-900');

                // Normalize the action text
                const normalizedAction = normalizeStockHistoryAction(entry.action);
                actionCell.textContent = translateStockAction(normalizedAction);

                if (normalizedAction === 'Restocked') {
                    actionCell.classList.add('text-green-600', 'font-bold');
                } else if (normalizedAction === 'item Sold') {
                    actionCell.classList.add('text-red-600', 'font-bold');
                } else if (normalizedAction === 'Quantity Reduced') {
                    actionCell.classList.add('text-orange-600', 'font-bold');
                } else if (normalizedAction === 'Item Renamed') {
                    actionCell.classList.add('text-blue-600', 'font-bold');
                }

                // Item Cell
                const itemCell = document.createElement('td');
                itemCell.classList.add('px-6', 'py-4', 'text-sm', 'text-black-800');
                itemCell.textContent = entry.itemName || '';

                // Quantity Change Cell
                const quantityChangeCell = document.createElement('td');
                quantityChangeCell.classList.add('px-6', 'py-4', 'text-sm', 'text-black-800');
                quantityChangeCell.textContent = entry.quantityChange || '';

                // Username Cell
                const usernameCell = document.createElement('td');
                usernameCell.classList.add('px-6', 'py-4', 'text-sm', 'text-black-800', 'font-medium');
                usernameCell.textContent = entry.username || translate('na');

                // Timestamp Cell
                const timestampCell = document.createElement('td');
                timestampCell.classList.add('px-6', 'py-4', 'text-sm', 'text-black-800');
                try {
                    const entryDate = parseStockTimestamp(entry.timestamp || entry.date);
                    if (!isNaN(entryDate.getTime())) {
                        const dateStr = entryDate.toLocaleDateString(currentLanguage === 'fr' ? 'fr-FR' : 'en-US');
                        const timeStr = entryDate.toLocaleTimeString(currentLanguage === 'fr' ? 'fr-FR' : 'en-US', {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                            hour12: false
                        });
                        timestampCell.textContent = `${dateStr} ${timeStr}`;
                    } else {
                        timestampCell.textContent = translate('invalidDate');
                    }
                } catch (e) {
                    console.error(translate('errorFormattingDate'), e);
                    timestampCell.textContent = entry.timestamp || translate('na');
                }

                row.appendChild(actionCell);
                row.appendChild(itemCell);
                row.appendChild(quantityChangeCell);
                row.appendChild(usernameCell);
                row.appendChild(timestampCell);
                stockHistoryTableBody.appendChild(row);
            });
        });
    } catch (error) {
        console.error(translate('errorLoadingStockHistory'), error);
        stockHistoryTableBody.innerHTML = '';
        noHistoryMessage.classList.remove('hidden');
    }
}

function translateStockAction(action, language = 'en') {
    const cleanAction = (action || '').toString().trim();
    
    // Map action strings to translation keys
    const actionToKeyMap = {
        // Add/New Item
        'Item Added': 'itemAdded',
        'New Item Added': 'newItemAdded',
        'Nouvel Article Ajouté': 'itemAdded',
        'Nuevo Artículo Añadido': 'itemAdded',
        'Added': 'added',
        'new item Qunatiy was added to the stock': 'itemAdded',
        'Item Added (Edit)': 'itemAdded',
        'Nuevo artículo añadido': 'itemAdded',
        
        // Sold
        'Item Sold': 'itemSold',
        'Article Vendu': 'articleVendu',
        'Artículo Vendido': 'itemSold',
        'Vendu': 'sold',
        'Article vendu': 'articleVendu',
        'Artículo vendido': 'itemSold',
        
        // Restock/Update
        'Restocked': 'restocked',
        'Réapprovisionné': 'reapprovisionne',
        'Updated': 'quantityUpdated',
        'Quantity Updated': 'quantityUpdated',
        'Quantity Adjusted': 'quantityAdjusted',
        'Restocked ': 'restocked',
        'Réapprovisionné ': 'reapprovisionne',
        
        // Quantity Reduction
        'Quantity Reduced': 'quantityReduced',
        'Item Quantity Reduced': 'quantityReduced',
        'Quantity Reduced (Edit)': 'quantityReduced',
        'Item Quantity Reduced (Edit)': 'quantityReduced',
        
        // Rename
        'Item Renamed': 'itemRenamed',
        'Renamed': 'itemRenamed',
        'Item Renamed (Edit)': 'itemRenamed',
        
        // Delete
        'Item Deleted': 'itemDeleted',
        'Deleted': 'deleted',
        'item removed': 'itemDeleted',
        'Item Deleted (Edit)': 'itemDeleted',
        
        // Shipping
        'Shipped': 'shipped',
        'Expédié': 'shipped',
        'Enviado': 'shipped',
        'Shipped To': 'shippedTo',
        'Shipped To:': 'shippedTo',
        'Expédié À:': 'shippedTo',
        'Shipped To: CHIBUIKE': 'shippedToCustomer',
        'Shipped To: Location': 'shippedToLocation',
        'ShippedTo': 'shippedTo', // Add this
        'Shipped To Customer': 'shippedToCustomer',
        
        // Return
        'Returned': 'returned',
        'Retourné': 'returned',
        'Devuelto': 'returned',
        'Returned To': 'returnedTo',
        'Returned To:': 'returnedTo',
        'Returned To: CHIBUIKE': 'returnedTo',
        'Retourné À:': 'returnedTo',
        'Returned it was spoit': 'returned',
        'ReturnedTo': 'returnedTo', // Add this
        'Retourné it was spoit': 'returned',
        
        // Refund
        'Item refunded': 'itemRefunded',
        'Article Remboursé': 'articleRembourse',
        'Item Refunded': 'itemRefunded',
        'Article Remboursé (Retourné au Stock)': 'itemRefunded',
        'Refunded': 'refunded',
        
        // Exchange
        'Item Exchanged': 'exchanged',
        'Exchange': 'exchanged',
        'Item Exchanged (Returned)': 'exchangeReturn',
        'Item Exchanged (Returned to Stock)': 'exchangeReturn',
        'Item Exchanged (Given to Customer)': 'exchangeGiven',
        'Exchange - Item Not Found': 'exchangeNotFound',
        'Article Remboursé (Retourné au Stock)': 'exchangeReturn',
        'exchangeReturn': 'exchangeReturn',
        'exchangeReturnStock': 'exchangeReturn', // Map this
        
        // New action types from your data
        'Shipped To:': 'shippedTo',
        'Expédié À:': 'shippedTo',
        'Retourné À:': 'returnedTo',
        
        // Special cases
        'Shipped To: CHIBUIKE': 'shippedToCustomer',
        'Returned To: CHIBUIKE': 'returnedTo',
        
        // Status indicators
        'Shipped Status': 'shippedStatus',
        'Returned Status': 'returnedStatus',
        'Refunded Status': 'refundedStatus',
        'Exchanged Status': 'exchangedStatus',
        
        // Error/Attention
        'needsAttention': 'needsAttention',
        'error': 'error',
    };
    
    // Try exact match first
    let translationKey = actionToKeyMap[cleanAction];
    
    // If no exact match, try partial matching
    if (!translationKey) {
        for (const [key, value] of Object.entries(actionToKeyMap)) {
            if (cleanAction.includes(key)) {
                translationKey = value;
                break;
            }
        }
    }
    
    // If still no match, try to extract main action word
    if (!translationKey) {
        const mainActions = ['Added', 'Sold', 'Restocked', 'Updated', 'Reduced', 'Renamed', 
                            'Deleted', 'Shipped', 'Returned', 'Refunded', 'Exchanged'];
        
        for (const actionWord of mainActions) {
            if (cleanAction.includes(actionWord)) {
                const simpleKey = actionWord.toLowerCase();
                // Check if this key exists in translations
                if (simpleKey === 'shipped' || simpleKey === 'returned' || 
                    simpleKey === 'refunded' || simpleKey === 'exchanged') {
                    translationKey = simpleKey;
                }
                break;
            }
        }
    }
    
    // Get translation or return original action
    return translationKey ? translate(translationKey, language) : cleanAction;
}

    

async function showStockHistorySection() { 
    stockOptionsModal.classList.add('hidden');
    hideAllStockSubSections();
    stockHistorySection.classList.remove('hidden');
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const todayFormatted = `${year}-${month}-${day}`;
    stockHistoryStartDateFilter.value = todayFormatted;
    stockHistoryEndDateFilter.value = todayFormatted;
    stockHistoryTableBody.innerHTML = '';
    noHistoryMessage.classList.add('hidden');
}

async function addStockHistoryEntry(entry) {
    try {
        const response = await fetch(`${API_BASE}/api/stock-history`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(entry)
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || translate('failedToRecordStockHistory'));
        }
        await loadStockHistory(); // Reload history after adding
        renderStockHistory(); // Re-render history table
    } catch (error) {
        console.error(translate('errorAddingStockHistory'), error);
        showMessageModal(error.message || translate('failedToRecordStockHistory'));
    }
}

document.getElementById('toggleSoldFilterBtn')?.addEventListener('click', () => {
    hideSoldItems = !hideSoldItems; // toggle state

    const btn = document.getElementById('toggleSoldFilterBtn');
    if (hideSoldItems) {
        btn.textContent = translate('showAllItems');
        btn.classList.remove('bg-gray-500');
        btn.classList.add('bg-green-600');
    } else {
        btn.textContent = translate('hideSoldItems');
        btn.classList.remove('bg-green-600');
        btn.classList.add('bg-gray-500');
    }

    renderStockHistory(); // re-render instantly
});

document.getElementById('toggleSortOrderBtn')?.addEventListener('click', () => {
    sortOldestFirst = !sortOldestFirst;

    const btn = document.getElementById('toggleSortOrderBtn');
    if (sortOldestFirst) {
        btn.textContent = translate('sortOldestNewest');
        btn.classList.remove('bg-red-600');
        btn.classList.add('bg-purple-500');
    } else {
        btn.textContent = translate('sortNewestOldest');
        btn.classList.remove('bg-purple-500');
        btn.classList.add('bg-red-600');
    }

    renderStockHistory(); // Re-render instantly
});