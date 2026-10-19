// filepath: c:\projects\copilot-agent\theme-slots\themes\fantasy-forest\effects.js
// Fantasy Forest theme specific effects
import { EffectDefaults, EffectsHelper } from '../../shared/effects.js';
import { FantasyForestTheme } from './theme.js';

// You can extend the base effect presets with Fantasy Forest-specific effects

export const EffectPresets = {
    ...EffectDefaults,
    enabled: true,
    backgroundEffects: {
        enabled: false
    },
    reelEffects: {
        enabled: true,
        blurAmount: 4,
        lightTrails: false,
        spinningGlow: true,
        spinColor: '#76FF03' // Bright magical green
    },
    winEffects: {
        enabled: true,
        explosions: true,
        shockwave: true,
        flashingSymbols: true,
        spinEffect3d: {
            enabled: true
        },
        pulsingSymbols: true,
    },
    backgroundEffects: {
        enabled: true,
        particles: {
            enabled: false,
            count: 30,
            color: '#FFD54F',
            size: { min: 2, max: 4 }
        },
        pulse: {
            enabled: true,
            color: '#1a0038',
            speed: 2000,
            intensity: 0.3
        }
    },
    themeSpecific: {
        // Additional Fantasy Forest-specific effect parameters
        magicSparkles: {
            enabled: true,
            intensity: 0.7,
            color: '#8BC34A',
            size: 3
        },
        floatingLeaves: {
            enabled: false,
            count: 15,
            rotationSpeed: 2,
            fallSpeed: { min: 1, max: 3 },
            colors: ['#8bc34a', '#4caf50', '#cddc39']
        },
        fireflies: {
            enabled: true,
            count: 25,
            color: '#ffeb3b',
            blinkRate: { min: 500, max: 2000 },
            speed: { min: 0.2, max: 1 }
        }
    }
};

// Create ThemeEffectsHelper using a standardized name across all themes
export const ThemeEffectsHelper = {
    // Include all methods from the base EffectsHelper
    ...EffectsHelper,

    // Add theme-specific effect methods with standardized naming pattern
    applyThemeEffect(ctx, element, intensity = 1, theme, timestamp) {
        const specific = theme?.visualEffects?.themeSpecific || {};

        if (specific?.magicSparkles?.enabled) {
            this.applySparkles(
                ctx,
                specific.magicSparkles.intensity,
                specific.magicSparkles.color,
                specific.magicSparkles.size
            );
        }

        if (specific?.floatingLeaves?.enabled) {
            this.applyFloatingLeaves(
                ctx,
                element,
                specific.floatingLeaves.count,
                specific.floatingLeaves.speed
            );
        } if (specific?.fireflies?.enabled) {
            this.applyFireflies(
                ctx,
                element, // canvas parameter
                specific.fireflies,
                timestamp
            );
        }
    },

    applySparkles(ctx, intensity = 0.7, color = '#8BC34A', size = 3) {
        const { width, height } = ctx.canvas;
        const time = Date.now() / 1000;

        // Draw sparkles using canvas
        ctx.save();
        ctx.fillStyle = color;
        ctx.globalAlpha = intensity;

        // Generate sparkles based on time
        const sparkleCount = Math.floor(50 * intensity);
        for (let i = 0; i < sparkleCount; i++) {
            const x = (Math.sin(time + i) * 0.5 + 0.5) * width;
            const y = (Math.cos(time + i * 0.7) * 0.5 + 0.5) * height;
            const sparkleSize = size * (0.5 + Math.sin(time * 3 + i) * 0.5);

            ctx.beginPath();
            ctx.arc(x, y, sparkleSize, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    },

    applyFloatingLeaves(ctx, count = 20, speed = 1.5) {
        const { width, height } = ctx.canvas;
        const time = Date.now() / 1000;

        ctx.save();

        // Simple leaf shapes and colors
        const leafColors = ['#8BC34A', '#689F38', '#33691E', '#558B2F'];

        for (let i = 0; i < count; i++) {
            // Position based on time and leaf index
            const x = (Math.sin(time * speed * 0.2 + i) * 0.5 + 0.5) * width;
            const y = ((time * speed * 0.1 + i) % 1) * height;
            const rotation = Math.sin(time + i * 2) * Math.PI;
            const leafSize = 5 + Math.sin(i) * 5;

            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(rotation);

            // Draw a simple leaf shape
            ctx.fillStyle = leafColors[i % leafColors.length];
            ctx.beginPath();
            ctx.ellipse(0, 0, leafSize, leafSize * 2, 0, 0, Math.PI * 2);
            ctx.fill();

            ctx.restore();
        }

        ctx.restore();
    },

    applyFireflies(ctx, canvas, fireflySettings = {}, timestamp) {
        const count = fireflySettings?.count || 20;

        // Initialize fireflies if they don't exist yet
        if (!this._forestFireflies) {
            this._forestFireflies = [];
            for (let i = 0; i < count; i++) {
                let x, y;
                // Position fireflies with tendency toward edges
                if (Math.random() < 0.7) {
                    if (Math.random() < 0.5) {
                        x = Math.random() < 0.5 ? Math.random() * canvas.width * 0.3 : canvas.width - (Math.random() * canvas.width * 0.3);
                        y = Math.random() * canvas.height;
                    } else {
                        x = Math.random() * canvas.width;
                        y = Math.random() < 0.5 ? Math.random() * canvas.height * 0.3 : canvas.height - (Math.random() * canvas.height * 0.3);
                    }
                } else {
                    x = Math.random() * canvas.width;
                    y = Math.random() * canvas.height;
                }

                this._forestFireflies.push({
                    x: x,
                    y: y,
                    size: Math.random() * 3 + 2,
                    speedX: (Math.random() - 0.5) * ((fireflySettings?.speed?.max || 1) - (fireflySettings?.speed?.min || 0.2)) + (fireflySettings?.speed?.min || 0.2),
                    speedY: (Math.random() - 0.5) * ((fireflySettings?.speed?.max || 1) - (fireflySettings?.speed?.min || 0.2)) + (fireflySettings?.speed?.min || 0.2),
                    blinkRate: Math.random() * ((fireflySettings?.blinkRate?.max || 2000) - (fireflySettings?.blinkRate?.min || 500)) + (fireflySettings?.blinkRate?.min || 500),
                    phase: Math.random() * Math.PI * 2,
                    baseColor: fireflySettings?.color || '#ffeb3b',
                    wanderAngle: Math.random() * Math.PI * 2,
                    wanderSpeed: Math.random() * 0.02 + 0.005
                });
            }
        }

        ctx.save();
        ctx.globalCompositeOperation = 'lighter';

        this._forestFireflies.forEach(firefly => {
            // Update firefly movement with natural wandering behavior
            firefly.wanderAngle += (Math.random() - 0.5) * 0.2;
            firefly.x += Math.cos(firefly.wanderAngle) * firefly.speedX;
            firefly.y += Math.sin(firefly.wanderAngle) * firefly.speedY;

            // Wrap around screen edges
            if (firefly.x > canvas.width) firefly.x = 0;
            if (firefly.x < 0) firefly.x = canvas.width;
            if (firefly.y > canvas.height) firefly.y = 0;
            if (firefly.y < 0) firefly.y = canvas.height;

            // Calculate blinking effect
            const blinkIntensity = (Math.sin((timestamp / firefly.blinkRate) + firefly.phase) * 0.5 + 0.5);

            if (blinkIntensity > 0.1) {
                // Create glowing effect with gradient
                const gradient = ctx.createRadialGradient(
                    firefly.x, firefly.y, 0,
                    firefly.x, firefly.y, firefly.size * 2
                );

                gradient.addColorStop(0, `${firefly.baseColor}${Math.floor(blinkIntensity * 255).toString(16).padStart(2, '0')}`);
                gradient.addColorStop(1, `${firefly.baseColor}00`);

                // Draw outer glow
                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.arc(firefly.x, firefly.y, firefly.size * 2, 0, Math.PI * 2);
                ctx.fill();

                // Draw bright center
                ctx.fillStyle = 'rgba(255, 255, 255, ' + blinkIntensity * 0.7 + ')';
                ctx.beginPath();
                ctx.arc(firefly.x, firefly.y, firefly.size * 0.5, 0, Math.PI * 2);
                ctx.fill();
            }
        });

        ctx.restore();
    }
};

export function renderEpicWinAnimation(ctx, canvas, elapsedTime, deltaTime, winAmount) {
    const config = FantasyForestTheme.visualEffects.themeSpecific.epicWinAnimation;
    const duration = config.duration || 5000;
    const progress = Math.min(1.0, elapsedTime / duration);

    // Epic win animation implementation
    // This is theme-specific but uses the standardized pattern

    return progress < 1.0; // Return true while animation is ongoing
}

export default {
    ThemeEffectsHelper,
    renderEpicWinAnimation
};
