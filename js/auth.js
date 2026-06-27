// ============================================
// AMISTY POS - AUTHENTICATION
// ============================================

class Auth {
    static currentUser = null;
    static userRole = null;
    static logoutTimer = null;

    // Check auth state
    static init() {
        auth.onAuthStateChanged(async (user) => {
            if (user) {
                this.currentUser = user;
                await this.loadUserData(user.uid);
                this.startAutoLogout();
                
                // Redirect if on login page
                if (window.location.pathname.includes('index.html') || 
                    window.location.pathname === '/' ||
                    window.location.pathname === '') {
                    this.redirectBasedOnRole();
                }
            } else {
                this.currentUser = null;
                this.userRole = null;
                // Redirect to login if not already there
                if (!window.location.pathname.includes('index.html')) {
                    window.location.href = 'index.html';
                }
            }
        });
    }

    // Load user data from Firestore
    static async loadUserData(uid) {
        try {
            const doc = await usersCollection.doc(uid).get();
            if (doc.exists) {
                const userData = doc.data();
                this.userRole = userData.role;
                this.userName = userData.name;
                this.userEmail = userData.email;
                
                // Update last login
                await usersCollection.doc(uid).update({
                    lastLogin: firebase.firestore.FieldValue.serverTimestamp()
                });
            }
        } catch (error) {
            console.error('Error loading user data:', error);
        }
    }

    // Login
    static async login(email, password) {
        try {
            const userCredential = await auth.signInWithEmailAndPassword(email, password);
            return { success: true, user: userCredential.user };
        } catch (error) {
            let message = 'Login failed';
            switch (error.code) {
                case 'auth/user-not-found':
                    message = 'No account found with this email';
                    break;
                case 'auth/wrong-password':
                    message = 'Incorrect password';
                    break;
                case 'auth/invalid-email':
                    message = 'Invalid email address';
                    break;
                default:
                    message = error.message;
            }
            return { success: false, message };
        }
    }

    // Logout
    static async logout() {
        try {
            this.clearLogoutTimer();
            await auth.signOut();
            window.location.href = 'index.html';
        } catch (error) {
            console.error('Logout error:', error);
        }
    }

    // Register manager (setup wizard)
    static async registerManager(name, email, password, shopData) {
        try {
            const userCredential = await auth.createUserWithEmailAndPassword(email, password);
            const uid = userCredential.user.uid;
            
            // Create user document
            await usersCollection.doc(uid).set({
                name: name,
                email: email,
                role: 'manager',
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                lastLogin: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            // Create shop settings
            await settingsCollection.doc('shop').set({
                shopName: shopData.shopName,
                address: shopData.address || '',
                phone: shopData.phone || '',
                logoUrl: '',
                receiptFooter: shopData.footer || 'Asante kwa kununua kwetu! Karibu tena!',
                receiptPrefix: shopData.prefix || 'AMI-',
                currency: shopData.currency || 'KES',
                soundEnabled: true,
                lowStockSoundEnabled: true,
                quickSaleProductIds: [],
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            return { success: true };
        } catch (error) {
            let message = 'Registration failed';
            if (error.code === 'auth/email-already-in-use') {
                message = 'Email already registered';
            }
            return { success: false, message };
        }
    }

    // Add seller account
    static async addSeller(name, email, password) {
        try {
            const userCredential = await auth.createUserWithEmailAndPassword(email, password);
            const uid = userCredential.user.uid;
            
            await usersCollection.doc(uid).set({
                name: name,
                email: email,
                role: 'seller',
                createdBy: this.currentUser.uid,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                lastLogin: null
            });
            
            // Sign back in as manager
            await auth.signInWithEmailAndPassword(this.currentUser.email, '');
            
            return { success: true };
        } catch (error) {
            return { success: false, message: error.message };
        }
    }

    // Delete user
    static async deleteUser(uid) {
        try {
            await usersCollection.doc(uid).delete();
            return { success: true };
        } catch (error) {
            return { success: false, message: error.message };
        }
    }

    // Auto logout
    static startAutoLogout() {
        this.clearLogoutTimer();
        
        const timeout = this.userRole === 'manager' ? 15 * 60 * 1000 : 60 * 60 * 1000;
        
        this.logoutTimer = setTimeout(() => {
            this.promptExtendSession();
        }, timeout - 60000); // Warn 1 minute before
    }

    static promptExtendSession() {
        const extend = confirm('Your session is about to expire. Click OK to stay logged in.');
        if (extend) {
            this.startAutoLogout();
        } else {
            this.logout();
        }
    }

    static clearLogoutTimer() {
        if (this.logoutTimer) {
            clearTimeout(this.logoutTimer);
            this.logoutTimer = null;
        }
    }

    // Check if user is manager
    static isManager() {
        return this.userRole === 'manager';
    }

    // Check if user is seller
    static isSeller() {
        return this.userRole === 'seller';
    }

    // Redirect based on role
    static redirectBasedOnRole() {
        const currentPage = window.location.pathname.split('/').pop();
        
        if (this.isSeller()) {
            // Sellers can only access POS and Reports
            const allowedPages = ['pos.html', 'reports.html'];
            if (!allowedPages.includes(currentPage) && currentPage !== '') {
                window.location.href = 'pos.html';
            }
        }
    }

    // Protect page - call on each page load
    static protectPage(allowedRoles = ['manager', 'seller']) {
        if (!this.currentUser) {
            window.location.href = 'index.html';
            return false;
        }
        
        if (!allowedRoles.includes(this.userRole)) {
            window.location.href = this.isManager() ? 'dashboard.html' : 'pos.html';
            return false;
        }
        
        return true;
    }
}