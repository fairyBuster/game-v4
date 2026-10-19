// Gemstone theme specific configuration
// No shared imports - each theme has its own complete config

// Pirate-specific reel configurations with extended symbols (0-7)
export const reelStrips = [
    // Reel 1
    [4, 3, 5, 2, 4, 1, 6, 3, 4, 2, 7, 0, 4, 3, 5, 2, 4, 1, 7, 3, 5, 2, 4, 6, 3, 4, 1, 5, 2, 4],
    // Reel 2 
    [5, 2, 3, 4, 1, 6, 2, 7, 3, 4, 1, 5, 2, 4, 0, 7, 1, 4, 2, 3, 6, 1, 5, 4, 2, 3, 7, 3, 6, 3],
    // Reel 3
    [3, 7, 2, 5, 3, 1, 6, 2, 3, 5, 2, 4, 3, 0, 7, 2, 3, 1, 6, 2, 3, 5, 2, 4, 3, 7, 1, 2, 6, 2],
    // Reel 4
    [6, 2, 3, 5, 1, 4, 2, 7, 3, 4, 1, 5, 2, 4, 0, 6, 1, 7, 2, 3, 5, 1, 4, 7, 2, 3, 6, 3, 5, 3],
    // Reel 5
    [5, 3, 7, 2, 4, 1, 6, 3, 5, 2, 4, 0, 7, 3, 4, 2, 6, 1, 5, 3, 7, 2, 4, 5, 3, 6, 1, 7, 2, 4]
];

// Pirate-specific multipliers (defined completely within this theme)
export const symbolNumberMultipliers = {
    0: { 3: 75, 4: 250, 5: 1500 }, // Treasure Chest (highest value)
    1: { 3: 20, 4: 75, 5: 500 },   // Ship
    2: { 3: 15, 4: 50, 5: 200 },   // Skull
    3: { 3: 10, 4: 25, 5: 100 },   // Map
    4: { 3: 5, 4: 15, 5: 50 },     // Pirate
    5: { 3: 8, 4: 20, 5: 75 },     // Anchor (new symbol)
    6: { 3: 6, 4: 18, 5: 60 },     // Compass (new symbol)
    7: { 3: 4, 4: 12, 5: 40 }      // Skull2 (new symbol)
};

// Gemstone-specific paylines
export const PAYLINES = [
    [1, 1, 1, 1, 1], // Middle row
    [0, 0, 0, 0, 0], // Top row
    [2, 2, 2, 2, 2], // Bottom row
    [0, 1, 2, 1, 0], // V shape
    [2, 1, 0, 1, 2], // Inverted V shape
    [1, 0, 0, 0, 1], // U shape top
    [1, 2, 2, 2, 1], // U shape bottom
    [0, 0, 1, 2, 2], // Diagonal top-left to bottom-right
    [2, 2, 1, 0, 0], // Diagonal bottom-left to top-right
    [0, 1, 0, 1, 0], // Zigzag top
    [2, 1, 2, 1, 2]  // Zigzag bottom - two extra paylines for Gemstone theme
];

// Gemstone-specific payout rules
export const PAYOUT_RULES = {
    minWinLength: 3, // Minimum symbols in a row for a win
    scatterPayouts: {
        3: 8,  // 3 scatters pays 8x bet (higher scatter pays for Gemstone)
        4: 15, // 4 scatters pays 15x bet
        5: 75  // 5 scatters pays 75x bet
    },
    bonusRequirement: 3 // How many bonus symbols needed to trigger bonus
};