// ============================================
// AMISTY POS - DATA OPERATIONS
// ============================================

class DataService {
    
    // ============ PRODUCTS ============
    static async getProducts() {
        try {
            const snapshot = await productsCollection.orderBy('name').get();
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (error) {
            console.error('Error fetching products:', error);
            return [];
        }
    }

    static async getProduct(productId) {
        try {
            const doc = await productsCollection.doc(productId).get();
            return doc.exists ? { id: doc.id, ...doc.data() } : null;
        } catch (error) {
            return null;
        }
    }

    static async addProduct(productData) {
        try {
            const docRef = await productsCollection.add({
                ...productData,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            return { success: true, id: docRef.id };
        } catch (error) {
            return { success: false, message: error.message };
        }
    }

    static async updateProduct(productId, productData) {
        try {
            await productsCollection.doc(productId).update({
                ...productData,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            return { success: true };
        } catch (error) {
            return { success: false, message: error.message };
        }
    }

    static async deleteProduct(productId) {
        try {
            await productsCollection.doc(productId).delete();
            return { success: true };
        } catch (error) {
            return { success: false, message: error.message };
        }
    }

    static async updateStock(productId, quantity, type) {
        try {
            const product = await this.getProduct(productId);
            if (!product) return { success: false };
            
            let newStock = product.stockInBaseUnit || 0;
            if (type === 'add') {
                newStock += quantity;
            } else {
                newStock -= quantity;
            }
            if (newStock < 0) newStock = 0;
            
            await productsCollection.doc(productId).update({
                stockInBaseUnit: newStock,
                lastSoldDate: type === 'sale' ? firebase.firestore.FieldValue.serverTimestamp() : product.lastSoldDate,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            return { success: true, newStock };
        } catch (error) {
            return { success: false, message: error.message };
        }
    }

    static async getLowStockProducts() {
        try {
            const products = await this.getProducts();
            return products.filter(p => {
                const threshold = p.lowStockThreshold || 10;
                return p.stockInBaseUnit > 0 && p.stockInBaseUnit <= threshold;
            });
        } catch (error) {
            return [];
        }
    }

    static async getDeadStock(days) {
        try {
            const cutoff = new Date();
            cutoff.setDate(cutoff.getDate() - (days || 60));
            const products = await this.getProducts();
            return products.filter(p => {
                if (p.stockInBaseUnit <= 0) return false;
                if (!p.lastSoldDate) return true;
                return p.lastSoldDate.toDate() < cutoff;
            });
        } catch (error) {
            return [];
        }
    }

    // ============ TRANSACTIONS ============
    static async saveTransaction(transactionData) {
        try {
            const docRef = await transactionsCollection.add({
                ...transactionData,
                dateTime: firebase.firestore.FieldValue.serverTimestamp(),
                sellerId: auth.currentUser ? auth.currentUser.uid : 'unknown',
                sellerName: 'Admin'
            });
            return { success: true, id: docRef.id };
        } catch (error) {
            return { success: false, message: error.message };
        }
    }

    static async getTransactions(filters, page, limit) {
        try {
            let query = transactionsCollection.orderBy('dateTime', 'desc');
            
            if (filters && filters.dateFrom) {
                query = query.where('dateTime', '>=', filters.dateFrom);
            }
            if (filters && filters.dateTo) {
                query = query.where('dateTime', '<=', filters.dateTo);
            }
            
            const snapshot = await query.get();
            
            let transactions = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    ...data,
                    dateTime: data.dateTime ? data.dateTime.toDate() : new Date()
                };
            });
            
            // Client-side filters
            if (filters) {
                if (filters.paymentMethod && filters.paymentMethod !== 'all') {
                    transactions = transactions.filter(t => t.paymentMethod === filters.paymentMethod);
                }
                if (filters.category && filters.category !== 'all') {
                    transactions = transactions.filter(t => 
                        t.items && t.items.some(item => item.category === filters.category)
                    );
                }
            }
            
            const total = transactions.length;
            const pageNum = page || 1;
            const pageLimit = limit || 20;
            const start = (pageNum - 1) * pageLimit;
            const paginated = transactions.slice(start, start + pageLimit);
            
            return { transactions: paginated, total };
        } catch (error) {
            console.error('Error fetching transactions:', error);
            return { transactions: [], total: 0 };
        }
    }

    static async getTransactionStats(dateFrom, dateTo) {
        try {
            let query = transactionsCollection;
            if (dateFrom) query = query.where('dateTime', '>=', dateFrom);
            if (dateTo) query = query.where('dateTime', '<=', dateTo);
            
            const snapshot = await query.get();
            const transactions = snapshot.docs.map(doc => doc.data());
            
            const stats = {
                totalSales: 0,
                totalTransactions: transactions.length,
                totalProfit: 0,
                totalDiscount: 0,
                cashSales: 0,
                mobileSales: 0
            };
            
            transactions.forEach(t => {
                stats.totalSales += t.total || 0;
                stats.totalProfit += t.profitTotal || 0;
                stats.totalDiscount += t.discount || 0;
                if (t.paymentMethod === 'cash') stats.cashSales += t.total || 0;
                if (t.paymentMethod === 'mobile') stats.mobileSales += t.total || 0;
            });
            
            return stats;
        } catch (error) {
            return { totalSales: 0, totalTransactions: 0, totalProfit: 0, totalDiscount: 0, cashSales: 0, mobileSales: 0 };
        }
    }

    // ============ CATEGORIES ============
    static async getCategories() {
        try {
            const snapshot = await categoriesCollection.orderBy('name').get();
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (error) {
            return [];
        }
    }

    static async addCategory(name) {
        try {
            const docRef = await categoriesCollection.add({
                name,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            return { success: true, id: docRef.id };
        } catch (error) {
            return { success: false, message: error.message };
        }
    }

    // ============ SETTINGS ============
    static async getSettings() {
        try {
            const doc = await settingsCollection.doc('shop').get();
            if (doc.exists) {
                return doc.data();
            }
            // Create defaults
            const defaults = {
                shopName: 'My Shop',
                address: '',
                phone: '',
                logoUrl: '',
                receiptFooter: 'Asante kwa kununua kwetu! Karibu tena!',
                receiptPrefix: 'AMI-',
                currency: 'KES',
                soundEnabled: true,
                lowStockSoundEnabled: true,
                showLogoOnReceipt: true,
                showShopInfoOnReceipt: true,
                quickSaleProductIds: []
            };
            await settingsCollection.doc('shop').set(defaults);
            return defaults;
        } catch (error) {
            console.error('Settings error:', error);
            return { shopName: 'My Shop', receiptPrefix: 'AMI-', currency: 'KES' };
        }
    }

    static async updateSettings(data) {
        try {
            await settingsCollection.doc('shop').update(data);
            return { success: true };
        } catch (error) {
            // If doc doesn't exist, create it
            try {
                await settingsCollection.doc('shop').set(data);
                return { success: true };
            } catch (e) {
                return { success: false, message: e.message };
            }
        }
    }

    // ============ USERS ============
    static async getUsers() {
        try {
            const snapshot = await usersCollection.orderBy('createdAt', 'desc').get();
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (error) {
            return [];
        }
    }

    // ============ LOGO (Base64) ============
    static async uploadLogo(file) {
        try {
            return new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = async (e) => {
                    const base64 = e.target.result;
                    await this.updateSettings({ logoUrl: base64 });
                    resolve({ success: true, url: base64 });
                };
                reader.readAsDataURL(file);
            });
        } catch (error) {
            return { success: false, message: error.message };
        }
    }

    static async deleteLogo() {
        try {
            await this.updateSettings({ logoUrl: '' });
            return { success: true };
        } catch (error) {
            return { success: false };
        }
    }
}
