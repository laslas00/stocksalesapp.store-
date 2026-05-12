  function handleLogout() {
      location.reload();
    }

    // ========== EVENT LISTENERS ==========
    function setupEventListeners() {
      document.getElementById('applyDateBtn').addEventListener('click', () => {
        startDate = document.getElementById('startDate').value;
        endDate = document.getElementById('endDate').value;
        currentPage = 1;
        refreshDashboard();
      });

      document.querySelectorAll('[data-preset]').forEach(btn => {
        btn.addEventListener('click', () => setDateRange(btn.dataset.preset));
      });

      document.getElementById('refreshBtn').addEventListener('click', () => {
        currentPage = 1;
        refreshDashboard();
      });

      document.getElementById('exportCsvBtn').addEventListener('click', exportToCSV);

      document.getElementById('searchInput').addEventListener('input', (e) => {
        currentSearch = e.target.value;
        currentPage = 1;
        applyFilters();
      });

      document.getElementById('eventFilter').addEventListener('change', (e) => {
        currentEventFilter = e.target.value;
        currentPage = 1;
        applyFilters();
      });

      document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
          e.preventDefault();
          document.getElementById('searchInput').focus();
        }
      });
    }
function renderFeedbackTable() {
    const tbody = document.getElementById('eventsTableBody');
    tbody.innerHTML = '';
    
    document.getElementById('eventsTableHead').innerHTML = `
        <tr>
            <th>Date</th>
            <th>Sentiment</th>
            <th>Feedback</th>
            <th>Username</th>
            <th>Location</th>
            <th>Status</th>
        </tr>
    `;
    
    if (!feedbackData || feedbackData.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6">
                    <div class="empty-state">
                        <i class="fas fa-comment-dots"></i>
                        <p>No feedback submitted yet</p>
                    </div>
                </td>
            </tr>
        `;
        document.getElementById('tableInfo').textContent = 'No feedback';
        document.getElementById('pageButtons').innerHTML = '';
        document.getElementById('pageInfo').textContent = '';
        return;
    }
    
    feedbackData.forEach(f => {
        const row = tbody.insertRow();
        row.insertCell(0).textContent = formatDate(f.created_at);
        
        // Sentiment emoji
        const sentimentEmoji = {
            'Happy': '😊',
            'Neutral': '😐',
            'Sad': '😞'
        };
        row.insertCell(1).innerHTML = `
            <span style="font-size: 1.5rem;">${sentimentEmoji[f.sentiment] || '🤔'}</span>
            <span style="font-size: 0.8rem; color: var(--text-dim);">${f.sentiment}</span>
        `;
        
        row.insertCell(2).textContent = f.suggestions?.slice(0, 80) + (f.suggestions?.length > 80 ? '…' : '');
        
        row.insertCell(3).textContent = f.username || 'Anonymous';
        
        row.insertCell(4).textContent = `${f.city || ''}, ${f.country || ''}`.replace(/^, /, '') || '—';
        
        // Status badge
        const statusColors = {
            'new': 'background: rgba(59,130,246,0.2); color: #60a5fa;',
            'reviewed': 'background: rgba(16,185,129,0.2); color: #34d399;',
            'addressed': 'background: rgba(139,92,246,0.2); color: #a78bfa;'
        };
        row.insertCell(5).innerHTML = `
            <span class="event-badge" style="${statusColors[f.status] || statusColors['new']}">${f.status || 'new'}</span>
        `;
    });
    
    document.getElementById('tableInfo').textContent = `${feedbackData.length} feedback entries`;
    document.getElementById('tableTitle').textContent = '💬 User Feedback';
    document.getElementById('pageButtons').innerHTML = '';
    document.getElementById('pageInfo').textContent = '';
}
    // ========== LOGIN ==========
    async function login(password) {
      if (password === DASHBOARD_PASSWORD) {
        document.getElementById('loginOverlay').style.display = 'none';
        document.getElementById('dashboard').style.display = 'block';
        
        initSupabase();
        
        const today = luxon.DateTime.now();
        document.getElementById('startDate').value = today.minus({ days: 7 }).toISODate();
        document.getElementById('endDate').value = today.toISODate();
        startDate = document.getElementById('startDate').value;
        endDate = document.getElementById('endDate').value;
        
        await refreshDashboard();
        setupEventListeners();
      } else {
        alert('Wrong password. Please try again.');
        document.getElementById('dashboardPassword').value = '';
        document.getElementById('dashboardPassword').focus();
      }
    }

    document.getElementById('loginBtn').addEventListener('click', () => {
      login(document.getElementById('dashboardPassword').value);
    });

    document.getElementById('dashboardPassword').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') login(e.target.value);
    });

    document.getElementById('dashboardPassword').focus();
