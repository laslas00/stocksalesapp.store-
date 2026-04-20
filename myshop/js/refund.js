let currentRefundSale = null;
document.getElementById('openRefundHistoryBtn')?.addEventListener('click', renderRefundHistoryModal);


async function handleRefundClick(saleId) {
    const btn = document.getElementById(`refund-btn-${saleId}`);
    if (btn) {
        // Show loading
        btn.disabled = true;
        btn.classList.add('opacity-70', 'cursor-wait');
        btn.querySelector('.refund-btn-text').classList.add('opacity-0');
        btn.querySelector('.refund-btn-loader').classList.remove('hidden');
    }
    
    try {
        await openRefundModal(saleId);
    } finally {
        // Reset button (will be done by openRefundModal or modal events)
    }
}
window.openRefundModal = async function(saleId) {
    await loadStock(); 
    if (!currentUser || (currentUser.role !== 'administrator')) {
        showMessageModal(translate('only_admins_can_process_refunds') || 'Only administrators can process refunds or returns.');
        return;
    }

    populateExchangeProductList();

    const sale = sales.find(s => s.id === saleId);
    if (!sale) return;
    currentRefundSale = sale;
    document.getElementById('refundSaleInfo').textContent =
        `${translate('product_colon') || 'Product:'} ${sale.productName}, ${translate('quantity_colon') || 'Qty:'} ${sale.quantity}, ${translate('amount_colon') || 'Amount:'} ${formatCurrency(sale.price)}`;
    document.getElementById('refundQuantityInput').value = sale.quantity;
    document.getElementById('refundPriceInput').value = Math.round(sale.price);
    document.getElementById('refundReasonInput').value = '';

    openModal('refundModal');
    setTimeout(() => {
        const btn = document.getElementById(`refund-btn-${saleId}`);
        if (btn) {
            btn.disabled = false;
            btn.classList.remove('opacity-70', 'cursor-wait');
            btn.querySelector('.refund-btn-text').classList.remove('opacity-0');
            btn.querySelector('.refund-btn-loader').classList.add('hidden');
        }
    }, 300);

};


window.submitRefund = async function() {
    // Get input values
    const qty = parseFloat(document.getElementById('refundQuantityInput').value);
    const refundPrice = parseFloat(document.getElementById('refundPriceInput').value);
    const username = currentUser ? currentUser.username : 'Unknown';
    const reason = document.getElementById('refundReasonInput').value.trim();
    let productName = currentRefundSale?.productName || '';
    const isExchange = document.getElementById('isExchangeCheckbox')?.checked;
    const exchangeProductName = document.getElementById('exchangeSearchInput')?.value.trim();
    const extraPayment = parseFloat(document.getElementById('exchangeExtraPaymentInput')?.value || 0);
    if (!currentRefundSale) {
        showMessageModal(translations[currentLanguage]?.no_sale_selected_refund || 'No sale selected for refund.');
        return;
    }

    // ========== VALIDATIONS ==========
    if (isNaN(qty) || qty <= 0) {
        showMessageModal(translations[currentLanguage]?.refund_quantity_invalid || 'Refund quantity must be greater than 0.');
        return;
    }
    if (qty > currentRefundSale.quantity) {
        showMessageModal(translations[currentLanguage]?.refund_quantity_exceeds || 'Refund quantity exceeds the sold quantity.');
        return;
    }
    if (isNaN(refundPrice) || refundPrice < 0) {
        showMessageModal(translations[currentLanguage]?.refund_price_invalid || 'Refund price must be a valid non-negative number.');
        return;
    }
    if (!reason || reason.length < 5) {
        showMessageModal(translations[currentLanguage]?.refund_reason_required || 'Please provide a valid reason for refund (at least 5 characters).');
        return;
    }
    if (currentRefundSale.refundOf) {
        showMessageModal(translations[currentLanguage]?.sale_already_refunded || 'This sale is already a refund and cannot be refunded again.');
        return;
    }
    
    // Exchange validation
    let exchangeItem = null;
    if (isExchange) {
        if (!exchangeProductName) {
            showMessageModal(translations[currentLanguage]?.select_exchange_product || 'Please select the product to exchange with.');
            return;
        }
        
        // Find exchange item using ID + NAME mixed approach
        exchangeItem = findStockItemByNameOrID(exchangeProductName, null, true);
        
        if (!exchangeItem || exchangeItem.quantity < qty) {
            showMessageModal(translations[currentLanguage]?.exchange_item_unavailable || 'Selected exchange item is out of stock or not found.');
            return;
        }
    }
showLoading();
    closeRefundModal();

    // ========== FIND STOCK ITEM USING ID + NAME MIXED APPROACH ==========
    console.group('🔍 STOCK ITEM SEARCH (ID + NAME MIXED)');
    console.log('Looking for:', productName);
    console.log('Sale data:', currentRefundSale);
    
    let stockItem = null;
    let foundBy = '';
    
    // === STEP 1: PRIORITY - ID-BASED LOOKUP ===
    const idFields = ['productId', 'stockId', 'itemId', 'productID', 'stockID', 'itemID', 'id'];
    for (const idField of idFields) {
        if (currentRefundSale[idField]) {
            stockItem = stock.find(item => item.id === currentRefundSale[idField]);
            if (stockItem) {
                foundBy = `ID Field: ${idField} = ${currentRefundSale[idField]}`;
                console.log(`✅ Found by ${foundBy}`);
                break;
            }
        }
    }
    
    // === STEP 2: EMBEDDED STOCK ITEM OBJECT ===
    if (!stockItem && currentRefundSale.stockItem && currentRefundSale.stockItem.id) {
        stockItem = stock.find(item => item.id === currentRefundSale.stockItem.id);
        if (stockItem) {
            foundBy = 'Embedded stockItem object ID';
            console.log(`✅ Found by ${foundBy}`);
        }
    }
    
    // === STEP 3: NAME MATCHING WITH MULTIPLE STRATEGIES ===
    if (!stockItem) {
        stockItem = findStockItemByNameOrID(productName, currentRefundSale);
        if (stockItem) {
            foundBy = 'Advanced name matching';
            console.log(`✅ Found by ${foundBy}`);
        }
    }
    
    // === STEP 4: SALES HISTORY LOOKUP ===
    if (!stockItem) {
        console.log('Searching in sales history...');
        const similarSales = sales.filter(s => 
            s.productName && productName && 
            s.productName.toLowerCase().includes(productName.toLowerCase()) ||
            productName.toLowerCase().includes(s.productName.toLowerCase())
        );
        
        for (const similarSale of similarSales) {
            for (const idField of idFields) {
                if (similarSale[idField]) {
                    stockItem = stock.find(item => item.id === similarSale[idField]);
                    if (stockItem) {
                        foundBy = `Related sale ID: ${idField} = ${similarSale[idField]}`;
                        console.log(`✅ Found by ${foundBy}`);
                        break;
                    }
                }
            }
            if (stockItem) break;
        }
    }
    
    console.log('Final Stock Item:', stockItem);
    console.log('Found By:', foundBy || 'Not found');
    console.groupEnd();
    
    // Update product name if we found a match
    if (stockItem && stockItem.name !== productName) {
        console.log(`Updating product name from "${productName}" to "${stockItem.name}"`);
        productName = stockItem.name;
    }

    // ========== CREATE REFUND SALE ENTRY ==========
    const refundSale = {
        ...currentRefundSale,
        id: `refund-${Date.now()}`,
        productName: isExchange 
            ? `Exchange: ${productName} → ${exchangeProductName}`
            : productName,
        refundOf: currentRefundSale.id,
        quantity: -qty,
        price: -Math.abs(refundPrice),
        totalAmount: -Math.abs(refundPrice * qty),
        dateSold: new Date().toISOString().slice(0, 10),
        paymentType: isExchange ? 'Exchange' : 'Refund',
        refundReason: isExchange
            ? `Item exchanged: ${productName} → ${exchangeProductName}${extraPayment > 0 ? ` (+${extraPayment} ${currentCurrency || 'FCFA'} extra)` : ''}`
            : reason,
        timestamp: new Date().toLocaleString('en-US'),
        username: username,
        originalQuantity: currentRefundSale.quantity,
        refundedQuantity: qty,
        exchangeWith: isExchange ? exchangeProductName : null,
        extraPaid: isExchange ? extraPayment : 0,
        
        // STORE IDs FOR FUTURE REFERENCE
        productId: stockItem?.id || currentRefundSale.productId || null,
        stockId: stockItem?.id || currentRefundSale.stockId || null,
        itemId: stockItem?.id || currentRefundSale.itemId || null,
        exchangeProductId: exchangeItem?.id || null,
        
        // METADATA FOR TRACKING
        metadata: {
            searchMethod: foundBy,
            originalProductName: currentRefundSale.productName,
            matchedProductName: productName,
            timestamp: new Date().toISOString(),
            stockItemId: stockItem?.id,
            exchangeItemId: exchangeItem?.id
        }
    };

    // Variables to track stock updates for success message
    let returnedItemUpdated = false;
    let exchangedItemUpdated = false;
    let returnedItemName = productName;
    let exchangedItemName = exchangeProductName;

    try {
        // ========== 1. SAVE REFUND SALE RECORD ==========
        console.log('📝 Saving refund sale record...');
        const saleResponse = await fetch(`${API_BASE}/api/newsales`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(refundSale)
        });
        
        if (!saleResponse.ok) throw new Error('Failed to save refund sale');
        console.log('✅ Refund sale saved');

        // ========== 2. UPDATE STOCK FOR RETURNED ITEM ==========
        if (stockItem) {
            console.log(`📦 RETURNED ITEM: Increasing stock for "${stockItem.name}" by +${qty}`);
            const oldQuantity = parseFloat(stockItem.quantity) || 0;
            const newQuantity = oldQuantity + qty;
            
            // Update local stock
            stockItem.quantity = newQuantity;
            returnedItemUpdated = true;
            returnedItemName = stockItem.name;
            
            // Update backend stock
            await updateStockItem(stockItem, 'Refund/Return Update');
            
            // ========== STOCK HISTORY FOR RETURNED ITEM ==========
            await recordStockHistory({
                action: isExchange ? 'Item Exchanged (Returned to Stock)' : 'Item Refunded (Returned to Stock)',
                itemName: stockItem.name,
                itemId: stockItem.id,
                quantityChange: `+${qty}`,
                quantityBefore: oldQuantity,
                quantityAfter: newQuantity,
                reason: isExchange 
                    ? `Exchange return: ${productName} → ${exchangeProductName}` 
                    : `Refund: ${reason}`,
                type: isExchange ? 'exchange_return' : 'refund',
                saleId: refundSale.id,
                originalSaleId: currentRefundSale.id,
                details: {
                    customerReturned: productName,
                    quantity: qty,
                    price: refundPrice,
                    searchMethod: foundBy
                }
            });
            
            console.log(`✅ Stock updated: ${stockItem.name} ${oldQuantity} → ${newQuantity}`);
        } else {
            console.warn(`⚠️ RETURNED ITEM: Stock item "${productName}" not found`);
            await recordStockHistory({
                action: 'Refund - Stock Item Not Found',
                itemName: productName,
                quantityChange: `+${qty} (NOT UPDATED)`,
                reason: `Refund processed but stock item not found. Sale: ${currentRefundSale.id}`,
                type: 'error',
                saleId: refundSale.id,
                needsAttention: true
            });
        }

        // ========== 3. UPDATE STOCK FOR EXCHANGED ITEM ==========
        if (isExchange && exchangeItem) {
            console.log(`🔄 EXCHANGED ITEM: Decreasing stock for "${exchangeItem.name}" by -${qty}`);
            const oldExchangeQuantity = parseFloat(exchangeItem.quantity) || 0;
            const newExchangeQuantity = oldExchangeQuantity - qty;
            
            // Update local stock
            exchangeItem.quantity = newExchangeQuantity;
            exchangedItemUpdated = true;
            exchangedItemName = exchangeItem.name;
            
            // Update backend stock
            await updateStockItem(exchangeItem, 'Exchange Given Update');
            
            // ========== STOCK HISTORY FOR EXCHANGED ITEM ==========
            await recordStockHistory({
                action: 'Item Exchanged (Given to Customer)',
                itemName: exchangeItem.name,
                itemId: exchangeItem.id,
                quantityChange: `-${qty}`,
                quantityBefore: oldExchangeQuantity,
                quantityAfter: newExchangeQuantity,
                reason: `Exchanged from: ${productName} (Customer received this item)`,
                type: 'exchange_given',
                saleId: refundSale.id,
                originalSaleId: currentRefundSale.id,
                details: {
                    exchangedFrom: productName,
                    exchangedTo: exchangeItem.name,
                    quantity: qty,
                    extraPayment: extraPayment
                }
            });
            
            console.log(`✅ Exchange stock updated: ${exchangeItem.name} ${oldExchangeQuantity} → ${newExchangeQuantity}`);
        } else if (isExchange) {
            console.warn(`⚠️ EXCHANGED ITEM: Exchange item "${exchangeProductName}" not found`);
            await recordStockHistory({
                action: 'Exchange - Item Not Found',
                itemName: exchangeProductName,
                quantityChange: `-${qty} (NOT UPDATED)`,
                reason: `Exchange attempted but item not found. Customer should receive: ${exchangeProductName}`,
                type: 'error',
                saleId: refundSale.id,
                needsAttention: true
            });
        }

        // ========== 4. RECORD EXTRA PAYMENT IF ANY ==========
        if (isExchange && extraPayment > 0) {
            console.log(`💰 Recording extra payment: ${extraPayment} ${currentCurrency || 'FCFA'}`);
            const extraPaymentSale = {
                id: `extra-${Date.now()}`,
                productName: `Extra payment for exchange: ${productName} → ${exchangeProductName}`,
                quantity: 1,
                price: extraPayment,
                totalAmount: extraPayment,
                dateSold: new Date().toISOString().slice(0, 10),
                paymentType: 'Exchange Extra',
                refundReason: 'Extra payment for exchange',
                timestamp: new Date().toLocaleString('en-US'),
                username: username,
                isExchangeExtra: true
            };
            
            await fetch(`${API_BASE}/api/newsales`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(extraPaymentSale)
            });
            
            console.log('✅ Extra payment recorded');
        }

    } catch (err) {
        console.error('❌ Failed to process refund:', err);
                       const checkInterval = setInterval(() => {
            checkCancelled();
        }, 100);
          resetCancellation();
        clearInterval(checkInterval);
        

        checkCancelled();
        
        hideLoading();
        showMessageModal(`Failed to process refund: ${err.message}`);
        return;
    }

    // ========== 5. REFRESH ALL DATA ==========
    try {
        console.log('🔄 Refreshing data...');
        if (!year) year = new Date().getFullYear();
        
        await Promise.all([
            loadSalesForYear(year),
            loadStock(),  // Reload updated stock
            loadStockHistory()  // Reload stock history to show new entries
        ]);
        
        console.log('✅ All data refreshed');
    } catch (refreshErr) {
        console.warn('Partial refresh error:', refreshErr);
        // Continue anyway - show success message
    }

    // ========== 6. SHOW COMPREHENSIVE SUCCESS MESSAGE ==========
    let successMessage = `✅ ${isExchange ? 'EXCHANGE' : 'REFUND'} PROCESSED SUCCESSFULLY!\n\n`;
    
    // Core transaction info
    successMessage += `📋 TRANSACTION DETAILS:\n`;
    successMessage += `• Item: ${productName}\n`;
    successMessage += `• Quantity: ${qty}\n`;
    successMessage += `• Refund Amount: ${formatCurrency(refundPrice)} ${currentCurrency || 'FCFA'}\n`;
    
    if (isExchange) {
        successMessage += `• Exchanged To: ${exchangeProductName}\n`;
        if (extraPayment > 0) {
            successMessage += `• Extra Payment: ${formatCurrency(extraPayment)} ${currentCurrency || 'FCFA'}\n`;
        }
    }
    
    // Stock update summary
    successMessage += `\n📦 STOCK UPDATES:\n`;
    
    if (returnedItemUpdated) {
        successMessage += `✅ ${returnedItemName}: +${qty} (Returned to stock)\n`;
    } else {
        successMessage += `⚠️ ${returnedItemName}: NOT UPDATED (Item not found in stock)\n`;
    }
    
    if (isExchange) {
        if (exchangedItemUpdated) {
            successMessage += `✅ ${exchangedItemName}: -${qty} (Given to customer)\n`;
        } else {
            successMessage += `⚠️ ${exchangeProductName}: NOT UPDATED (Exchange item not found)\n`;
        }
    }
    
    // Search method info
    if (foundBy) {
        successMessage += `\n🔍 Found using: ${foundBy}`;
    }
    
    // Warning if any updates failed
    if ((!returnedItemUpdated) || (isExchange && !exchangedItemUpdated)) {
        successMessage += `\n\n⚠️ IMPORTANT: Some stock updates failed.\n`;
        successMessage += `Please check stock history and update manually if needed.`;
    }
                   const checkInterval = setInterval(() => {
            checkCancelled();
        }, 100);
          resetCancellation();
        clearInterval(checkInterval);
        

        checkCancelled();
        
        hideLoading();
    showMessageModal(successMessage, 'success', 7000);
    currentRefundSale = null;

    // Helper function definitions (moved outside try-catch)
    function findStockItemByNameOrID(name, saleData = null, isExchangeSearch = false) {
        if (!name || !stock || !Array.isArray(stock)) return null;
        
        const cleanName = name.trim().toLowerCase().replace(/\s+/g, ' ');
        let foundItem = null;
        
        // STRATEGY 1: Check if saleData has IDs
        if (saleData && !isExchangeSearch) {
            for (const idField of idFields) {
                if (saleData[idField]) {
                    foundItem = stock.find(item => item.id === saleData[idField]);
                    if (foundItem) {
                        console.log(`Found by ${idField}: ${saleData[idField]}`);
                        return foundItem;
                    }
                }
            }
        }
        
        // STRATEGY 2: Exact name match
        foundItem = stock.find(item => {
            if (!item.name) return false;
            const cleanItemName = item.name.trim().toLowerCase().replace(/\s+/g, ' ');
            return cleanItemName === cleanName;
        });
        if (foundItem) return foundItem;
        
        // STRATEGY 3: Contains match
        foundItem = stock.find(item => {
            if (!item.name) return false;
            const cleanItemName = item.name.trim().toLowerCase().replace(/\s+/g, ' ');
            return cleanItemName.includes(cleanName) || cleanName.includes(cleanItemName);
        });
        if (foundItem) return foundItem;
        
        // STRATEGY 4: Remove common prefixes
        const simplifiedName = cleanName
            .replace(/^(type\s+(to\s+)?|usb\s+|cable\s+|charger\s+)/i, '')
            .trim();
        
        if (simplifiedName !== cleanName) {
            foundItem = stock.find(item => {
                if (!item.name) return false;
                const cleanItemName = item.name.trim().toLowerCase().replace(/\s+/g, ' ');
                const simplifiedItemName = cleanItemName
                    .replace(/^(type\s+(to\s+)?|usb\s+|cable\s+|charger\s+)/i, '')
                    .trim();
                return simplifiedItemName === simplifiedName || 
                       simplifiedItemName.includes(simplifiedName) || 
                       simplifiedName.includes(simplifiedItemName);
            });
            if (foundItem) return foundItem;
        }
        
        // STRATEGY 5: Try without spaces
        const noSpacesName = cleanName.replace(/\s/g, '');
        foundItem = stock.find(item => {
            if (!item.name) return false;
            const cleanItemName = item.name.trim().toLowerCase().replace(/\s+/g, ' ');
            const noSpacesItemName = cleanItemName.replace(/\s/g, '');
            return noSpacesItemName === noSpacesName;
        });
        
        return foundItem;
    }
    
    // Update stock item on backend
    async function updateStockItem(item, reason) {
        try {
            const updateData = {
                ...item,
                quantity: parseFloat(item.quantity),
                oldName: item.name // For backend to find by name if needed
            };
            
            const response = await fetch('/api/stock', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updateData)
            });
            
            if (!response.ok) {
                throw new Error(`Stock update failed: ${response.status}`);
            }
            
            return true;
        } catch (err) {
            console.error(`Failed to update stock for ${item.name}:`, err);
            return false;
        }
    }
    
    // Record stock history entry
    async function recordStockHistory(historyData) {
        try {
            const defaultData = {
                timestamp: new Date().toLocaleString('en-US'),
                username: username,
                date: new Date().toISOString().slice(0, 10)
            };
            
            await fetch('/api/stock-history', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...defaultData, ...historyData })
            });
        } catch (err) {
            console.error('Failed to record stock history:', err);
        }
    }
};
function closeRefundModal() {
    const modal = document.getElementById('refundModal');
    if (modal) {
                modal.classList.remove('show');
    document.body.style.overflow = '';
    }


    setTimeout(() => {
        modal.classList.add('hidden');
    }, 300);
}


function isRefundValid(saleDateString) {
    const duration = businessInfo.warrantyDuration;
    const unit = businessInfo.warrantyUnit;

    // 1. If no guarantee is set, refund is always allowed (unless other logic applies)
    if (unit === 'none' || duration === 0) {
        return true; 
    }

    const saleDate = new Date(saleDateString);
    const now = new Date();
    
    let expires = new Date(saleDate);

    // 2. Calculate Expiration Date
    if (unit === 'days') {
        expires.setDate(expires.getDate() + duration);
    } else if (unit === 'weeks') {
        expires.setDate(expires.getDate() + (duration * 7));
    } else if (unit === 'months') {
        expires.setMonth(expires.getMonth() + duration);
    } else if (unit === 'years') {
        expires.setFullYear(expires.getFullYear() + duration);
    }

    // 3. Check if the current date is before the expiration date
    return now <= expires;
}

async function renderRefundHistoryModal() {
    const tbody = document.getElementById('refundHistoryTableBody');
    const noMsg = document.getElementById('noRefundMessage');

    // Get date filters
    const startDateInput = document.getElementById('refundHistoryStartDate');
    const endDateInput = document.getElementById('refundHistoryEndDate');

    let startDateStr = startDateInput.value;
    let endDateStr = endDateInput.value;

    // 🗓️ If no dates selected, default to TODAY
    if (!startDateStr && !endDateStr) {
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        const todayStr = `${yyyy}-${mm}-${dd}`;
        startDateStr = todayStr;
        endDateStr = todayStr;
        startDateInput.value = todayStr;
        endDateInput.value = todayStr;
    }

    // 🎯 Use applySalesFilter to load sales data for the selected date range
    showLoading();
if (isCancelled) return;
    try {
        await loadSales(startDateStr, endDateStr);
    } catch (error) {
        console.error(translations[currentLanguage]?.failed_load_sales_refund_history || "Failed to load sales for refund history:", error);
        showMessageModal(translations[currentLanguage]?.error_loading_sales_data || "Error loading sales data. Please try again.");
                       const checkInterval = setInterval(() => {
            checkCancelled();
        }, 100);
          resetCancellation();
        clearInterval(checkInterval);
        

        checkCancelled();
        
        hideLoading();
        return;
    }
                   const checkInterval = setInterval(() => {
            checkCancelled();
        }, 100);
          resetCancellation();
        clearInterval(checkInterval);
        

        checkCancelled();
        
        hideLoading();

    // Filter refunds from sales
    let refunds = sales.filter(sale => 
        sale.paymentType === 'Refund' || sale.paymentType === 'Exchange'
    );

    // Additional date filtering (in case loadSales doesn't filter properly)
    if (startDateStr || endDateStr) {
        const start = startDateStr ? new Date(startDateStr) : null;
        const end = endDateStr ? new Date(endDateStr) : null;
        if (end) end.setHours(23, 59, 59, 999);

        refunds = refunds.filter(refund => {
            const refundDate = new Date(refund.dateSold || refund.timestamp);
            return (
                (!isNaN(refundDate.getTime())) &&
                (!start || refundDate >= start) &&
                (!end || refundDate <= end)
            );
        });
    }

    // 🧹 Clear table first
    tbody.innerHTML = '';

    if (refunds.length === 0) {
        noMsg.classList.remove('hidden');
        noMsg.textContent = translations[currentLanguage]?.no_refunds_found || 'No refunds found for selected period';
    } else {
        noMsg.classList.add('hidden');
    }
    
    refunds.forEach(refund => {
        const originalSale = sales.find(s => s.id === refund.refundOf);
        const origSaleId = originalSale ? originalSale.id : '—';
        const origSaleDate = originalSale ? originalSale.dateSold : '—';

        const isExchange = refund.paymentType === 'Exchange';
        const displayName = isExchange && refund.productName.includes(translations[currentLanguage]?.exchange_prefix || 'Exchange:')
            ? refund.productName.split('→')[1]?.trim() || refund.productName
            : refund.productName;
        
        const tr = document.createElement('tr');
        tr.className = 'hover:bg-gray-50';
        
        const reasonText = refund.paymentType === 'Exchange' 
            ? `🔄 ${refund.refundReason || (translations[currentLanguage]?.exchange_label || 'Exchange')}${refund.extraPaid > 0 ? ` (+${refund.extraPaid} ${currentCurrency || 'FCFA'})` : ''}`
            : refund.refundReason || (translations[currentLanguage]?.no_reason_given || 'No reason given');
        
        tr.innerHTML = `
            <td class="px-4 py-2 border">${displayName}</td>
            <td class="px-4 py-2 text-center border">${Math.abs(refund.quantity) || 0}</td>
            <td class="px-4 py-2 text-right border">${formatCurrency(Math.abs(refund.price) || 0)}</td>
            <td class="px-4 py-2 border">${reasonText}</td>
            <td class="px-4 py-2 border">${refund.dateSold || refund.timestamp || 'N/A'}</td>
            <td class="px-4 py-2 text-xs font-mono border">${origSaleId}</td>
            <td class="px-4 py-2 border">${origSaleDate}</td>
        `;
        tbody.appendChild(tr);
    });

    // 🎯 Finally, show modal
    openRefundHistoryModal();
    
    // Apply translations to the modal content
 translateUI();
}

document.getElementById('applyRefundFilterBtn')?.addEventListener('click', renderRefundHistoryModal);

function populateExchangeProductList() {
    const list = document.getElementById('exchangeProductList');
    if (!list) return;

    list.innerHTML = '';

    stock
        .filter(item => item.type === 'product' && item.quantity > 0)
        .forEach(item => {
            const option = document.createElement('option');
            option.value = item.name;
            list.appendChild(option);
        });
}

document.getElementById('isExchangeCheckbox')?.addEventListener('change', function () {
    document.getElementById('exchangeSection').classList.toggle('hidden', !this.checked);
});

function openRefundHistoryModal() {
    const modal = document.getElementById('refundHistoryModal');
    modal.classList.remove('hidden');
    
    modal.classList.add('show');
    document.body.style.overflow = 'hidden';
}
function closeRefundHistoryModal() {
    const modal = document.getElementById('refundHistoryModal');
    modal.classList.remove('show');
    document.body.style.overflow = '';

    setTimeout(() => {
        modal.classList.add('hidden');
    }, 300);
}
