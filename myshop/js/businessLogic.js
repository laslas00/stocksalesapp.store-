
function getSaleAmount(sale) {
    return sale.paymentType === 'mixed payment' ? sale.amountPaid : sale.price;
}
function getLoanPaid(loan) {
    return (loan.payments || []).reduce((sum, p) => sum + Number(p.amount || 0), 0);
}
function parseStockTimestamp(timestamp) {
    if (!timestamp) return new Date(NaN);
    
    // Normalize the timestamp string
    const ts = timestamp.trim()
        .replace(/,/g, '') // Remove commas
        .replace(/\s+/g, ' ') // Normalize spaces
        .replace(/(\d{1,2})\/(\d{1,2})\/(\d{4})/, '$1/$2/$3'); // Ensure proper date format

    // Try DD/MM/YYYY HH:mm:ss format
    const dd_mm_yyyy = /^(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2}):(\d{2})$/;
    const dd_mm_yyyy_match = ts.match(dd_mm_yyyy);
    if (dd_mm_yyyy_match) {
        return new Date(
            `${dd_mm_yyyy_match[3]}-${dd_mm_yyyy_match[2]}-${dd_mm_yyyy_match[1]}T${dd_mm_yyyy_match[4]}:${dd_mm_yyyy_match[5]}:${dd_mm_yyyy_match[6]}`
        );
    }

    // Try M/D/YYYY H:mm:ss format (24-hour)
    const m_d_yyyy_24h = /^(\d{1,2})\/(\d{1,2})\/(\d{4}) (\d{1,2}):(\d{2}):(\d{2})$/;
    const m_d_yyyy_24h_match = ts.match(m_d_yyyy_24h);
    if (m_d_yyyy_24h_match) {
        return new Date(
            `${m_d_yyyy_24h_match[3]}-${m_d_yyyy_24h_match[1].padStart(2, '0')}-${m_d_yyyy_24h_match[2].padStart(2, '0')}T${m_d_yyyy_24h_match[4].padStart(2, '0')}:${m_d_yyyy_24h_match[5]}:${m_d_yyyy_24h_match[6]}`
        );
    }

    // Try M/D/YYYY, H:mm:ss AM/PM format
    const m_d_yyyy_ampm = /^(\d{1,2})\/(\d{1,2})\/(\d{4}) (\d{1,2}):(\d{2}):(\d{2}) ([AP]M)$/i;
    const m_d_yyyy_ampm_match = ts.match(m_d_yyyy_ampm);
    if (m_d_yyyy_ampm_match) {
        let hours = parseInt(m_d_yyyy_ampm_match[4], 10);
        if (m_d_yyyy_ampm_match[7].toUpperCase() === 'PM' && hours < 12) hours += 12;
        if (m_d_yyyy_ampm_match[7].toUpperCase() === 'AM' && hours === 12) hours = 0;
        
        return new Date(
            `${m_d_yyyy_ampm_match[3]}-${m_d_yyyy_ampm_match[1].padStart(2, '0')}-${m_d_yyyy_ampm_match[2].padStart(2, '0')}T${hours.toString().padStart(2, '0')}:${m_d_yyyy_ampm_match[5]}:${m_d_yyyy_ampm_match[6]}`
        );
    }

    // Fallback to native Date parsing
    return new Date(ts);
}
    function formatDate(dateString) {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
}
    function aggregateWeeklySales() {
        const weeklySalesMap = new Map(); 

        sales.forEach(sale => {
            const saleDate = new Date(sale.dateSold);
            const dayOfWeek = saleDate.getDay(); // 0 for Sunday, 1 for Monday, etc.
            const weekStartDate = new Date(saleDate);
            weekStartDate.setDate(saleDate.getDate() - dayOfWeek); // Go back to Sunday
            weekStartDate.setHours(0, 0, 0, 0); // Normalize to start of day

            const weekKey = weekStartDate.toISOString().split('T')[0]; // YYYY-MM-DD format for key

            const saleAmount =  sale.price;

            if (weeklySalesMap.has(weekKey)) {
                weeklySalesMap.set(weekKey, weeklySalesMap.get(weekKey) + saleAmount);
            } else {
                weeklySalesMap.set(weekKey, saleAmount);
            }
        });

        // Convert map to array of objects and sort by week
        const aggregatedData = Array.from(weeklySalesMap, ([week, totalSales]) => ({ week, totalSales }));
        aggregatedData.sort((a, b) => new Date(a.week) - new Date(b.week));

        return aggregatedData;
    }
    
    function aggregateMonthlySales() {
    const monthlySalesMap = new Map(); // Map to store sales by month (key: YYYY-MM)

    sales.forEach(sale => {
        const saleDate = new Date(sale.dateSold);
        const monthKey = `${saleDate.getFullYear()}-${String(saleDate.getMonth() + 1).padStart(2, '0')}`;

        const saleAmount =  sale.price;

        if (monthlySalesMap.has(monthKey)) {
            monthlySalesMap.set(monthKey, monthlySalesMap.get(monthKey) + saleAmount);
        } else {
            monthlySalesMap.set(monthKey, saleAmount);
        }
    });

    // Convert map to array of objects and sort by month
    const aggregatedData = Array.from(monthlySalesMap, ([month, totalSales]) => ({ month, totalSales }));
    aggregatedData.sort((a, b) => new Date(a.month + '-01') - new Date(b.month + '-01')); // Sort by full date for correct order

    return aggregatedData;
}
function updateLowStockAlert() {
        const lowStockItems = stock.filter(item => item.type === 'product' && item.quantity < 2 && item.hasBeenSold);
        
        if (lowStockItems.length > 0) {
            lowStockDot.classList.remove('hidden');
        } else {
            lowStockDot.classList.add('hidden');
        }
        const counter = document.getElementById('lowStockCounter');
        if (counter) {
            if (lowStockItems.length > 0) {
                counter.textContent = lowStockItems.length;
                counter.classList.remove('hidden');
            } else {
                counter.classList.add('hidden');
            }
        }
    }
    function getPaymentTypeText(sale) {
    let paymentTypeText = sale.paymentType;
    if (sale.paymentType === 'mixed payment' && sale.hybridBreakdown?.credit > 0) {
        paymentTypeText += ` (Credit: ${formatCurrency(sale.hybridBreakdown.credit)})`;
    }
    return paymentTypeText;
}

    function generateQRCodeData(text, size = 220) {
  try {
    const qr = new QRious({
      value: text,
      size: size,
      level: 'M'
    });
    return qr.toDataURL(); 
  } catch (e) {
    console.error("QR generation failed:", e);
    return null;
  }
}

async function addItem() {
    const productName = productNameInput.value.trim();
    const quantity = parseInt(quantityInput.value, 10);
    const price = parseFloat(priceInput.value);
    const selectedType = document.querySelector('input[name="itemType"]:checked').value;
    const imageFile = itemImageInput.files[0];
    const dateAdded = new Date().toLocaleString('fr-FR');
    const category = categoryInput.value.trim();
    const costPrice = parseFloat(costPriceInput.value);
    const taxRate = parseFloat(document.getElementById('taxRate').value) || 0;
    const subcategory = document.getElementById('subcategoryInput').value.trim();

    // ✅ Basic validation with translations
    if (productName === '') {
        showMessageModal(translations[currentLanguage]?.enter_product_name || 'Please enter a product/service name.');
        return;
    }
    if (isNaN(quantity) || quantity <= 0) {
        showMessageModal(translations[currentLanguage]?.enter_valid_quantity || 'Please enter a valid quantity/units (a positive number).');
        return;
    }
    if (priceInput.value !== '' && (isNaN(price) || price < 0)) {
        showMessageModal(translations[currentLanguage]?.enter_valid_price || 'Please enter a valid price (a non-negative number).');
        return;
    }
    if (costPriceInput.value !== '' && (isNaN(costPrice) || costPrice < 0)) {
        showMessageModal(translations[currentLanguage]?.enter_valid_cost_price || 'Please enter a valid cost price (a non-negative number).');
        return;
    }

    // ✅ Check if item already exists - INFORM USER AND STOP
    const existingItemIndex = stock.findIndex(item => item.name.toLowerCase() === productName.toLowerCase());
    
    if (existingItemIndex > -1) {
        const existingItem = stock[existingItemIndex];
        const typeTranslation = translations[currentLanguage]?.[`item_type_${existingItem.type}`] || existingItem.type;
        
        showMessageModal(
            translations[currentLanguage]?.item_already_exists
                ?.replace('{product}', productName)
                ?.replace('{type}', typeTranslation)
                ?.replace('{quantity}', existingItem.quantity)
            || `"${productName}" already exists in stock as a ${typeTranslation} (Quantity: ${existingItem.quantity}). Please use a different name or use the "Increase Quantity" feature in the item details.`
        );
        return; // STOP here - don't add or update
    }

    // ✅ Process image upload for new product
    let imageUrl = null;
    if (selectedType === 'product' && imageFile) {
        const formData = new FormData();
        formData.append('image', imageFile);

        try {
            const uploadRes = await fetch(`${API_BASE}/api/upload-image`, {
                method: 'POST',
                body: formData
            });
            const uploadData = await uploadRes.json();
            if (!uploadRes.ok) throw new Error(uploadData.error || translations[currentLanguage]?.upload_failed || 'Upload failed');
            imageUrl = uploadData.url;
        } catch (error) {
            showMessageModal(translations[currentLanguage]?.failed_to_upload_image || 'Failed to upload image');
            console.error('Image upload error:', error);
            return;
        }
    }

    // ✅ Create new item (existing item check already passed)
    const newItem = {
        name: productName,
        quantity: quantity,
        initialQuantity: quantity, 
        price: isNaN(price) ? null : price,
        costPrice: isNaN(costPrice) ? null : costPrice,
        imageUrl: imageUrl,
        dateAdded: dateAdded,
        taxRate: taxRate,
        type: selectedType,
        category: category,
        subcategory: subcategory,
        username: currentUser ? currentUser.username : translations[currentLanguage]?.unknown_user || 'Unknown'
    };

    // ✅ Add to local array
    stock.push(newItem);

    // ✅ Save to backend
    try {
        const response = await fetch(`${API_BASE}/api/stock`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newItem)
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || translations[currentLanguage]?.add_item_failed || 'Failed to add item to stock');
        }

        // ✅ Add to stock history
        const typeTranslation = translations[currentLanguage]?.[`item_type_${selectedType}`] || selectedType;
        await addStockHistoryEntry({
            action: translations[currentLanguage]?.new_item_added_action || 'New Item Added',
            itemName: productName,
            quantityChange: `+${quantity}`,
             username: currentUser ? currentUser.username : translations[currentLanguage]?.unknown_user || 'Unknown',
            timestamp: new Date().toLocaleString('fr-FR')
        });

        // ✅ Show success message
        const successMessage = translations[currentLanguage]?.item_added_success
            ?.replace('{product}', productName)
            ?.replace('{type}', typeTranslation)
            || `"${productName}" (${selectedType}) successfully added to stock.`;
        
        showMessageModal(successMessage);

    } catch (error) {
        showMessageModal(error.message || translations[currentLanguage]?.add_item_failed || 'Failed to add item to stock');
        console.error('Error adding item to stock:', error);
        
        // Remove from local array if backend save failed
        const errorIndex = stock.findIndex(item => item.name.toLowerCase() === productName.toLowerCase());
        if (errorIndex > -1) {
            stock.splice(errorIndex, 1);
        }
        return;
    }

    // ✅ Reset form after success
    productNameInput.value = '';
    quantityInput.value = '';
    priceInput.value = '';
    itemImageInput.value = '';
    costPriceInput.value = '';
    categoryInput.value = '';
    subcategoryInput.value = '';

    document.querySelector('input[name="itemType"][value="product"]').checked = true;
    updateAddItemFormLabels();

    const preview = document.getElementById('itemImagePreview');
    const svgIcon = preview ? preview.previousElementSibling : null;
    if (preview) {
        preview.src = '';
        preview.classList.add('hidden');
    }
    if (svgIcon && svgIcon.tagName.toLowerCase() === 'svg') {
        svgIcon.style.display = '';
    }

    const uploadLabel = document.querySelector('label[for="itemImage"] span');
    if (uploadLabel) {
        uploadLabel.textContent = translations[currentLanguage]?.upload_file_label || 'Upload a file';
        uploadLabel.setAttribute('data-translate', 'upload_file_label');
     translateUI();
    }


    await clear251SaleForm();
    await loadStock();
    renderStock();
    updateLowStockAlert();
}
function clear251SaleForm() {
    // Get references to the input elements
    const productNameInput = document.getElementById('productNameInput');
    const quantityInput = document.getElementById('quantityInput');
    const priceInput = document.getElementById('priceInput');
    const itemImageInput = document.getElementById('itemImageInput');
    const costPriceInput = document.getElementById('costPriceInput');
    const categoryInput = document.getElementById('categoryInput');
    const subcategoryInput = document.getElementById('subcategoryInput');

    // Clear the values
    if (productNameInput) productNameInput.value = '';
    if (quantityInput) quantityInput.value = '';
    if (priceInput) priceInput.value = '';
    if (itemImageInput) itemImageInput.value = '';
    if (costPriceInput) costPriceInput.value = '';
    if (categoryInput) categoryInput.value = '';
    if (subcategoryInput) subcategoryInput.value = '';
}
function formatWithSpaces(value) {
    // Remove all non-digits except dot (for decimals)
    value = value.replace(/[^\d.]/g, '');
    // Split integer and decimal parts
    let parts = value.split('.');
    // Format integer part with spaces
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    // Join back with decimal if present
    return parts.length > 1 ? parts[0] + '.' + parts[1].slice(0,2) : parts[0];
}
function calculateRepaymentPossibility(loan, totalSalesSinceLoan) {
    const loanAmount = loan.amount;
    const ratio = totalSalesSinceLoan / loanAmount;
    let scoreText = '';
    let scoreClass = '';
    
    if (ratio < 0.5) {
        scoreText = 'Very Low 🙁';
        scoreClass = 'text-red-700';
    } else if (ratio < 1.0) {
        scoreText = 'Low 🟠';
        scoreClass = 'text-orange-600';
    } else if (ratio < 2.0) {
        scoreText = 'Medium 👍';
        scoreClass = 'text-yellow-600';
    } else {
        scoreText = 'super!you can pay back 🚀';
        scoreClass = 'text-green-600';
    }
    
    possibilityScoreDiv.innerHTML = `<span class="${scoreClass}">${scoreText}</span> <span class="text-sm text-gray-500">(${formatCurrency(totalSalesSinceLoan)} sales vs ${formatCurrency(loanAmount)} loan)</span>`;
}

