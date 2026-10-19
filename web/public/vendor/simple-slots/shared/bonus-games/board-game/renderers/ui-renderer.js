/**
 * UI renderer for bonus games
 * Handles drawing UI elements, win screen, and effects
 */

/**
 * Draws general UI elements like title, instructions, and win amount
 * 
 * @param {Object} ctx - Canvas rendering context
 * @param {number} canvasWidth - Canvas width
 * @param {number} canvasHeight - Canvas height
 * @param {Object} gameState - Current game state
 * @param {number} gameState.position - Current player position
 * @param {number} gameState.totalWin - Current total win amount
 * @param {Array} board - Game board array
 * @param {Object} textConfig - Text configuration
 */
export function drawUI(ctx, canvasWidth, canvasHeight, gameState, board, textConfig) {
    const { position, totalWin } = gameState;

    // Draw title
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 28px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(
        textConfig.title,
        canvasWidth / 2,
        50
    );

    // Draw instructions
    ctx.font = '18px Arial';
    ctx.fillText(
        textConfig.instructions,
        canvasWidth / 2,
        80
    );

    // Draw player position indicator
    ctx.font = '16px Arial';
    ctx.fillText(
        `Current Position: ${position + 1} of ${board.length}`,
        canvasWidth / 2,
        110
    );

    // Draw accumulated win amount prominently
    drawWinBox(ctx, totalWin);
}

/**
 * Draws the win amount box in the bottom left corner
 */
function drawWinBox(ctx, totalWin) {
    const winBoxWidth = 200;
    const winBoxHeight = 80;
    const footerHeight = 60; // Match the footer height we defined in spinner-renderer.js
    const winBoxX = 30;
    const winBoxY = ctx.canvas.height - footerHeight - winBoxHeight - 20; // Position above the footer

    // Win amount box
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(winBoxX, winBoxY, winBoxWidth, winBoxHeight);

    ctx.strokeStyle = '#ffcc00';
    ctx.lineWidth = 3;
    ctx.strokeRect(winBoxX, winBoxY, winBoxWidth, winBoxHeight);

    // Win amount text
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 18px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('BONUS WIN:', winBoxX + 15, winBoxY + 30);

    ctx.font = 'bold 28px Arial';
    ctx.fillText(totalWin, winBoxX + 15, winBoxY + 60);
}

/**
 * Prepares to show the win screen when the game is over
 * 
 * @param {boolean} showingWinScreen - Whether already showing win screen
 * @param {number} remainingSpins - Remaining spins
 * @param {Function} onPrepareWinScreen - Callback when win screen should be shown
 */
export function prepareWinScreen(showingWinScreen, remainingSpins, onPrepareWinScreen) {
    // Show the win screen after a delay if not already triggered
    if (!showingWinScreen && remainingSpins <= 0) {
        setTimeout(onPrepareWinScreen, 1000);
    }
}

/**
 * Draws the win celebration screen with animated counter
 * 
 * @param {Object} ctx - Canvas rendering context
 * @param {number} canvasWidth - Canvas width
 * @param {number} canvasHeight - Canvas height
 * @param {number} timestamp - Current animation timestamp
 * @param {number} winAnimationStartTime - Time when win animation started
 * @param {number} totalWin - Total win amount
 * @returns {number} The current display win amount
 */
export function drawWinScreen(ctx, canvasWidth, canvasHeight, timestamp, winAnimationStartTime, totalWin) {
    // Create a festive background with particles or gradient
    const gradient = ctx.createRadialGradient(
        canvasWidth / 2, canvasHeight / 2, 10,
        canvasWidth / 2, canvasHeight / 2, canvasWidth
    );
    gradient.addColorStop(0, '#4A148C');
    gradient.addColorStop(1, '#1A237E');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Add sparkling/shining effects
    drawSparkles(ctx, timestamp, canvasWidth, canvasHeight);

    // Calculate animated win amount
    const animDuration = 3000; // 3 seconds for the counter animation
    const elapsed = timestamp - winAnimationStartTime;
    const progress = Math.min(1, elapsed / animDuration);

    // Ease-out animation for the counter
    const easeOutQuart = (t) => 1 - Math.pow(1 - t, 4);
    const easedProgress = easeOutQuart(progress);

    const displayWinAmount = Math.round(totalWin * easedProgress);

    // Draw festive "BONUS WIN!" text
    ctx.fillStyle = '#FFD700'; // Gold color
    ctx.font = 'bold 50px Arial';
    ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 10;
    ctx.fillText(
        'BONUS WIN!',
        canvasWidth / 2,
        canvasHeight / 2 - 60
    );

    // Draw the animated win amount
    ctx.font = 'bold 60px Arial';
    ctx.fillText(
        displayWinAmount,
        canvasWidth / 2,
        canvasHeight / 2 + 30
    );

    // Reset shadow
    ctx.shadowBlur = 0;

    // Draw tap to continue text
    if (progress >= 1) {
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '24px Arial';
        ctx.fillText(
            'Tap anywhere to continue',
            canvasWidth / 2,
            canvasHeight - 100
        );
    }

    return displayWinAmount;
}

/**
 * Draws sparkling effects for the win screen
 */
function drawSparkles(ctx, timestamp, canvasWidth, canvasHeight) {
    const numSparkles = 30;
    const maxRadius = 4;

    for (let i = 0; i < numSparkles; i++) {
        // Create a twinkling effect
        const twinkle = 0.5 + 0.5 * Math.sin(timestamp / 200 + i * 0.3);
        const radius = maxRadius * twinkle;

        // Distribute sparkles around in a circular pattern
        const angle = (i / numSparkles) * Math.PI * 2;
        const distance = 150 + Math.sin(timestamp / 1000 + i) * 50;

        const x = canvasWidth / 2 + Math.cos(angle + timestamp / 3000) * distance;
        const y = canvasHeight / 2 + Math.sin(angle + timestamp / 2000) * distance;

        // Draw the sparkle
        ctx.fillStyle = `rgba(255, 215, 0, ${twinkle})`;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
    }
}

/**
 * Draws a gradient background for the bonus game
 * 
 * @param {Object} ctx - Canvas rendering context
 * @param {number} canvasWidth - Canvas width
 * @param {number} canvasHeight - Canvas height
 * @param {Image|null} backgroundImage - Optional background image
 */
export function drawBackground(ctx, canvasWidth, canvasHeight, backgroundImage) {
    // If a background image is available, draw it
    if (backgroundImage) {
        ctx.drawImage(
            backgroundImage,
            0, 0,
            canvasWidth,
            canvasHeight
        );
    } else {
        // Otherwise, draw a gradient background
        const gradient = ctx.createLinearGradient(0, 0, 0, canvasHeight);
        gradient.addColorStop(0, '#1a237e');
        gradient.addColorStop(1, '#283593');

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    }
}
