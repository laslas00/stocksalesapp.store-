// ========================================
// ENGAGEMENT BUILDER - CORRECTED VERSION
// ========================================

const EngagementBuilder = {
    version: '1.0.1',
    
    types: {
        MOTIVATIONAL: 'motivational',
        STOCK_ALERT: 'stock_alert',
        SALES_REMINDER: 'sales_reminder',
        BUSINESS_TIP: 'business_tip',
        CHECK_IN: 'check_in'
    },
    
    messages: {
        en: {
            motivational: [
                "🌟 Your hard work today builds tomorrow's success! Keep going!",
                "💪 Every stock you manage is a step toward business growth!",
                "🎯 Small daily improvements lead to big results. You've got this!"
            ],
            stock_alert: [
                "⚠️ Time to check your low stock items!",
                "📦 {count} items are running low. Restock them today!"
            ],
            sales_reminder: [
                "💰 No sales recorded today. Ready to make some money?",
                "📝 Don't forget to record today's sales for accurate tracking!"
            ],
            business_tip: [
                "💡 Tip: Review your top 10 products weekly for better insights!",
                "📊 Tip: Check your profit margins on bestsellers this month!"
            ],
            check_in: [
                "👋 Good morning! Ready to manage your stock today?",
                "🌙 Evening check-in: Have you recorded all today's sales?"
            ],
            morning: "🌅 Good morning! Start your day by checking stock levels.",
            afternoon: "☀️ Afternoon check: How are sales going today?",
            evening: "🌙 Evening reminder: Record all sales before closing!"
        },
        es: {
            motivational: [
                "🌟 ¡Tu trabajo duro hoy construye el éxito del mañana!"
            ],
            stock_alert: ["⚠️ ¡Revisa tus productos con stock bajo!"],
            sales_reminder: ["💰 ¿Sin ventas hoy? ¡Es hora de vender!"],
            business_tip: ["💡 Tip: Revisa tus 10 mejores productos semanalmente."],
            check_in: ["👋 ¡Buenos días! ¿Listo para gestionar tu inventario?"],
            morning: "🌅 ¡Buenos días! Revisa los niveles de stock.",
            afternoon: "☀️ Revisión de tarde: ¿Cómo van las ventas?",
            evening: "🌙 ¡Registra todas las ventas antes de cerrar!"
        }
    },
    
  getUserLanguage() {
        const savedLang = localStorage.getItem('language');
        if (savedLang && this.messages[savedLang]) return savedLang;
        const browserLang = navigator.language.split('-')[0];
        if (this.messages[browserLang]) return browserLang;
        return 'en';
    },
    
    getRandomMessage(type, params = {}) {
        const lang = this.getUserLanguage();
        const messages = this.messages[lang]?.[type] || this.messages.en[type];
        
        if (!messages) return null;
        
        // FIX: Check if it's an array or string
        let message;
        if (Array.isArray(messages) && messages.length > 0) {
            message = messages[Math.floor(Math.random() * messages.length)];
        } else if (typeof messages === 'string') {
            message = messages;
        } else {
            return null;
        }
        
        Object.keys(params).forEach(key => {
            message = message.replace(`{${key}}`, params[key]);
        });
        
        return message;
    },
    
    // FIXED: Properly get morning/afternoon/evening messages
    getTimeBasedMessage(timeOfDay) {
        const lang = this.getUserLanguage();
        const msg = this.messages[lang]?.[timeOfDay] || this.messages.en[timeOfDay];
        return msg;
    },
    
    getInactiveDays() {
        const lastActivity = localStorage.getItem('lastAppActivity');
        if (!lastActivity) return 0;
        const lastDate = new Date(parseInt(lastActivity));
        const today = new Date();
        const diffDays = Math.ceil(Math.abs(today - lastDate) / (1000 * 60 * 60 * 24));
        return diffDays;
    },
    
    async hadSalesToday() {
        const today = new Date().toISOString().split('T')[0];
        
        try {
            const salesRecord = localStorage.getItem(`sales_${today}`);
            if (salesRecord) {
                const parsed = JSON.parse(salesRecord);
                if (parsed && parsed.count > 0) return true;
            }
        } catch (e) {
            console.warn('Invalid sales record');
        }
        
        if (window.supabase && window.currentBusinessId) {
            try {
                // FIXED: Correct Supabase query without head:true issue
                const { count, error } = await window.supabase
                    .from('sales')
                    .select('*', { count: 'exact', head: true })
                    .eq('business_id', window.currentBusinessId)
                    .gte('sale_date', `${today}T00:00:00`)
                    .lte('sale_date', `${today}T23:59:59`);
                
                if (!error && count && count > 0) return true;
            } catch (e) {
                console.log('Could not check Supabase sales');
            }
        }
        return false;
    },
    
    async getLowStockCount() {
        if (window.stockItems && Array.isArray(window.stockItems)) {
            return window.stockItems.filter(item => item.quantity <= (item.min_stock || 5)).length;
        }
        return 0;
    },
    
    async sendNotification(type, title, body, data = {}) {
        if (!('Notification' in window) || Notification.permission !== 'granted') {
            console.log('Notifications not permitted');
            return false;
        }
        
        if ('serviceWorker' in navigator) {
            try {
                const registration = await navigator.serviceWorker.ready;
                await registration.showNotification(title, {
                    body: body,
                    icon: './image/logo.jpg',
                    badge: './image/200.png',
                    vibrate: [200, 100, 200],
                    tag: `engagement-${type}-${Date.now()}`,
                    data: { ...data, type, url: data.url || './shop.html' }
                });
                return true;
            } catch (error) {
                console.error('Failed to send notification:', error);
                return false;
            }
        } else {
            try {
                new Notification(title, { body: body, icon: './image/logo.jpg' });
                return true;
            } catch (error) {
                return false;
            }
        }
    },
    
    // FIXED: Use proper message retrieval
    async sendMorningCheckIn() {
        const lang = this.getUserLanguage();
        const title = lang === 'en' ? '🌅 Good Morning! StockApp* Check-in' :
                     lang === 'es' ? '🌅 ¡Buenos días! Revisión StockApp*' :
                     '🌅 Bonjour ! Vérification StockApp*';
        
        const body = this.getTimeBasedMessage('morning');
        await this.sendNotification('check_in', title, body, { type: 'morning' });
    },
    
    async sendEveningCheckIn() {
        const lang = this.getUserLanguage();
        const title = lang === 'en' ? '🌙 Evening Check-in' :
                     lang === 'es' ? '🌙 Revisión Nocturna' :
                     '🌙 Vérification du Soir';
        
        const body = this.getTimeBasedMessage('evening');
        await this.sendNotification('check_in', title, body, { type: 'evening' });
    },
    
    async sendLowStockAlert() {
        const lowStockCount = await this.getLowStockCount();
        if (lowStockCount === 0) return;
        
        const lang = this.getUserLanguage();
        const title = lang === 'en' ? '⚠️ Low Stock Alert' :
                     lang === 'es' ? '⚠️ Alerta de Stock Bajo' :
                     '⚠️ Alerte de Stock Faible';
        
        const body = this.getRandomMessage('stock_alert', { count: lowStockCount }) ||
                    `${lowStockCount} item(s) running low. Restock soon!`;
        
        await this.sendNotification('stock_alert', title, body, { type: 'stock' });
    },
    
    async sendMotivationalMessage() {
        const body = this.getRandomMessage('motivational');
        if (!body) return;
        
        const lang = this.getUserLanguage();
        const title = lang === 'en' ? '✨ Daily Motivation' :
                     lang === 'es' ? '✨ Motivación Diaria' :
                     '✨ Motivation Quotidienne';
        
        await this.sendNotification('motivational', title, body, { type: 'motivation' });
    },
    
    async sendBusinessTip() {
        const body = this.getRandomMessage('business_tip');
        if (!body) return;
        
        const lang = this.getUserLanguage();
        const title = lang === 'en' ? '💡 Business Tip' :
                     lang === 'es' ? '💡 Consejo de Negocio' :
                     '💡 Conseil Commercial';
        
        await this.sendNotification('tip', title, body, { type: 'tip' });
    },
    
    // FIXED: Proper interval tracking and hourly checks instead of giant timers
    scheduleNotifications() {
        if (window._engagementIntervals) {
            window._engagementIntervals.forEach(clearInterval);
        }
        window._engagementIntervals = [];
        
        if (Notification.permission !== 'granted') return;
        
        // HOURLY CHECKER instead of giant setTimeout delays
        const checkAndSend = () => {
            const now = new Date();
            const hour = now.getHours();
            const day = now.getDay(); // 0 = Sunday
            
            // Morning check (8-9 AM)
            if (hour === 8) {
                const lastMorning = localStorage.getItem('lastMorningCheck');
                const today = now.toDateString();
                if (lastMorning !== today) {
                    this.sendMorningCheckIn();
                    localStorage.setItem('lastMorningCheck', today);
                }
            }
            
            // Evening check (7-8 PM)
            if (hour === 19) {
                const lastEvening = localStorage.getItem('lastEveningCheck');
                const today = now.toDateString();
                if (lastEvening !== today) {
                    this.sendEveningCheckIn();
                    localStorage.setItem('lastEveningCheck', today);
                }
            }
            
            // Monday motivation (hour 10)
            if (day === 1 && hour === 10) {
                const lastMonday = localStorage.getItem('lastMondayMotivation');
                const thisWeek = `${now.getFullYear()}-W${now.getWeek()}`;
                if (lastMonday !== thisWeek) {
                    this.sendMotivationalMessage();
                    localStorage.setItem('lastMondayMotivation', thisWeek);
                }
            }
            
            // Wednesday tip (hour 11)
            if (day === 3 && hour === 11) {
                const lastWednesday = localStorage.getItem('lastWednesdayTip');
                const thisWeek = `${now.getFullYear()}-W${now.getWeek()}`;
                if (lastWednesday !== thisWeek) {
                    this.sendBusinessTip();
                    localStorage.setItem('lastWednesdayTip', thisWeek);
                }
            }
        };
        
        // Run every hour
        const intervalId = setInterval(checkAndSend, 60 * 60 * 1000);
        window._engagementIntervals.push(intervalId);
        
        // Also check immediately
        checkAndSend();
        
        // Daily low stock check
        const lowStockId = setInterval(async () => {
            await this.sendLowStockAlert();
        }, 24 * 60 * 60 * 1000);
        window._engagementIntervals.push(lowStockId);
        
        console.log('📅 Engagement notifications scheduled!');
    },
    
    updateActivity() {
        const timestamp = Date.now();
        localStorage.setItem('lastAppActivity', timestamp.toString());
        
        // Notify service worker
        if (navigator.serviceWorker.controller) {
            navigator.serviceWorker.controller.postMessage({
                type: 'UPDATE_ACTIVITY'
            });
        }
    },
    
    // FIXED: Missing comma after previous method
    // Get local stock items
    getLocalStockItems() {
        const items = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.startsWith('stock_item_')) {
                try {
                    const item = JSON.parse(localStorage.getItem(key));
                    if (item) items.push(item);
                } catch (e) {}
            }
        }
        return items;
    },
    
    // FIXED: Missing comma after previous method
    addEngagementButton() {
        if (document.getElementById('engagementFloatingBtn')) return;
        
        const btn = document.createElement('div');
        btn.id = 'engagementFloatingBtn';
        btn.innerHTML = '💡';
        Object.assign(btn.style, {
            position: 'fixed', bottom: '20px', right: '20px',
            width: '50px', height: '50px', borderRadius: '50%',
            background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
            color: 'white', display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontSize: '24px', cursor: 'pointer',
            zIndex: '9999', border: 'none',display: 'none', // Start hidden
        });
        
        btn.onclick = async () => {
            const tip = this.getRandomMessage('business_tip');
            if (tip && typeof showMessageModal === 'function') {
                showMessageModal(tip, 4000);
            } else if (tip) {
                alert(tip);
            }
        };
        
        document.body.appendChild(btn);
    },
    
    // FIXED: Proper DOM ready check
    async init() {
        console.log('🚀 Initializing Engagement Builder v' + this.version);
        
        this.updateActivity();
        
        // Track activity
        const events = ['click', 'touchstart', 'keydown'];
        events.forEach(event => {
            document.addEventListener(event, () => this.updateActivity());
        });
        
        // Request notification permission
        if (Notification.permission === 'default') {
            const permission = await Notification.requestPermission();
            if (permission === 'granted') {
                console.log('📢 Notification permission granted!');
            }
        }
        
        // Register background sync
        if ('serviceWorker' in navigator && 'SyncManager' in window) {
            try {
                const registration = await navigator.serviceWorker.ready;
                
                // Register periodic sync if available (Chrome)
                if ('periodicSync' in registration) {
                    try {
                        await registration.periodicSync.register('engagement-sync', {
                            minInterval: 60 * 60 * 1000 // 1 hour
                        });
                        console.log('✅ Periodic background sync registered');
                    } catch (error) {
                        console.log('Periodic sync not available, using regular sync');
                    }
                }
                
                // Register regular background sync
                await registration.sync.register('engagement-check');
                console.log('✅ Background sync registered');
                
                // Tell service worker to initialize engagement system
                if (navigator.serviceWorker.controller) {
                    navigator.serviceWorker.controller.postMessage({
                        type: 'INIT_ENGAGEMENT_SYSTEM'
                    });
                }
            } catch (error) {
                console.warn('⚠️ Background sync not available:', error);
            }
        }
        
        // Update stock data in service worker
        this.syncStockData();
        
        // Send activity update to service worker
        if (navigator.serviceWorker.controller) {
            navigator.serviceWorker.controller.postMessage({
                type: 'UPDATE_ACTIVITY'
            });
        }
        
        this.addEngagementButton();
        this.scheduleNotifications(); // FIXED: Added missing schedule notifications call
    },
    
    // FIXED: Missing comma and proper method structure
    async syncStockData() {
        if (!navigator.serviceWorker.controller) return;
        
        const stockItems = this.getLocalStockItems();
        if (stockItems.length > 0) {
            navigator.serviceWorker.controller.postMessage({
                type: 'UPDATE_STOCK',
                items: stockItems
            });
        }
    }
};

// Helper for week number
Date.prototype.getWeek = function() {
    const date = new Date(this.getTime());
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
    const week1 = new Date(date.getFullYear(), 0, 4);
    return 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
};

// FIXED: Proper DOM ready check
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        EngagementBuilder.init();
    });
} else {
    EngagementBuilder.init();
}

window.EngagementBuilder = EngagementBuilder;