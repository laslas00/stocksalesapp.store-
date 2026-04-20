function renderCustomReceiptFromSales(salesList, customer, date) {
    const tbody = document.getElementById('customReceiptProductTable');
    if (!tbody) return;

    // Clear all except filter row
    Array.from(tbody.children).forEach(row => {
        if (row.id !== 'customReceiptFilterRow') tbody.removeChild(row);
    });

    // 🗓️ Handle default date: today
    let targetDate;
    if (!date) {
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        date = `${yyyy}-${mm}-${dd}`;
        targetDate = today;
    } else {
        targetDate = new Date(date);
    }

    const dayName = targetDate.toLocaleDateString(currentLanguage, { weekday: 'long' });
    const formattedDate = targetDate.toLocaleDateString(currentLanguage, { year: 'numeric', month: 'long', day: 'numeric' });

    // Filter sales by the date
    const allSalesOnDate = salesList.filter(sale => {
        const saleDate = new Date(sale.dateSold);
        return saleDate.toISOString().slice(0, 10) === date;
    });

    // If no sales
    if (allSalesOnDate.length === 0) {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td colspan="7" class="text-center py-4 text-gray-500">
                ${translate('no_sales_found_for_date')} ${customer ? `${translate('for')} '${customer}'` : ''} ${translate('on')} ${dayName}, ${formattedDate}
            </td>`;
        tbody.appendChild(tr);
        currentCustomReceiptData = null;
        return;
    }

    // ✅ Initialize receipt data
    currentCustomReceiptData = { customer, date, items: [] };

    // Render each sale with Add button
    allSalesOnDate.forEach(sale => {
        const tr = document.createElement('tr');

        // Format payment info
        let paymentInfo = sale.paymentType;
        if (sale.paymentType === translate('mobile_money') && sale.mobileMoneyType) {
            paymentInfo += ` (${sale.mobileMoneyType})`;
        } else if (sale.paymentType === translate('mixed_payment') && sale.hybridBreakdown) {
            const parts = [];
            if (sale.hybridBreakdown.cash > 0) parts.push(translate('cash'));
            if (sale.hybridBreakdown.mobile > 0) {
                parts.push(translate('mobile_money') + (sale.hybridBreakdown.mobileType ? ` (${sale.hybridBreakdown.mobileType})` : ''));
            }
            if (sale.hybridBreakdown.credit > 0) parts.push(translate('credit'));
            paymentInfo = `${translate('mixed')} (${parts.join(' + ')})`;
        }

        // Build table row
        tr.innerHTML = `
            <td class="px-2 py-1">
                <button class="bg-green-500 hover:bg-green-600 text-white px-2 py-1 rounded text-xs add-to-custom-receipt" 
                        data-sale-id="${sale.id}">
                    ${translate('add')}
                </button>
            </td>
            <td class="px-2 py-1">${sale.productName} (${translate(sale.type?.toLowerCase())})</td>
            <td class="px-2 py-1 text-center">${sale.quantity}</td>
            <td class="px-2 py-1 text-right">${formatCurrency(sale.price)}</td>
            <td class="px-2 py-1 text-sm text-blue-600">${paymentInfo}</td>
            <td class="px-2 py-1 text-gray-500 text-xs">
                ${sale.customerName ? `${translate('customer_colon')} ${sale.customerName}` : translate('no_customer')}
            </td>
        `;

        tbody.appendChild(tr);
    });

    // 🎯 Add event listeners for Add buttons

    // 🕒 Optional: show day and date on modal header
    const header = document.getElementById('customReceiptHeaderDate');
    if (header) {
        header.textContent = `${translate('sales_for')} ${dayName}, ${formattedDate}`;
    }
}

window.addCustomReceiptItem = function(saleId) {
    const sale = sales.find(s => s.id === saleId);
    if (!sale) return;
    const safeName = sale.productName.replace(/\s+/g, '_');
    const qtyInput = document.getElementById('customQtyInput_' + safeName + '_' + sale.id);
    const priceInput = document.getElementById('customPriceInput_' + safeName + '_' + sale.id);
    let qty = parseInt(qtyInput.value, 10) || 1;
    let price = parseFloat(priceInput.value);
    if (qty > sale.quantity) qty = sale.quantity;
    if (qty < 1) qty = 1;
    if (isNaN(price) || price < 0) price = sale.price || 0;

    customReceiptItems.push({
        id: sale.id,
        name: sale.productName,
        price: price,
        quantity: qty,
        subtotal: price,
        type: sale.type
    });

    renderCustomReceiptSelectedTable();
    updateCustomReceiptTotal();
};

window.removeCustomReceiptItem = function(saleId) {
    customReceiptItems = customReceiptItems.filter(i => i.id !== saleId);
    renderCustomReceiptSelectedTable();
    updateCustomReceiptTotal();
};

window.updateCustomReceiptQty = function(saleId, newQty) {
    const item = customReceiptItems.find(i => i.id === saleId);
    const sale = sales.find(s => s.id === saleId);
    if (item && sale) {
        let qty = parseInt(newQty, 10) || 1;
        if (qty > sale.quantity) qty = sale.quantity;
        if (qty < 1) qty = 1;
        item.quantity = qty;
        item.subtotal = item.price;
        renderCustomReceiptSelectedTable();
        updateCustomReceiptTotal();
    }
};

window.updateCustomReceiptPrice = function(saleId, newPrice) {
    const item = customReceiptItems.find(i => i.id === saleId);
    if (item) {
        let price = parseFloat(newPrice);
        if (isNaN(price) || price < 0) price = 0;
        item.price = price;
        item.subtotal = item.price;
        renderCustomReceiptSelectedTable();
        updateCustomReceiptTotal();
    }
};

function renderCustomReceiptProductTable() {
    const tbody = document.getElementById('customReceiptProductTable');
    if (!tbody) return;

    // Clear all rows
    tbody.innerHTML = '';

    const customer = document.getElementById('customReceiptCustomerFilter').value.trim();
    const date = document.getElementById('customReceiptDateFilter').value;
    
    if (!date) {
        const emptyRow = document.createElement('tr');
        emptyRow.innerHTML = `<td colspan="5" class="text-center py-4 text-gray-500">${translate('select_date_first')}</td>`;
        tbody.appendChild(emptyRow);
        return;
    }

    // Get all sales on that date
    const allSalesOnDate = sales.filter(s => s.dateSold === date && s.paymentType !== translate('refund'));

    if (allSalesOnDate.length === 0) {
        const emptyRow = document.createElement('tr');
        emptyRow.innerHTML = `<td colspan="5" class="text-center py-4 text-gray-500">${translate('no_sales_for_selected_date')}</td>`;
        tbody.appendChild(emptyRow);
        return;
    }

    // Track which sale IDs are already in the custom receipt
    const selectedSaleIds = new Set((currentCustomReceiptData?.items || []).map(item => item.id));

    allSalesOnDate.forEach(sale => {
        const tr = document.createElement('tr');
        tr.className = 'border-b hover:bg-gray-50';
        let paymentInfo = sale.paymentType;
        if (sale.paymentType === translate('mobile_money') && sale.mobileMoneyType) {
            paymentInfo += ` (${sale.mobileMoneyType})`;
        } else if (sale.paymentType === translate('mixed_payment') && sale.hybridBreakdown) {
            const parts = [];
            if (sale.hybridBreakdown.cash > 0) parts.push(translate('cash'));
            if (sale.hybridBreakdown.mobile > 0) {
                parts.push(translate('mobile_money') + (sale.hybridBreakdown.mobileType ? ` (${sale.hybridBreakdown.mobileType})` : ''));
            }
            if (sale.hybridBreakdown.credit > 0) parts.push(translate('credit'));
            paymentInfo = `${translate('mixed')} (${parts.join(' + ')})`;
        }

        // Check if already added
        const isAlreadyAdded = selectedSaleIds.has(sale.id);
        const addButtonHtml = isAlreadyAdded
            ? `<button class="bg-gray-400 text-white px-2 py-1 rounded text-xs" disabled>${translate('added')}</button>`
            : `<button class="bg-green-500 hover:bg-green-600 text-white px-2 py-1 rounded text-xs add-to-custom-receipt" data-sale-id="${sale.id}">${translate('add')}</button>`;

        tr.innerHTML = `
            <td class="px-2 py-1">${addButtonHtml}</td>
            <td class="px-2 py-1">${sale.productName} (${translate(sale.type?.toLowerCase())})</td>
            <td class="px-2 py-1 text-right">${sale.quantity}</td>
            <td class="px-2 py-1 text-right">${formatCurrency(sale.price)}</td>
            <td class="px-2 py-1 text-right">${formatCurrency(sale.price)}</td>
            <td class="px-2 py-1 text-sm text-blue-600">${paymentInfo}</td>
            <td class="px-2 py-1 text-gray-500 text-xs">
                ${sale.customerName ? `${translate('customer_colon')} ${sale.customerName}` : translate('no_customer')}
            </td>
        `;
        tbody.appendChild(tr);
    });

    // Add event listeners to "Add" buttons
    document.querySelectorAll('.add-to-custom-receipt').forEach(btn => {
        btn.addEventListener('click', function() {
            const saleId = this.getAttribute('data-sale-id');
            const sale = sales.find(s => s.id === saleId);
            if (!sale) return;

            // Get the quantity from the input field
            const qtyInput = document.querySelector(`.custom-receipt-qty[data-sale-id="${saleId}"]`);
            const quantity = parseInt(qtyInput?.value || sale.quantity);

            const item = {
                id: sale.id,
                name: sale.productName,
                type: sale.type,
                quantity: quantity,
                price: sale.price,
                paymentType: sale.paymentType,
                mobileMoneyType: sale.mobileMoneyType,
                hybridBreakdown: sale.hybridBreakdown,
                customerName: sale.customerName || customer,
                advancePaymentDate: sale.advancePaymentDate, // Make sure this is included
                advancePayment: sale.advancePayment, // Also include advance payment amount if exists
                customerPhoneNumber: sale.customerPhoneNumber || ''
            };
                        // Initialize if needed
            if (!currentCustomReceiptData) {
                currentCustomReceiptData = {
                    customer: customer,
                    customerPhoneNumber: sale.customerPhoneNumber || '',
                    date: date,
                    items: []
                };
            }

            // Prevent duplicates
            if (!currentCustomReceiptData.items.some(i => i.id === item.id)) {
                currentCustomReceiptData.items.push(item);
                renderCustomReceiptSelectedTable();
                
                // Disable the Add button
                this.disabled = true;
                this.textContent = translate('added');
                this.classList.remove('bg-green-500', 'hover:bg-green-600');
                this.classList.add('bg-gray-400', 'cursor-not-allowed');
            }
        });
    });
;
    // Add event listeners to quantity inputs
    document.querySelectorAll('.custom-receipt-qty').forEach(input => {
        input.addEventListener('change', function() {
            const saleId = this.getAttribute('data-sale-id');
            const maxQty = parseInt(this.getAttribute('max'));
            let value = parseInt(this.value);
            
            if (isNaN(value) || value < 1) value = 1;
            if (value > maxQty) value = maxQty;
            
            this.value = value;
        });
    });
}

function renderCustomReceiptSelectedTable() {
    const tbody = document.getElementById('customReceiptSelectedTable');
    if (!tbody) {
        console.error('customReceiptSelectedTable element not found');
        return;
    }
    
    tbody.innerHTML = '';

    // Use the correct data source
    const items = currentCustomReceiptData?.items || [];
    
    if (!items || items.length === 0) {
        const emptyRow = document.createElement('tr');
        emptyRow.innerHTML = `
            <td colspan="5" class="text-center text-gray-500 py-4">
                ${translate('no_items_selected_yet')}
            </td>`;
        tbody.appendChild(emptyRow);
        return;
    }

    items.forEach((item, index) => {
        const subtotal = (item.price || 0) * (item.quantity || 1);
        const tr = document.createElement('tr');
        tr.className = 'hover:bg-gray-50 border-b';
        tr.innerHTML = `
            <td class="px-4 py-2 text-sm">${item.name} (${item.type ? translate(item.type.toLowerCase()) : translate('product')})</td>
            <td class="px-4 py-2 text-sm text-center">${item.quantity || 1}</td>
            <td class="px-4 py-2 text-sm text-right">${formatCurrency(item.price || 0)}</td>
            <td class="px-4 py-2 text-sm text-right font-semibold">${formatCurrency(subtotal)}</td>
            <td class="px-4 py-2 text-center">
                <button class="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-xs remove-custom-item" 
                        data-index="${index}">
                    ${translate('remove')}
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    // Add event listeners to remove buttons
    document.querySelectorAll('.remove-custom-item').forEach(btn => {
        btn.addEventListener('click', function() {
            const index = parseInt(this.getAttribute('data-index'));
            removeCustomReceiptItem(index);
        });
    });

    updateCustomReceiptTotal();
}

function removeCustomReceiptItem(index) {
    if (currentCustomReceiptData?.items) {
        currentCustomReceiptData.items.splice(index, 1);
        renderCustomReceiptSelectedTable();
        renderCustomReceiptProductTable(); // Re-enable the "Add" button
    }
}

function updateCustomReceiptTotal() {
    const items = currentCustomReceiptData?.items || [];
    const total = items.reduce((sum, item) => {
        return sum + ((item.price || 0) * (item.quantity || 1));
    }, 0);
    
    const totalElement = document.getElementById('customReceiptTotal');
    if (totalElement) {
        totalElement.textContent = formatCurrency(Math.round(total));
    }
}

document.getElementById('openCustomReceiptBtn').onclick = function() {
    // Initialize data structure
    currentCustomReceiptData = {
        customer: document.getElementById('customReceiptCustomerFilter').value.trim(),
        date: document.getElementById('customReceiptDateFilter').value,
        items: []
    };
    
    // Set default date if empty
    const dateInput = document.getElementById('customReceiptDateFilter');
    if (dateInput && !dateInput.value) {
        const today = new Date().toISOString().slice(0, 10);
        dateInput.value = today;
        currentCustomReceiptData.date = today;
    }
    
    renderCustomReceiptSelectedTable();
    renderCustomReceiptProductTable();
   document.getElementById('filterOptionsBtn').classList.add('hidden');
    document.getElementById('customReceiptModal').classList.remove('hidden');
    document.getElementById('customReceiptModal').classList.add('MODAL-LOCK-OPEN');
    setTimeout(() => {
        translateUI();
    }, 100);
};


document.getElementById('openCustomReceiptBtnfromslaeshistory').onclick = function() {
    // Initialize data structure
    currentCustomReceiptData = {
        customer: document.getElementById('customReceiptCustomerFilter').value.trim(),
        date: document.getElementById('customReceiptDateFilter').value,
        items: []
    };
    
    // Set default date if empty
    const dateInput = document.getElementById('customReceiptDateFilter');
    if (dateInput && !dateInput.value) {
        const today = new Date().toISOString().slice(0, 10);
        dateInput.value = today;
        currentCustomReceiptData.date = today;
    }
    
    renderCustomReceiptSelectedTable();
    renderCustomReceiptProductTable();
   document.getElementById('filterOptionsBtn').classList.remove('hidden');
    document.getElementById('customReceiptModal').classList.remove('hidden');
    document.getElementById('customReceiptModal').classList.add('MODAL-LOCK-OPEN');
    setTimeout(() => {
        translateUI();
    }, 100);
};
function generateCustomReceiptContent() {
    const business = businessInfo;
        const customerPhoneNumber = currentCustomReceiptData?.customerPhoneNumber || '';
    
    // Add phone number to the header section
    const phoneNumberHtml = customerPhoneNumber ? 
        `<div style="font-size:0.9rem;">Phone: ${customerPhoneNumber}</div>` : '';
        console.log("Generating receipt with customer phone number:", customerPhoneNumber);
    const itemsHtml = customReceiptItems.map(item => `
        <tr>
            <td style="padding:4px 8px;">${item.name} (${translate(item.type?.toLowerCase())})</td>
            <td style="padding:4px 8px; text-align:right;">${item.quantity}</td>
            <td style="padding:4px 8px; text-align:right;">${Math.round(item.price)}</td>
            <td style="padding:4px 8px; text-align:right;">${Math.round(item.subtotal)}</td>
        </tr>
    `).join('');
    const total = customReceiptItems.reduce((sum, i) => sum + i.subtotal, 0);

     const itemsWithAdvanceDate = currentCustomReceiptData?.items?.filter(item => 
        item.advancePaymentDate
    ) || [];
    
    // Get the earliest advance payment date if multiple items have it
    let advancePaymentDate = null;
    if (itemsWithAdvanceDate.length > 0) {
        // Sort dates and get the earliest one
        const dates = itemsWithAdvanceDate
            .map(item => new Date(item.advancePaymentDate))
            .sort((a, b) => a - b);
        advancePaymentDate = dates[0];
    }
    
    // Add advance payment date to QR code if exists
    if (advancePaymentDate) {
        qrLines.push(`${translate('advance_payment_date')}: ${advancePaymentDate.toLocaleDateString(currentLanguage)}`);
    }
    
    let warrantyHtml = '';
    if (business.warrantyUnit !== 'none' && business.warrantyDuration > 0) {
        // Get the most recent sale date from items (for warranty calculation)
        let latestSaleDate = new Date();
        
        // Try to find a date from currentCustomReceiptData or use today
        if (currentCustomReceiptData && currentCustomReceiptData.date) {
            latestSaleDate = new Date(currentCustomReceiptData.date);
        }
        
        // Calculate warranty expiration
        let expires = new Date(latestSaleDate);
        const duration = business.warrantyDuration;
        const unit = business.warrantyUnit;

        if (unit === 'days') expires.setDate(expires.getDate() + duration);
        else if (unit === 'weeks') expires.setDate(expires.getDate() + (duration * 7));
        else if (unit === 'months') expires.setMonth(expires.getMonth() + duration);
        else if (unit === 'years') expires.setFullYear(expires.getFullYear() + duration);
        
        // Format warranty period
        const warrantyPeriod = `${duration} ${translate(unit)}`;
        
        // Use custom warranty text or default
        const warrantyText = business.warrantyText?.trim() || 
                           translate('defaultGuaranteeText').replace('${warrantyPeriod}', warrantyPeriod);
        
        warrantyHtml = `
            <div style="margin-top: 1.5rem; padding-top: 1rem; border-top: 1px dashed #ccc;">
                <p style="font-weight: bold; margin-bottom: 0.5rem; font-size: 1rem;">
                    ${translate('guarantee')}:
                </p>
                <p style="margin-bottom: 0.5rem; font-size: 0.95rem;">
                    ${warrantyText}
                </p>
                <p style="color: #dc2626; font-weight: 600; font-size: 0.95rem;">
                    ${translate('validUntil')}: ${expires.toLocaleDateString(currentLanguage)}
                </p>
            </div>
        `;
    }

    return `
        <div class="text-center mb-4">
            ${business.logoData ? `<img src="${business.logoData}" alt="Logo" style="height:60px; margin:auto;">` : ''}
            <h2 style="font-size:1.5rem;font-weight:bold;">${business.name || ''}</h2>
            <div style="font-size:0.95rem;">${business.details || ''}</div>
            <div style="font-size:0.9rem;">${business.address || ''}</div>
            <div style="font-size:0.9rem;">${business.shopNumber || ''} ${business.phoneNumberTwo ? ' | ' + business.phoneNumberTwo : ''}</div>
            <div style="font-size:0.9rem;">${business.email || ''}</div>
             <div style="font-size:0.9rem;">${business.Website || ''}</div>
            <div style="font-size:0.9rem;">${business.socialMediaHandles || ''}</div>
        </div>
        <table style="width:100%;border-collapse:collapse;margin-bottom:1rem;">
            <thead>
                <tr>
                    <th style="border-bottom:1px solid #ccc;padding:4px 8px;text-align:left;">${translate('product_service')}</th>
                    <th style="border-bottom:1px solid #ccc;padding:4px 8px;text-align:right;">${translate('quantity')}</th>
                    <th style="border-bottom:1px solid #ccc;padding:4px 8px;text-align:right;">${translate('price')}</th>
                    <th style="border-bottom:1px solid #ccc;padding:4px 8px;text-align:right;">${translate('subtotal')}</th>
                </tr>
            </thead>
            <tbody>
                ${itemsHtml}
            </tbody>
            <tfoot>
                <tr>
                    <td colspan="3" style="text-align:right;font-weight:bold;padding:4px 8px;">${translate('total')}</td>
                    <td style="text-align:right;font-weight:bold;padding:4px 8px;">${formatCurrency(Math.round(total))}</td>
                </tr>
            </tfoot>
        </table>
        ${warrantyHtml}
        <div class="text-center" style="margin-top:2rem;font-size:1.1rem;">
            <p>${translate('thank_you_for_business')}</p>
            <p style="font-size:0.95rem;">${translate('computer_generated_receipt')}</p>
        </div>
    `;
}
document.getElementById('customReceiptGenerateBtn').onclick = async function() {
    if (!currentCustomReceiptData || currentCustomReceiptData.items.length === 0) {
        showMessageModal(translate('add_at_least_one_item'));
        return;
    }
    showLoading();

    await ensureBusinessInfoLoaded();
    await loadBusinessInfo();
    
    const cashierName1 = currentUser ? currentUser.username : translate('unknown');
    const { customer, date, items } = currentCustomReceiptData;
    const receiptId = `CR-${Date.now().toString().slice(-6)}`;

    // --- Calculate per‑item tax and enrich items ---
    let subtotal = 0;
    let totalTax = 0;

    items.forEach(item => {
        const lineSubtotal = (item.price || 0) * (item.quantity || 1);
        subtotal += lineSubtotal;
        const sale = sales.find(s => s.id === item.id);
        let itemTax = 0;
        if (sale && sale.taxRate) {
            itemTax = lineSubtotal * (sale.taxRate / 100);
            totalTax += itemTax;
        }
        // Attach tax info to the item (so showReceiptFromData can use it)
        item.taxAmount = itemTax;
        item.taxRate = sale?.taxRate || 0;
    });

    const total = subtotal + totalTax;

    // --- Extract advance payment info (unchanged) ---
    let advancePaymentDate = null;
    let advancePaymentAmount = 0;
    for (const item of items) {
        if (item.advancePaymentDate) {
            advancePaymentDate = item.advancePaymentDate;
            if (item.hybridBreakdown?.credit > 0) {
                advancePaymentAmount = item.hybridBreakdown.credit;
            }
            break;
        }
    }
    if (!advancePaymentDate) {
        for (const item of items) {
            if (item.hybridBreakdown?.credit > 0) {
                const sale = sales.find(s => s.id === item.id);
                if (sale?.advancePaymentDate) {
                    advancePaymentDate = sale.advancePaymentDate;
                    advancePaymentAmount = sale.hybridBreakdown?.credit || 0;
                    break;
                }
            }
        }
    }

    // --- Build payment type display (for QR and receipt) ---
    let paymentTypeDisplay = 'Cash';
    if (items && items.length > 0) {
        const firstPaymentType = items[0]?.paymentType;
        const allSameType = items.every(item => item.paymentType === firstPaymentType);
        if (allSameType && firstPaymentType) {
            paymentTypeDisplay = translatePaymentType(firstPaymentType);
        } else {
            const uniqueTypes = [...new Set(items.map(item => item.paymentType || 'Cash'))];
            const translatedTypes = uniqueTypes.map(type => translatePaymentType(type));
            paymentTypeDisplay = translate('mixedPayment') + ' (' + translatedTypes.join(' + ') + ')';
        }
    }

    // --- Generate QR code (include tax) ---
    const qrLines = [
        translate('custom_receipt'),
        `${translate('id_colon')} ${receiptId}`,
        `${translate('customer_colon')} ${customer || translate('unknown')}`,
        `${translate('date_colon')} ${date}`,
        `${translate('items_colon')}`
    ];
    items.forEach(i => {
        qrLines.push(`- ${i.name} ${translate('quantity').toLowerCase()} ${i.quantity} ${translate('price').toLowerCase()} ${i.price} ${currentCurrency}`);
    });
    qrLines.push(`${translate('subtotal')}: ${formatCurrency(subtotal)} ${currentCurrency}`);
    qrLines.push(`${translate('tax')}: ${formatCurrency(totalTax)} ${currentCurrency}`);
    qrLines.push(`${translate('total_colon')} ${total} ${currentCurrency}`);

    if (advancePaymentDate) {
        qrLines.push(`${translate('advance_payment_date')}: ${formatPaymentDueDate(advancePaymentDate)}`);
        if (advancePaymentAmount > 0) {
            qrLines.push(`${translate('advance_payment_amount')}: ${formatCurrency(advancePaymentAmount)}`);
        }
    }
    const paymentTypes = new Set(items.map(i => i.paymentType));
    qrLines.push(`${translate('paid_with')}: ${Array.from(paymentTypes).join(', ')}`);

    let qrDataUrl = '';
    try {
        const qr = new QRious({ value: qrLines.join('\n'), size: 160, level: 'M' });
        qrDataUrl = qr.toDataURL();
    } catch (e) {
        console.error("QR generation failed:", e);
        showMessageModal(translate('qr_generation_failed'));
    }

    // --- Prepare receipt data object (all needed for showReceiptFromData) ---
    const receiptData = {
        receiptId: receiptId,
        date: date,
        items: items,                           // now includes taxAmount & taxRate
        customerName: getMostFrequentCustomerName(items) || customer || translate('unknown'),
        cashier: cashierName1,
        customerPhoneNumber: currentCustomReceiptData.customerPhoneNumber || '',
        advancePaymentAmount: advancePaymentAmount,
        advancePaymentDate: advancePaymentDate,
        amountPaid: total,                       // assume full payment
        balanceDue: 0,
        paymentTypeDisplay: paymentTypeDisplay
        
    };

    // --- Show the receipt using the unified function (non‑editable) ---
    await showReceiptFromData(receiptData);

    // --- Save receipt to backend ---
    await saveCustomerReceipt(receiptData);

    // --- Cleanup custom receipt modal ---
    cleanupCustomReceiptModal();

    const checkInterval = setInterval(() => { checkCancelled(); }, 100);
    resetCancellation();
    clearInterval(checkInterval);
    checkCancelled();
    hideLoading();

    // Ensure the receipt modal is visible (showReceiptFromData already does this)
    document.getElementById('receiptModal').classList.add('MODAL-LOCK-OPEN');
};

function getMostFrequentCustomerName(items) {
    if (!items || items.length === 0) return null;
    
    // Count frequency of customer names
    const customerCount = {};
    items.forEach(item => {
        const customer = item.customerName?.trim();
        if (customer && customer !== '') {
            customerCount[customer] = (customerCount[customer] || 0) + 1;
        }
    });
    
    // Find the most frequent customer name
    let mostFrequentCustomer = null;
    let maxCount = 0;
    
    Object.entries(customerCount).forEach(([customer, count]) => {
        if (count > maxCount) {
            maxCount = count;
            mostFrequentCustomer = customer;
        }
    });
    
    return mostFrequentCustomer;
}

function cleanupCustomReceiptModal() {
    document.querySelectorAll('.add-to-custom-receipt').forEach(btn => {
        btn.replaceWith(btn.cloneNode(true));
    });
    
    // Remove all event listeners from Remove buttons
    document.querySelectorAll('.remove-custom-item').forEach(btn => {
        btn.replaceWith(btn.cloneNode(true));
    });
    
    // Remove all event listeners from quantity inputs
    document.querySelectorAll('.custom-receipt-qty').forEach(input => {
        input.replaceWith(input.cloneNode(true));
    });
    
    // Clear all tables and inputs
    document.getElementById('customReceiptCustomerFilter').value = '';
    document.getElementById('customReceiptDateFilter').value = '';
    document.getElementById('customReceiptProductTable').innerHTML = '';
    document.getElementById('customReceiptSelectedTable').innerHTML = '';
    document.getElementById('customReceiptTotal').textContent = '0.00';
    
    // Clear suggestions
    const suggestions = document.getElementById('customCustomerSuggestions');
    suggestions.innerHTML = '';
    suggestions.classList.add('hidden');
    
    // Clear header
    document.getElementById('customReceiptHeaderDate').textContent = '';
    
    // Reset data
    currentCustomReceiptData = null;
    customReceiptItems = [];
    
    // Hide modal
    document.getElementById('customReceiptModal').classList.add('hidden');
    
    console.log('Custom receipt modal cleaned and hidden');
}

window.closeReceiptModal = function() {
    document.getElementById('receiptModal').classList.add('hidden');
};

document.getElementById('customReceiptCustomerFilter').addEventListener('input', function() {
    const input = this.value.trim().toLowerCase();
    const suggestions = document.getElementById('customCustomerSuggestions');
    suggestions.innerHTML = '';
    if (!input) {
        suggestions.classList.add('hidden');
        return;
    }
    const customers = getCustomerNames().filter(name => name.toLowerCase().includes(input));
    if (customers.length === 0) {
        suggestions.classList.add('hidden');
        return;
    }
    customers.forEach(name => {
        const div = document.createElement('div');
        div.className = 'px-3 py-1 hover:bg-blue-100 cursor-pointer';
        div.textContent = name;
        div.onclick = () => {
            document.getElementById('customReceiptCustomerFilter').value = name;
            suggestions.classList.add('hidden');
        };
        suggestions.appendChild(div);
    });
    suggestions.classList.remove('hidden');
});

function getCustomerNames() {
    const names = new Set();
    sales.forEach(s => {
        if (s.customerName) names.add(s.customerName);
    });
    creditSales.forEach(c => {
        if (c.customerName) names.add(c.customerName);
    });
    return Array.from(names).sort();
}

document.addEventListener('click', e => {
    if (!e.target.closest('#customReceiptCustomerFilter') && !e.target.closest('#customCustomerSuggestions')) {
        document.getElementById('customCustomerSuggestions').classList.add('hidden');
    }
});

document.getElementById('customReceiptLoadBtn').addEventListener('click', async function() {
     document.title = "StockApp*  -> what customiezing rcipt for whole sale";
    const customer = document.getElementById('customReceiptCustomerFilter').value.trim();
    const date = document.getElementById('customReceiptDateFilter').value;
    
    if (!date) {
        showMessageModal(translate('select_date_to_load_sales'));
        return;
    }
    
    showLoading();
if (isCancelled) return;
    try {
        await loadSales(date, date);
        
        // Update current data
        if (currentCustomReceiptData) {
            currentCustomReceiptData.customer = customer;
            currentCustomReceiptData.date = date;
        }
        
        renderCustomReceiptProductTable();
        renderCustomReceiptSelectedTable();
        
    } catch (error) {
        console.error("Failed to load sales for custom receipt:", error);
        showMessageModal(translate('error_loading_sales'));
    }
                   const checkInterval = setInterval(() => {
            checkCancelled();
        }, 100);
          resetCancellation();
        clearInterval(checkInterval);
        

        checkCancelled();
        
        hideLoading();
});

function formatPaymentDueDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString(currentLanguage, {
        weekday: 'long',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}