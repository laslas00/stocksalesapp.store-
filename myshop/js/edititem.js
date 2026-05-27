
let editCategoryDropdown = document.getElementById('editCategoryDropdown');
const editCategoryInput = document.getElementById('editCategoryInput');
if (editCategoryInput && !editCategoryDropdown) {
    editCategoryDropdown = document.createElement('div');
    editCategoryDropdown.id = 'editCategoryDropdown';
    editCategoryDropdown.style.position = 'absolute';
    editCategoryDropdown.style.background = '#0b0b0bff';
    editCategoryDropdown.style.border = '1px solid #ccc';
    editCategoryDropdown.style.borderRadius = '0.375rem';
    editCategoryDropdown.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)';
    editCategoryDropdown.style.zIndex = '1000';
    editCategoryDropdown.style.display = 'none';
    editCategoryDropdown.style.maxHeight = '200px';
    editCategoryDropdown.style.overflowY = 'auto';
     editCategoryDropdown.style.color = 'red';

    editCategoryInput.parentNode.appendChild(editCategoryDropdown);
    editCategoryInput.style.position = 'relative';
}
function getAllCategories() {
    return [...new Set(stock.map(item => item.category).filter(Boolean))];
}
if (editCategoryInput) {
    editCategoryInput.addEventListener('focus', showEditCategoryDropdown);
    editCategoryInput.addEventListener('input', showEditCategoryDropdown);

    function showEditCategoryDropdown() {
        const categories = getAllCategories();
        const filter = editCategoryInput.value.toLowerCase();
        const filtered = categories.filter(cat => cat.toLowerCase().includes(filter));
        if (filtered.length === 0) {
            editCategoryDropdown.style.display = 'none';
            return;
        }
        editCategoryDropdown.innerHTML = filtered.map(cat =>
            `<div style="padding:8px 12px;cursor:pointer;" class="hover:bg-blue-100" data-value="${cat}">${cat}</div>`
        ).join('');
        editCategoryDropdown.style.top = (editCategoryInput.offsetTop + editCategoryInput.offsetHeight) + 'px';
        editCategoryDropdown.style.left = editCategoryInput.offsetLeft + 'px';
        editCategoryDropdown.style.width = editCategoryInput.offsetWidth + 'px';
        editCategoryDropdown.style.display = 'block';
    }
    editCategoryDropdown.addEventListener('mousedown', function(e) {
        if (e.target && e.target.dataset.value) {
            editCategoryInput.value = e.target.dataset.value;
            editCategoryDropdown.style.display = 'none';
        }
    });
    document.addEventListener('mousedown', function(e) {
        if (!editCategoryInput.contains(e.target) && !editCategoryDropdown.contains(e.target)) {
            editCategoryDropdown.style.display = 'none';
        }
    });
}

let editSubcategoryDropdown = document.getElementById('editSubcategoryDropdown');
const editSubcategoryInput = document.getElementById('editSubcategoryInput');

// Create dropdown dynamically if it doesn't exist
if (editSubcategoryInput && !editSubcategoryDropdown) {
    editSubcategoryDropdown = document.createElement('div');
    editSubcategoryDropdown.id = 'editSubcategoryDropdown';
    editSubcategoryDropdown.style.position = 'absolute';
    editSubcategoryDropdown.style.background = '#0b0b0bff';
    editSubcategoryDropdown.style.border = '1px solid #ccc';
    editSubcategoryDropdown.style.borderRadius = '0.375rem';
    editSubcategoryDropdown.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)';
    editSubcategoryDropdown.style.zIndex = '1000';
    editSubcategoryDropdown.style.display = 'none';
    editSubcategoryDropdown.style.maxHeight = '200px';
    editSubcategoryDropdown.style.overflowY = 'auto';
    editSubcategoryDropdown.style.color = 'red';

    // Append dropdown to the same parent as the input
    editSubcategoryInput.parentNode.appendChild(editSubcategoryDropdown);
    editSubcategoryInput.style.position = 'relative';
}

function getAllSubcategories() {
    return [...new Set(stock.map(item => item.subcategory).filter(Boolean))];
}

if (editSubcategoryInput) {
    editSubcategoryInput.addEventListener('focus', showEditSubcategoryDropdown);
    editSubcategoryInput.addEventListener('input', showEditSubcategoryDropdown);

    function showEditSubcategoryDropdown() {
        const subcategories = getAllSubcategories();
        const filter = editSubcategoryInput.value.toLowerCase();
        const filtered = subcategories.filter(sub => sub.toLowerCase().includes(filter));

        if (filtered.length === 0) {
            editSubcategoryDropdown.style.display = 'none';
            return;
        }

        editSubcategoryDropdown.innerHTML = filtered.map(sub =>
            `<div style="padding:8px 12px;cursor:pointer;" class="hover:bg-blue-100" data-value="${sub}">${sub}</div>`
        ).join('');

        // Position dropdown right under input
        editSubcategoryDropdown.style.top = (editSubcategoryInput.offsetTop + editSubcategoryInput.offsetHeight) + 'px';
        editSubcategoryDropdown.style.left = editSubcategoryInput.offsetLeft + 'px';
        editSubcategoryDropdown.style.width = editSubcategoryInput.offsetWidth + 'px';
        editSubcategoryDropdown.style.display = 'block';
    }

    // Handle clicking an item from dropdown
    editSubcategoryDropdown.addEventListener('mousedown', function (e) {
        if (e.target && e.target.dataset.value) {
            editSubcategoryInput.value = e.target.dataset.value;
            editSubcategoryDropdown.style.display = 'none';
        }
    });

    // Hide dropdown when clicking outside
    document.addEventListener('mousedown', function (e) {
        if (!editSubcategoryInput.contains(e.target) && !editSubcategoryDropdown.contains(e.target)) {
            editSubcategoryDropdown.style.display = 'none';
        }
    });
}
// ==========================
// 🟢 Add Subcategory Dropdown (for Add Item Modal)
// ==========================
let subcategoryDropdown = document.getElementById('subcategoryDropdown');
const subcategoryInput = document.getElementById('subcategoryInput');

// Create dropdown dynamically if it doesn't exist
if (subcategoryInput && !subcategoryDropdown) {
    subcategoryDropdown = document.createElement('div');
    subcategoryDropdown.id = 'subcategoryDropdown';
    subcategoryDropdown.style.position = 'absolute';
    subcategoryDropdown.style.background = '#0b0b0bff'; // dark theme
    subcategoryDropdown.style.border = '1px solid #ccc';
    subcategoryDropdown.style.borderRadius = '0.375rem';
    subcategoryDropdown.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)';
    subcategoryDropdown.style.zIndex = '1000';
    subcategoryDropdown.style.display = 'none';
    subcategoryDropdown.style.maxHeight = '200px';
    subcategoryDropdown.style.overflowY = 'auto';
    subcategoryDropdown.style.color = 'white';

    // Attach dropdown to same parent container
    subcategoryInput.parentNode.appendChild(subcategoryDropdown);
    subcategoryInput.style.position = 'relative';
}

// Helper to collect all unique subcategories
function getAllSubcategories() {
    return [...new Set(stock.map(item => item.subcategory).filter(Boolean))].sort();
}

// Add event listeners for focus and input
if (subcategoryInput) {
    subcategoryInput.addEventListener('focus', showSubcategoryDropdown);
    subcategoryInput.addEventListener('input', showSubcategoryDropdown);

    function showSubcategoryDropdown() {
        const subcategories = getAllSubcategories();
        const filter = subcategoryInput.value.toLowerCase();
        const filtered = subcategories.filter(sub => sub.toLowerCase().includes(filter));

        if (filtered.length === 0) {
            subcategoryDropdown.style.display = 'none';
            return;
        }

        subcategoryDropdown.innerHTML = filtered.map(sub =>
            `<div style="padding:8px 12px;cursor:pointer;color:white;" class="hover:bg-blue-600" data-value="${sub}">
                ${sub}
            </div>`
        ).join('');

        // Position dropdown right under the input
        const rect = subcategoryInput.getBoundingClientRect();
        subcategoryDropdown.style.top = (subcategoryInput.offsetTop + subcategoryInput.offsetHeight) + 'px';
        subcategoryDropdown.style.left = subcategoryInput.offsetLeft + 'px';
        subcategoryDropdown.style.width = subcategoryInput.offsetWidth + 'px';
        subcategoryDropdown.style.display = 'block';
    }

    // Handle item click
    subcategoryDropdown.addEventListener('mousedown', function (e) {
        if (e.target && e.target.dataset.value) {
            subcategoryInput.value = e.target.dataset.value;
            subcategoryDropdown.style.display = 'none';
        }
    });

    // Hide dropdown when clicking outside
    document.addEventListener('mousedown', function (e) {
        if (!subcategoryInput.contains(e.target) && !subcategoryDropdown.contains(e.target)) {
            subcategoryDropdown.style.display = 'none';
        }
    });
}

function showEditItemImagePreview(file) {
    if (!file) return;
    if (!file.type.match(/^image\/(png|jpeg|jpg|gif)$/)) {
        alert('Only PNG, JPG, or GIF images are allowed.');
        editItemImageInput.value = '';
        editItemImagePreview.src = '';
        editItemImagePreview.classList.add('hidden');
        removeEditItemImageBtn.classList.add('hidden');
        if (editItemImageSvg) editItemImageSvg.style.display = '';
        return;
    }
    if (file.size > 10 * 1024 * 1024) { // 10MB limit
        alert('Image file is too large (max 10MB).');
        editItemImageInput.value = '';
        editItemImagePreview.src = '';
        editItemImagePreview.classList.add('hidden');
        removeEditItemImageBtn.classList.add('hidden');
        if (editItemImageSvg) editItemImageSvg.style.display = '';
        return;
    }
    const reader = new FileReader();
    reader.onload = function (evt) {
        editItemImagePreview.src = evt.target.result;
        editItemImagePreview.classList.remove('hidden');
        removeEditItemImageBtn.classList.remove('hidden');
        if (editItemImageSvg) editItemImageSvg.style.display = 'none';
    };
    reader.readAsDataURL(file);
}

editItemImageInput.addEventListener('change', function (e) {
    const file = e.target.files[0];
    showEditItemImagePreview(file);
});

function clearEditItemImage() {
    editItemImageInput.value = '';
    editItemImagePreview.src = '';
    editItemImagePreview.classList.add('hidden');
    removeEditItemImageBtn.classList.add('hidden');
    if (editItemImageSvg) editItemImageSvg.style.display = '';
}

// Usage:
removeEditItemImageBtn.addEventListener('click', clearEditItemImage);
// Drag & drop support
const uploadArea = editItemImageInput.closest('.flex.justify-center');
uploadArea.addEventListener('dragover', function (e) {
    e.preventDefault();
    uploadArea.style.borderColor = '#2563eb';
});
uploadArea.addEventListener('dragleave', function (e) {
    e.preventDefault();
    uploadArea.style.borderColor = '';
});
uploadArea.addEventListener('drop', function (e) {
    e.preventDefault();
    uploadArea.style.borderColor = '';
    if (e.dataTransfer.files.length) {
        editItemImageInput.files = e.dataTransfer.files;
        showEditItemImagePreview(e.dataTransfer.files[0]);
    }
});

document.getElementById('editItemImage').addEventListener('change', function (e) {
    const file = e.target.files[0];
    const preview = document.getElementById('editItemImagePreview');
    const svgIcon = preview.parentElement.querySelector('svg');
    const uploadLabel = this.closest('label').querySelector('span');

    if (file) {
        const reader = new FileReader();
        reader.onload = function (evt) {
            preview.src = evt.target.result;
            preview.classList.remove('hidden');
            if (svgIcon) svgIcon.classList.add('hidden');
            if (uploadLabel) uploadLabel.textContent = 'Change Image';
        };
        reader.readAsDataURL(file);
    } else {
        preview.src = '';
        preview.classList.add('hidden');
        if (svgIcon) svgIcon.classList.remove('hidden');
        if (uploadLabel) uploadLabel.textContent = 'Upload a file';
    }
});

document.getElementById('removeEditItemImageBtn').addEventListener('click', function () {
    const input = document.getElementById('editItemImage');
    const preview = document.getElementById('editItemImagePreview');
    const svgIcon = preview.parentElement.querySelector('svg');
    const uploadLabel = input.closest('label').querySelector('span');
    preview.src = '';
    preview.classList.add('hidden');
    input.value = '';
    if (svgIcon) svgIcon.classList.remove('hidden');
    if (uploadLabel) uploadLabel.textContent = 'Upload a file';
    this.classList.add('hidden');
});

function enterEditMode() {
    if (!currentItemBeingEdited) {
        showMessageModal(translations[currentLanguage].noItemSelectedToEdit || 'No item selected to edit.');
        return;
    }
    
    editProductNameInput.value = currentItemBeingEdited.name;
    editItemType.textContent = currentItemBeingEdited.type === 'product' ? 'Product' : 'Service';
    editQuantityInput.value = '';
    editPriceInput.value = currentItemBeingEdited.price !== null ? Math.round(currentItemBeingEdited.price) : '';
    editQuantityLabel.textContent = `Add Quantity (Current: ${currentItemBeingEdited.quantity})`;
    editQuantityInput.placeholder = `Current: ${currentItemBeingEdited.quantity}`;
    
    const editCostPriceInput = document.getElementById('editCostPrice');
    if (editCostPriceInput) {
        editCostPriceInput.value = currentItemBeingEdited.costPrice !== undefined && currentItemBeingEdited.costPrice !== null
            ? currentItemBeingEdited.costPrice
            : '';
    }
    document.getElementById('editTaxRate').value = currentItemBeingEdited.taxRate || 0;
    
    const editCategoryInput = document.getElementById('editCategoryInput');
    if (editCategoryInput) {
        editCategoryInput.value = currentItemBeingEdited.category || '';
    }
    
    const editSubcategoryInput = document.getElementById('editSubcategoryInput');
    if (editSubcategoryInput) {
        editSubcategoryInput.value = currentItemBeingEdited.subcategory || '';
    }
    
    // Handle image display
    if (currentItemBeingEdited.type === 'product') {
        if (currentItemBeingEdited.imageUrl || currentItemBeingEdited.image_url) {
            let imageUrl = currentItemBeingEdited.imageUrl || currentItemBeingEdited.image_url;
            
            // Check if it's a full URL (Supabase Storage or external)
            // If it starts with http, use as-is (Supabase Storage URL)
            // If it's a relative path, it won't work on web - show placeholder
            if (imageUrl.startsWith('http')) {
                editProductCurrentImage.src = imageUrl;
            } else if (imageUrl.startsWith('/')) {
                // Old relative path - won't work on Vercel, but try anyway
                editProductCurrentImage.src = imageUrl;
                console.warn('Image has relative path - may not load:', imageUrl);
            } else {
                // No protocol - try as relative
                editProductCurrentImage.src = imageUrl;
            }
            
            editProductCurrentImage.classList.remove('hidden');
            editNoCurrentImageMessage.classList.add('hidden');
            console.log('Current image URL:', imageUrl);
        } else {
            editProductCurrentImage.src = '';
            editProductCurrentImage.classList.add('hidden');
            editNoCurrentImageMessage.classList.remove('hidden');
        }
        
        // Clear file input and reset preview
        editItemImageInput.value = '';
        editItemImagePreview.src = '';
        editItemImagePreview.classList.add('hidden');
        if (removeEditItemImageBtn) removeEditItemImageBtn.classList.add('hidden');
        
        // Show image container
        editItemImageContainer.classList.remove('hidden');
    } else {
        // Hide image section for services
        editItemImageContainer.classList.add('hidden');
    }
    
    editDateAddedSpan.textContent = currentItemBeingEdited.dateAdded || currentItemBeingEdited.date_added || 'N/A';

    // Switch to edit mode
    itemDetailsViewMode.classList.add('hidden');
    itemDetailsEditMode.classList.remove('hidden');
}
async function updateItemDetails() {
    if (!currentItemBeingEdited) {
        showMessageModal(translations[currentLanguage].noItemSelectedForUpdate || 'No item selected for update.');
        return;
    }

    const newProductName = editProductNameInput.value.trim();
    const quantityValue = editQuantityInput.value.trim();
    const originalQuantity = currentItemBeingEdited.quantity;
    const newQuantity = quantityValue === '' ? originalQuantity : (originalQuantity + parseInt(quantityValue, 10));
    const newPrice = parseFloat(editPriceInput.value);
    const newImageFile = editItemImageInput.files[0];
    const newSubcategory = document.getElementById('editSubcategoryInput')?.value.trim() || '';
    const taxRate = parseFloat(document.getElementById('editTaxRate').value) || 0;
    const newCostPrice = document.getElementById('editCostPrice')
        ? parseFloat(document.getElementById('editCostPrice').value)
        : (currentItemBeingEdited.costPrice || currentItemBeingEdited.cost_price || null);
    const newCategory = document.getElementById('editCategoryInput') 
        ? document.getElementById('editCategoryInput').value.trim()
        : (currentItemBeingEdited.category || '');

    // Validation
    if (newProductName === '') {
        showMessageModal(translations[currentLanguage].productNameCannotBeEmpty || 'Product/Service name cannot be empty.');
        return;
    }
    if (isNaN(newQuantity) || newQuantity <= 0) {
        showMessageModal(translations[currentLanguage].quantityMustBePositive || 'Quantity must be a positive number.');
        return;
    }
    if (editPriceInput.value !== '' && (isNaN(newPrice) || newPrice < 0)) {
        showMessageModal(translations[currentLanguage].priceMustBeNonNegative || 'Price must be a non-negative number.');
        return;
    }

    if (typeof showLoading === 'function') showLoading();

    const client = getSB();
    if (!client) {
        showMessageModal('Database connection failed');
        if (typeof hideLoading === 'function') hideLoading();
        return;
    }

    // Get business ID for multi-tenant
    const currentBusinessId = currentUser?.business_id || businessInfo?.id || null;
    const username = currentUser?.username || 'Unknown';
    const now = new Date().toISOString();

    try {
        // ========== 1. UPLOAD NEW IMAGE TO CLOUDINARY (if selected) ==========
        let newImageUrl = currentItemBeingEdited.imageUrl || currentItemBeingEdited.image_url || '';
        
        if (currentItemBeingEdited.type === 'product' && newImageFile) {
            try {
                // Update loading message
                if (typeof showLoading === 'function') {
                    showLoading('📸 Uploading product image...');
                }
                
                const uploadResult = await uploadToCloudinary(newImageFile, {
                    folder: `businesses/${currentBusinessId}/products`,
                    publicId: `product_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`
                });
                
                newImageUrl = uploadResult.url;
                console.log('✅ New product image uploaded to Cloudinary:', newImageUrl);
                
            } catch (uploadError) {
                console.error('Image upload error:', uploadError);
                throw new Error('Image upload failed: ' + uploadError.message);
            }
        }

        // Update loading message
        if (typeof showLoading === 'function') {
            showLoading('💾 Saving changes to database...');
        }

        // ========== 2. UPDATE ITEM IN SUPABASE (with business safety) ==========
        const updateData = {
            name: newProductName,
            quantity: newQuantity,
            price: isNaN(newPrice) ? null : newPrice,
            cost_price: isNaN(newCostPrice) ? null : newCostPrice,
            image_url: newImageUrl,
            category: newCategory,
            tax_rate: taxRate,
            subcategory: newSubcategory,
            updated_at: now
        };

        const itemId = currentItemBeingEdited.id;
        
        let updateError;
        if (itemId) {
            let query = client.from('stock').update(updateData).eq('id', itemId);
            // Extra safety: ensure same business
            if (currentBusinessId) query = query.eq('business_id', currentBusinessId);
            const { error } = await query;
            updateError = error;
        } else {
            let query = client.from('stock').update(updateData).eq('name', currentItemBeingEdited.name);
            if (currentBusinessId) query = query.eq('business_id', currentBusinessId);
            const { error } = await query;
            updateError = error;
        }

        if (updateError) throw new Error(updateError.message);

        console.log('✅ Item updated in Supabase');

        // ========== 3. RECORD STOCK HISTORY (with business_id) ==========
        const historyEntries = [];

        // Quantity change
        if (originalQuantity !== newQuantity) {
            const quantityDiff = newQuantity - originalQuantity;
            historyEntries.push({
                item_name: newProductName,
                action: quantityDiff > 0 ? 'Restocked' : 'Item Quantity Reduced',
                quantity_change: quantityDiff > 0 ? `+${quantityDiff}` : `${quantityDiff}`,
                username: username,
                business_id: currentBusinessId,
                timestamp: now
            });
        }

        // Rename
        if (currentItemBeingEdited.name !== newProductName) {
            historyEntries.push({
                item_name: `${currentItemBeingEdited.name} → ${newProductName}`,
                action: 'Item Renamed',
                quantity_change: 'N/A',
                username: username,
                business_id: currentBusinessId,
                timestamp: now
            });
        }

        // Image change
        if (newImageFile) {
            historyEntries.push({
                item_name: newProductName,
                action: 'Image Updated',
                quantity_change: 'N/A',
                username: username,
                business_id: currentBusinessId,
                timestamp: now
            });
        }

        // Insert all history entries
        if (historyEntries.length > 0) {
            const { error: historyError } = await client
                .from('stock_history')
                .insert(historyEntries);

            if (historyError) {
                console.warn('Stock history recording failed:', historyError);
            }
        }

        // ========== 4. SUCCESS ==========
        showMessageModal(`Item "${newProductName}" updated successfully!`);
        
        if (typeof clearEditItemImage === 'function') clearEditItemImage();
        if (typeof loadStock === 'function') await loadStock();
        if (typeof renderStock === 'function') renderStock();
        if (typeof updateLowStockAlert === 'function') updateLowStockAlert();
        if (typeof closeItemDetailsModal === 'function') closeItemDetailsModal();

    } catch (error) {
        console.error('Error updating item:', error);
        showMessageModal(error.message || 'Failed to update item. Please try again.');
    } finally {
        if (typeof hideLoading === 'function') hideLoading();
    }
}
     editItemDetailsBtn.addEventListener('click', enterEditMode);
         updateItemButton.addEventListener('click', updateItemDetails);

    cancelEditItemBtn.addEventListener('click', closeItemDetailsModal);



async function showItemDetailsModal(item, clickedRow = null){
    try {
        if (!item) {
            showMessageModal('⚠️ Invalid item data.');
            return;
        }

        // ✅ Ensure every item has an ID
        if (!item.id) {
            console.warn(`⚠️ Missing item ID for ${item.name}, assigning temporary ID.`);
            item.id = Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
        }

        currentItemBeingEdited = item;

        const now = new Date();
        const startMonth = Math.max(1, now.getMonth() - 4);
        const year = now.getFullYear();
        await loadSalesForFiveMonths(year, startMonth + 1);

        if (!Array.isArray(sales) || sales.length === 0) {
            console.warn("⚠️ No sales data found for item details.");
        }

        // ✅ SAFE ELEMENT ACCESS HELPER
        const safeSetText = (elementId, text) => {
            const element = document.getElementById(elementId);
            if (element) {
                element.textContent = text !== undefined && text !== null ? text : 'N/A';
                return true;
            }
            console.warn(`⚠️ Element with ID '${elementId}' not found`);
            return false;
        };

        // Check if critical elements exist
        const modalProductNameView = document.getElementById('modalProductNameText');
        const itemDetailsModal = document.getElementById('itemDetailsModal');

        if (!modalProductNameView || !itemDetailsModal) {
            console.error('❌ Critical modal elements not found');
            showMessageModal('Failed to load item details. Modal structure is incomplete.');
            return;
        }

        // === Populate modal fields SAFELY ===
        safeSetText('modalProductNameText', item.name);
        safeSetText('modalTypeView', item.type === 'product' ? 'Product' : 'Service');
        safeSetText('modalQuantityView', item.quantity ?? 0);
        
        const formattedPrice = item.price ? Math.round(item.price).toLocaleString('fr-FR') : 'N/A';
        safeSetText('modalPriceView', formattedPrice);
        safeSetText('modalDateAddedView', item.dateAdded || item.date_added || 'N/A');
        safeSetText('modalCategoryView', item.category || 'N/A');
        safeSetText('modalSubcategoryView', item.subcategory || '—');
        safeSetText('modalIdView', item.id);

        // Cost Price
        const modalCostPriceView = document.getElementById('modalCostPriceView');
        if (modalCostPriceView) {
            const costPrice = item.costPrice || item.cost_price;
            const formattedCost = (costPrice !== undefined && !isNaN(costPrice))
                ? Math.round(costPrice).toLocaleString('fr-FR')
                : 'N/A';
            modalCostPriceView.textContent = formattedCost;
        }

        // Tax Rate
        const taxRateView = document.getElementById('modalTaxRateView');
        if (taxRateView) {
            taxRateView.textContent = (item.taxRate || item.tax_rate) || 0;
        }

        // Profit margin
        const modalMarginView = document.getElementById('modalMarginView');
        if (modalMarginView) {
            const costPrice = item.costPrice || item.cost_price;
            const margin = calculateProfitMargin(item.price, costPrice);
            if (margin === null) {
                modalMarginView.textContent = 'N/A';
                modalMarginView.className = 'text-gray-500 text-xl font-bold';
            } else {
                const rounded = Math.round(margin);
                modalMarginView.textContent = `${rounded}%`;
                modalMarginView.className =
                    rounded < 20 ? 'text-red-600 text-xl font-bold' :
                    rounded < 50 ? 'text-yellow-600 text-xl font-bold' :
                    'text-green-600 text-xl font-bold';
            }
        }

        // QR Code click handler
        const qrCodeElement = document.getElementById('modalQRCode');
        if (qrCodeElement) {
            qrCodeElement.style.cursor = 'pointer';
            qrCodeElement.title = 'Click to generate QR codes';
            qrCodeElement.onclick = () => openQrGenerationModal(item);
        }

        const qrContainer = document.getElementById('modalQRCodeContainer');
        if (qrContainer) {
            qrContainer.style.cursor = 'pointer';
            qrContainer.onclick = () => openQrGenerationModal(item);
        }

        // Generate QR Code
        const qrCanvas = document.getElementById('modalQRCode');
        if (qrCanvas && qrContainer) {
            try {
                const qr = new QRious({
                    element: qrCanvas,
                    value: JSON.stringify({ id: item.id, name: item.name }),
                    size: 128,
                    level: 'M'
                });
                qrContainer.classList.remove('hidden');
            } catch (err) {
                console.error("QR code display failed:", err);
                if (qrContainer) qrContainer.classList.add('hidden');
            }
        }

        // ========== PRODUCT IMAGE (SUPABASE STORAGE) ==========
        const modalProductImageView = document.getElementById('modalProductImageView');
        const modalNoImageViewMessage = document.getElementById('modalNoImageViewMessage');
        
        if (modalProductImageView && modalNoImageViewMessage) {
            const imageUrl = item.imageUrl || item.image_url;
            
            if (item.type === 'product' && imageUrl) {
                // Supabase Storage URLs are full URLs starting with http
                // Just use them directly
                modalProductImageView.src = imageUrl;
                modalProductImageView.classList.remove('hidden');
                modalProductImageView.style.cursor = 'zoom-in';
                modalNoImageViewMessage.classList.add('hidden');

                modalProductImageView.onclick = function () {
                    if (!this.src) return;
                    zoomImage(this.src, item.name || 'Product Image');
                };
            } else {
                modalProductImageView.classList.add('hidden');
                modalNoImageViewMessage.classList.remove('hidden');
            }
        }

        // === Last sale info ===
        let lastSaleInfoHtml = '';
        if (Array.isArray(sales) && sales.length > 0) {
            const normalize = str => str ? str.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '') : '';
            const itemKey = normalize(item.name);
            const itemSales = sales.filter(sale => {
                const saleKey = normalize(sale.productName || sale.product_name);
                return saleKey.includes(itemKey) || itemKey.includes(saleKey);
            });

            if (itemSales.length > 0) {
                itemSales.sort((a, b) => new Date(b.dateSold || b.date_sold || b.timestamp) - new Date(a.dateSold || a.date_sold || a.timestamp));
                const lastSale = itemSales[0];

                lastSaleInfoHtml = `
                    <div class="mt-6 p-4 border rounded-xl shadow-lg bg-white dark:bg-gray-800 transition-all duration-300">
                        <div class="flex items-center mb-2">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-indigo-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <h4 class="text-lg font-semibold text-gray-900 dark:text-white">
                                ${item.name} was last sold on ${new Date(lastSale.dateSold || lastSale.date_sold || lastSale.timestamp).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                            </h4>
                        </div>
                        <div class="text-sm text-gray-600 dark:text-gray-300">
                            <p><strong>Quantity Sold:</strong> ${lastSale.quantity}</p>
                            <p><strong>Total Amount:</strong> ${formatCurrency(lastSale.price || lastSale.total_amount)}</p>
                            <p><strong>Payment Type:</strong> ${lastSale.paymentType || lastSale.payment_type}</p>
                            ${lastSale.customerName || lastSale.customer_name ? `<p><strong>Customer:</strong> ${lastSale.customerName || lastSale.customer_name}</p>` : ''}
                        </div>
                    </div>
                `;
            } else {
                lastSaleInfoHtml = `
                    <div class="mt-4 p-4 text-center text-gray-500 dark:text-gray-400 border rounded-lg">
                        <h4 class="text-lg font-semibold">${item.name} has not been sold for the past five months</h4>
                    </div>`;
            }
        } else {
            lastSaleInfoHtml = `
                <div class="mt-4 p-4 text-center text-gray-500 dark:text-gray-400 border rounded-lg">
                    <h4 class="text-lg font-semibold">Sales Data Unavailable</h4>
                    <p class="text-sm">Unable to load recent sales.</p>
                </div>`;
        }

        // Insert last sale info
        const lastSaleDiv = document.getElementById('modalLastSaleInfo');
        if (lastSaleDiv) {
            lastSaleDiv.innerHTML = lastSaleInfoHtml;
            
            const moreInfoBtn = document.createElement('button');
            moreInfoBtn.className = 'mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition';
            moreInfoBtn.textContent = 'View item performance';
            moreInfoBtn.onclick = function() {
                showMoreInfo(item.id);
            };
            lastSaleDiv.appendChild(moreInfoBtn);
        }

        // === Show modal ===
        const itemDetailsViewMode = document.getElementById('itemDetailsViewMode');
        const itemDetailsEditMode = document.getElementById('itemDetailsEditMode');
        if (itemDetailsViewMode) itemDetailsViewMode.classList.remove('hidden');
        if (itemDetailsEditMode) itemDetailsEditMode.classList.add('hidden');
        openItemDetailsModal();

        // Remove animation class
        if (clickedRow) {
            clickedRow.classList.remove('row-click-animation');
        }
        closeCalculator();

        // Hook up "Increase Quantity" button
        const stockActionBtn = document.getElementById('stockActionBtn');
        if (stockActionBtn) {
            stockActionBtn.onclick = null;
            stockActionBtn.addEventListener('click', () => {
                if (item) {
                    openQuantityActionModal(item);
                } else {
                    showMessageModal('⚠️ Please select an item first.');
                }
            });
        }

    } catch (error) {
        console.error('❌ Error showing item details:', error);
        showMessageModal('Failed to load item details. Please try again.');
        if (clickedRow) {
            clickedRow.classList.remove('row-click-animation');
        }
    }
}

function closeCalculator() {
    if (window.calculator) {
        window.calculator.closeCalculator();
    }
}

function closeItemDetailsModal() { itemDetailsModal.classList.add('hidden'); currentItemBeingEdited = null; }

function openItemDetailsModal() {
    const modal = document.getElementById('itemDetailsModal');

    modal.classList.remove('hidden');
    modal.classList.add('MODAL-LOCK-OPEN');
    modal.classList.add('show');
    document.body.style.overflow = 'hidden';
        hideLoading();
}
function closeItemDetailsModal() {
    const modal = document.getElementById('itemDetailsModal');

    modal.classList.remove('show');
    document.body.style.overflow = '';

    setTimeout(() => {
      modal.classList.remove('MODAL-LOCK-OPEN');
        modal.classList.add('MODAL-LOCK-CLOSED', 'hidden');
    }, 300);
}
