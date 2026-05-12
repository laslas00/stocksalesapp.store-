const SUPABASE_URL = 'https://zexxdoxuzvkovszfqcio.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_svIdBFlhG9fG8zlOsMcs-g_kqUWBT8W';
const DASHBOARD_PASSWORD = 'Doaswedo*123';

// ========== STATE ==========
let supabaseClient;
let rawData = [];
let filteredData = [];
let currentEventFilter = 'all';
let currentSearch = '';
let startDate = null;
let endDate = null;
let charts = {};
let currentPage = 1;
const PER_PAGE = 50;
let setupData = [];
let feedbackData = [];
let profileData = [];
let selectedProfileKey = null;
let currentTab = 'dashboard';

// ========== LOADING ==========
function showLoading(text = 'Loading data...') {
  const overlay = document.getElementById('loadingOverlay');
  const textEl = document.getElementById('loadingText');
  if (overlay && textEl) {
    textEl.textContent = text;
    overlay.classList.add('show');
  }
}

function hideLoading() {
  const overlay = document.getElementById('loadingOverlay');
  if (overlay) {
    overlay.classList.remove('show');
  }
}

// ========== INITIALIZATION ==========
function initSupabase() {
  supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

const formatDate = (iso) => {
  if (!iso) return '—';
  return luxon.DateTime.fromISO(iso).toFormat('yyyy-MM-dd HH:mm:ss');
};

const formatShortDate = (iso) => {
  if (!iso) return '—';
  return luxon.DateTime.fromISO(iso).toFormat('yyyy-MM-dd');
};

// ========== DATA FETCHING ==========
async function fetchData() {
  if (!supabaseClient) return;
  
  showLoading('Fetching events data...');
  
  let allData = [];
  let page = 0;
  const pageSize = 1000; // Max per request
  let hasMore = true;
  
  try {
    // First, get the total count
    const { count, error: countError } = await supabaseClient
      .from('app_events')
      .select('*', { count: 'exact', head: true });
    
    if (countError) throw countError;
    
    const totalRecords = count;
    console.log(`Total records to fetch: ${totalRecords}`);
    
    // Fetch data in chunks
    while (hasMore) {
      const start = page * pageSize;
      const end = start + pageSize - 1;
      
      let query = supabaseClient
        .from('app_events')
        .select('*')
        .order('created_at', { ascending: false })
        .range(start, end);
      
      // Apply date filters if present
      if (startDate && endDate) {
        query = query.gte('created_at', startDate).lte('created_at', endDate + 'T23:59:59');
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        allData = [...allData, ...data];
        page++;
        console.log(`Fetched ${allData.length} of ${totalRecords} records`);
      }
      
      // Stop if we got less than pageSize (last page)
      if (!data || data.length < pageSize) {
        hasMore = false;
      }
      
      // Optional: Add a small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    rawData = allData;
    console.log(`✅ Successfully fetched ${rawData.length} records`);
    applyFilters();
    
  } catch (error) {
    console.error('Error fetching events:', error);
    showToast('Error loading data: ' + error.message, 'error');
  } finally {
    hideLoading();
  }
}
async function fetchFeedbackData() {
  if (!supabaseClient) return;
  
  const { data, error } = await supabaseClient
    .from('user_feedback')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Error fetching feedback:', error);
    return;
  }
  
  feedbackData = data || [];
  const feedbackCountEl = document.getElementById('feedbackCount');
  if (feedbackCountEl) feedbackCountEl.textContent = feedbackData.length;
}

async function fetchSetupData() {
  if (!supabaseClient) return;
  
  const { data, error } = await supabaseClient
    .from('user_setups')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Error fetching setup data:', error);
    return;
  }
  
  setupData = data || [];
  document.getElementById('setupsCount').textContent = setupData.length;
}

function applyFilters() {
  let filtered = [...rawData];
  
  if (currentEventFilter !== 'all') {
    filtered = filtered.filter(e => e.event_type === currentEventFilter);
  }
  
  if (currentSearch.trim()) {
    const s = currentSearch.toLowerCase();
    filtered = filtered.filter(e => 
      e.event_type.toLowerCase().includes(s) || 
      (e.username && e.username.toLowerCase().includes(s)) || 
      (e.city && e.city.toLowerCase().includes(s)) || 
      (e.country && e.country.toLowerCase().includes(s)) ||
      (e.device_id && e.device_id.toLowerCase().includes(s))
    );
  }
  
  filteredData = filtered;
  profileData = buildProfileData();
  document.getElementById('eventsCount').textContent = filteredData.length;
  
  if (currentTab === 'dashboard') {
    renderStats();
    renderCharts();
    renderTable();
  }

  if (currentTab === 'profiles') {
    renderUserProfilesTable();
  }
  
  document.getElementById('lastUpdateTime').innerText = new Date().toLocaleString();
}

// ========== STATS ==========
function computeStats(data) {
  const stats = {
    uniqueDevices: new Set(),
    uniqueProfiles: new Set(),
    total: data.length,
    appStarts: 0,
    sales: 0,
    dashboard: 0,
    receipts: 0,
    credit: 0,
    stockAdds: 0,
    freeMode: 0,
    modeSwitch: 0,
    setups: 0,
    usedReceipts: 0,
    printHistory: 0,
    printSalesHistory: 0,
    printStockHistory: 0,
    printWeeklyReport: 0,
    printMonthlyReport: 0,
    printProfitLoss: 0,
    printCreditSales: 0,
    printExpenses: 0,
    printLoanBook: 0,
    printCurrentStock: 0,
    printRefundHistory: 0,
    profileActivityByDay: new Map(),
    monthlyProfiles: new Set()
  };

  const monthCutoff = luxon.DateTime.now().minus({ days: 30 });

  data.forEach(e => {
    stats.uniqueDevices.add(e.device_id);
    stats.uniqueProfiles.add(getProfileKey(e));

    switch (e.event_type) {
      case 'app_start': stats.appStarts++; break;
      case 'sale_recorded': stats.sales++; break;
      case 'dashboard_shown': stats.dashboard++; break;
      case 'receipt_custom_generated': stats.receipts++; break;
      case 'credit_sales_section_opened': stats.credit++; break;
      case 'item_added_to_stock': stats.stockAdds++; break;
      case 'free_mode_activated': stats.freeMode++; break;
      case 'user_mode_activated': stats.modeSwitch++; break;
      case 'setup_complete': stats.setups++; break;
      case 'receipt_printed': stats.usedReceipts++; break;
      case 'print_history':
        stats.printHistory++;
        const reportType = e.event_data?.reportType;
        switch (reportType) {
          case 'sales_history_report': stats.printSalesHistory++; break;
          case 'stock_history_report': stats.printStockHistory++; break;
          case 'weekly_sales_report': stats.printWeeklyReport++; break;
          case 'monthly_sales_report': stats.printMonthlyReport++; break;
          case 'profit_loss_report': stats.printProfitLoss++; break;
          case 'credit_sales_report': stats.printCreditSales++; break;
          case 'expenses_report': stats.printExpenses++; break;
          case 'loan_book_report': stats.printLoanBook++; break;
          case 'current_stock_report': stats.printCurrentStock++; break;
          case 'refund_history_report': stats.printRefundHistory++; break;
        }
        break;
    }

    const profileKey = getProfileKey(e);
    const day = formatShortDate(e.created_at);
    if (!stats.profileActivityByDay.has(day)) stats.profileActivityByDay.set(day, new Set());
    stats.profileActivityByDay.get(day).add(profileKey);
    if (e.created_at && luxon.DateTime.fromISO(e.created_at) >= monthCutoff) {
      stats.monthlyProfiles.add(profileKey);
    }
  });

  stats.uniqueDevices = stats.uniqueDevices.size;
  stats.uniqueProfiles = stats.uniqueProfiles.size;

  const sortedProfileDays = Array.from(stats.profileActivityByDay.keys()).sort();
  stats.dailyActiveProfiles = sortedProfileDays.length ? stats.profileActivityByDay.get(sortedProfileDays[sortedProfileDays.length - 1]).size : 0;
  stats.monthlyActiveProfiles = stats.monthlyProfiles.size;
  stats.stickiness = stats.monthlyActiveProfiles ? `${Math.round((stats.dailyActiveProfiles / stats.monthlyActiveProfiles) * 1000) / 10}%` : '0%';

  return stats;
}

function renderStats() {
  const stats = computeStats(filteredData);

  const statsCards = [
    { label: 'Active Devices', value: stats.uniqueDevices, icon: 'fa-mobile-alt', color: 'blue' },
    { label: 'Total Events', value: stats.total, icon: 'fa-bolt', color: 'purple' },
    { label: 'App Starts', value: stats.appStarts, icon: 'fa-rocket', color: 'green' },
    { label: 'Sales', value: stats.sales, icon: 'fa-shopping-cart', color: 'orange' },
    { label: 'Dashboard Views', value: stats.dashboard, icon: 'fa-tachometer-alt', color: 'blue' },
    { label: 'Custom Receipts', value: stats.receipts, icon: 'fa-receipt', color: 'purple' },
    { label: 'Credit Sales', value: stats.credit, icon: 'fa-credit-card', color: 'red' },
    { label: 'Daily Active Profiles', value: stats.dailyActiveProfiles, icon: 'fa-signal', color: 'blue' },
    { label: 'Monthly Active Profiles', value: stats.monthlyActiveProfiles, icon: 'fa-calendar-alt', color: 'purple' },
    { label: 'Stickiness', value: stats.stickiness, icon: 'fa-thumbtack', color: 'green' },
    { label: 'Unique Profiles', value: stats.uniqueProfiles, icon: 'fa-users', color: 'indigo' },
    { label: 'Items Added', value: stats.stockAdds, icon: 'fa-box', color: 'green' },
    { label: 'Free Mode', value: stats.freeMode, icon: 'fa-unlock-alt', color: 'orange' },
    { label: 'Mode Switches', value: stats.modeSwitch, icon: 'fa-exchange-alt', color: 'blue' },
    { label: 'Setups Complete', value: stats.setups, icon: 'fa-check-circle', color: 'green' },
    { label: 'Used Receipts', value: stats.usedReceipts, icon: 'fa-print', color: 'orange' },
    { label: 'Total Prints', value: stats.printHistory, icon: 'fa-print', color: 'indigo' },
    { label: 'Sales Reports', value: stats.printSalesHistory, icon: 'fa-file-invoice', color: 'teal' },
    { label: 'Stock Reports', value: stats.printStockHistory, icon: 'fa-boxes', color: 'cyan' },
    { label: 'Weekly Reports', value: stats.printWeeklyReport, icon: 'fa-calendar-week', color: 'blue' },
    { label: 'Monthly Reports', value: stats.printMonthlyReport, icon: 'fa-calendar-alt', color: 'purple' },
    { label: 'P&L Reports', value: stats.printProfitLoss, icon: 'fa-chart-pie', color: 'green' },
    { label: 'Credit Reports', value: stats.printCreditSales, icon: 'fa-credit-card', color: 'red' },
    { label: 'Expense Reports', value: stats.printExpenses, icon: 'fa-money-bill-wave', color: 'orange' },
    { label: 'Loan Reports', value: stats.printLoanBook, icon: 'fa-hand-holding-usd', color: 'blue' },
    { label: 'Stock Snapshots', value: stats.printCurrentStock, icon: 'fa-camera', color: 'green' },
    { label: 'Refund Reports', value: stats.printRefundHistory, icon: 'fa-undo-alt', color: 'purple' }
  ];

  document.getElementById('statsGrid').innerHTML = statsCards.map(stat => `
    <div class="stat-card">
      <div class="stat-header">
        <div class="stat-icon ${stat.color}">
          <i class="fas ${stat.icon}"></i>
        </div>
      </div>
      <div class="stat-label">${stat.label}</div>
      <div class="stat-number">${stat.value.toLocaleString()}</div>
    </div>
  `).join('');
}

// ========== CHARTS ==========
function destroyChart(id) {
  if (charts[id]) {
    charts[id].destroy();
    delete charts[id];
  }
}

function renderCharts() {
  const daysMap = new Map();
  filteredData.forEach(e => {
    const day = formatShortDate(e.created_at);
    if (!daysMap.has(day)) daysMap.set(day, new Set());
    daysMap.get(day).add(e.device_id);
  });
  const sortedDays = Array.from(daysMap.keys()).sort();
  const dailyActive = sortedDays.map(day => daysMap.get(day).size);

  destroyChart('daily');
  const dailyCtx = document.getElementById('dailyActiveChart')?.getContext('2d');
  if (dailyCtx) {
    charts.daily = new Chart(dailyCtx, {
      type: 'line',
      data: {
        labels: sortedDays,
        datasets: [{
          label: 'Active Devices',
          data: dailyActive,
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59,130,246,0.1)',
          fill: true,
          tension: 0.4,
          borderWidth: 2,
          pointRadius: 3,
          pointBackgroundColor: '#3b82f6',
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } },
          y: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } }
        }
      }
    });
  }

  const typeCount = {};
  filteredData.forEach(e => {
    typeCount[e.event_type] = (typeCount[e.event_type] || 0) + 1;
  });

  destroyChart('eventType');
  const pieCtx = document.getElementById('eventTypeChart')?.getContext('2d');
  if (pieCtx) {
    charts.eventType = new Chart(pieCtx, {
      type: 'doughnut',
      data: {
        labels: Object.keys(typeCount).map(k => k.replace(/_/g, ' ')),
        datasets: [{
          data: Object.values(typeCount),
          backgroundColor: ['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec489a','#06b6d4','#f97316','#84cc16','#d946ef','#6366f1'],
          borderWidth: 0,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'right',
            labels: { color: '#94a3b8', padding: 12, font: { size: 11 } }
          }
        }
      }
    });
  }

  const countryCount = {};
  filteredData.forEach(e => {
    if (e.country) countryCount[e.country] = (countryCount[e.country] || 0) + 1;
  });
  const topCountries = Object.entries(countryCount).sort((a,b) => b[1]-a[1]).slice(0, 5);

  destroyChart('countries');
  const barCtx = document.getElementById('topCountriesChart')?.getContext('2d');
  if (barCtx) {
    charts.countries = new Chart(barCtx, {
      type: 'bar',
      data: {
        labels: topCountries.map(c => c[0]),
        datasets: [{
          label: 'Events',
          data: topCountries.map(c => c[1]),
          backgroundColor: ['#8b5cf6','#7c3aed','#6d28d9','#5b21b6','#4c1d95'],
          borderRadius: 8,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: '#94a3b8' }, grid: { display: false } },
          y: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } }
        }
      }
    });
  }

  const hourCount = new Array(24).fill(0);
  filteredData.forEach(e => {
    const hour = new Date(e.created_at).getHours();
    hourCount[hour]++;
  });

  destroyChart('hourly');
  const hourlyCtx = document.getElementById('hourlyChart')?.getContext('2d');
  if (hourlyCtx) {
    charts.hourly = new Chart(hourlyCtx, {
      type: 'bar',
      data: {
        labels: Array.from({length: 24}, (_, i) => `${i}:00`),
        datasets: [{
          label: 'Events',
          data: hourCount,
          backgroundColor: 'rgba(16,185,129,0.6)',
          borderColor: '#10b981',
          borderWidth: 1,
          borderRadius: 4,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: '#94a3b8', font: { size: 10 } }, grid: { display: false } },
          y: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } }
        }
      }
    });
  }
}

// ========== TABLE ==========
function resetTableHeaders() {
  document.getElementById('eventsTableHead').innerHTML = `
    <tr>
      <th>Time</th>
      <th>Event</th>
      <th>Username</th>
      <th>Device ID</th>
      <th>Location</th>
      <th>Details</th>
    </tr>
  `;
}

function renderTable() {
  const tbody = document.getElementById('eventsTableBody');
  tbody.innerHTML = '';
  
  const totalPages = Math.ceil(filteredData.length / PER_PAGE);
  const startIdx = (currentPage - 1) * PER_PAGE;
  const pageData = filteredData.slice(startIdx, startIdx + PER_PAGE);
  
  if (pageData.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6">
          <div class="empty-state">
            <i class="fas fa-inbox"></i>
            <p>No events found</p>
            <p style="font-size: 0.85rem;">Try adjusting your filters or date range</p>
          </div>
        </td>
      </tr>
    `;
    document.getElementById('tableInfo').textContent = 'No events to display';
    document.getElementById('pageButtons').innerHTML = '';
    document.getElementById('pageInfo').textContent = '';
    return;
  }
  
  pageData.forEach(e => {
    const row = tbody.insertRow();
    row.insertCell(0).textContent = formatDate(e.created_at);
    row.insertCell(1).innerHTML = `<span class="event-badge badge-${e.event_type}">${e.event_type.replace(/_/g, ' ')}</span>`;
    row.insertCell(2).textContent = e.username || '—';
    row.insertCell(3).textContent = (e.device_id || '—').slice(0, 12) + '…';
    row.insertCell(4).textContent = `${e.city || ''} ${e.country || ''}`.trim() || '—';
    row.insertCell(5).textContent = e.event_data ? JSON.stringify(e.event_data).slice(0, 50) : '—';
  });

  document.getElementById('tableInfo').textContent = 
    `Showing ${startIdx + 1}-${Math.min(startIdx + PER_PAGE, filteredData.length)} of ${filteredData.length} events`;
  
  renderPagination(totalPages);
}

function renderPagination(totalPages) {
  const container = document.getElementById('pageButtons');
  let html = '';
  
  html += `<button class="page-btn" onclick="goToPage(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''}>‹</button>`;
  
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= currentPage - 2 && i <= currentPage + 2)) {
      html += `<button class="page-btn ${i === currentPage ? 'active' : ''}" onclick="goToPage(${i})">${i}</button>`;
    } else if (i === currentPage - 3 || i === currentPage + 3) {
      html += `<span style="color: #64748b; padding: 6px;">…</span>`;
    }
  }
  
  html += `<button class="page-btn" onclick="goToPage(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''}>›</button>`;
  
  container.innerHTML = html;
  document.getElementById('pageInfo').textContent = `Page ${currentPage} of ${totalPages || 1}`;
}

function goToPage(page) {
  const totalPages = Math.ceil(filteredData.length / PER_PAGE);
  if (page < 1 || page > totalPages) return;
  currentPage = page;
  
  if (currentTab === 'dashboard' || currentTab === 'events') {
    renderTable();
  }
  document.querySelector('.table-container').scrollIntoView({ behavior: 'smooth' });
}

function getProfileKey(event) {
  return event.username ? `username:${event.username}` : event.device_id ? `device:${event.device_id}` : 'anonymous';
}

function buildProfileData() {
  const map = new Map();
  filteredData.forEach(e => {
    const profileKey = getProfileKey(e);
    if (!map.has(profileKey)) {
      map.set(profileKey, {
        key: profileKey,
        displayName: e.username || e.device_id || 'Anonymous',
        type: e.username ? 'Username' : 'Device',
        eventCount: 0,
        firstSeen: e.created_at,
        lastSeen: e.created_at,
        activeDays: new Set(),
        eventTypes: {},
        countries: new Set(),
        events: []
      });
    }
    const profile = map.get(profileKey);
    profile.eventCount += 1;
    if (e.created_at) {
      if (!profile.firstSeen || e.created_at < profile.firstSeen) profile.firstSeen = e.created_at;
      if (!profile.lastSeen || e.created_at > profile.lastSeen) profile.lastSeen = e.created_at;
      profile.activeDays.add(formatShortDate(e.created_at));
    }
    profile.eventTypes[e.event_type] = (profile.eventTypes[e.event_type] || 0) + 1;
    if (e.country) profile.countries.add(e.country);
    profile.events.push(e);
  });
  return Array.from(map.values()).sort((a, b) => b.eventCount - a.eventCount);
}

function selectProfile(profileKey) {
  selectedProfileKey = profileKey;
  renderUserProfilesTable();
}

function renderProfileDetailPanel(profileKey) {
  const section = document.getElementById('profileDetailSection');
  const metricsList = document.getElementById('profileMetricsList');
  if (!profileKey) {
    section.style.display = 'none';
    return;
  }

  const profile = profileData.find(p => p.key === profileKey);
  if (!profile) {
    section.style.display = 'none';
    return;
  }

  section.style.display = 'block';
  document.getElementById('profileDetailTitle').textContent = `Profile: ${profile.displayName}`;
  document.getElementById('profileDetailSubtitle').textContent = `Showing activity for ${profile.displayName}. Select other profiles from the list to compare usage and events.`;
  metricsList.innerHTML = `
    <strong>Type:</strong> ${profile.type}<br>
    <strong>Events:</strong> ${profile.eventCount}<br>
    <strong>Active days:</strong> ${profile.activeDays.size}<br>
    <strong>Countries:</strong> ${Array.from(profile.countries).slice(0, 3).join(', ') || '—'}<br>
    <strong>First seen:</strong> ${formatDate(profile.firstSeen)}<br>
    <strong>Last seen:</strong> ${formatDate(profile.lastSeen)}
  `;
  renderProfileCharts(profile);
}

function renderProfileCharts(profile) {
  const activityMap = new Map();
  profile.events.forEach(e => {
    const day = formatShortDate(e.created_at);
    activityMap.set(day, (activityMap.get(day) || 0) + 1);
  });
  const labels = Array.from(activityMap.keys()).sort();
  const values = labels.map(day => activityMap.get(day));
  destroyChart('profileActivity');
  const activityCtx = document.getElementById('profileActivityChart')?.getContext('2d');
  if (activityCtx) {
    charts.profileActivity = new Chart(activityCtx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Events',
          data: values,
          backgroundColor: 'rgba(59,130,246,0.7)',
          borderColor: '#3b82f6',
          borderRadius: 6,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: '#94a3b8' }, grid: { display: false } },
          y: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } }
        }
      }
    });
  }

  const eventTypes = Object.entries(profile.eventTypes).sort((a, b) => b[1] - a[1]);
  destroyChart('profileEvent');
  const profileCtx = document.getElementById('profileEventChart')?.getContext('2d');
  if (profileCtx) {
    charts.profileEvent = new Chart(profileCtx, {
      type: 'doughnut',
      data: {
        labels: eventTypes.map(([type]) => type.replace(/_/g, ' ')),
        datasets: [{
          data: eventTypes.map(([_, count]) => count),
          backgroundColor: ['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec489a','#06b6d4','#f97316'],
          borderWidth: 0,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'right',
            labels: { color: '#94a3b8', padding: 12, font: { size: 11 } }
          }
        }
      }
    });
  }
}

function renderUserProfilesTable() {
  profileData = buildProfileData();
  const tbody = document.getElementById('eventsTableBody');
  tbody.innerHTML = '';
  document.getElementById('eventsTableHead').innerHTML = `
    <tr>
      <th>Profile</th>
      <th>Events</th>
      <th>Active Days</th>
      <th>First Seen</th>
      <th>Last Seen</th>
      <th>Countries</th>
    </tr>
  `;

  if (!profileData.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6">
          <div class="empty-state">
            <i class="fas fa-user-circle"></i>
            <p>No user profiles available.</p>
            <p style="font-size: 0.85rem;">Profiles appear when events are available for users or devices.</p>
          </div>
        </td>
      </tr>
    `;
    document.getElementById('tableInfo').textContent = 'No profiles to display';
    document.getElementById('pageButtons').innerHTML = '';
    document.getElementById('pageInfo').textContent = '';
    renderProfileDetailPanel(null);
    return;
  }

  profileData.forEach(profile => {
    const row = tbody.insertRow();
    row.style.cursor = 'pointer';
    row.addEventListener('click', () => selectProfile(profile.key));
    row.innerHTML = `
      <td><strong>${profile.displayName}</strong><br><span style="font-size:0.8rem;color:var(--text-dim);">${profile.type}</span></td>
      <td>${profile.eventCount}</td>
      <td>${profile.activeDays.size}</td>
      <td>${formatDate(profile.firstSeen)}</td>
      <td>${formatDate(profile.lastSeen)}</td>
      <td>${Array.from(profile.countries).slice(0, 3).join(', ') || '—'}</td>
    `;
  });

  document.getElementById('tableInfo').textContent = `${profileData.length} profiles found — click a profile for details`;
  document.getElementById('tableTitle').textContent = '👤 User Profiles';
  document.getElementById('pageButtons').innerHTML = '';
  document.getElementById('pageInfo').textContent = '';
  if (selectedProfileKey) {
    renderProfileDetailPanel(selectedProfileKey);
  } else {
    renderProfileDetailPanel(null);
  }
}

// ========== TAB-SPECIFIC RENDERERS ==========
function renderSetupsTable() {
  const tbody = document.getElementById('eventsTableBody');
  tbody.innerHTML = '';
  
  document.getElementById('eventsTableHead').innerHTML = `
    <tr>
      <th>Date</th>
      <th>Username</th>
      <th>Email</th>
      <th>Business Name</th>
      <th>Location</th>
      <th>Language</th>
    </tr>
  `;
  
  if (!setupData || setupData.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6">
          <div class="empty-state">
            <i class="fas fa-users"></i>
            <p>No setup data available yet</p>
            <p style="font-size: 0.85rem;">Setup data will appear here once users complete the setup process</p>
          </div>
        </td>
      </tr>
    `;
    document.getElementById('tableInfo').textContent = 'No setups recorded';
    document.getElementById('pageButtons').innerHTML = '';
    document.getElementById('pageInfo').textContent = '';
    return;
  }
  
  setupData.forEach(s => {
    const row = tbody.insertRow();
    row.insertCell(0).textContent = formatDate(s.created_at);
    row.insertCell(1).innerHTML = `<strong>${s.username || '—'}</strong>`;
    row.insertCell(2).textContent = s.email || '—';
    row.insertCell(3).textContent = s.business_name || '—';
    row.insertCell(4).textContent = `${s.city || ''}, ${s.country || ''}`.replace(/^, /, '') || '—';
    row.insertCell(5).innerHTML = s.language ? 
      `<span class="event-badge" style="background: rgba(139,92,246,0.2); color: #a78bfa;">${s.language.toUpperCase()}</span>` : '—';
  });
  
  document.getElementById('tableInfo').textContent = `${setupData.length} setup records`;
  document.getElementById('tableTitle').textContent = '👥 User Setups';
  document.getElementById('pageButtons').innerHTML = '';
  document.getElementById('pageInfo').textContent = '';
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

function renderCountriesView() {
  const countryCount = {};
  filteredData.forEach(e => {
    if (e.country) countryCount[e.country] = (countryCount[e.country] || 0) + 1;
  });
  
  const sortedCountries = Object.entries(countryCount).sort((a,b) => b[1]-a[1]);
  
  const tbody = document.getElementById('eventsTableBody');
  tbody.innerHTML = '';
  
  document.getElementById('eventsTableHead').innerHTML = `
    <tr>
      <th>#</th>
      <th>Country</th>
      <th>Events</th>
      <th>Unique Devices</th>
      <th>Last Active</th>
      <th>Top Event</th>
    </tr>
  `;
  
  if (sortedCountries.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6">
          <div class="empty-state">
            <i class="fas fa-globe-americas"></i>
            <p>No country data available</p>
          </div>
        </td>
      </tr>
    `;
    document.getElementById('pageButtons').innerHTML = '';
    document.getElementById('pageInfo').textContent = '';
    return;
  }
  
  sortedCountries.forEach(([country, count], index) => {
    const countryData = filteredData.filter(e => e.country === country);
    const uniqueDevices = new Set(countryData.map(e => e.device_id)).size;
    const lastActive = formatDate(countryData[0]?.created_at);
    
    const eventTypes = {};
    countryData.forEach(e => {
      eventTypes[e.event_type] = (eventTypes[e.event_type] || 0) + 1;
    });
    const topEvent = Object.entries(eventTypes).sort((a,b) => b[1]-a[1])[0]?.[0] || '—';
    
    const row = tbody.insertRow();
    row.insertCell(0).textContent = index + 1;
    row.insertCell(1).innerHTML = `<strong>${country}</strong>`;
    row.insertCell(2).textContent = count.toLocaleString();
    row.insertCell(3).textContent = uniqueDevices;
    row.insertCell(4).textContent = lastActive;
    row.insertCell(5).textContent = topEvent.replace(/_/g, ' ');
  });
  
  document.getElementById('tableInfo').textContent = `${sortedCountries.length} countries`;
  document.getElementById('tableTitle').textContent = '🌍 Countries Breakdown';
  document.getElementById('pageButtons').innerHTML = '';
  document.getElementById('pageInfo').textContent = '';
}

function renderDevicesTable() {
  const deviceMap = new Map();
  filteredData.forEach(e => {
    if (!deviceMap.has(e.device_id)) {
      deviceMap.set(e.device_id, {
        id: e.device_id,
        firstSeen: e.created_at,
        lastSeen: e.created_at,
        eventCount: 0,
        events: new Set(),
        countries: new Set(),
        usernames: new Set()
      });
    }
    const device = deviceMap.get(e.device_id);
    device.lastSeen = e.created_at;
    device.eventCount++;
    device.events.add(e.event_type);
    if (e.country) device.countries.add(e.country);
    if (e.username) device.usernames.add(e.username);
  });
  
  const devices = Array.from(deviceMap.values())
    .sort((a, b) => b.eventCount - a.eventCount);
  
  const tbody = document.getElementById('eventsTableBody');
  tbody.innerHTML = '';
  
  document.getElementById('eventsTableHead').innerHTML = `
    <tr>
      <th>Device ID</th>
      <th>Events</th>
      <th>First Seen</th>
      <th>Last Seen</th>
      <th>Countries</th>
      <th>Users</th>
    </tr>
  `;
  
  if (devices.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6">
          <div class="empty-state">
            <i class="fas fa-mobile-alt"></i>
            <p>No device data available</p>
          </div>
        </td>
      </tr>
    `;
    document.getElementById('pageButtons').innerHTML = '';
    document.getElementById('pageInfo').textContent = '';
    return;
  }
  
  devices.forEach(d => {
    const row = tbody.insertRow();
    row.insertCell(0).innerHTML = `<code style="background: rgba(255,255,255,0.05); padding: 2px 8px; border-radius: 4px;">${(d.id || 'unknown').slice(0, 16)}…</code>`;
    row.insertCell(1).textContent = d.eventCount;
    row.insertCell(2).textContent = formatDate(d.firstSeen);
    row.insertCell(3).textContent = formatDate(d.lastSeen);
    row.insertCell(4).textContent = Array.from(d.countries).slice(0, 3).join(', ') || '—';
    row.insertCell(5).textContent = Array.from(d.usernames).slice(0, 3).join(', ') || '—';
  });
  
  document.getElementById('tableInfo').textContent = `${devices.length} unique devices`;
  document.getElementById('tableTitle').textContent = '📱 Device Analysis';
  document.getElementById('pageButtons').innerHTML = '';
  document.getElementById('pageInfo').textContent = '';
}

function renderSettingsPanel() {
  const tbody = document.getElementById('eventsTableBody');
  tbody.innerHTML = '';
  
  document.getElementById('eventsTableHead').innerHTML = `
    <tr>
      <th>Setting</th>
      <th>Value</th>
      <th>Description</th>
      <th>Status</th>
      <th colspan="2"></th>
    </tr>
  `;
  
  const settings = [
    { name: 'Supabase Connection', value: 'Connected', desc: 'Backend database', status: 'active' },
    { name: 'Data Retention', value: 'All time', desc: 'Event data retention', status: 'active' },
    { name: 'Auto Refresh', value: 'Manual', desc: 'Dashboard refresh', status: 'active' },
    { name: 'Password Protection', value: 'Enabled', desc: 'Dashboard access control', status: 'secure' },
    { name: 'CSV Export', value: 'Available', desc: 'Data export functionality', status: 'ready' },
    { name: 'Total Events', value: rawData.length.toLocaleString(), desc: 'All-time events in database', status: 'info' },
    { name: 'Total Setups', value: setupData.length.toLocaleString(), desc: 'Completed user setups', status: 'info' },
  ];
  
  settings.forEach(s => {
    const row = tbody.insertRow();
    row.insertCell(0).innerHTML = `<strong>${s.name}</strong>`;
    row.insertCell(1).textContent = s.value;
    row.insertCell(2).textContent = s.desc;
    row.insertCell(3).innerHTML = `<span class="event-badge" style="background: rgba(16,185,129,0.2); color: #34d399;">${s.status}</span>`;
    row.insertCell(4).textContent = '';
    row.insertCell(5).textContent = '';
  });
  
  document.getElementById('tableInfo').textContent = 'Dashboard Configuration';
  document.getElementById('tableTitle').textContent = '⚙️ Settings';
  document.getElementById('pageButtons').innerHTML = '';
  document.getElementById('pageInfo').textContent = '';
}

// ========== TAB SWITCHING ==========
function switchTab(tab, clickedElement) {
  document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
  if (clickedElement) {
    clickedElement.classList.add('active');
  }
  
  currentTab = tab;
  currentPage = 1;
  
  const filterBar = document.getElementById('filterBar');
  const statsGrid = document.getElementById('statsGrid');
  const chartsGrid = document.getElementById('chartsGrid');
  const tableContainer = document.getElementById('tableContainer');
  const pagination = document.getElementById('paginationContainer');
  const pageHeading = document.getElementById('pageHeading');
  const eventFilters = document.getElementById('eventFilters');
  const presetContainer = document.getElementById('presetContainer');
  const profileDetailSection = document.getElementById('profileDetailSection');
  
  if (profileDetailSection) {
    profileDetailSection.style.display = 'none';
  }
  
  resetTableHeaders();
  
  switch(tab) {
    case 'dashboard':
      pageHeading.innerHTML = '<i class="fas fa-chart-line"></i> Analytics Dashboard';
      filterBar.style.display = 'flex';
      if (eventFilters) eventFilters.style.display = 'flex';
      if (presetContainer) presetContainer.style.display = 'flex';
      statsGrid.style.display = 'grid';
      chartsGrid.style.display = 'grid';
      tableContainer.style.display = 'block';
      pagination.style.display = 'flex';
      document.getElementById('tableTitle').textContent = '📋 Recent Events';
      renderStats();
      renderCharts();
      renderTable();
      break;
      
    case 'events':
      pageHeading.innerHTML = '<i class="fas fa-list-alt"></i> Events Log';
      filterBar.style.display = 'flex';
      if (eventFilters) eventFilters.style.display = 'flex';
      if (presetContainer) presetContainer.style.display = 'flex';
      statsGrid.style.display = 'none';
      chartsGrid.style.display = 'none';
      tableContainer.style.display = 'block';
      pagination.style.display = 'flex';
      document.getElementById('tableTitle').textContent = '📋 Events Log';
      renderTable();
      break;
      
    case 'setups':
      pageHeading.innerHTML = '<i class="fas fa-user-plus"></i> User Setups';
      filterBar.style.display = 'none';
      statsGrid.style.display = 'none';
      chartsGrid.style.display = 'none';
      tableContainer.style.display = 'block';
      pagination.style.display = 'none';
      renderSetupsTable();
      break;
      
    case 'countries':
      pageHeading.innerHTML = '<i class="fas fa-globe-americas"></i> Countries';
      filterBar.style.display = 'flex';
      if (eventFilters) eventFilters.style.display = 'flex';
      if (presetContainer) presetContainer.style.display = 'flex';
      statsGrid.style.display = 'none';
      chartsGrid.style.display = 'none';
      tableContainer.style.display = 'block';
      pagination.style.display = 'none';
      renderCountriesView();
      break;
      
    case 'devices':
      pageHeading.innerHTML = '<i class="fas fa-mobile-alt"></i> Devices';
      filterBar.style.display = 'flex';
      if (eventFilters) eventFilters.style.display = 'flex';
      if (presetContainer) presetContainer.style.display = 'flex';
      statsGrid.style.display = 'none';
      chartsGrid.style.display = 'none';
      tableContainer.style.display = 'block';
      pagination.style.display = 'none';
      if (profileDetailSection) profileDetailSection.style.display = 'none';
      renderDevicesTable();
      break;

    case 'profiles':
      pageHeading.innerHTML = '<i class="fas fa-user-circle"></i> User Profiles';
      filterBar.style.display = 'flex';
      if (eventFilters) eventFilters.style.display = 'flex';
      if (presetContainer) presetContainer.style.display = 'flex';
      statsGrid.style.display = 'none';
      chartsGrid.style.display = 'none';
      tableContainer.style.display = 'block';
      pagination.style.display = 'none';
      renderUserProfilesTable();
      break;

    case 'feedback':
      pageHeading.innerHTML = '<i class="fas fa-comments"></i> User Feedback';
      filterBar.style.display = 'none';
      statsGrid.style.display = 'none';
      chartsGrid.style.display = 'none';
      tableContainer.style.display = 'block';
      pagination.style.display = 'none';
      if (profileDetailSection) profileDetailSection.style.display = 'none';
      renderFeedbackTable();
      break;
      
    case 'settings':
      pageHeading.innerHTML = '<i class="fas fa-cog"></i> Settings';
      filterBar.style.display = 'none';
      statsGrid.style.display = 'none';
      chartsGrid.style.display = 'none';
      tableContainer.style.display = 'block';
      pagination.style.display = 'none';
      renderSettingsPanel();
      break;
  }
  
  console.log('✅ Switched to tab:', tab);
  closeMobileSidebar();
}

// ========== ACTIONS ==========
async function refreshDashboard() {
  showLoading('Refreshing dashboard data...');
  await fetchData();
  await fetchSetupData();
  await fetchFeedbackData();
  hideLoading();
}

function setDateRange(preset) {
  const today = luxon.DateTime.now();
  let start, end;
  
  if (preset === 'today') { start = today.toISODate(); end = start; }
  else if (preset === '7days') { start = today.minus({ days: 7 }).toISODate(); end = today.toISODate(); }
  else if (preset === '30days') { start = today.minus({ days: 30 }).toISODate(); end = today.toISODate(); }
  else if (preset === 'month') { start = today.startOf('month').toISODate(); end = today.endOf('month').toISODate(); }
  
  document.getElementById('startDate').value = start;
  document.getElementById('endDate').value = end;
  startDate = start;
  endDate = end;
  
  document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
  document.querySelector(`[data-preset="${preset}"]`)?.classList.add('active');
  
  currentPage = 1;
  refreshDashboard();
}