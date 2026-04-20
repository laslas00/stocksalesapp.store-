// Customer Transaction Viewer

async function openCustomerTransactionsModal(customerName) {
    try {
        console.log(`👤 Opening transactions for customer: ${customerName}`);
        
        // Show loading
        showLoading();
if (isCancelled) return;
        
        // Get customer transactions from server
        const response = await fetch(`${API_BASE}/api/customers/${encodeURIComponent(customerName)}/transactions`);
        
        if (!response.ok) {
            throw new Error(translate('customer_transactions.error_fetch'));
        }
        
        const data = await response.json();
        
        if (!data.success || data.transactions.length === 0) {
                           const checkInterval = setInterval(() => {
            checkCancelled();
        }, 100);
        
          resetCancellation();
        clearInterval(checkInterval);
        

        checkCancelled();
        
        hideLoading();
            showMessageModal(translate('customer_transactions.no_transactions', { customer: customerName }));
            return;
        }
        
        // Create and show modal
        showCustomerTransactionsModal(customerName, data);
        
                       const checkInterval = setInterval(() => {
            checkCancelled();
        }, 100);
          resetCancellation();
        clearInterval(checkInterval);
        

        checkCancelled();
        
        hideLoading();
        
    } catch (error) {
                       const checkInterval = setInterval(() => {
            checkCancelled();
        }, 100);
          resetCancellation();
        clearInterval(checkInterval);
        

        checkCancelled();
        
        hideLoading();
        console.error('Error opening customer transactions:', error);
        showMessageModal(translate('customer_transactions.load_error', { error: error.message }));
    }
}

function showCustomerTransactionsModal(customerName, data) {
    if (document.getElementById('customerTransactionsModal')) return;
       let customerPhone = '';
    if (data && data.customers && Array.isArray(data.customers)) {
        const customerInfo = data.customers.find(c => c.name === customerName);
        if (customerInfo) {
            customerPhone = customerInfo.phone || '';
        }
    }
// Escape single quotes for use in onclick attributes
const escapedName = customerName.replace(/'/g, "\\'");
    const modalHTML = `
        <div id="customerTransactionsModal" class="modal-overlay hidden">
            <div class="customer-transactions-panel">

                <!-- HEADER -->
                <div class="ct-header">
                    <div class="flex justify-between items-start gap-4">
                        <div>
                           <h2 class="text-2xl font-bold"
                                data-translate="customer_transactions.title"
                                data-translate-value="${customerName}">
                                👤 ${customerName}
                            </h2>
                            ${customerPhone ? `
                            <p class="text-sm opacity-90">
                                📞 ${customerPhone}
                            </p>
                            ` : ''}
                            <p class="text-sm opacity-90"
                               data-translate="customer_transactions.history">
                                Customer Transaction History
                            </p>
                        </div>

                        <div class="text-right">
                            <div class="text-lg font-semibold"
                                 data-translate="customer_transactions.count"
                                 data-translate-value="${data.transactionCount}">
                                ${data.transactionCount} Transactions
                            </div>
                            <div class="text-sm opacity-80"
                                 data-translate="customer_transactions.total"
                                 data-translate-value="${formatCurrency(data.summary.totalAmount)}">
                                Total: ${formatCurrency(data.summary.totalAmount)}
                            </div>
                        </div>

                        <button class="modal-close-btn"
                                onclick="closeCustomerTransactionsModal()">
                            &times;
                        </button>
                    </div>

                    <!-- SUMMARY -->
                    <div class="summary-grid">
                        <div class="summary-card blue">
                            <span data-translate="customer_transactions.sales">Sales</span>
                            <strong>${data.summary.totalSales}</strong>
                        </div>
                        <div class="summary-card yellow">
                            <span data-translate="customer_transactions.credits">Credit Sales</span>
                            <strong>${data.summary.totalCredits}</strong>
                        </div>
                        <div class="summary-card green">
                            <span data-translate="customer_transactions.receipts">Receipts</span>
                            <strong>${data.summary.totalReceipts}</strong>
                        </div>
                        <div class="summary-card purple">
                            <span data-translate="customer_transactions.total_amount">Total</span>
                            <strong>${formatCurrency(data.summary.totalAmount)}</strong>
                        </div>
                    </div>
                </div>

                <!-- BODY -->
                <div class="ct-body">
                    <!-- Filters -->
                    <div class="filters">
                        <select id="transactionTypeFilter" onchange="filterCustomerTransactions()">
                            <option value="all" data-translate="customer_transactions.filter_all">All Types</option>
                            <option value="sale" data-translate="customer_transactions.filter_sales">Sales</option>
                            <option value="credit" data-translate="customer_transactions.filter_credits">Credit Sales</option>
                            <option value="receipt" data-translate="customer_transactions.filter_receipts">Receipts</option>
                        </select>

                        <select id="transactionStatusFilter" onchange="filterCustomerTransactions()">
                            <option value="all" data-translate="customer_transactions.filter_all_status">All Status</option>
                            <option value="completed" data-translate="customer_transactions.status_completed">Completed</option>
                            <option value="pending" data-translate="customer_transactions.status_pending">Pending</option>
                            <option value="paid" data-translate="customer_transactions.status_paid">Paid</option>
                        </select>

                        <input type="date" id="transactionDateFilter"
                               onchange="filterCustomerTransactions()">

                        <button class="export-btn"
                               onclick="exportCustomerTransactions('${escapedName}', customerTransactionsData)"
                                data-translate="customer_transactions.export_button">
                            📊 Export
                        </button>
                    </div>

                    <!-- TABLE -->
                    <div class="table-wrapper">
                        <table>
                            <thead class="table-header">
                                <tr>
                                    <th  text-base data-translate="customer_transactions.date">Date</th>
                                    <th  text-base  data-translate="customer_transactions.type">Type</th>
                                    <th  text-base data-translate="customer_transactions.product">Product</th>
                                    <th  text-base data-translate="customer_transactions.quantity">Qty</th>
                                    <th  text-base  data-translate="customer_transactions.total">Total</th>
                                    <th  text-base data-translate="customer_transactions.payment">Payment</th>
                                    <th  text-base  data-translate="customer_transactions.status">Status</th>
                                    <th text-base  data-translate="customer_transactions.actions">Actions</th>
                                </tr>
                            </thead>
                            <tbody id="customerTransactionsBody"></tbody>
                        </tfoot>
                        </table>
                        <div class="mt-8 p-4 border-t border-gray-200">
                            <h3 class="font-bold text-gray-700 mb-2" data-translate="customer_statement.notes">Notes:</h3>
                            <ul class="text-sm text-gray-600 list-disc pl-5">
                                <li data-translate="customer_statement.note1" data-translate-value="${customerName}">This statement includes all transactions for ${customerName}</li>
                                <li data-translate="customer_statement.note2" data-translate-date="${new Date().toLocaleDateString()}" data-translate-time="${new Date().toLocaleTimeString()}">Statement generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</li>
                                <li data-translate="customer_statement.note3">For any discrepancies, please contact within 7 days</li>
                            </ul>
                        </div>
                        <div id="noTransactionsMessage"
                             class="empty-state hidden"
                             data-translate="customer_transactions.no_results">
                            No transactions found with the current filters.
                        </div>
                    </div>
                </div>

                <!-- FOOTER -->
                <div class="ct-footer">
                    <button onclick="printCustomerStatement('${escapedName}')"
                            class="primary-btn"
                            data-translate="customer_transactions.print_statement">
                        🖨️ Print Statement
                    </button>

                    <div class="footer-actions">
                        <button onclick="closeCustomerTransactionsModal()"
                                class="secondary-btn"
                                data-translate="close">
                            Close
                        </button>
                        <button onclick="openReceiptForCustomer('${escapedName}')"
                                class="accent-btn"
                                data-translate="customer_transactions.new_receipt">
                            📄 New Receipt
                        </button>
                    </div>
                </div>

            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    window.customerTransactionsData = data;
    window.currentCustomerName = customerName;

    populateCustomerTransactionsTable(data.transactions);

    requestAnimationFrame(() => {
        const modal = document.getElementById('customerTransactionsModal');
        modal.classList.remove('hidden');
    });

    if (typeof translateUI === 'function') translateUI();
}
function closeCustomerTransactionsModal() {
    const modal = document.getElementById('customerTransactionsModal');
    if (!modal) return;

    modal.classList.remove('show');

    setTimeout(() => modal.remove(), 300);
}

function applyModalTranslations() {
    // Apply translation to select options and other dynamic elements
    setTimeout(() => {
        if (typeof translateUI === 'function') {
            translateUI();
        } else if (typeof translateElement === 'function') {
            const modal = document.getElementById('customerTransactionsModal');
            if (modal) {
                translateElement(modal);
            }
        }
    }, 100);
}

function populateCustomerTransactionsTable(transactions) {
    const tbody = document.getElementById('customerTransactionsBody');
    const noTransactionsMsg = document.getElementById('noTransactionsMessage');
    
    tbody.innerHTML = '';
    
    if (transactions.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="px-6 py-4 text-center text-gray-500" data-translate="customer_transactions.no_transactions_table">
                    No transactions found.
                </td>
            </tr>
        `;
        noTransactionsMsg.classList.remove('hidden');
        return;
    }
    
    noTransactionsMsg.classList.add('hidden');
    
    transactions.forEach((transaction, index) => {
        const row = document.createElement('tr');
        row.className = index % 2 === 0 ? 'bg-white' : 'bg-gray-50';
        
        // Get translated type
        const typeText = translate(`customer_transactions.type_${transaction.type}`);
        const statusText = translate(`customer_transactions.status_${transaction.status}`);
        
        row.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                ${new Date(transaction.date).toLocaleDateString()}
                <div class="text-xs text-gray-500">
                    ${new Date(transaction.date).toLocaleTimeString()}
                </div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                    ${transaction.type === 'sale' ? 'bg-green-100 text-green-800' : 
                      transaction.type === 'credit' ? 'bg-yellow-100 text-yellow-800' : 
                      'bg-blue-100 text-blue-800'}">
                    ${typeText}
                </span>
            </td>
            <td class="px-6 py-4 text-sm text-gray-900">
                <div class="font-medium">${transaction.productName}</div>
                <div class="text-xs text-gray-500">ID: ${transaction.id}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                ${transaction.quantity}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                ${formatCurrency(transaction.total)}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                ${transaction.paymentType || 'N/A'}
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                    ${transaction.status === 'completed' || transaction.status === 'paid' ? 'bg-green-100 text-green-800' : 
                      transaction.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 
                      'bg-gray-100 text-gray-800'}">
                    ${statusText}
                </span>
                ${transaction.balanceDue ? `
                    <div class="text-xs text-red-600 mt-1">
                        ${translate('customer_transactions.balance')}: ${formatCurrency(transaction.balanceDue)}
                    </div>
                ` : ''}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <button onclick="viewCustomerTransaction('${transaction.type}', '${transaction.id}')" 
                        class="text-blue-600 hover:text-blue-900 mr-3" data-translate="customer_transactions.view_button">
                    👁️ View
                </button>

            </td>
        `;
        tbody.appendChild(row);
    });
}

function filterCustomerTransactions() {
    const typeFilter = document.getElementById('transactionTypeFilter').value;
    const statusFilter = document.getElementById('transactionStatusFilter').value;
    const dateFilter = document.getElementById('transactionDateFilter').value;
    
    const filtered = window.customerTransactionsData.transactions.filter(transaction => {
        if (typeFilter !== 'all' && transaction.type !== typeFilter) {
            return false;
        }
        
        if (statusFilter !== 'all' && transaction.status !== statusFilter) {
            return false;
        }
        
        if (dateFilter) {
            const transactionDate = new Date(transaction.date).toISOString().split('T')[0];
            if (transactionDate !== dateFilter) {
                return false;
            }
        }
        
        return true;
    });
    
    populateCustomerTransactionsTable(filtered);
}


async function viewCustomerTransaction(type, id) {
    try {
        console.log(`Viewing ${type} transaction: ${id}`);
        
        showLoading();
        
        let receiptData;
        
        if (type === 'receipt') {
            const response = await fetch(`${API_BASE}/api/customer-receipts/${id}`);
            if (!response.ok) {
                throw new Error(translate('customer_transactions.receipt_not_found'));
            }
            receiptData = await response.json();
        } else {
            // For sales and credits
            const transaction = window.customerTransactionsData?.transactions?.find(t => 
                t.id === id && t.type === type
            );
            
            if (transaction) {
                receiptData = transaction;
            }
        }
        
        hideLoading();
        
        if (receiptData) {
            // DEBUG: Log the raw receiptData
            console.log('Raw receiptData before transformation:', receiptData);
            
            // Create items array from the transaction data
            const items = [];
            
            // Check if we have a single product (sales data)
            if (receiptData.productName) {
                console.log('Found single product in receiptData:', {
                    productName: receiptData.productName,
                    quantity: receiptData.quantity,
                    price: receiptData.price,
                    totalAmount: receiptData.totalAmount,
                    total: receiptData.total
                });
                
                // FIX: Use the correct price value
                const itemPrice = receiptData.totalAmount || receiptData.total || receiptData.price || 0;
                
                items.push({
                    name: receiptData.productName,
                    type: receiptData.productType || 'product',
                    quantity: receiptData.quantity || 1,
                    price: itemPrice,
                    paymentType: receiptData.paymentType || 'Cash'
                });
                
                console.log('Created item with price:', itemPrice);
            }
            // Check if we already have items array (receipts data)
            else if (receiptData.items && Array.isArray(receiptData.items)) {
                console.log('Found items array in receiptData');
                items.push(...receiptData.items);
            }
            
            // Prepare data for showReceiptFromData
            const transformedData = {
                receiptId: receiptData.id || receiptData.receiptId || id,
                date: receiptData.date || receiptData.createdAt || new Date().toISOString(),
                cashier: receiptData.cashier || getCurrentUser()?.displayName || translate('theCashier'),
                customerName: receiptData.customerName || window.currentCustomerName || '',
                customerPhoneNumber: receiptData.customerPhoneNumber || '', // ADD PHONE NUMBER
                items: items,
                taxAmount: receiptData.taxAmount || 0,
                advancePaymentAmount: receiptData.advancePaymentAmount || 0,
                amountPaidText: receiptData.totalAmount || receiptData.total || receiptData.amountPaid || 0,
                balanceDueText: receiptData.balanceDue || 0
            };
            
            console.log('Transformed data for showReceiptFromData:', transformedData);
            
            await showReceiptFromData(transformedData);
            closeCustomerTransactionsModal();
        } else {
            throw new Error(translate('customer_transactions.no_data_found'));
        }
        
    } catch (error) {
        hideLoading();
        console.error('Error viewing transaction:', error);
        showMessageModal(translate('customer_transactions.view_error', { error: error.message }));
    }
}

async function printCustomerStatement(customerName) {
    try {
        console.log(`Printing statement for: ${customerName}`);
        
        showLoading();
if (isCancelled) return;
        
        if (!window.customerTransactionsData) {
            const response = await fetch(`${API_BASE}/api/customers/${encodeURIComponent(customerName)}/transactions`);
            if (!response.ok) {
                throw new Error(translate('customer_transactions.error_fetch'));
            }
            window.customerTransactionsData = await response.json();
        }
        
        const statementContent = createCustomerStatementContent(customerName, window.customerTransactionsData);
        
                       const checkInterval = setInterval(() => {
            checkCancelled();
        }, 100);
          resetCancellation();
        clearInterval(checkInterval);
        

        checkCancelled();
        
        hideLoading();
        closeCustomerTransactionsModal();
        closeCustomerSearchModal();

        
        showPrintPreviewModal(statementContent, 'customer-statement', null, {
            dateRange: translate('customer_transactions.generated_on', { date: new Date().toLocaleDateString() }),
            filters: translate('customer_transactions.customer_filter', { customer: customerName }),
            customerName: customerName
        });
        
    } catch (error) {
                       const checkInterval = setInterval(() => {
            checkCancelled();
        }, 100);
          resetCancellation();
        clearInterval(checkInterval);
        

        checkCancelled();
        
        hideLoading();
        console.error('Error printing customer statement:', error);
        showMessageModal(translate('customer_transactions.print_error', { error: error.message }));
    }
}

function createCustomerStatementContent(customerName, data) {
    let customerPhone = '';
    
    if (data && data.customers && Array.isArray(data.customers)) {
        const customerInfo = data.customers.find(c => c.name === customerName);
        if (customerInfo) {
            customerPhone = customerInfo.phone || '';
        }
    }
    
    const container = document.createElement('div');
    container.className = 'customer-statement';
    container.id = 'customerStatementContent';
    
    container.innerHTML = `
        <div id="job" class="p-6">
            <!-- Statement Header -->
            <div class="text-center mb-8">
                <h1 class="text-3xl font-bold text-gray-800 mb-2" data-translate="customer_statement.title">Customer Statement</h1>
                <div class="flex justify-between items-center">
                    <div class="text-left">
                        <p class="text-lg font-semibold text-gray-700" data-translate="customer_statement.customer" data-translate-value="${customerName}">Customer: ${customerName}</p>
                        ${customerPhone ? `
                        <p class="text-gray-600">Phone: ${customerPhone}</p>
                        ` : ''}
                        <p class="text-gray-600" data-translate="customer_statement.date" data-translate-value="${new Date().toLocaleDateString()}">Statement Date: ${new Date().toLocaleDateString()}</p>
                    </div>
                    <div class="text-right">
                        <p class="text-gray-600" data-translate="customer_statement.period">Period: All Transactions</p>
                        <p class="text-sm text-gray-500" data-translate="customer_statement.total_transactions" data-translate-value="${data.transactionCount || 0}">Total Transactions: ${data.transactionCount || 0}</p>
                    </div>
                </div>
            </div>
            
            <!-- Summary Section -->
            <div class="bg-gray-50 p-4 rounded-lg mb-6">
                <h2 class="text-xl font-bold text-gray-800 mb-4" data-translate="customer_statement.summary">Summary</h2>
                <div class="grid grid-cols-4 gap-4">
                    <div class="text-center">
                        <p class="text-sm text-gray-600" data-translate="customer_statement.total_sales">Total Sales</p>
                        <p class="text-lg font-bold text-green-700">${data.summary?.totalSales || 0}</p>
                    </div>
                    <div class="text-center">
                        <p class="text-sm text-gray-600" data-translate="customer_statement.credit_sales">Credit Sales</p>
                        <p class="text-lg font-bold text-yellow-700">${data.summary?.totalCredits || 0}</p>
                    </div>
                    <div class="text-center">
                        <p class="text-sm text-gray-600" data-translate="customer_statement.receipts">Receipts</p>
                        <p class="text-lg font-bold text-blue-700">${data.summary?.totalReceipts || 0}</p>
                    </div>
                    <div class="text-center">
                        <p class="text-sm text-gray-600" data-translate="customer_statement.total_amount">Total Amount</p>
                        <p class="text-lg font-bold text-purple-700">${formatCurrency(data.summary?.totalAmount || 0)}</p>
                    </div>
                </div>
            </div>
            
            <!-- Transactions Table -->
            <div class="mb-6">
                <h2 class="text-xl font-bold text-gray-800 mb-4" data-translate="customer_statement.details">Transaction Details</h2>
                <div class="overflow-x-auto">
                    <table class="min-w-full divide-y divide-gray-200">
                        <thead class="bg-gray-100">
                            <tr>
                                <th class="px-4 py-3 text-left text-xs font-medium text-base uppercase tracking-wider" data-translate="customer_transactions.date">Date</th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-base uppercase tracking-wider" data-translate="customer_transactions.type">Type</th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-base uppercase tracking-wider" data-translate="customer_transactions.product">Product</th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-base uppercase tracking-wider" data-translate="customer_transactions.quantity">Quantity</th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-base uppercase tracking-wider" data-translate="customer_transactions.total">Total</th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-base uppercase tracking-wider" data-translate="customer_transactions.payment">Payment</th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-base uppercase tracking-wider" data-translate="customer_transactions.status">Status</th>
                            </tr>
                        </thead>
                        <tbody id="statementTransactionsBody" class="bg-white divide-y divide-gray-200">
                            <!-- Transactions will be populated here -->
                        </tbody>
                        <tfoot class="bg-gray-50">
                            <tr>
                                <td colspan="4" class="px-4 py-3 text-right font-bold text-gray-700" data-translate="customer_statement.footer_total">Total:</td>
                                <td class="px-4 py-3 font-bold text-gray-900">${formatCurrency(data.summary?.totalAmount || 0)}</td>
                                <td colspan="2"></td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>
            
            <!-- Notes Section -->
            <div class="mt-8 p-4 border-t border-gray-200">
                <h3 class="font-bold text-gray-700 mb-2" data-translate="customer_statement.notes">Notes:</h3>
                <ul class="text-sm text-gray-600 list-disc pl-5">
                    <li data-translate="customer_statement.note1" data-translate-value="${customerName}">This statement includes all transactions for ${customerName}</li>
                    <li data-translate="customer_statement.note2" data-translate-date="${new Date().toLocaleDateString()}" data-translate-time="${new Date().toLocaleTimeString()}">Statement generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</li>
                    <li data-translate="customer_statement.note3">For any discrepancies, please contact within 7 days</li>
                    ${customerPhone ? `
                    <li>Customer Phone: ${customerPhone}</li>
                    ` : ''}
                </ul>
            </div>
        </div>
    `;
    
    // Populate transactions table
    const tbody = container.querySelector('#statementTransactionsBody');
    if (data.transactions && data.transactions.length > 0) {
        data.transactions.forEach(transaction => {
            const row = document.createElement('tr');
            row.className = 'hover:bg-gray-50';
            row.innerHTML = `
                <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                    ${new Date(transaction.date).toLocaleDateString()}
                </td>
                <td class="px-4 py-3 whitespace-nowrap">
                    <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium
                        ${transaction.type === 'sale' ? 'bg-green-100 text-green-800' : 
                          transaction.type === 'credit' ? 'bg-yellow-100 text-yellow-800' : 
                          'bg-blue-100 text-blue-800'}">
                        ${transaction.type === 'sale' ? 'Sale' : 
                         transaction.type === 'credit' ? 'Credit' : 
                         'Receipt'}
                    </span>
                </td>
                <td class="px-4 py-3 text-sm text-gray-900">
                    ${transaction.productName || 'N/A'}
                </td>
                <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                    ${transaction.quantity || 1}
                </td>
                <td class="px-4 py-3 whitespace-nowrap text-sm font-semibold text-gray-900">
                    ${formatCurrency(transaction.total || 0)}
                </td>
                <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                    ${transaction.paymentType || 'N/A'}
                </td>
                <td class="px-4 py-3 whitespace-nowrap">
                    <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium
                        ${transaction.status === 'completed' || transaction.status === 'paid' ? 'bg-green-100 text-green-800' : 
                          transaction.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 
                          'bg-gray-100 text-gray-800'}">
                        ${transaction.status || 'Unknown'}
                    </span>
                </td>
            `;
            tbody.appendChild(row);
        });
    } else {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="px-4 py-8 text-center text-gray-500" data-translate="customer_transactions.no_transactions_table">
                    No transactions found for this customer.
                </td>
            </tr>
        `;
    }
    
    return container;
}

async function exportCustomerTransactions(customerName, data) {
    try {
        // Create CSV content
        let csvContent = `${translate('customer_transactions.csv_headers')}\n`;
        
        data.transactions.forEach(transaction => {
            csvContent += `"${new Date(transaction.date).toLocaleDateString()}","${transaction.type}","${transaction.productName}","${transaction.quantity}","${transaction.total}","${transaction.paymentType || ''}","${transaction.status}","${transaction.balanceDue || 0}"\n`;
        });
        
        // Create blob and download
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${customerName.replace(/[^a-z0-9]/gi, '_')}_transactions_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        showMessageModal(translate('customer_transactions.export_success', { count: data.transactions.length }), 'success');
        
    } catch (error) {
        console.error('Error exporting transactions:', error);
        showMessageModal(translate('customer_transactions.export_error', { error: error.message }));
    }
}

async function openReceiptForCustomer(customerName) {
    await openNewReceiptModal();
    
    const customerInput = document.getElementById('receiptCustomerNameInput');
    if (customerInput) {
        customerInput.value = customerName;
        
        if (typeof updateQRCode === 'function') {
            updateQRCode();
        }
    }
}

function closeCustomerTransactionsModal() {
    const modal = document.getElementById('customerTransactionsModal');
    if (modal) {
        modal.remove();
    }
    window.customerTransactionsData = null;
    window.currentCustomerName = null;
}
function closeCustomerSearchModal() {
    const modal = document.getElementById('customerSearchModal');
    if (!modal) return;

    modal.classList.remove('show');

    setTimeout(() => {
        modal.remove();
        document.body.style.overflow = '';
    }, 300);
}

// Customer Search Modal with Translation Keys
function openCustomerSearchModal() {
        if (localStorage.getItem('freeModeActive') === 'true') {
        if (typeof showMessageModal === 'function') {
        showMessageModal(translate('feature_locked_free_mode'));
        } else {
            alert("Printing is disabled in Free Mode. Please activate your license.");
        }
        return; // STOP execution here
    }
    // Prevent duplicate modal
    if (document.getElementById('customerSearchModal')) return;

    const modalHTML = `
        <div id="customerSearchModal" class="modal-overlay adaptive-modal hidden">
            <div class="customer-search-panel">
                
                <!-- Header -->
                <div class="modal-header">
                    <div class="flex justify-between items-center">
                        <h2 class="text-2xl font-bold" data-translate="customer_search.title">
                            🔍 Find Customer
                        </h2>
                        <button class="modal-close-btn" onclick="closeCustomerSearchModal()">
                            &times;
                        </button>
                    </div>
                    <p class="subtitle" data-translate="customer_search.subtitle">
                        Search across all sales and receipts
                    </p>
                </div>

                <!-- Body -->
                <div class="modal-body">
                    <!-- Search -->
                    <div class="relative mb-6">
                        <input
                            type="text"
                            id="customerSearchInput"
                            placeholder="${translate('customer_search.placeholder')}"
                            class="search-input"
                            onkeyup="searchCustomers(this.value)"
                        >
                        <span class="search-icon">🔍</span>
                        <button onclick="clearCustomerSearch()" class="clear-btn">✕</button>
                    </div>

                    <!-- Results -->
                    <div id="customerSearchResults" class="results-area">
                        <div class="text-center text-gray-500 py-10" data-translate="customer_search.start_typing">
                            Start typing to search for customers
                        </div>
                    </div>

                    <!-- Scan -->
                    <div class="scan-area">
                        <button onclick="scanAllCustomers()" class="scan-btn" data-translate="customer_search.scan_all">
                            🔄 Scan All Customer Names
                        </button>
                        <p class="scan-desc" data-translate="customer_search.scan_all_desc">
                            This will scan through all sales, credit sales, and receipts
                        </p>
                    </div>
                </div>

            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // Show with adaptive animation
    requestAnimationFrame(() => {
        const modal = document.getElementById('customerSearchModal');
        modal.classList.remove('hidden');
        modal.classList.add('show');
    });

    setTimeout(() => {
        document.getElementById('customerSearchInput')?.focus();
        if (typeof translateUI === 'function') translateUI();
    }, 150);
}


async function searchCustomers(query) {
    const resultsDiv = document.getElementById('customerSearchResults');
    
    if (query.length < 2) {
        resultsDiv.innerHTML = `
            <div class="text-center text-gray-500 py-10" data-translate="customer_search.type_min_chars">
                Type at least 2 characters to search
            </div>
        `;
        return;
    }
    
    // Show loading
    resultsDiv.innerHTML = `
        <div class="text-center py-8">
            <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p class="text-gray-500 mt-2" data-translate="searching">Searching...</p>
        </div>
    `;
    
    try {
        const response = await fetch(`${API_BASE}/api/customers/search/${encodeURIComponent(query)}`);
        const data = await response.json();
        
        if (!data.success || data.customers.length === 0) {
            resultsDiv.innerHTML = `
                <div class="text-center text-gray-500 py-10" data-translate="customer_search.no_results" data-translate-value="${query}">
                    No customers found for "${query}"
                </div>
            `;
            return;
        }
        
        let resultsHTML = `
            <div class="mb-4 text-sm text-gray-600" data-translate="customer_search.found_results" data-translate-value="${data.customers.length}">
                Found ${data.customers.length} customers
            </div>
            <div class="space-y-2">
        `;
        
    data.customers.forEach(customer => {
        resultsHTML += `
            <div class="flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-lg cursor-pointer transition-colors" 
                 onclick="openCustomerTransactionsModal('${customer.name.replace(/'/g, "\\'")}')">
                <div class="flex items-center">
                    <div class="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                        👤
                    </div>
                    <div>
                        <div class="font-medium text-gray-900">${customer.name}</div>
                        ${customer.phone ? `
                        <div class="text-xs text-gray-500">📞 ${customer.phone}</div>
                        ` : `
                        <div class="text-xs text-gray-500" data-translate="customer_search.click_to_view">Click to view transactions</div>
                        `}
                    </div>
                </div>
                <div class="text-gray-400">
                    →
                </div>
            </div>
        `;
    });

        
        resultsHTML += `</div>`;
        resultsDiv.innerHTML = resultsHTML;
        
    } catch (error) {
        console.error('Error searching customers:', error);
        resultsDiv.innerHTML = `
            <div class="text-center text-red-500 py-10" data-translate="customer_search.error" data-translate-value="${error.message}">
                Error searching: ${error.message}
            </div>
        `;
    }
}

async function scanAllCustomers() {
    const resultsDiv = document.getElementById('customerSearchResults');
    
    resultsDiv.innerHTML = `
        <div class="text-center py-8">
            <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p class="text-gray-500 mt-2" data-translate="customer_search.scanning">Scanning all data files for customers...</p>
        </div>
    `;
    
    try {
        const response = await fetch(`${API_BASE}/api/customers/scan-all`);
        const data = await response.json();
        
        if (!data.success) {
            resultsDiv.innerHTML = `
                <div class="text-center text-red-500 py-10" data-translate="customer_search.scan_error" data-translate-value="${data.error}">
                    Failed to scan: ${data.error}
                </div>
            `;
            return;
        }
        
        if (data.customers.length === 0) {
            resultsDiv.innerHTML = `
                <div class="text-center text-gray-500 py-10" data-translate="customer_search.no_customers_found">
                    No customers found in any data files
                </div>
            `;
            return;
        }
        
        let resultsHTML = `
            <div class="mb-4 flex justify-between items-center">
                <div class="text-sm text-gray-600" data-translate="unique_customers" data-translate-value="${data.customers.length}">
                    Found ${data.customers.length} unique customers
                </div>
                <button onclick="exportAllCustomers()" class="text-xs bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700" data-translate="customer_search.export_all">
                    📥 Export All
                </button>
            </div>
            <div class="space-y-2 max-h-[30vh] overflow-y-auto">
        `;
        
    data.customers.forEach(customer => {
            resultsHTML += `
                <div class="flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-lg cursor-pointer transition-colors" 
                    onclick="openCustomerTransactionsModal('${customer.name.replace(/'/g, "\\'")}')">
                    <div class="flex items-center">
                        <div class="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                            👤
                        </div>
                        <div>
                            <div class="font-medium text-gray-900">${customer.name}</div>
                            ${customer.phone ? `
                            <div class="text-xs text-gray-500">📞 ${customer.phone}</div>
                            ` : ''}
                        </div>
                    </div>
                    <div class="text-gray-400">
                        →
                    </div>
                </div>
            `;
        });
        
        resultsHTML += `</div>`;
        resultsDiv.innerHTML = resultsHTML;
        
        // Store all customers globally for export
        window.allCustomersList = data.customers;
        
    } catch (error) {
        console.error('Error scanning all customers:', error);
        resultsDiv.innerHTML = `
            <div class="text-center text-red-500 py-10" data-translate="customer_search.scan_error" data-translate-value="${error.message}">
                Error: ${error.message}
            </div>
        `;
    }
}

function exportAllCustomers() {
    if (!window.allCustomersList || window.allCustomersList.length === 0) {
        showMessageModal(translate('customer_search.no_customers_export'));
        return;
    }
    
    // Create CSV with phone numbers
    let csvContent = `${translate('customer_search.csv_header')},Phone\n`;
    window.allCustomersList.forEach(customer => {
        csvContent += `"${customer.name}","${customer.phone || ''}"\n`;
    });
    
    // Download
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `all_customers_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    showMessageModal(translate('customer_search.export_success', { count: window.allCustomersList.length }), 'success');
}


function clearCustomerSearch() {
    document.getElementById('customerSearchInput').value = '';
    searchCustomers('');
}

function closeCustomerSearchModal() {
    const modal = document.getElementById('customerSearchModal');
    if (modal) {
        modal.remove();
    }
    window.allCustomersList = null;
}



let suggestionTimeout;
function showCustomerNameSuggestions() {
    clearTimeout(suggestionTimeout);
    const input = document.getElementById('saleCustomerName23');
    const container = document.getElementById('customerNameSuggestions');
    if (!input || !container) return;

    const query = input.value.trim();
    if (query.length < 2) {  // optional: only search after 2 characters
        container.classList.add('hidden');
        return;
    }

    // Show a loading indicator inside the suggestions box
    container.innerHTML = '<div class="p-2 text-gray-500" data-translate="searching">Searching...</div>';
    container.classList.remove('hidden');

    // Debounce: wait 300ms after last keystroke
    suggestionTimeout = setTimeout(async () => {
        try {
            const response = await fetch(`${API_BASE}/api/customers/search/${encodeURIComponent(query)}`);
            const data = await response.json();

            if (!data.success || !data.customers || data.customers.length === 0) {
                return;
            }

            // Build suggestions from the returned customers (extract only names)
            let suggestionsHtml = '';
            data.customers.forEach(customer => {
                // Assuming each customer has a 'name' property
                const name = customer.name || '';
                if (name.toLowerCase().includes(query.toLowerCase())) {
                    suggestionsHtml += `
                        <div class="autocomplete-suggestion-item p-2 hover:bg-gray-100 cursor-pointer" 
                             data-name="${name.replace(/"/g, '&quot;')}">
                            ${name}
                        </div>
                    `;
                }
            });

            if (suggestionsHtml) {
                container.innerHTML = suggestionsHtml;

                // Attach click event to each suggestion item
                container.querySelectorAll('.autocomplete-suggestion-item').forEach(item => {
                    item.addEventListener('click', () => {
                        input.value = item.dataset.name;
                        container.classList.add('hidden');
                    });
                });
            } else {
                container.innerHTML = '<div class="p-2 text-gray-500">maybe a new customer</div>';
            }
        } catch (error) {
            console.error('Error fetching customer suggestions:', error);
            container.innerHTML = '<div class="p-2 text-red-500">Error loading suggestions</div>';
        }
    }, 300); // 300ms delay
}

// Close suggestions when clicking outside (keep as is)
document.addEventListener('click', (event) => {
    const input = document.getElementById('saleCustomerName23');
    const container = document.getElementById('customerNameSuggestions');
    if (input && container) {
        if (!input.contains(event.target) && !container.contains(event.target)) {
            container.classList.add('hidden');
        }
    }
});

// Close customer suggestions when clicking outside
document.addEventListener('click', (event) => {
    const saleCustomerName23Input = document.getElementById('saleCustomerName23');
    const customerSuggestionsContainer = document.getElementById('customerNameSuggestions');
    
    if (saleCustomerName23Input && customerSuggestionsContainer) {
        if (!saleCustomerName23Input.contains(event.target) && !customerSuggestionsContainer.contains(event.target)) {
            customerSuggestionsContainer.classList.add('hidden');
        }
    }
});