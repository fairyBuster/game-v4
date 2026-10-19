// theme.js for Ancient Egypt theme
import symbolMap from './symbolMap.js';
import { EffectPresets, ThemeEffectsHelper, renderEpicWinAnimation } from './effects.js';
import * as themeConfig from './config.js'; // Import theme configuration

export const AncientEgyptTheme = {
    name: "Ancient Egypt",
    config: themeConfig,
    // Layout and appearance settings
    layout: {
        reelSpacing: 8,
        reelsContainer: {
            backgroundColor: "#431d08", // Sandstone brown
            opacity: 0.5
        },
        themeColor: "#FFD700" // Gold color for Egyptian theme
    },
    visualEffects: {
        ...EffectPresets,
    },
    // Audio configuration
    audio: {
        background: './themes/ancient-egypt/sounds/background.mp3',
        spin: './themes/ancient-egypt/sounds/spin.mp3',
        win: './themes/ancient-egypt/sounds/win.mp3',
        jackpot: './themes/ancient-egypt/sounds/jackpot.mp3',
        volume: {
            master: 0.8,
            background: 0.5,
            effects: 0.9
        }
    },
    // Symbols and visuals
    symbols: {
        // Sprite sheet configuration
        useSprite: false, // Set to true to use sprite map, false to use individual images
        path: './themes/ancient-egypt/images/symbols.svg',
        spriteMap: symbolMap, // Import from symbolMap.js
        attributes: [
            {
                id: 0,
                name: 'pharaoh',
                imagePath: './themes/ancient-egypt/images/pharaoh.png',
                backgroundColor: null, // Gold for Sun God
            },
            {
                id: 1,
                name: 'queen',
                imagePath: './themes/ancient-egypt/images/queen.png',
                backgroundColor: null, // Gold for Sun God
            },
            {
                id: 2,
                name: 'ankh',
                imagePath: './themes/ancient-egypt/images/ankh.png',
                backgroundColor: null, // Red for Mask
            },
            {
                id: 3,
                name: 'scarab',
                imagePath: './themes/ancient-egypt/images/scarab.png',
                backgroundColor: null, // Orange for Temple
            },
            {
                id: 4,
                name: 'eye',
                imagePath: './themes/ancient-egypt/images/eye.png',
                backgroundColor: null, // Pink for Jaguar
            },
            {
                id: 5,
                name: 'pyramid',
                imagePath: './themes/ancient-egypt/images/pyramid.png',
                backgroundColor: null, // Yellow for Calendar
            },
            {
                id: 6,
                name: 'ace',
                imagePath: './themes/ancient-egypt/images/a.png',
                backgroundColor: null,
            },
            {
                id: 7,
                name: 'king',
                imagePath: './themes/ancient-egypt/images/k.png',
                backgroundColor: null,
            },
            {
                id: 8,
                name: 'queen',
                imagePath: './themes/ancient-egypt/images/q.png',
                backgroundColor: null,
            },
            {
                id: 9,
                name: 'jack',
                imagePath: './themes/ancient-egypt/images/j.png',
                backgroundColor: null,
            }
        ]
    },
    background: './themes/ancient-egypt/images/background2.jpg',

    // Add rendering functions imported from effects.js
    ThemeEffectsHelper
};

export default AncientEgyptTheme;
