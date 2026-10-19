// egyption theme specific configuration
// No shared imports - each theme has its own complete config

// egyption-specific reel configurations
export const reelStrips = [
    // Reel 1 (egyptian configuration)
    [8, 6, 9, 5, 7, 4, 9, 6, 8, 3, 7, 9, 5, 0, 7, 9, 6, 2, 8, 9, 7, 1, 9, 8, 5, 9, 4, 7, 8, 9],
    // Reel 2 
    [9, 7, 8, 6, 9, 3, 7, 9, 8, 5, 9, 6, 2, 9, 8, 0, 7, 9, 4, 8, 9, 5, 7, 9, 6, 8, 1, 7, 9, 8],
    // Reel 3
    [8, 9, 7, 5, 8, 9, 4, 7, 9, 6, 8, 2, 9, 7, 0, 8, 9, 5, 7, 9, 3, 6, 8, 9, 7, 1, 9, 8, 7, 9],
    // Reel 4
    [7, 9, 8, 6, 9, 7, 4, 8, 9, 6, 7, 9, 2, 8, 7, 9, 5, 0, 9, 8, 6, 9, 3, 7, 8, 9, 5, 1, 7, 9],
    // Reel 5
    [9, 7, 9, 8, 5, 9, 7, 4, 8, 9, 6, 7, 1, 9, 8, 5, 9, 0, 7, 9, 3, 8, 9, 6, 7, 2, 9, 8, 7, 9]
];

// egyption-specific multipliers (defined completely within this theme)
export const symbolNumberMultipliers = {
    0: { 3: 75, 4: 250, 5: 1500 }, // Higher jackpot for egyption Sun God
    1: { 3: 20, 4: 75, 5: 500 },   // Better payouts for egyption Mask
    2: { 3: 15, 4: 50, 5: 200 },   // egyption Totem
    3: { 3: 10, 4: 25, 5: 100 },   // egyption Calendar
    4: { 3: 5, 4: 15, 5: 50 },     // egyption Pattern
    5: { 3: 4, 4: 12, 5: 40 },     // New Egyptian symbol
    6: { 3: 3, 4: 10, 5: 35 },     // New Egyptian symbol
    7: { 3: 3, 4: 8, 5: 30 },      // New Egyptian symbol
    8: { 3: 2, 4: 6, 5: 25 },      // New Egyptian symbol
    9: { 3: 1, 4: 3, 5: 15 }       // Lowest paying symbol (perhaps a common hieroglyph)
};

// ...existing code...
// egyption-specific paylines
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
    [2, 1, 2, 1, 2]  // Zigzag bottom - two extra paylines for egyption theme
];

// egyption-specific payout rules
export const PAYOUT_RULES = {
    minWinLength: 3, // Minimum symbols in a row for a win
    scatterPayouts: {
        3: 8,  // 3 scatters pays 8x bet (higher scatter pays for egyption)
        4: 15, // 4 scatters pays 15x bet
        5: 75  // 5 scatters pays 75x bet
    },
    bonusRequirement: 3 // How many bonus symbols needed to trigger bonus
};

export const scatterSymbolId = null;