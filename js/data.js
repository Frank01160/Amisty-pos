// ============================================
// AMISTY POS - DATA OPERATIONS (CRUD)
// ============================================

class DataService {
    // ============ PRODUCTS ============
    
    static async getProducts(filters = {}) {
        try {
            let query = productsCollection;
            
            if (filters.category && filters.category !== 'all') {
                query = query.where('category', '==', filters.category);
            }
            
            if (filters.status === 'low-stock') {
                query = query.where('stockInBaseUnit', '<=', firebase.firestore.FieldValue);
            }
            
            const snapshot = await query.orderBy('name').get();
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
            console.error('Error fetching product:', error);
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

    static async updateStock(productId, quantity, type = 'sale') {
        try {
            const product = await this.getProduct(productId);
            if (!product) return { success: false, message: 'Product not found' };
            
            let newStock = product.stockInBaseUnit - quantity;
            if (type === 'add') newStock = product.stockInBaseUnit + quantity;
            if (newStock < 0) newStock = 0;
            
            await productsCollection.doc(productId).update({
                stockInBaseUnit: newStock,
                lastSoldDate: type === 'sale' ? firebase.firestore.FieldValue.serverTimestamp() : product.lastSoldDate,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            // Log stock history
            await stockHistoryCollection.add({
                productId,
                productName: product.name,
                type,
                quantityChange: type === 'sale' ? -quantity : quantity,
                newStock,
                dateTime: firebase.firestore.FieldValue.serverTimestamp(),
                userId: auth.currentUser?.uid || 'system'
            });
            
            return { success: true, newStock };
        } catch (error) {
            return { success: false, message: error.message };
        }
    }

    static async getLowStockProducts() {
        try {
            const snapshot = await productsCollection.get();
            return snapshot.docs
                .map(doc => ({ id: doc.id, ...doc.data() }))
                .filter(p => p.stockInBaseUnit <= (p.lowStockThreshold || 10) && p.stockInBaseUnit > 0);
        } catch (error) {
            return [];
        }
    }

    static async getDeadStock(days = 60) {
        try {
            const cutoff = new Date();
            cutoff.setDate(cutoff.getDate() - days);
            
            const snapshot = await productsCollection
                .where('stockInBaseUnit', '>', 0)
                .get();
            
            return snapshot.docs
                .map(doc => ({ id: doc.id, ...doc.data() }))
                .filter(p => {
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
                sellerId: auth.currentUser?.uid || 'unknown',
                sellerName: Auth.userName || 'Unknown'
            });
            return { success: true, id: docRef.id };
        } catch (error) {
            return { success: false, message: error.message };
        }
    }

    static async getTransactions(filters = {}, page = 1, limit = 20) {
        try {
            let query = transactionsCollection.orderBy('dateTime', 'desc');
            
            if (filters.dateFrom) {
                query = query.where('dateTime', '>=', filters.dateFrom);
            }
            if (filters.dateTo) {
                query = query.where('dateTime', '<=', filters.dateTo);
            }
            if (filters.paymentMethod && filters.paymentMethod !== 'all') {
                query = query.where('paymentMethod', '==', filters.paymentMethod);
            }
            
            const snapshot = await query.limit(limit * page).get();
            
            let transactions = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                dateTime: doc.data().dateTime?.toDate() || new Date()
            }));
            
            // Filter by category if needed (client-side)
            if (filters.category && filters.category !== 'all') {
                transactions = transactions.filter(t => 
                    t.items?.some(item => item.category === filters.category)
                );
            }
            
            // Paginate
            const start = (page - 1) * limit;
            const paginated = transactions.slice(start, start + limit);
            
            return { transactions: paginated, total: transactions.length };
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
            console.error('Error fetching stats:', error);
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
            return doc.exists ? doc.data() : {};
        } catch (error) {
            return {};
        }
    }

    static async updateSettings(settingsData) {
        try {
            await settingsCollection.doc('shop').update({
                ...settingsData,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            return { success: true };
        } catch (error) {
            return { success: false, message: error.message };
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

    // ============ STORAGE (LOGO) ============
    
    static async uploadLogo(file) {
        try {
            // Delete old logo first
            const oldFiles = await logosStorageRef.listAll();
            const deletePromises = oldFiles.items.map(item => item.delete());
            await Promise.all(deletePromises);
            
            // Upload new logo
            const fileRef = logosStorageRef.child(`logo_${Date.now()}_${file.name}`);
            await fileRef.put(file);
            const url = await fileRef.getDownloadURL();
            
            // Update settings
            await this.updateSettings({ logoUrl: url });
            
            return { success: true, url };
        } catch (error) {
            return { success: false, message: error.message };
        }
    }

    static async deleteLogo() {
        try {
            const oldFiles = await logosStorageRef.listAll();
            const deletePromises = oldFiles.items.map(item => item.delete());
            await Promise.all(deletePromises);
            await this.updateSettings({ logoUrl: '' });
            return { success: true };
        } catch (error) {
            return { success: false, message: error.message };
        }
    }
}