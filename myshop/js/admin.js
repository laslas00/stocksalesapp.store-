document.addEventListener('DOMContentLoaded', () => {
    const adminPanelContent = document.getElementById('adminPanelContent');
    const adminPanelBtn = document.getElementById('adminPanelBtn');
    const adminPanelModal = document.getElementById('adminPanelModal');
    const closeAdminPanelBtn = document.getElementById('closeAdminPanelBtn');
    const adminListContainer = document.getElementById('adminListContainer');
    const salesListContainer = document.getElementById('salesListContainer');
         const nomessage= document.getElementById('nosaleaddemegse');
    const showSalesAssociatesListtBtn = document.getElementById('showSalesAssociatesListtBtn');
    const addAdminFormContainer = document.getElementById('addAdminFormContainer');
    const showAdminListBtn = document.getElementById('showAdminListBtn');
    const showAddAdminBtn = document.getElementById('showAddAdminBtn');
    const makeAdminSection = document.getElementById('makeadminsection');
    const closeAdminSectionBtn = document.getElementById('closeAdminSectionBtn');
    const addAdminBtn = document.getElementById('addAdminBtn');
    const saveNewAdminBtn = document.getElementById('saveNewAdminBtn');
    const newAdminPhotoInput = document.getElementById('newAdminPhoto');
    

    // Sales Associate Form Elements
    const showCreateSalesAssociateBtn = document.getElementById('showCreateSalesAssociateBtn');
    const salesAssociateFormContainer = document.getElementById('salesAssociateFormContainer');
    const saveNewSalesAssociateBtn = document.getElementById('saveNewSalesAssociateBtn');
    const newSalesAssociatePhotoInput = document.getElementById('newSalesAssociatePhoto');
    const newSalesAssociatePhotoPreview = document.getElementById('newSalesAssociatePhotoPreview');

    // Profile Modal Selectors
    const adminProfileModal = document.getElementById('adminProfileModal');
    const displaySection = document.getElementById('adminDisplaySection');
    const editSection = document.getElementById('adminEditSection');
    const goToEditBtn = document.getElementById('goToEditBtn');
    const cancelEditBtn = document.getElementById('cancelEditBtn');
    const saveAdminProfileBtn = document.getElementById('saveAdminProfileBtn');
    const closeAdminProfileModalBtn = document.getElementById('closeAdminProfileModalBtn');
    const editAdminPhotoInput = document.getElementById('editAdminPhoto');

    // Security Button
    const showSecurityBtn = document.getElementById('showSecurityBtn');
    const securityPolicyContainer = document.getElementById('securityPolicyContainer');

    // Navigation & Section Logic
    function switchAdminTab(tab) {
        // Check if all required elements exist
        if (!showAdminListBtn || !showAddAdminBtn || !showSecurityBtn || !showSalesAssociatesListtBtn || !showCreateSalesAssociateBtn ||
            !adminListContainer || !addAdminFormContainer || !securityPolicyContainer || !salesListContainer || !salesAssociateFormContainer) return;

        // Reset ALL button styles
        [showAdminListBtn, showAddAdminBtn, showSecurityBtn, showSalesAssociatesListtBtn, showCreateSalesAssociateBtn].forEach(btn => {
            btn.classList.remove('bg-blue-600', 'text-white', 'shadow-lg');
            btn.classList.add('text-gray-600', 'dark:text-gray-300');
        });

        // Hide ALL sections first
        adminListContainer.classList.add('hidden');
        addAdminFormContainer.classList.add('hidden');
        securityPolicyContainer.classList.add('hidden');
        salesListContainer.classList.add('hidden');
        salesAssociateFormContainer.classList.add('hidden');

        // Logic for switching
        if (tab === 'list') {
            adminListContainer.classList.remove('hidden');
            showAdminListBtn.classList.add('bg-blue-600', 'text-white', 'shadow-lg');
            renderAdminInfo();
        } else if (tab === 'add') {
            addAdminFormContainer.classList.remove('hidden');
            showAddAdminBtn.classList.add('bg-blue-600', 'text-white', 'shadow-lg');
              if (nomessage) nomessage.classList.add('hidden');
        } else if (tab === 'security') {
            securityPolicyContainer.classList.remove('hidden');
            showSecurityBtn.classList.add('bg-blue-600', 'text-white', 'shadow-lg');
              if (nomessage) nomessage.classList.add('hidden');
        } else if (tab === 'saleslist') {
            salesListContainer.classList.remove('hidden');
            showSalesAssociatesListtBtn.classList.add('bg-blue-600', 'text-white', 'shadow-lg');
            rendersalesAssociates();
        } else if (tab === 'createsales') {
            salesAssociateFormContainer.classList.remove('hidden');
            showCreateSalesAssociateBtn.classList.add('bg-blue-600', 'text-white', 'shadow-lg');
            // Clear form when opening
            clearSalesAssociateForm();
            if (nomessage) nomessage.classList.add('hidden');

        }
    }

    // Helper function to clear sales associate form
    function clearSalesAssociateForm() {
        if (document.getElementById('newSalesAssociateFirstName')) {
            document.getElementById('newSalesAssociateFirstName').value = '';
        }
        if (document.getElementById('newSalesAssociateSurname')) {
            document.getElementById('newSalesAssociateSurname').value = '';
        }
        if (document.getElementById('newSalesAssociateUsername')) {
            document.getElementById('newSalesAssociateUsername').value = '';
        }
        if (document.getElementById('newSalesAssociatePassword')) {
            document.getElementById('newSalesAssociatePassword').value = '';
        }
        if (document.getElementById('newSalesAssociateEmail')) {
            document.getElementById('newSalesAssociateEmail').value = '';
        }
        if (document.getElementById('newSalesAssociatePhone')) {
            document.getElementById('newSalesAssociatePhone').value = '';
        }
        if (document.getElementById('newSalesAssociateAddress')) {
            document.getElementById('newSalesAssociateAddress').value = '';
        }
        if (newSalesAssociatePhotoInput) {
            newSalesAssociatePhotoInput.value = '';
        }
        if (newSalesAssociatePhotoPreview) {
            newSalesAssociatePhotoPreview.src = 'image/user mangement.png';
        }
    }

    // Event Listeners for the Tabs
    if (showAdminListBtn) showAdminListBtn.onclick = () => switchAdminTab('list');
    if (showAddAdminBtn) showAddAdminBtn.onclick = () => switchAdminTab('add');
    if (showSecurityBtn) showSecurityBtn.onclick = () => switchAdminTab('security');
    if (showSalesAssociatesListtBtn) showSalesAssociatesListtBtn.onclick = () => switchAdminTab('saleslist');
    if (showCreateSalesAssociateBtn) showCreateSalesAssociateBtn.onclick = () => switchAdminTab('createsales');

    // Close Section Logic
    if (closeAdminSectionBtn) {
        closeAdminSectionBtn.onclick = () => {
            if (makeAdminSection) {
                makeAdminSection.classList.add('hidden');
            }
        };
    }

    // Check if user can access admin panel
    function canAccessAdminPanel() {
        if (!currentUser) return false;
        if (currentUser.role === 'administrator') return true;
        if ((currentUser.username === 'admin' && currentUser.password === 'admin123') || currentUser.isOwner) return true;
        return false;
    }

    // Check if user can modify a specific admin
    function canModifyAdmin(targetUsername) {
        if (!currentUser) return false;
        
        if ((currentUser.username === 'admin' && currentUser.password === 'admin123') || currentUser.isOwner) {
            return targetUsername !== currentUser.username;
        }
        if (currentUser.role === 'administrator') {
            return targetUsername === currentUser.username;
        }
        return false;
    }

    // Check if user can view admin info
    function canViewAdminInfo(targetUsername) {
        if (!currentUser) return false;
        
        if ((currentUser.username === 'admin' && currentUser.password === 'admin123') || currentUser.isOwner) {
            return true;
        }
        if (currentUser.role === 'administrator') {
            return targetUsername === currentUser.username;
        }
        return false;
    }

    if (addAdminBtn) {
        addAdminBtn.onclick = function () {
            if (makeAdminSection) makeAdminSection.classList.remove('hidden');
            switchAdminTab('add');
        };
    }

    // Admin Profile Modal Toggling (Display vs Edit)
    if (goToEditBtn) {
        goToEditBtn.onclick = function () {
            const targetUsername = saveAdminProfileBtn.dataset.originalUsername;
            
            if (!canModifyAdmin(targetUsername)) {
                showMessageModal(translations[currentLanguage]?.no_permission_edit_admin || 'You do not have permission to edit this administrator profile.');
                return;
            }
            
            displaySection.classList.add('hidden');
            editSection.classList.remove('hidden');
            document.getElementById('profileModalTitle').innerText = translations[currentLanguage]?.edit_administrator || "Edit Administrator";
        };
    }

    if (cancelEditBtn) {
        cancelEditBtn.onclick = () => {
            editSection.classList.add('hidden');
            displaySection.classList.remove('hidden');
            document.getElementById('profileModalTitle').innerText = translations[currentLanguage]?.admin_profile_title || "Admin Profile";
        };
    }

    if (closeAdminProfileModalBtn) {
        closeAdminProfileModalBtn.onclick = () => adminProfileModal.classList.add('hidden');
    }

    // Main Admin Panel Open/Close
    if (adminPanelBtn) {
        adminPanelBtn.onclick = async function () {
            console.log('👤 Admin Panel button clicked');
            if (!currentUser) {
                showMessageModal(translations[currentLanguage]?.please_login_first || 'Please log in first.');
                return;
            }
            if (!canAccessAdminPanel()) {
                showMessageModal(translations[currentLanguage]?.only_admins_can_access || 'You do not have permission to access the admin panel.');
                return;
            }
            
            await renderAdminInfo();
            if (adminPanelModal) {
                adminPanelModal.classList.remove('hidden');
                setTimeout(() => adminPanelModal.classList.add('show'), 10);
            }
        };
    }

    if (closeAdminPanelBtn) {
        closeAdminPanelBtn.onclick = function () {
            adminPanelModal.classList.remove('show');
            setTimeout(() => adminPanelModal.classList.add('hidden'), 300);
        };
    }

    // Render Admin Info
    async function renderAdminInfo() {
        if (!adminListContainer) return;
        const res = await fetch(`${API_BASE}/api/users`);
        const usersArr = await res.json();
        const admins = usersArr.filter(u => u.role === 'administrator');
        const isSystemOwner = currentUser && ((currentUser.username === 'admin' && currentUser.password === 'admin123') || currentUser.isOwner);
          if (nomessage) nomessage.classList.add('hidden');

        adminListContainer.innerHTML = admins.map(admin => {
            let photoUrl = fixImagePath(admin.photo || 'image/THE ADMIN.png');
            if (photoUrl.startsWith('data:image')) {
                photoUrl = 'image/THE ADMIN.png';
            }
            
            const canDelete = isSystemOwner && admin.username !== 'admin';
            const canView = canViewAdminInfo(admin.username);
            
            return `
                <div onclick="${canView ? `showAdminProfileModal('${admin.username}')` : ''}" 
                    class="bg-white dark:bg-slate-800 p-4 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow flex items-center space-x-4 relative group ${!canView ? 'opacity-75 cursor-not-allowed' : 'cursor-pointer'}">
                    <div class="relative">
                        <img src="${photoUrl}" 
                            class="w-14 h-14 rounded-full object-cover border-2 border-blue-100 dark:border-slate-600">
                        <span class="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white dark:border-slate-800 rounded-full"></span>
                    </div>
                    <div class="flex-1">
                        <div class="flex items-center">
                            <h4 class="font-bold text-gray-800 dark:text-white">${admin.username}</h4>
                            ${(admin.username === 'admin' || admin.isOwner) ? `
                                <svg class="ml-1.5 w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.64.304 1.24.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" />
                                </svg>
                            ` : ''}
                        </div>
                        <p class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-tighter" data-translate="${(admin.username === 'admin' || admin.isOwner) ? 'system_owner' : 'staff_administrator'}">
                            ${(admin.username === 'admin' || admin.isOwner) ? (translations[currentLanguage]?.system_owner || 'System Owner') : (translations[currentLanguage]?.staff_administrator || 'Staff Administrator')}
                        </p>
                    </div>
                    
                    ${canDelete ? `
                        <button onclick="event.stopPropagation(); deleteAdmin('${admin.username}')" 
                                class="ml-4 bg-red-500 hover:bg-red-700 text-white rounded-full w-8 h-8 flex items-center justify-center"
                                title="${translations[currentLanguage]?.delete_admin_title || 'Delete Admin'}">&times;</button>
                    ` : ''}
                </div>
            `;
        }).join('');
        
        translateUI();
    }

    // Render Sales Associates
async function rendersalesAssociates() {
    if (!salesListContainer) return;
    const res = await fetch(`${API_BASE}/api/users`);
    const usersArr = await res.json();
    const salesUsers = usersArr.filter(u => u.role === 'sales' || u.role === 'manager');
    const isSystemOwner = currentUser && ((currentUser.username === 'admin' && currentUser.password === 'admin123') || currentUser.isOwner);
    const nomessage = document.getElementById('nosaleaddemegse');

    // If no sales associates found, show the message and exit
    if (salesUsers.length === 0) {
        salesListContainer.innerHTML = '';
        if (nomessage) nomessage.classList.remove('hidden');
        // Optionally translate the message if needed
        if (nomessage && window.translateUI) translateUI();
        return;
    }

    // Otherwise, hide the message and render the list
    if (nomessage) nomessage.classList.add('hidden');

    salesListContainer.innerHTML = salesUsers.map(user => {
        let photoUrl = fixImagePath(user.photo || 'image/user mangement.png');
        if (photoUrl.startsWith('data:image')) {
            photoUrl = 'image/user mangement.png';
        }
        const displayName = user.firstName && user.surname 
            ? `${user.firstName} ${user.surname}` 
            : user.username;

        const canDelete = isSystemOwner || currentUser?.role === 'administrator';
        
        return `
            <div onclick="showSalesProfileModal('${user.username}')" class="bg-white dark:bg-slate-800 p-4 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow flex items-center space-x-4 relative group">
                <div class="relative">
                    <img src="${photoUrl}" 
                        class="w-14 h-14 rounded-full object-cover border-2 border-green-100 dark:border-slate-600">
                    <span class="absolute bottom-0 right-0 w-3 h-3 ${user.role === 'manager' ? 'bg-purple-500' : 'bg-green-500'} border-2 border-white dark:border-slate-800 rounded-full"></span>
                </div>
                <div class="flex-1">
                    <div class="flex items-center">
                        <h4 class="font-bold text-gray-800 dark:text-white">${displayName}</h4>
                        ${user.role === 'manager' ? `
                            <svg class="ml-1.5 w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                            </svg>
                        ` : ''}
                    </div>
                    <p class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-tighter">
                        ${user.role === 'manager' 
                            ? (translations[currentLanguage]?.manager || 'Manager') 
                            : (translations[currentLanguage]?.sales_associate || 'Sales Associate')}
                    </p>
                    <p class="text-xs text-gray-400 mt-1">@${user.username}</p>
                </div>
                
                ${currentUser?.role === 'administrator' ? `
                    <div class="flex gap-2">
                        ${user.role === 'sales' ? `
                            <button onclick="makeUserManager('${user.username}')" 
                                    class="bg-green-500 hover:bg-green-600 text-white rounded-lg px-3 py-1 text-xs font-medium transition-colors"
                                    title="Promote to Manager">Promote</button>
                        ` : `
                            <button onclick="demoteUserToSales('${user.username}')" 
                                    class="bg-purple-500 hover:bg-purple-600 text-white rounded-lg px-3 py-1 text-xs font-medium transition-colors"
                                    title="Demote to Sales">Demote</button>
                        `}
                        <button onclick="removeModalAssociate('${user.username}')" 
                                class="bg-red-500 hover:bg-red-700 text-white rounded-full w-8 h-8 flex items-center justify-center"
                                title="Remove User">&times;</button>
                    </div>
                ` : ''}
            </div>
        `;
    }).join('');
    
    translateUI();
}

    // Sales Associate Photo Preview
    if (newSalesAssociatePhotoInput) {
        newSalesAssociatePhotoInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file && newSalesAssociatePhotoPreview) {
                const reader = new FileReader();
                reader.onload = function(evt) {
                    newSalesAssociatePhotoPreview.src = evt.target.result;
                };
                reader.readAsDataURL(file);
            }
        });
    }

    // Save New Sales Associate
    if (saveNewSalesAssociateBtn) {
        saveNewSalesAssociateBtn.addEventListener('click', async function(e) {
            e.preventDefault();
            
            if (!currentUser || currentUser.role !== 'administrator') {
                showMessageModal(translations[currentLanguage]?.onlyAdminsCanAddAssociates || 'Only administrators can add sales associates.');
                return;
            }

            const firstName = document.getElementById('newSalesAssociateFirstName')?.value.trim() || '';
            const surname = document.getElementById('newSalesAssociateSurname')?.value.trim() || '';
            const username = document.getElementById('newSalesAssociateUsername')?.value.trim();
            const password = document.getElementById('newSalesAssociatePassword')?.value;
            const email = document.getElementById('newSalesAssociateEmail')?.value.trim() || '';
            const phone = document.getElementById('newSalesAssociatePhone')?.value.trim() || '';
            const address = document.getElementById('newSalesAssociateAddress')?.value.trim() || '';
            const photoFile = newSalesAssociatePhotoInput?.files[0];

            if (!firstName || !surname || !username || !password) {
                showMessageModal(translations[currentLanguage]?.pleaseFillAllRequiredFields || 'Please fill in all required fields');
                return;
            }

            // Check if username exists
            const resCheck = await fetch(`${API_BASE}/api/users`);
            const usersArr = await resCheck.json();
            if (usersArr.some(u => u.username === username)) {
                showMessageModal(translations[currentLanguage]?.usernameAlreadyExists || 'Username already exists!');
                return;
            }

            try {
                let photoUrl = '';
                if (photoFile) {
                    const formData = new FormData();
                    formData.append('image', photoFile);
                    const uploadRes = await fetch(`${API_BASE}/api/upload-image`, {
                        method: 'POST',
                        body: formData
                    });
                    const uploadData = await uploadRes.json();
                    if (!uploadRes.ok) throw new Error(uploadData.error || 'Upload failed');
                    photoUrl = uploadData.url;
                }

                const response = await fetch(`${API_BASE}/api/users`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        firstName,
                        surname,
                        username,
                        password,
                        email,
                        phone,
                        address,
                        role: 'sales',
                        photo: photoUrl
                    })
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.error || 'Failed to create user');
                }

                // Clear form
                clearSalesAssociateForm();

                await loadUsers();
                rendersalesAssociates();
                
                showMessageModal(translations[currentLanguage]?.salesAssociateAddedSuccessfully || 'Sales associate added successfully');
                
                // Switch to list view
                switchAdminTab('saleslist');
                
            } catch (error) {
                console.error('Error adding associate:', error);
                showMessageModal(translations[currentLanguage]?.failedToAddSalesAssociate || 'Failed to add sales associate');
            }
        });
    }


    // Show Admin Profile Modal
    window.showAdminProfileModal = async function (username) {
        if (!canViewAdminInfo(username)) {
            showMessageModal(translations[currentLanguage]?.no_permission_view_admin || 'You do not have permission to view this administrator profile.');
            return;
        }
        
        const res = await fetch(`${API_BASE}/api/users`);
        const usersArr = await res.json();
        const admin = usersArr.find(u => u.username === username);
        if (!admin) return;

        displaySection.classList.remove('hidden');
        editSection.classList.add('hidden');
        document.getElementById('profileModalTitle').innerText = translations[currentLanguage]?.admin_profile_title || "Admin Profile";
        let displayPhoto = fixImagePath(admin.photo || 'image/THE ADMIN.png');
        if (displayPhoto.startsWith('data:image')) {
            displayPhoto = 'image/THE ADMIN.png';
        }

        document.getElementById('displayAdminPhoto').src = fixImagePath(displayPhoto);
        document.getElementById('displayAdminName').innerText = admin.username;
        document.getElementById('displayAdminPass').innerText = admin.password;
        document.getElementById('displayAdminPhone').innerText = admin.phone || translations[currentLanguage]?.not_set || 'Not set';
        document.getElementById('displayAdminEmail').innerText = admin.email || translations[currentLanguage]?.not_set || 'Not set';
        document.getElementById('displayAdminAddress').innerText = admin.address || translations[currentLanguage]?.not_set || 'Not set';

        document.getElementById('adminProfilePhotoPreview').src = fixImagePath(displayPhoto);
        document.getElementById('editAdminUsername').value = admin.username || '';
        document.getElementById('editAdminPassword').value = admin.password || '';
        document.getElementById('editAdminPhone').value = admin.phone || '';
        document.getElementById('editAdminEmail').value = admin.email || '';
        document.getElementById('editAdminAddress').value = admin.address || '';

        saveAdminProfileBtn.dataset.originalUsername = username;
        
        const canModify = canModifyAdmin(username);
        if (goToEditBtn) {
            if (canModify) {
                goToEditBtn.classList.remove('hidden');
            } else {
                goToEditBtn.classList.add('hidden');
            }
        }
        
        adminProfileModal.classList.remove('hidden');
    };

    // Save Profile Changes
    if (saveAdminProfileBtn) {
        saveAdminProfileBtn.onclick = async function () {
            const originalUsername = this.dataset.originalUsername;
            
            if (!canModifyAdmin(originalUsername)) {
                showMessageModal(translations[currentLanguage]?.no_permission_edit_admin || 'You do not have permission to modify this administrator profile.');
                return;
            }
            
            const saveBtn = this;
            saveBtn.disabled = true;
            saveBtn.innerText = translations[currentLanguage]?.saving_text || "SAVING...";

            let finalPhotoUrl = document.getElementById('adminProfilePhotoPreview').src;
            const photoFile = editAdminPhotoInput.files[0];

            if (photoFile) {
                const formData = new FormData();
                formData.append('image', photoFile);
                try {
                    const uploadRes = await fetch(`${API_BASE}/api/upload-image`, {
                        method: 'POST',
                        body: formData
                    });
                    const uploadData = await uploadRes.json();
                    if (uploadRes.ok) {
                        finalPhotoUrl = uploadData.url;
                    }
                } catch (err) {
                    console.error(translations[currentLanguage]?.upload_failed_log || "Upload failed");
                }
            }

            const updatedUser = {
                username: document.getElementById('editAdminUsername').value.trim(),
                password: document.getElementById('editAdminPassword').value,
                phone: document.getElementById('editAdminPhone').value,
                email: document.getElementById('editAdminEmail').value,
                address: document.getElementById('editAdminAddress').value,
                photo: finalPhotoUrl,
                role: 'administrator'
            };

            try {
                const response = await fetch(`${API_BASE}/api/users/${encodeURIComponent(originalUsername)}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(updatedUser)
                });

                if (response.ok) {
                    showMessageModal(translations[currentLanguage]?.admin_info_updated || 'Admin Info Updated Successfully!');
                    adminProfileModal.classList.add('hidden');
                    renderAdminInfo();
                    if (typeof loadUsers === 'function') await loadUsers();
                    
                    if (originalUsername === currentUser.username) {
                        currentUser = updatedUser;
                        localStorage.setItem('currentUsername', updatedUser.username);
                    }
                } else {
                    const err = await response.json();
                    throw new Error(err.error || translations[currentLanguage]?.update_failed || 'Update failed');
                }
            } catch (error) {
                showMessageModal(error.message);
            } finally {
                saveBtn.disabled = false;
                saveBtn.innerText = translations[currentLanguage]?.save_changes || "SAVE CHANGES";
            }
        };
    }
    
    // Edit Admin Photo
    if (editAdminPhotoInput) {
        editAdminPhotoInput.onchange = function (e) {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (evt) => {
                    document.getElementById('adminProfilePhotoPreview').src = evt.target.result;
                };
                reader.readAsDataURL(file);
            }
        };
    }
    
    // Save New Admin
    if (saveNewAdminBtn) {
        saveNewAdminBtn.onclick = async function (e) {
            e.preventDefault();
            
            if (!currentUser || ((currentUser.username !== 'admin' || currentUser.password !== 'admin123') && !currentUser.isOwner)) {
                showMessageModal(translations[currentLanguage]?.only_system_owner_create || 'Only the system owner can create new administrator accounts.');
                return;
            }
            
            const username = document.getElementById('newAdminUsername').value.trim();
            const password = document.getElementById('newAdminPassword').value;
            const photoFile = newAdminPhotoInput.files[0];
            let photoUrl = 'image/THE ADMIN.png';

            if (!username || !password) {
                showMessageModal(translations[currentLanguage]?.enter_username_password || 'Please enter username and password.');
                return;
            }

            const resCheck = await fetch(`${API_BASE}/api/users`);
            const usersArr = await resCheck.json();
            if (usersArr.some(u => u.username === username)) {
                showMessageModal(translations[currentLanguage]?.username_exists_create?.replace('{username}', username) || `Username "${username}" already exists.`);
                return;
            }

            if (photoFile) {
                const formData = new FormData();
                formData.append('image', photoFile);

                try {
                    const uploadRes = await fetch(`${API_BASE}/api/upload-image`, {
                        method: 'POST',
                        body: formData
                    });
                    const uploadData = await uploadRes.json();
                    if (!uploadRes.ok) throw new Error(uploadData.error || translations[currentLanguage]?.upload_failed || 'Upload failed');
                    photoUrl = uploadData.url;
                } catch (error) {
                    console.error(translations[currentLanguage]?.image_upload_error || 'Image upload error:', error);
                }
            }

            const res = await fetch(`${API_BASE}/api/users`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    username, 
                    password, 
                    role: 'administrator', 
                    photo: photoUrl
                })
            });

            if (res.ok) {
                showMessageModal(translations[currentLanguage]?.new_admin_created || 'New admin created!');
                switchAdminTab('list');
                document.getElementById('newAdminUsername').value = '';
                document.getElementById('newAdminPassword').value = '';
                newAdminPhotoInput.value = '';
                document.getElementById('newAdminPhotoPreview').src = 'image/THE ADMIN.png';
            } else {
                const data = await res.json();
                showMessageModal(data.error || translations[currentLanguage]?.failed_create_admin || 'Failed to create admin.');
            }
        };
    }
    
    // New Admin Photo Preview
    if (newAdminPhotoInput) {
        newAdminPhotoInput.onchange = function (e) {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (evt) => {
                    document.getElementById('newAdminPhotoPreview').src = evt.target.result;
                };
                reader.readAsDataURL(file);
            }
        };
    }

    // Delete Admin Function
    window.deleteAdmin = async function (username) {
        if (!currentUser || ((currentUser.username !== 'admin' || currentUser.password !== 'admin123') && !currentUser.isOwner)) {
            showMessageModal(translations[currentLanguage]?.only_system_owner_delete || 'Only the system owner can delete administrator accounts.');
            return;
        }
        
        if (username === 'admin') {
            showMessageModal(translations[currentLanguage]?.system_owner_cannot_delete || 'The system owner account cannot be deleted.');
            return;
        }
        
        const confirmMessage = translations[currentLanguage]?.confirm_delete_admin?.replace('{username}', username) || `Are you sure you want to delete admin "${username}"?`;
        
        if (!confirm(confirmMessage)) return;
        
        const res = await fetch(`${API_BASE}/api/users/${encodeURIComponent(username)}`, { method: 'DELETE' });
        if (res.ok) {
            showMessageModal(translations[currentLanguage]?.admin_deleted_success?.replace('{username}', username) || `Admin "${username}" has been deleted.`);
            renderAdminInfo();
            await loadUsers();
        } else {
            showMessageModal(translations[currentLanguage]?.failed_delete_admin || 'Failed to delete admin.');
        }
    };

    // Remove Sales Associate
    window.removeModalAssociate = async function(username) {
        if (!currentUser || currentUser.role !== 'administrator') {
            showMessageModal(translations[currentLanguage]?.onlyAdminsCanRemoveAssociates || 'Only administrators can remove associates.');
            return;
        }
        
        if (!confirm(`Are you sure you want to remove ${username}?`)) return;
        
        try {
            const response = await fetch(`${API_BASE}/api/users/${username}`, { method: 'DELETE' });
            if (response.ok) {
                await loadUsers();
                rendersalesAssociates();
                showMessageModal(`${username} removed successfully`);
            } else {
                showMessageModal(translations[currentLanguage]?.failedToDeleteUser || 'Failed to delete user');
            }
        } catch (error) {
            console.error('Error deleting user:', error);
        }
    };

    setTimeout(() => {
        translateUI();
    }, 100);
});


// Add these functions to your JavaScript

// Helper function to toggle password visibility
function togglePasswordVisibility(elementId, button) {
    const passwordSpan = document.getElementById(elementId);
    if (passwordSpan.classList.contains('hidden')) {
        passwordSpan.classList.remove('hidden');
        button.textContent = 'Hide';
    } else {
        passwordSpan.classList.add('hidden');
        button.textContent = 'Show';
    }
}

// Show Sales Profile Modal


// Close Sales Profile Modal
document.getElementById('closeSalesProfileModalBtn')?.addEventListener('click', function() {
    document.getElementById('salesProfileModal').classList.add('hidden');
});

// Close modal when clicking outside
document.getElementById('salesProfileModal')?.addEventListener('click', function(e) {
    if (e.target === this) {
        this.classList.add('hidden');
    }
});



// Permission check functions for sales associates
function canEditSalesProfile(targetUsername) {
    if (!currentUser) return false;
    
    // Admin or system owner can edit anyone
    if (currentUser.role === 'administrator' || 
        (currentUser.username === 'admin' && currentUser.password === 'admin123') || 
        currentUser.isOwner) {
        return true;
    }
    
    // Sales associates can only edit their own profile
    return currentUser.username === targetUsername;
}

function canEditFullInfo(targetUsername) {
    if (!currentUser) return false;
    
    // Only admin/system owner can edit all fields
    return currentUser.role === 'administrator' || 
           (currentUser.username === 'admin' && currentUser.password === 'admin123') || 
           currentUser.isOwner;
}



// Show Sales Profile Modal
window.showSalesProfileModal = async function(username) {
    try {
        
        // Fetch user data
        const res = await fetch(`${API_BASE}/api/users`);
        const usersArr = await res.json();
        const user = usersArr.find(u => u.username === username && (u.role === 'sales' || u.role === 'manager'));
        
        if (!user) {
            console.error('Sales associate not found:', username);
            return;
        }

        // Check if current user can edit this profile
        const canEdit = canEditSalesProfile(username);
        const canEditAll = canEditFullInfo(username);

        // Set profile photo
        let photoUrl = fixImagePath(user.photo || 'image/user mangement.png');
        if (photoUrl.startsWith('data:image')) {
            photoUrl = 'image/user mangement.png';
        }
        document.getElementById('displaySalesPhoto').src = photoUrl;
        document.getElementById('salesProfilePhotoPreview').src = photoUrl;

        // Set name
        const displayName = user.firstName && user.surname 
            ? `${user.firstName} ${user.surname}` 
            : user.username;
        document.getElementById('displaySalesName').textContent = displayName;

        // Set role with badge if manager
        const roleSpan = document.getElementById('displaySalesRole');
        if (user.role === 'manager') {
            roleSpan.innerHTML = `
                Manager
                <svg class="w-4 h-4 ml-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                </svg>
            `;
            roleSpan.className = 'mt-2 px-4 py-1.5 bg-gradient-to-r from-purple-500 to-purple-600 text-white text-xs font-bold rounded-full uppercase tracking-wider shadow-sm flex items-center gap-1';
        } else {
            roleSpan.innerHTML = 'Sales Associate';
            roleSpan.className = 'mt-2 px-4 py-1.5 bg-gradient-to-r from-green-500 to-green-600 text-white text-xs font-bold rounded-full uppercase tracking-wider shadow-sm flex items-center gap-1';
        }

        // Set username
        document.getElementById('displaySalesUsername').textContent = `@${user.username}`;

        // Set password (hidden by default)
        document.getElementById('displaySalesPassText').textContent = user.password || 'No password set';

        // Set contact info
        document.getElementById('displaySalesPhone').textContent = user.phone || 'Not set';
        document.getElementById('displaySalesEmail').textContent = user.email || 'Not set';
        document.getElementById('displaySalesAddress').textContent = user.address || 'Not set';

        // Calculate stats
// Fetch user stats from server
try {
    const statsRes = await fetch(`${API_BASE}/api/user-stats/${encodeURIComponent(username)}`);
    if (statsRes.ok) {
        const stats = await statsRes.json();
        document.getElementById('displaySalesCount').textContent = stats.salesCount;
        document.getElementById('displayStockUpdatesCount').textContent = stats.stockUpdatesCount;

        if (stats.memberSince) {
            const memberDate = new Date(stats.memberSince);
            document.getElementById('displayMemberSince').textContent = memberDate.toLocaleDateString(undefined, { 
                year: 'numeric', 
                month: 'short', 
                day: 'numeric' 
            });
        } else {
            document.getElementById('displayMemberSince').textContent = 'N/A';
        }
    } else {
        console.warn('Failed to fetch user stats');
        // Fallback to zeros
        document.getElementById('displaySalesCount').textContent = '0';
        document.getElementById('displayStockUpdatesCount').textContent = '0';
        document.getElementById('displayMemberSince').textContent = 'N/A';
    }
} catch (statsError) {
    console.error('Error fetching user stats:', statsError);
    document.getElementById('displaySalesCount').textContent = '0';
    document.getElementById('displayStockUpdatesCount').textContent = '0';
    document.getElementById('displayMemberSince').textContent = 'N/A';
}

        // Fill edit form
        document.getElementById('editSalesFirstName').value = user.firstName || '';
        document.getElementById('editSalesSurname').value = user.surname || '';
        document.getElementById('editSalesUsername').value = user.username || '';
        document.getElementById('editSalesPassword').value = user.password || '';
        document.getElementById('editSalesEmail').value = user.email || '';
        document.getElementById('editSalesPhone').value = user.phone || '';
        document.getElementById('editSalesAddress').value = user.address || '';

        // Set field permissions based on user role
        const emailContainer = document.getElementById('editSalesEmailContainer');
        const phoneContainer = document.getElementById('editSalesPhoneContainer');
        const addressContainer = document.getElementById('editSalesAddressContainer');
        const emailInput = document.getElementById('editSalesEmail');
        const phoneInput = document.getElementById('editSalesPhone');
        const addressInput = document.getElementById('editSalesAddress');
        const emailNote = document.getElementById('emailEditNote');
        const phoneNote = document.getElementById('phoneEditNote');
        const addressNote = document.getElementById('addressEditNote');

        if (canEditAll) {
            // Admin/system owner can edit everything
            emailInput.removeAttribute('readonly');
            phoneInput.removeAttribute('readonly');
            addressInput.removeAttribute('readonly');
            emailInput.classList.remove('bg-gray-100', 'dark:bg-slate-700', 'cursor-not-allowed');
            phoneInput.classList.remove('bg-gray-100', 'dark:bg-slate-700', 'cursor-not-allowed');
            addressInput.classList.remove('bg-gray-100', 'dark:bg-slate-700', 'cursor-not-allowed');
            emailNote.textContent = 'You can edit this field';
            phoneNote.textContent = 'You can edit this field';
            addressNote.textContent = 'You can edit this field';
        } else {
            // Regular user can only view these fields
            emailInput.setAttribute('readonly', true);
            phoneInput.setAttribute('readonly', true);
            addressInput.setAttribute('readonly', true);
            emailInput.classList.add('bg-gray-100', 'dark:bg-slate-700', 'cursor-not-allowed');
            phoneInput.classList.add('bg-gray-100', 'dark:bg-slate-700', 'cursor-not-allowed');
            addressInput.classList.add('bg-gray-100', 'dark:bg-slate-700', 'cursor-not-allowed');
            emailNote.textContent = 'Only admins can edit';
            phoneNote.textContent = 'Only admins can edit';
            addressNote.textContent = 'Only admins can edit';
        }

        // Show/hide edit button based on permissions
        const editBtn = document.getElementById('goToSalesEditBtn');
        if (canEdit) {
            editBtn.classList.remove('hidden');
            editBtn.dataset.username = username;
        } else {
            editBtn.classList.add('hidden');
        }

        // Reset to display mode
        document.getElementById('salesDisplaySection').classList.remove('hidden');
        document.getElementById('salesEditSection').classList.add('hidden');
        document.getElementById('salesProfileModalTitle').textContent = 
            user.role === 'manager' ? 'Manager Profile' : 'Sales Associate Profile';

        // Show modal
        document.getElementById('salesProfileModal').classList.remove('hidden');
        
    } catch (error) {
        console.error('Error showing sales profile:', error);
        showMessageModal('Error loading profile');
    }
};

// Go to edit mode
document.getElementById('goToSalesEditBtn')?.addEventListener('click', function() {
    document.getElementById('salesDisplaySection').classList.add('hidden');
    document.getElementById('salesEditSection').classList.remove('hidden');
    document.getElementById('salesProfileModalTitle').textContent = 'Edit Profile';
});

// Cancel edit
document.getElementById('cancelSalesEditBtn')?.addEventListener('click', function() {
    document.getElementById('salesEditSection').classList.add('hidden');
    document.getElementById('salesDisplaySection').classList.remove('hidden');
    document.getElementById('salesProfileModalTitle').textContent = 
        document.getElementById('displaySalesRole').textContent.includes('Manager') ? 'Manager Profile' : 'Sales Associate Profile';
});

// Save profile changes
document.getElementById('saveSalesProfileBtn')?.addEventListener('click', async function() {
    const username = document.getElementById('goToSalesEditBtn').dataset.username;
    
    if (!username) return;
    
    // Check permissions again
    const canEdit = canEditSalesProfile(username);
    const canEditAll = canEditFullInfo(username);
    
    if (!canEdit) {
        showMessageModal('You do not have permission to edit this profile');
        return;
    }
    
    const saveBtn = this;
    saveBtn.disabled = true;
    saveBtn.textContent = 'SAVING...';
    
    try {
        // Handle photo upload
        let finalPhotoUrl = document.getElementById('salesProfilePhotoPreview').src;
        const photoFile = document.getElementById('editSalesPhoto').files[0];
        
        if (photoFile) {
            const formData = new FormData();
            formData.append('image', photoFile);
            const uploadRes = await fetch(`${API_BASE}/api/upload-image`, {
                method: 'POST',
                body: formData
            });
            const uploadData = await uploadRes.json();
            if (uploadRes.ok) {
                finalPhotoUrl = uploadData.url;
            }
        }
        
        // Prepare updated data - only include fields user can edit
        const updatedUser = {
            firstName: document.getElementById('editSalesFirstName').value.trim(),
            surname: document.getElementById('editSalesSurname').value.trim(),
            password: document.getElementById('editSalesPassword').value,
            photo: finalPhotoUrl,
            role: document.getElementById('displaySalesRole').textContent.includes('Manager') ? 'manager' : 'sales'
        };
        
        // Only include these if user has full edit permissions
        if (canEditAll) {
            updatedUser.email = document.getElementById('editSalesEmail').value.trim();
            updatedUser.phone = document.getElementById('editSalesPhone').value.trim();
            updatedUser.address = document.getElementById('editSalesAddress').value.trim();
        }
        
        // Send update
        const response = await fetch(`${API_BASE}/api/users/${encodeURIComponent(username)}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedUser)
        });
        
        if (response.ok) {
            showMessageModal('Profile updated successfully!');
            document.getElementById('salesProfileModal').classList.add('hidden');
                await loadUsers();
             
            
            // Update current user if they edited their own profile
            if (currentUser && currentUser.username === username) {
                currentUser = { ...currentUser, ...updatedUser };
                localStorage.setItem('currentUsername', currentUser.username);
            }
        } else {
            const err = await response.json();
            throw new Error(err.error || 'Update failed');
        }
    } catch (error) {
        showMessageModal(error.message);
    } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = 'SAVE CHANGES';
           rendersalesAssociates();
    }
});

// Photo preview
document.getElementById('editSalesPhoto')?.addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (evt) => {
            document.getElementById('salesProfilePhotoPreview').src = evt.target.result;
        };
        reader.readAsDataURL(file);
    }
});

// Close modal
document.getElementById('closeSalesProfileModalBtn')?.addEventListener('click', function() {
    document.getElementById('salesProfileModal').classList.add('hidden');
});

// Close on outside click
document.getElementById('salesProfileModal')?.addEventListener('click', function(e) {
    if (e.target === this) {
        this.classList.add('hidden');
    }
});

async function demoteUserToSales(username) {
    // Check if user has permission (administrator only)
    if (!currentUser || currentUser.role !== 'administrator') {
        showMessageModal(translations[currentLanguage]?.onlyAdminsCanDemoteManagers || 'Only administrators can demote managers.');
        return;
    }

    // Confirm before demoting
    const confirmMessage = translations[currentLanguage]?.confirmDemoteManager 
        ? translations[currentLanguage].confirmDemoteManager.replace('{username}', username)
        : `Are you sure you want to demote ${username} from Manager to Sales Associate?`;
    
    if (!confirm(confirmMessage)) {
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/api/users/${username}/role`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ role: 'sales' })
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || 'Failed to demote user');
        }

        // Update local users list
        const updatedUser = await response.json();
        const idx = users.findIndex(u => u.username === username);
        if (idx !== -1) {
            users[idx] = updatedUser;
        } else {
            // If user not found in local array, reload all users
            await loadUsers();
        }

        // Broadcast demotion to all clients via WebSocket
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
                type: 'system-announcement',
                event: 'manager-demoted',
                message: `${username} has been demoted to Sales Associate.`,
                date: new Date().toLocaleString(),
                username: username
            }));
        }

        // Show success message
        const successMessage = translations[currentLanguage]?.nowSalesAssociate 
            ? `${username} ${translations[currentLanguage].nowSalesAssociate}`
            : `✅ ${username} is now a Sales Associate again!`;
        showMessageModal(successMessage);

        // Close any open modals that might be showing this user
        const userDetailsModal = document.getElementById('modalUserDetails');
        if (userDetailsModal && !userDetailsModal.classList.contains('hidden')) {
            userDetailsModal.classList.add('hidden');
        }

        // Refresh the sales associates list if it's visible
        if (typeof rendersalesAssociates === 'function') {
            rendersalesAssociates();
        }

        // Refresh any other UI components that show user lists
        if (typeof renderModalAssociates === 'function') {
            renderModalAssociates();
        }

    } catch (error) {
        console.error('Demote error:', error);
        showMessageModal('❌ ' + error.message);
    }
} 

    document.getElementById('modalAddAssociateBtn').addEventListener('click', modalAddAssociateBtn);

async function makeUserManager(username) {
    // Check if user has permission (administrator only)
    if (!currentUser || currentUser.role !== 'administrator') {
        showMessageModal(translations[currentLanguage]?.onlyAdminsCanPromote || 'Only administrators can promote users to manager.');
        return;
    }

    // Confirm before promoting
    const confirmMessage = translations[currentLanguage]?.confirmPromoteToManager 
        ? translations[currentLanguage].confirmPromoteToManager.replace('{username}', username)
        : `Are you sure you want to promote ${username} to Manager?`;
    
    if (!confirm(confirmMessage)) {
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/api/users/${username}/role`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                role: 'manager', 
                promotedAt: new Date().toISOString() 
            })
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || (translations[currentLanguage]?.failedPromoteUser || 'Failed to promote user'));
        }

        // Update local users list
        const updatedUser = await response.json();
        const idx = users.findIndex(u => u.username === username);
        if (idx !== -1) {
            users[idx] = updatedUser;
        } else {
            // If user not found in local array, reload all users
            await loadUsers();
        }

        // Broadcast promotion to all clients via WebSocket
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
                type: 'system-announcement',
                event: 'manager-promoted',
                message: `${username} ${translations[currentLanguage]?.promotedToManager || 'has been promoted to Manager!'}`,
                date: new Date().toLocaleString(),
                username: username
            }));
        }

        // Show success message
        const successMessage = translations[currentLanguage]?.nowManager 
            ? `${username} ${translations[currentLanguage].nowManager}`
            : `✅ ${username} is now a Manager!`;
        showMessageModal(successMessage);

        // Close any open modals that might be showing this user
        const userDetailsModal = document.getElementById('modalUserDetails');
        if (userDetailsModal && !userDetailsModal.classList.contains('hidden')) {
            userDetailsModal.classList.add('hidden');
        }

     
        if (typeof rendersalesAssociates === 'function') {
            rendersalesAssociates();
        }

    
        if (typeof renderModalAssociates === 'function') {
            renderModalAssociates();
        }

        // Show promotion envelope/certificate for the promoted user
        // Only show if this client belongs to the promoted user
        if (typeof showPromotionEnvelope === 'function' && currentUser && currentUser.username === username) {
            showPromotionEnvelope(username);
        }

    } catch (error) {
        console.error('Promote to manager error:', error);
        showMessageModal('❌ ' + error.message);
    }
}


function toggleSalesPasswordVisibility(button) {
    const passwordSpan = document.getElementById('displaySalesPassText');
    if (passwordSpan.classList.contains('hidden')) {
        passwordSpan.classList.remove('hidden');
        button.textContent = 'Hide';
    } else {
        passwordSpan.classList.add('hidden');
        button.textContent = 'Show';
    }
}
// If you are in Electron, use the shell API to open externally
function openMicrosoftStore() {
    const storeUrl = 'https://apps.microsoft.com/detail/9n2cc5wp3wrv?hl=fr-FR&gl=CI';
    if (window.electronAPI && window.electronAPI.openExternal) {
        window.electronAPI.openExternal(storeUrl);
    } else {
        // Fallback for browser / regular web
        window.open(storeUrl, '_blank', 'noopener,noreferrer');
    }
}

// Attach event listener when the button exists
const downloadclientBtn = document.getElementById('downloadClientBtn');
if (downloadclientBtn) {
    downloadclientBtn.addEventListener('click', (e) => {
        e.preventDefault();
        openMicrosoftStore();
    });
}