

document.getElementById('addExpenseBtn').onclick = function() {
    document.getElementById('expenseModal').classList.remove('hidden');
    document.getElementById('expenseModal').classList.add('MODAL-LOCK-OPEN');
    document.getElementById('expenseDateInput').value = new Date().toISOString().slice(0, 10);
};

// Save expense
document.getElementById('saveExpenseBtn').onclick = async function() {
    const name = document.getElementById('expenseNameInput').value.trim();
    const amount = parseFloat(document.getElementById('expenseAmountInput').value);
    const date = document.getElementById('expenseDateInput').value;
    if (!name || isNaN(amount) || amount <= 0) {
        showMessageModal(translate('enter_valid_expense_details'));
        return;
    }
    const expense = {
        id: `expense-${Date.now()}`,
        name,
        amount,
        date,
        timestamp: new Date().toLocaleString('fr-FR'),
        username: currentUser ? currentUser.username : translate('offline_user')
    };
    try {
        await fetch(`${API_BASE}/api/expenses`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(expense)
        });
        // Optionally reload expenses from server
        await loadExpenses();
        document.getElementById('expenseModal').classList.add('hidden');
        showMessageModal(translate('expense_recorded'));
        renderSales(); 
    } catch (e) {
        showMessageModal(translate('failed_save_expense'));
    }
};

// Initialize year and month buttons
function initExpenseFilters() {
    populateYearButtons();
    setDefaultMonthYear();
    setupButtonEvents();
}

// Populate year buttons dynamically
function populateYearButtons() {
    const yearButtonsContainer = document.getElementById('expensesYearButtons');
    if (!yearButtonsContainer) return;
    
    // Clear existing buttons
    yearButtonsContainer.innerHTML = '';
    
    // Add "All Years" button
    const allYearsBtn = document.createElement('button');
    allYearsBtn.className = 'year-btn px-3 py-2 rounded-md border text-sm';
    allYearsBtn.setAttribute('data-year', '');
    allYearsBtn.textContent = translate('all_years');
    yearButtonsContainer.appendChild(allYearsBtn);
    
    // Add year buttons from 2020 to current year
    const currentYear = new Date().getFullYear();
    for (let y = currentYear; y >= 2020; y--) {
        const yearBtn = document.createElement('button');
        yearBtn.className = 'year-btn px-3 py-2 rounded-md border text-sm';
        yearBtn.setAttribute('data-year', y.toString());
        yearBtn.textContent = y.toString();
        yearButtonsContainer.appendChild(yearBtn);
    }
}

// Set default month and year (current month and year)
function setDefaultMonthYear() {
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1;
    const currentYear = currentDate.getFullYear();
    
    // Set hidden inputs
    document.getElementById('selectedMonth').value = currentMonth.toString();
    document.getElementById('selectedYear').value = currentYear.toString();
    
    // Update button styles
    updateButtonStyles();
}

// Setup button click events
function setupButtonEvents() {
    // Month button clicks
    document.querySelectorAll('.month-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.getElementById('selectedMonth').value = this.getAttribute('data-month');
            updateButtonStyles();
        });
    });
    
    // Year button clicks
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('year-btn')) {
            document.getElementById('selectedYear').value = e.target.getAttribute('data-year');
            updateButtonStyles();
        }
    });
}

// Update button active states
function updateButtonStyles() {
    const selectedMonth = document.getElementById('selectedMonth').value;
    const selectedYear = document.getElementById('selectedYear').value;
    
    // Update month buttons
    document.querySelectorAll('.month-btn').forEach(btn => {
        const monthValue = btn.getAttribute('data-month');
        if (monthValue === selectedMonth) {
            btn.classList.add('bg-blue-500', 'text-white', 'border-blue-600');
            btn.classList.remove('bg-gray-100', 'text-base', 'border-gray-300');
        } else {
            btn.classList.add('bg-gray-100', 'text-base', 'border-gray-300', 'hover:bg-gray-200');
            btn.classList.remove('bg-blue-500', 'text-white', 'border-blue-600');
        }
    });
    
    // Update year buttons
    document.querySelectorAll('.year-btn').forEach(btn => {
        const yearValue = btn.getAttribute('data-year');
        if (yearValue === selectedYear) {
            btn.classList.add('bg-blue-500', 'text-white', 'border-blue-600');
            btn.classList.remove('bg-gray-100', 'text-base', 'border-gray-300');
        } else {
            btn.classList.add('bg-gray-100', 'text-base', 'border-gray-300', 'hover:bg-gray-200');
            btn.classList.remove('bg-blue-500', 'text-white', 'border-blue-600');
        }
    });
}


// Modified renderExpenses function to use button selections
async function renderExpenses() {
    const tbody = document.getElementById('expensesTableBody');
    const noMsg = document.getElementById('noExpensesMessage');
    tbody.innerHTML = '';

    // Get filter values from hidden inputs (from buttons)
    let month = document.getElementById('selectedMonth').value;
    let year = document.getElementById('selectedYear').value;

    let filtered = expenses;

    // --- FILTER BY YEAR ---
    if (year) {
        filtered = filtered.filter(e => {
            const expDate = new Date(e.date);
            return expDate.getFullYear().toString() === year;
        });
    }

    // --- FILTER BY MONTH ---
    if (month) {
        filtered = filtered.filter(e => {
            const expDate = new Date(e.date);
            return (expDate.getMonth() + 1).toString() === month;
        });
    }

    if (filtered.length === 0) {
        noMsg.classList.remove('hidden');
        // Update the no expenses message text
        if (noMsg) {
            noMsg.textContent = translate('no_expenses_found');
        }
        return;
    }

    noMsg.classList.add('hidden');

    // --- GROUP BY MONTH ---
    const groupedByMonth = {};
    filtered.forEach(exp => {
        const expDate = new Date(exp.date);
        const key = `${expDate.getFullYear()}-${String(expDate.getMonth() + 1).padStart(2, '0')}`;
        if (!groupedByMonth[key]) groupedByMonth[key] = [];
        groupedByMonth[key].push(exp);
    });

    let totalExpenses = 0;
    let rowNumber = 1;

    Object.keys(groupedByMonth).sort().forEach(monthKey => {
        const monthExpenses = groupedByMonth[monthKey];
        const [year, monthNum] = monthKey.split('-');
        const monthName = new Date(year, monthNum - 1).toLocaleString('default', { month: 'long' });

        // Month header
        const monthRow = document.createElement('tr');
        monthRow.classList.add('bg-indigo-100', 'font-bold');
        monthRow.innerHTML = `
            <td colspan="5" class="px-6 py-3 text-blue-800">${monthName} ${year}</td>
        `;
        tbody.appendChild(monthRow);

        let monthlyTotal = 0;

        monthExpenses.forEach(exp => {
            monthlyTotal += Number(exp.amount);
            totalExpenses += Number(exp.amount);
            const r = document.createElement('tr');
            r.classList.add('hover:bg-gray-50');
            r.innerHTML = `
                <td class="px-6 py-3">${rowNumber++}</td>
                <td class="px-6 py-3">${exp.name}</td>
                <td class="px-6 py-3">${formatCurrency(exp.amount)}</td>
                <td class="px-6 py-3 text-gray-500">${exp.date}</td>
                <td class="px-6 py-4 text-red-600 font-bold">${translate('by')}: ${exp.username}</td>
            `;
            tbody.appendChild(r);
        });

        // Monthly total row
        const monthlyTotalRow = document.createElement('tr');
        monthlyTotalRow.classList.add('font-bold', 'text-purple-700');
        monthlyTotalRow.innerHTML = `
            <td colspan="2" class="px-6 py-3 text-right">${translate('monthly_total')}:</td>
            <td class="px-6 py-3">${formatCurrency(monthlyTotal)}</td>
            <td colspan="2"></td>
        `;
        tbody.appendChild(monthlyTotalRow);
    });

    // --- OVERALL TOTAL ROW ---
    const totalRow = document.createElement('tr');
    totalRow.classList.add('font-bold', 'text-red-600');
    totalRow.innerHTML = `
        <td class="px-6 py-3 text-right" colspan="2">${translate('total_expenses')}:</td>
        <td class="px-6 py-3">${formatCurrency(totalExpenses)}</td>
        <td colspan="2"></td>
    `;
    tbody.appendChild(totalRow);
}

// Event listeners
document.getElementById('applyExpensesFilterBtn').addEventListener('click', renderExpenses);

document.getElementById('expensesOptionBtn').addEventListener('click', () => {
    document.getElementById('sales-history-section').classList.add('hidden');
    document.getElementById('expensesSection').classList.remove('hidden');
     document.title = "StockApp*  -> managing expenses";
    // Ensure filters are initialized
    initExpenseFilters();
    renderExpenses();
});

document.getElementById('backToSalesBtn').addEventListener('click', () => {
    document.getElementById('expensesSection').classList.add('hidden');
    document.getElementById('sales-history-section').classList.remove('hidden');
    document.getElementById('sales-history-section').classList.add('MODAL-LOCK-OPEN');
     document.getElementById('expenseModal').classList.add('MODAL-LOCK-CLOSED');
     document.title = "StockApp*  -> going back sales";
});

// Optional: Auto-apply filter when selection changes

document.getElementById('printExpensesBtn').addEventListener('click', () => {
     document.title = "StockApp*  -> printing expense out";
    const expensesSection = document.getElementById('expensesSection');
    if (!expensesSection) return;
    
    const clonedSection = expensesSection.cloneNode(true);
    clonedSection.querySelectorAll('button, input, select, #printExpensesBtn, #applyExpensesFilterBtn, #expensesYearButtons, #expensesMonthButtons, #backToSalesBtn, #noExpensesMessage, #expensesLoader').forEach(el => {
        if (el) el.remove();
    });
    
    // Get filter info
    const selectedMonth = document.getElementById('selectedMonth').value;
    const selectedYear = document.getElementById('selectedYear').value;
    
    // Create filter info
    let filterInfo = '';
    if (selectedMonth && selectedYear) {
        const monthName = new Date(2000, parseInt(selectedMonth) - 1).toLocaleString('default', { month: 'long' });
        filterInfo = `${monthName} ${selectedYear}`;
    } else if (selectedYear) {
        filterInfo = `${translate('year')}: ${selectedYear}`;
    } else if (selectedMonth) {
        const monthName = new Date(2000, parseInt(selectedMonth) - 1).toLocaleString('default', { month: 'long' });
        filterInfo = `${translate('month')}: ${monthName}`;
    }
    
    // Call with filter info
    showPrintPreviewModal(clonedSection, 'expensesSection', null, {dateRange: filterInfo});
});