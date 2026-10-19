// theme.js for Gemstones theme
import symbolMap from './symbolMap.js';
import * as themeConfig from './config.js'; // Import theme configuration
import { EffectPresets, ThemeEffectsHelper, renderEpicWinAnimation } from './effects.js';

export const GemstonesTheme = {
    name: "Gemstones",
    // Include the theme configuration
    config: themeConfig,
    // Layout and appearance settings
    layout: {
        reelSpacing: 7,
        reelsContainer: {
            backgroundColor: "#1A237E", // Deep blue
            opacity: 0.9
        },
        themeColor: "#E91E63" // Pink/magenta
    },
    visualEffects: {
        ...EffectPresets,
    },
    // Audio configuration
    audio: {
        background: './themes/gemstones/sounds/background.mp3',
        spin: './themes/gemstones/sounds/spin.mp3',
        win: './themes/gemstones/sounds/win.mp3',
        jackpot: './themes/gemstones/sounds/jackpot.mp3',
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
        path: './themes/gemstones/images/symbols.svg',
        spriteMap: symbolMap, // Import from symbolMap.js
        attributes: [
            {
                id: 0,
                name: 'Diamond',
                imagePath: './themes/gemstones/images/diamond.png',
                backgroundColor: "#959495", // Gold for Diamond
            },
            {
                id: 1,
                name: 'Ruby',
                imagePath: './themes/gemstones/images/ruby.png',
                backgroundColor: "#680000", // Red for Ruby
            },
            {
                id: 2,
                name: 'Emerald',
                imagePath: './themes/gemstones/images/emerald.png',
                backgroundColor: "#005c00", // green for Emerald
            },
            {
                id: 3,
                name: 'Sapphire',
                imagePath: './themes/gemstones/images/sapphire.png',
                backgroundColor: "#00007c", // blue for Sapphire
            }, {
                id: 4,
                name: 'Amethyst',
                imagePath: './themes/gemstones/images/amethyst.png',
                backgroundColor: "#540d56", // purple for Amethyst
            },
            {
                id: 5,
                name: 'Scatter',
                imagePath: './themes/gemstones/images/scatter.png',
                backgroundColor: "#ffb0b9", // Violet for Scatter symbol
            }
        ]
    },
    background: null,
    // Bonus game configuration
    bonusGame: {
        boardLayout: 'square',
        assets: {
            background: './themes/gemstones/images/bonus-bg.jpg',
            player: './themes/gemstones/images/diamond.png',
            dice: [
                './themes/gemstones/images/dice1.png',
                './themes/gemstones/images/dice2.png',
                './themes/gemstones/images/dice3.png',
                './themes/gemstones/images/dice4.png',
                './themes/gemstones/images/dice5.png',
                './themes/gemstones/images/dice6.png'
            ],
            tiles: {
                win: './themes/gemstones/images/ruby.png',
                moveForward: './themes/gemstones/images/emerald.png',
                moveBackward: './themes/gemstones/images/sapphire.png',
                collect: './themes/gemstones/images/amethyst.png',
            },
            sounds: {
                start: './themes/gemstones/sounds/bonus-start.mp3',
                roll: './themes/gemstones/sounds/roll.mp3',
                move: './themes/gemstones/sounds/move.mp3',
                win: './themes/gemstones/sounds/win.mp3',
                collect: './themes/gemstones/sounds/collect.mp3'
            }
        },
        text: {
            title: "Gemstone Treasure Hunt",
            instructions: "Roll the dice to collect precious gems!",
            winPrefix: "Win: ",
            forward: "Forward: +",
            backward: "Back: -",
            collect: "Collect",
            gameOver: "Treasure Collected!",
            totalWin: "Total Gems: "
        }
    },
    // Add rendering functions imported from effects.js
    ThemeEffectsHelper,
    renderEpicWinAnimation
};

export default GemstonesTheme;
