/**
 * Spinner renderer for bonus games
 * Handles drawing the spinning reel and spin button with enhanced 3D graphics
 */

/**
 * Draw the spinner with current state
 *
 * @param {Object} ctx - Canvas rendering context
 * @param {number} canvasWidth - Canvas width
 * @param {number} canvasHeight - Canvas height
 * @param {Object} spinnerState - Current spinner state
 * @param {boolean} spinnerState.isSpinning - Whether spinner is currently spinning
 * @param {number} spinnerState.spinStartTime - Time when spin started
 * @param {number|null} spinnerState.currentRoll - Predetermined final roll value (1-based) or null
 * @param {Array} spinnerState.symbols - Array of symbols (numbers) on the spinner (e.g., [1, 2, 3, 4, 5, 6])
 * @param {number} remainingSpins - Number of remaining spins
 * @param {boolean} gameOver - Whether game is over
 * @param {boolean} movingPlayer - Whether player is currently moving
 * @param {number} totalWin - Total win amount to display
 */
export function drawSpinner(ctx, canvasWidth, canvasHeight, spinnerState, remainingSpins, gameOver, movingPlayer, totalWin = 0) {
    // Spinner dimensions and position
    const spinnerWidth = 90;
    const spinnerHeight = 90; // Height of the visible window
    const spinnerX = canvasWidth - spinnerWidth - 30;
    const spinnerY = canvasHeight - spinnerHeight - 70;
    const frameBorderWidth = 6; // Thickness of the frame edge

    // --- 1. Draw Frame Background (Slightly larger for bevel effect) ---
    const frameX = spinnerX - frameBorderWidth;
    const frameY = spinnerY - frameBorderWidth;
    const frameWidth = spinnerWidth + 2 * frameBorderWidth;
    const frameHeight = spinnerHeight + 2 * frameBorderWidth;

    // Base color (e.g., dark metallic grey)
    ctx.fillStyle = '#4a4a4a'; // Darker base for the frame
    ctx.fillRect(frameX, frameY, frameWidth, frameHeight);

    // --- 2. Draw Frame Bevels (Highlights & Shadows) ---
    // Simulate light from top-left
    const highlightColor = '#cccccc'; // Light grey/silver
    const shadowColor = '#2a2a2a'; // Very dark grey

    // Top highlight
    ctx.fillStyle = highlightColor;
    ctx.fillRect(frameX, frameY, frameWidth, frameBorderWidth);
    // Left highlight
    ctx.fillRect(frameX, frameY + frameBorderWidth, frameBorderWidth, frameHeight - frameBorderWidth);

    // Bottom shadow
    ctx.fillStyle = shadowColor;
    ctx.fillRect(frameX + frameBorderWidth, frameY + frameHeight - frameBorderWidth, frameWidth - frameBorderWidth, frameBorderWidth);
    // Right shadow
    ctx.fillRect(frameX + frameWidth - frameBorderWidth, frameY + frameBorderWidth, frameBorderWidth, frameHeight - frameBorderWidth);

    // --- 3. Draw Inner Shadow (Making the reel look recessed) ---
    const innerShadowColor = 'rgba(0, 0, 0, 0.5)'; // Semi-transparent black
    const innerShadowBlur = 8;
    const innerShadowOffsetX = 2; // Shadow slightly offset down and right
    const innerShadowOffsetY = 2;

    ctx.save(); // Save context before applying shadow
    ctx.shadowColor = innerShadowColor;
    ctx.shadowBlur = innerShadowBlur;
    ctx.shadowOffsetX = innerShadowOffsetX;
    ctx.shadowOffsetY = innerShadowOffsetY;

    // Draw a shape that will *cast* the shadow inwards onto the reel area
    // We draw the *frame's inner edge* path but don't fill/stroke it visibly here.
    // The shadow effect will be applied to this path.
    // Note: Clipping might interfere with shadow rendering this way sometimes.
    // Alternative: Draw a dark gradient overlay just inside the frame later.
    // Let's try the gradient overlay method as it's more reliable with clipping.
    ctx.restore(); // Restore context (no shadow applied yet)

    // Draw Inner Shadow Gradient Overlay (More reliable method)
    const innerGradient = ctx.createLinearGradient(spinnerX, spinnerY, spinnerX, spinnerY + spinnerHeight);
    innerGradient.addColorStop(0, 'rgba(0, 0, 0, 0.6)'); // Darker at the top edge
    innerGradient.addColorStop(0.15, 'rgba(0, 0, 0, 0)'); // Fade out quickly
    innerGradient.addColorStop(0.85, 'rgba(0, 0, 0, 0)'); // Transparent in the middle
    innerGradient.addColorStop(1, 'rgba(0, 0, 0, 0.6)'); // Darker at the bottom edge
    ctx.fillStyle = innerGradient;
    ctx.fillRect(spinnerX, spinnerY, spinnerWidth, spinnerHeight); // Draw OVER the reel area before clipping

    const sideGradient = ctx.createLinearGradient(spinnerX, spinnerY, spinnerX + spinnerWidth, spinnerY);
    sideGradient.addColorStop(0, 'rgba(0, 0, 0, 0.6)'); // Darker at the left edge
    sideGradient.addColorStop(0.15, 'rgba(0, 0, 0, 0)'); // Fade out
    sideGradient.addColorStop(0.85, 'rgba(0, 0, 0, 0)'); // Transparent
    sideGradient.addColorStop(1, 'rgba(0, 0, 0, 0.6)'); // Darker at the right edge
    ctx.fillStyle = sideGradient;
    ctx.fillRect(spinnerX, spinnerY, spinnerWidth, spinnerHeight); // Draw OVER the reel area


    // --- Symbol Calculation (No Changes Here) ---
    if (!spinnerState.symbols || spinnerState.symbols.length === 0) {
        drawFooter(ctx, canvasWidth, canvasHeight, spinnerState, remainingSpins, gameOver, movingPlayer, totalWin);
        return;
    }
    const symbolCount = spinnerState.symbols.length;
    const symbolHeight = spinnerHeight;
    const targetIndex = (spinnerState.currentRoll !== null && spinnerState.currentRoll > 0)
        ? (spinnerState.currentRoll - 1 + symbolCount) % symbolCount
        : 0;
    const targetOffsetY = targetIndex * symbolHeight;
    let offsetY = 0;
    const spinDuration = 2000;

    if (spinnerState.isSpinning && spinnerState.spinStartTime > 0 && spinnerState.currentRoll !== null) {
        const currentTime = performance.now();
        const elapsed = currentTime - spinnerState.spinStartTime;
        const progress = Math.min(1, elapsed / spinDuration);
        const easedProgress = 1 - Math.pow(1 - progress, 4);
        const numberOfFullSpins = 5;
        const totalRotationOffset = numberOfFullSpins * symbolCount * symbolHeight;
        const totalDistance = totalRotationOffset + targetOffsetY;
        const currentAnimatedOffset = totalDistance * easedProgress;
        offsetY = currentAnimatedOffset % (symbolCount * symbolHeight);
        if (progress >= 1.0) {
            offsetY = targetOffsetY;
        }
    } else if (spinnerState.currentRoll !== null) {
        offsetY = targetOffsetY;
    } else {
        offsetY = 0;
    }

    // --- 4. Draw Reel Content (Inside Clipping Mask) ---
    ctx.save();
    ctx.beginPath();
    ctx.rect(spinnerX, spinnerY, spinnerWidth, symbolHeight); // Clip to the inner reel area
    ctx.clip();

    // Determine drawing parameters
    const currentTopIndex = Math.floor(offsetY / symbolHeight);
    const offsetWithinSymbol = offsetY % symbolHeight;
    const numSymbolsToDraw = 3;
    const startIndexOffset = -1;

    // Draw Symbols
    for (let i = 0; i < numSymbolsToDraw; i++) {
        const relativeIndex = startIndexOffset + i;
        const symbolIndex = (currentTopIndex + relativeIndex + symbolCount) % symbolCount;
        const symbol = spinnerState.symbols[symbolIndex];
        const drawPosY = spinnerY + (relativeIndex * symbolHeight) - offsetWithinSymbol;

        if (drawPosY + symbolHeight < spinnerY || drawPosY > spinnerY + symbolHeight) {
            continue;
        }

        // Symbol Background (maybe slightly desaturated colors?)
        const colors = ['#C0392B', '#27AE60', '#2980B9', '#D35400', '#8E44AD', '#16A085']; // Slightly less vibrant
        ctx.fillStyle = colors[symbolIndex % colors.length];
        ctx.fillRect(spinnerX, drawPosY, spinnerWidth, symbolHeight);

        // Optional: Subtle pattern
        ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
        for (let j = 0; j < 5; j++) {
            ctx.fillRect(spinnerX + (j * spinnerWidth / 10), drawPosY, spinnerWidth / 20, symbolHeight);
        }

        // Draw Symbol Value (Number) with a subtle shadow for depth
        ctx.save(); // Save before applying text shadow
        ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
        ctx.shadowBlur = 3;
        ctx.shadowOffsetX = 1;
        ctx.shadowOffsetY = 2; // Shadow down and right

        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${Math.floor(symbolHeight * 0.6)}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(symbol.toString(), spinnerX + spinnerWidth / 2, drawPosY + symbolHeight / 2);

        ctx.restore(); // Restore context (remove text shadow)

        // Optional: Text outline (can make text clearer)
        // ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
        // ctx.lineWidth = 1;
        // ctx.strokeText(symbol.toString(), spinnerX + spinnerWidth / 2, drawPosY + symbolHeight / 2);
    }

    // --- 5. Draw Reel Shading (Inside Clip Mask, Over Symbols) ---
    // Add a subtle curve effect using gradients at top/bottom of the visible area
    const reelShadeHeight = spinnerHeight * 0.3; // How far the shade extends
    const topShade = ctx.createLinearGradient(spinnerX, spinnerY, spinnerX, spinnerY + reelShadeHeight);
    topShade.addColorStop(0, 'rgba(0, 0, 0, 0.4)'); // Darker at the very top
    topShade.addColorStop(1, 'rgba(0, 0, 0, 0)'); // Fades to transparent

    const bottomShade = ctx.createLinearGradient(spinnerX, spinnerY + spinnerHeight - reelShadeHeight, spinnerX, spinnerY + spinnerHeight);
    bottomShade.addColorStop(0, 'rgba(0, 0, 0, 0)'); // Starts transparent
    bottomShade.addColorStop(1, 'rgba(0, 0, 0, 0.4)'); // Darker at the very bottom

    ctx.fillStyle = topShade;
    ctx.fillRect(spinnerX, spinnerY, spinnerWidth, reelShadeHeight);
    ctx.fillStyle = bottomShade;
    ctx.fillRect(spinnerX, spinnerY + spinnerHeight - reelShadeHeight, spinnerWidth, reelShadeHeight);

    // --- 6. Restore Context (Remove Clipping) ---
    ctx.restore();

    // --- 7. Draw Bright Inner Frame Highlight (on top of everything except markers) ---
    // This makes the edge separating the frame and reel sharp
    ctx.strokeStyle = '#ffffff'; // Bright white or light yellow
    ctx.lineWidth = 1; // Thin sharp line
    ctx.strokeRect(spinnerX - 0.5, spinnerY - 0.5, spinnerWidth + 1, spinnerHeight + 1); // Offset slightly for sharpness


    // --- 8. Draw Marker Triangles (with Gradient/Shadow) ---
    ctx.save(); // Save before shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetX = 1;
    ctx.shadowOffsetY = 1;

    // Use a gradient for the markers
    const markerGradient = ctx.createLinearGradient(0, spinnerY + spinnerHeight / 2 - 10, 0, spinnerY + spinnerHeight / 2 + 10);
    markerGradient.addColorStop(0, '#ffeeaa'); // Lighter yellow
    markerGradient.addColorStop(1, '#ffcc00'); // Original yellow

    ctx.fillStyle = markerGradient;
    const triangleBase = 10;
    const triangleHeight = 10;
    const markerOffset = 5; // How far the base of the triangle is from the frame

    // Left triangle
    ctx.beginPath();
    ctx.moveTo(spinnerX - triangleBase - markerOffset, spinnerY + spinnerHeight / 2); // Point tip left
    ctx.lineTo(spinnerX - markerOffset, spinnerY + spinnerHeight / 2 - triangleHeight / 2);
    ctx.lineTo(spinnerX - markerOffset, spinnerY + spinnerHeight / 2 + triangleHeight / 2);
    ctx.closePath();
    ctx.fill();

    // Right triangle
    ctx.beginPath();
    ctx.moveTo(spinnerX + spinnerWidth + triangleBase + markerOffset, spinnerY + spinnerHeight / 2); // Point tip right
    ctx.lineTo(spinnerX + spinnerWidth + markerOffset, spinnerY + spinnerHeight / 2 - triangleHeight / 2);
    ctx.lineTo(spinnerX + spinnerWidth + markerOffset, spinnerY + spinnerHeight / 2 + triangleHeight / 2);
    ctx.closePath();
    ctx.fill();

    ctx.restore(); // Restore context (remove shadow)


    // --- 9. Draw Footer ---
    drawFooter(ctx, canvasWidth, canvasHeight, spinnerState, remainingSpins, gameOver, movingPlayer, totalWin);

    // --- 10. Game Over Message ---
    if (gameOver && !movingPlayer) {
        // ... (Game Over drawing code remains the same)
        ctx.fillStyle = '#ff9900';
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('GAME OVER', canvasWidth / 2, canvasHeight - 130);
    }
}

// --- Helper Functions (isSpinButtonClicked, drawFooter) remain the same ---
// Make sure they are accessible/defined.


/**
 * Check if the spin button was clicked
 * 
 * @param {number} x - Mouse x coordinate
 * @param {number} y - Mouse y coordinate
 * @param {number} canvasWidth - Canvas width
 * @param {number} canvasHeight - Canvas height
 * @param {boolean} isSpinning - Whether spinner is currently spinning
 * @param {boolean} isMoving - Whether player is currently moving
 * @param {boolean} gameOver - Whether game is over
 * @param {boolean} showingWinScreen - Whether win screen is showing
 * @param {number} remainingSpins - Number of remaining spins
 * @returns {boolean} Whether spin button was clicked
 */
export function isSpinButtonClicked(x, y, canvasWidth, canvasHeight, isSpinning, isMoving, gameOver, showingWinScreen, remainingSpins) {
    // If already spinning, moving, game over, or showing win screen, button is not active
    if (isSpinning || isMoving || gameOver || showingWinScreen || remainingSpins <= 0) {
        return false;
    }

    // Calculate spin button position in footer - RIGHT side positioning
    const footerHeight = 60;
    const buttonWidth = 120;
    const buttonHeight = 40;
    const buttonX = canvasWidth - buttonWidth - 30; // RIGHT side of footer
    const buttonY = canvasHeight - footerHeight + (footerHeight - buttonHeight) / 2; // Centered in footer height

    // Check if click is within button bounds
    return x >= buttonX && x <= buttonX + buttonWidth && y >= buttonY && y <= buttonY + buttonHeight;
}

/**
 * Draw footer with game information
 * Contains: remaining spins (left), game name (center), spin button (right)
 * 
 * @param {Object} ctx - Canvas rendering context
 * @param {number} canvasWidth - Canvas width
 * @param {number} canvasHeight - Canvas height
 * @param {Object} spinnerState - Current spinner state
 * @param {number} remainingSpins - Number of remaining spins
 * @param {boolean} gameOver - Whether game is over
 * @param {boolean} movingPlayer - Whether player is currently moving
 * @param {number} totalWin - Current total win amount (not shown in footer anymore)
 */
function drawFooter(ctx, canvasWidth, canvasHeight, spinnerState, remainingSpins, gameOver, movingPlayer, totalWin) {
    // Footer dimensions
    const footerHeight = 60;
    const footerY = canvasHeight - footerHeight;

    // Draw footer background
    ctx.fillStyle = '#222222';
    ctx.fillRect(0, footerY, canvasWidth, footerHeight);

    // Add a subtle top border
    ctx.strokeStyle = '#444444';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, footerY);
    ctx.lineTo(canvasWidth, footerY);
    ctx.stroke();

    // 1. DRAW GAME NAME (center) - informational only
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText("BONUS GAME", canvasWidth / 2, footerY + footerHeight / 2);

    // 2. DRAW REMAINING SPINS (left) - moved to left side
    if (remainingSpins > 0) {
        const spinsX = 100; // Left side positioning
        const spinsY = footerY + footerHeight / 2;

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 18px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`SPINS: ${remainingSpins}`, spinsX, spinsY);
    }

    // 3. DRAW SPIN BUTTON (right) - moved to right side
    if (!spinnerState.isSpinning && !movingPlayer && !gameOver && remainingSpins > 0) {
        const buttonWidth = 120;
        const buttonHeight = 40;
        const buttonX = canvasWidth - buttonWidth - 30; // Right side positioning
        const buttonY = footerY + (footerHeight - buttonHeight) / 2;

        // Button background
        const buttonGradient = ctx.createLinearGradient(0, buttonY, 0, buttonY + buttonHeight);
        buttonGradient.addColorStop(0, '#ff3366');
        buttonGradient.addColorStop(1, '#ff0033');
        ctx.fillStyle = buttonGradient;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;

        // Draw rounded rectangle
        ctx.beginPath();
        ctx.roundRect(buttonX, buttonY, buttonWidth, buttonHeight, 8);
        ctx.fill();
        ctx.stroke();

        // Draw text
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 20px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('SPIN', buttonX + buttonWidth / 2, buttonY + buttonHeight / 2);
    }
}
