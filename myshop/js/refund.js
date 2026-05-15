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
    let productName = currentRefundSale?.productName || currentRefundSale?.product_name || '';
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
    if (currentRefundSale.refundOf || currentRefundSale.refund_of) {
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
        exchangeItem = findStockItemByNameOrID(exchangeProductName, null, true);
        if (!exchangeItem || exchangeItem.quantity < qty) {
            showMessageModal(translations[currentLanguage]?.exchange_item_unavailable || 'Selected exchange item is out of stock or not found.');
            return;
        }
    }
    
    if (typeof showLoading === 'function') showLoading();
    if (typeof closeRefundModal === 'function') closeRefundModal();

    // ========== FIND STOCK ITEM ==========
    console.group('🔍 STOCK ITEM SEARCH');
    console.log('Looking for:', productName);
    
    let stockItem = null;
    let foundBy = '';
    const idFields = ['productId', 'stockId', 'itemId', 'productID', 'stockID', 'itemID', 'id'];
    
    // STEP 1: ID-based lookup
    for (const idField of idFields) {
        if (currentRefundSale[idField]) {
            stockItem = stock.find(item => item.id === currentRefundSale[idField]);
            if (stockItem) { foundBy = `ID: ${idField}`; break; }
        }
    }
    
    // STEP 2: Embedded stock object
    if (!stockItem && currentRefundSale.stockItem?.id) {
        stockItem = stock.find(item => item.id === currentRefundSale.stockItem.id);
        if (stockItem) foundBy = 'Embedded stockItem';
    }
    
    // STEP 3: Name matching
    if (!stockItem) {
        stockItem = findStockItemByNameOrID(productName, currentRefundSale);
        if (stockItem) foundBy = 'Name matching';
    }
    
    console.log('Found:', stockItem?.name, '| By:', foundBy);
    console.groupEnd();
    
    if (stockItem && stockItem.name !== productName) {
        productName = stockItem.name;
    }

    // ========== GET SUPABASE CLIENT ==========
    const client = getSB();
    if (!client) {
        if (typeof hideLoading === 'function') hideLoading();
        showMessageModal('Database connection failed.');
        return;
    }

    let returnedItemUpdated = false;
    let exchangedItemUpdated = false;
    let returnedItemName = productName;
    let exchangedItemName = exchangeProductName;

    try {
        // ========== 1. SAVE REFUND SALE ==========
        console.log('📝 Saving refund sale...');
        const { error: saleError } = await client
            .from('sales')
            .insert([{
                product_name: isExchange ? `Exchange: ${productName} → ${exchangeProductName}` : productName,
                quantity: -qty,
                price: -Math.abs(refundPrice),
                total_amount: -Math.abs(refundPrice * qty),
                date_sold: new Date().toISOString().slice(0, 10),
                payment_type: isExchange ? 'Exchange' : 'Refund',
                refund_of: currentRefundSale.id,
                refund_reason: isExchange
                    ? `Item exchanged: ${productName} → ${exchangeProductName}${extraPayment > 0 ? ` (+${extraPayment} ${currentCurrency || 'FCFA'} extra)` : ''}`
                    : reason,
                username: username,
                exchange_with: isExchange ? exchangeProductName : null,
                extra_paid: isExchange ? extraPayment : 0,
                product_id: stockItem?.id || null,
                exchange_product_id: exchangeItem?.id || null,
                business_id: currentUser?.business_id || businessInfo?.id || localStorage.getItem('businessId') || null,
                metadata: { searchMethod: foundBy, originalProductName: currentRefundSale.productName || currentRefundSale.product_name, matchedProductName: productName, stockItemId: stockItem?.id, exchangeItemId: exchangeItem?.id },
                created_at: new Date().toISOString()
            }]);

        if (saleError) throw new Error('Failed to save refund sale: ' + saleError.message);
        console.log('✅ Refund sale saved');

        // ========== 2. UPDATE STOCK FOR RETURNED ITEM ==========
        if (stockItem) {
            const oldQuantity = parseFloat(stockItem.quantity) || 0;
            const newQuantity = oldQuantity + qty;
            
            stockItem.quantity = newQuantity;
            returnedItemUpdated = true;
            returnedItemName = stockItem.name;
            
            // Update Supabase stock
            const { error: stockError } = await client
                .from('stock')
                .update({ quantity: newQuantity, updated_at: new Date().toISOString() })
                .eq('id', stockItem.id);

            if (stockError) console.warn('Stock update warning:', stockError.message);
            
            // Record stock history
            await client.from('stock_history').insert([{
                item_name: stockItem.name,
                action: isExchange ? 'Item Exchanged (Returned to Stock)' : 'Item Refunded',
                quantity_change: `+${qty}`,
                username: username,
                business_id: currentUser?.business_id || businessInfo?.id || localStorage.getItem('businessId') || null,
                timestamp: new Date().toISOString()
            }]);
            
            console.log(`✅ Stock updated: ${stockItem.name} ${oldQuantity} → ${newQuantity}`);
        } else {
            console.warn(`⚠️ Stock item "${productName}" not found`);
        }

        // ========== 3. UPDATE STOCK FOR EXCHANGED ITEM ==========
        if (isExchange && exchangeItem) {
            const oldExchangeQty = parseFloat(exchangeItem.quantity) || 0;
            const newExchangeQty = oldExchangeQty - qty;
            
            exchangeItem.quantity = newExchangeQty;
            exchangedItemUpdated = true;
            exchangedItemName = exchangeItem.name;
            
            const { error: exchError } = await client
                .from('stock')
                .update({ quantity: newExchangeQty, updated_at: new Date().toISOString() })
                .eq('id', exchangeItem.id);

            if (exchError) console.warn('Exchange stock update warning:', exchError.message);
            
            await client.from('stock_history').insert([{
                item_name: exchangeItem.name,
                action: 'Item Exchanged (Given to Customer)',
                quantity_change: `-${qty}`,
                username: username,
                business_id: currentUser?.business_id || businessInfo?.id || localStorage.getItem('businessId') || null,
                timestamp: new Date().toISOString()
            }]);
                        
            console.log(`✅ Exchange stock updated: ${exchangeItem.name} ${oldExchangeQty} → ${newExchangeQty}`);
        }

        // ========== 4. RECORD EXTRA PAYMENT ==========
        if (isExchange && extraPayment > 0) {
            const { error: extraError } = await client
                .from('sales')
                .insert([{
                    product_name: `Extra payment: ${productName} → ${exchangeProductName}`,
                    quantity: 1,
                    price: extraPayment,
                    total_amount: extraPayment,
                    date_sold: new Date().toISOString().slice(0, 10),
                    payment_type: 'Exchange Extra',
                    username: username,
                    business_id: currentUser?.business_id || businessInfo?.id || localStorage.getItem('businessId') || null,
                    is_exchange_extra: true,
                    created_at: new Date().toISOString()
                }]);

            if (extraError) console.warn('Extra payment warning:', extraError.message);
            else console.log('✅ Extra payment recorded');
        }

    } catch (err) {
        console.error('❌ Failed to process refund:', err);
        if (typeof hideLoading === 'function') hideLoading();
        showMessageModal(`Failed to process refund: ${err.message}`);
        return;
    }

    // ========== 5. REFRESH DATA ==========
    try {
        if (!year) year = new Date().getFullYear();
        await Promise.all([
            typeof loadSalesForYear === 'function' ? loadSalesForYear(year) : Promise.resolve(),
            typeof loadStock === 'function' ? loadStock() : Promise.resolve(),
            typeof loadStockHistory === 'function' ? loadStockHistory() : Promise.resolve()
        ]);
    } catch (refreshErr) {
        console.warn('Refresh error:', refreshErr);
    }

    // ========== 6. SUCCESS MESSAGE ==========
    let successMessage = `✅ ${isExchange ? 'EXCHANGE' : 'REFUND'} PROCESSED!\n\n`;
    successMessage += `📋 Item: ${productName}\n`;
    successMessage += `📋 Quantity: ${qty}\n`;
    successMessage += `📋 Amount: ${typeof formatCurrency === 'function' ? formatCurrency(refundPrice) : refundPrice}\n`;
    
    if (isExchange) {
        successMessage += `🔄 Exchanged to: ${exchangeProductName}\n`;
        if (extraPayment > 0) successMessage += `💰 Extra: ${extraPayment}\n`;
    }
    
    successMessage += `\n📦 Stock:\n`;
    successMessage += returnedItemUpdated ? `✅ ${returnedItemName}: +${qty}\n` : `⚠️ Stock not updated\n`;
    if (isExchange) {
        successMessage += exchangedItemUpdated ? `✅ ${exchangedItemName}: -${qty}\n` : `⚠️ Exchange stock not updated\n`;
    }

    if (typeof hideLoading === 'function') hideLoading();
    showMessageModal(successMessage, 'success', 7000);
    currentRefundSale = null;

    // ========== HELPER: Find stock by name or ID ==========
    function findStockItemByNameOrID(name, saleData = null, isExchangeSearch = false) {
        if (!name || !stock || !Array.isArray(stock)) return null;
        const cleanName = name.trim().toLowerCase().replace(/\s+/g, ' ');
        
        if (saleData && !isExchangeSearch) {
            for (const idField of idFields) {
                if (saleData[idField]) {
                    const found = stock.find(item => item.id === saleData[idField]);
                    if (found) return found;
                }
            }
        }
        
        return stock.find(item => {
            if (!item.name) return false;
            const itemName = item.name.trim().toLowerCase().replace(/\s+/g, ' ');
            return itemName === cleanName || itemName.includes(cleanName) || cleanName.includes(itemName);
        });
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
