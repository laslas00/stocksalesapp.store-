    document.getElementById('stockSubcategoryFilter')?.addEventListener('change', renderStock);
       stockCategoryFilter.addEventListener('change', renderStock);
           searchItems.addEventListener('input', filterStock);
stockOptionBtn.addEventListener('click', () => {
    document.title = "StockApp* -> let take a look at the shop inventory item";
    showStockManagement();
});
       document.querySelectorAll('.back-to-options-btn').forEach(button => {
        button.addEventListener('click', showStockManagement); // Goes back to the stock options modal
    });
        async function showStockManagement() { 
            document.title = "StockApp* -> let take a look at the shop inventory item";
        hideHomeOverlay();
          cleanupMemory();
        salesManagementSection.classList.add('hidden');
        stockManagementSection.classList.remove('hidden');
        hideAllStockSubSections(); 
        hideAllSalesSubSections();
        salesOptionsModal.classList.add('hidden');
        stockOptionsModal.classList.remove('hidden'); 
         await loadStockTOSAVE(); 
         await loadSalesForYear(year);
        renderStock(); 
            const loanSection = document.getElementById('loanManagementSection');
    if (loanSection) {
        loanSection.classList.add('hidden');

    }
     }
    function filterStock() {
        const searchTerm = searchItems.value.toLowerCase().trim();
        if (searchTerm === '') {
            renderStock(stock);
        } else {
            const filteredItems = stock.filter(item =>
                item.name.toLowerCase().includes(searchTerm)
            );
            renderStock(filteredItems);
        }
    }
async function renderStock() {
    let searchValue = searchItems.value.trim().toLowerCase();
    let typeValue = stockTypeFilter.value;
    let categoryValue = stockCategoryFilter.value;
    let subcategoryValue = stockSubcategoryFilter.value;
    
    const base64Items = stock.filter(it => it.imageData && it.imageData.startsWith('data:image'));
    if (base64Items.length > 0) {
        console.log(`Found ${base64Items.length} old images to convert.`);
        showConvertProgressModal();

        for (let i = 0; i < base64Items.length; i++) {
            const item = base64Items[i];
            updateConvertProgress(i + 1, base64Items.length);

            try {
                const res = await fetch(`${API_BASE}/api/convert-single-image`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id: item.id || item.name })
                });

                const data = await res.json();
                if (data.success && data.url) {
                    // Replace imageData with imageUrl
                    item.imageUrl = data.url;
                    delete item.imageData;
                }
            } catch (err) {
                console.error(`Error converting image for ${item.name}:`, err);
            }
        }

        hideConvertProgressModal();
        showMessageModal(`✅ ${translate('stock.convertedImagesSuccess') || 'Converted'} ${base64Items.length} ${translate('stock.imagesSuccessfully') || 'images successfully.'}`);

        // Optional: reload stock after conversion to ensure fresh URLs
        await loadStockTOSAVE();
    }

    let filteredStock = stock.filter(item => {
        let matchesSearch = item.name.toLowerCase().includes(searchValue);
        let matchesType;

        if (typeValue === 'All') {
            matchesType = true;
        } else if (typeValue === 'low-stock') {
            matchesType = item.type === 'product' && item.quantity < 3 && item.hasBeenSold === true;
        } else if (typeValue === 'never-sold') {
            matchesType = item.type === 'product' && (item.hasBeenSold === false || !item.hasBeenSold);
        } else if (typeValue === 'normal-stock') {
            matchesType = item.type === 'product' && item.quantity >= 3;
        } else {
            matchesType = item.type === typeValue;
        }

        let matchesCategory = (categoryValue === 'All') || (item.category === categoryValue);
        let matchesSubcategory = (subcategoryValue === 'All') || (item.subcategory === subcategoryValue);

        return matchesSearch && matchesType && matchesCategory && matchesSubcategory;
    });

    stockTableBody.innerHTML = '';
    let grandTotalValue = 0;          // sum of price * quantity
    let grandTotalUnitPrice = 0;      // sum of price only (unit price)
    let overallRowNumber = 0;

    if (filteredStock.length === 0) {
        noItemsMessage.classList.remove('hidden');
        if (noItemsMessage) {
            noItemsMessage.textContent = translate('common.noItemsFound') || 'No items found.';
        }
    } else {
        noItemsMessage.classList.add('hidden');

        const groupedStock = filteredStock.reduce((acc, item) => {
            const category = item.category || '#';
            if (!acc[category]) {
                acc[category] = [];
            }
            acc[category].push(item);
            return acc;
        }, {});

        for (const categoryName in groupedStock) {
            const categoryRow = document.createElement('tr');
            categoryRow.classList.add('font-bold', 'text-gray-800', 'cursor-pointer', 'toggle-category-row');
            categoryRow.dataset.categoryName = categoryName;

            const categoryCell = document.createElement('td');
            categoryCell.colSpan = 10;
            categoryCell.classList.add('px-6', 'py-2', 'category-heading', 'bg-blue-200');
            categoryCell.style.position = 'relative';

            const toggleSpan = document.createElement('span');
            toggleSpan.textContent = '▼ ';
            toggleSpan.classList.add('toggle-icon', 'mr-2', 'transition-transform');
            toggleSpan.style.position = 'absolute';
            toggleSpan.style.left = '16px';
            toggleSpan.style.top = '50%';
            toggleSpan.style.color = 'green';
            toggleSpan.style.transform = 'translateY(-50%)';
            categoryCell.appendChild(toggleSpan);

            const categoryTitleSpan = document.createElement('span');
            categoryTitleSpan.textContent = categoryName;
            categoryTitleSpan.style.display = 'block';
            categoryTitleSpan.style.textAlign = 'center';
            categoryTitleSpan.style.fontWeight = 'bold';
            categoryTitleSpan.style.fontSize = '1.1rem';
            categoryTitleSpan.style.margin = '0 auto';
            categoryTitleSpan.style.pointerEvents = 'none';
            categoryCell.appendChild(categoryTitleSpan);

            categoryRow.appendChild(categoryCell);
            stockTableBody.appendChild(categoryRow);

            categoryRow.addEventListener('click', () => {
                const isHidden = toggleSpan.textContent === '▲ ';
                if (isHidden) {
                    toggleSpan.textContent = '▼ ';
                    toggleSpan.style.color = 'green';
                } else {
                    toggleSpan.textContent = '▲ ';
                    toggleSpan.style.color = 'red';
                }

                const itemRows = document.querySelectorAll(`tr[data-category="${categoryName}"]`);
                itemRows.forEach(row => {
                    row.classList.toggle('hidden');
                });
            });
            
            groupedStock[categoryName].forEach(item => {
                overallRowNumber++;
                const row = document.createElement('tr');
                row.dataset.category = categoryName;

                if (item.type === 'product' && item.quantity < 3 && item.hasBeenSold === true) {
                    row.classList.add('low-stock');
                }

                row.classList.add('hover:bg-gray-50');

                // --- ROW CLICK HANDLER (with animation) ---
                row.addEventListener('click', (event) => {
                    if (event.target.tagName === 'BUTTON') return;

                    row.classList.add('row-click-animation');

                    // Fallback: remove class after 3 seconds max, just in case
                    const timeoutId = setTimeout(() => {
                        row.classList.remove('row-click-animation');
                    }, 10000);

                    // Open modal
                    showItemDetailsModal(item, row).finally(() => {
                        clearTimeout(timeoutId);      // cancel fallback if modal already handled it
                    });
                });
                const numberCell = document.createElement('td');
                numberCell.classList.add('px-4', 'py-4', 'text-sm', 'text-black-800');
                numberCell.textContent = overallRowNumber;

                const nameCell = document.createElement('td');
                nameCell.classList.add('px-6', 'py-4', 'text-sm', 'font-medium', 'text-black-800');
                nameCell.textContent = item.name;

                const typeCell = document.createElement('td');
                typeCell.classList.add('px-6', 'py-4', 'text-sm', 'text-black-800');
                typeCell.textContent = item.type === 'product' 
                    ? translate('stock.productType') || 'Product' 
                    : translate('stock.serviceType') || 'Service';

                const subcategoryCell = document.createElement('td');
                subcategoryCell.classList.add('px-6', 'py-4', 'text-sm', 'text-black-800');
                subcategoryCell.textContent = item.subcategory || '—';

                const quantityCell = document.createElement('td');
                quantityCell.classList.add('px-6', 'py-4', 'text-sm', 'text-black-800');
                if (item.type === 'product' && item.quantity === 0 && item.hasBeenSold) {
                    quantityCell.textContent = translate('common.outOfStock') || 'Out of Stock';
                    quantityCell.classList.add('text-red-600', 'font-bold');
                } else {
                    quantityCell.textContent = item.quantity;
                }

                const priceCell = document.createElement('td');
                priceCell.classList.add('px-6', 'py-4', 'text-sm', 'text-black-800');
                priceCell.textContent = item.price ? `${formatCurrency(Math.round(item.price))}` : translate('n_a') || 'N/A';

                const totalPrice = (item.price && item.quantity) ? item.price * item.quantity : 0;
                grandTotalValue += totalPrice;
                if (item.price) grandTotalUnitPrice += item.price;   // sum of unit prices

                const totalPriceCell = document.createElement('td');
                totalPriceCell.classList.add('px-6', 'py-4', 'text-sm', 'font-semibold', 'text-black-800');
                totalPriceCell.textContent = item.price && item.quantity ? `${formatCurrency(Math.round(totalPrice))}` : translate('n_a') || 'N/A';

                const dateAddedCell = document.createElement('td');
                dateAddedCell.classList.add('px-6', 'py-4', 'text-sm', 'text-black-800');
                dateAddedCell.textContent = item.dateAdded || translate('n_a') || 'N/A';
        
                const margin = calculateProfitMargin(item.price, item.costPrice);
                const marginCell = document.createElement('td');
                marginCell.classList.add('px-6', 'py-4', 'text-sm', 'font-semibold', 'text-black-800', 'text-center');

                if (margin === null) {
                    marginCell.textContent = '—';
                    marginCell.classList.add('text-gray-500');
                } else {
                    const roundedMargin = Math.round(margin);
                    marginCell.textContent = `${roundedMargin}%`;
                    if (roundedMargin < 20) {
                        marginCell.classList.add('text-red-600', 'bg-red-50');
                    } else if (roundedMargin < 50) {
                        marginCell.classList.add('text-yellow-600', 'bg-yellow-50');
                    } else {
                        marginCell.classList.add('text-green-600', 'bg-green-50');
                    }
                }

                const actionsCell = document.createElement('td');
                actionsCell.classList.add('px-6', 'py-4', 'text-sm', 'text-gray-500');

                const deleteButton = document.createElement('button');
                deleteButton.textContent = translate('delete') || 'Delete';
                deleteButton.classList.add('bg-red-500', 'hover:bg-red-600', 'text-white', 'font-semibold', 'py-1', 'px-3', 'rounded-md', 'text-xs');
                deleteButton.addEventListener('click', (event) => {
                    event.stopPropagation();   // prevent row click
                    showConfirmationModal(
                        `${translate('confirmation.deleteItem') || 'Are you sure you want to delete'} "${item.name}" ${translate('confirmation.fromStock') || 'from stock'}?`, 
                        () => deleteItem(item.name)
                    );
                });
                actionsCell.appendChild(deleteButton);
                
                row.appendChild(numberCell);
                row.appendChild(nameCell);
                row.appendChild(typeCell);
                row.appendChild(subcategoryCell);
                row.appendChild(quantityCell);
                row.appendChild(priceCell);
                row.appendChild(totalPriceCell);
                row.appendChild(dateAddedCell);
                row.appendChild(marginCell);
                row.appendChild(actionsCell);
                stockTableBody.appendChild(row);
            });
        }
        
        // --- GRAND TOTAL ROW (inventory value) ---
        const totalRow = document.createElement('tr');
        totalRow.classList.add('font-bold', 'text-blue-900');
        const labelCell = document.createElement('td');
        labelCell.setAttribute('colspan', '5');
        labelCell.classList.add('px-6', 'py-4', 'text-right');
        labelCell.textContent = translate('stock.grandTotalValue') || 'Grand Total Value:';
        const valueCell = document.createElement('td');
        valueCell.classList.add('px-6', 'py-4', 'font-bold', 'text-blue-900');
        valueCell.textContent = `${formatCurrency(Math.round(grandTotalValue))}`;
        const emptyCell1 = document.createElement('td');
        const emptyCell2 = document.createElement('td');
        totalRow.appendChild(labelCell);
        totalRow.appendChild(valueCell);
        totalRow.appendChild(emptyCell1);
        totalRow.appendChild(emptyCell2);
        stockTableBody.appendChild(totalRow);
    }

    updateLowStockAlert();
    updateCategoryFilterOptions();
    updateSubcategoryFilterOptions();
}
    let categoryDropdown = document.getElementById('categoryDropdown');
    if (!categoryDropdown) {
        categoryDropdown = document.createElement('div');
        categoryDropdown.id = 'categoryDropdown';
        categoryDropdown.style.position = 'absolute';
        categoryDropdown.style.background = '#fff';
        categoryDropdown.style.border = '1px solid #ccc';
        categoryDropdown.style.borderRadius = '0.375rem';
        categoryDropdown.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)';
        categoryDropdown.style.zIndex = '1000';
        categoryDropdown.style.display = 'none';
        categoryDropdown.style.maxHeight = '20px';
        categoryDropdown.style.overflowY = 'auto';
        categoryInput.parentNode.appendChild(categoryDropdown);
        categoryInput.style.position = 'relative';
    }

    // 2. Helper to get unique categories
    function getAllCategories() {
        return [...new Set(stock.map(item => item.category).filter(Boolean))];
    }

    // 3. Show dropdown on focus or input
    categoryInput.addEventListener('focus', showCategoryDropdown);
    categoryInput.addEventListener('input', showCategoryDropdown);

    function showCategoryDropdown() {
        const categories = getAllCategories();
        const filter = categoryInput.value.toLowerCase();
        const filtered = categories.filter(cat => cat.toLowerCase().includes(filter));
        if (filtered.length === 0) {
            categoryDropdown.style.display = 'none';
            return;
        }
        categoryDropdown.innerHTML = filtered.map(cat =>
            `<div style="padding:8px 12px;cursor:pointer;" class="hover:bg-blue-100" data-value="${cat}">${cat}</div>`
        ).join('');
        // Position dropdown below input
        const rect = categoryInput.getBoundingClientRect();
        categoryDropdown.style.top = (categoryInput.offsetTop + categoryInput.offsetHeight) + 'px';
        categoryDropdown.style.left = categoryInput.offsetLeft + 'px';
        categoryDropdown.style.width = categoryInput.offsetWidth + 'px';
        categoryDropdown.style.maxHeight = '200px'; // Show only 5 items (5 x 40px)
        categoryDropdown.style.overflowY = 'auto';
        categoryDropdown.style.display = 'block';
    }

    // 4. Click on dropdown item
    categoryDropdown.addEventListener('mousedown', function(e) {
        if (e.target && e.target.dataset.value) {
            categoryInput.value = e.target.dataset.value;
            categoryDropdown.style.display = 'none';
        }
    });

    // 5. Hide dropdown when clicking outside
    document.addEventListener('mousedown', function(e) {
        if (!categoryInput.contains(e.target) && !categoryDropdown.contains(e.target)) {
            categoryDropdown.style.display = 'none';
        }
    });
    let debounceTimer;

searchItems.addEventListener('input', async () => {
    clearTimeout(debounceTimer);
    
    debounceTimer = setTimeout(async () => {
          stock = [];
        await loadStockTOSAVE();
        renderStock();
    }, 300); // 300ms delay
});
    async function deleteItem(itemName) {
        if (!currentUser || currentUser.role !== 'administrator') {
    showMessageModal(translations[currentLanguage].onlyAdminsCanDeleteStockItems || 'Only administrators can delete stock items.');
    return;
        }
    try {
        const response = await fetch(`${API_BASE}/api/stock/${encodeURIComponent(itemName)}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to delete item from stock.');
        }

        // Log to stock history after successful deletion
        await addStockHistoryEntry({
            action: 'Item Deleted',
            itemName: itemName,
            quantityChange: 'item removed ', // No quantity change, item removed
             username: currentUser ? currentUser.username : translations[currentLanguage]?.unknown_user || 'Unknown',
            timestamp: new Date().toLocaleString('fr-FR')
        });

    showMessageModal(`"${itemName}" ` + (translations[currentLanguage].deletedFromStock || 'has been deleted from stock.'));
        await loadStock(); // Reload stock from backend
        await loadStockHistory(); // Reload history from backend
        renderStock(); // Re-render stock table
        renderStockHistory(); // Re-render history table
        updateLowStockAlert(); // Update low stock alert
    } catch (error) {
        console.error('Error deleting item:', error);
        showMessageModal(error.message || (translations[currentLanguage].failedToDeleteItem || 'Failed to delete item from stock.'));
    }
}
   function updateSubcategoryFilterOptions() {
        const subcategories = [...new Set(
            stock
                .map(item => item.subcategory)
                .filter(Boolean) 
        )].sort();
        const select = document.getElementById('stockSubcategoryFilter');
        if (!select) return;
        select.innerHTML = '<option value="All">All Subcategories</option>';
        subcategories.forEach(sc => {
            const opt = document.createElement('option');
            opt.value = sc;
            opt.textContent = sc;
            select.appendChild(opt);
        });
    }
