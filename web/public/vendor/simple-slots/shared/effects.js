// filepath: c:\projects\copilot-agent\slot-game\themes\effects.js
/**
 * Advanced visual effects definitions for the slot machine
 * These effects can be enabled or disabled per theme
 */

// Base effect configuration with defaults that can be overridden
export const EffectDefaults = {
    enabled: false,       // Master switch for all effects
    intensity: 0.7,       // Overall intensity multiplier (0.0-1.0)
    framerate: 60,        // Target framerate for animations
    intensity: 0.9,
    reelEffects: {
        enabled: true,
        blurAmount: 5,
        lightTrails: false,
        spinningGlow: true,
        spinColor: '#FFD54F' // Gold coins
    },
    winEffects: {
        enabled: true,
        explosions: true,
        shockwave: true,
        flashingSymbols: true,
        spinEffect3d: {
            enabled: false,
            duration: 1000, // 1 second
            rotations: 2, // Number of rotations
            easing: 'easeInOutCubic', // Smooth easing
        },
        rotateEffect: {
            enabled: false,
            roations: 3, // Number of rotations
            direction: 'clockwise', // Rotate clockwise for pirate theme
            duration: 1000, // 1 second
            easing: 'easeInOutCubic', // Smooth easing
        },
        pulsingSymbols: true,
        celebrations: {
            confetti: {
                enabled: true,
            },
            fireworks: {
                enabled: false,       // Enable fireworks effect
            },
        },
    },
    symbolEffects: {
        neonGlow: {
            enabled: false,    // Enable neon glow around symbols
            color: '#00ffff', // Default color for glow
            size: 10,         // Glow size in pixels
            pulseSpeed: 1000, // Pulse cycle in milliseconds
            intensity: 0.8    // Specific effect intensity
        },
        electricEdges: {
            enabled: false,    // Enable electric effect on symbol edges
            color: '#ffffff', // Color of the electric effect
            arcs: 5,          // Number of electric arcs
            speed: 800,       // Speed of movement in ms
            intensity: 0.7    // Specific effect intensity
        },
    },
    reelMask: {
        enabled: true,             // Enable special effects for reel mask
        borderWidth: 5,            // Width of the border in pixels
        separatorWidth: 2,         // Width of separator lines
        glowEffect: {
            enabled: true,         // Enable glow around borders
            color: '#ffcc00',      // Base glow color
            intensity: 0.8,        // Glow intensity
            size: 10              // Glow size in pixels
        },
        pulseEffect: {
            enabled: true,         // Enable pulsing effect
            speed: 1500,           // Pulse cycle in milliseconds
            minOpacity: 0.6,       // Minimum opacity during pulse
            maxOpacity: 1.0        // Maximum opacity during pulse
        },
        colorTransition: {
            enabled: true,         // Enable color transition effect
            colors: ['#ffcc00', '#ff5500', '#ff00ff', '#00ffff', '#ffcc00'], // Colors to cycle through
            speed: 5000,           // Full color cycle duration in milliseconds
            mode: 'gradient'       // 'gradient' or 'solid'
        }
    },
    backgroundEffects: {
        enabled: false,               // Master switch for background
        particles: {
            enabled: true,           // Floating particles
            count: 50,               // Number of particles
            color: '#ffffff',        // Particle color
            size: { min: 2, max: 6 } // Size range
        },
        pulse: {
            enabled: true,           // Pulsing background
            color: '#0a0a2a',        // Base color
            speed: 2000,             // Pulse cycle in ms
            intensity: 0.3           // How strong the pulse is
        }
    },
    reelEffects: {
        enabled: false,           // Effects during reel spin
        blurAmount: 5,           // Motion blur intensity
        lightTrails: false,       // Light trails behind symbols
        spinningGlow: true,      // Glow during spinning
        spinColor: '#3498db'     // Color during spin
    },
    themeSpecific: {            // Theme-specific effect configurations
        // Can be extended by each theme
    }
};

// Common helper functions for visual effects
export const EffectsHelper = {
    imageCache: {},

    // Load image with caching
    async loadImage(src) {
        if (this.imageCache[src]) {
            if (this.imageCache[src] instanceof Promise) {
                // If loading is in progress, wait for it
                return this.imageCache[src];
            }
            // If already loaded (or failed), return the result
            return this.imageCache[src];
        }

        // Start loading
        const promise = new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                this.imageCache[src] = img; // Cache the loaded image object
                resolve(img);
            };
            img.onerror = (err) => {
                console.error(`Failed to load image: ${src}`, err);
                this.imageCache[src] = null; // Cache the failure
                resolve(null); // Resolve with null on error
            };
            img.src = src;
        });

        this.imageCache[src] = promise; // Cache the promise while loading
        return promise;
    },    // Convert hex color to RGB object
    hexToRgb(hex) {
        // Remove '#' if present
        hex = hex.replace(/^#/, '');

        // Parse hex values to RGB
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);

        return { r, g, b };
    },    // Helper function (add to EffectsHelper or place globally if needed)
    hexToHsl(hex) {
        // Remove '#' if present
        hex = hex.replace(/^#/, '');
        // Convert hex to RGB
        const r = parseInt(hex.substring(0, 2), 16) / 255;
        const g = parseInt(hex.substring(2, 4), 16) / 255;
        const b = parseInt(hex.substring(4, 6), 16) / 255;

        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        let h, s, l = (max + min) / 2;

        if (max === min) {
            h = s = 0; // achromatic
        } else {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            switch (max) {
                case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                case g: h = (b - r) / d + 2; break;
                case b: h = (r - g) / d + 4; break;
            }
            h /= 6;
        }

        return {
            h: Math.round(h * 360),
            s: Math.round(s * 100),
            l: Math.round(l * 100)
        };
    },    // Win Celebration effects
    winCelebrationParticles: [],
    fireworkRockets: [],
    fireworkParticles: [],
    winAnimationActive: false,
    fireworksActive: false,

    // Function to trigger win celebration
    triggerWinCelebration(ctx, canvas, amount, betAmount, options = {}) {
        // Check configuration to determine which celebrations to activate
        const config = options || {};
        const themeEffects = config.themeEffects || {};
        const winEffects = themeEffects.winEffects || {};

        // Get celebration settings
        const celebrationConfig = winEffects.celebration || {};
        const confettiEnabled = celebrationConfig.confetti?.enabled;
        const fireworksEnabled = celebrationConfig.fireworks?.enabled;
        console.log(confettiEnabled, fireworksEnabled);
        // Only proceed if at least one celebration type is enabled
        if (!confettiEnabled && !fireworksEnabled) return false;

        // Set global state for tracking
        this.winAnimationActive = true;

        // Duration for auto-stopping celebrations
        const duration = config.duration || 3000;

        // Trigger confetti if enabled
        if (confettiEnabled) {
            this.triggerConfettiCelebration(ctx, canvas, amount, betAmount, {
                ...config,
                confettiConfig: celebrationConfig.confetti || {},
                duration: duration
            });
        }

        // Trigger fireworks if enabled
        if (fireworksEnabled) {
            this.triggerFireworksCelebration(ctx, canvas, amount, betAmount, {
                ...config,
                fireworksConfig: celebrationConfig.fireworks || {},
                duration: duration
            });
        }

        // Auto-stop all celebrations after the specified duration
        setTimeout(() => {
            this.winAnimationActive = false;
        }, duration);

        return true;
    },

    // Confetti celebration implementation
    triggerConfettiCelebration(ctx, canvas, amount, betAmount, options = {}) {
        // Clear existing
        this.winCelebrationParticles = [];

        const confettiConfig = options.confettiConfig || {};

        // Configure particle count based on win amount and configuration
        const minParticles = confettiConfig.minParticles || 30;
        const maxParticles = confettiConfig.maxParticles || 150;
        const particleCount = Math.min(
            maxParticles,
            Math.max(minParticles, Math.floor(amount / (betAmount * 0.1)))
        );

        // Apply intensity setting
        const intensity = confettiConfig.intensity || 0.7;
        const actualParticleCount = Math.floor(particleCount * intensity);

        // Create particles
        for (let i = 0; i < actualParticleCount; i++) {
            this.winCelebrationParticles.push({
                x: Math.random() * canvas.width,
                y: -Math.random() * canvas.height * 0.3 - 20, // Start above screen
                size: Math.random() * 10 + 5, // Slightly larger confetti
                color: `hsl(${Math.random() * 360}, 90%, 65%)`, // Brighter colors
                speedX: (Math.random() - 0.5) * 8, // Horizontal spread
                speedY: Math.random() * 6 + 3, // Initial downward speed
                rotation: Math.random() * 360,
                rotSpeed: (Math.random() - 0.5) * 15, // Rotation speed
                opacity: 1,
                life: 1.0 // Lifetime factor (1 = full life)
            });
        }
    },

    // Fireworks celebration implementation
    triggerFireworksCelebration(ctx, canvas, amount, betAmount, options = {}) {
        // Clear existing
        this.fireworkRockets = [];
        this.fireworkParticles = [];
        this.fireworksActive = true;

        const fireworksConfig = options.fireworksConfig || {};

        // Configure rocket count based on win amount and configuration
        const minRockets = fireworksConfig.minRockets || 5;
        const maxRockets = fireworksConfig.maxRockets || 20;
        const rocketCount = Math.min(
            maxRockets,
            Math.max(minRockets, Math.floor(amount / (betAmount * 0.2)))
        );

        // Apply intensity setting
        const intensity = fireworksConfig.intensity || 0.8;
        const actualRocketCount = Math.floor(rocketCount * intensity);

        // Default colors if not specified
        const defaultColors = ['#ff0000', '#ffff00', '#00ff00', '#00ffff', '#0000ff', '#ff00ff'];
        const colors = fireworksConfig.colors || defaultColors;

        // Create initial rockets with staggered launch times
        for (let i = 0; i < actualRocketCount; i++) {
            const launchDelay = i * 300 + Math.random() * 100;

            setTimeout(() => {
                if (!this.fireworksActive) return; // Don't create if no longer active

                this.fireworkRockets.push({
                    x: canvas.width * (0.2 + Math.random() * 0.6), // Launch from middle 60% of screen
                    y: canvas.height + 10, // Start off screen at bottom
                    targetY: canvas.height * (0.2 + Math.random() * 0.5), // Target in upper half
                    speedY: -(10 + Math.random() * 8), // Upward speed
                    size: 3 + Math.random() * 2,
                    color: colors[Math.floor(Math.random() * colors.length)],
                    trailFrequency: 0.1, // How often to leave a trail particle (0-1)
                    lastTrail: 0,
                    exploded: false
                });
            }, launchDelay);
        }

        // Auto-stop rockets after duration
        setTimeout(() => {
            this.fireworksActive = false;
        }, options.duration || 6000);
    },

    // Draw the win celebration animation
    drawWinCelebration(ctx, canvas, deltaTime, timestamp) {
        // Check if any animations are active
        const confettiActive = this.winCelebrationParticles.length > 0;
        const fireworksActive = this.fireworksActive || this.fireworkRockets.length > 0 || this.fireworkParticles.length > 0;

        // If nothing is active, return false to indicate no more animations
        if (!this.winAnimationActive && !confettiActive && !fireworksActive) {
            return false;
        }

        // Draw confetti if present
        if (confettiActive) {
            this.drawConfetti(ctx, canvas, deltaTime);
        }

        // Draw fireworks if active
        if (fireworksActive) {
            this.drawFireworks(ctx, canvas, deltaTime, timestamp);
        }

        return true;
    },

    // Draw confetti animation
    drawConfetti(ctx, canvas, deltaTime) {
        const gravity = 250 * deltaTime; // Gravity constant
        let activeParticles = false; // Flag to check if any particles are still visible

        // Process each confetti particle
        for (let i = this.winCelebrationParticles.length - 1; i >= 0; i--) {
            const p = this.winCelebrationParticles[i];

            // Update position
            p.x += p.speedX * deltaTime;
            p.y += p.speedY * deltaTime;
            p.speedY += gravity; // Apply gravity
            p.rotation += p.rotSpeed * deltaTime;
            p.speedX *= 0.99; // Air resistance for horizontal movement

            // Fade out based on lifetime or position
            if (p.y > canvas.height + p.size) { // Check if fully off screen
                p.life -= deltaTime * 1.5; // Fade out faster once below screen
            } else {
                p.life -= deltaTime * 0.20; // Slower fade while visible
            }
            p.opacity = Math.max(0, p.life);

            // Remove dead particles
            if (p.opacity <= 0) {
                this.winCelebrationParticles.splice(i, 1);
                continue;
            }

            activeParticles = true; // Mark that there are still active particles

            // Draw particle
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(p.rotation * Math.PI / 180);
            ctx.fillStyle = p.color;
            ctx.globalAlpha = p.opacity;
            // Simple rectangle shape for confetti
            ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
            ctx.restore();
        }

        return activeParticles;
    },

    // Draw fireworks animation
    drawFireworks(ctx, canvas, deltaTime, timestamp) {
        // Process rockets first
        for (let i = this.fireworkRockets.length - 1; i >= 0; i--) {
            const rocket = this.fireworkRockets[i];

            // Move rocket upward
            rocket.y += rocket.speedY * deltaTime * 60;

            // Create trail particles
            rocket.lastTrail += deltaTime;
            if (rocket.lastTrail > rocket.trailFrequency) {
                rocket.lastTrail = 0;

                // Add a trail particle
                this.fireworkParticles.push({
                    x: rocket.x,
                    y: rocket.y,
                    size: rocket.size * 0.6,
                    color: rocket.color,
                    opacity: 0.7,
                    speedX: (Math.random() - 0.5) * 0.5,
                    speedY: Math.random() * 0.5 + 1, // Slight downward drift
                    life: 0.8 // Shorter life for trail particles
                });
            }

            // Check if rocket should explode
            if (rocket.y <= rocket.targetY && !rocket.exploded) {
                // Rocket has reached target height, create explosion
                rocket.exploded = true;

                // Create explosion particles
                const particleCount = 80 + Math.floor(Math.random() * 40);
                const explosionColor = rocket.color;

                for (let j = 0; j < particleCount; j++) {
                    // Calculate random direction and speed
                    const angle = Math.random() * Math.PI * 2;
                    const speed = 4 + Math.random() * 7;

                    this.fireworkParticles.push({
                        x: rocket.x,
                        y: rocket.y,
                        size: 1 + Math.random() * 2,
                        color: explosionColor,
                        speedX: Math.cos(angle) * speed,
                        speedY: Math.sin(angle) * speed,
                        opacity: 1,
                        life: 0.7 + Math.random() * 0.5,
                        gravity: 2 + Math.random() * 1
                    });
                }

                // Remove the exploded rocket
                this.fireworkRockets.splice(i, 1);
            } else if (rocket.exploded || rocket.y > canvas.height) {
                // Remove rockets that have exploded or gone off screen
                this.fireworkRockets.splice(i, 1);
            } else {
                // Draw the rocket
                ctx.fillStyle = rocket.color;
                ctx.globalAlpha = 1;
                ctx.beginPath();
                ctx.arc(rocket.x, rocket.y, rocket.size, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // Process explosion and trail particles
        const gravity = 30 * deltaTime;

        for (let i = this.fireworkParticles.length - 1; i >= 0; i--) {
            const p = this.fireworkParticles[i];

            // Update position
            p.x += p.speedX * deltaTime * 60;
            p.y += p.speedY * deltaTime * 60;

            // Apply gravity if specified
            if (p.gravity) {
                p.speedY += p.gravity * deltaTime;
            }

            // Reduce life/opacity
            p.life -= deltaTime * 0.5;
            p.opacity = Math.max(0, p.life);

            // Remove dead particles
            if (p.opacity <= 0) {
                this.fireworkParticles.splice(i, 1);
                continue;
            }

            // Draw particle with glow effect for better visibility
            ctx.save();

            // Add glow
            ctx.globalAlpha = p.opacity * 0.4;
            ctx.fillStyle = p.color;
            ctx.filter = 'blur(3px)';
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * 2, 0, Math.PI * 2);
            ctx.fill();

            // Draw actual particle
            ctx.filter = 'none';
            ctx.globalAlpha = p.opacity;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();

            ctx.restore();
        }

        return this.fireworksActive || this.fireworkRockets.length > 0 || this.fireworkParticles.length > 0;
    },

    // Render golden rain/coins falling effect
    renderGoldenRain(ctx, canvas, timestamp, options = {}) {
        const {
            count = 100,
            coinSize = 5,
            coinColor = '#ffd700',
            outlineColor = '#b7950b',
            speed = 3,
            swayAmount = 30,
            swaySpeed = 1000,
            detailsEnabled = true
        } = options;

        ctx.save();

        // Draw falling gold coins
        for (let i = 0; i < count; i++) {
            const x = (i / count) * canvas.width + (Math.sin(timestamp / swaySpeed + i) * swayAmount);
            const baseSpeed = speed + (i % 5) * 2;
            const y = ((timestamp / baseSpeed + i * 30) % canvas.height);

            // Draw gold coin body
            ctx.fillStyle = coinColor;
            ctx.beginPath();
            ctx.arc(x, y, coinSize, 0, Math.PI * 2);
            ctx.fill();

            ctx.strokeStyle = outlineColor;
            ctx.lineWidth = 1;
            ctx.stroke();

            // Add coin details if enabled
            if (detailsEnabled) {
                ctx.beginPath();
                ctx.arc(x, y, coinSize * 0.6, 0, Math.PI * 2);
                ctx.stroke();
            }
        }

        ctx.restore();
    },
    // Get a pulsing value based on timestamp
    getPulseValue(timestamp, speed = 1000, min = 0, max = 1) {
        return min + (Math.sin(timestamp / speed) * 0.5 + 0.5) * (max - min);
    },

    // Draw an electric arc between two points
    drawElectricArc(ctx, x1, y1, x2, y2, segments = 8, jitter = 5, color = '#ffffff', thickness = 2) {
        ctx.strokeStyle = color;
        ctx.lineWidth = thickness;
        ctx.beginPath();
        ctx.moveTo(x1, y1);

        // Create segments with random jitter for electric look
        const segmentLength = 1 / segments;
        for (let i = 1; i < segments; i++) {
            const t = i * segmentLength;
            // Interpolate position along the line
            const x = x1 + (x2 - x1) * t;
            const y = y1 + (y2 - y1) * t;
            // Add random jitter perpendicular to the line
            const angle = Math.atan2(y2 - y1, x2 - x1) + Math.PI / 2;
            const jitterAmount = (Math.random() - 0.5) * jitter * 2;
            const jitterX = Math.cos(angle) * jitterAmount;
            const jitterY = Math.sin(angle) * jitterAmount;

            ctx.lineTo(x + jitterX, y + jitterY);
        }

        ctx.lineTo(x2, y2);
        ctx.stroke();
    },

    // Draw a leaf shape (used by themes like Aztec and Fantasy Forest)
    drawLeaf(ctx, x, y, color, timestamp) {
        ctx.save();

        // Rotate the leaf slightly based on time
        ctx.translate(x, y);
        ctx.rotate(Math.sin(timestamp / 3000) * 0.2);

        // Draw a simple leaf shape
        ctx.beginPath();
        ctx.fillStyle = color;
        ctx.moveTo(0, 0);
        ctx.bezierCurveTo(5, -10, 15, -5, 0, 15);
        ctx.bezierCurveTo(-15, -5, -5, -10, 0, 0);
        ctx.fill();

        // Add vein to leaf
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 1;
        ctx.moveTo(0, 0);
        ctx.lineTo(0, 10);
        ctx.stroke();

        ctx.restore();
    }
};