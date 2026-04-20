
let currentSubcategory = '';

async function showGroupedBySubcategorySection() {
    stockOptionsModal.classList.add('hidden');
    hideAllStockSubSections();
    
    const section = document.getElementById('groupedBySubcategorySection');
    if (!section) {
        console.error('Grouped by subcategory section not found');
        return;
    }
    
    section.classList.remove('hidden');
    
    try {
        await loadStock(); // Ensure stock is loaded
        renderGroupedBySubcategory();
    } catch (error) {
        console.error('Error showing grouped subcategory section:', error);
        showMessageModal(translate('groupedSubcategory.failedDisplay') || 'Failed to display grouped subcategory view. Please try again.');
    }
}

document.getElementById('groupBySubcategoryBtn').addEventListener('click', async () => {
    try {
        // 🕒 Optional: disable button while loading
        const btn = document.getElementById('groupBySubcategoryBtn');
        btn.disabled = true;
        btn.textContent = translate('common.loading') || "Loading...";

        
        await loadStock(); // remove if already loaded elsewhere
       showGroupedBySubcategorySection();

    } catch (error) {
        console.error("❌ Error showing grouped subcategory section:", error);
        showMessageModal(translate('groupedSubcategory.failedDisplay') || 'Failed to display grouped subcategory view. Please try again.');
    } finally {
        // 🔁 Restore button state
        const btn = document.getElementById('groupBySubcategoryBtn');
        if (btn) {
            btn.disabled = false;
            btn.textContent = translate('groupedSubcategory.groupByButton') || "Group by Subcategory";
        }
    }
});

function renderGroupedBySubcategory() {
    const searchItemsInput = document.getElementById('searchItemsInput21');
    const tbody = document.getElementById('groupedSubcategoryTableBody');
    const filterSelect = document.getElementById('groupedSubcategoryFilter');
    // Adjust these IDs if your filter dropdowns have different names
    const stockTypeFilter = document.getElementById('stockTypeFilter');
    const stockCategoryFilter = document.getElementById('stockCategoryFilter');

    // Add input event listener once (optional – you can move this outside the function to avoid duplicates)
    if (searchItemsInput) {
        // Remove any existing listener to prevent duplicates (simple approach)
        searchItemsInput.removeEventListener('input', renderGroupedBySubcategory);
        searchItemsInput.addEventListener('input', renderGroupedBySubcategory);
    }

    if (!tbody || !filterSelect) return;

    const searchValue = searchItemsInput.value.trim().toLowerCase();
    const typeValue = stockTypeFilter ? stockTypeFilter.value : 'All';
    const categoryValue = stockCategoryFilter ? stockCategoryFilter.value : 'All';
    const subcategoryFilterValue = filterSelect.value;

    let filteredStock = stock.filter(item => {
        const matchesSearch = item.name.toLowerCase().includes(searchValue);
        const matchesType = (typeValue === 'All') ||
            (typeValue === 'low-stock' ? (item.type === 'product' && item.quantity < 3) : item.type === typeValue);
        const matchesCategory = (categoryValue === 'All') || (item.category === categoryValue);
        return matchesSearch && matchesType && matchesCategory;
    });

    // Populate subcategory dropdown (preserve selection)
    const allSubcategories = [...new Set(stock.map(i => i.subcategory).filter(Boolean))];
    allSubcategories.sort();
    const currentSelection = filterSelect.value;

    filterSelect.innerHTML = `<option value="All">${translate('common.allSubcategories') || 'All Subcategories'}</option>`;
    allSubcategories.forEach(sc => {
        const opt = document.createElement('option');
        opt.value = sc;
        opt.textContent = sc;
        if (sc === currentSelection) opt.selected = true;
        filterSelect.appendChild(opt);
    });

    // Apply subcategory filter
    if (subcategoryFilterValue !== 'All') {
        filteredStock = filteredStock.filter(item => item.subcategory === subcategoryFilterValue);
    }

    // Group by subcategory
    const grouped = {};
    filteredStock.forEach(item => {
        const subcat = item.subcategory || '#';
        if (!grouped[subcat]) grouped[subcat] = [];
        grouped[subcat].push(item);
    });

    const sortedSubcats = Object.keys(grouped).sort();

    // Clear tbody
    tbody.innerHTML = '';

    let rowNumber = 0;

    if (sortedSubcats.length === 0) {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td colspan="6" class="text-center py-4 text-white">${translate('common.noItemsFound') || 'No items found.'}</td>`;
        tbody.appendChild(tr);
    } else {
        sortedSubcats.forEach(subcat => {
            const items = grouped[subcat];
            items.sort((a, b) => a.name.localeCompare(b.name));

            // Subcategory header row (spans all 6 columns)
            const totalQuantity = items.reduce((sum, item) => sum + (item.quantity || 0), 0);
            const headerRow = document.createElement('tr');
            headerRow.className = 'font-bold bg-gray-100';
            headerRow.innerHTML = `
                <td colspan="6" class="px-4 py-3 text-left">
                    <div class="flex items-center justify-between">
                        <div>
                            <span class="text-lg font-semibold text-base">${subcat}</span>
                            <span class="ml-3 text-sm text-base">
                                ${items.length} ${translate('common.items') || 'items'} • ${translate('groupedSubcategory.totalQty') || 'Total Qty'}: ${totalQuantity} • 
                                ${formatCurrency(items.reduce((sum, item) => sum + (item.price || 0) * (item.quantity || 0), 0))} ${translate('common.value') || 'value'}
                            </span>
                        </div>
                        <button 
                            class="group flex items-center space-x-2 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-base px-4 py-2 rounded-lg font-medium transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
                            onclick="showSubcategoryAnalyticsModal('${subcat}')">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
                            </svg>
                            <span>${translate('groupedSubcategory.viewAnalytics') || 'View Analytics'}</span>
                        </button>
                    </div>
                </td>`;
            tbody.appendChild(headerRow);

            // Item rows
            items.forEach(item => {
                rowNumber++;
                const row = document.createElement('tr');
                if (item.type === 'product' && item.quantity < 3) row.classList.add('low-stock');

                // Build the actions cell (checkbox for unassigned, or subcategory name)
                const actionsCell = item.subcategory 
                    ? item.subcategory 
                    : `<input type="checkbox" class="assignSubcategoryCheckbox" data-name="${item.name}">
                       <span class="ml-2 italic text-gray-400">${translate('common.none') || 'None'}</span>`;

                row.innerHTML = `
                    <td class="px-4 py-3 text-sm">${rowNumber}</td>
                    <td class="px-6 py-3 text-sm font-medium text-gray-900 dark:text-white flex items-center gap-3" onclick="showItemDetailsModal(${JSON.stringify(item).replace(/"/g, '&quot;')})">
                        ${item.imageUrl ? `<img src="${fixImagePath(item.imageUrl)}" alt="${item.name}" class="w-10 h-10 rounded object-cover">` : ''}
                        <span>${item.name}</span>
                    </td>
                    <td class="px-6 py-3 text-sm">${item.category || '—'}</td>
                    <td class="px-6 py-3 text-sm">${item.quantity < 1
                        ? `<span class="text-red-600 font-bold">${translate('common.outOfStock') || 'Out of Stock'}</span>`
                        : item.quantity}</td>
                    <td class="px-6 py-3 text-sm">${item.price ? formatCurrency(Math.round(item.price)) : 'N/A'}</td>
                    <td class="px-6 py-3 text-sm">${actionsCell}</td>
                `;
                tbody.appendChild(row);
            });
        });
    }

    // Re-attach checkbox events
    document.querySelectorAll('.assignSubcategoryCheckbox').forEach(chk => {
        chk.addEventListener('change', e => {
            if (e.target.checked) {
                openAssignSubcategoryModal(e.target.dataset.name);
            }
        });
    });
}

document.getElementById('groupedSubcategoryFilter')?.addEventListener('change', () => {
    if (!document.getElementById('groupedBySubcategorySection').classList.contains('hidden')) {
        renderGroupedBySubcategory();
    }
});

function openAssignSubcategoryModal(itemName) {
    const modal = document.getElementById('subcategoryAssignModal');
    const select = document.getElementById('existingSubcategorySelect');
    const input = document.getElementById('newSubcategoryInput');

    // Reset modal
    input.value = '';
    select.innerHTML = `<option value="">${translate('selectExisting') || '-- Select Existing --'}</option>`;

    const allSubcategories = [...new Set(stock.map(i => i.subcategory).filter(Boolean))];
    allSubcategories.forEach(sub => {
        const opt = document.createElement('option');
        opt.value = sub;
        opt.textContent = sub;
        select.appendChild(opt);
    });

    modal.classList.remove('hidden');

    document.getElementById('cancelSubcategoryAssignBtn').onclick = () => {
        modal.classList.add('hidden');
        renderGroupedBySubcategory();
    };

    document.getElementById('saveSubcategoryAssignBtn').onclick = async () => {
        const selected = select.value.trim();
        const newSub = input.value.trim();
        const subcategory = newSub || selected;

        if (!subcategory) {
            showMessageModal(translate('selectOrEnterSubcategory') || 'Please select or enter a subcategory name.');
            return;
        }

        const item = stock.find(i => i.name === itemName);
        if (!item) return;

        item.subcategory = subcategory;

        // Save to backend
        try {
            await fetch(`${API_BASE}/api/stock`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(item)
            });

            showMessageModal(`"${subcategory}" ${translate('assignedTo') || 'assigned to'} "${itemName}".`);
            modal.classList.add('hidden');
            await loadStock();
            renderGroupedBySubcategory();
        } catch (err) {
            console.error(err);
            showMessageModal(translate('failedAssignSubcategory') || 'Failed to assign subcategory.');
        }
    };
}

window.showSubcategoryAnalyticsModal = async function (subcat) {
    try {
        currentSubcategory = subcat;
        currentYear = new Date().getFullYear(); // Reset to current year
        
        // Show loading state
        const modal = document.getElementById('subcategoryAnalyticsModal');
        const content = document.getElementById('modalContent');
        
        modal.classList.remove('hidden');
        setTimeout(() => {
            content.classList.remove('scale-95', 'opacity-0');
            content.classList.add('scale-100', 'opacity-100');
        }, 10);

        // Load initial data for current year
        await loadYearData();

    } catch (error) {
        console.error('Error loading subcategory analytics:', error);
        showMessageModal(translate('failedToLoadData') || 'Failed to load analytics data', 'error');
    }
};

async function loadYearData() {
    try {
        // Update year display
        document.getElementById('currentYearDisplay').textContent = currentYear;
        
        // Load data for the selected year
        await Promise.all([
            loadSalesForYear(currentYear),
            loadStock(),
            loadStockHistory()
        ]);

        const itemsInSub = stock.filter(i => i.subcategory === currentSubcategory);
        const salesInSub = sales.filter(s =>
            itemsInSub.some(i => i.name.toLowerCase() === s.productName.toLowerCase())
        );
        const historyInSub = stockHistory.filter(h =>
            itemsInSub.some(i => i.name === h.itemName)
        );

        // Update title and metadata
        document.getElementById('subcategoryAnalyticsTitle').textContent = 
            `${currentSubcategory} - ${currentYear}`;
        document.getElementById('subcategoryMeta').textContent = 
            `${itemsInSub.length} ${translate('common.items') || 'items'} • ${salesInSub.length} ${translate('salesTransactions') || 'sales transactions'}`;

        // Update summary cards
        updateSummaryCards(itemsInSub, salesInSub);

        // Update insights
        updateInsights(itemsInSub, salesInSub, historyInSub);

        // Update chart
        updateChart(itemsInSub, salesInSub);

        // Update table
        updateTable(itemsInSub, salesInSub, historyInSub);
                      const checkInterval = setInterval(() => {
            checkCancelled();
        }, 100);
          resetCancellation();
        clearInterval(checkInterval);
        

        checkCancelled();
        
        hideLoading();
        // Update last updated time
        document.getElementById('lastUpdatedTime').textContent = 
            new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      
    } catch (error) {
        console.error('Error loading year data:', error);
        showMessageModal(translate('failedToLoadYearData') || 'Failed to load year data', 'error');
    }
}

function changeYear(direction) {
      showLoading();
if (isCancelled) return;

    if (direction === 'prev') {
        currentYear--;
    } else if (direction === 'next') {
        currentYear++;
    }
 
    // Prevent going too far into the future
    const currentYearNow = new Date().getFullYear();
    if (currentYear > currentYearNow) {
        currentYear = currentYearNow;
        showMessageModal(translate('cannotViewFutureYears') || 'Cannot view future years', 'info');
        return;
    }

    // Prevent going too far into the past (optional limit)
    if (currentYear < 2000) {
        currentYear = 2000;
        showMessageModal(translate('dataOnlyAvailableFrom2000') || 'Data only available from 2000', 'info');
        return;
    }
    
    loadYearData();
}

function updateSummaryCards(items, sales) {
    // Total Items
    document.getElementById('totalItemsCount').textContent = items.length;

    // Total Sales
    document.getElementById('totalSalesCount').textContent = sales.length;

    // Total Revenue - Robust version
    let totalRevenue = 0;
    let validSales = 0;
    let invalidSales = [];
    
    sales.forEach(sale => {
        const amount = Number(sale.totalAmount);
        
        if (!isNaN(amount) && amount > 0) {
            totalRevenue += amount;
            validSales++;
        } else {
            invalidSales.push({
                product: sale.productName,
                totalAmount: sale.totalAmount,
                price: sale.price,
                quantity: sale.quantity
            });
        }
    });
    
    // Log validation info
    console.log(`Valid sales: ${validSales}/${sales.length}`);
    if (invalidSales.length > 0) {
        console.warn('Invalid sales found:', invalidSales);
    }
    
    document.getElementById('totalRevenue21').textContent = formatCurrency(totalRevenue);
    
    // Also update the items count in the table section
    document.getElementById('itemsCount').textContent = `${items.length} ${translate('common.items') || 'items'} • ${translate('common.revenue') || 'Revenue'}: ${formatCurrency(totalRevenue)}`;
}

function updateInsights(items, sales, history) {
    const insights = [];
    const insightsContainer = document.getElementById('subcategoryInsights');
    
    // Best selling item
    let bestSelling = { name: 'N/A', count: 0 };
    let worstSelling = { name: 'N/A', count: Infinity };
    let totalStockValue = 0;
    
    items.forEach(item => {
        const salesCount = sales.filter(s => 
            s.productName.toLowerCase() === item.name.toLowerCase()
        ).length;
        
        if (salesCount > bestSelling.count) {
            bestSelling = { name: item.name, count: salesCount };
        }
        
        if (salesCount < worstSelling.count) {
            worstSelling = { name: item.name, count: salesCount };
        }
        
        totalStockValue += (item.price || 0) * (item.quantity || 0);
    });

    insights.push(`
        <div class="flex items-start space-x-3">
            <div class="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <svg class="w-4 h-4 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 10l7-7m0 0l7 7m-7-7v18"/>
                </svg>
            </div>
            <div>
                <p class="font-medium text-gray-800 dark:text-gray-100">${translate('topPerformer') || 'Top Performer'}</p>
                <p class="text-sm text-gray-600 dark:text-gray-300">${bestSelling.name} (${bestSelling.count} ${translate('sales') || 'sales'})</p>
            </div>
        </div>
    `);

    insights.push(`
        <div class="flex items-start space-x-3">
            <div class="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                <svg class="w-4 h-4 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 14l-7 7m0 0l-7-7m7 7V3"/>
                </svg>
            </div>
            <div>
                <p class="font-medium text-gray-800 dark:text-gray-100">${translate('lowestSelling') || 'Lowest Selling'}</p>
                <p class="text-sm text-gray-600 dark:text-gray-300">${worstSelling.count === Infinity ? 'N/A' : `${worstSelling.name} (${worstSelling.count} ${translate('sales') || 'sales'})`}</p>
            </div>
        </div>
    `);

    // Stock status
    const lowStockItems = items.filter(i => i.quantity < 3).length;
    const outOfStockItems = items.filter(i => i.quantity === 0).length;
    
    insights.push(`
        <div class="flex items-start space-x-3">
            <div class="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                <svg class="w-4 h-4 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.998-.833-2.732 0L4.346 16.5c-.77.833.192 2.5 1.732 2.5z"/>
                </svg>
            </div>
            <div>
                <p class="font-medium text-gray-800 dark:text-gray-100">${translate('stockAlerts') || 'Stock Alerts'}</p>
                <p class="text-sm text-gray-600 dark:text-gray-300">
                    ${lowStockItems} ${translate('lowStock') || 'low stock'}, ${outOfStockItems} ${translate('outOfStock') || 'out of stock'}
                </p>
            </div>
        </div>
    `);

    // Inventory value
    insights.push(`
        <div class="flex items-start space-x-3">
            <div class="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <svg class="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
            </div>
            <div>
                <p class="font-medium text-gray-800 dark:text-gray-100">${translate('inventoryValue') || 'Inventory Value'}</p>
                <p class="text-sm text-gray-600 dark:text-gray-300">${formatCurrency(totalStockValue)}</p>
            </div>
        </div>
    `);

    insightsContainer.innerHTML = insights.join('');
}

function updateChart(items, sales) {
    const ctx = document.getElementById('subcategoryAnalyticsChart');
    
    // Sort items by sales performance
    const itemPerformance = items.map(item => {
        const salesCount = sales.filter(s => 
            s.productName.toLowerCase() === item.name.toLowerCase()
        ).length;
        return {
            name: item.name,
            sales: salesCount,
            revenue: salesCount * (item.price || 0)
        };
    }).sort((a, b) => b.sales - a.sales);

    // Take top 10 items for better readability
    const topItems = itemPerformance.slice(0, 10);
    
    if (window.subcategoryChart) {
        window.subcategoryChart.destroy();
    }

    window.subcategoryChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: topItems.map(i => i.name.length > 15 ? i.name.substring(0, 12) + '...' : i.name),
            datasets: [{
                label: translate('salesCount') || 'Sales Count',
                data: topItems.map(i => i.sales),
                backgroundColor: 'rgba(99, 102, 241, 0.8)',
                borderColor: 'rgb(99, 102, 241)',
                borderWidth: 1,
                borderRadius: 6,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const item = topItems[context.dataIndex];
                            return [
                                `${translate('sales') || 'Sales'}: ${item.sales}`,
                                `${translate('common.revenue') || 'Revenue'}: ${formatCurrency(item.revenue)}`
                            ];
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    },
                    ticks: {
                        stepSize: 1
                    }
                },
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        maxRotation: 45
                    }
                }
            }
        }
    });
}

function updateTable(items, sales, history) {
    const tbody = document.getElementById('subcategoryAnalyticsTable');
    const itemsCount = document.getElementById('itemsCount');
    
    // Calculate total revenue for the subcategory
    const totalRevenue = sales.reduce((sum, sale) => 
        sum + (Number(sale.totalAmount) || 0), 0
    );
    
    itemsCount.textContent = `${items.length} ${translate('common.items') || 'items'} • ${formatCurrency(totalRevenue)} ${translate('totalRevenue') || 'total revenue'}`;
    
    tbody.innerHTML = items.map(item => {
        // Filter sales for this specific item
        const itemSales = sales.filter(s => 
            s.productName.toLowerCase() === item.name.toLowerCase()
        );
        
        // Calculate item-specific metrics
        const salesCount = itemSales.length;
        const revenue = itemSales.reduce((sum, sale) => 
            sum + (Number(sale.totalAmount) || 0), 0
        );
        
        const isRestockAction = (action) => {
            if (!action) return false;
            const norm = action.trim().toLowerCase();
            return norm === 'restocked' ||
                   norm === 'quantity_added' ||
                   norm === 'new_item_purchased' ||
                   norm.includes('restock');
        };
        
        const lastRestock = history
            .filter(h => h.itemName === item.name && isRestockAction(h.action))
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];
        // Determine stock status
        let status = {
            text: translate('inStock') || 'In Stock',
            class: 'bg-green-100 text-base'
        };
        
        if (item.quantity === 0) {
            status = {
                text: translate('outOfStock') || 'Out of Stock',
                class: 'bg-red-100 text-base'
            };
        } else if (item.quantity < 3) {
            status = {
                text: translate('lowStock') || 'Low Stock',
                class: 'bg-yellow-100 text-base'
            };
        }

        return `
            <tr class="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                <td class="py-3 px-4">
                    <div class="font-medium text-gray-900 dark:text-gray-100">${item.name}</div>
                    <div class="text-xs text-gray-500 dark:text-gray-400">${item.category || translate('common.uncategorized') || 'Uncategorized'}</div>
                </td>
                <td class="py-3 px-4">
                    <div class="flex items-center">
                        <div class="w-16 bg-gray-200 dark:bg-gray-700 rounded-full h-2 mr-3">
                            <div class="bg-blue-600 h-2 rounded-full" 
                                 style="width: ${Math.min((item.quantity / 20) * 100, 100)}%"></div>
                        </div>
                        <span class="font-medium">${item.quantity}</span>
                    </div>
                </td>
                <td class="py-3 px-4 font-medium">${formatCurrency(item.price)}</td>
                <td class="py-3 px-4">
                    <div class="font-medium">${salesCount}</div>
                    <div class="text-xs text-gray-500">${salesCount > 0 ? `${((salesCount / sales.length) * 100).toFixed(1)}% ${translate('ofTotal') || 'of total'}` : ''}</div>
                </td>
                <td class="py-3 px-4 font-medium">${formatCurrency(revenue)}</td>
                <td class="py-3 px-4 text-sm">${lastRestock ? formatDate(lastRestock.timestamp) : translate('never') || 'Never'}</td>
                <td class="py-3 px-4">
                    <span class="px-2 py-1 text-xs font-medium rounded-full ${status.class}">
                        ${status.text}
                    </span>
                </td>
            </tr>
        `;
    }).join('');
}

window.closeSubcategoryAnalyticsModal = function () {
    const modal = document.getElementById('subcategoryAnalyticsModal');
    const content = document.getElementById('modalContent');
    
    content.classList.remove('scale-100', 'opacity-100');
    content.classList.add('scale-95', 'opacity-0');
    
    setTimeout(() => {
        modal.classList.add('hidden');
        if (window.subcategoryChart) {
            window.subcategoryChart.destroy();
        }
    }, 300);
};

// Helper function for date formatting
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });
}

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !document.getElementById('subcategoryAnalyticsModal').classList.contains('hidden')) {
        closeSubcategoryAnalyticsModal();
    }
});

async function showSubcategoryHistoryModal(subcategoryName, year) {
    try {
        await loadSalesForYear(year);
        await loadStock();
        await loadStockHistory();

        const itemsInSub = stock.filter(i => i.subcategory === subcategoryName);
        if (itemsInSub.length === 0) {
            showMessageModal(translate('no_items_in_subcategory') || 'No items found in this subcategory.');
            return;
        }

        const salesInSub = sales.filter(sale =>
            itemsInSub.some(item => item.name.toLowerCase() === sale.productName.toLowerCase())
        );

        const historyInSub = stockHistory.filter(entry =>
            itemsInSub.some(item => item.name === entry.itemName)
        );

        // --- Identify items with zero sales ---
        const itemsWithSales = new Set(salesInSub.map(s => s.productName.toLowerCase()));
        const itemsNotSold = itemsInSub.filter(item => !itemsWithSales.has(item.name.toLowerCase()));
        // -------------------------------------

        const isRestockAction = (action) => {
            if (!action) return false;
            const norm = action.trim().toLowerCase();
            return norm === 'restocked' ||
                   norm === 'quantity_added' ||
                   norm === 'new_item_purchased' ||
                   norm.includes('restock');
        };

        const combinedEvents = [];

        salesInSub.forEach(sale => {
            combinedEvents.push({
                date: new Date(sale.dateSold || sale.timestamp),
                type: 'sale',
                quantity: parseInt(sale.quantity) || 0,
                total: parseFloat(sale.totalAmount) || 0,
                paymentType: sale.paymentType || translate('unknown'),
                customerName: sale.customerName || translate('n_a'),
                productName: sale.productName
            });
        });

        historyInSub.forEach(entry => {
            if (!isRestockAction(entry.action)) return;
            let quantity = 0;
            if (entry.quantityChange) {
                const match = entry.quantityChange.match(/\+?(\d+)/);
                quantity = match ? parseInt(match[1]) : 0;
            }
            if (quantity === 0) return;
            combinedEvents.push({
                date: new Date(entry.timestamp),
                type: 'restock',
                quantity: quantity,
                action: entry.action || translate('restocked'),
                by: entry.username || translate('system'),
                productName: entry.itemName
            });
        });

        combinedEvents.sort((a, b) => b.date - a.date);

        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay adaptive-modal';
        overlay.id = 'subcategoryHistoryModal';

        let innerHtml = `
            <div class="modal-content text-white">
                <div class="flex justify-between items-start mb-6">
                    <div>
                        <h2 class="text-2xl font-bold text-white">${escapeHtml(subcategoryName)}</h2>
                        <p class="text-gray-400 text-sm">${translate('combined_activity_history') || 'Combined Activity History'} — ${year}</p>
                    </div>
                    <button class="closeSubcatHistoryBtn p-2 hover:bg-white/10 rounded-full transition-colors">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12"/></svg>
                    </button>
                </div>
        `;

        // --- Add "Not Sold This Year" section if any items have zero sales ---
        if (itemsNotSold.length > 0) {
            innerHtml += `
                <div class="mb-6 p-4 bg-yellow-900/30 border border-yellow-700 rounded-lg">
                    <div class="flex items-center gap-2 mb-2">
                        <svg class="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.998-.833-2.732 0L4.346 16.5c-.77.833.192 2.5 1.732 2.5z"/>
                        </svg>
                        <h3 class="text-yellow-300 font-semibold">${translate('items_not_sold_this_year') || 'Items not sold this year'}</h3>
                    </div>
                    <div class="flex flex-wrap gap-2">
                        ${itemsNotSold.map(item => `
                            <span class="px-2 py-1 bg-yellow-800/50 text-yellow-200 text-xs rounded-full">${escapeHtml(item.name)}</span>
                        `).join('')}
                    </div>
                </div>
            `;
        } else if (combinedEvents.length === 0) {
            innerHtml += `<div class="text-center py-8 text-gray-400">${translate('no_activity_for_subcategory') || 'No sales or stock movements found for this period.'}</div>`;
        }
        // -----------------------------------------

        if (combinedEvents.length > 0) {
            innerHtml += `
                <div class="overflow-x-auto max-h-96">
                    <table class="min-w-full divide-y divide-gray-700">
                        <thead class="bg-gray-800 sticky top-0">
                            <tr>
                                <th class="px-4 py-3 text-base text-left text-xs font-medium uppercase">${translate('date')}</th>
                                <th class="px-4 py-3 text-base text-left text-xs font-medium uppercase">${translate('item')}</th>
                                <th class="px-4 py-3 text-base text-left text-xs font-medium uppercase">${translate('type')}</th>
                                <th class="px-4 py-3 text-base text-left text-xs font-medium uppercase">${translate('quantity')}</th>
                                <th class="px-4 py-3 text-base text-left text-xs font-medium uppercase">${translate('details')}</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-gray-700">
            `;

            combinedEvents.forEach(event => {
                const dateStr = event.date.toLocaleDateString();
                const timeStr = event.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                const productName = event.productName || '—';

                if (event.type === 'sale') {
                    innerHtml += `
                        <tr class="hover:bg-gray-800/50">
                            <td class="px-4 py-3 whitespace-nowrap text-sm">
                                ${dateStr}<br><span class="text-xs text-gray-500">${timeStr}</span>
                            </td>
                            <td class="px-4 py-3 text-sm">${escapeHtml(productName)}</td>
                            <td class="px-4 py-3">
                                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-900 text-blue-200">
                                    💰 ${translate('sale')}
                                </span>
                            </td>
                            <td class="px-4 py-3 font-medium">${event.quantity}</td>
                            <td class="px-4 py-3 text-sm">
                                ${formatCurrency(event.total)} · ${event.paymentType}<br>
                                <span class="text-xs text-gray-400">${event.customerName !== translate('n_a') ? event.customerName : ''}</span>
                            </td>
                        </tr>
                    `;
                } else {
                    innerHtml += `
                        <tr class="hover:bg-gray-800/50">
                            <td class="px-4 py-3 whitespace-nowrap text-sm">
                                ${dateStr}<br><span class="text-xs text-gray-500">${timeStr}</span>
                            </td>
                            <td class="px-4 py-3 text-sm">${escapeHtml(productName)}</td>
                            <td class="px-4 py-3">
                                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-900 text-green-200">
                                    📦 ${translate('restock')}
                                </span>
                            </td>
                            <td class="px-4 py-3 font-medium">+${event.quantity}</td>
                            <td class="px-4 py-3 text-sm">${event.action}<br><span class="text-xs text-gray-400">${translate('by')}: ${event.by}</span></td>
                        </tr>
                    `;
                }
            });

            innerHtml += `
                        </tbody>
                    </table>
                </div>
                <div class="flex justify-end mt-6">
                    <button class="printSubcatHistoryBtn px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/></svg>
                        ${translate('print_report') || 'Print Report'}
                    </button>
                </div>
            `;
        }

        innerHtml += `</div>`;
        overlay.innerHTML = innerHtml;
        document.body.appendChild(overlay);

        const closeBtn = overlay.querySelector('.closeSubcatHistoryBtn');
        closeBtn.onclick = () => overlay.remove();
        overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };

        const printBtn = overlay.querySelector('.printSubcatHistoryBtn');
        if (printBtn) {
            printBtn.onclick = () => {
                const printableDiv = document.createElement('div');
                printableDiv.className = 'print-history-content';
                printableDiv.innerHTML = `
                    <div style="text-align:center; margin-bottom:30px;">
                        <h2 style="font-size:24px; font-weight:bold;">${escapeHtml(subcategoryName)}</h2>
                        <h3 style="font-size:18px;">${translate('combined_activity_history') || 'Combined Activity History'} — ${year}</h3>
                    </div>
                    ${itemsNotSold.length > 0 ? `<div style="margin-bottom:20px;"><strong>${translate('items_not_sold_this_year') || 'Items not sold this year'}:</strong> ${itemsNotSold.map(i => i.name).join(', ')}</div>` : ''}
                    ${overlay.querySelector('table') ? overlay.querySelector('table').cloneNode(true).outerHTML : '<p>No activity recorded.</p>'}
                    <div style="margin-top:20px; text-align:center; font-size:12px;">
                        ${translate('generated_on') || 'Generated on'} ${new Date().toLocaleString()}
                    </div>
                `;
                showPrintPreviewModal(printableDiv, 'subcategory-history', null, {
                    subcategory: subcategoryName,
                    year: year
                });
                overlay.remove();
            };
        }

    } catch (error) {
        console.error('Error showing subcategory history modal:', error);
        showMessageModal(translate('failed_to_load_subcategory_history') || 'Could not load subcategory history.');
    }
}

// Helper: escape HTML to prevent XSS
function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}
document.getElementById('subcategoryAnalyticsModal').addEventListener('click', (e) => {
    if (e.target.id === 'subcategoryAnalyticsModal') {
        closeSubcategoryAnalyticsModal();
    }
});


// Add click listener for rows in the subcategory analytics table
document.getElementById('subcategoryAnalyticsTable')?.addEventListener('click', (e) => {
    const row = e.target.closest('tr');
    if (row && row.cells.length > 0) {
        // Use the currently selected subcategory and year (global variables in subcat.js)
        if (currentSubcategory && currentYear) {
            showSubcategoryHistoryModal(currentSubcategory, currentYear);
        } else {
            console.warn('Missing currentSubcategory or currentYear');
            showMessageModal(translate('unable_to_load_history') || 'Unable to load history.');
        }
    }
});

