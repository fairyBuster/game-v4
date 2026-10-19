/**
 * Game state management for bonus games
 * Handles saving and loading game state to allow resuming games
 */

/**
 * Saves the current game state to localStorage
 * 
 * @param {Object} state - The current game state
 * @param {string} gameId - Unique identifier for this game instance
 * @returns {Object} The saved game state
 */
export function saveGameState(state, gameId) {
    const gameState = {
        gameId,
        position: state.position,
        remainingSpins: state.remainingSpins,
        totalWin: state.totalWin,
        spinIndex: state.spinIndex,
        gameOver: state.gameOver,
        // Save the predetermined spin results so they persist across page reloads
        spinResults: state.spinResults || [],
        board: state.board.map(tile => ({
            type: tile.type,
            value: tile.value
        }))
    };

    // Save to localStorage (could also be sent to a server)
    try {
        localStorage.setItem(`bonus_game_state_${gameId}`, JSON.stringify(gameState));
    } catch (e) {
        console.error('Failed to save bonus game state:', e);
    }

    return gameState;
}

/**
 * Loads a saved game state from localStorage
 * 
 * @param {string} gameId - Unique identifier for the game instance
 * @returns {Object|null} The saved game state or null if not found
 */
export function loadGameState(gameId) {
    try {
        const savedState = localStorage.getItem(`bonus_game_state_${gameId}`);
        return savedState ? JSON.parse(savedState) : null;
    } catch (e) {
        console.error('Failed to load bonus game state:', e);
        return null;
    }
}

/**
 * Clears a saved game state from localStorage
 * 
 * @param {string} gameId - Unique identifier for the game instance
 */
export function clearGameState(gameId) {
    try {
        localStorage.removeItem(`bonus_game_state_${gameId}`);
    } catch (e) {
        console.error('Failed to clear bonus game state:', e);
    }
}
