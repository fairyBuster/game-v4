// theme.js for Aztec theme
import symbolMap from './symbolMap.js';
import * as themeConfig from './config.js'; // Import theme configuration
import { EffectPresets, ThemeEffectsHelper, renderEpicWinAnimation } from './effects.js';

export const AztecTheme = {
    name: "Aztec",
    // Include the theme configuration
    config: themeConfig,
    // Layout and appearance settings
    layout: {
        reelSpacing: 6,
        reelsContainer: {
            backgroundColor: "#4D3319", // Earthy brown
            opacity: 0.9
        },
        themeColor: "#C49C1A" // Golden Aztec color
    },
    visualEffects: {
        ...EffectPresets,
    },
    // Audio configuration
    audio: {
        background: './themes/aztec/sounds/background.mp3',
        spin: './themes/aztec/sounds/spin.mp3',
        win: './themes/aztec/sounds/win.mp3',
        jackpot: './themes/aztec/sounds/jackpot.mp3',
        volume: {
            master: 0.8,
            background: 0.6,
            effects: 0.9
        }
    },
    // Symbols and visuals
    symbols: {
        // Sprite sheet configuration
        useSprite: true, // Set to true to use sprite map, false to use individual images
        path: './themes/aztec/images/symbols.svg',
        spriteMap: symbolMap, // Import from symbolMap.js
        attributes: [
            {
                id: 0,
                name: 'Sun God',
                imagePath: './themes/aztec/images/sungod.png',
                backgroundColor: "#FFD700", // Gold for Sun God
            },
            {
                id: 1,
                name: 'Mask',
                imagePath: './themes/aztec/images/mask.png',
                backgroundColor: "#FF0000", // Red for Mask
            },
            {
                id: 2,
                name: 'Temple',
                imagePath: './themes/aztec/images/temple.png',
                backgroundColor: "#FFA500", // Orange for Temple
            },
            {
                id: 3,
                name: 'Jaguar',
                imagePath: './themes/aztec/images/jaguar.png',
                backgroundColor: "#FF69B4", // Pink for Jaguar
            },
            {
                id: 4,
                name: 'Calendar',
                imagePath: './themes/aztec/images/calendar.png',
                backgroundColor: "#FFFF00", // Yellow for Calendar
            }
        ]
    },
    background: './themes/aztec/images/background.jpg',

    // Add rendering functions imported from effects.js
    ThemeEffectsHelper,
    renderEpicWinAnimation
};

export default AztecTheme;
