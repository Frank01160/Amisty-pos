// ============================================
// AMISTY POS - SIMPLE LOGIN PAGE
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    // Initialize
    Auth.init();
    Animations.init();
    
    // DOM Elements
    const loginForm = document.getElementById('loginForm');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const loginButton = document.getElementById('loginButton');
    const errorMessage = document.getElementById('errorMessage');
    const passwordToggle = document.getElementById('passwordToggle');
    
    // Hide setup section permanently
    const setupSection = document.getElementById('setupSection');
    if (setupSection) setupSection.remove();
    
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
        errorMessage.style.display = 'none';
        
        const result = await Auth.login(email, password);
        
        if (result.success) {
            window.location.href = 'dashboard.html';
        } else {
            showError(result.message);
            setLoading(false);
        }
    });
    
    function showError(message) {
        errorMessage.style.display = 'flex';
        errorMessage.querySelector('.error-text').textContent = message;
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
});
