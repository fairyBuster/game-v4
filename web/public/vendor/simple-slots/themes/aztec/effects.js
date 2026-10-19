// filepath: c:\projects\copilot-agent\theme-slots\themes\aztec\effects.js
// Aztec theme specific effects
import { EffectDefaults, EffectsHelper } from '../../shared/effects.js';
import { AztecTheme } from './theme.js';

// You can extend the base effect presets with Aztec-specific effects
export const EffectPresets = {
    ...EffectDefaults,
    enabled: true,
    backgroundEffects: {
        enabled: false
    },
    themeSpecific: {
        // Additional Aztec-specific effect parameters
        stoneTexture: true,
        sunbeams: {
            enabled: true,
            intensity: 0.6,
            count: 8
        },
        templeGlow: {
            enabled: true,
            intensity: 0.8,
            glowColor: '#E6BB4C',
            pulseSpeed: 3000
        },
        radialGlow: {
            enabled: true,
            centerX: 0.5,
            centerY: 0.5,
            radius: 0.5,
            color: '#FFD700',
            intensity: 0.5
        },
        epicWinAnimation: {
            enabled: true,
            name: "Temple of Gold",
            duration: 10000, // 10 seconds
            goldParticles: true,
            _bgLoadInitiated: false,
            _particles: [],
            _particlesInitialized: false
        }
    }
};

// Create ThemeEffectsHelper using a standardized name across all themes
export const ThemeEffectsHelper = {
    // Include all methods from the base EffectsHelper
    ...EffectsHelper,    // Add theme-specific effect methods with standardized naming pattern
    applyThemeEffect(ctx, element, intensity = 1, theme, timestamp) {
        const themeEffects = theme?.visualEffects?.themeSpecific || {};
        // Standard entry point for theme-specific effects
        if (themeEffects?.radialGlow?.enabled) {
            this.createRadialGlow(ctx, element, themeEffects.radialGlow);
        }

        if (themeEffects?.templeGlow?.enabled) {
            this.createTempleGlow(ctx, element, themeEffects.templeGlow);
        }

        if (themeEffects?.sunbeams?.enabled) {
            this.applySunbeams(ctx, themeEffects.sunbeams.intensity, themeEffects.sunbeams.count);
        }
    },
    // Add the missing createRadialGlow method
    createRadialGlow(ctx, canvas, options) {
        const { centerX, centerY, radius, color, intensity } = options;

        // Create a radial gradient
        const gradient = ctx.createRadialGradient(
            centerX, centerY, 0,
            centerX, centerY, radius
        );

        // Set gradient colors with transparency based on intensity
        gradient.addColorStop(0, `${color}${Math.floor(intensity * 80).toString(16).padStart(2, '0')}`);
        gradient.addColorStop(0.7, `${color}${Math.floor(intensity * 40).toString(16).padStart(2, '0')}`);
        gradient.addColorStop(1, `${color}00`);

        // Save current drawing state
        ctx.save();

        // Set global composite operation for better blending
        ctx.globalCompositeOperation = 'lighter';

        // Draw the glow
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Restore drawing state
        ctx.restore();
    },

    createTempleGlow(ctx, canvas, options) {
        const { intensity, glowColor, pulseSpeed } = options;
        const { width, height } = canvas;

        // Create a radial gradient for the temple glow
        const gradient = ctx.createRadialGradient(
            width / 2, height / 2, 0,
            width / 2, height / 2, Math.max(width, height) * 0.5
        );

        // Set gradient colors with transparency based on intensity
        gradient.addColorStop(0, `${glowColor}${Math.floor(intensity * 80).toString(16).padStart(2, '0')}`);
        gradient.addColorStop(0.7, `${glowColor}${Math.floor(intensity * 40).toString(16).padStart(2, '0')}`);
        gradient.addColorStop(1, `${glowColor}00`);

        // Save current drawing state
        ctx.save();

        // Set global composite operation for better blending
        ctx.globalCompositeOperation = 'lighter';

        // Draw the glow
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Restore drawing state
        ctx.restore();
    },

    applySunbeams(ctx, intensity = 0.6, count = 8) {
        const { width, height } = ctx.canvas;
        const centerX = width / 2;
        const centerY = height / 2;
        const radius = Math.max(width, height);

        ctx.save();
        ctx.globalCompositeOperation = 'overlay';

        for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 / count) * i;
            const gradient = ctx.createLinearGradient(
                centerX, centerY,
                centerX + Math.cos(angle) * radius,
                centerY + Math.sin(angle) * radius
            );

            gradient.addColorStop(0, `rgba(255, 200, 50, ${intensity})`);
            gradient.addColorStop(1, 'rgba(255, 200, 50, 0)');

            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.lineTo(
                centerX + Math.cos(angle - 0.05) * radius,
                centerY + Math.sin(angle - 0.05) * radius
            );
            ctx.lineTo(
                centerX + Math.cos(angle + 0.05) * radius,
                centerY + Math.sin(angle + 0.05) * radius
            );
            ctx.closePath();

            ctx.fillStyle = gradient;
            ctx.fill();
        }

        ctx.restore();
    }
};


export function renderEpicWinAnimation(ctx, canvas, elapsedTime, deltaTime, winAmount) {
    const config = AztecTheme.visualEffects.themeSpecific.epicWinAnimation;
    const duration = config.duration;
    const progress = Math.min(1.0, elapsedTime / duration);

    // Epic win animation implementation
    // This is theme-specific but uses the standardized pattern

    return progress < 1.0; // Return true while animation is ongoing
}

export default {
    ThemeEffectsHelper,
    renderEpicWinAnimation
};