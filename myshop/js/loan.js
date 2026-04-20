// ================================
// LOAN MANAGEMENT FUNCTIONALITY
// ================================

// DOM Elements
let loans = [];
let currentLoanFilters = {
    borrower: '',
    status: 'All',
    type: 'All'
};

// Initialize Loan Management
function initializeLoanManagement() {
    // Event Listeners
    document.getElementById('loanManagementBtn')?.addEventListener('click', showLoanManagement);
    document.getElementById('newLoanBtn')?.addEventListener('click', showNewLoanModal);
    document.getElementById('applyLoanFilterBtn')?.addEventListener('click', applyLoanFilters);
    document.getElementById('clearLoanFiltersBtn')?.addEventListener('click', clearLoanFilters);
  
    document.getElementById('loanAnalyticsBtn')?.addEventListener('click', toggleLoanAnalytics);
    document.getElementById('exportLoansExcelBtn')?.addEventListener('click', exportLoansToExcel);
    
    // Form submissions
    document.getElementById('newLoanForm')?.addEventListener('submit', issueNewLoan);
    document.getElementById('recordRepaymentForm')?.addEventListener('submit', recordRepayment);
    
    // Load loans on section show
    document.getElementById('loanManagementBtn')?.addEventListener('click', loadLoans);
}

// Show Loan Management Section
function showLoanManagement() {
    document.title = "StockApp* -> managing loans";
    // Hide other sections
    stockOptionsModal.classList.add('hidden');
    
    // Show loan section
    const loanSection = document.getElementById('loanManagementSection');
    if (loanSection) {
        loanSection.classList.remove('hidden');
        
        // Load loans
        loadLoans();
    }
}

// Apply Loan Filters
function applyLoanFilters() {
    const borrowerFilter = document.getElementById('loanBorrowerFilter').value.toLowerCase();
    const statusFilter = document.getElementById('loanStatusFilter').value;
    const typeFilter = document.getElementById('loanTypeFilter').value;
    
    currentLoanFilters = {
        borrower: borrowerFilter,
        status: statusFilter,
        type: typeFilter
    };
    
    let filteredLoans = [...loans];
    
    // Apply filters
    if (borrowerFilter) {
        filteredLoans = filteredLoans.filter(loan => 
            loan.borrowerName && loan.borrowerName.toLowerCase().includes(borrowerFilter) ||
            (loan.borrowerContact && loan.borrowerContact.toLowerCase().includes(borrowerFilter))
        );
    }
    
    if (statusFilter !== 'All') {
        filteredLoans = filteredLoans.filter(loan => loan.status === statusFilter);
    }
    
    if (typeFilter !== 'All') {
        filteredLoans = filteredLoans.filter(loan => loan.loanType === typeFilter);
    }
    
    // Update status for overdue loans
    filteredLoans.forEach(loan => {
        if (loan.status === 'Active' && loan.dueDate && new Date(loan.dueDate) < new Date()) {
            loan.status = 'Overdue';
        }
    });
    
    // Render filtered loans
    renderLoansTable(filteredLoans);
}

// Clear Loan Filters
function clearLoanFilters() {
    document.getElementById('loanBorrowerFilter').value = '';
    document.getElementById('loanStatusFilter').value = 'All';
    document.getElementById('loanTypeFilter').value = 'All';
    
    applyLoanFilters();
}

// Render Loans Table
function renderLoansTable(loanList) {
    console.log(translate('rendering_loans'), loanList);
    
    const tbody = document.getElementById('loansTableBody');
    const noLoansMessage = document.getElementById('noLoansMessage');
    
    if (!tbody) {
        console.error(translate('table_body_not_found'));
        return;
    }
    
    tbody.innerHTML = '';
    
    if (!loanList || loanList.length === 0) {
        console.log(translate('no_loans_to_display'));
        if (noLoansMessage) noLoansMessage.classList.remove('hidden');
        return;
    }
    
    if (noLoansMessage) noLoansMessage.classList.add('hidden');
    
    loanList.forEach((loan, index) => {
        console.log(translate('processing_loan'), loan);
        
        // Validate required fields
        if (!loan.loanAmount || !loan.borrowerName) {
            console.warn(translate('skipping_invalid_loan'), loan);
            return;
        }
        
        const row = document.createElement('tr');
        
        // Calculate values with defaults
        const interestRate = loan.interestRate || 0;
        const totalPayable = loan.loanAmount * (1 + (interestRate / 100));
        const amountPaid = (loan.repayments || []).reduce((sum, repayment) => sum + (repayment.amount || 0), 0);
        const balance = totalPayable - amountPaid;
        
        const isOverdue = loan.status === 'Active' && loan.dueDate && new Date(loan.dueDate) < new Date();
        const statusClass = getLoanStatusClass(loan.status || 'Active');
        
        // Format dates
        const issueDate = formatDate(loan.issueDate);
        const dueDate = formatDate(loan.dueDate);
        
        // Check if overdue
        const currentStatus = isOverdue ? 'Overdue' : (loan.status || 'Active');
        
        row.innerHTML = `
            <td class="py-3 px-6">${loan.loanId || `${translate('loan')}-${String(index + 1).padStart(4, '0')}`}</td>
            <td class="py-3 px-6">
                <div class="font-semibold">${loan.borrowerName || translate('unknown')}</div>
                ${loan.borrowerContact ? `<div class="text-xs text-gray-500">${loan.borrowerContact}</div>` : ''}
            </td>
            <td class="py-3 px-6">${loan.loanType || translate('personal')}</td>
            <td class="py-3 px-6 text-center font-bold">${formatCurrency(loan.loanAmount)}</td>
            <td class="py-3 px-6 text-center">${interestRate}%</td>
            <td class="py-3 px-6 text-center font-bold">${formatCurrency(totalPayable)}</td>
            <td class="py-3 px-6 text-center">${issueDate}</td>
            <td class="py-3 px-6 text-center ${isOverdue ? 'text-red-600 font-bold' : ''}">${dueDate}</td>
            <td class="py-3 px-6 text-center text-green-600 font-bold">${formatCurrency(amountPaid)}</td>
            <td class="py-3 px-6 text-center font-bold ${balance > 0 ? 'text-red-600' : 'text-green-600'}">
                ${formatCurrency(balance)}
            </td>
            <td class="py-3 px-6 text-center">
                <span class="px-2 py-1 rounded-full text-xs font-bold ${statusClass}">
                    ${translate(currentStatus.toLowerCase())}
                </span>
            </td>
            <td class="py-3 px-6 text-center">
                <div class="flex flex-col space-y-1">
                    ${balance > 0 ? `
                        <button onclick="showRecordRepayment('${loan.id || index}')" 
                                class="bg-blue-500 hover:bg-blue-600 text-white text-xs px-2 py-1 rounded">
                            ${translate('record_payment')}
                        </button>
                    ` : ''}
                    
                    <button onclick="viewRepaymentHistory('${loan.id || index}')" 
                            class="bg-gray-500 hover:bg-gray-600 text-white text-xs px-2 py-1 rounded">
                        ${translate('view_history')}
                    </button>
                    
                    <button onclick="generateLoanReceipt('${loan.id || index}')" 
                            class="bg-green-500 hover:bg-green-600 text-white text-xs px-2 py-1 rounded">
                        ${translate('receipt')}
                    </button>
                    
                    ${loan.status === 'Active' ? `
                        <button onclick="markLoanAsPaid('${loan.id || index}')" 
                                class="bg-purple-500 hover:bg-purple-600 text-white text-xs px-2 py-1 rounded">
                            ${translate('mark_paid')}
                        </button>
                    ` : ''}
                </div>
            </td>
        `;
        
        // Add overdue highlighting
        if (isOverdue) {
            row.classList.add('bg-red-50', 'dark:bg-red-900/20');
        }
        
        tbody.appendChild(row);
    });
    
    console.log(translate('table_rendered_with'), loanList.length, translate('loans'));
}

// Update Loan Statistics
function updateLoanStats() {
    const totalLoans = loans.length;
    const activeLoans = loans.filter(loan => loan.status === 'Active').length;
    const overdueLoans = loans.filter(loan => 
        loan.status === 'Active' && loan.dueDate && new Date(loan.dueDate) < new Date()
    ).length;
    
    const totalAmount = loans.reduce((sum, loan) => sum + (loan.loanAmount || 0), 0);
    const activeAmount = loans
        .filter(loan => loan.status === 'Active')
        .reduce((sum, loan) => sum + (loan.loanAmount || 0), 0);
    
    const overdueAmount = loans
        .filter(loan => loan.status === 'Active' && loan.dueDate && new Date(loan.dueDate) < new Date())
        .reduce((sum, loan) => sum + (loan.loanAmount || 0), 0);
    
    const totalPaid = loans.reduce((sum, loan) => {
        const repayments = loan.repayments || [];
        return sum + repayments.reduce((repSum, rep) => repSum + (rep.amount || 0), 0);
    }, 0);
    
    const recoveryRate = totalAmount > 0 ? Math.round((totalPaid / totalAmount) * 100) : 0;
    
    // Update UI
    document.getElementById('totalLoansCount').textContent = totalLoans;
    document.getElementById('totalLoansAmount').textContent = `${formatCurrency(totalAmount)}`;
    
    document.getElementById('activeLoansCount').textContent = activeLoans;
    document.getElementById('activeLoansAmount').textContent = `${formatCurrency(activeAmount)}`;
    
    document.getElementById('overdueLoansCount').textContent = overdueLoans;
    document.getElementById('overdueLoansAmount').textContent = `${formatCurrency(overdueAmount)}`;
    
    document.getElementById('recoveryRate').textContent = `${recoveryRate}%`;
}

function showNewLoanModal() {
    const modal = document.getElementById('newLoanModal');
    if (modal) {
        // Set default dates
        document.getElementById('loanIssueDate').valueAsDate = new Date();
        
        const dueDate = new Date();
        dueDate.setMonth(dueDate.getMonth() + 1);
        document.getElementById('loanDueDate').valueAsDate = dueDate;
        
        modal.classList.remove('hidden');
    }
}

// Close New Loan Modal
function closeNewLoanModal() {
    document.getElementById('newLoanModal').classList.add('hidden');
    document.getElementById('newLoanForm').reset();
}

// Issue New Loan
async function issueNewLoan(event) {
    event.preventDefault();
    
     try {
        const borrowerName = document.getElementById('loanBorrowerName').value;
        const borrowerContact = document.getElementById('loanBorrowerContact').value;
        const loanType = document.getElementById('loanType').value;
        const loanAmount = parseFloat(document.getElementById('loanAmount').value);
        const interestRate = parseFloat(document.getElementById('loanInterestRate').value);
        const issueDate = document.getElementById('loanIssueDate').value;
        const dueDate = document.getElementById('loanDueDate').value;
        const purpose = document.getElementById('loanPurpose').value;
        const linkToExpense = document.getElementById('linkToExpense').checked;
        
        // VALIDATION - Add this check:
        if (!borrowerName || !loanType || !loanAmount || !issueDate || !dueDate) {
            showMessageModal(translate('please_fill_all_fields'), 'error');
            return;
        }
        
        if (loanAmount <= 0) {
            showMessageModal(translate('loan_amount_greater_than_zero'), 'error');
            return;
        }
        
        if (new Date(dueDate) <= new Date(issueDate)) {
            showMessageModal(translate('due_date_after_issue_date'), 'error');
            return;
        }
        
        // Create loan object - ensure loanType has a value
        const newLoan = {
            id: generateId(),
            loanId: `${translate('loan')}-${String(loans.length + 1).padStart(4, '0')}`,
            borrowerName,
            borrowerContact,
            loanType: loanType || translate('personal'),
            loanAmount,
            interestRate,
            issueDate,
            dueDate,
            purpose,
            status: 'Active',
            repayments: [],
            createdAt: new Date().toLocaleString(),
            createdBy: getCurrentUser().username
        };

        // Link to expense if requested
        if (linkToExpense) {
            await createLoanExpense(newLoan);
        }
        
        // Save to server
        const currentUser = getCurrentUser();
        const response = await fetch(`${API_BASE}/api/loans`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(newLoan)
        });
        
        if (response.ok) {
            // Add to local array
            loans.push(newLoan);
            
            // Save to localStorage as backup
            saveLoansToLocalStorage();
            
            // Update UI
            applyLoanFilters();
            updateLoanStats();
            
            // Show success
            closeNewLoanModal();
            showMessageModal(translate('loan_issued_successfully'), 'success');
            
            // Generate receipt
            generateLoanReceipt(newLoan.id);
        } else {
            throw new Error(translate('failed_to_save_loan'));
        }
        
    } catch (error) {
        console.error(translate('error_issuing_loan'), error);
        showMessageModal(translate('error_issuing_loan'), 'error');
    }
}

// Create Loan Expense Record
async function createLoanExpense(loan) {
    try {
        const expense = {
            id: generateId(),
            description: `${translate('loan_to')} ${loan.borrowerName} - ${loan.loanType}`,
            amount: loan.loanAmount,
            category: translate('loan_issuance'),
            date: loan.issueDate,
            notes: `${translate('loan_id')}: ${loan.loanId}, ${translate('interest_rate')}: ${loan.interestRate}%, ${translate('due')}: ${loan.dueDate}`,
            type: 'loan',
            loanId: loan.id,
            createdAt: new Date().toLocaleString(),
            createdBy: getCurrentUser().username
        };
        
        // Save expense to server
        const currentUser = getCurrentUser();
        await fetch(`${API_BASE}/api/expenses`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(expense)
        });
        
        // Also save to local expenses
        const expenses = JSON.parse(localStorage.getItem('expenses') || '[]');
        expenses.push(expense);
        localStorage.setItem('expenses', JSON.stringify(expenses));
        
    } catch (error) {
        console.error(translate('error_creating_loan_expense'), error);
    }
}

// Show Record Repayment Modal
function showRecordRepayment(loanId) {
    const loan = loans.find(l => l.id === loanId);
    if (!loan) return;
    
    // Calculate balance
    const totalPayable = loan.loanAmount * (1 + (loan.interestRate / 100));
    const amountPaid = loan.repayments?.reduce((sum, repayment) => sum + repayment.amount, 0) || 0;
    const balance = totalPayable - amountPaid;
    
    // Set modal values
    document.getElementById('repaymentLoanId').value = loanId;
    document.getElementById('repaymentBorrowerName').textContent = loan.borrowerName;
    document.getElementById('repaymentLoanBalance').textContent = formatCurrency(balance);
    document.getElementById('repaymentDate').valueAsDate = new Date();
    document.getElementById('repaymentAmount').max = balance;
    
    // Show modal
    document.getElementById('recordRepaymentModal').classList.remove('hidden');
}

// Close Record Repayment Modal
function closeRecordRepaymentModal() {
    document.getElementById('recordRepaymentModal').classList.add('hidden');
    document.getElementById('recordRepaymentForm').reset();
}

// Record Repayment
async function recordRepayment(event) {
    event.preventDefault();
    
    try {
        const loanId = document.getElementById('repaymentLoanId').value;
        const amount = parseFloat(document.getElementById('repaymentAmount').value);
        const date = document.getElementById('repaymentDate').value;
        const method = document.getElementById('repaymentMethod').value;
        const notes = document.getElementById('repaymentNotes').value;
        
        // Find loan
        const loan = loans.find(l => l.id === loanId);
        if (!loan) {
            showMessageModal(translate('loan_not_found'), 'error');
            return;
        }
        
        // Validate amount
        const totalPayable = loan.loanAmount * (1 + (loan.interestRate / 100));
        const amountPaid = loan.repayments?.reduce((sum, repayment) => sum + repayment.amount, 0) || 0;
        const balance = totalPayable - amountPaid;
        
        if (amount <= 0) {
            showMessageModal(translate('amount_must_be_greater_than_zero'), 'error');
            return;
        }
        
        if (amount > balance) {
            showMessageModal(`${translate('amount_cannot_exceed_balance')} ${formatCurrency(balance)}`, 'error');
            return;
        }
        
        // Create repayment record
        const repayment = {
            id: generateId(),
            loanId,
            amount,
            date,
            method,
            notes,
            recordedBy: getCurrentUser().username,
            recordedAt: new Date().toISOString()
        };
        
        // Add to loan
        if (!loan.repayments) loan.repayments = [];
        loan.repayments.push(repayment);
        
        // Update loan status if fully paid
        const newAmountPaid = amountPaid + amount;
        if (Math.abs(newAmountPaid - totalPayable) < 0.01) {
            loan.status = 'Paid';
            loan.paidDate = date;
        }
        
        // Save to server
        const currentUser = getCurrentUser();
        const response = await fetch(`${API_BASE}/api/loans/${loanId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(loan) // Send the updated loan with new repayment
        });
                
        if (response.ok) {
            // Save to localStorage
            saveLoansToLocalStorage();
            
            // Update UI
            applyLoanFilters();
            updateLoanStats();
            
            // Show success
            closeRecordRepaymentModal();
            showMessageModal(translate('repayment_recorded_successfully'), 'success');
            
            // Create sales record for repayment (optional)
            await createRepaymentSale(loan, repayment);
        } else {
            throw new Error(translate('failed_to_save_repayment'));
        }
        
    } catch (error) {
        console.error(translate('error_recording_repayment'), error);
        showMessageModal(translate('error_recording_repayment'), 'error');
    }
}

// Create Sales Record for Repayment
async function createRepaymentSale(loan, repayment) {
    try {
        const sale = {
            id: generateId(),
            productName: `${translate('loan_repayment')} - ${loan.borrowerName}`,
            type: 'service',
            quantity: 1,
            price: repayment.amount,
            total: repayment.amount,
            paymentType: repayment.method,
            saleDate: repayment.date,
            customerName: loan.borrowerName,
            notes: `${translate('loan_id')}: ${loan.loanId}, ${translate('repayment')}`,
            isLoanRepayment: true,
            loanId: loan.id,
            createdAt: new Date().toLocaleString(),
            createdBy: getCurrentUser().username
        };
        
        // Save to server
        const currentUser = getCurrentUser();
        await fetch(`${API_BASE}/api/sales`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(sale)
        });
        
    } catch (error) {
        console.error(translate('error_creating_repayment_sale'), error);
    }
}

// View Repayment History
function viewRepaymentHistory(loanId) {
    const loan = loans.find(l => l.id === loanId);
    if (!loan) return;
    
    // Set modal header
    document.getElementById('historyBorrowerName').textContent = loan.borrowerName;
    document.getElementById('historyLoanId').textContent = loan.loanId;
    
    // Get repayments
    const repayments = loan.repayments || [];
    
    // Render table
    const tbody = document.getElementById('repaymentHistoryTableBody');
    tbody.innerHTML = '';
    
    if (repayments.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="py-4 text-center text-gray-500">
                    ${translate('no_repayments_found')}
                </td>
            </tr>
        `;
    } else {
        let runningBalance = loan.loanAmount * (1 + (loan.interestRate / 100));
        
        repayments.sort((a, b) => new Date(a.date) - new Date(b.date)).forEach(repayment => {
            runningBalance -= repayment.amount;
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td class="py-2 px-4">${formatDate(repayment.date)}</td>
                <td class="py-2 px-4 font-bold">${formatCurrency(repayment.amount)}</td>
                <td class="py-2 px-4">${translate(repayment.method?.toLowerCase() || 'cash')}</td>
                <td class="py-2 px-4 ${runningBalance > 0 ? 'text-red-600' : 'text-green-600'}">
                    ${formatCurrency(runningBalance)}
                </td>
                <td class="py-2 px-4 text-sm">${repayment.notes || '-'}</td>
            `;
            tbody.appendChild(row);
        });
    }
    
    // Show modal
    document.getElementById('repaymentHistoryModal').classList.remove('hidden');
}

// Close Repayment History Modal
function closeRepaymentHistoryModal() {
    document.getElementById('repaymentHistoryModal').classList.add('hidden');
}

// Mark Loan as Paid
async function markLoanAsPaid(loanId) {
    if (!confirm(translate('confirm_mark_paid'))) return;
    
    try {
        const loan = loans.find(l => l.id === loanId);
        if (!loan) return;
        
        // Calculate total payable
        const totalPayable = loan.loanAmount * (1 + (loan.interestRate / 100));
        const amountPaid = loan.repayments?.reduce((sum, repayment) => sum + repayment.amount, 0) || 0;
        const balance = totalPayable - amountPaid;
        
        // If there's a balance, create a final repayment
        if (balance > 0) {
            const finalRepayment = {
                id: generateId(),
                loanId,
                amount: balance,
                date: new Date().toISOString().split('T')[0],
                method: translate('adjustment'),
                notes: translate('final_settlement_marked_paid'),
                recordedBy: getCurrentUser().username,
                recordedAt: new Date().toISOString()
            };
            
            if (!loan.repayments) loan.repayments = [];
            loan.repayments.push(finalRepayment);
        }
        
        // Update loan status
        loan.status = 'Paid';
        loan.paidDate = new Date().toISOString().split('T')[0];
        
        // Save to server
        const currentUser = getCurrentUser();
        const response = await fetch(`${API_BASE}/api/loans/${loanId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(loan)
        });
        
        if (response.ok) {
            // Save to localStorage
            saveLoansToLocalStorage();
            
            // Update UI
            applyLoanFilters();
            updateLoanStats();
            
            showMessageModal(translate('loan_marked_as_paid'), 'success');
        } else {
            throw new Error(translate('failed_to_update_loan'));
        }
        
    } catch (error) {
        console.error(translate('error_marking_loan_paid'), error);
        showMessageModal(translate('error_updating_loan'), 'error');
    }
}

// Generate Loan Receipt
function generateLoanReceipt(loanId) {
    const loan = loans.find(l => l.id === loanId);
    if (!loan) {
        console.error(translate('loan_not_found_with_id'), loanId);
        return;
    }
    
    // Check if modal exists
    const modal = document.getElementById('loanReceiptModal');
    if (!modal) {
        console.error(translate('loan_receipt_modal_not_found'));
        return;
    }
    
    // Helper function to safely set text content
    function setTextContent(elementId, text) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = text;
        } else {
            console.warn(`${translate('element_with_id_not_found')} '${elementId}'`);
        }
        return element; // Return element for chaining if needed
    }
    
    // Calculate values
    const totalPayable = loan.loanAmount * (1 + (loan.interestRate / 100));
    const amountPaid = loan.repayments?.reduce((sum, repayment) => sum + repayment.amount, 0) || 0;
    const balance = totalPayable - amountPaid;
    
    // Set receipt values with null checks
    setTextContent('receiptLoanId', loan.loanId || translate('not_available'));
    setTextContent('receiptIssueDate', formatDate(loan.issueDate) || translate('not_available'));
    setTextContent('receiptDueDate', formatDate(loan.dueDate) || translate('not_available'));
    setTextContent('receiptAgreementDate', formatDate(new Date().toISOString()) || translate('not_available'));
    
    const storedName = localStorage.getItem('businessName');
    setTextContent('receiptLenderName', storedName !== null ? storedName : translate('business_owner'));
    
    setTextContent('receiptBorrowerName', loan.borrowerName || translate('not_available'));
    setTextContent('receiptBorrowerContact', loan.borrowerContact || '-');
    setTextContent('receiptPrincipalAmount', formatCurrency(loan.loanAmount) || '0.00');
    setTextContent('receiptInterestRate', loan.interestRate || '0');
    setTextContent('receiptTotalPayable', formatCurrency(totalPayable) || '0.00');
    setTextContent('receiptLoanType', loan.loanType || translate('personal'));
    setTextContent('receiptBorrowerDate', formatDate(new Date().toISOString()) || translate('not_available'));
    setTextContent('receiptLenderDate', formatDate(new Date().toISOString()) || translate('not_available'));
    
    // Generate repayment schedule
    const repaymentSchedule = document.getElementById('receiptRepaymentSchedule');
    const repayments = loan.repayments || [];
    
    if (repaymentSchedule) {
        if (repayments.length === 0) {
            repaymentSchedule.innerHTML = `
                <div class="mb-2">
                    <strong>${translate('full_payment_due')}:</strong> ${formatDate(loan.dueDate) || translate('not_available')}
                </div>
                <div>
                    <strong>${translate('amount_due')}:</strong> ${formatCurrency(totalPayable) || '0.00'}
                </div>
            `;
        } else {
            let scheduleHTML = '<div class="space-y-1">';
            let remaining = totalPayable;
            
            // Sort repayments by date
            repayments.sort((a, b) => new Date(a.date) - new Date(b.date)).forEach(repayment => {
                remaining -= repayment.amount || 0;
                scheduleHTML += `
                    <div class="flex justify-between">
                        <span>${formatDate(repayment.date) || translate('not_available')}</span>
                        <span>${formatCurrency(repayment.amount) || '0.00'}</span>
                        <span>${formatCurrency(remaining) || '0.00'}</span>
                    </div>
                `;
            });
            
            if (remaining > 0) {
                scheduleHTML += `
                    <div class="flex justify-between font-bold">
                        <span>${translate('remaining_balance')}:</span>
                        <span>${formatCurrency(balance) || '0.00'}</span>
                    </div>
                `;
            }
            
            scheduleHTML += '</div>';
            repaymentSchedule.innerHTML = scheduleHTML;
        }
    } else {
        console.warn(`${translate('element_with_id_not_found')} "receiptRepaymentSchedule"`);
    }
    
    // Show modal
    modal.classList.remove('hidden');
}

function closeLoanReceiptModal() {
    document.getElementById('loanReceiptModal').classList.add('hidden');
}

// Toggle Loan Analytics
function toggleLoanAnalytics() {
    const analyticsSection = document.getElementById('loanAnalyticsSection');
    const isHidden = analyticsSection.classList.contains('hidden');
    
    analyticsSection.classList.toggle('hidden');
    
    if (isHidden) {
        generateLoanAnalytics();
    }
}

const closeLoanAnalyticsBtn = document.getElementById('closeLoanAnalyticsBtn');
const loanAnalyticsSection = document.getElementById('loanAnalyticsSection');

// Close button click handler
if (closeLoanAnalyticsBtn) {
    closeLoanAnalyticsBtn.addEventListener('click', function() {
        // Destroy all charts before hiding
        const chartIds = ['loanTypeChart', 'loanStatusChart', 'monthlyLoanChart'];
        chartIds.forEach(chartId => {
            const chart = Chart.getChart(chartId);
            if (chart) {
                chart.destroy();
            }
        });
        
        loanAnalyticsSection.classList.add('hidden');
    });
}

// Also update the Escape key handler
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && loanAnalyticsSection && !loanAnalyticsSection.classList.contains('hidden')) {
        // Destroy all charts before hiding
        const chartIds = ['loanTypeChart', 'loanStatusChart', 'monthlyLoanChart'];
        chartIds.forEach(chartId => {
            const chart = Chart.getChart(chartId);
            if (chart) {
                chart.destroy();
            }
        });
        
        loanAnalyticsSection.classList.add('hidden');
    }
});

// Generate Loan Analytics
function generateLoanAnalytics() {
    if (!loans || loans.length === 0) return;
    
    // Destroy existing charts first
    const chartIds = ['loanTypeChart', 'loanStatusChart', 'monthlyLoanChart'];
    chartIds.forEach(chartId => {
        const chart = Chart.getChart(chartId);
        if (chart) {
            chart.destroy();
        }
    });
    
    // Loan Type Distribution
    const typeCounts = {};
    loans.forEach(loan => {
        const loanType = loan.loanType || translate('unknown');
        typeCounts[loanType] = (typeCounts[loanType] || 0) + 1;
    });
    
    const typeChartCtx = document.getElementById('loanTypeChart')?.getContext('2d');
    if (typeChartCtx) {
        new Chart(typeChartCtx, {
            type: 'doughnut',
            data: {
                labels: Object.keys(typeCounts).map(key => translate(key.toLowerCase())),
                datasets: [{
                    data: Object.values(typeCounts),
                    backgroundColor: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6']
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }
    
    // Loan Status Distribution
    const statusCounts = {
        Active: loans.filter(l => l.status === 'Active' && l.dueDate && new Date(l.dueDate) >= new Date()).length,
        Overdue: loans.filter(l => l.status === 'Active' && l.dueDate && new Date(l.dueDate) < new Date()).length,
        Paid: loans.filter(l => l.status === 'Paid').length,
        Defaulted: loans.filter(l => l.status === 'Defaulted').length
    };
    
    const statusChartCtx = document.getElementById('loanStatusChart')?.getContext('2d');
    if (statusChartCtx) {
        new Chart(statusChartCtx, {
            type: 'pie',
            data: {
                labels: Object.keys(statusCounts).map(key => translate(key.toLowerCase())),
                datasets: [{
                    data: Object.values(statusCounts),
                    backgroundColor: ['#3B82F6', '#EF4444', '#10B981', '#6B7280']
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }
    
    // Monthly Loan Issuance - FIXED: Check for issueDate existence
    const monthlyData = {};
    loans.forEach(loan => {
        if (loan.issueDate) {
            const month = loan.issueDate.substring(0, 7); // YYYY-MM
            monthlyData[month] = (monthlyData[month] || 0) + (loan.loanAmount || 0);
        }
    });
    
    const sortedMonths = Object.keys(monthlyData).sort();
    const last12Months = sortedMonths.slice(-12);
    
    const monthlyChartCtx = document.getElementById('monthlyLoanChart')?.getContext('2d');
    if (monthlyChartCtx) {
        new Chart(monthlyChartCtx, {
            type: 'bar',
            data: {
                labels: last12Months,
                datasets: [{
                    label: translate('loan_amount'),
                    data: last12Months.map(month => monthlyData[month]),
                    backgroundColor: '#3B82F6'
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return formatCurrency(value);
                            }
                        }
                    }
                }
            }
        });
    }
    
    // Top Borrowers - FIXED: Check for borrowerName existence
    const borrowerTotals = {};
    loans.forEach(loan => {
        const borrowerName = loan.borrowerName || translate('unknown');
        borrowerTotals[borrowerName] = (borrowerTotals[borrowerName] || 0) + (loan.loanAmount || 0);
    });
    
    const topBorrowers = Object.entries(borrowerTotals)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);
    
    const topBorrowersList = document.getElementById('topBorrowersList');
    if (topBorrowersList) {
        topBorrowersList.innerHTML = topBorrowers.map(([name, amount], index) => `
            <div class="flex justify-between items-center p-2 rounded">
                <div class="flex items-center">
                    <span class="font-bold mr-2">${index + 1}.</span>
                    <span>${name}</span>
                </div>
                <span class="font-bold">${formatCurrency(amount)}</span>
            </div>
        `).join('');
    }
}
function sanitizeSheetName(name) {
    // Remove characters not allowed in Excel sheet names
    // Also trim to max 31 characters (Excel limit)
    return String(name).replace(/[:\\\/\?*\[\]]/g, '').substring(0, 31) || 'Loans';
}

function exportLoansToExcel() {
    try {
        showLoading();
        if (isCancelled) return;
        translate('exporting_to_excel');
        
        const filteredLoans = applyLoanFiltersToArray(loans);
        const data = filteredLoans.map(loan => {
            const totalPayable = loan.loanAmount * (1 + (loan.interestRate / 100));
            const amountPaid = loan.repayments?.reduce((sum, rep) => sum + rep.amount, 0) || 0;
            const balance = totalPayable - amountPaid;
            const isOverdue = loan.status === 'Active' && new Date(loan.dueDate) < new Date();
            
            return {
                [String(translate('loan_id'))]: String(loan.loanId || ''),
                [String(translate('borrower'))]: String(loan.borrowerName || ''),
                [String(translate('contact'))]: String(loan.borrowerContact || ''),
                [String(translate('loan_type'))]: String(loan.loanType || ''),
                [String(translate('loan_amount'))]: Number(loan.loanAmount) || 0,
                [String(translate('interest_rate'))]: String(loan.interestRate) + '%',
                [String(translate('total_payable'))]: Number(totalPayable) || 0,
                [String(translate('date_issued'))]: String(formatDate(loan.issueDate)),
                [String(translate('due_date'))]: String(formatDate(loan.dueDate)),
                [String(translate('amount_paid'))]: Number(amountPaid) || 0,
                [String(translate('balance'))]: Number(balance) || 0,
                [String(translate('status'))]: String(isOverdue ? translate('overdue') : translate(loan.status?.toLowerCase() || 'unknown')),
                [String(translate('purpose'))]: String(loan.purpose || ''),
                [String(translate('created_by'))]: String(loan.createdBy || '')
            };
        });
        
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        
        // 🔧 Sanitize the sheet name
        const sheetName = sanitizeSheetName(translate('loans'));
        XLSX.utils.book_append_sheet(wb, ws, sheetName);
        
        const business = JSON.parse(localStorage.getItem('businessSettings') || '{}');
        const fileName = `${translate('loan_book')}_${business.businessName || translate('business')}_${new Date().toISOString().split('T')[0]}.xlsx`;
        
        XLSX.writeFile(wb, fileName);
        
        const checkInterval = setInterval(() => {
            checkCancelled();
        }, 100);
        resetCancellation();
        clearInterval(checkInterval);
        
        hideLoading();
        showMessageModal(translate('loan_book_exported_successfully'), 'success');
        
    } catch (error) {
        console.error(translate('error_exporting_to_excel'), error);
        const checkInterval = setInterval(() => {
            checkCancelled();
        }, 100);
        resetCancellation();
        clearInterval(checkInterval);
        
        hideLoading();
        showMessageModal(translate('error_exporting_loan_book'), 'error');
    }
}

function applyLoanFiltersToArray(loanArray) {
    let filtered = [...loanArray];
    
    if (currentLoanFilters.borrower) {
        filtered = filtered.filter(loan => 
            loan.borrowerName.toLowerCase().includes(currentLoanFilters.borrower) ||
            (loan.borrowerContact && loan.borrowerContact.toLowerCase().includes(currentLoanFilters.borrower))
        );
    }
    
    if (currentLoanFilters.status !== 'All') {
        filtered = filtered.filter(loan => {
            if (currentLoanFilters.status === 'Overdue') {
                return loan.status === 'Active' && new Date(loan.dueDate) < new Date();
            }
            return loan.status === currentLoanFilters.status;
        });
    }
    
    if (currentLoanFilters.type !== 'All') {
        filtered = filtered.filter(loan => loan.loanType === currentLoanFilters.type);
    }
    
    return filtered;
}

function saveLoansToLocalStorage() {
    try {
        localStorage.setItem('loans', JSON.stringify(loans));
    } catch (error) {
        console.error(translate('error_saving_loans_localstorage'), error);
    }
}

// Get Loan Status Class
function getLoanStatusClass(status) {
    switch(status) {
        case 'Active': return 'bg-blue-100 text-blue-800';
        case 'Overdue': return 'bg-red-100 text-red-800';
        case 'Paid': return 'bg-green-100 text-green-800';
        case 'Defaulted': return 'bg-gray-100 text-gray-800';
        default: return 'bg-gray-100 text-gray-800';
    }
}

// Helper Functions
function generateId() {
    return 'loan_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString();
}




// ✅ Function to get business info from localStorage
function getBusinessInfo() {
    try {
        // First try to get the full businessInfo object from localStorage
        const businessInfoStr = localStorage.getItem('businessInfo');
        
        if (businessInfoStr) {
            const businessInfo = JSON.parse(businessInfoStr);
            
            // Ensure all required fields exist with proper defaults
            const completeBusinessInfo = {
                // Default values
                name: '',
                address: '',
                shopNumber: '',
                phoneNumberTwo: '',
                email: '',
                Website: '',
                socialMediaHandles: '',
                details: '',
                logoData: '',
                warrantyDuration: 0,
                warrantyUnit: 'none',
                warrantyText: '',
                currency: 'FCFA',
                fontStyle: 'default',
                currentLanguage: 'en',
                // Override with stored data
                ...businessInfo
            };
            
            return completeBusinessInfo;
        }
        
        // If no businessInfo object exists, try to reconstruct from individual localStorage items
        console.log('No businessInfo object found, reconstructing from individual items...');
        
        const reconstructedInfo = {
            name: localStorage.getItem('businessName') || '',
            address: localStorage.getItem('businessAddress') || '',
            shopNumber: localStorage.getItem('businessPhone') || '',
            phoneNumberTwo: localStorage.getItem('phoneNumberTwo') || '',
            email: localStorage.getItem('businessEmail') || localStorage.getItem('businessemail') || '',
            Website: localStorage.getItem('businessEmail') || localStorage.getItem('businessWebsite') || '',
            socialMediaHandles: localStorage.getItem('socialMediaHandles') || '',
            details: localStorage.getItem('businessDetails') || '',
            logoData: localStorage.getItem('businessLogo') || localStorage.getItem('logoData') || '',
            warrantyDuration: parseInt(localStorage.getItem('warrantyDuration')) || 0,
            warrantyUnit: localStorage.getItem('warrantyUnit') || 'none',
            warrantyText: localStorage.getItem('warrantyText') || '',
            currency: localStorage.getItem('currency') || 'FCFA',
            fontStyle: localStorage.getItem('fontStyle') || 'default',
            currentLanguage: localStorage.getItem('language') || 'en'
        };
        
        // Save the reconstructed info back to localStorage for future use
        localStorage.setItem('businessInfo', JSON.stringify(reconstructedInfo));
        
        console.log('Reconstructed business info:', reconstructedInfo);
        return reconstructedInfo;
        
    } catch (error) {
        console.error('Error getting business info from localStorage:', error);
        
        // Return comprehensive defaults on error
        const defaultInfo = {
            name: 'SUCCESS TECHNOLOGY',
            address: '',
            shopNumber: '',
            phoneNumberTwo: '',
            email: '',
            Website: '',
            socialMediaHandles: '',
            details: '',
            logoData: '',
            warrantyDuration: 0,
            warrantyUnit: 'none',
            warrantyText: '',
            currency: 'FCFA',
            fontStyle: 'default',
            currentLanguage: 'en'
        };
        
        // Try to save defaults to localStorage
        try {
            localStorage.setItem('businessInfo', JSON.stringify(defaultInfo));
        } catch (e) {
            console.error('Failed to save default business info:', e);
        }
        
        return defaultInfo;
    }
}
