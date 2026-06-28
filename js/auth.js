// ============================================
// AMISTY POS - SIMPLE AUTHENTICATION
// ============================================

// Default admin credentials (change after first login)
const DEFAULT_EMAIL = "admin@amisty.com";
const DEFAULT_PASSWORD = "admin123";

class Auth {
    static currentUser = null;
    static userRole = 'manager';
    static logoutTimer = null;

    static init() {
        auth.onAuthStateChanged(async (user) => {
            if (user) {
                this.currentUser = user;
                this.userRole = 'manager';
                this.startAutoLogout();
                
                // Redirect if on login page
                const currentPage = window.location.pathname.split('/').pop();
                if (currentPage === 'index.html' || currentPage === '' || currentPage === '/') {
                    window.location.href = 'dashboard.html';
                }
            } else {
                this.currentUser = null;
                this.userRole = null;
                const currentPage = window.location.pathname.split('/').pop();
                if (currentPage !== 'index.html' && currentPage !== '' && currentPage !== '/') {
                    window.location.href = 'index.html';
                }
            }
        });
    }

    static async login(email, password) {
        try {
            // Check if this is first login with default credentials
            if (email === DEFAULT_EMAIL && password === DEFAULT_PASSWORD) {
                // Try to sign in
                try {
                    await auth.signInWithEmailAndPassword(email, password);
                } catch (e) {
                    // If user doesn't exist, create default admin
                    if (e.code === 'auth/user-not-found') {
                        await auth.createUserWithEmailAndPassword(email, password);
                        await usersCollection.doc(auth.currentUser.uid).set({
                            name: 'Admin',
                            email: email,
                            role: 'manager',
                            createdAt: firebase.firestore.FieldValue.serverTimestamp()
                        });
                        await settingsCollection.doc('shop').set({
                            shopName: 'My Shop',
                            address: '',
                            phone: '',
                            logoUrl: '',
                            receiptFooter: 'Asante kwa kununua kwetu! Karibu tena!',
                            receiptPrefix: 'AMI-',
                            currency: 'KES',
                            soundEnabled: true,
                            quickSaleProductIds: [],
                            createdAt: firebase.firestore.FieldValue.serverTimestamp()
                        });
                    } else {
                        throw e;
                    }
                }
            } else {
                // Normal login
                await auth.signInWithEmailAndPassword(email, password);
            }
            
            return { success: true };
        } catch (error) {
            let message = 'Login failed';
            switch (error.code) {
                case 'auth/user-not-found':
                    message = 'Invalid email or password';
                    break;
                case 'auth/wrong-password':
                    message = 'Invalid email or password';
                    break;
                case 'auth/invalid-email':
                    message = 'Invalid email address';
                    break;
                case 'auth/too-many-requests':
                    message = 'Too many attempts. Try again later.';
                    break;
                default:
                    message = error.message;
            }
            return { success: false, message };
        }
    }

    static async logout() {
        this.clearLogoutTimer();
        await auth.signOut();
        window.location.href = 'index.html';
    }

    static async changePassword(newPassword) {
        try {
            const user = auth.currentUser;
            if (user) {
                await user.updatePassword(newPassword);
                return { success: true };
            }
            return { success: false, message: 'Not logged in' };
        } catch (error) {
            return { success: false, message: error.message };
        }
    }

    static async changeEmail(newEmail) {
        try {
            const user = auth.currentUser;
            if (user) {
                await user.updateEmail(newEmail);
                // Update in Firestore
                await usersCollection.doc(user.uid).update({ email: newEmail });
                return { success: true };
            }
            return { success: false, message: 'Not logged in' };
        } catch (error) {
            return { success: false, message: error.message };
        }
    }

    static startAutoLogout() {
        this.clearLogoutTimer();
        this.logoutTimer = setTimeout(() => {
            const extend = confirm('Session expiring. Stay logged in?');
            if (extend) {
                this.startAutoLogout();
            } else {
                this.logout();
            }
        }, 55 * 60 * 1000); // 55 minutes
    }

    static clearLogoutTimer() {
        if (this.logoutTimer) {
            clearTimeout(this.logoutTimer);
            this.logoutTimer = null;
        }
    }

    static isManager() {
        return true;
    }

    static protectPage() {
        if (!this.currentUser) {
            window.location.href = 'index.html';
            return false;
        }
        return true;
    }
}
