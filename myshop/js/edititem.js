
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
    
    // Handle image display properly
if (currentItemBeingEdited.type === 'product') {
    if (currentItemBeingEdited.imageUrl) {
        // --- FIX: Combine API_BASE with the image path ---
        let imageUrl = currentItemBeingEdited.imageUrl;
        
        // If it's already a full link (http...), use it. 
        // Otherwise, build the path using your server address.
        const finalUrl = imageUrl.startsWith('http') 
            ? imageUrl 
            : `${API_BASE}${imageUrl.startsWith('/') ? '' : '/'}${imageUrl}`;
        
        editProductCurrentImage.src = finalUrl;
        // ------------------------------------------------
        
        editProductCurrentImage.classList.remove('hidden');
        editNoCurrentImageMessage.classList.add('hidden');
        console.log('Current image URL:', finalUrl);
    } else {
        editProductCurrentImage.src = '';
        editProductCurrentImage.classList.add('hidden');
        editNoCurrentImageMessage.classList.remove('hidden');
    }
    
    // Clear file input and reset preview
    editItemImageInput.value = '';
    editItemImagePreview.src = '';
    editItemImagePreview.classList.add('hidden');
    removeEditItemImageBtn.classList.add('hidden');
    
    // Show image container
    editItemImageContainer.classList.remove('hidden');
} else {
        // Hide image section for services
        editItemImageContainer.classList.add('hidden');
    }
    
    editDateAddedSpan.textContent = currentItemBeingEdited.dateAdded || 'N/A';

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
        : (currentItemBeingEdited.costPrice || null);

    const newCategory = document.getElementById('editCategoryInput') 
        ? document.getElementById('editCategoryInput').value.trim()
        : (currentItemBeingEdited.category || '');

    // Validation
    if (newProductName === '') {
        showMessageModal(translations[currentLanguage].productNameCannotBeEmpty || 'Product/Service name cannot be empty.');
        return;
    }
    if (isNaN(newQuantity) || newQuantity <= 0) {
        showMessageModal(translations[currentLanguage].quantityMustBePositive || 'Quantity/Units must be a positive number.');
        return;
    }
    if (editPriceInput.value !== '' && (isNaN(newPrice) || newPrice < 0)) {
        showMessageModal(translations[currentLanguage].priceMustBeNonNegative || 'Price must be a non-negative number.');
        return;
    }
 showLoading();
if (isCancelled) return;
    // 1. FIRST upload the image if there's a new one
    let newImageUrl = currentItemBeingEdited.imageUrl; // Keep existing image URL
    
    if (currentItemBeingEdited.type === 'product' && newImageFile) {
        try {
            const formData = new FormData();
            formData.append('image', newImageFile);
            
            const uploadRes = await fetch(`${API_BASE}/api/upload-image`, {
                method: 'POST',
                body: formData
            });
            
            if (!uploadRes.ok) {
                throw new Error('Image upload failed');
            }
            
            const data = await uploadRes.json();
            newImageUrl = data.url; // This should be like "/uploads/filename.png"
            
            console.log('New image uploaded:', newImageUrl);
        } catch (error) {
            console.error('Image upload error:', error);
            showMessageModal(translations[currentLanguage].failedToUploadNewImage || 'Failed to upload new image.');
            return;
        }
    }

    // 2. Prepare the updated item data
    const updatedItem = {
        ...currentItemBeingEdited, // Start with all existing properties
        name: newProductName,
        oldName: currentItemBeingEdited.name, // Store old name for server-side rename
        quantity: newQuantity,
        price: isNaN(newPrice) ? null : newPrice,
        costPrice: isNaN(newCostPrice) ? null : newCostPrice,
        imageUrl: newImageUrl, // Use the new or existing URL
        category: newCategory,
        taxRate: taxRate,
        subcategory: newSubcategory,
        username: currentUser.username
    };

    // 3. Remove old image reference if new image was uploaded
    if (newImageFile) {
        // Ensure the old imageData is removed
        delete updatedItem.imageData;
        delete updatedItem.image; // Remove any old image property
    }

    // 4. Send update to server
    try {
        console.log('Updating item with data:', updatedItem);
        
        const response = await fetch(`${API_BASE}/api/stock`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updatedItem)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to update item on server.');
        }

        const result = await response.json();
        console.log('Server update response:', result);

        // 5. Handle stock history for quantity changes
        const oldQuantity = currentItemBeingEdited.quantity;
        if (oldQuantity !== newQuantity) {
            const quantityDiff = newQuantity - oldQuantity;
            await addStockHistoryEntry({
                action: quantityDiff > 0 ? 'Restocked' : 'Item Quantity Reduced',
                itemName: newProductName,
                quantityChange: quantityDiff > 0 ? `+${quantityDiff}` : `${quantityDiff}`,
                timestamp: new Date().toLocaleString('fr-FR'),
                username: currentUser.username,
                itemId: currentItemBeingEdited.id // Include item ID if available
            });
        }

        // 6. Handle rename history
        if (currentItemBeingEdited.name !== newProductName) {
            await addStockHistoryEntry({
                action: 'Item Renamed (Edit)',
                itemName: `${currentItemBeingEdited.name} to ${newProductName}`,
                quantityChange: 'N/A',
                timestamp: new Date().toLocaleString('fr-FR'),
                username: currentUser.username,
                itemId: currentItemBeingEdited.id
            });
        }

        // 7. Handle image change history
        if (newImageFile) {
            await addStockHistoryEntry({
                action: 'Image Updated',
                itemName: newProductName,
                quantityChange: 'N/A',
                timestamp: new Date().toLocaleString('fr-FR'),
                username: currentUser.username,
                itemId: currentItemBeingEdited.id
            });
        }

        showMessageModal(`Item "${newProductName}" updated successfully!`);
        
        // 8. Clear and reload everything
        clearEditItemImage();
        await loadStock(); // Reload from server
        renderStock(); // Re-render table
        updateLowStockAlert(); // Update alerts
                       const checkInterval = setInterval(() => {
            checkCancelled();
        }, 100);
          resetCancellation();
        clearInterval(checkInterval);
        

        checkCancelled();
        
        hideLoading();
        // 9. Close modal
        closeItemDetailsModal();

    } catch (error) {
        console.error('Error updating item:', error);
                          const checkInterval = setInterval(() => {
            checkCancelled();
        }, 100);
          resetCancellation();
        clearInterval(checkInterval);
        

        checkCancelled();
        
        hideLoading();
        showMessageModal(error.message || 'Failed to update item. Please try again.');
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

        // ✅ Ensure every item has an ID (fallback if missing)
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

        const safeSetHtml = (elementId, html) => {
            const element = document.getElementById(elementId);
            if (element) {
                element.innerHTML = html;
                return true;
            }
            console.warn(`⚠️ Element with ID '${elementId}' not found`);
            return false;
        };

        // ✅ Initialize DOM elements with null checks
        const modalProductNameView = document.getElementById('modalProductNameText');
        const modalTypeView = document.getElementById('modalTypeView');
        const modalQuantityView = document.getElementById('modalQuantityView');
        const modalPriceView = document.getElementById('modalPriceView');
        const modalDateAddedView = document.getElementById('modalDateAddedView');
        const modalCategoryView = document.getElementById('modalCategoryView');
        const modalSubcategoryView = document.getElementById('modalSubcategoryView');
        const modalCostPriceView = document.getElementById('modalCostPriceView');
        const modalMarginView = document.getElementById('modalMarginView');
        const modalProductImageView = document.getElementById('modalProductImageView');
        const modalNoImageViewMessage = document.getElementById('modalNoImageViewMessage');
        const modalProductImageViewContainer = document.getElementById('modalProductImageViewContainer');
        const itemDetailsViewMode = document.getElementById('itemDetailsViewMode');
        const itemDetailsEditMode = document.getElementById('itemDetailsEditMode');
        const itemDetailsModal = document.getElementById('itemDetailsModal');

        // Check if critical elements exist
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
        safeSetText('modalDateAddedView', item.dateAdded || 'N/A');
        safeSetText('modalCategoryView', item.category || 'N/A');
        safeSetText('modalSubcategoryView', item.subcategory || '—');

        // ✅ Item ID display
        safeSetText('modalIdView', item.id);

        // ✅ Cost Price
        if (modalCostPriceView) {
            const formattedCost = (item.costPrice !== undefined && !isNaN(item.costPrice))
                ? Math.round(item.costPrice).toLocaleString('fr-FR')
                : 'N/A';
            modalCostPriceView.textContent = formattedCost;
        }
       document.getElementById('modalTaxRateView').textContent = item.taxRate || 0;
        // ✅ Profit margin
        if (modalMarginView) {
            const margin = calculateProfitMargin(item.price, item.costPrice);
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
        const qrCodeElement = document.getElementById('modalQRCode');
            if (qrCodeElement) {
                qrCodeElement.style.cursor = 'pointer';
                qrCodeElement.title = 'Click to generate QR codes';
                qrCodeElement.onclick = () => openQrGenerationModal(item);
            }
            


        // ✅ QR Code
        const qrCanvas = document.getElementById('modalQRCode');
        const qrContainer = document.getElementById('modalQRCodeContainer');
                    if (qrContainer) {
                qrContainer.style.cursor = 'pointer';
                qrContainer.onclick = () => openQrGenerationModal(item);
            }
    
        
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
                qrContainer.classList.add('hidden');
            }
        }

        // ✅ Product image
if (modalProductImageView && modalNoImageViewMessage) {
    if (item.type === 'product' && item.imageUrl) {
        
        // --- FIX STARTS HERE ---
        // Ensure the path uses the server address instead of a local file path
        const finalImageUrl = item.imageUrl.startsWith('http') 
            ? item.imageUrl 
            : `${API_BASE}${item.imageUrl.startsWith('/') ? '' : '/'}${item.imageUrl}`;
        
        modalProductImageView.src = finalImageUrl;
        // --- FIX ENDS HERE ---

        modalProductImageView.classList.remove('hidden');
        modalProductImageView.style.cursor = 'zoom-in';
        modalNoImageViewMessage.classList.add('hidden');

        modalProductImageView.onclick = function () {
            if (!this.src) return;
            const title = item.name || 'Product Image';
            zoomImage(this.src, title);
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
                const saleKey = normalize(sale.productName);
                return saleKey.includes(itemKey) || itemKey.includes(saleKey);
            });

            if (itemSales.length > 0) {
                itemSales.sort((a, b) => new Date(b.dateSold || b.timestamp) - new Date(a.dateSold || a.timestamp));
                const lastSale = itemSales[0];

                lastSaleInfoHtml = `
                    <div class="mt-6 p-4 border rounded-xl shadow-lg bg-white dark:bg-gray-800 transition-all duration-300">
                        <div class="flex items-center mb-2">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-indigo-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <h4 class="text-lg font-semibold text-gray-900 dark:text-white">${item.name} was last sold on 
                                ${new Date(lastSale.dateSold || lastSale.timestamp)
                                    .toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                            </h4>
                        </div>
                        <div class="text-sm text-gray-600 dark:text-gray-300">
                            <p><strong>Quantity Sold:</strong> ${lastSale.quantity}</p>
                            <p><strong>Total Amount:</strong> ${formatCurrency(lastSale.price)}</p>
                            <p><strong>Payment Type:</strong> ${lastSale.paymentType}</p>
                            ${lastSale.customerName ? `<p><strong>Customer:</strong> ${lastSale.customerName}</p>` : ''}
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
            
            // Add analytics button
            const moreInfoBtn = document.createElement('button');
            moreInfoBtn.className = 'mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition';
            moreInfoBtn.textContent = 'View item performance';
            moreInfoBtn.onclick = function() {
                showMoreInfo(item.id);
            };
            lastSaleDiv.appendChild(moreInfoBtn);
        }

        // === Show modal ===
       if (itemDetailsViewMode) itemDetailsViewMode.classList.remove('hidden');
        if (itemDetailsEditMode) itemDetailsEditMode.classList.add('hidden');
        openItemDetailsModal();   // this actually displays the modal

        // ✅ Remove the animation class now that the modal is visible
        if (clickedRow) {
            clickedRow.classList.remove('row-click-animation');
        }
        closeCalculator();
        // === Hook up "Increase Quantity" button ===
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
