/**
 * Functions to handle incomplete bonus games after page refresh
 */

import { startBonusGame } from './index.js';
import { loadGameState } from './board-game/core/game-state.js';

/**
 * Check if there is an incomplete bonus game in localStorage
 * @returns {Object|null} The saved game state or null if no incomplete game
 */
export function checkForIncompleteBonusGame() {
    try {
        // Look for any bonus game state in localStorage
        const keys = Object.keys(localStorage);
        const bonusStateKeys = keys.filter(key => key.startsWith('bonus_game_state_'));

        // If we find any bonus game states, check if they're incomplete
        for (const key of bonusStateKeys) {
            const savedState = JSON.parse(localStorage.getItem(key));

            // A game is incomplete if it's not marked as gameOver and has remaining spins
            if (savedState && !savedState.gameOver && savedState.remainingSpins > 0) {
                console.log('Found incomplete bonus game:', savedState);
                return savedState;
            }
        }
    } catch (e) {
        console.error('Error checking for incomplete bonus games:', e);
    }

    return null;
}

/**
 * Resume an incomplete bonus game from a saved state
 * 
 * @param {Object} theme - Current theme configuration
 * @param {HTMLCanvasElement} canvas - Game canvas
 * @param {CanvasRenderingContext2D} ctx - Canvas rendering context
 * @param {Object} savedState - The saved incomplete bonus game state
 * @param {Object} options - Additional options for the bonus game
 * @returns {Object} The resumed bonus game instance
 */
export function resumeIncompleteBonusGame(theme, canvas, ctx, savedState, options = {}) {
    if (!savedState || !savedState.gameId) {
        console.error('Invalid saved state provided');
        return null;
    }

    console.log('Resuming incomplete bonus game with ID:', savedState.gameId);

    // Start the bonus game with the saved game ID so it loads the saved state
    const bonusGame = startBonusGame(theme, canvas, ctx, {
        ...options,
        gameId: savedState.gameId,
        scatter: savedState.remainingSpins + (options.scatter || 0) // Ensure correct number of spins
    });

    return bonusGame;
}
