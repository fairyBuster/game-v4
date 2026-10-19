// fantasy forest theme specific effects
import { EffectDefaults, EffectsHelper } from '../../shared/effects.js';

// You can extend the base effect presets with fantasy forest-specific effects
export const EffectPresets = {
    ...EffectDefaults,
    enabled: true,
    backgroundEffects: {
        enabled: true,
        ...EffectDefaults.backgroundEffects,
    },
    themeSpecific: {
        vintageFilter: true,
        scanlines: {
            enabled: false,
            intensity: 0.2,
            count: 50
        }
    }
};

// Create a ThemeEffectsHelper using a standardized name across all themes
export const ThemeEffectsHelper = {
    // Include all methods from the base EffectsHelper
    ...EffectsHelper,    // Add theme-specific effect methods with standardized naming pattern
    applyThemeEffect(ctx, canvas, intensity = 1, theme, timestamp) {
        // Standard entry point for theme-specific effects
        const specific = theme?.visualEffects?.themeSpecific || {};

        // Apply fantasy forest scanline effect if enabled
        if (specific?.scanlines?.enabled) {
            this.applyScanlines(
                ctx,
                canvas,
                specific.scanlines.intensity || 0.2,
                specific.scanlines.count || 50,
                timestamp
            );
        }

        // Apply vintage filter effect if enabled
        if (specific?.vintageFilter) {
            this.applyVintageFilter(
                ctx,
                canvas,
                intensity,
                timestamp
            );
        }

        // Apply fruit symbols glow if enabled
        if (specific?.fruitGlow?.enabled) {
            this.applyFruitGlow(
                ctx,
                canvas,
                specific.fruitGlow?.intensity || 0.7,
                specific.fruitGlow?.pulseSpeed || 2000,
                timestamp
            );
        }

        // Apply neon light effect if enabled
        if (specific?.neonLights?.enabled) {
            this.applyNeonLights(
                ctx,
                canvas,
                specific.neonLights?.color || '#ff00ff',
                specific.neonLights?.intensity || 0.6,
                specific.neonLights?.flickerSpeed || 200,
                timestamp
            );
        }
    },

    applyScanlines(ctx, canvas, intensity = 0.2, count = 50, timestamp) {
        const { width, height } = canvas;
        const lineHeight = height / count;

        // Save context
        ctx.save();

        // Add slight animation to scanlines for CRT effect
        const offset = Math.sin(timestamp / 1000) * lineHeight * 0.5;

        // Draw scanlines with slight transparency for better effect
        ctx.fillStyle = `rgba(0, 0, 0, ${intensity})`;
        for (let i = 0; i < count; i += 2) {
            ctx.fillRect(0, i * lineHeight + offset, width, lineHeight);
        }

        // Restore context
        ctx.restore();
    },

    applyVintageFilter(ctx, canvas, intensity = 0.7, timestamp) {
        const { width, height } = canvas;

        // Save context
        ctx.save();

        // Apply a sepia overlay for vintage look
        ctx.fillStyle = `rgba(255, 240, 195, ${0.1 * intensity})`;
        ctx.fillRect(0, 0, width, height);

        // Add film grain effect
        ctx.globalCompositeOperation = 'overlay';

        // Create dynamic grain pattern
        for (let i = 0; i < 2000 * intensity; i++) {
            const x = Math.random() * width;
            const y = Math.random() * height;
            const size = Math.random() * 2 + 1;
            const opacity = Math.random() * 0.1 * intensity;

            ctx.fillStyle = Math.random() > 0.5 ?
                `rgba(255, 255, 255, ${opacity})` :
                `rgba(0, 0, 0, ${opacity})`;

            ctx.fillRect(x, y, size, size);
        }

        // Add subtle vignette effect
        const gradient = ctx.createRadialGradient(
            width / 2, height / 2, 0,
            width / 2, height / 2, width * 0.7
        );

        gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
        gradient.addColorStop(0.5, 'rgba(0, 0, 0, 0)');
        gradient.addColorStop(1, `rgba(0, 0, 0, ${0.3 * intensity})`);

        ctx.globalCompositeOperation = 'multiply';
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);

        // Restore context
        ctx.restore();
    },

    applyFruitGlow(ctx, canvas, intensity = 0.7, pulseSpeed = 2000, timestamp) {
        const { width, height } = canvas;

        // Calculate glow intensity based on time
        const pulseFactor = 0.5 + Math.sin(timestamp / pulseSpeed) * 0.5;
        const currentIntensity = intensity * pulseFactor;

        // Create fruit symbol positions (this would typically come from game data)
        const fruitPositions = [
            { x: width * 0.2, y: height * 0.4, color: '#ff0000', type: 'cherry' },
            { x: width * 0.5, y: height * 0.3, color: '#ffff00', type: 'lemon' },
            { x: width * 0.8, y: height * 0.5, color: '#ff8800', type: 'orange' }
        ];

        ctx.save();
        ctx.globalCompositeOperation = 'lighter';

        // Draw glowing effect around each fruit
        fruitPositions.forEach(fruit => {
            const glowRadius = 40 + Math.sin(timestamp / (pulseSpeed / 2)) * 10;

            // Create radial gradient for glow
            const gradient = ctx.createRadialGradient(
                fruit.x, fruit.y, 0,
                fruit.x, fruit.y, glowRadius
            );

            gradient.addColorStop(0, `${fruit.color}${Math.floor(currentIntensity * 99).toString(16).padStart(2, '0')}`);
            gradient.addColorStop(0.7, `${fruit.color}${Math.floor(currentIntensity * 40).toString(16).padStart(2, '0')}`);
            gradient.addColorStop(1, `${fruit.color}00`);

            // Draw glow
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(fruit.x, fruit.y, glowRadius, 0, Math.PI * 2);
            ctx.fill();
        });

        ctx.restore();
    },

    applyNeonLights(ctx, canvas, color = '#ff00ff', intensity = 0.6, flickerSpeed = 200, timestamp) {
        const { width, height } = canvas;

        // Create neon border with flicker effect
        const flicker = 0.7 + Math.random() * 0.3 * (Math.sin(timestamp / flickerSpeed) > 0.7 ? 1 : 0.8);
        const glowSize = 15 * intensity * flicker;

        ctx.save();
        ctx.globalCompositeOperation = 'lighter';

        // Draw neon border
        const borderWidth = 10;

        // Create gradient for glow effect
        const createNeonGradient = (x1, y1, x2, y2) => {
            const gradient = ctx.createLinearGradient(x1, y1, x2, y2);
            gradient.addColorStop(0, `${color}00`);
            gradient.addColorStop(0.5, `${color}${Math.floor(intensity * flicker * 255).toString(16).padStart(2, '0')}`);
            gradient.addColorStop(1, `${color}00`);
            return gradient;
        };

        // Top neon border
        ctx.fillStyle = createNeonGradient(0, 0, 0, glowSize);
        ctx.fillRect(0, 0, width, glowSize);

        // Bottom neon border
        ctx.fillStyle = createNeonGradient(0, height, 0, height - glowSize);
        ctx.fillRect(0, height - glowSize, width, glowSize);

        // Left neon border
        ctx.fillStyle = createNeonGradient(0, 0, glowSize, 0);
        ctx.fillRect(0, 0, glowSize, height);

        // Right neon border
        ctx.fillStyle = createNeonGradient(width, 0, width - glowSize, 0);
        ctx.fillRect(width - glowSize, 0, glowSize, height);

        ctx.restore();
    }
}

/**
* Renders an enhanced, dynamic jackpot win animation for a fantasy forest 5-reel slot game.
*
* @param {CanvasRenderingContext2D} ctx - The canvas rendering context.
* @param {HTMLCanvasElement} canvas - The canvas element.
* @param {number} elapsedTime - Total time elapsed since the animation started (in ms).
* @param {number} deltaTime - Time since the last frame (in ms). Useful for physics/particle updates.
* @param {number} winAmount - The amount won in the jackpot.
*/
export function renderEpicWinAnimation(ctx, canvas, elapsedTime, deltaTime, winAmount) {

}

export default {
    renderEpicWinAnimation
};
