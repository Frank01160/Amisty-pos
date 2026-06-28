// ============================================
// AMISTY POS - SIMPLE AUTH (NO LOOPS)
// ============================================

const DEFAULT_EMAIL = "admin@amisty.com";
const DEFAULT_PASSWORD = "admin123";

class Auth {
    static currentUser = null;
    static logoutTimer = null;
    static initDone = false;

    static init() {
        if (this.initDone) return;
        this.initDone = true;
        
        auth.onAuthStateChanged((user) => {
            this.currentUser = user;
            const currentPage = window.location.pathname.split('/').pop();
            const isLoginPage = (currentPage === 'index.html' || currentPage === '' || currentPage === '/');
            
            if (user && isLoginPage) {
                // User logged in on login page → go to dashboard
                window.location.replace('dashboard.html');
            } else if (!user && !isLoginPage) {
                // User not logged in on other page → go to login
                window.location.replace('index.html');
            }
        });
    }

    static async login(email, password) {
        try {
            if (email === DEFAULT_EMAIL && password === DEFAULT_PASSWORD) {
                try {
                    await auth.signInWithEmailAndPassword(email, password);
                } catch (e) {
                    if (e.code === 'auth/user-not-found') {
                        const cred = await auth.createUserWithEmailAndPassword(email, password);
                        await usersCollection.doc(cred.user.uid).set({
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
                            showLogoOnReceipt: true,
                            showShopInfoOnReceipt: true,
                            quickSaleProductIds: []
                        });
                    } else {
                        throw e;
                    }
                }
            } else {
                await auth.signInWithEmailAndPassword(email, password);
            }
            return { success: true };
        } catch (error) {
            let msg = 'Login failed';
            if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
                msg = 'Invalid email or password';
            } else if (error.code === 'auth/too-many-requests') {
                msg = 'Too many attempts. Try again later.';
            }
            return { success: false, message: msg };
        }
    }

    static async logout() {
        if (this.logoutTimer) clearTimeout(this.logoutTimer);
        await auth.signOut();
        window.location.replace('index.html');
    }

    static async changePassword(newPassword) {
        try {
            if (this.currentUser) {
                await this.currentUser.updatePassword(newPassword);
                return { success: true };
            }
            return { success: false, message: 'Not logged in' };
        } catch (error) {
            return { success: false, message: error.message };
        }
    }

    static async changeEmail(newEmail) {
        try {
            if (this.currentUser) {
                await this.currentUser.updateEmail(newEmail);
                await usersCollection.doc(this.currentUser.uid).update({ email: newEmail });
                return { success: true };
            }
            return { success: false, message: 'Not logged in' };
        } catch (error) {
            return { success: false, message: error.message };
        }
    }

    static protectPage() {
        if (!this.currentUser) {
            window.location.replace('index.html');
            return false;
        }
        return true;
    }
}
