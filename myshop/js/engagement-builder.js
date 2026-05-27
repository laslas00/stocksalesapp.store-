// ========================================
// ENGAGEMENT BUILDER - User Engagement System
// ========================================

const EngagementBuilder = {
    // Version
    version: '1.0.0',
    
    // Notification types
    types: {
        MOTIVATIONAL: 'motivational',
        STOCK_ALERT: 'stock_alert',
        SALES_REMINDER: 'sales_reminder',
        BUSINESS_TIP: 'business_tip',
        CHECK_IN: 'check_in'
    },
    
    // Multi-language messages
    messages: {
        en: {
            motivational: [
                "🌟 Your hard work today builds tomorrow's success! Keep going!",
                "💪 Every stock you manage is a step toward business growth!",
                "🎯 Small daily improvements lead to big results. You've got this!",
                "📈 Your inventory management skills are getting sharper every day!",
                "✨ Success is the sum of small efforts, repeated day in and day out.",
                "🚀 StockApp* is here to help you reach your business goals!",
                "💡 A well-organized inventory = a profitable business. Great job!",
                "🏆 You're doing amazing things with your business. Keep tracking!",
                "⭐ Every product you track brings you closer to success.",
                "🎉 Your dedication to managing your shop is inspiring!"
            ],
            stock_alert: [
                "⚠️ Time to check your low stock items! Some products need attention.",
                "📦 {count} items are running low. Restock them today!",
                "🔔 Low stock alert: Your bestsellers need replenishment.",
                "💡 Review your inventory - some items are below minimum levels."
            ],
            sales_reminder: [
                "💰 No sales recorded today. Ready to make some money?",
                "📝 Don't forget to record today's sales for accurate tracking!",
                "💵 Every sale counts! Update your records now.",
                "🎯 Target for today: Record at least 5 sales!"
            ],
            business_tip: [
                "💡 Tip: Review your top 10 products weekly for better insights!",
                "📊 Tip: Check your profit margins on bestsellers this month!",
                "🔄 Tip: Regular stock takes prevent inventory discrepancies!",
                "🎯 Tip: Set reorder points for your fastest-moving items!",
                "📈 Tip: Track daily sales to spot trends and opportunities!",
                "💰 Tip: Monitor your slow-moving stock to free up cash!",
                "🏷️ Tip: Categorize products for better sales analysis!",
                "📅 Tip: Review monthly reports to plan next month's strategy!"
            ],
            check_in: [
                "👋 Good morning! Ready to manage your stock today?",
                "🌙 Evening check-in: Have you recorded all today's sales?",
                "📊 Weekly review time! Check your business performance.",
                "🎯 Monday motivation: Set your inventory goals for the week!",
                "⭐ Friday reminder: Review your week's achievements!"
            ],
            morning: "🌅 Good morning! Start your day by checking stock levels.",
            afternoon: "☀️ Afternoon check: How are sales going today?",
            evening: "🌙 Evening reminder: Record all sales before closing!"
        },
        es: {
            motivational: [
                "🌟 ¡Tu trabajo duro hoy construye el éxito del mañana! ¡Sigue así!",
                "💪 ¡Cada producto que gestionas es un paso hacia el crecimiento!",
                "🎯 Las pequeñas mejoras diarias traen grandes resultados.",
                "📈 ¡Tus habilidades de gestión de inventario mejoran cada día!"
            ],
            stock_alert: [
                "⚠️ ¡Revisa tus productos con stock bajo!",
                "📦 {count} productos necesitan reabastecimiento.",
                "🔔 Alerta: tus productos más vendidos necesitan atención."
            ],
            sales_reminder: [
                "💰 ¿Sin ventas hoy? ¡Es hora de vender!",
                "📝 No olvides registrar las ventas del día.",
                "💵 ¡Cada venta cuenta! Actualiza tus registros."
            ],
            business_tip: [
                "💡 Tip: Revisa tus 10 mejores productos semanalmente.",
                "📊 Tip: Revisa tus márgenes de beneficio mensuales.",
                "🔄 Tip: Los recuentos regulares previenen discrepancias."
            ],
            check_in: [
                "👋 ¡Buenos días! ¿Listo para gestionar tu inventario?",
                "🌙 Revisión nocturna: ¿Registraste todas las ventas?",
                "📊 ¡Hora del resumen semanal! Revisa tu rendimiento."
            ],
            morning: "🌅 ¡Buenos días! Revisa los niveles de stock.",
            afternoon: "☀️ Revisión de tarde: ¿Cómo van las ventas?",
            evening: "🌙 ¡Registra todas las ventas antes de cerrar!"
        },
        fr: {
            motivational: [
                "🌟 Votre travail acharné construit le succès de demain !",
                "💪 Chaque produit géré est un pas vers la croissance !",
                "🎯 Les petites améliorations quotidiennes donnent de grands résultats."
            ],
            stock_alert: [
                "⚠️ Vérifiez vos produits en stock bas !",
                "📦 {count} produits nécessitent un réapprovisionnement."
            ],
            sales_reminder: [
                "💰 Pas de ventes aujourd'hui ? Prêt à vendre ?",
                "📝 N'oubliez pas d'enregistrer les ventes du jour."
            ],
            business_tip: [
                "💡 Astuce: Examinez vos 10 meilleurs produits chaque semaine.",
                "📊 Astuce: Vérifiez vos marges bénéficiaires mensuelles."
            ],
            check_in: [
                "👋 Bonjour ! Prêt à gérer votre stock ?",
                "🌙 Vérification du soir : Toutes les ventes enregistrées ?"
            ],
            morning: "🌅 Bonjour ! Vérifiez les niveaux de stock.",
            afternoon: "☀️ Comment se passent les ventes aujourd'hui ?",
            evening: "🌙 Enregistrez toutes les ventes avant de fermer !"
        }
    },
    
    // Get user's language
    getUserLanguage() {
        const savedLang = localStorage.getItem('appLanguage');
        if (savedLang && this.messages[savedLang]) return savedLang;
        
        const browserLang = navigator.language.split('-')[0];
        if (this.messages[browserLang]) return browserLang;
        
        return 'en';
    },
    
    // Get random message from array
    getRandomMessage(type, params = {}) {
        const lang = this.getUserLanguage();
        const messages = this.messages[lang]?.[type] || this.messages.en[type];
        
        if (!messages || messages.length === 0) return null;
        
        let message = messages[Math.floor(Math.random() * messages.length)];
        
        // Replace placeholders
        Object.keys(params).forEach(key => {
            message = message.replace(`{${key}}`, params[key]);
        });
        
        return message;
    },
    
    // Check if user has been inactive
    getInactiveDays() {
        const lastActivity = localStorage.getItem('lastAppActivity');
        if (!lastActivity) return 0;
        
        const lastDate = new Date(parseInt(lastActivity));
        const today = new Date();
        const diffTime = Math.abs(today - lastDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        return diffDays;
    },
    
    // Check if there were sales today
    async hadSalesToday() {
        const today = new Date().toISOString().split('T')[0];
        
        // Check localStorage for today's sales
        const salesRecord = localStorage.getItem(`sales_${today}`);
        if (salesRecord && JSON.parse(salesRecord).count > 0) return true;
        
        // Try to check Supabase if available
        if (window.supabase && window.currentBusinessId) {
            try {
                const { data, error } = await window.supabase
                    .from('sales')
                    .select('id', { count: 'exact', head: true })
                    .eq('business_id', window.currentBusinessId)
                    .gte('sale_date', `${today}T00:00:00`)
                    .lte('sale_date', `${today}T23:59:59`);
                
                if (!error && data && data.length > 0) return true;
            } catch (e) {
                console.log('Could not check Supabase sales');
            }
        }
        
        return false;
    },
    
    // Get low stock items count
    async getLowStockCount() {
        if (window.stockItems && Array.isArray(window.stockItems)) {
            return window.stockItems.filter(item => item.quantity <= (item.min_stock || 5)).length;
        }
        return 0;
    },
    
    // Send a notification
    async sendNotification(type, title, body, data = {}) {
        if (!('Notification' in window) || Notification.permission !== 'granted') {
            console.log('Notifications not permitted');
            return false;
        }
        
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
            try {
                const registration = await navigator.serviceWorker.ready;
                await registration.showNotification(title, {
                    body: body,
                    icon: '/image/logo.jpg',
                    badge: '/image/200.png',
                    vibrate: [200, 100, 200],
                    tag: `engagement-${type}-${Date.now()}`,
                    data: { ...data, type, url: data.url || 'shop.html' }
                });
                console.log(`📧 Engagement notification sent: ${title}`);
                return true;
            } catch (error) {
                console.error('Failed to send notification:', error);
                return false;
            }
        } else {
            // Fallback to regular notification
            try {
                new Notification(title, { body: body, icon: '/image/logo.jpg' });
                return true;
            } catch (error) {
                console.error('Fallback notification failed:', error);
                return false;
            }
        }
    },
    
    // Send morning check-in
    async sendMorningCheckIn() {
        const lang = this.getUserLanguage();
        const title = lang === 'en' ? '🌅 Good Morning! StockApp* Check-in' :
                     lang === 'es' ? '🌅 ¡Buenos días! Revisión StockApp*' :
                     '🌅 Bonjour ! Vérification StockApp*';
        
        const body = this.getRandomMessage('morning') || 
                    (lang === 'en' ? 'Start your day by checking your inventory!' :
                     lang === 'es' ? '¡Comienza tu día revisando tu inventario!' :
                     'Commencez votre journée en vérifiant votre stock !');
        
        await this.sendNotification('check_in', title, body, { type: 'morning' });
    },
    
    // Send evening check-in
    async sendEveningCheckIn() {
        const lang = this.getUserLanguage();
        const title = lang === 'en' ? '🌙 Evening Check-in' :
                     lang === 'es' ? '🌙 Revisión Nocturna' :
                     '🌙 Vérification du Soir';
        
        const hadSales = await this.hadSalesToday();
        
        let body;
        if (hadSales) {
            body = this.getRandomMessage('sales_reminder') ||
                   (lang === 'en' ? 'Great job today! Don\'t forget to review your sales!' :
                    lang === 'es' ? '¡Buen trabajo hoy! ¡No olvides revisar tus ventas!' :
                    'Bon travail aujourd\'hui ! N\'oubliez pas de revoir vos ventes !');
        } else {
            body = this.getRandomMessage('sales_reminder') ||
                   (lang === 'en' ? 'No sales recorded today. Ready to make some sales tomorrow?' :
                    lang === 'es' ? 'No se registraron ventas hoy. ¿Listo para vender mañana?' :
                    'Aucune vente enregistrée aujourd\'hui. Prêt à vendre demain ?');
        }
        
        await this.sendNotification('check_in', title, body, { type: 'evening' });
    },
    
    // Send low stock alert
    async sendLowStockAlert() {
        const lowStockCount = await this.getLowStockCount();
        if (lowStockCount === 0) return;
        
        const lang = this.getUserLanguage();
        const title = lang === 'en' ? '⚠️ Low Stock Alert' :
                     lang === 'es' ? '⚠️ Alerta de Stock Bajo' :
                     '⚠️ Alerte de Stock Faible';
        
        const body = this.getRandomMessage('stock_alert', { count: lowStockCount }) ||
                    `${lowStockCount} item${lowStockCount > 1 ? 's are' : ' is'} running low. Restock soon!`;
        
        await this.sendNotification('stock_alert', title, body, { type: 'stock' });
    },
    
    // Send motivational message
    async sendMotivationalMessage() {
        const body = this.getRandomMessage('motivational');
        if (!body) return;
        
        const lang = this.getUserLanguage();
        const title = lang === 'en' ? '✨ Daily Motivation' :
                     lang === 'es' ? '✨ Motivación Diaria' :
                     '✨ Motivation Quotidienne';
        
        await this.sendNotification('motivational', title, body, { type: 'motivation' });
    },
    
    // Send business tip
    async sendBusinessTip() {
        const body = this.getRandomMessage('business_tip');
        if (!body) return;
        
        const lang = this.getUserLanguage();
        const title = lang === 'en' ? '💡 Business Tip' :
                     lang === 'es' ? '💡 Consejo de Negocio' :
                     '💡 Conseil Commercial';
        
        await this.sendNotification('tip', title, body, { type: 'tip' });
    },
    
    // Schedule all notifications
    scheduleNotifications() {
        // Clear any existing intervals
        if (window._engagementIntervals) {
            window._engagementIntervals.forEach(clearInterval);
        }
        window._engagementIntervals = [];
        
        // Check if user has granted permission
        if (Notification.permission !== 'granted') return;
        
        // 1. Morning check-in (8-9 AM)
        const scheduleMorning = () => {
            const now = new Date();
            const morningTime = new Date();
            morningTime.setHours(8, 30, 0, 0);
            
            if (now > morningTime) {
                morningTime.setDate(morningTime.getDate() + 1);
            }
            
            const timeUntilMorning = morningTime - now;
            setTimeout(() => {
                this.sendMorningCheckIn();
                setInterval(() => this.sendMorningCheckIn(), 24 * 60 * 60 * 1000);
            }, timeUntilMorning);
        };
        
        // 2. Evening check-in (7-8 PM)
        const scheduleEvening = () => {
            const now = new Date();
            const eveningTime = new Date();
            eveningTime.setHours(19, 30, 0, 0);
            
            if (now > eveningTime) {
                eveningTime.setDate(eveningTime.getDate() + 1);
            }
            
            const timeUntilEvening = eveningTime - now;
            setTimeout(() => {
                this.sendEveningCheckIn();
                setInterval(() => this.sendEveningCheckIn(), 24 * 60 * 60 * 1000);
            }, timeUntilEvening);
        };
        
        // 3. Weekly motivational message (Mondays)
        const scheduleMotivational = () => {
            const now = new Date();
            const nextMonday = new Date();
            const daysUntilMonday = (8 - nextMonday.getDay()) % 7 || 7;
            nextMonday.setDate(nextMonday.getDate() + daysUntilMonday);
            nextMonday.setHours(10, 0, 0, 0);
            
            const timeUntilMonday = nextMonday - now;
            setTimeout(() => {
                this.sendMotivationalMessage();
                setInterval(() => this.sendMotivationalMessage(), 7 * 24 * 60 * 60 * 1000);
            }, timeUntilMonday);
        };
        
        // 4. Weekly business tip (Wednesdays)
        const scheduleTip = () => {
            const now = new Date();
            const nextWednesday = new Date();
            const daysUntilWednesday = (4 - nextWednesday.getDay() + 7) % 7 || 7;
            nextWednesday.setDate(nextWednesday.getDate() + daysUntilWednesday);
            nextWednesday.setHours(11, 0, 0, 0);
            
            const timeUntilWednesday = nextWednesday - now;
            setTimeout(() => {
                this.sendBusinessTip();
                setInterval(() => this.sendBusinessTip(), 7 * 24 * 60 * 60 * 1000);
            }, timeUntilWednesday);
        };
        
        // 5. Check for low stock daily
        const scheduleLowStockCheck = () => {
            setInterval(async () => {
                await this.sendLowStockAlert();
            }, 24 * 60 * 60 * 1000);
        };
        
        // 6. Check for inactivity (no sales for 2+ days)
        const scheduleInactivityCheck = () => {
            setInterval(async () => {
                const inactiveDays = this.getInactiveDays();
                if (inactiveDays >= 2) {
                    const lang = this.getUserLanguage();
                    const title = lang === 'en' ? '👋 We Miss You!' :
                                 lang === 'es' ? '👋 ¡Te Extrañamos!' :
                                 '👋 Tu Nous Manques !';
                    const body = lang === 'en' ? `It's been ${inactiveDays} days since your last visit. Come back to manage your stock!` :
                                lang === 'es' ? `Han pasado ${inactiveDays} días desde tu última visita. ¡Vuelve a gestionar tu stock!` :
                                `Cela fait ${inactiveDays} jours depuis votre dernière visite. Revenez gérer votre stock !`;
                    
                    await this.sendNotification('check_in', title, body, { type: 'reminder' });
                }
            }, 24 * 60 * 60 * 1000);
        };
        
        // Start all schedulers
        scheduleMorning();
        scheduleEvening();
        scheduleMotivational();
        scheduleTip();
        scheduleLowStockCheck();
        scheduleInactivityCheck();
        
        console.log('📅 Engagement notifications scheduled!');
    },
    
    // Update last activity timestamp
    updateActivity() {
        localStorage.setItem('lastAppActivity', Date.now().toString());
    },
    
    // Initialize engagement system
    async init() {
        console.log('🚀 Initializing Engagement Builder v' + this.version);
        
        // Track page views for activity
        this.updateActivity();
        
        // Listen for user interactions
        const events = ['click', 'touchstart', 'keydown', 'scroll'];
        events.forEach(event => {
            document.addEventListener(event, () => this.updateActivity());
        });
        
        // Request notification permission if not granted
        if (Notification.permission === 'default') {
            // Wait for user interaction before asking
            const askPermission = async () => {
                const permission = await Notification.requestPermission();
                if (permission === 'granted') {
                    console.log('📢 Notification permission granted!');
                    this.scheduleNotifications();
                }
                // Remove listener after asking
                events.forEach(event => {
                    document.removeEventListener(event, askPermission);
                });
            };
            
            // Ask on first interaction
            events.forEach(event => {
                document.addEventListener(event, askPermission, { once: true });
            });
        } else if (Notification.permission === 'granted') {
            this.scheduleNotifications();
        }
        
        // Add a floating engagement button
        this.addEngagementButton();
    },
    
    // Add floating engagement button
    addEngagementButton() {
        if (document.getElementById('engagementFloatingBtn')) return;
        
        const btn = document.createElement('div');
        btn.id = 'engagementFloatingBtn';
        btn.innerHTML = '💡';
        btn.setAttribute('aria-label', 'Daily Tip');
        Object.assign(btn.style, {
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            width: '50px',
            height: '50px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '24px',
            cursor: 'pointer',
            boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
            zIndex: '9999',
            transition: 'transform 0.2s ease',
            border: 'none'
        });
        
        btn.onmouseenter = () => btn.style.transform = 'scale(1.1)';
        btn.onmouseleave = () => btn.style.transform = 'scale(1)';
        btn.onclick = async () => {
            const tip = this.getRandomMessage('business_tip');
            if (tip && typeof showMessageModal === 'function') {
                showMessageModal(tip, 4000);
            } else {
                alert(tip);
            }
        };
        
        document.body.appendChild(btn);
    }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    EngagementBuilder.init();
});

// Make available globally
window.EngagementBuilder = EngagementBuilder;