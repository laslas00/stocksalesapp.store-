function calculateRepaymentPossibility(personalloan, totalSalesSincepersonalloan) {
    const personalloanAmount = personalloan.amount;
    const ratio = totalSalesSincepersonalloan / personalloanAmount;
    let scoreText = '';
    let scoreClass = '';
    
    if (ratio < 0.5) {
        scoreText = translate('very_low_score') || 'Very Low 🙁';
        scoreClass = 'text-red-700';
    } else if (ratio < 1.0) {
        scoreText = translate('low_score') || 'Low 🟠';
        scoreClass = 'text-orange-600';
    } else if (ratio < 2.0) {
        scoreText = translate('medium_score') || 'Medium 👍';
        scoreClass = 'text-yellow-600';
    } else {
        scoreText = translate('super_score') || 'Super! You can pay back 🚀';
        scoreClass = 'text-green-600';
    }
    
    
    if (possibilityScoreDiv) {
        possibilityScoreDiv.innerHTML = `<span class="${scoreClass}">${scoreText}</span> <span class="text-sm text-gray-500">(${formatCurrency(totalSalesSincepersonalloan)} ${translate('sales_vs') || 'sales vs'} ${formatCurrency(personalloanAmount)} ${translate('loan') || 'loan'})</span>`;
    }
}

let personalloans = [];
let salesChartInstance = null; // To hold the Chart.js instance

// Helper function to get the current status of a personalloan
function getpersonalloanStatus(personalloan) {
    const today = new Date().toISOString().split('T')[0];
    const paid = getpersonalloanPaid(personalloan);
    const unpaid = personalloan.amount - paid;
    const dueDate = personalloan.paymentDay;

    // Check if personalloan is explicitly marked as paid by user
    if (personalloan.markedAsPaid) {
        return { status: translate('paid') || 'Paid', class: 'bg-green-100 text-green-800 border-green-300', sortPriority: 4 };
    }
    
    if (unpaid <= 0)
        return { status: translate('fully_repaid_unmarked') || 'Fully Repaid (Unmarked)', class: 'bg-blue-100 text-blue-800 border-blue-300', sortPriority: 3.5 };
    if (!dueDate)
        return { status: translate('unpaid') || 'Unpaid', class: 'bg-yellow-100 text-yellow-800 border-yellow-300', sortPriority: 3 };
    if (dueDate < today)
        return { status: translate('overdue') || 'Overdue', class: 'bg-red-100 text-red-800 border-red-300', sortPriority: 1 };
    if (dueDate <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
        return { status: translate('upcoming') || 'Upcoming', class: 'bg-orange-100 text-orange-800 border-orange-300', sortPriority: 2 };
    return { status: translate('unpaid') || 'Unpaid', class: 'bg-yellow-100 text-yellow-800 border-yellow-300', sortPriority: 3 };
}

document.getElementById('personalloanManagementBtn').onclick = async function() {
    if (!currentUser || currentUser.role !== 'administrator') {
        showMessageModal(translate('only_admins_access_loans') || 'Only administrators can access loan Management.');
        return;
    }
    await loadpersonalloans();
    showpersonalloanModal();
};

async function showpersonalloanModal() {
    const personalloanModalBg = document.getElementById('personalloanModalBg');
    const personalloanModal = document.getElementById('personalloanModal');
    
    if (businessInfo && businessInfo.logoData && personalloanModalBg) {
        personalloanModalBg.style.backgroundImage = `url('${API_BASE + businessInfo.logoData}')`;
    } else if (personalloanModalBg) {
        personalloanModalBg.style.backgroundImage = '';
    }
    
    if (personalloanModal) {
        personalloanModal.classList.remove('hidden');
    }
    
    await loadData();
    renderpersonalloanList();
    renderpersonalloanStats();
}

async function closepersonalloanModal() {
    const personalloanModal = document.getElementById('personalloanModal');
    if (personalloanModal) {
        await cleanupMemory();
        personalloanModal.classList.add('hidden');
    }
}

// --- NEW Add personalloan Modal Functions ---


if (openAddpersonalloanModalBtn) {
    openAddpersonalloanModalBtn.onclick = function() {
        // Reset the form and show the modal
        if (addpersonalloanForm) addpersonalloanForm.reset();
        const personalloanModal = document.getElementById('personalloanModal');
        if (personalloanModal) personalloanModal.classList.add('hidden'); // Hide the list modal
        if (addpersonalloanModal) addpersonalloanModal.classList.remove('hidden');
        if (personalloanWhoInput) personalloanWhoInput.focus();
    };
}

function closeAddpersonalloanModal() {
    if (addpersonalloanModal) addpersonalloanModal.classList.add('hidden');
    // Show the list modal again after closing the add modal
    const personalloanModal = document.getElementById('personalloanModal');
    if (personalloanModal) personalloanModal.classList.remove('hidden'); 
}

if (addpersonalloanBtn) {
    addpersonalloanBtn.onclick = async function() {
        const who = personalloanWhoInput ? personalloanWhoInput.value.trim() : '';
        const amount = personalloanAmountInput ? parseFloat(personalloanAmountInput.value) : 0;
        const reason = personalloanReasonInput ? personalloanReasonInput.value.trim() : '';
        const date = personalloanDateInput ? personalloanDateInput.value : '';
        const paymentDay = personalloanPaymentDayInput ? personalloanPaymentDayInput.value : '';
        
        if (!who || isNaN(amount) || amount <= 0 || !date) {
            showMessageModal(translate('validation_error') || 'Validation Error', translate('fill_required_fields') || 'Please fill in required fields.');
            return;
        }

        const personalloan = {
            who, amount, reason, date, paymentDay,
            payments: [],
            markedAsPaid: false, // Initialize as not paid
            id: Date.now()
        };

        try {
            const res = await fetch(`${API_BASE}/api/loans`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(personalloan)
            });
            if (!res.ok) throw new Error('Server failed to save personalloan');

            await loadpersonalloans();
            closeAddpersonalloanModal(); // Close the add modal
            renderpersonalloanList(); // The list modal is now visible and updated
        } catch (e) {
            showMessageModal(translate('error') || 'Error', translate('failed_add_loan') || 'Failed to add loan. Please try again.');
            console.error('Add loan error:', e);
        }
    };
}

// --- personalloan Data Fetch/Render Functions ---

async function loadpersonalloans() {
    try {
        const res = await fetch(`${API_BASE}/api/loans`);
        personalloans = await res.json();
    } catch (e) {
        personalloans = [];
        console.error(translate('failed_load_loans') || 'Failed to load loans:', e);
    }
}

function renderpersonalloanSalesChart(personalloan) {
  

    
    if (!personalloanSalesChartCanvas || !possibilityScoreDiv) return;
    
    const personalloanDate = personalloan.date; 
    
    // 1. Filter sales: Use 'dateSold' instead of 'date'
    const relevantSales = sales.filter(s => s.dateSold >= personalloanDate);
    
    // 2. Aggregate sales by day
    const dailySales = relevantSales.reduce((acc, sale) => {
        const date = sale.dateSold.split('T')[0]; // Use YYYY-MM-DD
        acc[date] = (acc[date] || 0) + (sale.totalAmount || sale.price || 0);
        return acc;
    }, {});
    
    const dates = Object.keys(dailySales).sort();
    const data = dates.map(date => dailySales[date]);
    
    const totalSalesSincepersonalloan = data.reduce((sum, amount) => sum + amount, 0);

    // Calculate and display possibility score
    calculateRepaymentPossibility(personalloan, totalSalesSincepersonalloan);

    // 3. Render Chart.js
    if (salesChartInstance) {
        salesChartInstance.destroy();
    }
    
    const ctx = personalloanSalesChartCanvas.getContext('2d');
    salesChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: dates.map(d => formatDate(d)), // Use formatted dates for labels
            datasets: [{
                label: translate('daily_total_sales') || 'Daily Total Sales',
                data: data,
                backgroundColor: 'rgba(54, 162, 235, 0.5)',
                borderColor: 'rgba(54, 162, 235, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: `${translate('sales') || 'Sales'} (${getCurrencySymbol()})`,
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.parsed.y !== null) {
                                label += formatCurrency(context.parsed.y);
                            }
                            return label;
                        }
                    }
                }
            }
        }
    });
}

// --- Payment Modal Functions (Modified to include mark as paid checkbox) ---

window.openpersonalloanPaymentModal = function(personalloanId) {
    const currentpersonalloanId = document.getElementById('currentpersonalloanId');
    const paymentpersonalloanDetails = document.getElementById('paymentpersonalloanDetails');
    const paymentAmountInput = document.getElementById('paymentAmountInput');
    const paymentDateInput = document.getElementById('paymentDateInput');
    const markAsPaidContainer = document.getElementById('markAsPaidContainer');
    const markAsPaidCheckbox = document.getElementById('markAsPaidCheckbox');
   
    const personalloanModal = document.getElementById('personalloanModal');
    
    const personalloan = personalloans.find(l => l.id === personalloanId);
    if (!personalloan) {
        showMessageModal(translate('error') || 'Error', translate('loan_not_found') || 'Loan not found.');
        return;
    }
    
    // Render the sales chart and possibility analysis
    renderpersonalloanSalesChart(personalloan);

    const paid = getpersonalloanPaid(personalloan);
    const unpaid = personalloan.amount - paid;

    // Populate modal fields
    if (currentpersonalloanId) currentpersonalloanId.value = personalloan.id;
    if (paymentpersonalloanDetails) {
        paymentpersonalloanDetails.innerHTML = `${translate('loan_to') || 'Loan to'} <strong>${personalloan.who}</strong> (${formatCurrency(personalloan.amount)}) | <strong>${translate('remaining') || 'Remaining'}: ${formatCurrency(unpaid)}</strong>`;
    }
    
    if (paymentAmountInput) {
        paymentAmountInput.value = unpaid > 0 ? unpaid.toFixed(2) : '0.00';
        paymentAmountInput.max = unpaid;
    }
    
    if (paymentDateInput) paymentDateInput.value = new Date().toISOString().slice(0, 10);
    
    // Show/hide mark as paid checkbox based on whether personalloan is fully repaid
    if (unpaid <= 0 && !personalloan.markedAsPaid) {
        if (markAsPaidContainer) markAsPaidContainer.classList.remove('hidden');
        if (markAsPaidCheckbox) markAsPaidCheckbox.checked = false;
    } else {
        if (markAsPaidContainer) markAsPaidContainer.classList.add('hidden');
        if (markAsPaidCheckbox) markAsPaidCheckbox.checked = false;
    }
    
    if (paymentModal) paymentModal.classList.remove('hidden');
    // We hide the list modal when opening the payment modal
    if (personalloanModal) personalloanModal.classList.add('hidden'); 
    if (paymentAmountInput) paymentAmountInput.focus();
};

function closePaymentModal() {
    if (paymentModal) paymentModal.classList.add('hidden');
    if (recordPaymentForm) recordPaymentForm.reset();
    if (markAsPaidContainer) markAsPaidContainer.classList.add('hidden');
    if (markAsPaidCheckbox) markAsPaidCheckbox.checked = false;
    // Show the list modal again after payment is recorded or modal is closed
    if (personalloanModal) personalloanModal.classList.remove('hidden'); 
}


if (recordPaymentForm) {
    recordPaymentForm.onsubmit = async function(event) {
        event.preventDefault();
        
        const currentpersonalloanId = document.getElementById('currentpersonalloanId');
        const paymentAmountInput = document.getElementById('paymentAmountInput');
        const paymentDateInput = document.getElementById('paymentDateInput');
        const markAsPaidCheckbox = document.getElementById('markAsPaidCheckbox');
        
        const personalloanId = Number(currentpersonalloanId ? currentpersonalloanId.value : 0);
        const amount = paymentAmountInput ? parseFloat(paymentAmountInput.value) : 0;
        const date = paymentDateInput ? paymentDateInput.value : '';
        const markAsPaid = markAsPaidCheckbox ? markAsPaidCheckbox.checked : false;
        
        const personalloan = personalloans.find(l => l.id === personalloanId);
        if (!personalloan) return;

        const unpaid = personalloan.amount - getpersonalloanPaid(personalloan);

        if (isNaN(amount) || amount <= 0) {
            showMessageModal(translate('error') || 'Error', translate('enter_valid_amount') || 'Please enter a valid amount.');
            return;
        }
        if (amount > unpaid + 0.01) { 
            showMessageModal(translate('error') || 'Error', `${translate('payment_exceeds_balance') || 'Payment exceeds remaining balance'} (${formatCurrency(unpaid)}).`);
            return;
        }
        if (!date) {
            showMessageModal(translate('error') || 'Error', translate('select_payment_date') || 'Please select a payment date.');
            return;
        }

        // Only allow marking as paid if the personalloan is fully repaid
        if (markAsPaid && (personalloan.amount - getpersonalloanPaid(personalloan) - amount > 0.01)) {
            showMessageModal(translate('error') || 'Error', translate('cannot_mark_paid_until_fully_repaid') || 'Cannot mark as paid until loan is fully repaid.');
            return;
        }

        personalloan.payments = personalloan.payments || [];
        if (amount > 0) {
            personalloan.payments.push({ amount, date });
        }
        
        // Only mark as paid if user explicitly chooses to and personalloan is fully repaid
        if (markAsPaid && (personalloan.amount - getpersonalloanPaid(personalloan) <= 0.01)) {
            personalloan.markedAsPaid = true;
        }

        try {
            const res = await fetch(`${API_BASE}/api/loans/${personalloan.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(personalloan)
            });

            if (!res.ok) throw new Error('Failed to save payment');

            await loadpersonalloans();
            // Crucial: Close payment modal and show list modal
            closePaymentModal(); 
            renderpersonalloanList(); 
            renderpersonalloanStats();
        } catch (e) {
            showMessageModal(translate('error') || 'Error', translate('failed_record_payment') || 'Failed to record payment. Please try again.');
            console.error('Payment error:', e);
        }
        return false;
    };
}

// --- Function to manually mark a personalloan as paid ---
window.markpersonalloanAsPaid = async function(personalloanId) {
    const personalloan = personalloans.find(l => l.id === personalloanId);
    if (!personalloan) return;

    const unpaid = personalloan.amount - getpersonalloanPaid(personalloan);
    
    if (unpaid > 0.01) {
        showMessageModal(translate('error') || 'Error', translate('cannot_mark_paid_until_fully_repaid') || 'Cannot mark as paid until loan is fully repaid.');
        return;
    }

    if (!confirm(translate('confirm_mark_as_paid') || 'Are you sure you want to mark this loan as fully paid?')) {
        return;
    }

    personalloan.markedAsPaid = true;

    try {
        const res = await fetch(`${API_BASE}/api/loans/${personalloan.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(personalloan)
        });

        if (!res.ok) throw new Error('Failed to update loan');

        await loadpersonalloans();
        renderpersonalloanList();
        renderpersonalloanStats();
    } catch (e) {
        showMessageModal(translate('error') || 'Error', translate('failed_mark_loan_paid') || 'Failed to mark loan as paid. Please try again.');
        console.error('Mark as paid error:', e);
    }
};

// --- Existing Delete Function ---

window.deletepersonalloan = function(personalloanId) {
    if (!confirm(translate('confirm_delete_loan') || 'Are you sure you want to permanently delete this loan?')) return;
    fetch(`${API_BASE}/api/loans/${personalloanId}`, { method: 'DELETE' })
        .then(res => {
            if (!res.ok) throw new Error('Delete failed');
            return loadpersonalloans();
        })
        .then(() => {
            renderpersonalloanList();
            renderpersonalloanStats();
        })
        .catch(e => {
            showMessageModal(translate('error') || 'Error', translate('failed_delete_loan') || 'Failed to delete loan. Please try again.');
            console.error('Delete loan error:', e);
        });
};

if (addpersonalloanModal) {
    addpersonalloanModal.onclick = function(e) {
        if (e.target === addpersonalloanModal) closeAddpersonalloanModal();
    };
}


if (paymentModal) {
    paymentModal.onclick = function(e) {
        if (e.target === paymentModal) closePaymentModal();
    };
}

function renderpersonalloanList() {
    const personalloanList = document.getElementById('personalloanList');
    if (!personalloanList) return;
    
    personalloanList.innerHTML = '';
    
    // Filter out loans with the new structure (has loanId, borrowerName, etc.)
    // Keep only loans with the old structure (has who, amount, payments fields)
    const filteredpersonalloans = personalloans.filter(personalloan => {
        // Check if it's the old structure by looking for 'who' field
        // And NOT having 'borrowerName' or 'loanId' fields
        return personalloan.who !== undefined && 
               personalloan.borrowerName === undefined &&
               personalloan.loanId === undefined;
    });
    
    if (!filteredpersonalloans.length) {
        personalloanList.innerHTML = `<div class="text-center text-gray-500 py-4 border-t mt-4">${translate('no_personal_loans') || 'No personal loans recorded.'}</div>`;
        return;
    }
    
    const sortedpersonalloans = filteredpersonalloans.sort((a, b) => {
        const statusA = getpersonalloanStatus(a);
        const statusB = getpersonalloanStatus(b);
        
        const priorityA = statusA.sortPriority || 4;
        const priorityB = statusB.sortPriority || 4;
        
        if (priorityA !== priorityB) {
            return priorityA - priorityB;
        }
        
        // Secondary sort: by due date for unpaid personalloans
        if (priorityA <= 3 && a.paymentDay && b.paymentDay) {
            return new Date(a.paymentDay) - new Date(b.paymentDay);
        }
        return 0;
    });

    sortedpersonalloans.forEach(personalloan => {
        const paid = getpersonalloanPaid(personalloan);
        const unpaid = personalloan.amount - paid;
        const personalloanStatus = getpersonalloanStatus(personalloan);
        let payBtnClass = 'bg-blue-500 hover:bg-blue-600';
        let payBtnText = `
            <svg class="w-5 h-5 inline mr-2" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg> ` + (translate('review_pay') || 'Review/Pay');

        if (unpaid <= 0 && !personalloan.markedAsPaid) {
            payBtnClass = 'bg-purple-500 hover:bg-purple-600';
            payBtnText = `
                <svg class="w-5 h-5 inline mr-2" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                </svg> ` + (translate('mark_as_paid') || 'Mark as Paid');
        } else if (personalloanStatus.status === translate('overdue') || personalloanStatus.status === 'Overdue') {
            payBtnClass = 'bg-red-600 hover:bg-red-700';
            // Optional: Add warning icon for overdue
            payBtnText = `
                <svg class="w-5 h-5 inline mr-2" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
                </svg> ` + (translate('review_pay') || 'Review/Pay');
        }

        const paymentsHtml = (personalloan.payments || []).map(p =>
            `<div class="text-xs text-green-700 bg-green-50 px-2 py-0.5 rounded-full inline-block mt-1 mr-1">
                +${formatCurrency(p.amount)} ${translate('on') || 'on'} ${formatDate(p.date)}
            </div>`
        ).join('');

        personalloanList.innerHTML += `
        <div class="border rounded-lg p-4 mb-3 shadow-md transition duration-200 ${personalloanStatus.class.replace(/100|300/g, '50')} hover:shadow-lg">
            <div class="flex justify-between items-start">
                <div>
                    <div class="font-bold text-lg">${personalloan.who}</div>
                    <div class="text-xs text-gray-600 mb-1">${personalloan.reason || (translate('no_reason_specified') || 'No Reason Specified')}</div>
                    
                    <div class="mb-1">
                        <span class="font-semibold">${translate('loan') || 'Loan'}: ${formatCurrency(personalloan.amount)}</span>
                    </div>

                    <div class="text-sm">
                        <span class="text-gray-500">${translate('unpaid') || 'Unpaid'}: </span>
                        <b class="${unpaid > 0 ? 'text-red-700' : 'text-green-700'}">${formatCurrency(Math.max(0, unpaid))}</b>
                    </div>
                </div>

                <div class="flex flex-col items-end space-y-2">
                    <span class="px-3 py-1 text-xs font-semibold rounded-full border ${personalloanStatus.class}">
                        ${personalloanStatus.status}
                    </span>
                    <button class="${payBtnClass} text-white px-3 py-1 rounded-lg text-sm transition duration-150" onclick="openpersonalloanPaymentModal(${personalloan.id})">
                        ${payBtnText}
                    </button>
                </div>
            </div>

            <div class="mt-2 border-t pt-2">
                <div class="text-xs text-gray-500 flex justify-between">
                    <span>${translate('taken') || 'Taken'}: ${formatDate(personalloan.date)}</span>
                    <span class="${personalloanStatus.status === translate('overdue') || personalloanStatus.status === 'Overdue' ? 'text-red-600 font-semibold' : ''}">${translate('due') || 'Due'}: ${personalloan.paymentDay ? formatDate(personalloan.paymentDay) : 'N/A'}</span>
                </div>
                ${paymentsHtml ? `<div class="mt-2"><span class="text-xs font-semibold text-gray-700">${translate('payments') || 'Payments'}:</span> ${paymentsHtml}</div>` : ''}
                <button class="text-red-500 text-xs mt-2 hover:text-red-700 transition duration-150" onclick="deletepersonalloan(${personalloan.id})">${translate('delete_loan') || 'Delete Loan'}</button>
            </div>
        </div>
        `;
    });
}

function renderpersonalloanStats() {
    const personalloanStats = document.getElementById('personalloanStats');
    if (!personalloanStats) return;
    
    const total = personalloans.reduce((sum, l) => sum + Number(l.amount || 0), 0);
    const paid = personalloans.reduce((sum, l) => sum + getpersonalloanPaid(l), 0);
    const unpaid = total - paid;
    personalloanStats.innerHTML = `
        <div class="flex justify-between p-3 border rounded-lg bg-gray-100 shadow-inner">
            <div class="text-sm">${translate('total_loans') || 'Total loans'}: <b class="text-blue-600">${formatCurrency(total)}</b></div>
            <div class="text-sm">${translate('paid') || 'Paid'}: <span class="text-green-600 font-bold">${formatCurrency(paid)}</span></div>
            <div class="text-sm">${translate('unpaid') || 'Unpaid'}: <span class="text-red-600 font-bold">${formatCurrency(unpaid)}</span></div>
        </div>
    `;
}

// Helper function to calculate total paid amount for a loan
function getpersonalloanPaid(personalloan) {
    if (!personalloan.payments || !Array.isArray(personalloan.payments)) {
        return 0;
    }
    return personalloan.payments.reduce((sum, payment) => sum + (payment.amount || 0), 0);
}