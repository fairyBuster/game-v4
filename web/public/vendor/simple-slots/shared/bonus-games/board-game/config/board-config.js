/**
 * Default board configuration and spin results for bonus games
 * This module contains the predetermined board layout and spin results
 * to ensure the bonus game is deterministic and fair.
 */

// Default board configuration with predefined tile types and values
export const DEFAULT_BOARD_CONFIGURATION = [
    { type: 'win', value: 5 },
    { type: 'win', value: 10 },
    { type: 'win', value: 2 },
    { type: 'win', value: 20 },
    { type: 'win', value: 5 },
    { type: 'win', value: 10 },
    { type: 'win', value: 2 },
    { type: 'win', value: 50 },
    { type: 'win', value: 5 },
    { type: 'win', value: 20 },
    { type: 'win', value: 10 },
    { type: 'win', value: 5 },
];

// Default predetermined spin results
export const DEFAULT_SPIN_RESULTS = [3, 4, 2, 5, 1, 6];

// Default tile configuration
export const DEFAULT_TILE_CONFIG = {
    win: {
        frequency: 0.5,
        values: [1, 2, 5, 10, 20, 50],
        color: '#4CAF50'
    },
    moveForward: {
        frequency: 0.3,
        values: [1, 2, 3],
        color: '#2196F3'
    },
    moveBackward: {
        frequency: 0.2,
        values: [1, 2, 3],
        color: '#F44336'
    }
};

// Default text configuration
export const DEFAULT_TEXT_CONFIG = {
    title: "Bonus Board Game",
    instructions: "Spin to move around the board!",
    rollButton: "Spin",
    winPrefix: "Win ",
    forward: "Forward ",
    backward: "Back ",
    gameOver: "Bonus Complete!",
    totalWin: "Total Win: "
};
