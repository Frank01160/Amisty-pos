// ============================================
// AMISTY POS - LOGIN PAGE LOGIC
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    // Create particles
    createParticles();
    
    // Init auth (but DON'T redirect - we're on login page)
    Auth.init();
    
    // If already logged in, Auth.init will redirect to dashboard
    // If not logged in, stay here
    
    // DOM Elements
    const loginForm = document.getElementById('loginForm');
    // ... rest stays the same
    // DOM Elements
    const loginForm = document.getElementById('loginForm');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const loginButton = document.getElementById('loginButton');
    const errorMessage = document.getElementById('errorMessage');
    const passwordToggle = document.getElementById('passwordToggle');
    
    // Password toggle
    passwordToggle.addEventListener('click', () => {
        const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordInput.setAttribute('type', type);
        passwordToggle.innerHTML = type === 'password' 
            ? '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>'
            : '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>';
    });
    
    // Login form
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = emailInput.value.trim();
        const password = passwordInput.value;
        
        if (!email || !password) {
            showError('Please fill in all fields');
            return;
        }
        
        setLoading(true);
        hideError();
        
        const result = await Auth.login(email, password);
        
        if (result.success) {
            showToast('Login successful!', 'success');
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 500);
        } else {
            showError(result.message);
            setLoading(false);
        }
    });
    
    function showError(message) {
        errorMessage.style.display = 'flex';
        errorMessage.querySelector('.error-text').textContent = message;
        errorMessage.style.animation = 'none';
        errorMessage.offsetHeight;
        errorMessage.style.animation = 'shake 0.5s ease';
    }
    
    function hideError() {
        errorMessage.style.display = 'none';
    }
    
    function setLoading(loading) {
        const btnContent = loginButton.querySelector('.btn-content');
        const btnLoader = loginButton.querySelector('.btn-loader');
        
        btnContent.style.display = loading ? 'none' : 'flex';
        btnLoader.style.display = loading ? 'flex' : 'none';
        loginButton.disabled = loading;
    }
    
    function showToast(message, type) {
        const container = document.getElementById('toastContainer');
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
    
    function createParticles() {
        const container = document.getElementById('particlesContainer');
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
});
