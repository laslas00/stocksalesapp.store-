creditBookOptionBtn.addEventListener('click', () => {
    salesOptionsModal.classList.add('hidden'); // Hide sales options modal
    creditSalesSection.classList.remove('hidden');
        creditSalesSection.classList.add('MODAL-LOCK-OPEN');
                trackAppEvent('credit_sales_section_opened', {}, null);
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
    const customerFilter = (creditSalesCustomerNameFilter?.value || '').toLowerCase();
    const statusFilter = creditSalesStatusFilter?.value || 'All';
    const tableBody = creditSalesTableBody;
    
    if (!tableBody) return;
    
    // Clear existing rows
    tableBody.innerHTML = '';
    
    // Filter credit sales
    const filteredCreditSales = creditSales.filter(sale => {
        // ========== FIX: Handle both camelCase and snake_case ==========
        const customerName = (sale.customerName || sale.customer_name || '').toLowerCase();
        const matchesCustomer = customerName.includes(customerFilter);
        
        // Apply status filter
        let matchesStatus = false;
        const saleStatus = (sale.status || 'pending').toLowerCase();
        
        switch(statusFilter) {
            case 'All':
                matchesStatus = true;
                break;
            case 'Outstanding':
                matchesStatus = saleStatus === 'pending' || saleStatus === 'unpaid' || saleStatus === 'partial';
                break;
            case 'Paid':
                matchesStatus = saleStatus === 'paid';
                break;
            case 'Partial':
                matchesStatus = saleStatus === 'partial';
                break;
            default:
                matchesStatus = true;
        }
        
        return matchesCustomer && matchesStatus;
    });
    
    // Show/hide no results message
    if (filteredCreditSales.length === 0) {
        if (noCreditSalesMessage) {
            noCreditSalesMessage.classList.remove('hidden');
            noCreditSalesMessage.textContent = translate('no_credit_sales_found') || 'No credit sales found';
        }
        return;
    } else {
        if (noCreditSalesMessage) noCreditSalesMessage.classList.add('hidden');
    }
    
    // Initialize totals
    let totalSalesAmount = 0;
    let totalPaidAmount = 0;
    let totalDueAmount = 0;
    
    // Create table rows
    filteredCreditSales.forEach(sale => {
        // ========== FIX: Handle both field name formats ==========
        const customerName = sale.customerName || sale.customer_name || 'Unknown';
        const productName = sale.productName || sale.product_name || 'Unknown';
        const quantity = sale.quantity || 1;
        const price = sale.price || 0;
        const totalAmount = sale.totalAmount || sale.total_amount || 0;
        const dateSold = sale.dateSold || sale.date_sold || '';
        const saleStatus = (sale.status || 'pending').toLowerCase();
        
        // Calculate payments
        const payments = sale.payments || [];
        const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
        const amountDue = Math.max(0, Number(totalAmount) - totalPaid);
        
        // Add to totals
        totalSalesAmount += Number(totalAmount);
        totalPaidAmount += totalPaid;
        totalDueAmount += amountDue;
        
        // Create row
        const tr = document.createElement('tr');
        tr.setAttribute('data-sale-id', sale.id);
        tr.classList.add('hover:bg-blue-50', 'transition-colors', 'duration-200');
        
        // Determine status text
        let statusText = '';
        let statusClass = '';
        
        switch(saleStatus) {
            case 'paid':
                statusText = translate('paid') || 'Paid';
                statusClass = 'text-green-600';
                break;
            case 'partial':
                statusText = translate('partial') || 'Partial';
                statusClass = 'text-yellow-600';
                break;
            case 'pending':
            case 'unpaid':
            default:
                statusText = translate('unpaid') || 'Pending';
                statusClass = 'text-red-600';
                break;
        }
        
        // Advance payment info
        const advancePayment = sale.advancePayment || sale.advance_payment || 0;
        const advanceDate = sale.advancePaymentDate || sale.advance_payment_date || dateSold;
        const advanceInfo = advancePayment > 0 
            ? `<span class="text-xs text-gray-500 block">Advance: ${typeof formatCurrency === 'function' ? formatCurrency(advancePayment) : advancePayment} on ${advanceDate}</span>`
            : '';
        
        // Populate row
        tr.innerHTML = `
            <td class="py-3 px-4 border-b text-xs">${String(sale.id).slice(0, 8)}...</td>
            <td class="py-3 px-4 border-b">${customerName}</td>
            <td class="py-3 px-4 border-b">${productName}</td>
            <td class="py-3 px-4 border-b text-center">${quantity}</td>
            <td class="py-3 px-4 border-b text-right">${typeof formatCurrency === 'function' ? formatCurrency(price) : price}</td>
            <td class="py-3 px-4 border-b text-right">${typeof formatCurrency === 'function' ? formatCurrency(totalAmount) : totalAmount}</td>
            <td class="py-3 px-4 border-b text-right">
                ${typeof formatCurrency === 'function' ? formatCurrency(totalPaid) : totalPaid}
                ${advanceInfo}
            </td>
            <td class="py-3 px-4 border-b text-right">${typeof formatCurrency === 'function' ? formatCurrency(amountDue) : amountDue}</td>
            <td class="py-3 px-4 border-b text-center text-xs">${dateSold}</td>
            <td class="py-3 px-4 border-b text-center ${statusClass} font-medium">${statusText}</td>
            <td class="py-3 px-4 border-b text-center">
                ${saleStatus !== 'paid' ? 
                    `<button class="bg-green-500 text-white px-2 py-1 rounded-md text-xs hover:bg-green-600 transition-colors mr-1"
                     onclick="openRecordPaymentModal('${sale.id}')">
                        ${translate('record_payment') || 'Pay'}
                    </button>` : 
                    `<span class="text-green-600 font-medium text-xs">${translate('paid') || 'Paid'}</span>`
                }
                <button class="bg-blue-500 text-white px-2 py-1 rounded-md text-xs hover:bg-blue-600 transition-colors"
                 onclick="openPaymentHistoryModal('${sale.id}')">
                    ${translate('view_payments') || 'History'}
                </button>
            </td>
        `;
        
        tableBody.appendChild(tr);
    });
    
    // Add total row
    const totalRow = document.createElement('tr');
    totalRow.classList.add('bg-gray-100', 'dark:bg-gray-800', 'font-bold');
    totalRow.innerHTML = `
        <td class="py-3 px-4 text-base border-b" colspan="5">${translate('total') || 'Total'}</td>
        <td class="py-3 px-4 text-base border-b text-right">${typeof formatCurrency === 'function' ? formatCurrency(totalSalesAmount) : totalSalesAmount}</td>
        <td class="py-3 px-4 text-base border-b text-right">${typeof formatCurrency === 'function' ? formatCurrency(totalPaidAmount) : totalPaidAmount}</td>
        <td class="py-3 px-4 text-base border-b text-right">${typeof formatCurrency === 'function' ? formatCurrency(totalDueAmount) : totalDueAmount}</td>
        <td class="py-3 px-4 border-b" colspan="3"></td>
    `;
    tableBody.appendChild(totalRow);
}

// Remove duplicate function definition below - keep only one

async function markCreditSaleAsPaid(creditSaleId) {
    showConfirmationModal(translate('confirm_credit_sale_paid'), async () => {
        if (typeof showLoading === 'function') showLoading();
        
        try {
            const client = getSB();
            if (!client) throw new Error('Database connection not available');

            const creditSale = creditSales.find(sale => String(sale.id) === String(creditSaleId));
            if (!creditSale) {
                showMessageModal(translate('credit_sale_not_found'));
                if (typeof hideLoading === 'function') hideLoading();
                return;
            }
            
            // Get business ID for multi-tenant
            const currentBusinessId = currentUser?.business_id || businessInfo?.id || null;
            
            // Calculate remaining balance
            const totalPaid = creditSale.payments && Array.isArray(creditSale.payments)
                ? creditSale.payments.reduce((sum, p) => sum + Number(p.amount || 0), 0)
                : Number(creditSale.advancePayment || creditSale.advance_payment) || 0;
            const remainingBalance = Math.max(0, (creditSale.totalAmount || creditSale.total_amount) - totalPaid);
            
            console.log('🔍 Marking credit as paid:', {
                creditSaleId,
                totalPaid,
                remainingBalance,
                businessId: currentBusinessId
            });
            
            // ========== UPDATE CREDIT SALE IN SUPABASE ==========
            const updateData = { 
                status: 'paid',
                credit_balance: 0,
                date_paid: new Date().toISOString().split('T')[0],
                paid_amount: creditSale.totalAmount || creditSale.total_amount,
                updated_at: new Date().toISOString()
            };
            
            const { error: creditUpdateError } = await client
                .from('credit_sales')
                .update(updateData)
                .eq('id', creditSaleId);

            if (creditUpdateError) {
                throw new Error(translate('failed_update_credit_sale_status') + ': ' + creditUpdateError.message);
            }
            
            // ========== RECORD FINAL PAYMENT AS SALE (WITH BUSINESS ID) ==========
            if (remainingBalance > 0) {
                const finalPaymentEntry = {
                    product_name: `${translate('final_payment') || 'Final Payment'}: ${creditSale.productName || creditSale.product_name} (${translate('customer') || 'Customer'}: ${creditSale.customerName || creditSale.customer_name})`,
                    quantity: 1,
                    price: remainingBalance,
                    total_amount: remainingBalance,
                    date_sold: new Date().toISOString().split('T')[0],
                    payment_type: translate('credit_final_payment') || 'Credit Final Payment',
                    credit_sale_ref_id: creditSaleId,
                    username: currentUser?.username || 'Unknown',
                    type: creditSale.type || 'credit',
                    business_id: currentBusinessId,
                    created_at: new Date().toISOString()
                };

                const { error: saleInsertError } = await client
                    .from('sales')
                    .insert([finalPaymentEntry]);

                if (saleInsertError) {
                    console.warn('Could not record final payment as sale:', saleInsertError);
                } else {
                    console.log('✅ Final payment recorded with business_id:', currentBusinessId);
                }
            }
            
            // ========== FLASH THE ROW ==========
            const paidRow = document.querySelector(`#creditSalesTableBody tr[data-sale-id="${creditSaleId}"]`);
            if (paidRow) {
                paidRow.classList.add('flash-green-animate');
                setTimeout(() => {
                    paidRow.classList.remove('flash-green-animate');
                }, 2000);
            }
            
            // ========== RELOAD DATA ==========
            await Promise.all([
                typeof loadCreditSales === 'function' ? loadCreditSales() : Promise.resolve(),
                typeof loadSalesForYear === 'function' ? loadSalesForYear(typeof year !== 'undefined' ? year : new Date().getFullYear()) : Promise.resolve()
            ]);
            
            if (typeof renderCreditSales === 'function') renderCreditSales();
            if (typeof renderSales === 'function') renderSales();
            
            showMessageModal(translate('credit_sale_marked_paid') || 'Credit sale marked as paid!');
            
        } catch (err) {
            console.error('Error marking credit sale as paid:', err);
            showMessageModal(err.message || translate('error_marking_credit_sale_paid') || 'Error marking as paid');
        } finally {
            if (typeof hideLoading === 'function') hideLoading();
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
       const paymentTypeInput = document.getElementById('paymentTypeInput');
    
    const amount = parseFloat(amountInput?.value || 0);
    const date = dateInput?.value;
     const paymentMethod = paymentTypeInput?.value || 'Cash';  
    
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
        const sale = creditSales.find(s => s.id === currentCreditSaleId);
        if (!sale) {
            showMessageModal(translate('credit_sale_not_found') || 'Credit sale not found');
            // ... existing cleanup ...
            hideLoading();
            return;
        }
        
        const currentTotalPaid = sale.payments?.reduce((sum, p) => sum + Number(p.amount || 0), 0) || 0;
        const newTotalPaid = currentTotalPaid + amount;
        
        if (newTotalPaid > sale.totalAmount) {
            const excess = newTotalPaid - sale.totalAmount;
            const confirmMessage = (translate('payment_exceeds_total') || 'Payment exceeds total amount') +
                                 '. ' + (translate('excess_amount') || 'Excess') +
                                 `: ${formatCurrency(excess)}. ` +
                                 (translate('proceed_anyway') || 'Proceed anyway?');
            
            showConfirmationModal(
                confirmMessage,
                async () => {
                    await processPayment(sale, amount, date, newTotalPaid, paymentMethod);  // pass method
                }
            );
            hideLoading();
            return;
        }
        
        await processPayment(sale, amount, date, newTotalPaid, paymentMethod);    
        
    
        
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

async function processPayment(sale, amount, date, newTotalPaid, paymentMethod) {
    try {
        if (typeof showLoading === 'function') showLoading();

        console.log('Processing payment for sale:', sale.id);
        console.log('Amount:', amount, 'Date:', date);

        const client = getSB();
        if (!client) throw new Error('Database connection not available');

        // Get business ID for multi-tenant
        const currentBusinessId = currentUser?.business_id || businessInfo?.id || null;

        // Add payment to local array
        if (!sale.payments) sale.payments = [];
        sale.payments.push({ 
            amount, 
            date,
            method: paymentMethod,
            timestamp: new Date().toISOString(),
            recordedBy: currentUser?.username || 'Unknown'
        });

        // Update sale status
        sale.creditBalance = Math.max(0, (sale.totalAmount || sale.total_amount) - newTotalPaid);
        if (newTotalPaid >= (sale.totalAmount || sale.total_amount)) {
            sale.status = 'paid';
            sale.datePaid = date;
        } else if (newTotalPaid > 0) {
            sale.status = 'partial';
        }

        console.log('Updating credit sale:', { id: sale.id, status: sale.status, businessId: currentBusinessId });

        // ========== 1. UPDATE CREDIT SALE IN SUPABASE ==========
        const { error: creditUpdateError } = await client
            .from('credit_sales')
            .update({
                payments: sale.payments,
                credit_balance: sale.creditBalance,
                status: sale.status,
                paid_amount: newTotalPaid,
                date_paid: sale.status === 'paid' ? date : null,
                updated_at: new Date().toISOString()
            })
            .eq('id', sale.id);

        if (creditUpdateError) {
            console.error('Credit sale update failed:', creditUpdateError);
            throw new Error((translate('failed_update_credit_sale') || 'Failed to update credit sale') + ': ' + creditUpdateError.message);
        }

        // ========== 2. RECORD PAYMENT IN SALES TABLE (WITH BUSINESS ID) ==========
        const paymentSaleEntry = {
            product_name: sale.productName || sale.product_name,
            quantity: 1,
            price: amount,
            total_amount: amount,
            date_sold: date,
            payment_type: `${paymentMethod} (Credit)`,
            customer_name: sale.customerName || sale.customer_name,
            credit_sale_ref_id: sale.id,
            username: currentUser?.username || 'Unknown',
            type: 'credit-payment',
            business_id: currentBusinessId,
            credit_remaining: sale.creditBalance,
            credit_status: sale.creditBalance > 0 ? 'partial' : 'paid',
            notes: `Payment recorded. Remaining: ${typeof formatCurrency === 'function' ? formatCurrency(sale.creditBalance) : sale.creditBalance}`,
            created_at: new Date().toISOString()
        };

        console.log('Recording payment with business_id:', currentBusinessId);

        const { error: salesInsertError } = await client
            .from('sales')
            .insert([paymentSaleEntry]);

        if (salesInsertError) {
            console.error('Sales history insert failed:', salesInsertError);
            throw new Error((translate('failed_record_payment') || 'Failed to record payment') + ': ' + salesInsertError.message);
        }

        console.log('✅ Payment recorded in sales table');

        // ========== 3. FLASH THE ROW ==========
        const paidRow = document.querySelector(`#creditSalesTableBody tr[data-sale-id="${sale.id}"]`);
        if (paidRow) {
            paidRow.classList.add('flash-green-animate');
            setTimeout(() => {
                paidRow.classList.remove('flash-green-animate');
            }, 2000);
        }

        // ========== 4. RELOAD DATA ==========
        await Promise.all([
            typeof loadCreditSales === 'function' ? loadCreditSales() : Promise.resolve(),
            typeof loadSalesForYear === 'function' ? loadSalesForYear(typeof year !== 'undefined' ? year : new Date().getFullYear()) : Promise.resolve()
        ]);

        // Re-render
        if (typeof renderCreditSales === 'function') renderCreditSales();
        if (typeof renderSales === 'function') renderSales();

        // Close modal and show success
        if (typeof closeRecordPaymentModal === 'function') closeRecordPaymentModal();
        showMessageModal(translate('payment_recorded_successfully') || 'Payment recorded successfully');

    } catch (err) {
        console.error('Process payment error:', err);
        showMessageModal(err.message || 'Failed to process payment');
    } finally {
        if (typeof hideLoading === 'function') hideLoading();
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
                    <th class="px-4 py-2 text-left text-base">${translate('payment_method')}</th>
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
                <td class="px-4 py-2">${p.method || 'N/A'}</td>
                <td class="px-4 py-2">${p.recordedBy || currentUser.username || 'N/A'}</td>
            </tr>`;
        });
        
        // Add total
        const totalPaid = sortedPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
        html += `<tr class="bg-gray-100 dark:bg-gray-700 font-bold">
            <td class="px-4 py-2 text-base">${translate('total_paid')}</td>
            <td class="px-4 py-2 text-right text-base">${formatCurrency(totalPaid)}</td>
            <td class="px-4 py-2"></td>
             <td class="px-4 py-2"></td>
        </tr>`;
        html += `<tr class="bg-gray-50 dark:bg-gray-800">
            <td class="px-4 py-2 font-medium">${translate('total_amount')}</td>
            <td class="px-4 py-2 text-right font-medium ">${formatCurrency(sale.totalAmount)}</td>
            <td class="px-4 py-2"></td>
             <td class="px-4 py-2"></td>
        </tr>`;
        html += `<tr class="bg-gray-100 dark:bg-gray-700 font-bold">
            <td class="px-4 py-2 text-base">${translate('balance_due')}</td>
            <td class="px-4 py-2 text-right font-medium text-red-600">${formatCurrency(Math.max(0, sale.totalAmount - totalPaid))}</td>
            <td class="px-4 py-2"></td>
             <td class="px-4 py-2"></td>
        </tr>`;
    } else {
        html += `<tr>
            <td colspan="3" class="px-4 py-8 ">
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