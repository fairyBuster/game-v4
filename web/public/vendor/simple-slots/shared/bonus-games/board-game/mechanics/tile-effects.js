/**
 * Tile effects processing for bonus games
 * Handles what happens when a player lands on different types of tiles
 */

/**
 * Process the effect of the current tile
 * 
 * @param {Object} gameState - Current game state
 * @param {Array} board - Game board array of tiles
 * @param {number} baseBet - Base bet amount
 * @param {Function} playSoundFn - Function to play sound
 * @param {Function} onMoveAgain - Callback when player should move again
 * @param {Function} saveStateFn - Function to save state
 */
export function processTileEffect(gameState, board, baseBet, playSoundFn, onMoveAgain, saveStateFn) {
    // Get the current tile
    const currentTile = board[gameState.position];
    if (!currentTile) return;

    // Process tile based on type
    switch (currentTile.type) {
        case 'win':
            // Award win based on tile value and base bet
            const winAmount = currentTile.value * baseBet;
            gameState.totalWin += winAmount;

            // Play win sound
            playSoundFn('win');

            console.log(`Won ${winAmount} on tile ${gameState.position}`);
            break;

        case 'moveForward':
            // Move forward additional steps
            if (currentTile.value > 0) {
                // Start another movement sequence
                gameState.currentRoll = currentTile.value;

                // Schedule the next move after a short delay
                setTimeout(() => {
                    if (onMoveAgain) onMoveAgain();
                }, 1000);

                console.log(`Moving forward ${currentTile.value} steps from tile ${gameState.position}`);
            }
            break;

        case 'moveBackward':
            // Move backward by specified steps
            if (currentTile.value > 0) {
                // Calculate new position, ensure it's not negative
                const boardLength = board.length;
                const newPosition = (gameState.position - currentTile.value + boardLength) % boardLength;
                gameState.position = newPosition;

                console.log(`Moved backward ${currentTile.value} steps to tile ${gameState.position}`);

                // Process the new tile after moving backward
                // Use setTimeout to avoid infinite recursion if there are multiple move tiles in sequence
                setTimeout(() => {
                    processTileEffect(gameState, board, baseBet, playSoundFn, onMoveAgain, saveStateFn);
                }, 500);
            }
            break;

        default:
            console.log(`Unknown tile type: ${currentTile.type} at position ${gameState.position}`);
    }

    // Check if game is over (no more spins)
    if (gameState.remainingSpins <= 0) {
        gameState.gameOver = true;
        console.log(`Bonus game complete! Total win: ${gameState.totalWin}`);
    }

    // Save game state
    if (saveStateFn) {
        saveStateFn();
    }
}
