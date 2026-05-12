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
    
    try {
        const client = getSB();
        let usersArr = [];
        
        // Get current business ID for filtering
        const currentBusinessId = currentUser?.business_id || businessInfo?.id || localStorage.getItem('businessId') || null;
        
        if (client) {
            let query = client
                .from('users')
                .select('*')
                .eq('role', 'administrator')
                .order('username', { ascending: true });
            
            // Filter by business for multi-tenant - only show admins from SAME business
            if (currentBusinessId) {
                query = query.eq('business_id', currentBusinessId);
            }
            
            const { data, error } = await query;

            if (!error && data) {
                usersArr = data;
            }
        }
        
        // Fallback to local users array (also filtered by business)
        if (usersArr.length === 0 && typeof users !== 'undefined') {
            usersArr = users.filter(u => {
                if (u.role !== 'administrator') return false;
                // Filter by business if multi-tenant
                if (currentBusinessId && u.business_id && u.business_id !== currentBusinessId) return false;
                return true;
            });
        }
        
        const admins = usersArr.filter(u => u.role === 'administrator');
        const isSystemOwner = currentUser && ((currentUser.username === 'admin' && currentUser.password === 'admin123') || currentUser.isOwner || currentUser.is_owner);
        
        if (typeof nomessage !== 'undefined' && nomessage) nomessage.classList.add('hidden');

        if (admins.length === 0) {
            adminListContainer.innerHTML = `
                <div class="text-center text-gray-500 py-8">
                    No administrators found for this business.
                </div>
            `;
            return;
        }

        adminListContainer.innerHTML = admins.map(admin => {
            let photoUrl = admin.photo_url || admin.photo || 'image/THE ADMIN.png';
            if (photoUrl.startsWith('data:image')) {
                photoUrl = 'image/THE ADMIN.png';
            }
            
            const canDelete = isSystemOwner && admin.username !== 'admin';
            const canView = typeof canViewAdminInfo === 'function' ? canViewAdminInfo(admin.username) : true;
            
            return `
                <div onclick="${canView ? `showAdminProfileModal('${admin.username}')` : ''}" 
                    class="bg-white dark:bg-slate-800 p-4 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow flex items-center space-x-4 relative group ${!canView ? 'opacity-75 cursor-not-allowed' : 'cursor-pointer'}">
                    <div class="relative">
                        <img src="${photoUrl}" 
                            class="w-14 h-14 rounded-full object-cover border-2 border-blue-100 dark:border-slate-600"
                            onerror="this.src='image/THE ADMIN.png'">
                        <span class="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white dark:border-slate-800 rounded-full"></span>
                    </div>
                    <div class="flex-1">
                        <div class="flex items-center">
                            <h4 class="font-bold text-gray-800 dark:text-white">${admin.username}</h4>
                            ${(admin.username === 'admin' || admin.isOwner || admin.is_owner) ? `
                                <svg class="ml-1.5 w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.64.304 1.24.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" />
                                </svg>
                            ` : ''}
                        </div>
                        <p class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-tighter">
                            ${(admin.username === 'admin' || admin.isOwner || admin.is_owner) ? (translations[currentLanguage]?.system_owner || 'System Owner') : (translations[currentLanguage]?.staff_administrator || 'Staff Administrator')}
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
        
        if (typeof translateUI === 'function') translateUI();
        
    } catch (error) {
        console.error('Error rendering admin info:', error);
    }
}
    // Render Sales Associates
async function rendersalesAssociates() {
    if (!salesListContainer) return;
    
    try {
        const client = getSB();
        let usersArr = [];
        
        // Get current business ID for filtering
        const currentBusinessId = currentUser?.business_id || businessInfo?.id || localStorage.getItem('businessId') || null;
        
        if (client) {
            let query = client
                .from('users')
                .select('*')
                .in('role', ['sales', 'manager'])
                .order('username', { ascending: true });
            
            // Filter by business - only show users from SAME business
            if (currentBusinessId) {
                query = query.eq('business_id', currentBusinessId);
            }
            
            const { data, error } = await query;

            if (!error && data) {
                usersArr = data;
            }
        }
        
        // Fallback to local users array
        if (usersArr.length === 0 && typeof users !== 'undefined') {
            usersArr = users.filter(u => {
                if (u.role !== 'sales' && u.role !== 'manager') return false;
                if (currentBusinessId && u.business_id && u.business_id !== currentBusinessId) return false;
                return true;
            });
        }
        
        const salesUsers = usersArr.filter(u => u.role === 'sales' || u.role === 'manager');
        const isSystemOwner = currentUser && ((currentUser.username === 'admin' && currentUser.password === 'admin123') || currentUser.isOwner || currentUser.is_owner);
        const nomessage = document.getElementById('nosaleaddemegse');

        // If no sales associates found, show the message and exit
        if (salesUsers.length === 0) {
            salesListContainer.innerHTML = '';
            if (nomessage) nomessage.classList.remove('hidden');
            if (nomessage && typeof translateUI === 'function') translateUI();
            return;
        }

        // Otherwise, hide the message and render the list
        if (nomessage) nomessage.classList.add('hidden');

        salesListContainer.innerHTML = salesUsers.map(user => {
            let photoUrl = user.photo_url || user.photo || 'image/user mangement.png';
            if (photoUrl.startsWith('data:image')) {
                photoUrl = 'image/user mangement.png';
            }
            const displayName = user.full_name || (user.firstName && user.surname 
                ? `${user.firstName} ${user.surname}` 
                : user.username);

            const canDelete = isSystemOwner || currentUser?.role === 'administrator';
            
            return `
                <div onclick="showSalesProfileModal('${user.username}')" class="bg-white dark:bg-slate-800 p-4 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow flex items-center space-x-4 relative group">
                    <div class="relative">
                        <img src="${photoUrl}" 
                            class="w-14 h-14 rounded-full object-cover border-2 border-green-100 dark:border-slate-600"
                            onerror="this.src='image/user mangement.png'">
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
                                <button onclick="event.stopPropagation(); makeUserManager('${user.username}')" 
                                        class="bg-green-500 hover:bg-green-600 text-white rounded-lg px-3 py-1 text-xs font-medium transition-colors"
                                        title="Promote to Manager">Promote</button>
                            ` : `
                                <button onclick="event.stopPropagation(); demoteUserToSales('${user.username}')" 
                                        class="bg-purple-500 hover:bg-purple-600 text-white rounded-lg px-3 py-1 text-xs font-medium transition-colors"
                                        title="Demote to Sales">Demote</button>
                            `}
                            <button onclick="event.stopPropagation(); removeModalAssociate('${user.username}')" 
                                    class="bg-red-500 hover:bg-red-700 text-white rounded-full w-8 h-8 flex items-center justify-center"
                                    title="Remove User">&times;</button>
                        </div>
                    ` : ''}
                </div>
            `;
        }).join('');
        
        if (typeof translateUI === 'function') translateUI();
        
    } catch (error) {
        console.error('Error rendering sales associates:', error);
    }
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

        const client = getSB();
        if (!client) {
            showMessageModal('Database connection failed.');
            return;
        }

        try {
            const currentBusinessId = currentUser?.business_id || businessInfo?.id || localStorage.getItem('businessId') || null;

            // Check if username exists (in same business)
            let checkQuery = client.from('users').select('id').eq('username', username);
            if (currentBusinessId) checkQuery = checkQuery.eq('business_id', currentBusinessId);
            
            const { data: existingUser } = await checkQuery.maybeSingle();
            
            if (existingUser) {
                showMessageModal(translations[currentLanguage]?.usernameAlreadyExists || 'Username already exists!');
                return;
            }

            // Upload photo if selected
            let photoUrl = '';
            if (photoFile) {
                const fileExt = photoFile.name.split('.').pop();
                const fileName = `avatars/${Date.now()}_${Math.random().toString(36).substr(2, 6)}.${fileExt}`;
                
                const { error: uploadError } = await client.storage
                    .from('logos')
                    .upload(fileName, photoFile, {
                        cacheControl: '3600',
                        upsert: true
                    });

                if (!uploadError) {
                    const { data: urlData } = client.storage
                        .from('logos')
                        .getPublicUrl(fileName);
                    photoUrl = urlData.publicUrl;
                }
            }

            // Create new sales associate
            const { error: insertError } = await client
                .from('users')
                .insert([{
                    first_name: firstName,
                    surname: surname,
                    full_name: `${firstName} ${surname}`.trim(),
                    username,
                    password,
                    email,
                    phone,
                    address,
                    role: 'sales',
                    photo_url: photoUrl || null,
                    business_id: currentBusinessId,
                    created_at: new Date().toISOString()
                }]);

                        // In saveNewSalesAssociateBtn, change the error handling to show the full error:
            if (insertError) {
                console.error('Insert error details:', JSON.stringify(insertError));
                showMessageModal('Failed to add: ' + insertError.message + ' | Code: ' + insertError.code);
                return;
            };

            // Clear form
            if (typeof clearSalesAssociateForm === 'function') clearSalesAssociateForm();

            if (typeof loadUsers === 'function') await loadUsers();
            if (typeof rendersalesAssociates === 'function') rendersalesAssociates();
            
            showMessageModal(translations[currentLanguage]?.salesAssociateAddedSuccessfully || 'Sales associate added successfully');
            
            if (typeof switchAdminTab === 'function') switchAdminTab('saleslist');
            
        } catch (error) {
            console.error('Error adding associate:', error);
            showMessageModal(translations[currentLanguage]?.failedToAddSalesAssociate || 'Failed to add sales associate');
        }
    });
}


    // Show Admin Profile Modal
window.showAdminProfileModal = async function (username) {
    if (typeof canViewAdminInfo === 'function' && !canViewAdminInfo(username)) {
        showMessageModal(translations[currentLanguage]?.no_permission_view_admin || 'You do not have permission to view this administrator profile.');
        return;
    }
    
    const client = getSB();
    if (!client) {
        showMessageModal('Database connection failed.');
        return;
    }

    try {
        const currentBusinessId = currentUser?.business_id || businessInfo?.id || localStorage.getItem('businessId') || null;

        // ========== Try exact match first ==========
        let query = client.from('users').select('*').eq('username', username).eq('role', 'administrator');
        if (currentBusinessId) query = query.eq('business_id', currentBusinessId);
        
        let { data: admin, error } = await query.maybeSingle();

        // ========== FIX: If not found, try case-insensitive ==========
        if (!admin) {
            let ilikeQuery = client.from('users').select('*').ilike('username', username).eq('role', 'administrator');
            if (currentBusinessId) ilikeQuery = ilikeQuery.eq('business_id', currentBusinessId);
            
            const result = await ilikeQuery.maybeSingle();
            admin = result.data;
            error = result.error;
        }

        if (error || !admin) {
            console.error('Admin not found:', username);
            showMessageModal('Administrator not found. Please try again.');
            return;
        }

        displaySection.classList.remove('hidden');
        editSection.classList.add('hidden');
        document.getElementById('profileModalTitle').innerText = translations[currentLanguage]?.admin_profile_title || "Admin Profile";
        
        let displayPhoto = admin.photo_url || admin.photo || 'image/THE ADMIN.png';
        if (displayPhoto.startsWith('data:image')) displayPhoto = 'image/THE ADMIN.png';

        document.getElementById('displayAdminPhoto').src = displayPhoto;
        document.getElementById('displayAdminPhoto').onerror = function() { this.src = 'image/THE ADMIN.png'; };
        document.getElementById('displayAdminName').innerText = admin.username;
        document.getElementById('displayAdminPass').innerText = admin.password ? '••••••' : 'Not set';
        document.getElementById('displayAdminPhone').innerText = admin.phone || 'Not set';
        document.getElementById('displayAdminEmail').innerText = admin.email || 'Not set';
        document.getElementById('displayAdminAddress').innerText = admin.address || 'Not set';

        document.getElementById('adminProfilePhotoPreview').src = displayPhoto;
        document.getElementById('editAdminUsername').value = admin.username || '';
        document.getElementById('editAdminPassword').value = admin.password || '';
        document.getElementById('editAdminPhone').value = admin.phone || '';
        document.getElementById('editAdminEmail').value = admin.email || '';
        document.getElementById('editAdminAddress').value = admin.address || '';

        if (saveAdminProfileBtn) saveAdminProfileBtn.dataset.originalUsername = admin.username;
        
        const canModify = typeof canModifyAdmin === 'function' ? canModifyAdmin(admin.username) : true;
        if (goToEditBtn) {
            goToEditBtn.classList.toggle('hidden', !canModify);
        }
        
        adminProfileModal.classList.remove('hidden');

    } catch (err) {
        console.error('Error showing admin profile:', err);
        showMessageModal('Error loading admin profile.');
    }
};

    // Save Profile Changes
if (saveAdminProfileBtn) {
    saveAdminProfileBtn.onclick = async function () {
        const originalUsername = this.dataset.originalUsername;
        
        if (typeof canModifyAdmin === 'function' && !canModifyAdmin(originalUsername)) {
            showMessageModal(translations[currentLanguage]?.no_permission_edit_admin || 'You do not have permission to modify this administrator profile.');
            return;
        }
        
        const saveBtn = this;
        saveBtn.disabled = true;
        saveBtn.innerText = translations[currentLanguage]?.saving_text || "SAVING...";

        const client = getSB();
        if (!client) {
            showMessageModal('Database connection failed.');
            saveBtn.disabled = false;
            saveBtn.innerText = translations[currentLanguage]?.save_changes || "SAVE CHANGES";
            return;
        }

        try {
            const currentBusinessId = currentUser?.business_id || businessInfo?.id || localStorage.getItem('businessId') || null;
            
            let finalPhotoUrl = document.getElementById('adminProfilePhotoPreview').src;
            const photoFile = editAdminPhotoInput.files[0];

            // Upload photo to Supabase Storage
            if (photoFile) {
                const fileExt = photoFile.name.split('.').pop();
                const fileName = `avatars/${Date.now()}_${Math.random().toString(36).substr(2, 6)}.${fileExt}`;
                
                const { error: uploadError } = await client.storage
                    .from('logos')
                    .upload(fileName, photoFile, {
                        cacheControl: '3600',
                        upsert: true
                    });

                if (!uploadError) {
                    const { data: urlData } = client.storage
                        .from('logos')
                        .getPublicUrl(fileName);
                    finalPhotoUrl = urlData.publicUrl;
                }
            }

            const updatedUser = {
                username: document.getElementById('editAdminUsername').value.trim(),
                password: document.getElementById('editAdminPassword').value || undefined,
                phone: document.getElementById('editAdminPhone').value,
                email: document.getElementById('editAdminEmail').value,
                address: document.getElementById('editAdminAddress').value,
                photo_url: finalPhotoUrl,
                role: 'administrator',
                updated_at: new Date().toISOString()
            };

            // Remove empty password (don't overwrite with blank)
            if (!updatedUser.password) delete updatedUser.password;

            // Update in Supabase (with business safety)
            let updateQuery = client.from('users').update(updatedUser).eq('username', originalUsername).eq('role', 'administrator');
            if (currentBusinessId) updateQuery = updateQuery.eq('business_id', currentBusinessId);

            const { error } = await updateQuery;

            if (error) throw new Error(error.message);

            showMessageModal(translations[currentLanguage]?.admin_info_updated || 'Admin Info Updated Successfully!');
            adminProfileModal.classList.add('hidden');
            
            if (typeof renderAdminInfo === 'function') renderAdminInfo();
            if (typeof loadUsers === 'function') await loadUsers();
            
            if (originalUsername === currentUser.username) {
                currentUser = { ...currentUser, ...updatedUser };
                localStorage.setItem('currentUsername', updatedUser.username);
            }

        } catch (error) {
            console.error('Update admin error:', error);
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
// Save New Admin
if (saveNewAdminBtn) {
    saveNewAdminBtn.onclick = async function (e) {
        e.preventDefault();
        
        if (!currentUser || ((currentUser.username !== 'admin' || currentUser.password !== 'admin123') && !currentUser.isOwner && !currentUser.is_owner)) {
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

        const client = getSB();
        if (!client) {
            showMessageModal('Database connection failed.');
            return;
        }

        try {
            const currentBusinessId = currentUser?.business_id || businessInfo?.id || localStorage.getItem('businessId') || null;

            // Check if username already exists (in same business)
            let checkQuery = client.from('users').select('id').eq('username', username);
            if (currentBusinessId) checkQuery = checkQuery.eq('business_id', currentBusinessId);
            
            const { data: existingUser } = await checkQuery.maybeSingle();
            
            if (existingUser) {
                showMessageModal(translations[currentLanguage]?.username_exists_create?.replace('{username}', username) || `Username "${username}" already exists.`);
                return;
            }

            // Upload photo if selected
            if (photoFile) {
                const fileExt = photoFile.name.split('.').pop();
                const fileName = `avatars/${Date.now()}_${Math.random().toString(36).substr(2, 6)}.${fileExt}`;
                
                const { error: uploadError } = await client.storage
                    .from('logos')
                    .upload(fileName, photoFile, {
                        cacheControl: '3600',
                        upsert: true
                    });

                if (!uploadError) {
                    const { data: urlData } = client.storage
                        .from('logos')
                        .getPublicUrl(fileName);
                    photoUrl = urlData.publicUrl;
                }
            }

            // Create new admin user
            const { error: insertError } = await client
                .from('users')
                .insert([{ 
                    username, 
                    password, 
                    role: 'administrator', 
                    photo_url: photoUrl,
                    business_id: currentBusinessId,
                    created_at: new Date().toISOString()
                }]);

            // In saveNewSalesAssociateBtn, change the error handling to show the full error:
            if (insertError) {
                console.error('Insert error details:', JSON.stringify(insertError));
                showMessageModal('Failed to add: ' + insertError.message + ' | Code: ' + insertError.code);
                return;
            }

            showMessageModal(translations[currentLanguage]?.new_admin_created || 'New admin created!');
            
            if (typeof switchAdminTab === 'function') switchAdminTab('list');
            document.getElementById('newAdminUsername').value = '';
            document.getElementById('newAdminPassword').value = '';
            newAdminPhotoInput.value = '';
            document.getElementById('newAdminPhotoPreview').src = 'image/THE ADMIN.png';
            
            if (typeof renderAdminInfo === 'function') renderAdminInfo();
            if (typeof loadUsers === 'function') await loadUsers();

        } catch (error) {
            console.error('Create admin error:', error);
            showMessageModal(error.message || (translations[currentLanguage]?.failed_create_admin || 'Failed to create admin.'));
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
// Show Sales Profile Modal
window.showSalesProfileModal = async function(username) {
    try {
        const client = getSB();
        if (!client) {
            showMessageModal('Database connection failed.');
            return;
        }

        const currentBusinessId = currentUser?.business_id || businessInfo?.id || localStorage.getItem('businessId') || null;

        // Fetch user from Supabase (filtered by business)
        let userQuery = client.from('users').select('*')
            .eq('username', username)
            .in('role', ['sales', 'manager']);
        if (currentBusinessId) userQuery = userQuery.eq('business_id', currentBusinessId);
        
        const { data: user, error: userError } = await userQuery.maybeSingle();
        
        if (userError || !user) {
            console.error('Sales associate not found:', username);
            showMessageModal('User not found.');
            return;
        }

        const canEdit = typeof canEditSalesProfile === 'function' ? canEditSalesProfile(username) : true;
        const canEditAll = typeof canEditFullInfo === 'function' ? canEditFullInfo(username) : true;

        // Set profile photo
        let photoUrl = user.photo_url || user.photo || 'image/user mangement.png';
        if (photoUrl.startsWith('data:image')) photoUrl = 'image/user mangement.png';
        document.getElementById('displaySalesPhoto').src = photoUrl;
        document.getElementById('salesProfilePhotoPreview').src = photoUrl;

        // Set name
        const displayName = user.full_name || (user.first_name && user.surname 
            ? `${user.first_name} ${user.surname}` 
            : user.username);
        document.getElementById('displaySalesName').textContent = displayName;

        // Set role badge
        const roleSpan = document.getElementById('displaySalesRole');
        if (user.role === 'manager') {
            roleSpan.innerHTML = `Manager <svg class="w-4 h-4 ml-1" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" /></svg>`;
            roleSpan.className = 'mt-2 px-4 py-1.5 bg-gradient-to-r from-purple-500 to-purple-600 text-white text-xs font-bold rounded-full uppercase tracking-wider shadow-sm flex items-center gap-1';
        } else {
            roleSpan.innerHTML = 'Sales Associate';
            roleSpan.className = 'mt-2 px-4 py-1.5 bg-gradient-to-r from-green-500 to-green-600 text-white text-xs font-bold rounded-full uppercase tracking-wider shadow-sm flex items-center gap-1';
        }

        document.getElementById('displaySalesUsername').textContent = `@${user.username}`;
        document.getElementById('displaySalesPassText').textContent = user.password || 'No password set';
        document.getElementById('displaySalesPhone').textContent = user.phone || 'Not set';
        document.getElementById('displaySalesEmail').textContent = user.email || 'Not set';
        document.getElementById('displaySalesAddress').textContent = user.address || 'Not set';

        // Calculate stats from Supabase
        try {
            // Count sales by this user
            let salesQuery = client.from('sales').select('id', { count: 'exact', head: true }).eq('username', username);
            if (currentBusinessId) salesQuery = salesQuery.eq('business_id', currentBusinessId);
            const { count: salesCount } = await salesQuery;

            // Count stock history by this user
            let historyQuery = client.from('stock_history').select('id', { count: 'exact', head: true }).eq('username', username);
            if (currentBusinessId) historyQuery = historyQuery.eq('business_id', currentBusinessId);
            const { count: stockUpdatesCount } = await historyQuery;

            document.getElementById('displaySalesCount').textContent = salesCount || 0;
            document.getElementById('displayStockUpdatesCount').textContent = stockUpdatesCount || 0;

            // Member since
            if (user.created_at) {
                const memberDate = new Date(user.created_at);
                document.getElementById('displayMemberSince').textContent = memberDate.toLocaleDateString(undefined, { 
                    year: 'numeric', month: 'short', day: 'numeric' 
                });
            } else {
                document.getElementById('displayMemberSince').textContent = 'N/A';
            }
        } catch (statsError) {
            console.error('Error fetching user stats:', statsError);
            document.getElementById('displaySalesCount').textContent = '0';
            document.getElementById('displayStockUpdatesCount').textContent = '0';
            document.getElementById('displayMemberSince').textContent = 'N/A';
        }

        // Fill edit form
        document.getElementById('editSalesFirstName').value = user.first_name || '';
        document.getElementById('editSalesSurname').value = user.surname || '';
        document.getElementById('editSalesUsername').value = user.username || '';
        document.getElementById('editSalesPassword').value = user.password || '';
        document.getElementById('editSalesEmail').value = user.email || '';
        document.getElementById('editSalesPhone').value = user.phone || '';
        document.getElementById('editSalesAddress').value = user.address || '';

        // Set field permissions
        const emailInput = document.getElementById('editSalesEmail');
        const phoneInput = document.getElementById('editSalesPhone');
        const addressInput = document.getElementById('editSalesAddress');

        if (canEditAll) {
            [emailInput, phoneInput, addressInput].forEach(input => {
                if (input) {
                    input.removeAttribute('readonly');
                    input.classList.remove('bg-gray-100', 'dark:bg-slate-700', 'cursor-not-allowed');
                }
            });
        } else {
            [emailInput, phoneInput, addressInput].forEach(input => {
                if (input) {
                    input.setAttribute('readonly', true);
                    input.classList.add('bg-gray-100', 'dark:bg-slate-700', 'cursor-not-allowed');
                }
            });
        }

        const editBtn = document.getElementById('goToSalesEditBtn');
        if (canEdit) {
            editBtn.classList.remove('hidden');
            editBtn.dataset.username = username;
        } else {
            editBtn.classList.add('hidden');
        }

        document.getElementById('salesDisplaySection').classList.remove('hidden');
        document.getElementById('salesEditSection').classList.add('hidden');
        document.getElementById('salesProfileModalTitle').textContent = 
            user.role === 'manager' ? 'Manager Profile' : 'Sales Associate Profile';
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
    
    const canEdit = typeof canEditSalesProfile === 'function' ? canEditSalesProfile(username) : true;
    const canEditAll = typeof canEditFullInfo === 'function' ? canEditFullInfo(username) : true;
    
    if (!canEdit) {
        showMessageModal('You do not have permission to edit this profile');
        return;
    }
    
    const saveBtn = this;
    saveBtn.disabled = true;
    saveBtn.textContent = 'SAVING...';
    
    const client = getSB();
    if (!client) {
        showMessageModal('Database connection failed.');
        saveBtn.disabled = false;
        saveBtn.textContent = 'SAVE CHANGES';
        return;
    }

    try {
        const currentBusinessId = currentUser?.business_id || businessInfo?.id || localStorage.getItem('businessId') || null;
        
        // Handle photo upload to Supabase Storage
        let finalPhotoUrl = document.getElementById('salesProfilePhotoPreview').src;
        const photoFile = document.getElementById('editSalesPhoto').files[0];
        
        if (photoFile) {
            const fileExt = photoFile.name.split('.').pop();
            const fileName = `avatars/${Date.now()}_${Math.random().toString(36).substr(2, 6)}.${fileExt}`;
            
            const { error: uploadError } = await client.storage
                .from('logos')
                .upload(fileName, photoFile, {
                    cacheControl: '3600',
                    upsert: true
                });

            if (!uploadError) {
                const { data: urlData } = client.storage
                    .from('logos')
                    .getPublicUrl(fileName);
                finalPhotoUrl = urlData.publicUrl;
            } else {
                console.warn('Photo upload failed:', uploadError.message);
            }
        }
        
        // Prepare updated data
        const updatedUser = {
            first_name: document.getElementById('editSalesFirstName').value.trim(),
            surname: document.getElementById('editSalesSurname').value.trim(),
            password: document.getElementById('editSalesPassword').value || undefined,
            photo_url: finalPhotoUrl,
            full_name: `${document.getElementById('editSalesFirstName').value.trim()} ${document.getElementById('editSalesSurname').value.trim()}`.trim(),
            role: document.getElementById('displaySalesRole').textContent.includes('Manager') ? 'manager' : 'sales',
            updated_at: new Date().toISOString()
        };
        
        // Remove password if empty (don't overwrite with empty)
        if (!updatedUser.password) delete updatedUser.password;
        
        // Only include these if user has full edit permissions
        if (canEditAll) {
            updatedUser.email = document.getElementById('editSalesEmail').value.trim();
            updatedUser.phone = document.getElementById('editSalesPhone').value.trim();
            updatedUser.address = document.getElementById('editSalesAddress').value.trim();
        }
        
        // Update in Supabase (with business safety)
        let updateQuery = client.from('users').update(updatedUser).eq('username', username);
        if (currentBusinessId) updateQuery = updateQuery.eq('business_id', currentBusinessId);
        
        const { error } = await updateQuery;

        if (error) throw new Error(error.message);

        showMessageModal('Profile updated successfully!');
        document.getElementById('salesProfileModal').classList.add('hidden');
        
        if (typeof loadUsers === 'function') await loadUsers();
        
        // Update current user if they edited their own profile
        if (currentUser && currentUser.username === username) {
            currentUser = { ...currentUser, ...updatedUser };
            localStorage.setItem('currentUsername', currentUser.username);
        }

    } catch (error) {
        showMessageModal(error.message);
    } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = 'SAVE CHANGES';
        if (typeof rendersalesAssociates === 'function') rendersalesAssociates();
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
    if (!currentUser || currentUser.role !== 'administrator') {
        showMessageModal(translations[currentLanguage]?.onlyAdminsCanDemoteManagers || 'Only administrators can demote managers.');
        return;
    }

    const confirmMessage = translations[currentLanguage]?.confirmDemoteManager 
        ? translations[currentLanguage].confirmDemoteManager.replace('{username}', username)
        : `Are you sure you want to demote ${username} from Manager to Sales Associate?`;
    
    if (!confirm(confirmMessage)) return;

    const client = getSB();
    if (!client) {
        showMessageModal('Database connection failed.');
        return;
    }

    try {
        const currentBusinessId = currentUser?.business_id || businessInfo?.id || localStorage.getItem('businessId') || null;

        // Update user role in Supabase (with business safety)
        let updateQuery = client.from('users').update({
            role: 'sales',
            demoted_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        }).eq('username', username);
        if (currentBusinessId) updateQuery = updateQuery.eq('business_id', currentBusinessId);

        const { error } = await updateQuery;

        if (error) throw new Error(error.message);

        // Update local users list
        const idx = users.findIndex(u => u.username === username);
        if (idx !== -1) {
            users[idx] = { ...users[idx], role: 'sales', demoted_at: new Date().toISOString() };
        }

        // Track event
        if (typeof trackAppEvent === 'function') {
            trackAppEvent('user_demoted', { username, newRole: 'sales' }, currentUser.username);
        }

        const successMessage = translations[currentLanguage]?.nowSalesAssociate 
            ? `${username} ${translations[currentLanguage].nowSalesAssociate}`
            : `✅ ${username} is now a Sales Associate!`;
        showMessageModal(successMessage);

        const userDetailsModal = document.getElementById('modalUserDetails');
        if (userDetailsModal && !userDetailsModal.classList.contains('hidden')) {
            userDetailsModal.classList.add('hidden');
        }

        if (typeof rendersalesAssociates === 'function') rendersalesAssociates();
        if (typeof renderModalAssociates === 'function') renderModalAssociates();

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

    const confirmMessage = translations[currentLanguage]?.confirmPromoteToManager 
        ? translations[currentLanguage].confirmPromoteToManager.replace('{username}', username)
        : `Are you sure you want to promote ${username} to Manager?`;
    
    if (!confirm(confirmMessage)) return;

    const client = getSB();
    if (!client) {
        showMessageModal('Database connection failed.');
        return;
    }

    try {
        const currentBusinessId = currentUser?.business_id || businessInfo?.id || localStorage.getItem('businessId') || null;

        // Update user role in Supabase (with business safety)
        let updateQuery = client.from('users').update({
            role: 'manager',
            promoted_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        }).eq('username', username);
        if (currentBusinessId) updateQuery = updateQuery.eq('business_id', currentBusinessId);

        const { data: updatedUser, error } = await updateQuery.select().single();

        if (error) throw new Error(error.message);

        // Update local users list
        const idx = users.findIndex(u => u.username === username);
        if (idx !== -1) {
            users[idx] = { ...users[idx], role: 'manager', promoted_at: new Date().toISOString() };
        }

        // Broadcast via Supabase Realtime (optional)
        if (typeof trackAppEvent === 'function') {
            trackAppEvent('user_promoted', { username, newRole: 'manager' }, currentUser.username);
        }

        const successMessage = translations[currentLanguage]?.nowManager 
            ? `${username} ${translations[currentLanguage].nowManager}`
            : `✅ ${username} is now a Manager!`;
        showMessageModal(successMessage);

        const userDetailsModal = document.getElementById('modalUserDetails');
        if (userDetailsModal && !userDetailsModal.classList.contains('hidden')) {
            userDetailsModal.classList.add('hidden');
        }

        if (typeof rendersalesAssociates === 'function') rendersalesAssociates();
        if (typeof renderModalAssociates === 'function') renderModalAssociates();

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