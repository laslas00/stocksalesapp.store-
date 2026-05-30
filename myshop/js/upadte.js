


// Rating functions (unchanged)
function launchStoreRating() {
    const productId = "9P2CHLWQG9VL";
    const reviewUrl = `ms-windows-store://review/?ProductId=${productId}`;
    
    if (window.require) {
        const { shell } = window.require('electron');
        shell.openExternal(reviewUrl);
    } else {
        window.open(reviewUrl, '_blank');
    }
    
    localStorage.setItem('hasRatedApp', 'true');
    closeRatingModal();
}

const shareModal = document.getElementById('shareModal');
const shareBtn = document.getElementById('shareBtn');
const closeShareBtn = document.getElementById('closeShareModal');
const shareQR = document.getElementById('shareQR');
const shareLinkText = document.getElementById('shareLink');
const SHARE_LINK = "https://apps.microsoft.com/detail/9p2chlwqg9vl?hl=fr&gl=CI&ocid=pdpshare";

// Function to show share modal (avoids code duplication)
function showShareModal() {
    if (!shareModal || !shareBtn) return;
    shareModal.classList.add("show");
    shareBtn.classList.add("active");
    shareLinkText.textContent = SHARE_LINK;
    shareQR.innerHTML = ""; // Clear previous QR
    new QRCode(shareQR, {
        text: SHARE_LINK,
        width: 150,
        height: 150,
        correctLevel: QRCode.CorrectLevel.H
    });
}

// Close share modal (attached once, not inside checkRatingTrigger)
if (closeShareBtn) {
    closeShareBtn.addEventListener("click", () => {
        shareModal.classList.remove("show");
        shareBtn.classList.remove("active");
    });
}

// Optional: close when clicking outside modal (if you have an overlay)
window.addEventListener('click', (e) => {
    if (e.target === shareModal) {
        shareModal.classList.remove("show");
        shareBtn.classList.remove("active");
    }
});



function checkRatingTrigger() {
    console.log("Checking if rating/feedback prompt should be shown...");
    const hasRated = localStorage.getItem('hasRatedApp');
  
 const feedbackShown = localStorage.getItem('feedbackPromptShown');
    
    let actionCount = parseInt(localStorage.getItem('successfulActions') || '0');
    actionCount++;
    localStorage.setItem('successfulActions', actionCount);

    // 1. Rating prompt early on
    if (actionCount === 10 || actionCount === 25 || actionCount === 75 || actionCount === 150|| actionCount === 25) {
         if (hasRated === 'true') return;
        showRatingModal();
    } 
    // 2. Feedback/Survey prompt (New!)
    else if (actionCount === 30 || actionCount === 80 || actionCount === 200 || actionCount === 400) { 
       
      
    }
    // 3. Share prompts
    else if (actionCount === 50 || actionCount === 150 || actionCount === 300 || actionCount === 500) {
        showShareModal();
    }
}
// 7,200,000 ms = 2 Hours
const TWO_HOURS = 2 * 60 * 60 * 1000;

const ratingInterval = setInterval(() => {
    // Only check if the user is actually interacting with the page
    if (document.hasFocus()) {
        checkRatingTrigger();
    }
}, TWO_HOURS);
function showRatingModal() {
    document.getElementById('ratingModal').classList.remove('hidden');
}

function closeRatingModal() {
    document.getElementById('ratingModal').classList.add('hidden');
    localStorage.setItem('successfulActions', '0'); // optional – reset counter after rating
}





document.addEventListener('DOMContentLoaded', async function() {
    // Block 1: Update banner
    {
        const installBtn = document.getElementById('updateInstallBtn');
        const closeBtn = document.getElementById('closeUpdateBannerBtn');
        if (installBtn) {
            installBtn.addEventListener('click', goToStoreForUpdate);
        }
        if (closeBtn) {
            closeBtn.addEventListener('click', function() {
                const banner = document.getElementById('updateBanner');
                if (banner) {
                    banner.classList.add('hidden');
                }
            });
        }
    }

    // Block 2: Tasks "See More" button
    {
        const seeMoreTasksBtn = document.getElementById('seeMoreTasksBtn');
        if (seeMoreTasksBtn) {
            seeMoreTasksBtn.addEventListener('click', openAllTasksModal);
        }
        initializeTaskEventListeners();
    }

    {
        if ("Notification" in window && Notification.permission !== "granted") {
            Notification.requestPermission();
        }
        const homeOverlay = document.getElementById('homeOverlay');
        if (homeOverlay) {
            homeOverlay.addEventListener('click', handleSecretClick);
        }
        const seeMoreBtn = document.getElementById('seeMoreRemindersBtn');
        if (seeMoreBtn) {
            seeMoreBtn.addEventListener('click', openAllRemindersModal);
        }
    }

    // Block 5: Load customer receipts
    {
        loadCustomerReceipts();
        // Initial load
        updateUIbtn();
    }

    // Block 6: Add PDF styles
    {
        addPDFStyles();
    }

    // Block 7: Initialize loan management
    {
        initializeLoanManagement();
    }

    // Block 8: Loading overlay and cancel button
    {
        const cancelBtn = document.getElementById('cancelLoadingBtn');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', function(event) {
                event.stopPropagation();
                cancelLoading();
            });
            cancelBtn.textContent = translate('cancel') || 'Cancel';
            cancelBtn.style.display = 'none';
        }
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.addEventListener('click', function(event) {
                if (event.target === this) {
                    cancelLoading();
                }
            });
            const loadingContent = overlay.querySelector('.loading-content');
            if (loadingContent) {
                loadingContent.addEventListener('click', function(event) {
                    event.stopPropagation();
                });
            }
        }
        window.addEventListener('beforeunload', function() {
            if (!isCancelled && abortController) {
                cancelLoading();
            }
        });
    }

    // Block 9: Expense filters
    {
        initExpenseFilters();
        setTimeout(() => {
            document.querySelectorAll('.month-btn, .year-btn').forEach(btn => {
                btn.addEventListener('click', function() {
                    setTimeout(() => renderExpenses(), 100);
                });
            });
        }, 500);
    }

    // Block 10: Sale/Receipt related initializations
    {
        calculateProfitLoss();
        resetReceiptModal();
        const qrScannerBtn = document.getElementById('qrScannerBtn');
        const productNameInput = document.getElementById('saleProductName');
        if (qrScannerBtn && productNameInput) {
            qrScannerBtn.addEventListener('click', function() {
                openQRScanner();
            });
            document.addEventListener('keydown', function(e) {
                if ((e.ctrlKey || e.metaKey) && e.key === 'q' && document.activeElement === productNameInput) {
                    e.preventDefault();
                    openQRScanner();
                }
            });
        }
        const menuBtn = document.getElementById('printPreviewMenuBtn');
        const menuDropdown = document.getElementById('printPreviewMenuDropdown');
        if (menuBtn && menuDropdown) {
            menuBtn.onclick = function (e) {
                e.stopPropagation();
                menuDropdown.classList.toggle('hidden');
            };
            document.addEventListener('click', function (e) {
                if (!menuDropdown.contains(e.target) && e.target !== menuBtn) {
                    menuDropdown.classList.add('hidden');
                }
            });
        }
        const dateInput = document.getElementById('customReceiptDateFilter');
        if (dateInput && !dateInput.value) {
            const today = new Date();
            const yyyy = today.getFullYear();
            const mm = String(today.getMonth() + 1).padStart(2, '0');
            const dd = String(today.getDate()).padStart(2, '0');
            dateInput.value = `${yyyy}-${mm}-${dd}`;
        }
        const bar = document.getElementById('saleNotificationBar');
        const closeBtn = document.getElementById('notifCloseBtn');
        if (bar) {
            bar.addEventListener('click', async function(e) {
                if (e.target === closeBtn || closeBtn.contains(e.target)) return;
                bar.classList.remove('show');
                if (window.notificationTimeout) clearTimeout(window.notificationTimeout);
                cleanupMemory();
                await showSalesHistorySection();
            });
        }
        if (closeBtn) {
            closeBtn.onclick = function(e) {
                e.preventDefault();
                bar.classList.remove('show');
                if (window.notificationTimeout) clearTimeout(window.notificationTimeout);
            };
        }
    }
// Check if the element exists before trying to access its classList
    const dashcontainer = document.getElementById('dashcontainer');
    if (dashcontainer) {
        dashcontainer.classList.add('hidden');
    }
    // Block 11: Login, theme, and initial data loading (original window load)
    {
        if (!window.location.pathname.includes('index.html')) {
            await checkSetupStatus();
        }
        const rememberedUser = localStorage.getItem('rememberedUser');
        await translateUI();
        if (rememberedUser) {
            localStorage.setItem('rememberedUser', rememberedUser);
            localStorage.setItem("language", currentLanguage);
        }
        try {
            await loadUsers21();
            await loadUsers();
            const remembered = localStorage.getItem('rememberedUser');
            if (remembered) {
                const { username, role } = JSON.parse(remembered);
                document.getElementById('loginUsername').value = username;
                document.getElementById('loginRole').value = role;
                document.getElementById('rememberMe').checked = true;
                const user = users.find(u => u.username === username && u.role === role);
                if (user) {
                    document.getElementById('loginPassword').value = user.password;
                }
            }
            await loadBusinessInfo();
            await loadStockTOSAVE();
            document.body.classList.add('night-mode');
            if (toggleThemeBtn) {
                toggleThemeBtn.textContent = translate('light_mode') || '☀️ Light Mode';
            }
            nightMode = true;
            localStorage.setItem('nightMode', '1');
            setTimeout(() => {
                document.getElementById('loginLoadingContainer').classList.add('hidden');
                document.getElementById('loginModal').classList.remove('hidden');
                document.getElementById('loginContent').classList.remove('hidden');
                document.getElementById('loginBtn').disabled = false;
            }, 500);
        } catch (error) {
            console.error('Error loading initial data:', error);
            document.getElementById('loginLoadingContainer').innerHTML = `
                <div class="text-center z-99999999999999999999999999999999999999999999999999999999999999999999999999999999999">
                    <div class="text-red-500 mb-2">⚠️</div>
                    <p class="text-white-700 mb-4">${translate('failed_to_load_application') || 'Failed to load application'}</p>
                    <button onclick="window.location.reload()" class="bg-blue-600 text-white px-4 py-2 rounded">
                        ${translate('retry') || 'Retry'}
                    </button>
                </div>
            `;
        }
        updateTime();
        pollConnectionSpeed();
    }
    const dashboardOptionBtn = document.getElementById('dashboardOptionBtn');
    if (dashboardOptionBtn) {
        dashboardOptionBtn.addEventListener('click', showDashboard);
    }
    {
        const emailBtn = document.getElementById("emailAlertTrigger");
        const emailModal = document.getElementById('emailSettingsModal');
        const closeModal = document.getElementById('closeEmailModal');
        const saveEmailBtn = document.getElementById('saveEmailBtn');
        const emailInput = document.getElementById('alertEmail');
        if (emailBtn && emailModal) {
            emailBtn.addEventListener("click", () => {
                emailModal.classList.remove('hidden');
                loadEmailSettings();
            });
        }
        if (closeModal && emailModal) {
            closeModal.addEventListener("click", () => {
                emailModal.classList.add('hidden');
            });
        }
        if (saveEmailBtn) {
            saveEmailBtn.addEventListener('click', saveEmailSettings);
        }
    }
});

const btn = document.getElementById('startupBtn');
const statusText = document.getElementById('statusText');

// Replace the getStartupStatus call with:
async function updateUIbtn() {
    if (window.electronAPI && typeof window.electronAPI.getStartupStatus === 'function') {
        const isEnabled = await window.electronAPI.getStartupStatus();
        // ... rest of the code
    } else {
        // Web deployment - hide the startup button
        const btn = document.getElementById('startupBtn');
        if (btn) btn.style.display = 'none';
    }
}

btn.addEventListener('click', async () => {
  const currentStatus = await window.electronAPI.getStartupStatus();
  await window.electronAPI.toggleStartup(!currentStatus);
  updateUIbtn();
});



    function updateTime() {
    const now = new Date(); 
    const timeOptions = {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true 
    };
    const timeString = now.toLocaleTimeString('en-US', timeOptions); 
    const dateOptions = {
        weekday: 'long', 
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    };
    const dateString = now.toLocaleDateString('en-US', dateOptions); 
    document.getElementById('currentTime').textContent = timeString;
    document.getElementById('currentDate').textContent = dateString;
    }

