// ============================================
// AMISTY POS - DASHBOARD PAGE
// ============================================

(function() {
    if (window.dashboardInitialized) return;
    window.dashboardInitialized = true;

    // Check auth first
    auth.onAuthStateChanged(function(user) {
        if (!user) {
            window.location.replace('index.html');
            return;
        }
        // User is logged in, init dashboard
        initDashboard(user);
    });

    function initDashboard(user) {
        // Set user info
        var userInitial = document.getElementById('userInitial');
        var userName = document.getElementById('userName');
        var userEmail = document.getElementById('userEmail');
        var welcomeName = document.getElementById('welcomeName');

        if (userInitial) userInitial.textContent = 'A';
        if (userName) userName.textContent = 'Admin';
        if (userEmail) userEmail.textContent = user.email;
        if (welcomeName) welcomeName.textContent = 'Admin';

        // Setup navigation
        setupNavigation();
        
        // Setup logout
        var logoutBtn = document.getElementById('logoutButton');
        if (logoutBtn) {
            logoutBtn.onclick = function() {
                auth.signOut().then(function() {
                    window.location.replace('index.html');
                });
            };
        }

        // User dropdown
        var avatar = document.getElementById('userAvatar');
        var dropdown = document.getElementById('userDropdown');
        if (avatar && dropdown) {
            avatar.onclick = function(e) {
                e.stopPropagation();
                dropdown.classList.toggle('show');
            };
            document.addEventListener('click', function() {
                dropdown.classList.remove('show');
            });
        }

        // Sidebar toggle
        var menuToggle = document.getElementById('menuToggle');
        var sidebar = document.getElementById('sidebar');
        if (menuToggle && sidebar) {
            menuToggle.onclick = function(e) {
                e.stopPropagation();
                sidebar.classList.toggle('open');
            };
            document.addEventListener('click', function(e) {
                if (!sidebar.contains(e.target) && !menuToggle.contains(e.target)) {
                    sidebar.classList.remove('open');
                }
            });
        }

        // Update date
        function updateDate() {
            var dateEl = document.getElementById('currentDate');
            if (dateEl) {
                var now = new Date();
                dateEl.textContent = now.toLocaleDateString('en-KE', {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric'
                });
            }
        }
        updateDate();
        setInterval(updateDate, 60000);

        // Online status
        var statusDot = document.getElementById('onlineStatus');
        var statusText = document.getElementById('onlineText');
        function updateOnline() {
            var online = navigator.onLine;
            if (statusDot) statusDot.className = online ? 'status-online' : 'status-offline';
            if (statusText) statusText.textContent = online ? 'Online' : 'Offline';
        }
        updateOnline();
        window.addEventListener('online', updateOnline);
        window.addEventListener('offline', updateOnline);

        // Load shop name
        settingsCollection.doc('shop').get().then(function(doc) {
            if (doc.exists) {
                var data = doc.data();
                var shopNameEl = document.getElementById('sidebarShopName');
                if (shopNameEl) shopNameEl.textContent = data.shopName || 'My Shop';
            }
        }).catch(function() {});

        // Load dashboard data
        loadDashboardStats();
        
        // Refresh every 60 seconds
        setInterval(loadDashboardStats, 60000);
    }

    function setupNavigation() {
        var currentPage = window.location.pathname.split('/').pop() || 'dashboard.html';
        
        // Sidebar
        var sidebarItems = document.querySelectorAll('.sidebar-item');
        sidebarItems.forEach(function(item) {
            var href = item.getAttribute('href');
            if (href && currentPage.includes(href.replace('.html', ''))) {
                item.classList.add('active');
            }
        });

        // Mobile nav
        var mobileItems = document.querySelectorAll('.mobile-nav-item');
        mobileItems.forEach(function(item) {
            var href = item.getAttribute('href');
            if (href && currentPage.includes(href.replace('.html', ''))) {
                item.classList.add('active');
            }
        });
    }

    function formatCurrency(amount) {
        return 'Ksh ' + Number(amount || 0).toLocaleString('en-KE', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }

    function formatNumber(num) {
        return Number(num || 0).toLocaleString('en-KE');
    }

    async function loadDashboardStats() {
        try {
            // Get today's range
            var today = new Date();
            today.setHours(0, 0, 0, 0);
            var tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);

            // Get all transactions
            var snapshot = await transactionsCollection
                .where('dateTime', '>=', today)
                .where('dateTime', '<', tomorrow)
                .get();

            var transactions = [];
            snapshot.forEach(function(doc) {
                transactions.push(doc.data());
            });

            // Calculate stats
            var totalSales = 0;
            var totalProfit = 0;
            var totalDiscount = 0;
            var cashSales = 0;
            var mobileSales = 0;

            transactions.forEach(function(t) {
                totalSales += t.total || 0;
                totalProfit += t.profitTotal || 0;
                totalDiscount += t.discount || 0;
                if (t.paymentMethod === 'cash') cashSales += t.total || 0;
                if (t.paymentMethod === 'mobile') mobileSales += t.total || 0;
            });

            // Update stat cards
            setStatValue('totalSales', formatCurrency(totalSales));
            setStatValue('totalTransactions', transactions.length);
            setStatValue('totalProfit', formatCurrency(totalProfit));
            setStatValue('cashSales', formatCurrency(cashSales));
            setStatValue('mobileSales', formatCurrency(mobileSales));

            // Percentages
            if (totalSales > 0) {
                var cashPct = document.getElementById('cashPercentage');
                var mobilePct = document.getElementById('mobilePercentage');
                if (cashPct) cashPct.textContent = Math.round((cashSales / totalSales) * 100) + '%';
                if (mobilePct) mobilePct.textContent = Math.round((mobileSales / totalSales) * 100) + '%';
            }

            // Low stock
            var productsSnap = await productsCollection.get();
            var lowCount = 0;
            productsSnap.forEach(function(doc) {
                var p = doc.data();
                var threshold = p.lowStockThreshold || 10;
                if (p.stockInBaseUnit > 0 && p.stockInBaseUnit <= threshold) {
                    lowCount++;
                }
            });
            setStatValue('lowStockCount', lowCount);

            // Recent transactions
            loadRecentTransactions(transactions);

            // Top products
            loadTopProducts(transactions);

        } catch (error) {
            console.error('Dashboard error:', error);
        }
    }

    function setStatValue(id, value) {
        var el = document.getElementById(id);
        if (el) el.textContent = value;
    }

    function loadRecentTransactions(transactions) {
        var tbody = document.getElementById('recentTransactions');
        if (!tbody) return;

        var recent = transactions.slice(-5).reverse();

        if (recent.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#6B7394;">No transactions today</td></tr>';
            return;
        }

        tbody.innerHTML = recent.map(function(t) {
            var time = t.dateTime ? new Date(t.dateTime.toDate()).toLocaleTimeString('en-KE', {hour:'2-digit',minute:'2-digit'}) : '';
            var items = t.items ? t.items.length : 0;
            var badge = t.paymentMethod === 'cash' ? 'badge-success' : 'badge-info';
            return '<tr>' +
                '<td>' + (t.receiptNumber || 'N/A') + '</td>' +
                '<td>' + time + '</td>' +
                '<td>' + items + ' items</td>' +
                '<td>' + formatCurrency(t.total) + '</td>' +
                '<td><span class="badge ' + badge + '">' + (t.paymentMethod || 'N/A') + '</span></td>' +
                '</tr>';
        }).join('');
    }

    function loadTopProducts(transactions) {
        var tbody = document.getElementById('topProductsTable');
        if (!tbody) return;

        // Aggregate products
        var productSales = {};
        transactions.forEach(function(t) {
            if (t.items) {
                t.items.forEach(function(item) {
                    if (!productSales[item.name]) {
                        productSales[item.name] = {
                            name: item.name,
                            category: item.category || 'Uncategorized',
                            quantity: 0,
                            revenue: 0
                        };
                    }
                    productSales[item.name].quantity += item.qty || 0;
                    productSales[item.name].revenue += item.lineTotal || 0;
                });
            }
        });

        var sorted = Object.values(productSales)
            .sort(function(a, b) { return b.revenue - a.revenue; })
            .slice(0, 5);

        if (sorted.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#6B7394;">No sales yet today</td></tr>';
            return;
        }

        tbody.innerHTML = sorted.map(function(p, i) {
            return '<tr>' +
                '<td>' + (i + 1) + '</td>' +
                '<td>' + p.name + '</td>' +
                '<td>' + p.category + '</td>' +
                '<td>' + formatNumber(p.quantity) + '</td>' +
                '<td>' + formatCurrency(p.revenue) + '</td>' +
                '</tr>';
        }).join('');
    }
})();
