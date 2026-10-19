/**
 * Board generator for bonus games
 * Creates the board layout based on configuration
 */
import { DEFAULT_TILE_CONFIG } from '../config/board-config.js';

/**
 * Generates a game board based on a fixed configuration or randomly
 * 
 * @param {Object} options - Generator options
 * @param {Array} options.fixedBoardConfig - Optional predefined board layout
 * @param {Object} options.tiles - Tile configuration with frequencies and values
 * @param {number} options.boardSize - Number of tiles on the board
 * @returns {Array} The generated board layout
 */
export function generateBoard(options) {
    const { fixedBoardConfig, tiles = DEFAULT_TILE_CONFIG, boardSize = 24 } = options;
    const board = [];

    // Use fixed board configuration if provided
    if (fixedBoardConfig && Array.isArray(fixedBoardConfig)) {
        // Create board from the fixed configuration
        for (let i = 0; i < fixedBoardConfig.length; i++) {
            const tileConfig = fixedBoardConfig[i];
            board.push({
                type: tileConfig.type,
                value: tileConfig.value,
                x: 0, // Will be calculated when rendering
                y: 0,
                width: 0,
                height: 0
            });
        }
        return board;
    }

    // Otherwise, generate a random board
    // Create a weighted distribution of tile types
    const tileTypes = [];
    for (const type in tiles) {
        const frequency = tiles[type].frequency;
        const count = Math.floor(boardSize * frequency);
        for (let i = 0; i < count; i++) {
            tileTypes.push(type);
        }
    }

    // Fill any remaining spots with win tiles
    while (tileTypes.length < boardSize) {
        tileTypes.push('win');
    }

    // Shuffle the tile types
    for (let i = tileTypes.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [tileTypes[i], tileTypes[j]] = [tileTypes[j], tileTypes[i]];
    }

    // Create the board with random values for each tile type
    for (let i = 0; i < boardSize; i++) {
        const tileType = tileTypes[i];
        let tileValue = null;

        if (tileType === 'win') {
            const values = tiles.win.values;
            tileValue = values[Math.floor(Math.random() * values.length)];
        } else if (tileType === 'moveForward') {
            const values = tiles.moveForward.values;
            tileValue = values[Math.floor(Math.random() * values.length)];
        } else if (tileType === 'moveBackward') {
            const values = tiles.moveBackward.values;
            tileValue = values[Math.floor(Math.random() * values.length)];
        }

        board.push({
            type: tileType,
            value: tileValue,
            x: 0, // Will be calculated when rendering
            y: 0,
            width: 0,
            height: 0
        });
    }

    return board;
}
