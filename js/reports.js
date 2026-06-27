// ============================================
// AMISTY POS - REPORTS PAGE
// ============================================

document.addEventListener('DOMContentLoaded', async () => {
    // Protect page - both roles
    if (!Auth.protectPage(['manager', 'seller'])) return;
    
    // Initialize
    Auth.init();
    Navigation.init();
    Animations.init();
    SoundManager.init();
    
    // Set default dates (today)
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('dateFrom').value = today;
    document.getElementById('dateTo').value = today;
    
    // Load categories for filter
    await loadReportCategories();
    
    // Setup listeners
    setupReportListeners();
    
    // Apply initial filters
    await applyFilters();
});

async function loadReportCategories() {
    const categories = await DataService.getCategories();
    const select = document.getElementById('reportCategoryFilter');
    select.innerHTML = '<option value="all">All Categories</option>';
    categories.forEach(cat => {
        select.innerHTML += `<option value="${cat.name}">${cat.name}</option>`;
    });
}

function setupReportListeners() {
    document.getElementById('applyFilters').addEventListener('click', applyFilters);
    document.getElementById('resetFilters').addEventListener('click', resetFilters);
    
    // Quick date buttons
    document.querySelectorAll('.date-quick').forEach(btn => {
        btn.addEventListener('click', () => {
            const period = btn.dataset.period;
            const range = Utils.getDateRange(period);
            
            document.getElementById('dateFrom').value = range.start.toISOString().split('T')[0];
            document.getElementById('dateTo').value = range.end.toISOString().split('T')[0];
            
            applyFilters();
        });
    });
    
    // Export buttons
    document.getElementById('exportExcelButton').addEventListener('click', exportToExcel);
    document.getElementById('exportPdfButton').addEventListener('click', exportToPDF);
    document.getElementById('printReportButton').addEventListener('click', printReport);
}

async function applyFilters() {
    const dateFrom = document.getElementById('dateFrom').value ? new Date(document.getElementById('dateFrom').value) : null;
    const dateTo = document.getElementById('dateTo').value ? new Date(document.getElementById('dateTo').value + 'T23:59:59') : null;
    const category = document.getElementById('reportCategoryFilter').value;
    const paymentMethod = document.getElementById('reportPaymentFilter').value;
    
    const filters = { dateFrom, dateTo, category, paymentMethod };
    
    // Get stats
    const stats = await DataService.getTransactionStats(dateFrom, dateTo);
    
    // Update summary cards
    document.getElementById('reportTotalSales').textContent = Utils.formatCurrency(stats.totalSales, 'KES');
    document.getElementById('reportTransactionCount').textContent = stats.totalTransactions;
    document.getElementById('reportTotalProfit').textContent = Utils.formatCurrency(stats.totalProfit, 'KES');
    document.getElementById('reportTotalDiscount').textContent = Utils.formatCurrency(stats.totalDiscount, 'KES');
    document.getElementById('reportCashSales').textContent = Utils.formatCurrency(stats.cashSales, 'KES');
    document.getElementById('reportMobileSales').textContent = Utils.formatCurrency(stats.mobileSales, 'KES');
    
    // Get transactions
    const result = await DataService.getTransactions(filters, 1, 100);
    
    // Store for export
    window.reportTransactions = result.transactions;
    window.reportFilters = filters;
    window.reportStats = stats;
    
    // Display transactions table
    displayTransactions(result.transactions);
    
    // Display category breakdown
    displayCategoryBreakdown(result.transactions);
    
    // Display top products
    displayTopProducts(result.transactions);
    
    // Update transaction count badge
    document.getElementById('transactionCountBadge').textContent = `${result.total} transactions`;
}

function displayTransactions(transactions) {
    const tbody = document.getElementById('transactionsTableBody');
    
    if (transactions.length === 0) {
        tbody.innerHTML = '<tr><td colspan="10" class="text-center text-muted">No transactions found for this period</td></tr>';
        return;
    }
    
    tbody.innerHTML = transactions.map(t => {
        const firstItem = t.items?.[0] || {};
        return t.items?.map(item => `
            <tr>
                <td>${Utils.formatDateTime(t.dateTime)}</td>
                <td>${t.receiptNumber || 'N/A'}</td>
                <td>${t.customerName || 'Walk-in'}</td>
                <td>${item.name} (${item.unit || 'unit'})</td>
                <td>${item.displayQty || item.qty}</td>
                <td>${Utils.formatCurrency(item.unitPrice, 'KES')}</td>
                <td>${Utils.formatCurrency(item.lineTotal, 'KES')}</td>
                <td>${Utils.formatCurrency(t.discount || 0, 'KES')}</td>
                <td><span class="badge ${t.paymentMethod === 'cash' ? 'badge-success' : 'badge-info'}">${t.paymentMethod || 'N/A'}</span></td>
                <td>${t.sellerName || 'N/A'}</td>
            </tr>
        `).join('');
    }).join('');
}

function displayCategoryBreakdown(transactions) {
    const tbody = document.getElementById('categorySalesTable');
    
    const categoryData = {};
    let totalRevenue = 0;
    
    transactions.forEach(t => {
        t.items?.forEach(item => {
            const cat = item.category || 'Uncategorized';
            if (!categoryData[cat]) {
                categoryData[cat] = { items: 0, revenue: 0, profit: 0 };
            }
            categoryData[cat].items += item.qty || 0;
            categoryData[cat].revenue += item.lineTotal || 0;
            categoryData[cat].profit += (item.lineTotal - item.costTotal) || 0;
            totalRevenue += item.lineTotal || 0;
        });
    });
    
    if (Object.keys(categoryData).length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No data available</td></tr>';
        return;
    }
    
    tbody.innerHTML = Object.entries(categoryData)
        .sort((a, b) => b[1].revenue - a[1].revenue)
        .map(([cat, data]) => `
            <tr>
                <td><strong>${cat}</strong></td>
                <td>${Utils.formatNumber(data.items)}</td>
                <td>${Utils.formatCurrency(data.revenue, 'KES')}</td>
                <td>${Utils.formatCurrency(data.profit, 'KES')}</td>
                <td>${totalRevenue > 0 ? ((data.revenue / totalRevenue) * 100).toFixed(1) + '%' : '0%'}</td>
            </tr>
        `).join('');
}

function displayTopProducts(transactions) {
    const tbody = document.getElementById('topProductsReportTable');
    
    const productData = {};
    
    transactions.forEach(t => {
        t.items?.forEach(item => {
            if (!productData[item.name]) {
                productData[item.name] = { 
                    name: item.name, 
                    category: item.category,
                    quantity: 0, 
                    revenue: 0, 
                    profit: 0 
                };
            }
            productData[item.name].quantity += item.qty || 0;
            productData[item.name].revenue += item.lineTotal || 0;
            productData[item.name].profit += (item.lineTotal - item.costTotal) || 0;
        });
    });
    
    const sorted = Object.values(productData)
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10);
    
    if (sorted.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">No data available</td></tr>';
        return;
    }
    
    tbody.innerHTML = sorted.map((p, i) => `
        <tr>
            <td>${i + 1}</td>
            <td>${p.name}</td>
            <td>${p.category || 'N/A'}</td>
            <td>${Utils.formatNumber(p.quantity)}</td>
            <td>${Utils.formatCurrency(p.revenue, 'KES')}</td>
            <td>${Utils.formatCurrency(p.profit, 'KES')}</td>
        </tr>
    `).join('');
}

function resetFilters() {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('dateFrom').value = today;
    document.getElementById('dateTo').value = today;
    document.getElementById('reportCategoryFilter').value = 'all';
    document.getElementById('reportPaymentFilter').value = 'all';
    applyFilters();
}

// ============ EXPORT FUNCTIONS ============

function exportToExcel() {
    if (!window.reportTransactions || window.reportTransactions.length === 0) {
        Utils.showToast('No data to export', 'warning');
        return;
    }
    ReportsExporter.exportToExcel(window.reportTransactions, window.reportStats, window.reportFilters);
}

function exportToPDF() {
    if (!window.reportTransactions || window.reportTransactions.length === 0) {
        Utils.showToast('No data to export', 'warning');
        return;
    }
    const settings = OfflineManager.getCachedSettings();
    ReportsExporter.exportToPDF(window.reportTransactions, window.reportStats, window.reportFilters, settings);
}

function printReport() {
    if (!window.reportTransactions || window.reportTransactions.length === 0) {
        Utils.showToast('No data to print', 'warning');
        return;
    }
    ReportsExporter.printReport(window.reportTransactions, window.reportStats, window.reportFilters);
}