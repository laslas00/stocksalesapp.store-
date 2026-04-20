console.log("sales.js loaded");
const saleItemIdEl = document.getElementById('saleItemId');
let selectedSaleItemId = null;
const recordSaleBtn = document.getElementById('recordSaleBtn');

if (recordSaleBtn) {
    recordSaleBtn.addEventListener('click', recordSale);
}

   function showSaleProductSuggestions() {
        const inputVal = saleProductNameInput.value.toLowerCase().trim();
        saleProductSuggestions.innerHTML = '';

        if (inputVal.length === 0) {
            saleProductSuggestions.classList.add('hidden');
            displaySelectedProductImage();
            updateSaleFormLabels('product');
            return;
        }
        const filteredSuggestions = stock.filter(item =>
            item.name.toLowerCase().includes(inputVal) ||
            (item.category && item.category.toLowerCase().includes(inputVal)) ||
            (item.type && item.type.toLowerCase().includes(inputVal))
        );

        if (filteredSuggestions.length > 0) {
            filteredSuggestions.forEach(item => {
                const suggestionDiv = document.createElement('div');
                suggestionDiv.classList.add('autocomplete-suggestion-item');
                suggestionDiv.textContent = `${item.name} (${item.type}${item.category ? ', ' + item.category : ''})`;
                suggestionDiv.addEventListener('click', () => {
                    saleProductNameInput.value = item.name;
                   selectedSaleItemId = item.id;
                saleItemIdEl.textContent = item.id;
                    salePriceInput.value = item.price ? Math.round(item.price) : '';
                    saleProductSuggestions.classList.add('hidden');
                    displaySelectedProductImage();
                    updateSaleFormLabels(item.type);
                });
                saleProductSuggestions.appendChild(suggestionDiv);
            });
            saleProductSuggestions.classList.remove('hidden');
        } else {
            saleProductSuggestions.classList.add('hidden');
            displaySelectedProductImage();
            updateSaleFormLabels('product');
        }
    }
function findStockItem(stockArray, itemId, productName) {
    console.log("=== FIND STOCK ITEM DEBUG ===");
    console.log("Looking for item with:", { itemId, productName });
    console.log("Stock array length:", stockArray.length);
    
    let foundItem = null;
    
    // Try by ID first (most accurate)
    if (itemId) {
        foundItem = stockArray.find(item => {
            const match = item.id === itemId;
            if (match) {
                console.log("Found by ID match!");
                console.log("Item found:", item);
            }
            return match;
        });
    }
    
    // If not found by ID, try by name
    if (!foundItem && productName) {
        console.log("Not found by ID, trying by name...");
        foundItem = stockArray.find(item => {
            const match = item.name.toLowerCase() === productName.toLowerCase();
            if (match) {
                console.log("Found by name match!");
                console.log("Item found:", item);
            }
            return match;
        });
    }
    
    // Debug: List all stock items if not found
    if (!foundItem) {
        console.log("Item NOT FOUND. Listing all stock items:");
        stockArray.forEach((item, index) => {
            console.log(`${index}. ID: "${item.id}" (type: ${typeof item.id}), Name: "${item.name}"`);
        });
    }
    
    console.log("=== END DEBUG ===");
    return foundItem;
}
async function recordSale() {
    document.title = `StockApp* -> Recording...`;

    const customerName23 = document.getElementById('saleCustomerName23').value.trim();
    const customerPhoneNumber = document.getElementById('saleCustomerPhoneNumber').value.trim();
    const productName = saleProductNameInput.value.trim();
    const quantity = parseFloat(saleQuantityInput.value);
    const price = parseFloat(salePriceInput.value);
    const itemId = selectedSaleItemId || null;
    const dateSold = saleDateInput.value;
    const selectedPaymentType = document.querySelector('input[name="paymentType"]:checked').value;
    const mobileMoneyType = (selectedPaymentType === 'Mobile Money') ? mobileMoneyTypeInput.value.trim() : '';
    const timestamp = new Date().toLocaleString('fr-FR');
    const productType = stock.find(item => item.name.toLowerCase() === productName.toLowerCase())?.type || 'product';
    const username = currentUser ? currentUser.username : translations[currentLanguage]?.unknown_user || 'Unknown';
    const saleDate = new Date().toISOString().slice(0,10);
    const uniqueId = '#' + String(Date.now()).slice(-5);
    const advancePaymentDateInput = document.getElementById('advancePaymentDateInput');
    const advancePaymentDate = advancePaymentDateInput?.value || null;  
    

    let saleQrText = `${productName} | Price: ${price} ${currentCurrency} | Date: ${saleDate} | ID: ${uniqueId}`;
    if (customerName23) {
        saleQrText += ` | Customer: ${customerName23}`;
    }
    
    let stockItem = null;
    
    if (itemId) {
        stockItem = stock.find(item => item.id === itemId);
    }
    
    if (!stockItem) {
        stockItem = stock.find(item => item.name.toLowerCase() === productName.toLowerCase());
    }
    
    const isCredit = selectedPaymentType === 'Credit';
    const isHybrid = selectedPaymentType === 'Hybrid Payment';

    if (!stockItem) {
        showMessageModal(translations[currentLanguage]?.product_not_found?.replace('{product}', productName) || `"${productName}" not found in current stock. Please add it first.`);
        document.title = `StockApp* -> Item Not Found: ${productName}`;
        return;
    }
 if (isCredit && price > 0) {
    showMessageModal(
        translations[currentLanguage]?.credit_with_price_error || 
        'You entered a sale price for a credit sale. When specifying a sale price, please use Hybrid Payment to split the payment between cash/advance and credit.'
    );
    const hybridRadio = document.querySelector('input[name="paymentType"][value="Hybrid Payment"]');
    if (hybridRadio) {
        // Uncheck all radios first
        document.querySelectorAll('input[name="paymentType"]').forEach(radio => {
            radio.checked = false;
        });
        hybridRadio.checked = true;
        
        // Hide credit section
        const creditSaleFields = document.getElementById('creditSaleFields');
        if (creditSaleFields) {
            creditSaleFields.classList.add('hidden');
        }
        
        // Show hybrid section
        const hybridPaymentFields = document.getElementById('hybridPaymentFields');
        if (hybridPaymentFields) {
            hybridPaymentFields.classList.remove('hidden');
        }
        
        // Hide mobile money section
        const mobileMoneyTypeContainer = document.getElementById('mobileMoneyTypeContainer');
        if (mobileMoneyTypeContainer) {
            mobileMoneyTypeContainer.classList.add('hidden');
        }
        
        // Trigger any payment type change handler
        if (typeof onPaymentTypeChange === 'function') {
            onPaymentTypeChange();
        }
    }
    
    document.title = `StockApp* -> Use Hybrid for Split Payment`;
    return;
}

    // Check 2: Hybrid sale requires sale price
    if (isHybrid && (!price || price <= 0)) {
        showMessageModal(
            translations[currentLanguage]?.hybrid_price_required ||
            'Hybrid Payment requires a sale price. Please enter the total sale price first.'
        );
        salePriceInput.focus();
        document.title = `StockApp* -> Enter Sale Price for Hybrid`;
        return;
    }

    // Check 3: Cash/Mobile requires sale price
    if (!isCredit && !isHybrid && (!price || price <= 0)) {
        showMessageModal(
            translations[currentLanguage]?.sale_price_required ||
            'Cash and Mobile Money payments require a sale price. Please enter the sale price.'
        );
        salePriceInput.focus();
        document.title = `StockApp* -> Enter Sale Price`;
        return;
    }

    // Basic validation (updated for credit rule)
    if (
        !productName ||
        isNaN(quantity) ||
        quantity <= 0 ||
        (!isCredit && isNaN(price)) || // Price validation only for non-credit
        (!isCredit && price <= 0)      
    ) {
        showMessageModal(translations[currentLanguage]?.sale_validation_error || 'Please fill in all sale details correctly. *Price is only required for non-credit sales*.');
        document.title = `StockApp* -> Sale Validation Error`;
        return;
    }
    
    // Only check stock quantity if it's a product (not a service)
    if (productType === 'product' && stockItem.quantity < quantity) {
        showMessageModal(translations[currentLanguage]?.insufficient_stock?.replace('{product}', productName).replace('{quantity}', stockItem.quantity) || `Not enough "${productName}" in stock. Available: ${stockItem.quantity}`);
        document.title = `StockApp* -> Insufficient Stock`;
        return;
    }

    let sale = null;
    const taxRate = stockItem.taxRate ? parseFloat(stockItem.taxRate) : 0;
const taxAmount = price * (taxRate / 100); 
const totalWithTax = price + taxAmount;
    let confirmMsg = `${translations[currentLanguage]?.confirm_sale_record || 'Are you sure you want to record this sale?'}\n\n`;
    confirmMsg += `${translations[currentLanguage]?.product_label || 'Product'}: ${productName}\n`;
    confirmMsg += `${translations[currentLanguage]?.quantity_label || 'Quantity'}: ${quantity}\n`;
    
    // Show price only if it exists (not for credit without price)
    if (price > 0 || isHybrid) {
        confirmMsg += `${translations[currentLanguage]?.price_label || 'Price'}: ${formatCurrency(price)}\n`;
    }
    
    confirmMsg += `${translations[currentLanguage]?.payment_type_label || 'Payment Type'}: ${translations[currentLanguage]?.[`payment_type_${selectedPaymentType.toLowerCase().replace(' ', '_')}`] || selectedPaymentType}`;

    // --- Hybrid Payment Logic ---
    if (selectedPaymentType === 'Hybrid Payment') {
        const cash = parseFloat(hybridCashAmount.value) || 0;
        const mobile = parseFloat(hybridMobileAmount.value) || 0;
        const credit = parseFloat(hybridCreditAmount.value) || 0;
        const hybridTotal = cash + mobile + credit;
        const hybridMobile = hybridMobileType.value.trim();
        const hybridCustomer = hybridCustomerName.value.trim();
        const advancePaymentDateInput2 = document.getElementById('advancePaymentDateInput2');
        const advancePaymentDate2 = advancePaymentDateInput2?.value || null;

        if (hybridTotal !== price) {
            showMessageModal(translations[currentLanguage]?.hybrid_payment_sum_error || 'MIXED payment breakdown must sum up to the total price.');
            return;
        }
        
        if (credit > 0 && !hybridCustomer) {
            showMessageModal(translations[currentLanguage]?.credit_customer_required || 'Please enter customer name for credit part.');
            return;
        }
        
        if (credit > 0 && !advancePaymentDate2) {
            showMessageModal(
                translations[currentLanguage]?.advance_payment_date_required ||
                'Please select an advance payment date for the credit portion.'
            );
            return;
        }
        
        // Calculate amount to be paid now (cash + mobile)
        const paidNow = cash + mobile;

        sale = {
            id: `sale-${Date.now()}`,
            productName,
            itemId: itemId,
            quantity,
            price,
            taxRate: taxRate,       // NEW
            taxAmount: taxAmount,   // NEW
            totalAmount: totalWithTax, // UPDATED: Now includes tax
            amountPaid: totalWithTax,
            originalTotal: price,
            amountPaid: paidNow,
            creditBalance: credit,
            dateSold,
            paymentType: 'mixed payment',
            hybridBreakdown: {
                cash,
                mobile,
                credit,
                mobileType: hybridMobile,
                customerName: hybridCustomer
            },
            advancePaymentDate: advancePaymentDate2,
            timestamp,
            username,
            type: productType,
            customerName: customerName23,
            customerPhoneNumber: customerPhoneNumber
        };
        
        if (credit > 0) {
            sale.creditSaleRefId = `credit-${Date.now()}`;
        }

        confirmMsg += `\n${translations[currentLanguage]?.total_paid_now || 'Total Paid Now'}: ${formatCurrency(paidNow)}`;
        confirmMsg += `\n${translations[currentLanguage]?.hybrid_breakdown || 'Hybrid Breakdown'}: ${translations[currentLanguage]?.cash_label || 'Cash'}: ${formatCurrency(cash)}, ${translations[currentLanguage]?.mobile_label || 'Mobile'}: ${formatCurrency(mobile)}`;
        
        if (credit > 0) {
            confirmMsg += `, ${translations[currentLanguage]?.credit_label || 'Credit'}: ${formatCurrency(credit)}`;
            confirmMsg += `\n${translations[currentLanguage]?.credit_balance || 'Credit Balance'}: ${formatCurrency(credit)}`;
        }
        
        if (mobile > 0 && hybridMobile) {
            confirmMsg += ` (${translations[currentLanguage]?.mobile_type_label || 'Mobile Type'}: ${hybridMobile})`;
        }
        
        if (credit > 0 && hybridCustomer) {
            confirmMsg += ` (${translations[currentLanguage]?.credit_customer_label || 'Credit Customer'}: ${hybridCustomer})`;
        }
    }
    else if (selectedPaymentType === 'Mobile Money') {
        sale = {
            id: `sale-${Date.now()}`,
            productName,
            itemId: itemId,
            quantity,
            price,
            taxRate: taxRate,       // NEW
            taxAmount: taxAmount,   // NEW
            totalAmount: totalWithTax, // UPDATED: Now includes tax
            amountPaid: totalWithTax,
            creditBalance: 0,
            dateSold,
            paymentType: selectedPaymentType,
            mobileMoneyType: mobileMoneyType,
            timestamp,
            username,
            type: productType,
            customerName: customerName23,
            customerPhoneNumber: customerPhoneNumber
        };
        
        if (mobileMoneyType) {
            confirmMsg += ` (${mobileMoneyType})`;
        }
    }
    // --- Credit (with NO sale price or 0 price) ---
    else if (selectedPaymentType === 'Credit') {
const credicustomerNameEl = document.getElementById('credicustomerName');
const saleCustomerName23El = document.getElementById('saleCustomerName23');
const customerName = credicustomerNameEl ? credicustomerNameEl.value.trim() : (saleCustomerName23El ? saleCustomerName23El.value.trim() : '');
const advancePaymentEl = document.getElementById('advancePayment');
const advancePayment = advancePaymentEl ? parseFloat(advancePaymentEl.value) || 0 : 0;

const advancePaymentDateEl = document.getElementById('advancePaymentDateInput');
const advancePaymentDate = advancePaymentDateEl?.value || null;

        if (!customerName) {
            showMessageModal('Customer name is required for credit sales.');
            return;
        }

        // For credit sales, if no price entered, use item's sale price or default
        const creditPrice = price > 0 ? price : (stockItem.salePrice || 0);
        const creditBalance = creditPrice - advancePayment;

        confirmMsg +=
            `\n${translations[currentLanguage]?.customer_label || 'Customer'}: ${customerName}` +
            `\n${translations[currentLanguage]?.advance_payment || 'Advance Payment'}: ${formatCurrency(advancePayment)}` +
            `\n${translations[currentLanguage]?.advance_payment_date || 'Advance Payment Date'}: ${advancePaymentDate}` +
            `\n${translations[currentLanguage]?.balance_label || 'Balance'}: ${formatCurrency(creditBalance)}`;
    }
    else {
        // Cash payment
        sale = {
            id: `sale-${Date.now()}`,
            productName,
            itemId: itemId,
            quantity,
            price,
            taxRate: taxRate,       // NEW
            taxAmount: taxAmount,   // NEW
            totalAmount: totalWithTax, // UPDATED: Now includes tax
            amountPaid: totalWithTax,
            creditBalance: 0,
            dateSold,
            paymentType: selectedPaymentType,
            timestamp,
            username,
            type: productType,
            customerName: customerName23,
            customerPhoneNumber: customerPhoneNumber
        };
    }

    showConfirmationModal(confirmMsg, async () => {
        showLoading();
        if (isCancelled) return;

        if (selectedPaymentType === 'Hybrid Payment') {
            try {
                const res = await fetch(`${API_BASE}/api/newsales`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(sale)
                });

                if (!res.ok) {
                    throw new Error(translations[currentLanguage]?.record_sale_failed || 'Failed to record sale.');
                }

                if (sale.hybridBreakdown.credit > 0) {
                    const creditSale = {
                        id: sale.creditSaleRefId,
                        productName: sale.productName,
                        quantity: sale.quantity,
                        price: sale.hybridBreakdown.credit,
                        totalAmount: sale.hybridBreakdown.credit,
                        dateSold: sale.dateSold,
                        customerName: sale.hybridBreakdown.customerName,
                        advancePayment: 0,
                        advancePaymentDate: advancePaymentDate,
                        creditBalance: sale.hybridBreakdown.credit,
                        status: 'unpaid',
                        timestamp: sale.timestamp,
                        username: sale.username,
                        type: sale.type,
                        taxRate: taxRate || 0,
                        relatedSaleId: sale.id,
                    };

                    const creditRes = await fetch(`${API_BASE}/api/credit-sales`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(creditSale)
                    });

                    if (!creditRes.ok) {
                        throw new Error(translations[currentLanguage]?.record_credit_failed || 'Failed to record credit portion of mixed sale.');
                    }
                }
                
                if (productType === 'product') {
                    const soldItem = findStockItem(stock, itemId, productName);
                    if (soldItem) {
                        soldItem.hasBeenSold = true;
                    }

                    await fetch(`${API_BASE}/api/stock-history`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            action: translations[currentLanguage]?.item_sold_action || 'Item Sold',
                            itemName: productName,
                            quantityChange: `-${quantity}`,
                            username: username,
                            timestamp: new Date().toLocaleString('fr-FR')
                        })
                    });
                }

                await loadCreditSales();
                renderSales();
                renderCreditSales();
                await clearSaleForm();
                
                showMessageModal(translations[currentLanguage]?.sale_recorded_success || 'Sale recorded successfully!');
                document.title = `StockApp* -> recorded successfully!`;
                setTimeout(checkRatingTrigger, 1000);
                
                saleProductNameInput.value = '';
                saleQuantityInput.value = '1';
                salePriceInput.value = '';
                paymentTypeRadios.forEach(radio => radio.checked = radio.value === 'Cash');
                hybridCashAmount.value = '0';
                hybridMobileAmount.value = '0';
                hybridCreditAmount.value = '0';
                hybridMobileType.value = '';
                hybridCustomerName.value = '';
                hybridPaymentFields.classList.add('hidden');
                
            } catch (err) {
                console.error('Error recording hybrid payment sale:', err);
                showMessageModal(err.message || (translations[currentLanguage]?.hybrid_payment_error || 'An error occurred while recording the hybrid payment sale.'));
            } finally {
                const checkInterval = setInterval(() => {
                    checkCancelled();
                }, 100);
                resetCancellation();
                clearInterval(checkInterval);
                checkCancelled();
                hideLoading();
            }
        }
        // --- Credit Payment Save ---
        else if (selectedPaymentType === 'Credit') {
            try {
           const credicustomerNameEl = document.getElementById('credicustomerName');
const saleCustomerName23El = document.getElementById('saleCustomerName23');
const customerName = credicustomerNameEl ? credicustomerNameEl.value.trim() : (saleCustomerName23El ? saleCustomerName23El.value.trim() : '');
const advancePaymentEl = document.getElementById('advancePayment');
const advancePayment = advancePaymentEl ? parseFloat(advancePaymentEl.value) || 0 : 0;

const advancePaymentDateEl = document.getElementById('advancePaymentDateInput');
const advancePaymentDate = advancePaymentDateEl?.value || null;
                    
                if (!customerName) {
                    showMessageModal(translations[currentLanguage]?.customer_name_required || 'Please enter customer name for credit sales.');
                    const checkInterval = setInterval(() => {
                        checkCancelled();
                    }, 100);
                    resetCancellation();
                    clearInterval(checkInterval);
                    checkCancelled();
                    hideLoading();
                    return;
                }

                // Use price or item's sale price
                const creditPrice = price > 0 ? price : (stockItem.salePrice || 0);
                const creditBalance = creditPrice - advancePayment;
                const creditSaleId = `credit-${Date.now()}`;

                const newCreditSale = {
                    id: creditSaleId,
                    productName,
                    quantity,
                    price: creditPrice,
                    totalAmount: advancePayment,
                    dateSold,
                    advancePayment,
                    advancePaymentDate: advancePaymentDate,
                    creditBalance,
                    status:  'unpaid' ,
                    timestamp: timestamp,
                    username: username,
                    type: productType,
                    taxRate: taxRate || 0,
                    customerName: customerName,
                    customerPhoneNumber: customerPhoneNumber
                };

                const initialCreditSaleEntry = {
                    id: `sale-${Date.now()}-initialcredit`,
                    productName,
                    itemId: itemId,
                    quantity,
                    price: creditPrice,
                    totalAmount: creditPrice,
                    dateSold,
                    paymentType: 'Credit (Unpaid)',
                    customerName: customerName,
                    creditSaleRefId: creditSaleId,
                    advancePayment: advancePayment,
                    advancePaymentDate: advancePaymentDate,
                    timestamp: timestamp,
                    taxRate: taxRate || 0,
                    username: username,
                    type: productType,
                    customerPhoneNumber: customerPhoneNumber
                };

                const resCredit = await fetch(`${API_BASE}/api/credit-sales`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(newCreditSale)
                });

                if (!resCredit.ok) {
                    throw new Error(translations[currentLanguage]?.record_credit_backend_failed || 'Failed to record credit sale in credit-sales backend.');
                }

                const resSale = await fetch(`${API_BASE}/api/newsales`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(initialCreditSaleEntry)
                });

                if (!resSale.ok) {
                    throw new Error(translations[currentLanguage]?.record_initial_credit_failed || 'Failed to record initial credit sale in sales backend.');
                }

                if (productType === 'product') {
                    const soldItem = findStockItem(stock, itemId, productName);
                    if (soldItem) {
                        soldItem.hasBeenSold = true;
                    }

                    await fetch(`${API_BASE}/api/stock-history`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            action: translations[currentLanguage]?.item_sold_action || 'Item Sold',
                            itemName: productName,
                            quantityChange: `-${quantity}`,
                            username: username,
                            timestamp: new Date().toLocaleString('fr-FR')
                        })
                    });
                }

                await loadCreditSales();
                await loadStock(); 
                await clearSaleForm();
                renderCreditSales();
                renderSales();

                showMessageModal(translations[currentLanguage]?.sale_recorded_success || 'Sale recorded successfully!');
                document.title = `StockApp* -> recorded successfully!`;
                setTimeout(checkRatingTrigger, 1000);

                
            } catch (err) {
                console.error('Error recording credit sale:', err);
                showMessageModal(err.message || (translations[currentLanguage]?.credit_sale_error || 'An error occurred while recording the credit sale.'));
            } finally {
                const checkInterval = setInterval(() => {
                    checkCancelled();
                }, 100);
                resetCancellation();
                clearInterval(checkInterval);
                checkCancelled();
                hideLoading();
            }
        }
        else {
            try {
                const res = await fetch(`${API_BASE}/api/newsales`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(sale)
                });
                
                if (productType === 'product') {
                    const soldItem = findStockItem(stock, itemId, productName);
                    if (soldItem) {
                        soldItem.hasBeenSold = true;
                    }

                    await fetch(`${API_BASE}/api/stock-history`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            action: translations[currentLanguage]?.item_sold_action || 'Item Sold',
                            itemName: productName,
                            quantityChange: `-${quantity}`,
                            username: username,
                            timestamp: new Date().toLocaleString('fr-FR')
                        })
                    });
                }
                
                if (res.ok) {
                    await loadSalesForYear(year);
                    await loadStock();
                    renderSales();
                    await clearSaleForm();
                    showMessageModal(translations[currentLanguage]?.sale_recorded_success || 'Sale recorded successfully!');
                    document.title = `StockApp* -> recorded successfully!`;
                    setTimeout(checkRatingTrigger, 1000);
                    saleProductNameInput.value = '';
                    saleQuantityInput.value = '1';
                    salePriceInput.value = '';
                    mobileMoneyTypeContainer.classList.add('hidden');
                    mobileMoneyTypeInput.value = '';
                    paymentTypeRadios.forEach(radio => radio.checked = radio.value === 'Cash');
                } else {
                    showMessageModal(translations[currentLanguage]?.record_sale_failed || 'Failed to record sale.');
                }
            } catch (err) {
                console.error('Error recording sale:', err);
                showMessageModal(translations[currentLanguage]?.general_sale_error || 'An error occurred while recording the sale.');
            } finally {
                const checkInterval = setInterval(() => {
                    checkCancelled();
                }, 100);
                resetCancellation();
                clearInterval(checkInterval);
                checkCancelled();
                hideLoading();
            }
        }
    });
}
async function renderSales() {
    salesTableBody.innerHTML = '';
    const startDateStr = salesHistoryStartDateFilter.value;
    const endDateStr = salesHistoryEndDateFilter.value;
    const paymentFilter = salesHistoryPaymentFilter.value;
    const typeFilter = salesHistoryTypeFilter.value;
    const showExpenses = document.getElementById('showExpensesCheckbox')?.checked;

    let filteredSales = sales;
    filteredSales = filteredSales.map(sale => {
        if (!sale.dateSold || sale.dateSold.trim() === "") {
            const parsedTimestamp = sale.timestamp?.split(" ")[0];
            const [day, month, year] = parsedTimestamp ? parsedTimestamp.split("/") : [];
            sale.dateSold = `${year}-${month}-${day}`;
        }
        return sale;
    });
    let filteredExpenses = expenses;

    // Date filtering logic...
    if (startDateStr && endDateStr) {
        const startDate = new Date(startDateStr);
        const endDate = new Date(endDateStr);
        endDate.setHours(23, 59, 59, 999);
        
        filteredSales = filteredSales.filter(sale => {
            const saleDate = new Date(sale.dateSold);
            return saleDate >= startDate && saleDate <= endDate;
        });
        
        filteredExpenses = filteredExpenses.filter(exp => {
            const expDate = new Date(exp.date);
            return expDate >= startDate && expDate <= endDate;
        });
    } else if (startDateStr) {
        const startDate = new Date(startDateStr);
        filteredSales = filteredSales.filter(sale => {
            const saleDate = new Date(sale.dateSold);
            return saleDate >= startDate;
        });
        filteredExpenses = filteredExpenses.filter(exp => {
            const expDate = new Date(exp.date);
            return expDate >= startDate;
        });
    } else if (endDateStr) {
        const endDate = new Date(endDateStr);
        endDate.setHours(23, 59, 59, 999);
        filteredSales = filteredSales.filter(sale => {
            const saleDate = new Date(sale.dateSold);
            return saleDate <= endDate;
        });
        filteredExpenses = filteredExpenses.filter(exp => {
            const expDate = new Date(exp.date);
            return expDate <= endDate;
        });
    }

    // Payment Method filter
    if (paymentFilter && paymentFilter !== 'All') {
        if (paymentFilter === 'Credit (Unpaid)' || paymentFilter === 'Credit (Paid)') {
            filteredSales = filteredSales.filter(sale => sale.paymentType === paymentFilter);
        } else if (paymentFilter === 'Credit Payment') {
            filteredSales = filteredSales.filter(sale => 
                sale.type === 'credit-payment' || 
                sale.paymentType?.includes('Paiement de Crédit') ||
                sale.paymentType === 'Credit Payment'
            );
        } else if (paymentFilter === 'Exchange') {
            filteredSales = filteredSales.filter(sale => 
                sale.paymentType === 'Exchange' || sale.paymentType === 'Exchange Extra'
            );
        } else {
            filteredSales = filteredSales.filter(sale => sale.paymentType === paymentFilter);
        }
    }

    // Type filter
    if (typeFilter && typeFilter !== 'All') {
        if (typeFilter === 'credit-payment') {
            filteredSales = filteredSales.filter(sale => sale.type === 'credit-payment');
        } else {
            filteredSales = filteredSales.filter(sale => sale.type === typeFilter);
        }
    }

    const hasAnyVisibleItems = filteredSales.length > 0 || (showExpenses && filteredExpenses.length > 0);

    if (!hasAnyVisibleItems) {
        noSalesMessage.classList.remove('hidden');
    } else {
        noSalesMessage.classList.add('hidden');

        const salesByDate = filteredSales.reduce((acc, sale) => {
            const saleDate = sale.dateSold;
            if (!acc[saleDate]) {
                acc[saleDate] = [];
            }
            acc[saleDate].push(sale);
            return acc;
        }, {});

        const expensesByDate = filteredExpenses.reduce((acc, exp) => {
            if (!acc[exp.date]) acc[exp.date] = [];
            acc[exp.date].push(exp);
            return acc;
        }, {});

        const allDates = Array.from(new Set([...Object.keys(salesByDate), ...Object.keys(expensesByDate)])).sort((a, b) => new Date(a) - new Date(b));

        allDates.forEach(date => {
            const salesForDay = salesByDate[date] || [];
            const expensesForDay = expensesByDate[date] || [];

            const hasVisibleItemsForDay = salesForDay.length > 0 || (showExpenses && expensesForDay.length > 0);

            if (!hasVisibleItemsForDay) {
                return;
            }

            let dateFormatted;
            if (currentLanguage === 'fr') {
                dateFormatted = new Date(date).toLocaleDateString('fr-FR', { 
                    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
                });
            } else {
                dateFormatted = new Date(date).toLocaleDateString('en-US', { 
                    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
                });
            }

            const dateHeaderRow = document.createElement('tr');
            dateHeaderRow.classList.add('bg-indigo-200', 'font-bold');
            dateHeaderRow.innerHTML = `
                <td colspan="8" class="px-6 py-3 text-left text-sm text-blue-700">
                    ${translations[currentLanguage]?.date_label || 'Date'}: ${dateFormatted}
                </td>
            `;
            salesTableBody.appendChild(dateHeaderRow);

            // LOGIC CHANGE: Filter products vs services, treating 'credit-payment' as the type of item it paid for
            // If the credit payment didn't store the original type, default to 'product'
            
            const products = salesForDay.filter(sale => 
                sale.type === 'product' || 
                (sale.type === 'credit-payment' && (!sale.originalType || sale.originalType === 'product'))
            );
            
            // Check specifically for service-related items
            const services = salesForDay.filter(sale => 
                sale.type === 'service' || 
                (sale.type === 'credit-payment' && sale.originalType === 'service')
            );
            
            // NOTE: If your credit payment object doesn't have 'originalType', 
            // you might need to infer it from the product name or another field.
            // Assuming for now credit payments default to product section if unknown.

            let dailyTotal = 0;
            
            // Show products (including product credit payments)
            if (products.length > 0) {
                const productHeaderRow = document.createElement('tr');
                productHeaderRow.innerHTML = `<td colspan="6" class="px-6 py-3 text-center text-sm font-bold text-gray-900">${translations[currentLanguage]?.products_label || 'Products'}</td>`;
                salesTableBody.appendChild(productHeaderRow);

                products.forEach(sale => {
                    const row = createSaleRow(sale);
                    salesTableBody.appendChild(row);
                    dailyTotal += getSaleAmount(sale);
                });

                const productTotal = products.reduce((sum, sale) => sum + getSaleAmount(sale), 0);
                const productTotalRow = document.createElement('tr');
                productTotalRow.innerHTML = `<td colspan="4" class="px-6 py-4 text-right text-sm font-bold text-gray-900">${translations[currentLanguage]?.total_products_sold || 'Total for Products sold'}:</td>
                                            <td class="px-6 py-2 text-center text-sm font-bold text-gray-900">${formatCurrency(productTotal)}</td>`;
                salesTableBody.appendChild(productTotalRow);
            }
            
            // Show services (including service credit payments)
            if (services.length > 0) {
                const serviceHeaderRow = document.createElement('tr');
                serviceHeaderRow.innerHTML = `<td colspan="8" class="px-6 py-3 text-center text-sm font-bold text-gray-900">${translations[currentLanguage]?.services_label || 'Services'}</td>`;
                salesTableBody.appendChild(serviceHeaderRow);

                services.forEach(sale => {
                    const row = createSaleRow(sale);
                    salesTableBody.appendChild(row);
                    dailyTotal += getSaleAmount(sale);
                });

                const serviceTotal = services.reduce((sum, sale) => sum + getSaleAmount(sale), 0);
                const serviceTotalRow = document.createElement('tr');
                serviceTotalRow.innerHTML = `<td colspan="4" class="px-6 py-4 text-right text-sm font-bold text-gray-900">${translations[currentLanguage]?.total_services || 'Total for Services'}:</td>
                                            <td class="px-6 py-4 text-left text-sm font-bold text-gray-900">${formatCurrency(serviceTotal)}</td>`;
                salesTableBody.appendChild(serviceTotalRow);
            }
            
            // Removed the separate "Credit Payments" section logic here

            // EXPENSE SECTION
            if (showExpenses && expensesForDay.length > 0) {
                expensesForDay.forEach(exp => {
                    const tr = document.createElement('tr');
                    tr.classList.add('expense-row');
                    tr.innerHTML = `
                        <td colspan="2" class="px-6 py-4 text-red-600 font-bold">${translations[currentLanguage]?.expense_label || 'Expense'}: ${exp.name}</td>
                        <td></td>
                        <td class="px-6 py-4 text-red-600 font-bold">-${formatCurrency(exp.amount)}</td>
                        <td class="px-6 py-4 text-red-600 font-bold">${exp.date}</td>
                        <td class="px-6 py-4 text-red-600 font-bold">${translations[currentLanguage]?.by_label || 'By'}: ${exp.username}</td>
                    `;
                    salesTableBody.appendChild(tr);
                });

                let expenseDateFormatted;
                if (currentLanguage === 'fr') {
                    expenseDateFormatted = new Date(date).toLocaleDateString('fr-FR');
                } else {
                    expenseDateFormatted = new Date(date).toLocaleDateString();
                }

                const totalExpense = expensesForDay.reduce((sum, exp) => sum + exp.amount, 0);
                const expenseTotalRow = document.createElement('tr');
                expenseTotalRow.classList.add('expense-row', 'font-bold');
                expenseTotalRow.innerHTML = `
                    <td colspan="5" class="px-6 py-4 text-right text-sm text-red-700">${translations[currentLanguage]?.total_expense_for || 'Total Expense for'} ${expenseDateFormatted}:</td>
                    <td colspan="3" class="px-6 py-4 text-left text-sm text-red-700">${formatCurrency(totalExpense)}</td>
                `;
                salesTableBody.appendChild(expenseTotalRow);
            }

            const totalExpense = expensesForDay.reduce((sum, exp) => sum + exp.amount, 0);
            const dailyOverall = showExpenses ? dailyTotal - totalExpense : dailyTotal;
            
            if (salesForDay.length > 0) {
                let totalDateFormatted;
                if (currentLanguage === 'fr') {
                    totalDateFormatted = new Date(date).toLocaleDateString('fr-FR');
                } else {
                    totalDateFormatted = new Date(date).toLocaleDateString();
                }

                const overallRow = document.createElement('tr');
                overallRow.classList.add('font-bold');
                overallRow.innerHTML = `
                    <td colspan="5" class="px-6 py-4 text-right text-sm text-purple-700">
                        ${showExpenses 
                            ? (translations[currentLanguage]?.total_sale_after_expenses || 'TOTAL SALE (After Expenses)') 
                            : (translations[currentLanguage]?.total_sale_for_day || 'TOTAL SALE FOR THE DAY')} ${totalDateFormatted}:
                    </td>
                    <td colspan="3" class="px-6 py-4 text-left text-sm text-purple-700">${formatCurrency(dailyOverall)}</td>
                `;
                salesTableBody.appendChild(overallRow);
            }
        });

        const overallSales = filteredSales.reduce((sum, sale) => sum + getSaleAmount(sale), 0);
        let overallExpenses = 0;
        if (showExpenses) {
            overallExpenses = filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0);
        }
        const overallNet = overallSales - overallExpenses;

        if (hasAnyVisibleItems) {
            const overallTotalRow = document.createElement('tr');
            overallTotalRow.classList.add('font-bold');
            overallTotalRow.innerHTML = `
                <td colspan="5" class="px-6 py-4 text-right text-sm text-purple-700">
                    ${translations[currentLanguage]?.overall_label || 'Overall'} ${showExpenses 
                        ? (translations[currentLanguage]?.total_sales_minus_expenses || '(Total Sales - Total Expenses)') 
                        : (translations[currentLanguage]?.total_sales_only || '(Total Sales Only)')}:
                </td>
                <td colspan="3" class="px-6 py-4 text-left text-sm text-purple-700">${formatCurrency(overallNet)}</td>
            `;
            salesTableBody.appendChild(overallTotalRow);
        }
    }
}
function formatPaymentDisplay(sale) {
    // Handle mobile money
    if (sale.paymentType === 'Mobile Money') {
        let display = translatePaymentType('Mobile Money');
        if (sale.mobileMoneyType) {
            display += ` (${sale.mobileMoneyType})`;
        }
        return display;
    }

    // Handle mixed payment with breakdown
  if (sale.paymentType === 'mixed payment' && sale.hybridBreakdown) {
        const parts = [];
        const bd = sale.hybridBreakdown;

        if (bd.cash > 0) {
            parts.push(`${translate('cash')}: ${formatCurrency(bd.cash)}`);
        }
        if (bd.mobile > 0) {
            let mobilePart = translate('mobile_money');
            if (bd.mobileType) {
                mobilePart += ` (${bd.mobileType})`;
            }
            mobilePart += `: ${formatCurrency(bd.mobile)}`;
            parts.push(mobilePart);
        }
        if (bd.credit > 0) {
            parts.push(`${translate('credit')}: ${formatCurrency(bd.credit)}`);
        }

        return `${translate('mixedPayment')} (${parts.join(' + ')})`;
    }

    // Handle credit payments with remaining balance
    if (sale.paymentType === 'Credit Payment') {
        let display = translatePaymentType('Credit Payment');
        if (sale.creditRemaining !== undefined && sale.creditRemaining > 0) {
            display += ` - ${translate('remaining')}: ${formatCurrency(sale.creditRemaining)}`;
        } else if (sale.creditRemaining === 0) {
            display += ` (${translate('fully_paid')})`;
        }
        return display;
    }

    // Default: translate any other payment type
    return translatePaymentType(sale.paymentType || 'Cash');
}
function createSaleRow(sale) {
    const row = document.createElement('tr');
    row.classList.add('hover:bg-gray-50');

    const displayAmount = getSaleAmount(sale);
    const isRefund = sale.paymentType === 'Refund';
    const isExchange = sale.paymentType === 'Exchange' || sale.paymentType === 'Exchange Extra';
    const hasBeenRefunded = sales.some(s => s.refundOf === sale.id);
    
    // Check if it's a refund transaction (already processed refund)
    const isRefundTransaction = sale.refundOf;
    
    // Determine if refund button should be shown
    const canShowRefundButton = 
        !isRefund &&                    // Not already a refund
        !isExchange &&                  // Not an exchange transaction
        !hasBeenRefunded &&             // Not already refunded
        !isRefundTransaction &&         // Not a refund transaction
        typeof isRefundValid === 'function' && 
        isRefundValid(sale.dateSold);   // Within warranty period

    // Determine if warranty expired message should be shown
    const showWarrantyExpired = 
        !isRefund && 
        !isExchange && 
        !hasBeenRefunded && 
        !isRefundTransaction &&
        typeof isRefundValid === 'function' && 
        !isRefundValid(sale.dateSold);

    row.innerHTML = `
        <td class="px-6 py-4 text-sm font-medium text-gray-900">${sale.productName}</td>
        <td class="px-6 py-4 text-sm text-black-800">${sale.type === 'product' ? translate('product') : translate('service')}</td>
        <td class="px-6 py-4 text-sm text-black-800">${sale.quantity}</td>
        <td class="px-6 py-4 text-sm text-black-800">${formatCurrency(displayAmount)}</td>
<td class="px-6 py-4 text-sm text-black-800">
    ${formatPaymentDisplay(sale)}
</td>
        <td class="px-6 py-4 text-sm text-black-800">${sale.dateSold}</td>
        <td class="px-6 py-4 text-sm text-black-800">
            <button onclick="showReceiptFromHistory(${JSON.stringify(sale).replace(/"/g, '&quot;')})"
                    class="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-1 px-3 rounded-md text-xs">
                ${translate('view_receipt') || 'View Receipt'}
            </button>
            ${canShowRefundButton 
                ? `<button onclick="handleRefundClick('${sale.id}')" 
                    id="refund-btn-${sale.id}"
                    class="bg-yellow-500 hover:bg-yellow-600 text-white font-semibold py-1 px-3 rounded-md text-xs ml-2 transition-all duration-300 relative">
                    <span class="refund-btn-text">${translate('refund_return') || 'Refund/Return'}</span>
                    <span class="refund-btn-loader hidden absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2">
                        <div class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    </span>
                </button>`
                : ''
            }

            
            ${showWarrantyExpired
                ? ``
                : ''
            }
            
            <!-- Exchange Indicator -->
            ${isExchange 
                ? `<span class="text-xs text-blue-500 ml-2">${translatePaymentType(sale.paymentType)}</span>`
                : ''
            }
            
            <!-- Already Refunded Indicator -->
            ${hasBeenRefunded 
                ? `<span class="text-xs text-green-500 ml-2">${translate('refunded') || 'Refunded'}</span>`
                : ''
            }
            
            <!-- Refund Transaction Indicator -->
            ${isRefund 
                ? `<span class="text-xs text-red-500 ml-2">${translate('refund_transaction') || 'Refund Transaction'}</span>`
                : ''
            }
        </td>
    `;
    
    // Add visual styling based on sale type
    if (isRefund) {
        row.classList.add('bg-red-50');
    } else if (isExchange) {
        row.classList.add('bg-blue-50');
    } else if (hasBeenRefunded) {
        row.classList.add('bg-green-50');
    }
    
    return row;
}
const showExpensesBtn = document.getElementById('showExpensesCheckbox');
if (showExpensesBtn) {
    showExpensesBtn.addEventListener('change', () => {
        renderSales(); 
    });
}

// Check if these filters exist before adding listeners
if (typeof salesHistoryPaymentFilter !== 'undefined' && salesHistoryPaymentFilter) {
    salesHistoryPaymentFilter.addEventListener('change', renderSales);
}

if (typeof salesHistoryTypeFilter !== 'undefined' && salesHistoryTypeFilter) {
    salesHistoryTypeFilter.addEventListener('change', renderSales);
}
    salesHistoryPaymentFilter.addEventListener('change', renderSales);
    salesHistoryTypeFilter.addEventListener('change', renderSales);
async function showSalesManagement() { 
    hideHomeOverlay();
    stockManagementSection.classList.add('hidden');
    salesManagementSection.classList.remove('hidden');
    hideAllStockSubSections(); 
    hideAllSalesSubSections(); 
    stockOptionsModal.classList.add('hidden'); 
    salesOptionsModal.classList.remove('hidden'); 
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0'); 
    const day = String(today.getDate()).padStart(2, '0');
    const todayFormatted = `${year}-${month}-${day}`;

    saleDateInput.value = todayFormatted;
    salesHistoryStartDateFilter.value = todayFormatted; 
    salesHistoryEndDateFilter.value = todayFormatted;
    cleanupMemory();
    await loadStock(); 
    if (stockMonitorIntervalId) {
        clearInterval(stockMonitorIntervalId);
    }
    stockMonitorIntervalId = setInterval(async () => {
        await loadStock();
        if (!recordNewSaleSection.classList.contains('hidden')) {
            showSaleProductSuggestions(); 
        }
    }, 100000);

    renderSales(); 
    displaySelectedProductImage();
}
   salesHistoryOptionBtn.addEventListener('click', showSalesHistorySection);
async function showSalesHistorySection() { 
    // Show loading state
    showLoading();
    
    try {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        const todayFormatted = `${year}-${month}-${day}`;
        
        // Set date filters
        salesHistoryStartDateFilter.value = todayFormatted; 
        salesHistoryEndDateFilter.value = todayFormatted;
        
        // Cleanup and show history section
        cleanupMemory();
        salesTableBody.innerHTML = '';
        noSalesMessage.classList.add('hidden');
        salesOptionsModal.classList.add('hidden');
        hideAllSalesSubSections();
        salesHistorySection.classList.remove('hidden');
        salesHistorySection.classList.add('MODAL-LOCK-OPEN');
        
        // Apply filter and render sales with loading state
        await applySalesFilter();
        
        // Hide loading after data is loaded
                       const checkInterval = setInterval(() => {
            checkCancelled();
        }, 100);
          resetCancellation();
        clearInterval(checkInterval);
        

        checkCancelled();
        
        hideLoading();
        
        // Render the sales table
        renderSales();
        
    } catch (error) {
        // Hide loading on error
                       const checkInterval = setInterval(() => {
            checkCancelled();
        }, 100);
          resetCancellation();
        clearInterval(checkInterval);
        

        checkCancelled();
        
        hideLoading();
        
        console.error('Error showing sales history section:', error);
        showMessageModal(translate('errorLoadingSalesHistory') || 'Error loading sales history. Please try again.');
    }
}
async function applySalesFilter() {
showLoading();
if (isCancelled) return;
const startDate = salesHistoryStartDateFilter.value;
const endDate = salesHistoryEndDateFilter.value;
if (!startDate || !endDate) {
hideLoading();
showMessageModal("Please select a valid start and end date.");
return;
}
await loadSales(startDate, endDate); 
hideLoading();
renderSales(); 
}
document.getElementById('exportSalesExcelBtn').onclick = function() {
    // Ensure latest data
    renderSales();
    exportTableToExcel('salesTableBody', 'Sales_History');
};


    async function saveSalesTargets() {
        if (!currentUser || currentUser.role !== 'administrator') {
         showMessageModal(translations[currentLanguage].onlyAdminsCanSetSalesTargets || 'Only administrators can set sales targets.');
            return;
        }

        weeklySalesTarget = Number(document.getElementById('weeklySalesTargetInput').value) || 0;
        monthlySalesTarget = Number(document.getElementById('monthlySalesTargetInput').value) || 0;
        try {
            const res = await fetch(`${API_BASE}/api/targets`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ weekly: weeklySalesTarget, monthly: monthlySalesTarget })
            });
            if (!res.ok) throw new Error('Failed to save targets');
            drawWeeklySalesChart();
            drawMonthlySalesChart();
        
        } catch (err) {
            console.error('Error saving targets:', err);
        }
    }
    async function showRecordNewSaleSection() {
        document.title = `StockApp* -> doing some business`;
        salesOptionsModal.classList.add('hidden');
        hideAllSalesSubSections();
        saleProductNameInput.value = '';
        saleQuantityInput.value = '1';
        salePriceInput.value = '';
        document.querySelector('input[name="paymentType"][value="Cash"]').checked = true;
        mobileMoneyTypeContainer.classList.add('hidden'); 
        mobileMoneyTypeInput.value = ''; 
        displaySelectedProductImage(); 
        updateSaleFormLabels('product'); 
        await loadStock();
          recordNewSaleSection.classList.remove('hidden');
          recordNewSaleSection.classList.add('MODAL-LOCK-OPEN');
    }

    document.getElementById('saveWeeklyTargetBtn').onclick = saveSalesTargets;
    document.getElementById('saveMonthlyTargetBtn').onclick = saveSalesTargets;
    loadSalesTargets();
// Alternative with arrow function
salesOptionBtn.addEventListener('click', () => {
    showSalesManagement();
     document.title = "StockApp*  -> Let's make some sales";
});

        document.querySelectorAll('.back-to-sales-options-btn').forEach(button => {
        button.addEventListener('click', showSalesManagement);
          // Goes back to the sales options modal
    });
       recordSaleOptionBtn.addEventListener('click', showRecordNewSaleSection);
     // Sales Management Event Listeners

    saleQuantityInput.addEventListener('keypress', function(event) { if (event.key === 'Enter') recordSale(); });
    salePriceInput.addEventListener('keypress', function(event) { if (event.key === 'Enter') recordSale(); });
    saleProductNameInput.addEventListener('keypress', function(event) { if (event.key === 'Enter') recordSale(); });
    document.getElementById('applySalesFilterBtn').addEventListener('click', applySalesFilter);
        saleProductNameInput.addEventListener('keydown', function(e) {
        const items = saleProductSuggestions.querySelectorAll('.autocomplete-suggestion-item');
        if (!items.length) return;

        if (e.key === 'ArrowDown') {
            suggestionIndex = (suggestionIndex + 1) % items.length;
            items.forEach((item, idx) => item.classList.toggle('bg-blue-100', idx === suggestionIndex));
            e.preventDefault();
        } else if (e.key === 'ArrowUp') {
            suggestionIndex = (suggestionIndex - 1 + items.length) % items.length;
            items.forEach((item, idx) => item.classList.toggle('bg-blue-100', idx === suggestionIndex));
            e.preventDefault();
        } else if (e.key === 'Enter' && suggestionIndex > -1) {
            items[suggestionIndex].click();
            suggestionIndex = -1;
            e.preventDefault();
        } else {
            suggestionIndex = -1;
        }
    });
        saleProductNameInput.addEventListener('input', showSaleProductSuggestions);
    saleProductNameInput.addEventListener('change', displaySelectedProductImage); 

    

paymentTypeRadios.forEach(radio => {
    radio.addEventListener('change', () => {
        const previousPaymentType = document.querySelector('input[name="paymentType"]:checked')?.value;
        
        // Clear fields based on what type we're switching FROM
        if (previousPaymentType === 'Hybrid Payment') {
            if (hybridCashAmount) hybridCashAmount.value = '0';
            if (hybridMobileAmount) hybridMobileAmount.value = '0';
            if (hybridCreditAmount) hybridCreditAmount.value = '0';
            if (hybridMobileType) hybridMobileType.value = '';
            if (hybridCustomerName) hybridCustomerName.value = '';
        } else if (previousPaymentType === 'Mobile Money') {
            if (mobileMoneyTypeInput) mobileMoneyTypeInput.value = '';
        } else if (previousPaymentType === 'Credit') {
            if (customerNameInput) customerNameInput.value = '';
            if (advancePaymentInput) advancePaymentInput.value = '';
            // Optionally keep sale price for credit if user entered it
        }
        
        // Clear sale price when switching TO Credit (optional)
        if (radio.value === 'Credit' && radio.checked) {
            salePriceInput.value = '';
        }
        
        // Show/hide fields
        if (radio.value === 'Hybrid Payment' && radio.checked) {
            hybridPaymentFields.classList.remove('hidden');
            mobileMoneyTypeContainer.classList.add('hidden');
            creditSaleFields.classList.add('hidden');
        } else if (radio.value === 'Mobile Money' && radio.checked) {
            hybridPaymentFields.classList.add('hidden');
            mobileMoneyTypeContainer.classList.remove('hidden');
            creditSaleFields.classList.add('hidden');
        } else if (radio.value === 'Credit' && radio.checked) {
            hybridPaymentFields.classList.add('hidden');
            mobileMoneyTypeContainer.classList.add('hidden');
            creditSaleFields.classList.remove('hidden');
        } else {
            hybridPaymentFields.classList.add('hidden');
            mobileMoneyTypeContainer.classList.add('hidden');
            creditSaleFields.classList.add('hidden');
        }
    });
});
    document.addEventListener('click', (event) => {
        if (!saleProductNameInput.contains(event.target) && !saleProductSuggestions.contains(event.target)) {
            saleProductSuggestions.classList.add('hidden');
        }
    });
function clearSaleForm() {
    saleProductNameInput.value = '';
    saleQuantityInput.value = '1';
    salePriceInput.value = '';
    
    // Reset payment type radios
    paymentTypeRadios.forEach(radio => radio.checked = radio.value === 'Cash');
    
    // Safely clear mobile money type
    if (mobileMoneyTypeInput) {
        mobileMoneyTypeInput.value = '';
    }
    
    // Safely clear credit sale fields - these are the problematic ones
    const credicustomerNameEl = document.getElementById('credicustomerName');
    if (credicustomerNameEl) {
        credicustomerNameEl.value = '';
    }
    
    const advancePaymentEl = document.getElementById('advancePayment');
    if (advancePaymentEl) {
        advancePaymentEl.value = '';
    }
    
    const advancePaymentDateInputEl = document.getElementById('advancePaymentDateInput');
    if (advancePaymentDateInputEl) {
        advancePaymentDateInputEl.value = '';
    }
    
    const saleCustomerName23El = document.getElementById('saleCustomerName23');
    if (saleCustomerName23El && !document.getElementById('keepCustomerNameCheckbox')?.checked) {
        saleCustomerName23El.value = '';
    }
    
    const saleCustomerPhoneNumberEl = document.getElementById('saleCustomerPhoneNumber');
    if (saleCustomerPhoneNumberEl) {
        saleCustomerPhoneNumberEl.value = '';
    }
    
    // Hide sections
    if (creditSaleFields) {
        creditSaleFields.classList.add('hidden');
    }
    
    if (mobileMoneyTypeContainer) {
        mobileMoneyTypeContainer.classList.add('hidden');
    }
    
    // Clear hybrid payment fields
    if (hybridCashAmount) hybridCashAmount.value = '0';
    if (hybridMobileAmount) hybridMobileAmount.value = '0';
    if (hybridCreditAmount) hybridCreditAmount.value = '0';
    if (hybridMobileType) hybridMobileType.value = '';
    if (hybridCustomerName) hybridCustomerName.value = '';
    
    // Clear the sale item ID display
    if (saleItemIdEl) {
        saleItemIdEl.textContent = '';
    }
    
    selectedSaleItemId = null;
    
    // Display product image
    displaySelectedProductImage();
}
function displaySelectedProductImage() {
    const productName = saleProductNameInput.value.trim();
    const selectedItem = stock.find(item => item.name.toLowerCase() === productName.toLowerCase());

    if (selectedItem && selectedItem.type === 'product' && selectedItem.imageUrl) { 
        
        // --- FIX: Add the server address to the image path ---
        const imageUrl = selectedItem.imageUrl;
        const finalUrl = imageUrl.startsWith('http') 
            ? imageUrl 
            : `${API_BASE}${imageUrl.startsWith('/') ? '' : '/'}${imageUrl}`;
        
        selectedProductImage.src = finalUrl;
        // ----------------------------------------------------

        selectedProductImage.classList.remove('hidden');
        selectedProductNoImage.classList.add('hidden');
    } else {
        selectedProductImage.classList.add('hidden');
        selectedProductNoImage.classList.remove('hidden');
    }
}


 (function() {
        const salePriceInput = document.getElementById('salePrice');
        const miniCalculator = document.getElementById('miniCalculator');
        const calcInputDisplay = document.getElementById('calcInputDisplay');
        const calcResultDisplay = document.getElementById('calcResultDisplay');
        let calcValue = '';
        let calcResult = '';

        // Show calculator on right click
        salePriceInput.addEventListener('contextmenu', function(e) {
            e.preventDefault();
            miniCalculator.classList.remove('hidden');
            miniCalculator.style.top = (salePriceInput.offsetHeight + 8) + 'px';
            miniCalculator.style.left = '0px';
            calcValue = salePriceInput.value ? salePriceInput.value : '';
            calcInputDisplay.value = calcValue || '0';
            calcResultDisplay.value = '';
            calcInputDisplay.focus();
            // Scroll to end for long expressions
            setTimeout(() => {
                calcInputDisplay.scrollLeft = calcInputDisplay.scrollWidth;
            }, 0);
        });

        // Hide calculator if click outside
        document.addEventListener('mousedown', function(e) {
            if (!miniCalculator.contains(e.target) && e.target !== salePriceInput) {
                miniCalculator.classList.add('hidden');
            }
        });

        // Calculator button logic
        miniCalculator.querySelectorAll('.calc-btn[data-val]').forEach(btn => {
            btn.addEventListener('click', function() {
                const val = btn.getAttribute('data-val');
                calcValue += val;
                calcInputDisplay.value = calcValue;
                calcResultDisplay.value = '';
                calcInputDisplay.focus();
                // Scroll to end for long expressions
                setTimeout(() => {
                    calcInputDisplay.scrollLeft = calcInputDisplay.scrollWidth;
                }, 0);
            });
        });

        // Clear button
        document.getElementById('calcClear').onclick = function() {
            calcValue = '';
            calcInputDisplay.value = '0';
            calcResultDisplay.value = '';
            calcInputDisplay.focus();
        };

        // Equals button
        document.getElementById('calcEquals').onclick = function() {
            try {
                // eslint-disable-next-line no-eval
                calcResult = eval(calcValue.replace(/÷/g, '/').replace(/×/g, '*').replace(/−/g, '-'));
                calcResultDisplay.value = calcResult;
                calcValue = calcResult.toString();
            } catch {
                calcResultDisplay.value = 'Error';
                calcValue = '';
            }
            calcInputDisplay.focus();
            setTimeout(() => {
                calcInputDisplay.scrollLeft = calcInputDisplay.scrollWidth;
            }, 0);
        };

        // Use button: set value to input and close
        document.getElementById('calcToInput').onclick = function() {
            salePriceInput.value = calcResultDisplay.value || calcInputDisplay.value;
            miniCalculator.classList.add('hidden');
            salePriceInput.dispatchEvent(new Event('input'));
        };

        // Allow keyboard input for numbers and symbols
        calcInputDisplay.addEventListener('keydown', function(e) {
            if (
                (e.key >= '0' && e.key <= '9') ||
                ['+', '-', '*', '/', '.', '÷', '×', '−'].includes(e.key)
            ) {
                calcValue += e.key;
                setTimeout(() => {
                    calcInputDisplay.value = calcValue;
                    calcInputDisplay.scrollLeft = calcInputDisplay.scrollWidth;
                }, 0);
            } else if (e.key === 'Backspace') {
                calcValue = calcValue.slice(0, -1);
                setTimeout(() => {
                    calcInputDisplay.value = calcValue || '0';
                    calcInputDisplay.scrollLeft = calcInputDisplay.scrollWidth;
                }, 0);
            } else if (e.key === 'Enter') {
                document.getElementById('calcEquals').click();
            } else if (e.key === 'Escape') {
                miniCalculator.classList.add('hidden');
            } else {
                e.preventDefault();
            }
        });

        miniCalculator.addEventListener('transitionend', function() {
            if (!miniCalculator.classList.contains('hidden')) {
                calcInputDisplay.focus();
            }
        });
    })();