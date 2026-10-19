/**
 * Spinner mechanics for bonus games
 * Handles spinning the reel and determining the result
 */

/**
 * Spin the slot reel to get a random number
 * 
 * @param {Object} gameState - Current game state
 * @param {Array} spinResults - Predetermined spin results (if any)
 * @param {number} spinIndex - Current spin index
 * @param {number} diceMax - Maximum dice value
 * @param {Function} onSpinComplete - Callback when spin completes
 * @param {Function} playSoundFn - Function to play sound
 * @param {Function} saveStateFn - Function to save state
 */
export function spinReel(gameState, spinResults, spinIndex, diceMax, onSpinComplete, playSoundFn, saveStateFn) {
    if (gameState.isSpinning || gameState.moving || gameState.gameOver || gameState.remainingSpins <= 0) {
        return; // Cannot spin if already spinning, moving, game over, or out of spins
    }

    // Play spin sound
    playSoundFn('roll');

    // Update game state
    gameState.isSpinning = true;
    gameState.spinnerPosition = 0;
    gameState.spinStartTime = performance.now();

    // Determine the result
    let roll;
    if (spinResults && spinResults.length > spinIndex) {
        // Use predetermined result if available
        roll = spinResults[spinIndex];
        console.log(`Using predetermined spin result: ${roll}`);
        gameState.spinIndex = spinIndex + 1;
    } else {
        // Generate random number between 1 and diceMax (inclusive)
        roll = Math.floor(Math.random() * diceMax) + 1;
        console.log(`Random spin result: ${roll}`);
    }

    // Set the roll result for display
    gameState.currentRoll = roll;

    // Set a timeout to complete the spin (animation will be handled in the update loop)
    setTimeout(() => {
        gameState.isSpinning = false;
        gameState.remainingSpins--;

        // Save the updated state
        if (saveStateFn) {
            saveStateFn();
        }

        // Call the completion callback with the roll result
        if (onSpinComplete) {
            onSpinComplete(roll);
        }
    }, 2000); // 2 seconds for spin animation
}
