/**
 * Movement mechanics for bonus games
 * Handles player movement around the board
 */

/**
 * Start moving the player based on the current roll
 *
 * @param {Object} gameState - Current game state (requires position, currentRoll, moving, stepsToMove, lastMoveTime)
 * @param {Function} playSoundFn - Function to play sound
 */
export function startMoving(gameState, playSoundFn) {
    // Only start if not already moving and there's a roll to process
    if (gameState.moving || !gameState.currentRoll || gameState.currentRoll <= 0) return;

    // Set movement state
    gameState.moving = true;
    // Store the total steps for this turn's roll
    gameState.stepsToMove = gameState.currentRoll;
    // Initialize the timer for the *first* step's delay
    gameState.lastMoveTime = performance.now();

    // *** Removed initial sound play from here ***
    // It will now play only when a step is actually processed in processMove
}

/**
 * Check if it's time to process the next move step
 *
 * @param {Object} gameState - Current game state
 * @param {number} timestamp - Current timestamp (e.g., from requestAnimationFrame)
 * @returns {boolean} True if a move step should be processed
 */
export function shouldProcessMove(gameState, timestamp) {
    // Check if we are in a moving state and have steps remaining
    if (!gameState.moving || gameState.stepsToMove <= 0) return false;

    // Check if enough time (500ms) has passed since the LAST step was processed
    // Use the provided timestamp for potentially higher accuracy if available, else fallback
    const currentTime = timestamp || performance.now();
    const timeSinceLastMove = currentTime - gameState.lastMoveTime;

    // Process a step if 500ms have elapsed
    return timeSinceLastMove > 500;
}

/**
 * Process a single step move
 *
 * @param {Object} gameState - Current game state
 * @param {number} boardLength - Total number of tiles on the board
 * @param {Function} playSoundFn - Function to play sound
 * @param {Function} onMoveComplete - Callback when the entire move sequence (all steps) completes
 * @param {number} timestamp - Current timestamp (e.g., from requestAnimationFrame)
 */
export function processMove(gameState, boardLength, playSoundFn, onMoveComplete, timestamp) {
    // Double-check conditions (though shouldProcessMove should gate this)
    if (!gameState.moving || gameState.stepsToMove <= 0) return;

    // --- Process one step ---
    gameState.position = (gameState.position + 1) % boardLength;
    gameState.stepsToMove--;

    // Play movement sound *for this specific step*
    playSoundFn('move');

    // Update the time of the last processed step
    gameState.lastMoveTime = timestamp || performance.now();
    // --- Step complete ---


    // Check if the entire movement sequence for this roll is finished
    if (gameState.stepsToMove <= 0) {
        gameState.moving = false; // Stop the movement state

        // Optional: Clear stepsToMove or currentRoll if needed, depending on game logic
        // gameState.currentRoll = 0; // Example

        // Call the completion callback after a short delay
        if (onMoveComplete) {
            setTimeout(() => {
                onMoveComplete();
            }, 300); // Delay before processing tile effect allows final move animation/sound to settle
        }
    }
    // If stepsToMove > 0, the next call to shouldProcessMove will check the timer again
}