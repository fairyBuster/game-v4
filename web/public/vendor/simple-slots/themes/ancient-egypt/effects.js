// Ancient Egypt theme specific effects
import { EffectDefaults, EffectsHelper } from '../../shared/effects.js';
import { AncientEgyptTheme } from './theme.js';

// You can extend the base effect presets with Ancient Egypt-specific effects

export const EffectPresets = {
    ...EffectDefaults,
    enabled: true,
    backgroundEffects: {
        enabled: false,
    },
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
    },
    reelMask: {
        enabled: true,
        borderWidth: 3,
        separatorWidth: 3,
        glowEffect: {
            enabled: false,
            color: '#FFD700', // Gold for pirate treasure
            intensity: 0.8,
            size: 12
        },
        pulseEffect: {
            enabled: false,
            speed: 2000,
            minOpacity: 0.6,
            maxOpacity: 1.0
        },
        colorTransition: {
            enabled: true,
            colors: ['#FFD700'], // Gold, Orange-red, Deep blue, Emerald, Gold
            speed: 6000,
            mode: 'gradient'
        }
    },
    themeSpecific: {
        sandStorm: true,
        goldShimmer: {
            enabled: true,
            intensity: 0.7,
            frequency: 0.5
        },
        sandStorm: {
            enabled: true,
            intensity: 0.1,
            color: '#d4b683'
        },
        hieroglyphGlow: {
            enabled: true,
            color: '#ffcc00'
        },
    }
};

// Create a ThemeEffectsHelper object that includes EffectsHelper methods
// Using a standardized name that will be the same across all themes
export const ThemeEffectsHelper = {
    // Include all methods from the base EffectsHelper
    ...EffectsHelper,    // Add theme-specific effect methods with standardized naming
    applyThemeEffect(ctx, canvas, intensity = 1, theme, timestamp) {
        // Standard entry point for theme-specific effects
        const specific = theme?.visualEffects?.themeSpecific || {};

        // Add theme-specific gold shimmer effect if enabled
        if (specific?.goldShimmer?.enabled) {
            this.applyGoldShimmer(
                ctx,
                canvas,
                specific.goldShimmer.intensity || 0.7,
                specific.goldShimmer.frequency || 0.5,
                timestamp
            );
        } if (specific?.sandStorm?.enabled) {
            this.applySandStorm(
                ctx,
                canvas,
                specific.sandStorm.intensity || 0.1,
                specific.sandStorm.color || '#d4b683',
                timestamp
            );
        }

        // Add hieroglyph glow effect if enabled
        if (specific?.hieroglyphGlow?.enabled) {
            this.applyHieroglyphGlow(
                ctx,
                canvas,
                intensity,
                specific.hieroglyphGlow.color || '#ffcc00',
                timestamp
            );
        }

        // Add pyramid light beam effect if enabled
        if (specific?.pyramidLight?.enabled) {
            this.applyPyramidLight(
                ctx,
                canvas,
                specific.pyramidLight?.intensity || 0.8,
                specific.pyramidLight?.color || '#fff8dc',
                timestamp
            );
        }
    },

    applyGoldShimmer(ctx, canvas, intensity = 0.7, frequency = 0.5, timestamp) {
        const { width, height } = canvas;
        const time = timestamp / 1000;

        ctx.save();

        // Create a shimmering gold overlay with more visual interest
        ctx.globalCompositeOperation = 'overlay';

        // Create subtle gradient shimmer
        const gradient = ctx.createLinearGradient(0, 0, width, height);
        gradient.addColorStop(0, `rgba(255, 215, 0, ${0.1 * intensity * (0.7 + Math.sin(time * frequency) * 0.3)})`);
        gradient.addColorStop(0.5, `rgba(255, 223, 0, ${0.2 * intensity * (0.7 + Math.sin(time * frequency + 1) * 0.3)})`);
        gradient.addColorStop(1, `rgba(255, 215, 0, ${0.1 * intensity * (0.7 + Math.sin(time * frequency + 2) * 0.3)})`);

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);

        // Add shimmer particles (dust in the air catching sunlight)
        ctx.globalCompositeOperation = 'lighter';

        // Draw shimmer particles
        for (let i = 0; i < 50 * intensity; i++) {
            const x = (Math.sin(i + time) * 0.5 + 0.5) * width;
            const y = (Math.cos(i * 0.7 + time * 0.8) * 0.5 + 0.5) * height;
            const size = 1 + Math.random() * 2;
            const opacity = 0.1 + Math.random() * 0.3 * intensity * (0.5 + Math.sin(time * frequency + i) * 0.5);

            ctx.fillStyle = `rgba(255, 245, 200, ${opacity})`;
            ctx.beginPath();
            ctx.arc(x, y, size, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    },

    applySandStorm(ctx, canvas, intensity = 0.1, color = '#d4b683', timestamp) {
        const { width, height } = canvas;
        const time = timestamp / 1000;

        // Create sand particles
        if (!this._sandParticles) {
            this._sandParticles = [];
            for (let i = 0; i < 200; i++) {
                this._sandParticles.push({
                    x: Math.random() * width,
                    y: Math.random() * height,
                    size: 1 + Math.random() * 2,
                    speed: 1 + Math.random() * 3,
                    opacity: 0.1 + Math.random() * 0.5
                });
            }
        }

        ctx.save();

        // First draw a subtle sand-colored overlay
        const stormIntensity = intensity * (0.5 + Math.sin(time * 0.2) * 0.5);
        ctx.fillStyle = `rgba(${parseInt(color.slice(1, 3), 16)}, ${parseInt(color.slice(3, 5), 16)}, ${parseInt(color.slice(5, 7), 16)}, ${stormIntensity * 0.2})`;
        ctx.fillRect(0, 0, width, height);

        // Then draw sand particles
        this._sandParticles.forEach(particle => {
            // Update particle position - blow from right to left with slight downward motion
            particle.x -= particle.speed;
            particle.y += particle.speed * 0.2;

            // Reset particles that move off-screen
            if (particle.x < 0) particle.x = width;
            if (particle.y > height) particle.y = 0;

            // Draw the sand particle with varying opacity based on time
            const particleOpacity = particle.opacity * intensity * (0.7 + Math.sin(time + particle.x / 100) * 0.3);
            ctx.fillStyle = `rgba(${parseInt(color.slice(1, 3), 16)}, ${parseInt(color.slice(3, 5), 16)}, ${parseInt(color.slice(5, 7), 16)}, ${particleOpacity})`;
            ctx.beginPath();
            ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            ctx.fill();
        });

        ctx.restore();
    },

    /**
     * Random hyroglyph symbols will appear
     * @param {*} ctx 
     * @param {*} element 
     * @param {*} intensity 
     * @param {*} color 
     */
    applyHieroglyphGlow(ctx, canvas, intensity = 0.8, color = '#ffcc00', timestamp) {
        const { width, height } = canvas;
        const time = timestamp / 1000;        // Position hieroglyphs around the outside edge of the canvas, 20-50px from the edge
        // This creates a frame-like effect around the game area
        const edgeMargin = 30; // Distance from edge (between 20-50px)

        // Store static positions for hieroglyphs if they haven't been initialized yet
        if (!this._hieroglyphPositions) {
            this._hieroglyphPositions = [
                // Top edge
                { x: edgeMargin + 15, y: edgeMargin + 10, symbol: '𓀀', scale: 1.2 },
                { x: width * 0.25, y: edgeMargin, symbol: '𓁹', scale: 1.0 },
                { x: width * 0.5, y: edgeMargin + 7, symbol: '𓀭', scale: 1.1 },
                { x: width * 0.75, y: edgeMargin, symbol: '𓃾', scale: 0.9 },
                { x: width - edgeMargin - 15, y: edgeMargin + 10, symbol: '𓅓', scale: 1.3 },

                // Right edge
                { x: width - edgeMargin, y: height * 0.25, symbol: '𓆣', scale: 1.0 },
                { x: width - edgeMargin - 8, y: height * 0.5, symbol: '𓇯', scale: 1.2 },
                { x: width - edgeMargin, y: height * 0.75, symbol: '𓉔', scale: 1.1 },

                // Bottom edge
                { x: width - edgeMargin - 15, y: height - edgeMargin - 10, symbol: '𓊽', scale: 1.3 },
                { x: width * 0.75, y: height - edgeMargin, symbol: '𓋴', scale: 1.0 },
                { x: width * 0.5, y: height - edgeMargin - 7, symbol: '𓌂', scale: 0.9 },
                { x: width * 0.25, y: height - edgeMargin, symbol: '𓍯', scale: 1.1 },
                { x: edgeMargin + 15, y: height - edgeMargin - 10, symbol: '𓎛', scale: 1.2 },

                // Left edge
                { x: edgeMargin, y: height * 0.75, symbol: '𓏜', scale: 1.0 },
                { x: edgeMargin + 8, y: height * 0.5, symbol: '𓐍', scale: 1.1 },
                { x: edgeMargin, y: height * 0.25, symbol: '𓁀', scale: 0.9 }
            ];
        }

        // Use the stored static positions
        const hieroglyphPositions = this._hieroglyphPositions;

        ctx.save();

        // Calculate pulse for the glow effect
        const pulse = 0.7 + Math.sin(time * 0.8) * 0.3;
        const glowIntensity = intensity * pulse;

        // Set comp mode for better glow
        ctx.globalCompositeOperation = 'lighter';

        // Draw each hieroglyph with glow
        hieroglyphPositions.forEach(hiero => {
            // Draw glow first
            const glowRadius = 15 * hiero.scale * pulse;
            const gradient = ctx.createRadialGradient(
                hiero.x, hiero.y, 0,
                hiero.x, hiero.y, glowRadius
            );

            gradient.addColorStop(0, `${color}${Math.floor(glowIntensity * 99).toString(16).padStart(2, '0')}`);
            gradient.addColorStop(0.7, `${color}${Math.floor(glowIntensity * 40).toString(16).padStart(2, '0')}`);
            gradient.addColorStop(1, `${color}00`);

            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(hiero.x, hiero.y, glowRadius, 0, Math.PI * 2);
            ctx.fill();

            // Draw the hieroglyph symbol
            ctx.fillStyle = color;
            ctx.font = `${30 * hiero.scale}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(hiero.symbol, hiero.x, hiero.y);
        });

        ctx.restore();
    },

    /**
     * Creates a light beam effect emanating from a pyramid
     */
    applyPyramidLight(ctx, canvas, intensity = 0.8, color = '#fff8dc', timestamp) {
        const { width, height } = canvas;
        const time = timestamp / 1000;

        // Define pyramid position (typically at the bottom center of the screen)
        const pyramidX = width * 0.5;
        const pyramidBaseY = height * 0.8;
        const pyramidHeight = height * 0.3;
        const pyramidWidth = width * 0.4;

        ctx.save();

        // Create the light beam effect
        ctx.globalCompositeOperation = 'lighter';

        // Calculate beam intensity with time-based variation
        const beamIntensity = intensity * (0.7 + Math.sin(time * 0.2) * 0.3);

        // Draw light beam emanating from pyramid peak
        const beamGradient = ctx.createRadialGradient(
            pyramidX, pyramidBaseY - pyramidHeight, 0,
            pyramidX, pyramidBaseY - pyramidHeight, height
        );

        beamGradient.addColorStop(0, `${color}${Math.floor(beamIntensity * 99).toString(16).padStart(2, '0')}`);
        beamGradient.addColorStop(0.1, `${color}${Math.floor(beamIntensity * 70).toString(16).padStart(2, '0')}`);
        beamGradient.addColorStop(0.5, `${color}${Math.floor(beamIntensity * 20).toString(16).padStart(2, '0')}`);
        beamGradient.addColorStop(1, `${color}00`);

        // Draw the beam as a triangle emanating upward from pyramid tip
        ctx.fillStyle = beamGradient;
        ctx.beginPath();
        ctx.moveTo(pyramidX, pyramidBaseY - pyramidHeight); // Pyramid peak
        ctx.lineTo(pyramidX - pyramidWidth * 0.3, 0); // Top left of screen
        ctx.lineTo(pyramidX + pyramidWidth * 0.3, 0); // Top right of screen
        ctx.closePath();
        ctx.fill();

        // Add some rays within the beam for extra effect
        ctx.globalAlpha = beamIntensity * 0.7;

        // Draw multiple light rays
        for (let i = 0; i < 5; i++) {
            const rayWidth = pyramidWidth * 0.03 * (1 + Math.sin(time + i));
            const rayOffset = pyramidWidth * 0.2 * Math.sin(time * 0.5 + i * 0.7);

            ctx.beginPath();
            ctx.moveTo(pyramidX, pyramidBaseY - pyramidHeight);
            ctx.lineTo(pyramidX + rayOffset - rayWidth, 0);
            ctx.lineTo(pyramidX + rayOffset + rayWidth, 0);
            ctx.closePath();
            ctx.fillStyle = `rgba(255, 248, 220, ${0.3 * beamIntensity})`;
            ctx.fill();
        }

        // Add some small shimmering particles in the beam
        for (let i = 0; i < 40; i++) {
            const particleX = pyramidX + (Math.random() - 0.5) * pyramidWidth * 0.5;
            const particleY = (pyramidBaseY - pyramidHeight) * Math.random();
            const particleSize = 1 + Math.random() * 2;
            const particleOpacity = 0.1 + Math.random() * 0.4 * beamIntensity;

            ctx.fillStyle = `rgba(255, 255, 220, ${particleOpacity})`;
            ctx.beginPath();
            ctx.arc(particleX, particleY, particleSize, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }
}

/**
     * Renders the Fantasy Forest Epic Win Animation.
     * Assumes this is called repeatedly within an animation loop.
     * Manages internal state like particle positions and image loading.
     *
     * @param {CanvasRenderingContext2D} ctx - The canvas rendering context.
     * @param {HTMLCanvasElement} canvas - The canvas element.
     * @param {number} elapsedTime - Total time elapsed since animation start (ms).
     * @param {number} deltaTime - Time elapsed since last frame (ms).
     * @param {number} winAmount - The final amount won for display.
     * @returns {boolean} - true if animation is still playing, false if complete.
     */
export function renderEpicWinAnimation(ctx, canvas, elapsedTime, deltaTime, winAmount) {
    const config = AncientEgyptTheme.visualEffects.themeSpecific.epicWinAnimation;
    const duration = config.duration;
    const progress = Math.min(1.0, elapsedTime / duration); // Ensure progress doesn't exceed 1

    // --- Background ---
    const bgPath = `images/${AncientEgyptTheme.name.toLowerCase()}/epic_bg.jpg`;

    // Initiate loading if not already started
    if (!config._bgLoadInitiated) {
        config._bgLoadInitiated = true;
        // Initialize gold particles storage
        config._particles = [];
        config._particlesInitialized = false;
        // Use async loading but don't block rendering
        EffectsHelper.loadImage(bgPath).then(img => {
            config._backgroundImage = img; // Store loaded image (or null if failed)
        }).catch(() => { // Catch potential promise rejection just in case
            config._backgroundImage = null;
        });
    }

    ctx.save();        // Draw background image if loaded, otherwise draw fallback
    if (config._backgroundImage) {
        // Ensure the image covers the entire canvas while maintaining aspect ratio
        const imgWidth = config._backgroundImage.width;
        const imgHeight = config._backgroundImage.height;
        const canvasRatio = canvas.width / canvas.height;
        const imgRatio = imgWidth / imgHeight;

        let drawWidth, drawHeight, offsetX = 0, offsetY = 0;

        // Calculate dimensions to cover the entire canvas
        if (canvasRatio > imgRatio) {
            // Canvas is wider than image aspect ratio
            drawWidth = canvas.width;
            drawHeight = canvas.width / imgRatio;
            offsetY = (canvas.height - drawHeight) / 2;
        } else {
            // Canvas is taller than image aspect ratio
            drawHeight = canvas.height;
            drawWidth = canvas.height * imgRatio;
            offsetX = (canvas.width - drawWidth) / 2;
        }

        // Draw the image to cover the entire canvas
        ctx.drawImage(config._backgroundImage, offsetX, offsetY, drawWidth, drawHeight);
    } else {
        // Fallback gradient background
        const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        gradient.addColorStop(0, '#1a472a'); // Dark deep green
        gradient.addColorStop(0.5, '#2e7d32'); // Forest green
        gradient.addColorStop(1, '#1b5e20'); // Darker base green
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        // Optionally draw text indicating loading state if desired
        // ctx.fillStyle = "white"; ctx.fillText("Loading background...", canvas.width/2, canvas.height/2);
    }        // We'll move the gold particles rendering to the end to ensure they're on top of everything// --- Title Text ---
    const titleText = config.name || "EPIC WIN";
    const titleBaseSize = Math.min(canvas.width / 15, 100); // Increased base size (was /10, 70)
    const titlePulse = Math.sin(elapsedTime / 300) * (titleBaseSize * 0.1); // Increased pulse effect
    const titleSize = titleBaseSize + titlePulse;
    const titleY = titleSize + 50;

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `900 ${titleSize}px 'Papyrus', fantasy, cursive`; // Bolder font weight (900 instead of bold)

    // Enhanced glowing effect
    ctx.shadowColor = '#dddddd'; // Brighter yellow-gold glow
    ctx.shadowBlur = 30 + Math.sin(elapsedTime / 250) * 15; // Increased glow intensity & variation        // Bright yellow text gradient fill
    const titleGradient = ctx.createLinearGradient(
        canvas.width / 2 - 200, titleY,
        canvas.width / 2 + 200, titleY
    );
    titleGradient.addColorStop(0, '#ffffFF'); // Bright yellow
    titleGradient.addColorStop(0.3, '#ffffFF'); // Slightly lighter yellow
    titleGradient.addColorStop(0.7, '#ffffFF'); // Bright yellow again
    titleGradient.addColorStop(1, '#ffff66'); // Light yellow with a slight hint of gold
    ctx.fillStyle = titleGradient;

    // Optional: Gentle rocking motion
    const titleRock = Math.sin(elapsedTime / 500) * 0.02; // Radians for rotation
    ctx.save();
    ctx.translate(canvas.width / 2, titleY);
    ctx.rotate(titleRock);
    ctx.fillText(titleText, 0, 0);
    // Optional outline for better contrast
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.lineWidth = 2;
    ctx.strokeText(titleText, 0, 0);
    ctx.restore(); // Restore rotation/translation


    // --- Win Amount Text ---        const amountY = canvas.height * 0.6;
    const amountBaseSize = Math.min(canvas.width / 12, 60);
    const countUpDuration = duration * 0.6; // Spend 60% of time counting up

    let displayAmount = 0;
    if (elapsedTime < countUpDuration) {
        // Fast, non-linear count-up (ease-out)
        const countProgress = elapsedTime / countUpDuration;
        const easedProgress = 1 - Math.pow(1 - countProgress, 3); // Cubic ease-out
        displayAmount = winAmount * easedProgress;
    } else {
        displayAmount = winAmount; // Hold final amount
    }        // Ensure we're using the passed win amount parameter, not a constant
    // Format amount (e.g., with commas and 2 decimal places)
    const formattedAmount = displayAmount.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });        // Size pulse when amount reaches final value
    let amountSize = amountBaseSize;
    let amountShakeX = 0;
    let amountShakeY = 0;
    let amountY = canvas.height / 2; // Position text vertically centered
    const shakeIntensity = 3;

    if (elapsedTime >= countUpDuration) {
        amountSize = amountBaseSize * (1 + Math.sin((elapsedTime - countUpDuration) / 150) * 0.1); // Pulse size
    } else {
        // Shake effect while counting
        amountShakeX = (Math.random() - 0.5) * shakeIntensity;
        amountShakeY = (Math.random() - 0.5) * shakeIntensity;
    }


    ctx.font = `bold ${amountSize}px 'Arial', sans-serif`;
    ctx.fillStyle = '#ffffff'; // White for contrast
    ctx.shadowColor = '#000000'; // Black shadow for readability
    ctx.shadowBlur = 8;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;

    ctx.fillText(formattedAmount, canvas.width / 2 + amountShakeX, amountY + amountShakeY);
    // Optional: Add currency symbol (e.g., '$')
    // const currencySymbol = "$";
    // ctx.fillText(currencySymbol + formattedAmount, canvas.width / 2 + amountShakeX, amountY + amountShakeY);        // --- Gold Particles rendering at the very end (on top of everything) ---
    if (config.goldParticles) {

        const particleCount = 150; // More particles for an epic feel
        const particleBaseSpeed = canvas.height / 3000; // Speed relative to canvas height/time

        // Initialize particles once
        if (!config._particlesInitialized) {
            config._particles = [];
            for (let i = 0; i < particleCount; i++) {
                config._particles.push({
                    x: Math.random() * canvas.width,
                    y: Math.random() * -canvas.height, // Start above the screen
                    size: Math.random() * 8 + 4, // Coin size range
                    speedY: (Math.random() * 0.5 + 0.75) * particleBaseSpeed * 1000, // Base speed + variation (in pixels/sec)
                    rotation: Math.random() * Math.PI * 2,
                    rotationSpeed: (Math.random() - 0.5) * 0.1 * (Math.PI / 180) * 1000, // degrees/sec
                    swaySpeed: Math.random() * 1.0 + 0.5, // Sway frequency
                    swayAmplitude: Math.random() * 15 + 5, // Sway distance
                    initialX: Math.random() * canvas.width // Store initial X for reset
                });
            }
            config._particlesInitialized = true;
        }

        // Make sure we're drawing on top of everything
        ctx.save();
        // Update and draw particles
        ctx.fillStyle = '#ffd700'; // Gold color
        ctx.shadowColor = 'rgba(255, 215, 0, 0.6)'; // Gold glow
        ctx.shadowBlur = 10;

        config._particles.forEach(p => {
            // Update position based on deltaTime for smoother animation
            const dtSec = deltaTime / 1000.0;
            p.y += p.speedY * dtSec;
            p.rotation += p.rotationSpeed * dtSec;
            // Add horizontal sway based on elapsed time
            p.x = p.initialX + Math.sin(elapsedTime / 1000 * p.swaySpeed) * p.swayAmplitude;

            // Reset particle if it falls off the bottom
            if (p.y > canvas.height + p.size) {
                p.y = -p.size * 2; // Reset above the screen
                p.initialX = Math.random() * canvas.width; // New random horizontal start
                p.x = p.initialX;
            }

            // Draw coin (simple circle)
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(p.rotation);
            ctx.beginPath();
            ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);

            // Simple gradient for a bit of depth
            const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, p.size / 2);
            grad.addColorStop(0, '#fff8dc'); // Lighter center (Cornsilk)
            grad.addColorStop(0.7, '#ffd700'); // Gold
            grad.addColorStop(1, '#b8860b'); // Darker edge (DarkGoldenrod)
            ctx.fillStyle = grad;

            ctx.fill();
            ctx.restore();
        });
        ctx.shadowColor = 'transparent'; // Reset shadow
        ctx.shadowBlur = 0;
        ctx.restore();
    }

    ctx.restore(); // Restore context state from the beginning

    // Return true if animation is ongoing, false if finished
    return progress < 1.0;
}

export default {
    renderEpicWinAnimation
};
