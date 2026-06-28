// ============================================
// AMISTY POS - NAVIGATION & UI
// ============================================

class Navigation {
    
    static init() {
        this.setupSidebar();
        this.setupMobileNav();
        this.setupMenuToggle();
        this.setupUserDisplay();
        this.setupLogout();
        this.updateDateTime();
        this.updateOnlineStatus();
        
        setInterval(() => this.updateDateTime(), 60000);
    }

    static setupSidebar() {
        const sidebar = document.getElementById('sidebar');
        if (!sidebar) return;
        
        const currentPage = window.location.pathname.split('/').pop() || 'dashboard.html';
        const items = sidebar.querySelectorAll('.sidebar-item');
        
        items.forEach(item => {
            const href = item.getAttribute('href');
            if (href && currentPage.includes(href.replace('.html', ''))) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
    }

    static setupMobileNav() {
        const mobileNav = document.getElementById('mobileNav');
        if (!mobileNav) return;
        
        const currentPage = window.location.pathname.split('/').pop();
        const items = mobileNav.querySelectorAll('.mobile-nav-item');
        
        items.forEach(item => {
            const href = item.getAttribute('href');
            if (href && currentPage && href.includes(currentPage.replace('.html', ''))) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
    }

    static setupMenuToggle() {
        const toggle = document.getElementById('menuToggle');
        const sidebar = document.getElementById('sidebar');
        
        if (!toggle || !sidebar) return;
        
        toggle.addEventListener('click', (e) => {
            e.stopPropagation();
            sidebar.classList.toggle('open');
        });
        
        document.addEventListener('click', (e) => {
            if (!sidebar.contains(e.target) && !toggle.contains(e.target)) {
                sidebar.classList.remove('open');
            }
        });
    }

    static setupUserDisplay() {
        const userInitial = document.getElementById('userInitial');
        const userName = document.getElementById('userName');
        const userEmail = document.getElementById('userEmail');
        
        if (userInitial) userInitial.textContent = 'A';
        if (userName) userName.textContent = 'Admin';
        
        // Get email from auth if available
        if (userEmail && auth.currentUser) {
            userEmail.textContent = auth.currentUser.email || 'admin@amisty.com';
        }
        
        // Dropdown toggle
        const avatar = document.getElementById('userAvatar');
        const dropdown = document.getElementById('userDropdown');
        
        if (avatar && dropdown) {
            avatar.addEventListener('click', (e) => {
                e.stopPropagation();
                dropdown.classList.toggle('show');
            });
            
            document.addEventListener('click', () => {
                dropdown.classList.remove('show');
            });
        }
    }

    static setupLogout() {
        const logoutBtn = document.getElementById('logoutButton');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                Auth.logout();
            });
        }
    }

    static updateDateTime() {
        const dateElement = document.getElementById('currentDate');
        if (dateElement) {
            const now = new Date();
            dateElement.textContent = now.toLocaleDateString('en-KE', {
                weekday: 'short',
                day: 'numeric',
                month: 'short',
                year: 'numeric'
            });
        }
    }

    static updateOnlineStatus() {
        const statusDot = document.getElementById('onlineStatus');
        const statusText = document.getElementById('onlineText');
        
        function update() {
            const online = navigator.onLine;
            if (statusDot) {
                statusDot.className = online ? 'status-online' : 'status-offline';
            }
            if (statusText) {
                statusText.textContent = online ? 'Online' : 'Offline';
            }
        }
        
        window.addEventListener('online', update);
        window.addEventListener('offline', update);
        update();
    }

    static initTabs() {
        const tabs = document.querySelectorAll('.tab');
        const panes = document.querySelectorAll('.tab-pane');
        
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const target = tab.getAttribute('data-tab');
                
                tabs.forEach(t => t.classList.remove('active'));
                panes.forEach(p => p.classList.remove('active'));
                
                tab.classList.add('active');
                const pane = document.getElementById('tab-' + target);
                if (pane) pane.classList.add('active');
            });
        });
    }
}
