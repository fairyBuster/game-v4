// theme.js for Fantasy Forest theme
import symbolMap from './symbolMap.js';
import * as themeConfig from './config.js'; // Import theme configuration
import { EffectPresets, ThemeEffectsHelper, renderEpicWinAnimation } from './effects.js';

export const FantasyForestTheme = {
    name: "Fantasy Forest",
    // Include the theme configuration
    config: themeConfig,
    // Layout and appearance settings
    layout: {
        reelSpacing: 8,
        reelsContainer: {
            backgroundColor: "#1B5E20", // Deep forest green
            opacity: 0.85
        },
        themeColor: "#8BC34A" // Light green
    },
    visualEffects: {
        ...EffectPresets,
    },
    // Audio configuration
    audio: {
        background: './themes/fantasy-forest/sounds/background.mp3',
        spin: './themes/fantasy-forest/sounds/spin.mp3',
        win: './themes/fantasy-forest/sounds/win.mp3',
        jackpot: './themes/fantasy-forest/sounds/jackpot.mp3',
        volume: {
            master: 0.75,
            background: 0.5,
            effects: 0.9
        }
    },
    // Symbols and visuals
    symbols: {
        // Sprite sheet configuration
        useSprite: true, // Set to true to use sprite map, false to use individual images
        path: './themes/fantasy-forest/images/symbols.svg',
        spriteMap: symbolMap, // Import from symbolMap.js
        attributes: [
            {
                id: 0,
                name: 'Dragon',
                imagePath: './themes/fantasy-forest/images/dragon.jpg',
                backgroundColor: "#FFD700", // Gold for Dragon
            },
            {
                id: 1,
                name: 'Fairy',
                imagePath: './themes/fantasy-forest/images/fairy.jpg',
                backgroundColor: "#FF0000", // Red for Fairy
            },
            {
                id: 2,
                name: 'Unicorn',
                imagePath: './themes/fantasy-forest/images/unicorn.jpg',
                backgroundColor: "#FFA500", // Orange for Unicorn
            },
            {
                id: 3,
                name: 'Magic Tree',
                imagePath: './themes/fantasy-forest/images/magictree.jpg',
                backgroundColor: "#FF69B4", // Pink for Magic Tree
            },
            {
                id: 4,
                name: 'Crystal',
                imagePath: './themes/fantasy-forest/images/crystal.jpg',
                backgroundColor: "#FFFF00", // Yellow for Crystal
            }
        ]
    },
    background: './themes/fantasy-forest/images/background.jpg',
    // Add rendering functions imported from effects.js
    ThemeEffectsHelper,
    renderEpicWinAnimation
};

export default FantasyForestTheme;
