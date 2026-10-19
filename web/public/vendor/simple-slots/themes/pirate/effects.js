// filepath: c:\projects\copilot-agent\theme-slots\themes\pirate\effects.js
// Pirate theme specific effects
import { EffectDefaults, EffectsHelper } from '../../shared/effects.js';
import { PirateTheme } from './theme.js';

// You can extend the base effect presets with Pirate-specific effects
export const EffectPresets = {
    ...EffectDefaults,
    enabled: true,
    backgroundEffects: {
        enabled: false
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
            color: '#431d08', // Gold for pirate treasure
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
            colors: ['#431d08'], // Gold, Orange-red, Deep blue, Emerald, Gold
            speed: 6000,
            mode: 'gradient'
        },
    },
    themeSpecific: {
        waterReflections: {
            enabled: false,
            intensity: 0.5,
            speed: 0.7
        },
        cannonSmoke: {
            enabled: true,
            intensity: 0.6,
            duration: 2000
        },
        oceanWaves: {
            enabled: false,
            waveColor: '#1e90ff',
            waveHeight: 2,
            waveSpeed: 2000,
            intensity: 0.5
        },
        shipRocking: {
            enabled: false,
            rockingAngle: 5, // Degrees
            rockingSpeed: 3000
        },
        treasureGlow: {
            enabled: false,
            glowColor: '#ffd700',
            intensity: 0.7,
            pulseSpeed: 2500
        }
    }
};

// Create ThemeEffectsHelper using a standardized name across all themes
export const ThemeEffectsHelper = {
    // Include all methods from the base EffectsHelper
    ...EffectsHelper,

    // Store particles for effects
    _particles: [],
    _bubbles: [],
    _treasureParticles: [],
    _lastWaveTime: Date.now(),
    _waveOffsets: Array(10).fill().map(() => Math.random() * 100),    // Add theme-specific effect methods with standardized naming pattern
    applyThemeEffect(ctx, canvas, intensity = 1, theme, timestamp) {
        // Standard entry point for theme-specific effects
        const specific = theme?.visualEffects?.themeSpecific || {};

        // Check if each effect is enabled and apply it
        if (specific?.waterReflections?.enabled) {
            this.applyWaterReflections(
                ctx,
                canvas,
                specific.waterReflections.intensity || 0.5,
                specific.waterReflections.speed || 0.7,
                timestamp
            );
        }

        if (specific?.cannonSmoke?.enabled) {
            this.applyCannonSmoke(
                ctx,
                canvas,
                specific.cannonSmoke.intensity || 0.6,
                specific.cannonSmoke.duration || 2000,
                timestamp
            );
        }

        if (specific?.oceanWaves?.enabled) {
            this.applyOceanWaves(
                ctx,
                canvas,
                specific.oceanWaves.waveColor || '#1e90ff',
                specific.oceanWaves.waveHeight || 10,
                specific.oceanWaves.waveSpeed || 2000,
                specific.oceanWaves.intensity || 0.5,
                timestamp
            );
        }

        if (specific?.treasureGlow?.enabled) {
            this.applyTreasureGlow(
                ctx,
                canvas,
                specific.treasureGlow.glowColor || '#ffd700',
                specific.treasureGlow.intensity || 0.7,
                specific.treasureGlow.pulseSpeed || 2500,
                timestamp
            );
        }

        if (specific?.shipRocking?.enabled) {
            this.applyShipRocking(
                ctx,
                canvas,
                specific.shipRocking.rockingAngle || 5,
                specific.shipRocking.rockingSpeed || 3000,
                timestamp
            );
        }
    },

    // Ship rocking effect - separate implementation for reuse
    applyShipRocking(ctx, canvas, rockingAngle = 5, rockingSpeed = 3000, timestamp) {
        // Calculate a more natural rocking motion by combining sine waves
        const primaryRock = Math.sin(timestamp / rockingSpeed) * (rockingAngle * 0.8);
        const secondaryRock = Math.sin(timestamp / (rockingSpeed * 0.7) + 0.5) * (rockingAngle * 0.2);
        const angle = (primaryRock + secondaryRock) * (Math.PI / 180);

        // Apply the rocking motion to the canvas
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate(angle);
        ctx.translate(-canvas.width / 2, -canvas.height / 2);
    },

    applyWaterReflections(ctx, canvas, intensity = 0.5, speed = 0.7, timestamp) {
        const { width, height } = canvas;
        const time = timestamp / 1000;

        // Create water reflections effect with more realistic looking
        ctx.save();

        // Create a gradient for water
        const gradient = ctx.createLinearGradient(0, height * 0.75, 0, height);
        gradient.addColorStop(0, 'rgba(16, 85, 145, 0.2)');
        gradient.addColorStop(0.5, 'rgba(30, 144, 255, 0.4)');
        gradient.addColorStop(1, 'rgba(65, 105, 225, 0.3)');

        // Initialize bubbles if needed
        if (this._bubbles.length === 0) {
            for (let i = 0; i < 30; i++) {
                this._bubbles.push({
                    x: Math.random() * width,
                    y: height * 0.8 + Math.random() * (height * 0.2),
                    size: 1 + Math.random() * 4,
                    speed: 0.5 + Math.random() * 1.5,
                    opacity: 0.1 + Math.random() * 0.4
                });
            }
        }

        // Draw the water base
        ctx.fillStyle = gradient;
        ctx.fillRect(0, height * 0.75, width, height * 0.25);

        // Draw water surface with ripples and highlights
        for (let i = 0; i < 8; i++) {
            // Vary opacity based on time for realistic water movement
            const opacity = intensity * (0.4 + Math.sin(time * speed + i * 0.2) * 0.2);
            ctx.globalAlpha = opacity;

            const yBase = height * 0.75 + i * 5;

            // Draw each wave line with more detail
            ctx.beginPath();
            ctx.moveTo(0, yBase);

            // Create a more complex wavy line
            for (let x = 0; x <= width; x += 10) {
                // Combine multiple sine waves for more complex water movement
                const wave1 = Math.sin(x / 120 + time * speed) * 4;
                const wave2 = Math.sin(x / 50 - time * (speed * 0.7)) * 2;
                const wave3 = Math.sin(x / 200 + time * (speed * 0.3)) * 6;

                const waveHeight = (wave1 + wave2 + wave3) * (i * 0.2 + 0.5);
                ctx.lineTo(x, yBase + waveHeight);
            }

            ctx.lineTo(width, yBase + 15);
            ctx.lineTo(width, yBase + 18);
            ctx.lineTo(0, yBase + 18);
            ctx.closePath();

            // Use a gradient fill for each wave line
            const waveGradient = ctx.createLinearGradient(0, yBase - 5, 0, yBase + 20);
            waveGradient.addColorStop(0, `rgba(255, 255, 255, ${opacity * 0.5})`);
            waveGradient.addColorStop(0.5, `rgba(173, 216, 230, ${opacity * 0.7})`);
            waveGradient.addColorStop(1, `rgba(0, 105, 148, ${opacity * 0.4})`);

            ctx.fillStyle = waveGradient;
            ctx.fill();

            // Add highlights
            if (i % 2 === 0) {
                ctx.beginPath();

                for (let x = 0; x < width; x += 150) {
                    const xPos = x + Math.sin(time * speed) * 20;
                    const yPos = yBase - 2 + Math.cos(time * speed + x * 0.01) * 3;
                    const size = 40 + Math.sin(time * speed * 0.5 + x * 0.01) * 20;

                    ctx.moveTo(xPos, yPos);
                    ctx.quadraticCurveTo(
                        xPos + size / 2, yPos - 5,
                        xPos + size, yPos
                    );
                }

                ctx.strokeStyle = `rgba(255, 255, 255, ${opacity * 0.6})`;
                ctx.lineWidth = 1.5;
                ctx.stroke();
            }
        }

        // Draw bubbles rising from the water
        ctx.globalAlpha = 1;
        this._bubbles.forEach((bubble, index) => {
            // Update bubble position
            bubble.y -= bubble.speed;
            if (bubble.y < height * 0.7) {
                // Reset bubble when it rises too high
                bubble.y = height * 0.95 + Math.random() * (height * 0.05);
                bubble.x = Math.random() * width;
            }

            // Draw bubble with gradient
            const bubbleGradient = ctx.createRadialGradient(
                bubble.x - bubble.size / 3, bubble.y - bubble.size / 3, 0,
                bubble.x, bubble.y, bubble.size
            );
            bubbleGradient.addColorStop(0, `rgba(255, 255, 255, ${bubble.opacity})`);
            bubbleGradient.addColorStop(0.7, `rgba(200, 240, 255, ${bubble.opacity * 0.5})`);
            bubbleGradient.addColorStop(1, `rgba(150, 200, 255, 0)`);

            ctx.fillStyle = bubbleGradient;
            ctx.beginPath();
            ctx.arc(bubble.x, bubble.y, bubble.size, 0, Math.PI * 2);
            ctx.fill();

            // Add highlight to bubble
            ctx.beginPath();
            ctx.arc(
                bubble.x - bubble.size / 3,
                bubble.y - bubble.size / 3,
                bubble.size / 3, 0, Math.PI * 2
            );
            ctx.fillStyle = `rgba(255, 255, 255, ${bubble.opacity * 1.5})`;
            ctx.fill();
        });

        ctx.restore();
    },

    applyCannonSmoke(ctx, canvas, intensity = 0.6, duration = 2000, timestamp) {
        const { width, height } = canvas;
        const time = Date.now();

        // Automatically trigger smoke occasionally for ambient effect
        if (!this._lastCannonTime || time - this._lastCannonTime > 10000) {
            if (Math.random() < 0.01) { // 1% chance each frame to auto-trigger
                this.triggerCannonSmoke();
            }
        }

        // Only show smoke effect for specified duration after trigger
        if (!this._lastCannonTime || time - this._lastCannonTime > duration) {
            return;
        }

        // Calculate progress of smoke effect (0 to 1)
        const progress = Math.min(1, (time - this._lastCannonTime) / duration);

        // Manage particles
        if (progress < 0.1 && this._particles.length < 30) {
            // Add new particles at the beginning of the effect
            for (let i = 0; i < 5; i++) {
                this._particles.push({
                    x: width * (0.7 + Math.random() * 0.1),
                    y: height * (0.6 + Math.random() * 0.1),
                    size: 5 + Math.random() * 10,
                    vx: -0.5 - Math.random() * 1,
                    vy: -0.5 - Math.random() * 1.5,
                    age: 0,
                    maxAge: 0.7 + Math.random() * 0.3, // Normalized age (0-1)
                    opacity: 0.7 + Math.random() * 0.3,
                    growthRate: 1.01 + Math.random() * 0.03
                });
            }
        }

        // Draw and update particles
        ctx.save();

        // Process each smoke particle
        for (let i = this._particles.length - 1; i >= 0; i--) {
            const p = this._particles[i];

            // Update particle
            p.age += 0.01;
            p.x += p.vx;
            p.y += p.vy;
            p.vx *= 0.99; // Slow down horizontal movement
            p.vy *= 0.99; // Slow down vertical movement
            p.size *= p.growthRate; // Grow the particle

            // Calculate opacity based on age
            const ageRatio = p.age / p.maxAge;
            const particleOpacity = p.opacity * (1 - ageRatio) * intensity;

            // Draw the smoke particle with more realistic appearance
            const gradient = ctx.createRadialGradient(
                p.x, p.y, 0,
                p.x, p.y, p.size
            );

            gradient.addColorStop(0, `rgba(255, 255, 255, ${particleOpacity * 0.8})`);
            gradient.addColorStop(0.4, `rgba(200, 200, 200, ${particleOpacity * 0.6})`);
            gradient.addColorStop(0.7, `rgba(150, 150, 150, ${particleOpacity * 0.4})`);
            gradient.addColorStop(1, `rgba(100, 100, 100, 0)`);

            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();

            // Remove old particles
            if (p.age >= p.maxAge) {
                this._particles.splice(i, 1);
            }
        }

        ctx.restore();
    },

    applyOceanWaves(ctx, canvas, waveColor = '#1e90ff', waveHeight = 10, waveSpeed = 2000, intensity = 0.5, timestamp) {
        const { width, height } = canvas;
        const time = timestamp / waveSpeed;

        // Create a realistic ocean horizon in the distance
        ctx.save();

        // Draw sky-ocean horizon
        const horizonY = height * 0.35;
        const horizonGradient = ctx.createLinearGradient(0, horizonY - 40, 0, horizonY + 40);
        horizonGradient.addColorStop(0, 'rgba(135, 206, 235, 0.8)'); // Sky blue 
        horizonGradient.addColorStop(0.5, 'rgba(30, 144, 255, 0.7)'); // Dodger blue
        horizonGradient.addColorStop(1, 'rgba(0, 105, 148, 0.6)'); // Deep blue

        ctx.fillStyle = horizonGradient;
        ctx.fillRect(0, horizonY - 40, width, 80);

        // Draw distant waves on the horizon
        ctx.globalAlpha = 0.7 * intensity;
        for (let i = 0; i < 6; i++) {
            ctx.beginPath();
            const baseY = horizonY + i * 5;
            ctx.moveTo(0, baseY);

            // Create a wavy horizon line
            for (let x = 0; x <= width; x += 20) {
                const waveOffset = Math.sin(x / 200 + time + i) * 2;
                ctx.lineTo(x, baseY + waveOffset);
            }
            ctx.lineTo(width, baseY + 10);
            ctx.lineTo(width, baseY + 12);
            ctx.lineTo(0, baseY + 12);
            ctx.closePath();

            const waveGradient = ctx.createLinearGradient(0, baseY, 0, baseY + 12);
            waveGradient.addColorStop(0, 'rgba(240, 248, 255, 0.4)'); // Wave crest
            waveGradient.addColorStop(0.5, `rgba(30, 144, 255, 0.3)`); // Wave middle
            waveGradient.addColorStop(1, 'rgba(25, 25, 112, 0.2)'); // Wave bottom
            ctx.fillStyle = waveGradient;
            ctx.fill();
        }

        // Draw more prominent waves in the midground
        const midY = height * 0.55;
        ctx.globalAlpha = 0.85 * intensity;

        // Update wave time
        const now = Date.now();
        const waveDelta = (now - this._lastWaveTime) / 1000;
        this._lastWaveTime = now;

        // Draw multiple wave layers
        for (let layer = 0; layer < 3; layer++) {
            const layerIntensity = 1 - (layer * 0.3); // Reduce intensity for background layers
            const layerHeight = waveHeight * layerIntensity;
            const yPos = midY + layer * 30;

            // Draw a complex wave pattern
            ctx.beginPath();
            ctx.moveTo(0, yPos);

            for (let x = 0; x <= width; x += 5) {
                // Combine multiple sine waves for realistic ocean movement
                let totalHeight = 0;

                // Use several overlapping waves with different frequencies
                for (let w = 0; w < this._waveOffsets.length; w++) {
                    const frequency = 0.005 + (w * 0.002);
                    const waveContribution = Math.sin((x * frequency) + time + this._waveOffsets[w]) * (layerHeight / (w + 1));
                    totalHeight += waveContribution;
                }

                // Create occasional larger waves
                if ((x % 200) < 50) {
                    totalHeight *= 1.5;
                }

                ctx.lineTo(x, yPos + totalHeight);
            }

            ctx.lineTo(width, yPos + 50);
            ctx.lineTo(width, yPos + 50 + layerHeight);
            ctx.lineTo(0, yPos + 50 + layerHeight);
            ctx.closePath();

            // Create gradient for the wave
            const oceanGradient = ctx.createLinearGradient(0, yPos - layerHeight, 0, yPos + 50 + layerHeight);
            oceanGradient.addColorStop(0, 'rgba(240, 248, 255, 0.9)'); // White caps
            oceanGradient.addColorStop(0.1, 'rgba(173, 216, 230, 0.8)'); // Light blue
            oceanGradient.addColorStop(0.4, `rgba(30, 144, 255, 0.7)`); // Wave body
            oceanGradient.addColorStop(1, 'rgba(25, 25, 112, 0.6)'); // Deep water

            ctx.fillStyle = oceanGradient;
            ctx.fill();

            // Add wave highlights (white foam on crests)
            ctx.beginPath();
            for (let x = 0; x < width; x += 40) {
                // Calculate position based on combined waves
                let totalHeight = 0;
                for (let w = 0; w < this._waveOffsets.length; w++) {
                    const frequency = 0.005 + (w * 0.002);
                    const waveContribution = Math.sin((x * frequency) + time + this._waveOffsets[w]) * (layerHeight / (w + 1));
                    totalHeight += waveContribution;
                }

                // Only draw foam on wave crests (negative height values)
                if (totalHeight < -layerHeight * 0.3) {
                    const foamWidth = Math.random() * 20 + 10;
                    ctx.moveTo(x, yPos + totalHeight);
                    ctx.quadraticCurveTo(
                        x + foamWidth / 2, yPos + totalHeight - 2,
                        x + foamWidth, yPos + totalHeight
                    );
                }
            }
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
            ctx.lineWidth = 2;
            ctx.stroke();
        }

        ctx.restore();
    },

    applyTreasureGlow(ctx, canvas, glowColor = '#ffd700', intensity = 0.7, pulseSpeed = 2500, timestamp) {
        const { width, height } = canvas;
        const time = timestamp / pulseSpeed;

        // Calculate glowing intensity with pulsing effect
        const pulseIntensity = 0.5 + Math.sin(time) * 0.5;
        const currentIntensity = intensity * pulseIntensity;

        // Draw treasure chest with glowing effect
        ctx.save();

        // Position for treasure chest
        const chestX = width * 0.8;
        const chestY = height * 0.7;
        const chestWidth = 120;
        const chestHeight = 80;

        // Draw treasure glow behind the chest (this would be behind your actual chest image)
        const gradient = ctx.createRadialGradient(
            chestX, chestY, 0,
            chestX, chestY, chestWidth
        );

        // Create gold/amber glow with transparency
        gradient.addColorStop(0, `rgba(255, 223, 0, ${currentIntensity * 0.8})`);
        gradient.addColorStop(0.3, `rgba(255, 165, 0, ${currentIntensity * 0.5})`);
        gradient.addColorStop(0.7, `rgba(184, 134, 11, ${currentIntensity * 0.3})`);
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.ellipse(chestX, chestY, chestWidth, chestHeight / 1.5, 0, 0, Math.PI * 2);
        ctx.fill();

        // If no treasure particles exist yet, create them
        if (this._treasureParticles.length === 0) {
            for (let i = 0; i < 20; i++) {
                this._treasureParticles.push({
                    x: chestX + (Math.random() * 80 - 40),
                    y: chestY + (Math.random() * 40 - 20),
                    size: 1 + Math.random() * 3,
                    speed: 0.2 + Math.random() * 0.8,
                    angle: Math.random() * Math.PI * 2,
                    rotationSpeed: 0.01 + Math.random() * 0.03,
                    opacity: 0.3 + Math.random() * 0.7
                });
            }
        }

        // Draw sparkling particles floating around the treasure
        this._treasureParticles.forEach(particle => {
            // Update particle position in a circular motion around chest
            particle.angle += particle.rotationSpeed;
            particle.x = chestX + Math.cos(particle.angle) * (20 + Math.sin(time * 2) * 10);
            particle.y = chestY + Math.sin(particle.angle) * (15 + Math.sin(time * 3) * 5) - 20;

            // Make the particle pulsate
            const particleSize = particle.size * (0.8 + Math.sin(time * 3 + particle.angle) * 0.2);

            // Draw the particle with a star shape for sparkle
            const particleOpacity = particle.opacity * currentIntensity;
            ctx.fillStyle = `rgba(255, 215, 0, ${particleOpacity})`;

            // Draw a 4-point star
            ctx.beginPath();
            for (let i = 0; i < 8; i++) {
                const starAngle = i * Math.PI / 4;
                const radius = i % 2 === 0 ? particleSize * 2 : particleSize;
                const ptX = particle.x + Math.cos(starAngle + time) * radius;
                const ptY = particle.y + Math.sin(starAngle + time) * radius;

                if (i === 0) ctx.moveTo(ptX, ptY);
                else ctx.lineTo(ptX, ptY);
            }
            ctx.closePath();
            ctx.fill();

            // Add a glowing halo around the particle
            const particleGlow = ctx.createRadialGradient(
                particle.x, particle.y, 0,
                particle.x, particle.y, particleSize * 4
            );

            particleGlow.addColorStop(0, `rgba(255, 215, 0, ${particleOpacity * 0.7})`);
            particleGlow.addColorStop(0.5, `rgba(255, 165, 0, ${particleOpacity * 0.3})`);
            particleGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');

            ctx.fillStyle = particleGlow;
            ctx.beginPath();
            ctx.arc(particle.x, particle.y, particleSize * 4, 0, Math.PI * 2);
            ctx.fill();
        });

        ctx.restore();
    },

    // Method to trigger cannon smoke effect
    triggerCannonSmoke() {
        this._lastCannonTime = Date.now();
    }
};

export function renderEpicWinAnimation(ctx, canvas, elapsedTime, deltaTime, winAmount) {
    const config = PirateTheme.visualEffects?.themeSpecific?.epicWinAnimation || {};
    const duration = config.duration || 5000;
    const progress = Math.min(1.0, elapsedTime / duration);

    // Epic win animation implementation
    // Trigger cannon smoke effect
    if (progress < 0.1 && ThemeEffectsHelper.triggerCannonSmoke) {
        ThemeEffectsHelper.triggerCannonSmoke();
    }

    return progress < 1.0; // Return true while animation is ongoing
}

export default {
    ThemeEffectsHelper,
    renderEpicWinAnimation
};
