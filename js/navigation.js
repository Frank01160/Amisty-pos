// ============================================
// AMISTY POS - NAVIGATION & UI CONTROLLER
// ============================================

class Navigation {
    static init() {
        this.initSidebar();
        this.initMobileNav();
        this.initMenuToggle();
        this.initUserMenu();
        this.updateOnlineStatus();
        this.updateDateTime();
        this.setupLogout();
        
        setInterval(() => this.updateDateTime(), 60000);
    }

    static initSidebar() {
        const sidebar = document.getElementById('sidebar');
        if (!sidebar) return;
        
        const currentPage = window.location.pathname.split('/').pop() || 'dashboard.html';
        const items = sidebar.querySelectorAll('.sidebar-item');
        
        items.forEach(item => {
            const page = item.getAttribute('data-page');
            if (currentPage.includes(page) || (!page && currentPage === '')) {
                item.classList.add('active');
            }
            item.classList.remove('active');
            if (currentPage.includes(page + '.html')) {
                item.classList.add('active');
            }
        });
    }

    static initMobileNav() {
        const mobileNav = document.getElementById('mobileNav');
        if (!mobileNav) return;
        
        const currentPage = window.location.pathname.split('/').pop();
        const items = mobileNav.querySelectorAll('.mobile-nav-item');
        
        items.forEach(item => {
            const href = item.getAttribute('href');
            if (currentPage && href.includes(currentPage)) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
    }

    static initMenuToggle() {
        const toggle = document.getElementById('menuToggle');
        const sidebar = document.getElementById('sidebar');
        
        if (toggle && sidebar) {
            toggle.addEventListener('click', () => {
                sidebar.classList.toggle('open');
            });
            
            // Close sidebar when clicking outside
            document.addEventListener('click', (e) => {
                if (!sidebar.contains(e.target) && !toggle.contains(e.target)) {
                    sidebar.classList.remove('open');
                }
            });
        }
    }

    static initUserMenu() {
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
        
        // Set user info
        const userInitial = document.getElementById('userInitial');
        const userName = document.getElementById('userName');
        const userEmail = document.getElementById('userEmail');
        
        if (userInitial) userInitial.textContent = (Auth.userName || 'U').charAt(0).toUpperCase();
        if (userName) userName.textContent = Auth.userName || 'User';
        if (userEmail) userEmail.textContent = Auth.userEmail || '';
    }

    static setupLogout() {
        const logoutBtn = document.getElementById('logoutButton');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => Auth.logout());
        }
    }

    static updateOnlineStatus() {
        const statusDot = document.getElementById('onlineStatus');
        const statusText = document.getElementById('onlineText');
        
        function updateStatus() {
            const online = navigator.onLine;
            if (statusDot) {
                statusDot.className = online ? 'status-online' : 'status-offline';
            }
            if (statusText) {
                statusText.textContent = online ? 'Online' : 'Offline';
            }
        }
        
        window.addEventListener('online', updateStatus);
        window.addEventListener('offline', updateStatus);
        updateStatus();
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

    // Tab switching
    static initTabs() {
        const tabs = document.querySelectorAll('.tab');
        const panes = document.querySelectorAll('.tab-pane');
        
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const target = tab.getAttribute('data-tab');
                
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                
                panes.forEach(pane => {
                    pane.classList.remove('active');
                    if (pane.id === `tab-${target}`) {
                        pane.classList.add('active');
                    }
                });
            });
        });
    }
}