// ============================================
// AMISTY POS - OFFLINE SUPPORT
// ============================================

class OfflineManager {
    static pendingTransactions = [];
    static isOnline = navigator.onLine;

    static init() {
        this.loadPendingTransactions();
        this.setupListeners();
        this.syncWhenOnline();
    }

    static setupListeners() {
        window.addEventListener('online', () => {
            this.isOnline = true;
            Utils.showToast('Back online! Syncing data...', 'success');
            this.syncPendingTransactions();
        });

        window.addEventListener('offline', () => {
            this.isOnline = false;
            Utils.showToast('You are offline. Transactions will be saved locally.', 'warning');
        });
    }

    static loadPendingTransactions() {
        const stored = localStorage.getItem('pendingTransactions');
        if (stored) {
            this.pendingTransactions = JSON.parse(stored);
        }
    }

    static savePendingTransactions() {
        localStorage.setItem('pendingTransactions', JSON.stringify(this.pendingTransactions));
    }

    static async queueTransaction(transactionData) {
        this.pendingTransactions.push({
            ...transactionData,
            queuedAt: new Date().toISOString()
        });
        this.savePendingTransactions();
        
        if (this.isOnline) {
            await this.syncPendingTransactions();
        }
    }

    static async syncPendingTransactions() {
        if (this.pendingTransactions.length === 0) return;

        const toSync = [...this.pendingTransactions];
        const failed = [];

        for (const transaction of toSync) {
            try {
                const result = await DataService.saveTransaction(transaction);
                if (result.success) {
                    // Update stock for each item
                    for (const item of transaction.items) {
                        await DataService.updateStock(item.productId, item.qty, 'sale');
                    }
                } else {
                    failed.push(transaction);
                }
            } catch (error) {
                failed.push(transaction);
            }
        }

        this.pendingTransactions = failed;
        this.savePendingTransactions();

        if (failed.length === 0 && toSync.length > 0) {
            Utils.showToast(`Synced ${toSync.length} offline transaction(s)`, 'success');
        }
    }

    // Cache products for offline use
    static async cacheProducts() {
        try {
            const products = await DataService.getProducts();
            localStorage.setItem('cachedProducts', JSON.stringify(products));
            return products;
        } catch (error) {
            const cached = localStorage.getItem('cachedProducts');
            return cached ? JSON.parse(cached) : [];
        }
    }

    static getCachedProducts() {
        const cached = localStorage.getItem('cachedProducts');
        return cached ? JSON.parse(cached) : [];
    }

    // Cache settings
    static async cacheSettings() {
        try {
            const settings = await DataService.getSettings();
            localStorage.setItem('cachedSettings', JSON.stringify(settings));
            return settings;
        } catch (error) {
            const cached = localStorage.getItem('cachedSettings');
            return cached ? JSON.parse(cached) : {};
        }
    }

    static getCachedSettings() {
        const cached = localStorage.getItem('cachedSettings');
        return cached ? JSON.parse(cached) : {};
    }
}