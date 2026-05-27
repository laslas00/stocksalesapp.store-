
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
    
    // Update sidebar indicator (NEW)
    const sidebarLowStockDot = document.getElementById('sidebar-lowStockDot');
    if (lowStockItems.length > 0) {
        if (sidebarLowStockDot) sidebarLowStockDot.classList.remove('hidden');
    } else {
        if (sidebarLowStockDot) sidebarLowStockDot.classList.add('hidden');
    }
    
    // Update counter
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
    const dateAdded = new Date().toISOString();
    const category = categoryInput.value.trim();
    const costPrice = parseFloat(costPriceInput.value);
    const taxRate = parseFloat(document.getElementById('taxRate').value) || 0;
    const subcategory = document.getElementById('subcategoryInput').value.trim();

    // ========== GET USER & BUSINESS INFO (MULTI-TENANT) ==========
    const currentUserId = currentUser?.id || localStorage.getItem('currentUserId') || 'unknown';
    const currentUsername = currentUser?.username || localStorage.getItem('currentUsername') || 'Unknown';
    
    // Get business ID from multiple sources (most reliable first)
    const businessId = currentUser?.business_id || 
                       businessInfo?.id || 
                       localStorage.getItem('businessId') || 
                       null;
    
    console.log('🔍 addItem DEBUG:', {
        currentUserId,
        currentUsername,
        businessId,
        source: currentUser?.business_id ? 'currentUser.business_id' : 
                businessInfo?.id ? 'businessInfo.id' : 
                localStorage.getItem('businessId') ? 'localStorage' : 'none'
    });

    // ✅ Basic validation
    if (productName === '') {
        showMessageModal(translations[currentLanguage]?.enter_product_name || 'Please enter a product/service name.');
        return;
    }
    if (isNaN(quantity) || quantity <= 0) {
        showMessageModal(translations[currentLanguage]?.enter_valid_quantity || 'Please enter a valid quantity (a positive number).');
        return;
    }
    if (priceInput.value !== '' && (isNaN(price) || price < 0)) {
        showMessageModal(translations[currentLanguage]?.enter_valid_price || 'Please enter a valid price.');
        return;
    }
    if (costPriceInput.value !== '' && (isNaN(costPrice) || costPrice < 0)) {
        showMessageModal(translations[currentLanguage]?.enter_valid_cost_price || 'Please enter a valid cost price.');
        return;
    }

    // ✅ Check if item already exists (within same business)
    const existingItemIndex = stock.findIndex(item => 
        item.name.toLowerCase() === productName.toLowerCase()
    );
    
    if (existingItemIndex > -1) {
        const existingItem = stock[existingItemIndex];
        showMessageModal(
            `"${productName}" already exists in stock (Quantity: ${existingItem.quantity}). Please use the "Increase Quantity" feature instead.`
        );
        return;
    }
showLoading(translations[currentLanguage]?.adding_item || 'Adding item...'); 

// ✅ Upload image to Cloudinary
let imageUrl = null;
if (selectedType === 'product' && imageFile) {
    try {
        const client = getSB();
        if (!client) throw new Error('Database not connected');
        
        const currentBusinessId = currentUser?.business_id || businessInfo?.id || localStorage.getItem('businessId') || null;

        // Simple upload with loading message
        const uploadResult = await uploadToCloudinary(imageFile, {
            folder: `businesses/${currentBusinessId}/products`,
            publicId: `product_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`
        });
        
        imageUrl = uploadResult.url;
        console.log('✅ Product image uploaded:', imageUrl);

    } catch (error) {
        console.error('Image upload error:', error);
        hideLoading();
        showMessageModal('Failed to upload image: ' + error.message);
        return;
    }
}
 

    // ✅ Create new item (WITH BUSINESS ID)
    const newItem = {
        name: productName,
        quantity: quantity,
        price: isNaN(price) ? null : price,
        cost_price: isNaN(costPrice) ? null : costPrice,
        image_url: imageUrl,
        date_added: dateAdded,
        tax_rate: taxRate,
        type: selectedType,
        category: category,
        subcategory: subcategory,
        created_by: currentUserId,
        username: currentUsername,
        business_id: businessId,
        has_been_sold: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    };

    console.log('🔍 New item being saved:', {
        name: newItem.name,
        business_id: newItem.business_id,
        hasBusinessId: !!newItem.business_id
    });

    // ✅ Save to Supabase
    try {
        const client = getSB();
        if (!client) throw new Error('Database not connected');

        const { data: savedItem, error: insertError } = await client
            .from('stock')
            .insert([newItem])
            .select()
            .single();

        if (insertError) throw insertError;

        console.log('✅ Item saved:', { id: savedItem.id, business_id: savedItem.business_id });

        // ✅ Add to local array
        stock.push(savedItem || newItem);

        // ✅ Add to stock history
        try {
            await client.from('stock_history').insert([{
                item_name: productName,
                action: 'New Item Added',
                quantity_change: `+${quantity}`,
                username: currentUsername,
                business_id: businessId,
                timestamp: new Date().toISOString()
            }]);
        } catch (historyErr) {
            console.warn('Stock history save warning:', historyErr);
        }
     hideLoading();
        // ✅ Show success
        showMessageModal(`"${productName}" successfully added to stock.`);

        // ✅ Trigger feedback check
        if (typeof window.onItemAdded === 'function') {
            window.onItemAdded();
        }

    } catch (error) {
        console.error('Error adding item:', error);
         hideLoading();
        showMessageModal('Failed to add item: ' + error.message);
        return;
    }

    // ✅ Reset form
    productNameInput.value = '';
    quantityInput.value = '';
    priceInput.value = '';
    itemImageInput.value = '';
    costPriceInput.value = '';
    categoryInput.value = '';
    subcategoryInput.value = '';

    document.querySelector('input[name="itemType"][value="product"]').checked = true;
    if (typeof updateAddItemFormLabels === 'function') updateAddItemFormLabels();

    const preview = document.getElementById('itemImagePreview');
    if (preview) {
        preview.src = '';
        preview.classList.add('hidden');
    }

    const uploadLabel = document.querySelector('label[for="itemImage"] span');
    if (uploadLabel) {
        uploadLabel.textContent = translations[currentLanguage]?.upload_file_label || 'Upload a file';
    }

    // ✅ Refresh stock display
    if (typeof clear251SaleForm === 'function') await clear251SaleForm();
    if (typeof loadStock === 'function') await loadStock();
    if (typeof renderStock === 'function') renderStock();
    if (typeof updateLowStockAlert === 'function') updateLowStockAlert();

    // ✅ Track event
    if (typeof trackAppEvent === 'function') {
        trackAppEvent('item_added_to_stock', {
            itemName: productName,
            quantity: quantity,
            category: category,
            businessId: businessId
        }, currentUsername);
    }
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

