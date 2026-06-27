// ============================================
// AMISTY POS - SOUND ALERTS
// ============================================

class SoundManager {
    static audioContext = null;
    static enabled = true;

    static init() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            console.warn('Web Audio API not supported');
        }
        
        this.loadSettings();
    }

    static async loadSettings() {
        const settings = await DataService.getSettings();
        this.enabled = settings.soundEnabled !== false;
    }

    static playBeep(frequency = 800, duration = 0.15, type = 'sine') {
        if (!this.enabled || !this.audioContext) return;

        try {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            oscillator.frequency.value = frequency;
            oscillator.type = type;
            gainNode.gain.value = 0.3;
            
            oscillator.start();
            gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + duration);
            oscillator.stop(this.audioContext.currentTime + duration);
        } catch (e) {
            // Silently fail
        }
    }

    static saleComplete() {
        this.playBeep(1000, 0.1);
        setTimeout(() => this.playBeep(1200, 0.1), 100);
        setTimeout(() => this.playBeep(1500, 0.15), 200);
    }

    static lowStockAlert() {
        this.playBeep(400, 0.2, 'square');
        setTimeout(() => this.playBeep(400, 0.2, 'square'), 300);
        setTimeout(() => this.playBeep(400, 0.4, 'square'), 600);
    }

    static error() {
        this.playBeep(200, 0.3, 'sawtooth');
    }

    static click() {
        this.playBeep(600, 0.05);
    }
}