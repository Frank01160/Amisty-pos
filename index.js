// ============================================
// AMISTY POS - LOGIN PAGE
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    // Initialize auth
    Auth.init();
    
    // Initialize animations
    Animations.init();
    
    // DOM Elements
    const loginForm = document.getElementById('loginForm');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const loginButton = document.getElementById('loginButton');
    const errorMessage = document.getElementById('errorMessage');
    const setupSection = document.getElementById('setupSection');
    const setupButton = document.getElementById('setupButton');
    const setupModal = document.getElementById('setupModal');
    const setupForm = document.getElementById('setupForm');
    const passwordToggle = document.getElementById('passwordToggle');
    
    // Check if setup is needed (no users exist)
    checkIfSetupNeeded();
    
    // Password visibility toggle
    passwordToggle.addEventListener('click', () => {
        const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordInput.setAttribute('type', type);
        passwordToggle.textContent = type === 'password' ? '👁️' : '🙈';
    });
    
    // Login form submit
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = emailInput.value.trim();
        const password = passwordInput.value;
        
        if (!email || !password) {
            showError('Please fill in all fields');
            return;
        }
        
        // Show loading
        setLoading(true);
        
        const result = await Auth.login(email, password);
        
        if (result.success) {
            SoundManager.init();
            SoundManager.playBeep(800, 0.1);
            Utils.showToast('Login successful!', 'success');
            
            setTimeout(() => {
                if (Auth.isManager()) {
                    window.location.href = 'dashboard.html';
                } else {
                    window.location.href = 'pos.html';
                }
            }, 500);
        } else {
            showError(result.message);
            setLoading(false);
            SoundManager.playBeep(200, 0.3, 'sawtooth');
        }
    });
    
    // Setup button
    setupButton.addEventListener('click', () => {
        Utils.showModal('setupModal');
        setupStep = 1;
        showStep(1);
    });
    
    // Close setup modal
    document.getElementById('closeSetupModal').addEventListener('click', () => {
        Utils.hideModal('setupModal');
    });
    
    // Setup wizard steps
    let setupStep = 1;
    const totalSteps = 3;
    
    document.getElementById('nextStep').addEventListener('click', () => {
        if (validateStep(setupStep)) {
            setupStep++;
            showStep(setupStep);
        }
    });
    
    document.getElementById('prevStep').addEventListener('click', () => {
        setupStep--;
        showStep(setupStep);
    });
    
    // Submit setup
    setupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        if (!validateStep(3)) return;
        
        const shopData = {
            shopName: document.getElementById('setupShopName').value,
            address: document.getElementById('setupAddress').value,
            phone: document.getElementById('setupPhone').value,
            footer: document.getElementById('setupFooter').value,
            prefix: document.getElementById('setupPrefix').value,
            currency: document.getElementById('setupCurrency').value
        };
        
        const name = shopData.shopName;
        const email = document.getElementById('setupEmail').value;
        const password = document.getElementById('setupPassword').value;
        
        document.getElementById('submitSetup').disabled = true;
        
        const result = await Auth.registerManager(name, email, password, shopData);
        
        if (result.success) {
            Utils.showToast('Shop setup complete! Redirecting...', 'success');
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 1000);
        } else {
            Utils.showToast(result.message, 'error');
            document.getElementById('submitSetup').disabled = false;
        }
    });
    
    function showStep(step) {
        document.querySelectorAll('.setup-step').forEach(el => el.classList.remove('active'));
        document.querySelector(`.setup-step[data-step="${step}"]`).classList.add('active');
        
        // Update step dots
        document.querySelectorAll('.step-dot').forEach(dot => {
            dot.classList.remove('active');
            if (parseInt(dot.getAttribute('data-step')) === step) {
                dot.classList.add('active');
            }
        });
        
        // Show/hide buttons
        document.getElementById('prevStep').disabled = step === 1;
        document.getElementById('nextStep').style.display = step === totalSteps ? 'none' : 'inline-block';
        document.getElementById('submitSetup').style.display = step === totalSteps ? 'inline-block' : 'none';
    }
    
    function validateStep(step) {
        if (step === 1) {
            const shopName = document.getElementById('setupShopName').value.trim();
            if (!shopName) {
                Utils.showToast('Shop name is required', 'error');
                return false;
            }
        }
        if (step === 2) {
            const email = document.getElementById('setupEmail').value.trim();
            const password = document.getElementById('setupPassword').value;
            const confirm = document.getElementById('setupConfirmPassword').value;
            
            if (!email || !password) {
                Utils.showToast('Email and password are required', 'error');
                return false;
            }
            if (password.length < 6) {
                Utils.showToast('Password must be at least 6 characters', 'error');
                return false;
            }
            if (password !== confirm) {
                Utils.showToast('Passwords do not match', 'error');
                return false;
            }
        }
        return true;
    }
    
    function showError(message) {
        errorMessage.style.display = 'flex';
        errorMessage.querySelector('.error-text').textContent = message;
        
        // Shake animation
        errorMessage.style.animation = 'none';
        errorMessage.offsetHeight;
        errorMessage.style.animation = 'shake 0.5s ease';
    }
    
    function setLoading(loading) {
        const btnText = loginButton.querySelector('.btn-text');
        const btnLoader = loginButton.querySelector('.btn-loader');
        
        if (loading) {
            btnText.style.display = 'none';
            btnLoader.style.display = 'inline-block';
            loginButton.disabled = true;
        } else {
            btnText.style.display = 'inline';
            btnLoader.style.display = 'none';
            loginButton.disabled = false;
        }
    }
    
    async function checkIfSetupNeeded() {
        try {
            const snapshot = await usersCollection.limit(1).get();
            if (snapshot.empty) {
                setupSection.style.display = 'block';
            }
        } catch (error) {
            setupSection.style.display = 'block';
        }
    }
});

// Shake animation
const style = document.createElement('style');
style.textContent = `
    @keyframes shake {
        0%, 100% { transform: translateX(0); }
        25% { transform: translateX(-10px); }
        50% { transform: translateX(10px); }
        75% { transform: translateX(-10px); }
    }
`;
document.head.appendChild(style);
