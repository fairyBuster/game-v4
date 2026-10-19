// filepath: c:\projects\copilot-agent\theme-slots\themes\space-adventure\effects.js
// Space Adventure theme specific effects
import { EffectDefaults, EffectsHelper } from '../../shared/effects.js';
import { SpaceAdventureTheme } from './theme.js';

// You can extend the base effect presets with Space Adventure-specific effects
export const EffectPresets = {
    ...EffectDefaults,
    enabled: true,
    backgroundEffects: {
        enabled: false
    },
    reelEffects: {
        enabled: true,
        blurAmount: 7,
        lightTrails: false,
        spinningGlow: true,
        spinColor: '#00B0FF' // Bright blue
    },
    winEffects: {
        enabled: false,
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
            enabled: true,
            color: '#fff', // Gold for pirate treasure
            intensity: 0.2,
            size: 1
        },
        pulseEffect: {
            enabled: false,
            speed: 2000,
            minOpacity: 0.6,
            maxOpacity: 1.0
        },
        colorTransition: {
            enabled: true,
            colors: ['#333'], // Gold, Orange-red, Deep blue, Emerald, Gold
            speed: 6000,
            mode: 'gradient'
        }
    },
    themeSpecific: {
        spaceWarp: {
            enabled: true,
            speed: 1.5,
            starCount: 200,
            colorShift: true
        },
        planetGlow: {
            enabled: true,
            colors: ['#ff5500', '#00aaff', '#44ff44']
        },
        starfield: {
            enabled: true,
            starCount: 200,
            warpSpeed: 0.8
        },
        nebulaEffect: {
            enabled: true,
            colors: ['#7b68ee', '#4b0082', '#9932cc', '#8a2be2'],
            intensity: 0.6
        }
    }
};

// Create ThemeEffectsHelper using a standardized name across all themes
export const ThemeEffectsHelper = {
    // Include all methods from the base EffectsHelper
    ...EffectsHelper,    // Add theme-specific effect methods with standardized naming pattern
    applyThemeEffect(ctx, canvas, intensity = 1, theme, timestamp) {
        // Standard entry point for theme-specific effects
        const specific = theme?.visualEffects?.themeSpecific || {};

        // Check each effect and apply if enabled
        if (specific?.starfield?.enabled) {
            this.applyStarfield(
                ctx,
                canvas,
                specific.starfield.starCount || 200,
                specific.starfield.warpSpeed || 0.8,
                timestamp
            );
        }

        if (specific?.nebulaEffect?.enabled) {
            this.applyNebulaEffect(
                ctx,
                canvas,
                specific.nebulaEffect.colors || ['#7b68ee', '#4b0082', '#9932cc', '#8a2be2'],
                specific.nebulaEffect.intensity || 0.6,
                timestamp
            );
        }

        if (specific?.planetRing?.enabled) {
            this.applyPlanetRing(
                ctx,
                canvas,
                specific.planetRing.color || '#FF6347',
                specific.planetRing.size || 0.3,
                specific.planetRing.rotation || 0.0001,
                timestamp
            );
        }

        if (specific?.spaceshipTrails?.enabled) {
            this.applySpaceshipTrails(
                ctx,
                canvas,
                specific.spaceshipTrails.color || '#00FFFF',
                specific.spaceshipTrails.intensity || 0.7,
                timestamp
            );
        }
    },

    // Initialize stars for starfield effect
    _initStars(count = 200) {
        this._stars = [];
        for (let i = 0; i < count; i++) {
            this._stars.push({
                x: Math.random() * 2 - 1, // -1 to 1
                y: Math.random() * 2 - 1, // -1 to 1
                z: Math.random(),         // 0 to 1 (depth)
                size: Math.random() * 2 + 1,
                color: `rgba(255, 255, 255, ${0.5 + Math.random() * 0.5})`
            });
        }
    }, applyStarfield(ctx, canvas, starCount = 200, warpSpeed = 0.8, timestamp) {
        const { width, height } = canvas;
        const time = timestamp / 1000;

        // Initialize stars if not already done
        if (!this._stars || this._stars.length !== starCount) {
            this._initStars(starCount);
        }

        ctx.save();

        // Update and draw stars
        this._stars.forEach(star => {
            // Move star toward viewer (decrease z)
            star.z -= warpSpeed * 0.01;

            // If star passes viewer, reset it far away
            if (star.z <= 0) {
                star.z = 1;
                star.x = Math.random() * 2 - 1;
                star.y = Math.random() * 2 - 1;
            }

            // Calculate screen position based on 3D coordinates
            const screenX = (star.x / star.z) * width + width / 2;
            const screenY = (star.y / star.z) * height + height / 2;

            // Calculate size based on depth (closer = bigger)
            const screenSize = star.size / star.z;

            // Draw star
            ctx.fillStyle = star.color;
            ctx.beginPath();
            ctx.arc(screenX, screenY, screenSize, 0, Math.PI * 2);
            ctx.fill();

            // Draw warp streak for closer stars
            if (star.z < 0.3) {
                const streakLength = (0.3 - star.z) * 100 * warpSpeed;

                ctx.beginPath();
                ctx.moveTo(screenX, screenY);
                ctx.lineTo(
                    screenX + (screenX - width / 2) * streakLength / width,
                    screenY + (screenY - height / 2) * streakLength / height
                );
                ctx.strokeStyle = star.color;
                ctx.lineWidth = screenSize * 0.5;
                ctx.stroke();
            }
        });

        ctx.restore();
    },

    // Apply nebula effect to create a cosmic cloud background
    applyNebulaEffect(ctx, canvas, colors = ['#7b68ee', '#4b0082', '#9932cc', '#8a2be2'], intensity = 0.6, timestamp) {
        const { width, height } = canvas;
        const time = timestamp / 10000; // Slow movement

        ctx.save();

        // Create multiple layers of nebula clouds
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = intensity * 0.7;

        // Initialize nebula clouds if needed
        if (!this._nebulaClouds) {
            this._nebulaClouds = [];
            for (let i = 0; i < 5; i++) {
                this._nebulaClouds.push({
                    x: Math.random() * width,
                    y: Math.random() * height,
                    size: 100 + Math.random() * 200,
                    speed: 0.0001 + Math.random() * 0.0002,
                    color: colors[Math.floor(Math.random() * colors.length)],
                    seed: Math.random() * 100
                });
            }
        }

        // Draw each cloud layer
        this._nebulaClouds.forEach((cloud, index) => {
            // Update cloud position with slow movement
            cloud.x += Math.sin(time * cloud.speed + cloud.seed) * 0.5;
            cloud.y += Math.cos(time * cloud.speed + cloud.seed * 2) * 0.3;

            // Create a complex cloud shape
            const gradient = ctx.createRadialGradient(
                cloud.x, cloud.y, 0,
                cloud.x, cloud.y, cloud.size
            );

            gradient.addColorStop(0, `${cloud.color}${Math.floor(intensity * 80).toString(16).padStart(2, '0')}`);
            gradient.addColorStop(0.4, `${cloud.color}${Math.floor(intensity * 40).toString(16).padStart(2, '0')}`);
            gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

            // Create complex cloud shape
            ctx.fillStyle = gradient;
            ctx.beginPath();

            // Create a nebula shape with bezier curves
            const points = 8;
            const angleStep = (Math.PI * 2) / points;
            let angle = cloud.seed;

            // First point
            const startX = cloud.x + Math.cos(angle) * cloud.size * (0.7 + Math.sin(time + cloud.seed) * 0.3);
            const startY = cloud.y + Math.sin(angle) * cloud.size * (0.7 + Math.cos(time + cloud.seed) * 0.3);
            ctx.moveTo(startX, startY);

            // Connect with bezier curves
            for (let i = 0; i < points; i++) {
                angle += angleStep;
                const nextAngle = angle + angleStep;

                const currentX = cloud.x + Math.cos(angle) * cloud.size * (0.7 + Math.sin(time + angle + cloud.seed) * 0.3);
                const currentY = cloud.y + Math.sin(angle) * cloud.size * (0.7 + Math.cos(time + angle + cloud.seed) * 0.3);

                const nextX = cloud.x + Math.cos(nextAngle) * cloud.size * (0.7 + Math.sin(time + nextAngle + cloud.seed) * 0.3);
                const nextY = cloud.y + Math.sin(nextAngle) * cloud.size * (0.7 + Math.cos(time + nextAngle + cloud.seed) * 0.3);

                const cp1x = currentX + (nextX - currentX) * 0.5 - (nextY - currentY) * 0.2;
                const cp1y = currentY + (nextY - currentY) * 0.5 + (nextX - currentX) * 0.2;

                ctx.bezierCurveTo(
                    currentX, currentY,
                    cp1x, cp1y,
                    nextX, nextY
                );
            }

            ctx.closePath();
            ctx.fill();

            // Add some stars inside the nebula for extra effect
            for (let i = 0; i < 15; i++) {
                const starX = cloud.x + (Math.random() - 0.5) * cloud.size * 1.5;
                const starY = cloud.y + (Math.random() - 0.5) * cloud.size * 1.5;
                const starSize = 1 + Math.random() * 3;
                const starOpacity = 0.5 + Math.random() * 0.5;

                ctx.fillStyle = `rgba(255, 255, 255, ${starOpacity})`;
                ctx.beginPath();
                ctx.arc(starX, starY, starSize, 0, Math.PI * 2);
                ctx.fill();
            }
        });

        ctx.restore();
    },

    // Apply planet with rings (Saturn-like)
    applyPlanetRing(ctx, canvas, planetColor = '#FF6347', size = 0.3, rotationSpeed = 0.0001, timestamp) {
        const { width, height } = canvas;
        const planetX = width * 0.8;
        const planetY = height * 0.3;
        const planetRadius = Math.min(width, height) * size;

        // Calculate rotation angle based on time
        const rotationAngle = timestamp * rotationSpeed;

        ctx.save();

        // Draw planet
        const planetGradient = ctx.createRadialGradient(
            planetX - planetRadius * 0.2, planetY - planetRadius * 0.2, 0,
            planetX, planetY, planetRadius
        );

        // Create realistic planet coloring
        planetGradient.addColorStop(0, lightenColor(planetColor, 30));
        planetGradient.addColorStop(0.7, planetColor);
        planetGradient.addColorStop(1, darkenColor(planetColor, 30));

        ctx.fillStyle = planetGradient;
        ctx.beginPath();
        ctx.arc(planetX, planetY, planetRadius, 0, Math.PI * 2);
        ctx.fill();

        // Add surface details
        ctx.globalCompositeOperation = 'multiply';

        // Create some cloud/surface patterns
        for (let i = 0; i < 5; i++) {
            const bandY = planetY - planetRadius * 0.5 + i * planetRadius * 0.25;
            const bandWidth = planetRadius * 0.2;

            ctx.fillStyle = `rgba(0, 0, 0, 0.1)`;
            ctx.beginPath();
            ctx.ellipse(
                planetX,
                bandY,
                planetRadius * 0.9,
                bandWidth,
                0, 0, Math.PI * 2
            );
            ctx.fill();
        }

        // Reset composition mode
        ctx.globalCompositeOperation = 'source-over';

        // Draw rings around planet
        ctx.translate(planetX, planetY);
        ctx.rotate(rotationAngle);

        // Create rings with gradient
        const ringOuterRadius = planetRadius * 2;
        const ringInnerRadius = planetRadius * 1.2;

        const ringGradient = ctx.createRadialGradient(
            0, 0, ringInnerRadius,
            0, 0, ringOuterRadius
        );

        // Create colorful, semi-transparent rings
        ringGradient.addColorStop(0, 'rgba(255, 215, 0, 0.8)'); // Gold
        ringGradient.addColorStop(0.3, 'rgba(222, 184, 135, 0.6)'); // Tan
        ringGradient.addColorStop(0.5, 'rgba(210, 180, 140, 0.4)'); // Light tan
        ringGradient.addColorStop(0.7, 'rgba(245, 222, 179, 0.3)'); // Wheat
        ringGradient.addColorStop(1, 'rgba(255, 248, 220, 0.1)'); // Cornsilk

        // Draw ring shape
        ctx.globalAlpha = 0.8;
        ctx.beginPath();
        ctx.ellipse(0, 0, ringOuterRadius, ringOuterRadius * 0.2, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.globalCompositeOperation = 'destination-out';
        ctx.beginPath();
        ctx.ellipse(0, 0, ringInnerRadius, ringInnerRadius * 0.2, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    },

    // Apply spaceship engine trails
    applySpaceshipTrails(ctx, canvas, color = '#00FFFF', intensity = 0.7, timestamp) {
        const { width, height } = canvas;
        const time = timestamp / 1000;

        // Spaceship position - could be dynamic in a real implementation
        const shipX = width * 0.3;
        const shipY = height * 0.7;
        const shipWidth = 80;
        const shipHeight = 40;

        ctx.save();

        // Create engine exhaust particles
        if (!this._engineParticles) {
            this._engineParticles = [];
            for (let i = 0; i < 40; i++) {
                this._engineParticles.push({
                    x: 0,
                    y: 0,
                    size: 1 + Math.random() * 3,
                    vx: -2 - Math.random() * 4,
                    vy: (Math.random() - 0.5) * 1,
                    life: Math.random(),
                    maxLife: 0.7 + Math.random() * 0.5,
                    hue: Math.random() * 60 // Blue to cyan variations
                });
            }
        }

        // Engine positions
        const enginePositions = [
            { x: shipX - shipWidth / 2, y: shipY - shipHeight / 6 },
            { x: shipX - shipWidth / 2, y: shipY + shipHeight / 6 }
        ];

        // Process each engine particle
        ctx.globalCompositeOperation = 'lighter';

        this._engineParticles.forEach(particle => {
            // Reset dead particles
            if (particle.life >= particle.maxLife) {
                const enginePos = enginePositions[Math.floor(Math.random() * enginePositions.length)];
                particle.x = enginePos.x;
                particle.y = enginePos.y;
                particle.life = 0;
                particle.size = 1 + Math.random() * 3;
                particle.vx = -2 - Math.random() * 4;
                particle.vy = (Math.random() - 0.5) * 1;
            }

            // Update particle position
            particle.x += particle.vx;
            particle.y += particle.vy;
            particle.life += 0.01;

            // Calculate opacity based on life
            const opacity = intensity * (1 - particle.life / particle.maxLife);

            // Draw particle with glow
            const particleGradient = ctx.createRadialGradient(
                particle.x, particle.y, 0,
                particle.x, particle.y, particle.size * 3
            );

            const baseColor = `hsl(${180 + particle.hue}, 100%, 50%)`;
            particleGradient.addColorStop(0, `${baseColor}`);
            particleGradient.addColorStop(0.4, `${color}${Math.floor(opacity * 255).toString(16).padStart(2, '0')}`);
            particleGradient.addColorStop(1, `${color}00`);

            ctx.fillStyle = particleGradient;
            ctx.beginPath();
            ctx.arc(particle.x, particle.y, particle.size * 3, 0, Math.PI * 2);
            ctx.fill();

            // Draw a brighter core
            ctx.fillStyle = `rgba(255, 255, 255, ${opacity * 0.8})`;
            ctx.beginPath();
            ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            ctx.fill();
        });

        ctx.restore();
    }
};


// Helper functions for color manipulation
function lightenColor(color, percent) {
    const num = parseInt(color.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const r = (num >> 16) + amt;
    const g = (num >> 8 & 0x00FF) + amt;
    const b = (num & 0x0000FF) + amt;

    return '#' + (
        0x1000000 +
        (r < 255 ? r : 255) * 0x10000 +
        (g < 255 ? g : 255) * 0x100 +
        (b < 255 ? b : 255)
    ).toString(16).slice(1);
}

function darkenColor(color, percent) {
    const num = parseInt(color.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const r = (num >> 16) - amt;
    const g = (num >> 8 & 0x00FF) - amt;
    const b = (num & 0x0000FF) - amt;

    return '#' + (
        0x1000000 +
        (r > 0 ? r : 0) * 0x10000 +
        (g > 0 ? g : 0) * 0x100 +
        (b > 0 ? b : 0)
    ).toString(16).slice(1);
}


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