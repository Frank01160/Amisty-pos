// ============================================
// AMISTY POS - LOGIN PAGE
// ============================================

(function() {
    // Prevent double initialization
    if (window.loginInitialized) return;
    window.loginInitialized = true;

    // Create floating particles
    function createParticles() {
        const container = document.getElementById('particlesContainer');
        if (!container) return;
        for (let i = 0; i < 40; i++) {
            const particle = document.createElement('div');
            particle.className = 'particle';
            particle.style.left = Math.random() * 100 + '%';
            particle.style.animationDelay = Math.random() * 8 + 's';
            particle.style.animationDuration = (Math.random() * 6 + 4) + 's';
            particle.style.width = (Math.random() * 3 + 1) + 'px';
            particle.style.height = particle.style.width;
            particle.style.opacity = Math.random() * 0.5 + 0.3;
            container.appendChild(particle);
        }
    }

    // Toast function
    function showToast(message, type) {
        const container = document.getElementById('toastContainer');
        if (!container) return;
        const toast = document.createElement('div');
        toast.className = 'toast ' + (type || 'info');
        toast.textContent = message;
        container.appendChild(toast);
        setTimeout(function() {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(100%)';
            setTimeout(function() { toast.remove(); }, 300);
        }, 3000);
    }

    // Wait for everything to load
    window.addEventListener('DOMContentLoaded', function() {
        createParticles();

        // Check if already logged in
        auth.onAuthStateChanged(function(user) {
            if (user) {
                // Already logged in, go to dashboard
                window.location.replace('dashboard.html');
            }
        });

        // Get elements
        var loginForm = document.getElementById('loginForm');
        var emailInput = document.getElementById('email');
        var passwordInput = document.getElementById('password');
        var loginButton = document.getElementById('loginButton');
        var errorMessage = document.getElementById('errorMessage');
        var passwordToggle = document.getElementById('passwordToggle');

        if (!loginForm) return;

        // Password toggle
        passwordToggle.addEventListener('click', function() {
            var type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);
            if (type === 'password') {
                passwordToggle.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
            } else {
                passwordToggle.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>';
            }
        });

        // Show error
        function showError(message) {
            errorMessage.style.display = 'flex';
            errorMessage.querySelector('.error-text').textContent = message;
            errorMessage.style.animation = 'none';
            errorMessage.offsetHeight;
            errorMessage.style.animation = 'shake 0.5s ease';
        }

        // Hide error
        function hideError() {
            errorMessage.style.display = 'none';
        }

        // Loading state
        function setLoading(loading) {
            var btnContent = loginButton.querySelector('.btn-content');
            var btnLoader = loginButton.querySelector('.btn-loader');
            if (loading) {
                btnContent.style.display = 'none';
                btnLoader.style.display = 'flex';
                loginButton.disabled = true;
            } else {
                btnContent.style.display = 'flex';
                btnLoader.style.display = 'none';
                loginButton.disabled = false;
            }
        }

        // Login submit
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            var email = emailInput.value.trim();
            var password = passwordInput.value;

            if (!email || !password) {
                showError('Please fill in all fields');
                return;
            }

            setLoading(true);
            hideError();

            var defaultEmail = 'admin@amisty.com';
            var defaultPassword = 'admin123';

            // Try login
            auth.signInWithEmailAndPassword(email, password)
                .then(function() {
                    showToast('Login successful!', 'success');
                    setTimeout(function() {
                        window.location.replace('dashboard.html');
                    }, 300);
                })
                .catch(function(error) {
                    // If default credentials and user not found, create account
                    if (email === defaultEmail && password === defaultPassword && error.code === 'auth/user-not-found') {
                        auth.createUserWithEmailAndPassword(email, password)
                            .then(function(cred) {
                                // Create user doc and settings
                                return Promise.all([
                                    usersCollection.doc(cred.user.uid).set({
                                        name: 'Admin',
                                        email: email,
                                        role: 'manager',
                                        createdAt: firebase.firestore.FieldValue.serverTimestamp()
                                    }),
                                    settingsCollection.doc('shop').set({
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
                                    })
                                ]);
                            })
                            .then(function() {
                                showToast('Account created! Welcome!', 'success');
                                setTimeout(function() {
                                    window.location.replace('dashboard.html');
                                }, 500);
                            })
                            .catch(function(err) {
                                setLoading(false);
                                showError(err.message);
                            });
                    } else {
                        setLoading(false);
                        var msg = 'Login failed';
                        if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
                            msg = 'Invalid email or password';
                        } else if (error.code === 'auth/too-many-requests') {
                            msg = 'Too many attempts. Try later.';
                        } else {
                            msg = error.message;
                        }
                        showError(msg);
                    }
                });
        });

        // Enter key to submit
        passwordInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                loginForm.dispatchEvent(new Event('submit'));
            }
        });
    });
})();
