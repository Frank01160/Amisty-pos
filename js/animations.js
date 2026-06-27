// ============================================
// AMISTY POS - ANIMATIONS CONTROLLER
// ============================================

class Animations {
    static init() {
        this.createParticles();
        this.initRippleEffect();
    }

    // Create floating particles
    static createParticles() {
        const container = document.getElementById('particlesContainer');
        if (!container) return;

        const particleCount = 30;
        
        for (let i = 0; i < particleCount; i++) {
            const particle = document.createElement('div');
            particle.className = 'particle';
            particle.style.left = Math.random() * 100 + '%';
            particle.style.animationDelay = Math.random() * 8 + 's';
            particle.style.animationDuration = (Math.random() * 8 + 4) + 's';
            particle.style.width = (Math.random() * 3 + 2) + 'px';
            particle.style.height = particle.style.width;
            container.appendChild(particle);
        }
    }

    // Ripple effect on buttons
    static initRippleEffect() {
        document.addEventListener('click', function(e) {
            const target = e.target.closest('.ripple');
            if (!target) return;

            const ripple = document.createElement('span');
            ripple.className = 'ripple-effect';
            
            const rect = target.getBoundingClientRect();
            const size = Math.max(rect.width, rect.height);
            ripple.style.width = ripple.style.height = size + 'px';
            ripple.style.left = (e.clientX - rect.left - size / 2) + 'px';
            ripple.style.top = (e.clientY - rect.top - size / 2) + 'px';
            
            target.appendChild(ripple);
            setTimeout(() => ripple.remove(), 600);
        });
    }

    // Animate number counter
    static animateCounter(element, target, duration = 1500) {
        const start = 0;
        const startTime = performance.now();
        
        function update(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const value = start + (target - start) * easeOutExpo(progress);
            
            element.textContent = Utils.formatNumber(Math.round(value));
            
            if (progress < 1) {
                requestAnimationFrame(update);
            } else {
                element.textContent = Utils.formatNumber(target);
            }
        }
        
        function easeOutExpo(x) {
            return x === 1 ? 1 : 1 - Math.pow(2, -10 * x);
        }
        
        requestAnimationFrame(update);
    }

    // Card entrance animation
    static animateCards() {
        const cards = document.querySelectorAll('.card-lift, .stat-card');
        cards.forEach((card, index) => {
            card.style.opacity = '0';
            card.style.transform = 'translateY(30px)';
            card.style.transition = 'all 0.5s ease';
            card.style.transitionDelay = (index * 0.1) + 's';
            
            setTimeout(() => {
                card.style.opacity = '1';
                card.style.transform = 'translateY(0)';
            }, 100);
        });
    }

    // Page transition
    static pageTransition() {
        document.body.style.opacity = '0';
        document.body.style.transition = 'opacity 0.3s ease';
        setTimeout(() => {
            document.body.style.opacity = '1';
        }, 50);
    }

    // Loading spinner
    static showLoading(elementId) {
        const element = document.getElementById(elementId);
        if (element) {
            element.innerHTML = '<div class="spinner"></div>';
        }
    }

    // Shimmer effect for loading
    static addShimmer(element) {
        element.classList.add('shimmer');
    }

    static removeShimmer(element) {
        element.classList.remove('shimmer');
    }
}