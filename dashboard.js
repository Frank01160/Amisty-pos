// ============================================
// AMISTY POS - DASHBOARD PAGE
// ============================================

document.addEventListener('DOMContentLoaded', async () => {
    // Protect page - manager only
    if (!Auth.protectPage(['manager'])) return;
    
    // Initialize
    Auth.init();
    Navigation.init();
    Animations.init();
    OfflineManager.init();
    SoundManager.init();
    
    // Load dashboard data
    await loadDashboardData();
    
    // Refresh every 60 seconds
    setInterval(loadDashboardData, 60000);
    
    // Animate cards on load
    setTimeout(() => Animations.animateCards(), 200);
});

async function loadDashboardData() {
    try {
        const { start, end } = Utils.getTodayRange();
        const settings = await DataService.getSettings();
        
        // Update shop name
        document.getElementById('welcomeName').textContent = Auth.userName || 'Manager';
        document.getElementById('sidebarShopName').textContent = settings.shopName || 'My Shop';
        
        // Get stats
        const stats = await DataService.getTransactionStats(start, end);
        const yesterdayStats = await DataService.getTransactionStats(
            new Date(start.getTime() - 86400000),
            new Date(end.getTime() - 86400000)
        );
        
        // Update stats cards
        updateStatCard('totalSales', stats.totalSales);
        updateStatCard('totalTransactions', stats.totalTransactions);
        updateStatCard('totalProfit', stats.totalProfit);
        updateStatCard('cashSales', stats.cashSales);
        updateStatCard('mobileSales', stats.mobileSales);
        
        // Calculate changes
        if (yesterdayStats.totalSales > 0) {
            const salesChange = ((stats.totalSales - yesterdayStats.totalSales) / yesterdayStats.totalSales * 100).toFixed(1);
            const changeEl = document.getElementById('salesChange');
            changeEl.textContent = `${salesChange >= 0 ? '↑' : '↓'} ${Math.abs(salesChange)}%`;
            changeEl.className = `stat-change ${salesChange >= 0 ? 'positive' : 'negative'}`;
        }
        
        // Cash/Mobile percentages
        if (stats.totalSales > 0) {
            document.getElementById('cashPercentage').textContent = 
                ((stats.cashSales / stats.totalSales) * 100).toFixed(0) + '%';
            document.getElementById('mobilePercentage').textContent = 
                ((stats.mobileSales / stats.totalSales) * 100).toFixed(0) + '%';
        }
        
        // Low stock count
        const lowStock = await DataService.getLowStockProducts();
        document.getElementById('lowStockCount').textContent = lowStock.length;
        
        // Top products
        await loadTopProducts(start, end);
        
        // Recent transactions
        await loadRecentTransactions();
        
        // Dead stock
        await loadDeadStock();
        
    } catch (error) {
        console.error('Error loading dashboard:', error);
    }
}

function updateStatCard(id, value) {
    const element = document.getElementById(id);
    if (element) {
        element.textContent = Utils.formatCurrency(value, 'KES');
    }
}

async function loadTopProducts(start, end) {
    const tbody = document.getElementById('topProductsTable');
    try {
        const result = await DataService.getTransactions({ dateFrom: start, dateTo: end }, 1, 100);
        
        // Aggregate products
        const productSales = {};
        result.transactions.forEach(t => {
            t.items?.forEach(item => {
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
        });
        
        const sorted = Object.values(productSales)
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 5);
        
        if (sorted.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No sales yet today</td></tr>';
            return;
        }
        
        tbody.innerHTML = sorted.map((p, i) => `
            <tr>
                <td>${i + 1}</td>
                <td>${p.name}</td>
                <td>${p.category}</td>
                <td>${Utils.formatNumber(p.quantity)}</td>
                <td>${Utils.formatCurrency(p.revenue, 'KES')}</td>
            </tr>
        `).join('');
        
    } catch (error) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center text-danger">Error loading data</td></tr>';
    }
}

async function loadRecentTransactions() {
    const tbody = document.getElementById('recentTransactions');
    try {
        const { start, end } = Utils.getTodayRange();
        const result = await DataService.getTransactions({ dateFrom: start, dateTo: end }, 1, 5);
        
        if (result.transactions.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No transactions yet today</td></tr>';
            return;
        }
        
        tbody.innerHTML = result.transactions.map(t => `
            <tr>
                <td>${t.receiptNumber || 'N/A'}</td>
                <td>${Utils.formatTime(t.dateTime)}</td>
                <td>${t.items?.length || 0} items</td>
                <td>${Utils.formatCurrency(t.total, 'KES')}</td>
                <td><span class="badge ${t.paymentMethod === 'cash' ? 'badge-success' : 'badge-info'}">${t.paymentMethod}</span></td>
            </tr>
        `).join('');
        
    } catch (error) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center text-danger">Error loading transactions</td></tr>';
    }
}

async function loadDeadStock() {
    const tbody = document.getElementById('deadStockTable');
    try {
        const deadStock = await DataService.getDeadStock(60);
        
        if (deadStock.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No dead stock - Great job! 🎉</td></tr>';
            return;
        }
        
        tbody.innerHTML = deadStock.slice(0, 5).map(p => {
            const lastSold = p.lastSoldDate ? Utils.formatDate(p.lastSoldDate.toDate()) : 'Never';
            const daysInactive = p.lastSoldDate ? 
                Math.floor((new Date() - p.lastSoldDate.toDate()) / 86400000) : '∞';
            return `
                <tr>
                    <td>${p.name}</td>
                    <td>${p.category}</td>
                    <td>${Utils.calculateStockDisplay(p)}</td>
                    <td>${lastSold}</td>
                    <td><span class="badge badge-warning">${daysInactive} days</span></td>
                </tr>
            `;
        }).join('');
        
    } catch (error) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center text-danger">Error loading dead stock</td></tr>';
    }
}
