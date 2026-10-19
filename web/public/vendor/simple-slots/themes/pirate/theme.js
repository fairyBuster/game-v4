// theme.js for Pirate theme
import symbolMap from './symbolMap.js';
import * as themeConfig from './config.js'; // Import theme configuration
import { EffectPresets, ThemeEffectsHelper, renderEpicWinAnimation } from './effects.js';

export const PirateTheme = {
    name: "Pirate",
    // Include the theme configuration
    config: themeConfig,
    // Layout and appearance settings
    layout: {
        reelSpacing: 0,
        reelsContainer: {
            backgroundColor: "#333", // Deep sea blue
            opacity: 0.5
        },
        themeColor: "#FF5722" // Pirate orange-red
    },
    visualEffects: {
        ...EffectPresets,
    },
    // Audio configuration
    audio: {
        background: './themes/pirate/sounds/background.mp3',
        spin: './themes/pirate/sounds/spin.mp3',
        win: './themes/pirate/sounds/win.mp3',
        jackpot: './themes/pirate/sounds/jackpot.mp3',
        volume: {
            master: 0.5,
            background: 0.5,
            effects: 0.7
        }
    },
    // Symbols and visuals
    symbols: {
        // Sprite sheet configuration
        useSprite: false, // Set to true to use sprite map, false to use individual images
        path: './themes/pirate/images/symbols.svg',
        spriteMap: symbolMap, // Import from symbolMap.js
        attributes: [
            {
                id: 0,
                name: 'Treasure Chest',
                imagePath: './themes/pirate/images/chest.png',
                backgroundColor: null, // Gold for Treasure Chest
            },
            {
                id: 1,
                name: 'Ship',
                imagePath: './themes/pirate/images/ship.png',
                backgroundColor: null, // Red for Ship
            },
            {
                id: 2,
                name: 'CrossBones',
                imagePath: './themes/pirate/images/skull.png',
                backgroundColor: null, // Orange for Skull
            },
            {
                id: 3,
                name: 'Map',
                imagePath: './themes/pirate/images/map.png',
                backgroundColor: null, // Pink for Map
            },
            {
                id: 4,
                name: 'Pirate',
                imagePath: './themes/pirate/images/pirate.png',
                backgroundColor: null, // Yellow for Parrot
            },
            {
                id: 5,
                name: 'Anchor',
                imagePath: './themes/pirate/images/anchor.png',
                backgroundColor: null,
            },
            {
                id: 6,
                name: 'Compass',
                imagePath: './themes/pirate/images/compass.png',
                backgroundColor: null,
            }, {
                id: 7,
                name: 'Skull',
                imagePath: './themes/pirate/images/skull2.png',
                backgroundColor: null,
            }
        ]
    },
    background: './themes/pirate/images/background.jpg',
    ThemeEffectsHelper,
    renderEpicWinAnimation,
    bonusGame: {
        boardLayout: 'circle',
        assets: {
            background: './themes/pirate/images/bonus-bg.jpg',
            player: './themes/pirate/images/ship.png',
            dice: [
                './themes/pirate/images/dice1.png',
                './themes/pirate/images/dice2.png',
                './themes/pirate/images/dice3.png',
                './themes/pirate/images/dice4.png',
                './themes/pirate/images/dice5.png',
                './themes/pirate/images/dice6.png'
            ],
            tiles: {
                win: './themes/pirate/images/chest.png',
                moveForward: './themes/pirate/images/map.png',
                moveBackward: './themes/pirate/images/skull.png',
                collect: './themes/pirate/images/anchor.png',
            },
            sounds: {
                start: './themes/pirate/sounds/bonus-start.mp3',
                roll: './themes/pirate/sounds/dice-roll.mp3',
                move: './themes/pirate/sounds/ship-move.mp3',
                win: './themes/pirate/sounds/win.mp3',
                collect: './themes/pirate/sounds/collect.mp3'
            }
        },
        text: {
            title: "Pirate Treasure Hunt",
            instructions: "Roll the dice to navigate the seas!",
            winPrefix: "Treasure: ",
            forward: "Tailwind: +",
            backward: "Headwind: -",
            collect: "Port",
            gameOver: "Voyage Complete!",
            totalWin: "Total Treasure: "
        }
    }
};

export default PirateTheme;
