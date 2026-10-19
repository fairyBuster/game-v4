// Classic theme specific configuration
// No shared imports - each theme has its own complete config
export const reelStrips = [
    // Reel 1 (Classic configuration might differ from shared)
    [4, 3, 4, 2, 4, 1, 4, 3, 4, 2, 4, 0, 4, 3, 4, 2, 4, 1, 4, 3, 4, 2, 4, 4, 3, 4, 1, 4, 2, 4],
    // Reel 2
    [4, 2, 3, 4, 1, 4, 2, 4, 3, 4, 1, 4, 2, 4, 0, 4, 1, 4, 2, 3, 4, 1, 4, 4, 2, 3, 4, 3, 4, 3],
    // Reel 3
    [3, 4, 2, 4, 3, 1, 4, 2, 3, 4, 2, 4, 3, 0, 4, 2, 3, 1, 4, 2, 3, 4, 2, 4, 3, 4, 1, 2, 4, 2],
    // Reel 4
    [4, 2, 3, 4, 1, 4, 2, 4, 3, 4, 1, 4, 2, 4, 0, 4, 1, 4, 2, 3, 4, 1, 4, 4, 2, 3, 4, 3, 4, 3],
    // Reel 5
    [4, 3, 4, 2, 4, 1, 4, 3, 4, 2, 4, 0, 4, 3, 4, 2, 4, 1, 4, 3, 4, 2, 4, 4, 3, 4, 1, 4, 2, 4]
];

// Classic-specific multipliers (defined completely within this theme)
export const symbolNumberMultipliers = {
    0: { 3: 50, 4: 200, 5: 1000 }, // Jackpot symbol
    1: { 3: 25, 4: 100, 5: 500 },  // Seven symbol
    2: { 3: 15, 4: 50, 5: 200 },   // Bell symbol
    3: { 3: 10, 4: 25, 5: 100 },   // Cherry symbol
    4: { 3: 5, 4: 15, 5: 50 }      // Lemon symbol
};

// Classic-specific paylines
export const PAYLINES = [
    [1, 1, 1, 1, 1], // Middle row
    [0, 0, 0, 0, 0], // Top row
    [2, 2, 2, 2, 2], // Bottom row
    [0, 1, 2, 1, 0], // V shape
    [2, 1, 0, 1, 2], // Inverted V shape
    [1, 0, 0, 0, 1], // U shape top
    [1, 2, 2, 2, 1], // U shape bottom
    [0, 0, 1, 2, 2], // Diagonal top-left to bottom-right
    [2, 2, 1, 0, 0]  // Diagonal bottom-left to top-right
];

// Classic-specific payout rules
export const PAYOUT_RULES = {
    minWinLength: 3, // Minimum symbols in a row for a win
    scatterPayouts: {
        3: 5,  // 3 scatters pays 5x bet
        4: 10, // 4 scatters pays 10x bet
        5: 50  // 5 scatters pays 50x bet
    },
    bonusRequirement: 3 // How many bonus symbols needed to trigger bonus
};

// Min win length for classic theme
export const MIN_WIN_LENGTH = 3;
