// ============================================
// AMISTY POS - UTILITY FUNCTIONS
// ============================================

class Utils {
    static formatCurrency(amount, currency = 'KES') {
        return new Intl.NumberFormat('en-KE', {
            style: 'currency',
            currency: currency,
            minimumFractionDigits: 2
        }).format(amount);
    }

    static formatNumber(num) {
        return new Intl.NumberFormat('en-KE').format(num);
    }

    static formatDate(date) {
        return new Intl.DateTimeFormat('en-KE', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        }).format(date);
    }

    static formatDateTime(date) {
        return new Intl.DateTimeFormat('en-KE', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }).format(date);
    }

    static formatTime(date) {
        return new Intl.DateTimeFormat('en-KE', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        }).format(date);
    }

    static generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    static calculateProfitMargin(buyingPrice, sellingPrice) {
        if (!buyingPrice || !sellingPrice || buyingPrice === 0) return 0;
        return ((sellingPrice - buyingPrice) / sellingPrice * 100).toFixed(2);
    }

    static calculateProfit(buyingPrice, sellingPrice, quantity) {
        return (sellingPrice - buyingPrice) * quantity;
    }

    static showToast(message, type = 'info') {
        const container = document.getElementById('toastContainer');
        if (!container) return;
        
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        container.appendChild(toast);
        
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(100%)';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    static showModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) modal.style.display = 'flex';
    }

    static hideModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) modal.style.display = 'none';
    }

    static confirmAction(message) {
        return new Promise((resolve) => {
            const result = window.confirm(message);
            resolve(result);
        });
    }

    static debounce(func, delay) {
        let timeout;
        return function(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), delay);
        };
    }

    static getTodayRange() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        return { start: today, end: tomorrow };
    }

    static getDateRange(period) {
        const now = new Date();
        const start = new Date();
        
        switch(period) {
            case 'today':
                start.setHours(0, 0, 0, 0);
                break;
            case 'yesterday':
                start.setDate(start.getDate() - 1);
                start.setHours(0, 0, 0, 0);
                now.setDate(now.getDate() - 1);
                now.setHours(23, 59, 59, 999);
                return { start, end: now };
            case 'week':
                start.setDate(start.getDate() - start.getDay());
                start.setHours(0, 0, 0, 0);
                break;
            case 'month':
                start.setDate(1);
                start.setHours(0, 0, 0, 0);
                break;
            case 'lastMonth':
                start.setMonth(start.getMonth() - 1);
                start.setDate(1);
                start.setHours(0, 0, 0, 0);
                now.setDate(0);
                now.setHours(23, 59, 59, 999);
                return { start, end: now };
            default:
                start.setHours(0, 0, 0, 0);
        }
        return { start, end: now };
    }

    static calculateStockDisplay(product) {
        if (!product.unitType) return '0';
        
        switch(product.unitType) {
            case 'ngunia-kg':
                const totalKg = product.stockInBaseUnit || 0;
                const kgPerNgunia = product.conversionRate || 1;
                const ngunias = Math.floor(totalKg / kgPerNgunia);
                const remainingKg = totalKg % kgPerNgunia;
                if (ngunias > 0 && remainingKg > 0) {
                    return `${ngunias} ngunia + ${remainingKg.toFixed(1)}kg`;
                } else if (ngunias > 0) {
                    return `${ngunias} ngunia (${totalKg.toFixed(1)}kg)`;
                }
                return `${remainingKg.toFixed(1)}kg`;
                
            case 'packet-items':
                const totalItems = product.stockInBaseUnit || 0;
                const itemsPerPacket = product.conversionRate || 1;
                const packets = Math.floor(totalItems / itemsPerPacket);
                const remainingItems = totalItems % itemsPerPacket;
                if (packets > 0 && remainingItems > 0) {
                    return `${packets} packet + ${remainingItems} items`;
                } else if (packets > 0) {
                    return `${packets} packet (${totalItems} items)`;
                }
                return `${remainingItems} items`;
                
            default:
                return `${product.stockInBaseUnit || 0} ${product.unitName || 'units'}`;
        }
    }
}