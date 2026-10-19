// Aztec theme specific configuration
// No shared imports - each theme has its own complete config

// Aztec-specific reel configurations
export const reelStrips = [
    // Reel 1 (Aztec configuration)
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

// Aztec-specific multipliers (defined completely within this theme)
export const symbolNumberMultipliers = {
    0: { 3: 75, 4: 250, 5: 1500 }, // Higher jackpot for Aztec Sun God
    1: { 3: 20, 4: 75, 5: 500 },   // Better payouts for Aztec Mask
    2: { 3: 15, 4: 50, 5: 200 },   // Aztec Totem
    3: { 3: 10, 4: 25, 5: 100 },   // Aztec Calendar
    4: { 3: 5, 4: 15, 5: 50 }      // Aztec Pattern
};

// Aztec-specific paylines
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
    [2, 1, 2, 1, 2]  // Zigzag bottom - two extra paylines for Aztec theme
];

// Aztec-specific payout rules
export const PAYOUT_RULES = {
    minWinLength: 3, // Minimum symbols in a row for a win
    scatterPayouts: {
        3: 8,  // 3 scatters pays 8x bet (higher scatter pays for Aztec)
        4: 15, // 4 scatters pays 15x bet
        5: 75  // 5 scatters pays 75x bet
    },
    bonusRequirement: 3 // How many bonus symbols needed to trigger bonus
};