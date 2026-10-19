// theme.js for Classic theme
import symbolMap from './symbolMap.js';
import { EffectPresets, ThemeEffectsHelper, renderEpicWinAnimation } from './effects.js';
import * as themeConfig from './config.js'; // Import the theme configuration

export const ClassicTheme = {
    name: "Classic",
    // Include the theme configuration
    config: themeConfig,
    // Layout and appearance settings
    layout: {
        reelSpacing: 10, // Classic slots have tight spacing
        reelsContainer: {
            backgroundColor: "#263238", // Dark blue-gray background for classic look
            opacity: 0.9 // 90% opacity
        },
        themeColor: "#d32f2f" // Classic red color for traditional slot feel
    },
    visualEffects: {
        ...EffectPresets,
    },
    // Audio configuration
    audio: {
        background: './themes/classic/sounds/background.mp3',
        spin: './themes/classic/sounds/spin.mp3',
        win: './themes/classic/sounds/win.mp3',
        jackpot: './themes/classic/sounds/jackpot.mp3',
        volume: {
            master: 0.7,
            background: 0.5,
            effects: 0.8
        }
    },    // Symbols and visuals
    symbols: {
        // Sprite sheet configuration
        useSprite: false,  // Set to true to use sprite map, false to use individual images
        path: './themes/classic/images/symbols.svg',
        spriteMap: symbolMap,  // Import from symbolMap.js

        // Combined attributes for all symbols in a single object
        attributes: [
            {
                id: 0,
                name: 'Jackpot',
                imagePath: './themes/classic/images/seven.png',
                backgroundColor: "#FFD700", // Gold for Jackpot
                animation: {
                    glow: true,
                    rotateOnWin: true
                }
            },
            {
                id: 1,
                name: 'Seven',
                imagePath: './themes/classic/images/seven.png',
                backgroundColor: "#FF0000", // Red for Seven
                animation: {
                    glow: true
                }
            },
            {
                id: 2,
                name: 'Bell',
                imagePath: './themes/classic/images/bell.png',
                backgroundColor: "#FFA500", // Orange for Bell
                animation: {
                    shake: true
                }
            },
            {
                id: 3,
                name: 'Cherry',
                imagePath: './themes/classic/images/cherry.png',
                backgroundColor: "#FF69B4", // Pink for Cherry
                animation: {
                    bounce: true
                }
            },
            {
                id: 4,
                name: 'Lemon',
                imagePath: './themes/classic/images/lemon.png',
                backgroundColor: "#FFFF00", // Yellow for Lemon
                animation: {
                    spin: true
                }
            }
        ]
    },
    background: './themes/classic/images/background.jpg',

    // Add rendering functions imported from effects.js
    ThemeEffectsHelper,
    renderEpicWinAnimation
};

export default ClassicTheme;
