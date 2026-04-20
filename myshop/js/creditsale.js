creditBookOptionBtn.addEventListener('click', () => {
    salesOptionsModal.classList.add('hidden'); // Hide sales options modal
    creditSalesSection.classList.remove('hidden');
        creditSalesSection.classList.add('MODAL-LOCK-OPEN');
    showLoading();
    loadCreditSales()
        .then(renderCreditSales)
        .finally(() => hideLoading());
});

// NEW: Apply filter for credit sales
applyCreditSalesFilterBtn.addEventListener('click', () => {
    showLoading();
    setTimeout(() => {
        renderCreditSales();
                       const checkInterval = setInterval(() => {
            checkCancelled();
        }, 100);
          resetCancellation();
        clearInterval(checkInterval);
        

        checkCancelled();
        
        hideLoading();
    }, 100);
});

creditSalesCustomerNameFilter.addEventListener('input', () => {
    debounce(() => {
        showLoading();
        setTimeout(() => {
            renderCreditSales();
                           const checkInterval = setInterval(() => {
            checkCancelled();
        }, 100);
          resetCancellation();
        clearInterval(checkInterval);
        

        checkCancelled();
        
        hideLoading();
        }, 100);
    }, 300)();
});

creditSalesStatusFilter.addEventListener('change', () => {
    showLoading();
    setTimeout(() => {
        renderCreditSales();
                       const checkInterval = setInterval(() => {
            checkCancelled();
        }, 100);
          resetCancellation();
        clearInterval(checkInterval);
        

        checkCancelled();
        
        hideLoading();
    }, 100);
});

function renderCreditSales() {
    const customerFilter = creditSalesCustomerNameFilter.value.toLowerCase();
    const statusFilter = creditSalesStatusFilter.value;
    const tableBody = creditSalesTableBody;
    
    // Clear existing rows
    tableBody.innerHTML = '';
    
    // Filter credit sales
    const filteredCreditSales = creditSales.filter(sale => {
        const matchesCustomer = sale.customerName.toLowerCase().includes(customerFilter);
        
        // Calculate total paid from payments ONLY, not advance payment
        const totalPaid = sale.payments && Array.isArray(sale.payments)
            ? sale.payments.reduce((sum, p) => sum + Number(p.amount || 0), 0)
            : 0;  // Don't auto-include advance payment in totalPaid
        
        // Apply status filter - USE THE STORED STATUS, don't auto-calculate
        let matchesStatus = false;
        switch(statusFilter) {
            case 'All':
                matchesStatus = true;
                break;
            case 'Outstanding':
                matchesStatus = sale.status === 'unpaid' || sale.status === 'partial';
                break;
            case 'Paid':
                matchesStatus = sale.status === 'paid';
                break;
            case 'Partial':
                matchesStatus = sale.status === 'partial';
                break;
            default:
                matchesStatus = true;
        }
        
        return matchesCustomer && matchesStatus;
    });
    
    // Show/hide no results message
    if (filteredCreditSales.length === 0) {
        noCreditSalesMessage.classList.remove('hidden');
        noCreditSalesMessage.textContent = translate('no_credit_sales_found');
        return;
    } else {
        noCreditSalesMessage.classList.add('hidden');
    }
    
    // Initialize totals
    let totalSalesAmount = 0;
    let totalPaidAmount = 0;
    let totalDueAmount = 0;
    
    // Create table rows
    filteredCreditSales.forEach(sale => {
        // Calculate total paid from payments ONLY
        const totalPaid = sale.payments && Array.isArray(sale.payments)
            ? sale.payments.reduce((sum, p) => sum + Number(p.amount || 0), 0)
            : 0;  // Don't auto-include advance payment
        
        // Amount due = totalAmount - totalPaid (payments only)
        const amountDue = Math.max(0, Number(sale.totalAmount) - totalPaid);
        
        // Add to totals
        totalSalesAmount += Number(sale.totalAmount);
        totalPaidAmount += totalPaid;
        totalDueAmount += amountDue;
        
        // Create row
        const tr = document.createElement('tr');
        tr.setAttribute('data-sale-id', sale.id);
        tr.classList.add('hover:bg-blue-50', 'transition-colors', 'duration-200');
        
        // Determine status text - USE STORED STATUS, don't auto-calculate
        let statusText = '';
        let statusClass = '';
        
        switch(sale.status) {
            case 'paid':
                statusText = translate('paid');
                statusClass = 'text-green-600';
                break;
            case 'partial':
                statusText = translate('partial');
                statusClass = 'text-yellow-600';
                break;
            case 'unpaid':
            default:
                statusText = translate('unpaid');
                statusClass = 'text-red-600';
                break;
        }
        
        // Also show advance payment info if it exists
        const advanceInfo = sale.advancePayment > 0 
            ? `<span class="text-xs text-gray-500 block">Advance: ${formatCurrency(sale.advancePayment)} on ${sale.advancePaymentDate || sale.dateSold}</span>`
            : '';
        
        // Populate row
        tr.innerHTML = `
            <td class="py-3 px-4 border-b">${sale.id}</td>
            <td class="py-3 px-4 border-b">${sale.customerName}</td>
            <td class="py-3 px-4 border-b">${sale.productName}</td>
            <td class="py-3 px-4 border-b text-center">${sale.quantity}</td>
            <td class="py-3 px-4 border-b text-right">${formatCurrency(sale.price)}</td>
            <td class="py-3 px-4 border-b text-right">${formatCurrency(sale.totalAmount)}</td>
            <td class="py-3 px-4 border-b text-right">
                ${formatCurrency(totalPaid)}
                ${advanceInfo}
            </td>
            <td class="py-3 px-4 border-b text-right">${formatCurrency(amountDue)}</td>
            <td class="py-3 px-4 border-b text-center">${sale.dateSold}</td>
            <td class="py-3 px-4 border-b text-center ${statusClass} font-medium">${statusText}</td>
            <td class="py-3 px-4 border-b text-center">
                ${sale.status !== 'paid' ? 
                    `<button class="bg-green-500 text-white px-3 py-1 rounded-md text-sm hover:bg-green-600 transition-colors mr-2"
                     onclick="openRecordPaymentModal('${sale.id}')">
                        ${translate('record_payment')}
                    </button>` : 
                    `<span class="text-green-600 font-medium">${translate('paid')}</span>`
                }
                <button class="bg-blue-500 text-white px-3 py-1 rounded-md text-sm hover:bg-blue-600 transition-colors"
                 onclick="openPaymentHistoryModal('${sale.id}')">
                    ${translate('view_payments')}
                </button>
            </td>
        `;
        
        tableBody.appendChild(tr);
    });
    
    // Add total row
    const totalRow = document.createElement('tr');
    totalRow.classList.add('bg-gray-100', 'dark:bg-gray-800', 'font-bold');
    totalRow.innerHTML = `
        <td class="py-3 px-4 text-base border-b" colspan="5">${translate('total')}</td>
        <td class="py-3 px-4 text-base border-b text-right">${formatCurrency(totalSalesAmount)}</td>
        <td class="py-3 px-4 text-base border-b text-right">${formatCurrency(totalPaidAmount)}</td>
        <td class="py-3 px-4 text-base border-b text-right">${formatCurrency(totalDueAmount)}</td>
        <td class="py-3 px-4 border-b" colspan="3"></td>
    `;
    tableBody.appendChild(totalRow);
}

// Remove duplicate function definition below - keep only one

async function markCreditSaleAsPaid(creditSaleId) {
    showConfirmationModal(translate('confirm_credit_sale_paid'), async () => {
        showLoading();
        
        try {
            const creditSale = creditSales.find(sale => sale.id === creditSaleId);
            if (!creditSale) {
                showMessageModal(translate('credit_sale_not_found'));
                               const checkInterval = setInterval(() => {
            checkCancelled();
        }, 100);
          resetCancellation();
        clearInterval(checkInterval);
        

        checkCancelled();
        
        hideLoading();
                return;
            }
            
            // Calculate remaining balance
            const totalPaid = creditSale.payments && Array.isArray(creditSale.payments)
                ? creditSale.payments.reduce((sum, p) => sum + Number(p.amount || 0), 0)
                : Number(creditSale.advancePayment) || 0;
            const remainingBalance = Math.max(0, creditSale.totalAmount - totalPaid);
            
            // Update credit sale status
            const updateData = { 
                status: 'paid',
                creditBalance: 0,
                datePaid: new Date().toISOString().split('T')[0]
            };
            
            const resCreditUpdate = await fetch(`${API_BASE}/api/credit-sales/${creditSaleId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updateData)
            });

            if (!resCreditUpdate.ok) {
                throw new Error(translate('failed_update_credit_sale_status'));
            }
            
            // If there's remaining balance, record a final payment
            if (remainingBalance > 0) {
                const finalPaymentEntry = {
                    id: `payment-${Date.now()}-${creditSaleId}`,
                    productName: `${translate('final_payment')}: ${creditSale.productName} (${translate('customer')}: ${creditSale.customerName})`,
                    quantity: 1,
                    price: remainingBalance,
                    totalAmount: remainingBalance,
                    dateSold: new Date().toISOString().split('T')[0],
                    paymentType: translate('credit_final_payment'),
                    creditSaleRefId: creditSaleId,
                    timestamp: new Date().toLocaleString('fr-FR'),
                    username: currentUser.username,
                    type: creditSale.type || 'credit'
                };

                await fetch(`${API_BASE}/api/sales`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(finalPaymentEntry)
                });
            }
            
            // Flash the row
            const paidRow = document.querySelector(`#creditSalesTableBody tr[data-sale-id="${creditSaleId}"]`);
            if (paidRow) {
                paidRow.classList.add('flash-green-animate');
                setTimeout(() => {
                    paidRow.classList.remove('flash-green-animate');
                }, 2000);
            }
            
            // Reload data
            await Promise.all([
                loadCreditSales(),
                loadSalesForYear(year)
            ]);
            
            // Re-render
            renderCreditSales();
            renderSales();
            
            showMessageModal(translate('credit_sale_marked_paid'));
            
        } catch (err) {
            console.error(translate('error_marking_credit_sale_paid'), err);
            showMessageModal(err.message || translate('error_marking_credit_sale_paid'));
        } finally {
                           const checkInterval = setInterval(() => {
            checkCancelled();
        }, 100);
          resetCancellation();
        clearInterval(checkInterval);
        

        checkCancelled();
        
        hideLoading();
        }
    });
}

window.openRecordPaymentModal = function(saleId) {
    currentCreditSaleId = saleId;
    
    // Set default date to today
    const today = new Date();
    const formattedDate = today.toISOString().split('T')[0];
    
    const paymentDateInput = document.getElementById('paymentDateInput');
    const paymentAmountInput = document.getElementById('paymentAmountInput');
    
    if (paymentDateInput) {
        paymentDateInput.value = formattedDate;
    }
    
    if (paymentAmountInput) {
        paymentAmountInput.value = '';
        paymentAmountInput.focus();
    }
    
    openModal('recordPaymentModal');
};

window.closeRecordPaymentModal = function() {
    closeModal('recordPaymentModal');
    currentCreditSaleId = null;
    
    // Clear inputs
    const paymentDateInput = document.getElementById('paymentDateInput');
    const paymentAmountInput = document.getElementById('paymentAmountInput');
    
    if (paymentDateInput) paymentDateInput.value = '';
    if (paymentAmountInput) paymentAmountInput.value = '';
};

window.submitPayment = async function() {
    const amountInput = document.getElementById('paymentAmountInput');
    const dateInput = document.getElementById('paymentDateInput');
    
    const amount = parseFloat(amountInput?.value || 0);
    const date = dateInput?.value;
    
    // Validation
    if (!amount || amount <= 0) {
        showMessageModal(translate('enter_valid_amount') || 'Please enter a valid amount');
        amountInput?.focus();
        return;
    }
    
    if (!date) {
        showMessageModal(translate('enter_date') || 'Please select a date');
        dateInput?.focus();
        return;
    }
    
    showLoading();
    
    try {
        // Find the sale
        const sale = creditSales.find(s => s.id === currentCreditSaleId);
        if (!sale) {
            showMessageModal(translate('credit_sale_not_found') || 'Credit sale not found');
                           const checkInterval = setInterval(() => {
            checkCancelled();
        }, 100);
          resetCancellation();
        clearInterval(checkInterval);
        

        checkCancelled();
        
        hideLoading();
            return;
        }
        
        // Calculate current totals
        const currentTotalPaid = sale.payments?.reduce((sum, p) => sum + Number(p.amount || 0), 0) || 0;
        const newTotalPaid = currentTotalPaid + amount;
        
        // Check if payment exceeds total amount
        if (newTotalPaid > sale.totalAmount) {
            const excess = newTotalPaid - sale.totalAmount;
            const confirmMessage = (translate('payment_exceeds_total') || 'Payment exceeds total amount') + 
                                 '. ' + (translate('excess_amount') || 'Excess') + 
                                 `: ${formatCurrency(excess)}. ` + 
                                 (translate('proceed_anyway') || 'Proceed anyway?');
            
            showConfirmationModal(
                confirmMessage,
                async () => {
                    await processPayment(sale, amount, date, newTotalPaid);
                }
            );
                           const checkInterval = setInterval(() => {
            checkCancelled();
        }, 100);
          resetCancellation();
        clearInterval(checkInterval);
        

        checkCancelled();
        
        hideLoading();
            return;
        }
        
        await processPayment(sale, amount, date, newTotalPaid);
        
    } catch (err) {
        console.error('Error processing payment:', err);
        const errorMsg = err.message || (translate('error_processing_payment') || 'Error processing payment');
        showMessageModal(errorMsg);
                       const checkInterval = setInterval(() => {
            checkCancelled();
        }, 100);
          resetCancellation();
        clearInterval(checkInterval);
        

        checkCancelled();
        
        hideLoading();
    }
};

async function processPayment(sale, amount, date, newTotalPaid) {
    try {
        showLoading();

        console.log('Processing payment for sale:', sale.id);
        console.log('Amount:', amount, 'Date:', date);

        // Add payment to local array
        if (!sale.payments) sale.payments = [];
        sale.payments.push({ 
            amount, 
            date,
            timestamp: new Date().toISOString(),
            recordedBy: currentUser.username
        });

        // Update sale status
        sale.creditBalance = Math.max(0, sale.totalAmount - newTotalPaid);
        if (newTotalPaid >= sale.totalAmount) {
            sale.status = 'paid';
            sale.datePaid = date;
        } else if (newTotalPaid > 0) {
            sale.status = 'partial';
        }

        console.log('Updating credit sale:', sale);

        // 1. Save updated credit sale to backend
        const updateResponse = await fetch(`${API_BASE}/api/credit-sales/${sale.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(sale)
        });

        if (!updateResponse.ok) {
            const errorText = await updateResponse.text();
            console.error('Credit sale update failed:', errorText);
            throw new Error(translate('failed_update_credit_sale') || 'Failed to update credit sale');
        }

        // 2. Create a payment record for the sales history – store RAW data only
        const paymentSaleEntry = {
            id: `payment-${Date.now()}-${sale.id}`,
            itemId: sale.itemId || sale.id,
            // Store the original product name – the display will add context later
            productName: sale.productName,
            quantity: 1,
            price: amount,
            totalAmount: amount,
            dateSold: date,
            // Raw payment type – no extra text
            paymentType: 'Credit Payment',
            customerName: sale.customerName,
            creditSaleRefId: sale.id,
            timestamp: new Date().toLocaleString('fr-FR'),
            username: currentUser.username,
            type: 'credit-payment',   // <-- important for filtering
            // Additional raw data needed for proper display later
            creditRemaining: sale.creditBalance,
            creditStatus: sale.creditBalance > 0 ? 'partial' : 'paid',
            // Optional: a simple note that won't be translated (or omit it)
            notes: `Payment recorded. Remaining: ${formatCurrency(sale.creditBalance)}`
        };

        console.log('Sending payment to sales history (raw data):', paymentSaleEntry);

        const salesResponse = await fetch(`${API_BASE}/api/newsales`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(paymentSaleEntry)
        });

        if (!salesResponse.ok) {
            const errorText = await salesResponse.text();
            console.error('Sales history update failed:', errorText);
            throw new Error(translate('failed_record_payment') || 'Failed to record payment');
        }

        const salesResult = await salesResponse.json();
        console.log('Payment recorded in sales history:', salesResult);

        // Flash the row
        const paidRow = document.querySelector(`#creditSalesTableBody tr[data-sale-id="${sale.id}"]`);
        if (paidRow) {
            paidRow.classList.add('flash-green-animate');
            setTimeout(() => {
                paidRow.classList.remove('flash-green-animate');
            }, 2000);
        }

        // Reload data
        await Promise.all([
            loadCreditSales(),
            loadSalesForYear(year)
        ]);

        // Re-render
        renderCreditSales();
        renderSales();

        // Close modal and show success
        closeRecordPaymentModal();
        showMessageModal(translate('payment_recorded_successfully') || 'Payment recorded successfully');

    } catch (err) {
        console.error('Process payment error:', err);
        throw err;
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

// Helper function for debouncing
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

window.openPaymentHistoryModal = function(saleId) {
    const sale = creditSales.find(s => s.id === saleId);
    const modalTitle = document.getElementById('paymentHistoryModalTitle');
    const tableContainer = document.getElementById('paymentHistoryTable');
    
    if (modalTitle) {
        modalTitle.textContent = `${translate('payment_history')}: ${sale.customerName}`;
    }
    
    let html = `<div class="overflow-x-auto">
        <table class="min-w-full table-auto text-sm border">
            <thead>
                <tr class="bg-gray-100 dark:bg-gray-700">
                    <th class="px-4 py-2 text-left text-base">${translate('date')}</th>
                    <th class="px-4 py-2 text-left text-base">${translate('amount')}</th>
                    <th class="px-4 py-2 text-left text-base">${translate('recorded_by')}</th>
                </tr>
            </thead>
            <tbody>`;
    
    if (sale && sale.payments && sale.payments.length > 0) {
        // Sort payments by date (newest first)
        const sortedPayments = [...sale.payments].sort((a, b) => 
            new Date(b.date) - new Date(a.date)
        );
        
        sortedPayments.forEach(p => {
            html += `<tr class="border-b hover:bg-gray-50 dark:hover:bg-gray-700">
                <td class="px-4 py-2">${p.date}</td>
                <td class="px-4 py-2 text-right font-medium">${formatCurrency(Number(p.amount))}</td>
                <td class="px-4 py-2">${p.recordedBy || currentUser.username || 'N/A'}</td>
            </tr>`;
        });
        
        // Add total
        const totalPaid = sortedPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
        html += `<tr class="bg-gray-100 dark:bg-gray-700 font-bold">
            <td class="px-4 py-2 text-base">${translate('total_paid')}</td>
            <td class="px-4 py-2 text-right text-base">${formatCurrency(totalPaid)}</td>
            <td class="px-4 py-2"></td>
        </tr>`;
        html += `<tr class="bg-gray-50 dark:bg-gray-800">
            <td class="px-4 py-2 font-medium">${translate('total_amount')}</td>
            <td class="px-4 py-2 text-right font-medium ">${formatCurrency(sale.totalAmount)}</td>
            <td class="px-4 py-2"></td>
        </tr>`;
        html += `<tr class="bg-gray-100 dark:bg-gray-700 font-bold">
            <td class="px-4 py-2 text-base">${translate('balance_due')}</td>
            <td class="px-4 py-2 text-right font-medium text-red-600">${formatCurrency(Math.max(0, sale.totalAmount - totalPaid))}</td>
            <td class="px-4 py-2"></td>
        </tr>`;
    } else {
        html += `<tr>
            <td colspan="3" class="px-4 py-8 text-center text-base">
                ${translate('no_payments_yet')}
            </td>
        </tr>`;
    }
    
    html += '</tbody></table></div>';
    
    if (tableContainer) {
        tableContainer.innerHTML = html;
    }
    
    openModal('paymentHistoryModal');
};

window.closePaymentHistoryModal = function() {
    closeModal('paymentHistoryModal');
};