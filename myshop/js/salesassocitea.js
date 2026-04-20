
    function removeSalesAssociateInfo() {
        const infoDiv = document.getElementById('salesAssociateInfo');
        if (infoDiv && infoDiv.parentNode) {
            infoDiv.parentNode.removeChild(infoDiv);
        }
    }

window.removeModalAssociate = async function(username) {
    if (!currentUser || currentUser.role !== 'administrator') { // ← manager NOT allowed
        showMessageModal(translations[currentLanguage].onlyAdminsCanRemoveAssociates || 'Only administrators can remove associates.');
        return;
    }
    try {
        const response = await fetch(`${API_BASE}/api/users/${username}`, { method: 'DELETE' });
        if (response.ok) {
            await loadUsers();
            rendersalesAssociates();
        } else {
            showMessageModal(translations[currentLanguage].failedToDeleteUser || 'Failed to delete user');
        }
    } catch (error) {
        console.error('Error deleting user:', error);
    }
};


    window.removeAssociate = async function(username) {
        try {
            const response = await fetch(`${API_BASE}/api/users/${username}`, { method: 'DELETE' });
            if (response.ok) {
                await loadUsers();
                renderAssociates();
            } else {
                showMessageModal(translations[currentLanguage].failedToDeleteUser || 'Failed to delete user');
            }
        } catch (error) {
            console.error('Error deleting user:', error);
        }
    };



   function showSalesAssociateInfo(user) {
        removeSalesAssociateInfo();
        const infoDiv = document.createElement('div');
        infoDiv.id = 'salesAssociateInfo';
        infoDiv.className = `
            fixed bottom-6 left-6 bg-white dark:bg-gray-800 p-3 rounded-xl 
            flex items-center gap-3 cursor-pointer transition-all duration-300 
            hover:shadow-xl hover:scale-105 z-50
            border-2 border-transparent
            rainbow-border 
        `;
        const style = document.createElement('style');
        style.textContent = `
            @keyframes rainbow-border {
                0% { border-color: #ff0000; }
                14% { border-color: #ff7f00; }
                28% { border-color: #ffff00; }
                42% { border-color: #00ff00; }
                57% { border-color: #0000ff; }
                71% { border-color: #4b0082; }
                85% { border-color: #9400d3; }
                100% { border-color: #ff0000; }
            }
            .rainbow-border {
                animation: rainbow-border 3s linear infinite;
                box-shadow: 0 0 8px rgba(255, 255, 255, 0.3);
            }
        `;
        document.head.appendChild(style);
        const photoDiv = document.createElement('div');
        photoDiv.className = 'w-10 h-10 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-600 flex items-center justify-center';

        if (user.photo) {
            const img = document.createElement('img');
            img.src = user.photo;
            img.alt = `${user.username}'s photo`;
            img.className = 'w-full h-full object-cover';
            photoDiv.appendChild(img);
        } else {
            photoDiv.innerHTML = `
                <svg class="w-6 h-6 text-gray-500 dark:text-gray-300" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd"/>
                </svg>
            `;
        }

        const usernameDiv = document.createElement('div');
        usernameDiv.className = 'text-gray-800 dark:text-gray-200 font-medium text-sm';
        usernameDiv.textContent = user.username;

        infoDiv.appendChild(photoDiv);
        infoDiv.appendChild(usernameDiv);
        infoDiv.addEventListener('click', () => {
            const existingModal = document.getElementById('salesAssociateProfileModal');
            if (existingModal) existingModal.remove();

            const modal = document.createElement('div');
            modal.id = 'salesAssociateProfileModal';
            modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4 backdrop-filter: blur(8px)';
            modal.innerHTML = `
                <div class="bg-white  dark:bg-gray-800 rounded-xl shadow-2xl max-w-sm w-full p-6 relative animate-fade-in border-2 rainbow-border">
                    <button 
                        onclick="document.getElementById('salesAssociateProfileModal').remove()"
                        class="absolute top-4 right-4 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                    >
                        &times;
                    </button>
                    
                    <div class="flex flex-col items-center gap-4">
                        <div class="w-20 h-20 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden flex items-center justify-center">
                            ${
                                user.photo 
                                    ? `<img src="${fixImagePath(user.photo)}" alt="${user.username}" class="w-full h-full object-cover">`
                                    : `<svg class="w-10 h-10 text-gray-500 dark:text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                                        <path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd"/>
                                    </svg>`
                            }
                        </div>
                        
                        <div class="text-center">
                            <h3 class="text-xl font-bold text-gray-900 dark:text-white">
                                ${user.firstName && user.surname ? `${user.firstName} ${user.surname}` : 'Name not set'}
                            </h3>
                            <p class="text-gray-600 dark:text-gray-400 mt-1">@${user.username}</p>
                            <p class="text-sm text-gray-500 dark:text-gray-300 mt-2">Role: ${user.role || 'Not specified'}</p>
                        </div>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
        });

        // Append to home overlay (or body if overlay doesn't exist)
        const homeOverlay = document.getElementById('homeOverlay') || document.body;
        homeOverlay.appendChild(infoDiv);
    }
    function showManagerInfo(user) {
        // Remove any existing manager or associate info
        removeSalesAssociateInfo();
        const existingManagerInfo = document.getElementById('managerInfoButton');
        if (existingManagerInfo) existingManagerInfo.remove();

        const infoDiv = document.createElement('div');
        infoDiv.id = 'managerInfoButton';
        infoDiv.className = `
            fixed bottom-6 left-6 bg-white dark:bg-gray-800 p-3 rounded-xl 
            flex items-center gap-3 cursor-pointer transition-all duration-300 
            hover:shadow-xl hover:scale-105 z-50
            border-2 border-transparent
            rainbow-border 
        `;

        const style = document.createElement('style');
        style.textContent = `
            @keyframes rainbow-border {
                0% { border-color: #ff0000; }
                14% { border-color: #ff7f00; }
                28% { border-color: #ffff00; }
                42% { border-color: #00ff00; }
                57% { border-color: #0000ff; }
                71% { border-color: #4b0082; }
                85% { border-color: #9400d3; }
                100% { border-color: #ff0000; }
            }
            .rainbow-border {
                animation: rainbow-border 3s linear infinite;
                box-shadow: 0 0 8px rgba(255, 255, 255, 0.3);
            }
        `;
        document.head.appendChild(style);

        const photoDiv = document.createElement('div');
        photoDiv.className = 'w-10 h-10 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-600 flex items-center justify-center';
        if (user.photo) {
            const img = document.createElement('img');
            img.src = fixImagePath(user.photo);
            img.alt = `${user.username}'s photo`;
            img.className = 'w-full h-full object-cover';
            photoDiv.appendChild(img);
        } else {
            photoDiv.innerHTML = `
                <svg class="w-6 h-6 text-gray-500 dark:text-gray-300" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd"/>
                </svg>
            `;
        }

        const usernameDiv = document.createElement('div');
        usernameDiv.className = 'text-gray-800 dark:text-gray-200 font-medium text-sm flex items-center gap-1';
        usernameDiv.innerHTML = `
            ${user.firstName && user.surname 
                ? `${user.firstName} ${user.surname}` 
                : user.username}
            <svg class="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
            </svg>
        `;

        infoDiv.appendChild(photoDiv);
        infoDiv.appendChild(usernameDiv);
        infoDiv.addEventListener('click', () => {

           showManagerProfile(user.username);
           
           
        });

        const homeOverlay = document.getElementById('homeOverlay') || document.body;
        homeOverlay.appendChild(infoDiv);
    }


window.showManagerProfile = async function(username) {
    const user = users.find(u => u.username === username && u.role === 'manager');
    if (!user) return;

    // Set basic info
    document.getElementById('managerProfilePhoto').src = fixImagePath(user.photo || 'image/user mangement.png');
    document.getElementById('managerProfileName').childNodes[0].textContent = user.firstName && user.surname 
        ? `${user.firstName} ${user.surname}` 
        : user.username;
    document.getElementById('managerProfilePassword').textContent = user.password;
    document.getElementById('managerVerifiedTick').classList.remove('hidden');

    // Count sales by this user
    const userSales = sales.filter(s => s.username === username);
    document.getElementById('managerSalesCount').textContent = userSales.length;

    // Count stock history actions by this user
    const userStockHistoryCount = stockHistory.filter(h => h.username === username).length;
    document.getElementById('managerStockUpdates').textContent = userStockHistoryCount;

    // Show how many times username appears in sales (optional extra display)
    const salesAppearElem = document.getElementById('managerSalesAppearCount');
    if (salesAppearElem) {
        salesAppearElem.textContent = userSales.length;
    }

    // Show how many times username appears in stock history (optional extra display)
    const StockAppearElem = document.getElementById('managerStockApp*earCount');
    if (StockAppearElem) {
        StockAppearElem.textContent = userStockHistoryCount;
    }

    // Show modal
    document.getElementById('managerProfileModal').classList.remove('hidden');
};
async function showPromotionEnvelope(promotedUsername) {
    try {
        // Only show if this client belongs to the promoted user
        if (!currentUser || String(currentUser.username) !== String(promotedUsername)) return;

        // ✅ Ensure businessInfo is loaded
        if (!businessInfo || !businessInfo.name) {
            await loadBusinessInfo(); // This populates businessInfo.logoData
        }

        const certContainer = document.getElementById('certificateContainer');
        const businessEl = document.getElementById('certificateBusinessName');
        const recipientEl = document.getElementById('certificateRecipient');
        const dateEl = document.getElementById('certificateDate');
        const inner = certContainer.querySelector('.certificate-inner');

        if (businessEl) businessEl.textContent = businessInfo?.name || 'Your Business';
        const logoImg = document.getElementById('certificateBusinessLogo');
        if (logoImg && businessInfo?.logoData) {
            logoImg.src = API_BASE + businessInfo.logoData;
            logoImg.classList.remove('hidden');
        } else if (logoImg) {
            logoImg.classList.add('hidden');
        }
        if (recipientEl) {
            const promotedUser = users.find(u => u.username === promotedUsername) || { username: promotedUsername };
            const displayName = (promotedUser.firstName || promotedUser.surname)
                ? `${promotedUser.firstName || ''} ${promotedUser.surname || ''}`.trim()
                : promotedUser.username;
            recipientEl.textContent = displayName || promotedUsername;
        }
        if (dateEl) {
            const now = new Date();
            dateEl.textContent = now.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
        }
        if (businessInfo?.logoData && inner) {
                inner.style.backgroundImage = `url('${API_BASE +businessInfo.logoData}')`;
                inner.style.backgroundRepeat = 'no-repeat';
                inner.style.backgroundPosition = 'center';
                inner.style.backgroundSize = '80%';
                inner.style.backgroundColor = 'whitesmoke'; // white background
                inner.style.opacity = '1'; // normal opacity for content
            } else {
                inner.style.backgroundImage = 'none';
                inner.style.backgroundColor = 'whitesmoke';
            }

        // Show envelope
        const envelopeEl = document.getElementById('envelope');
        if (envelopeEl) {
            envelopeEl.classList.remove('hidden');
            if (typeof startAnimation === 'function') {
                try {
                    startAnimation();
                } catch (e) {
                    envelopeEl.classList.add('active');
                    setTimeout(() => envelopeEl.classList.add('open'), 700);
                }
            } else {
                envelopeEl.classList.add('active');
                setTimeout(() => envelopeEl.classList.add('open'), 700);
            }
        }
    } catch (err) {
        console.error('showPromotionEnvelope error', err);
    }
}

