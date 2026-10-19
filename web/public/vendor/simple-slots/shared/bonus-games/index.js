/**
 * Bonus Games Integration Module
 * 
 * This is the central hub for all bonus game types.
 * It provides functions to integrate different bonus games with the slot machine themes.
 */

// Import board game implementation
import * as BoardGame from './board-game/index.js';
import { checkForIncompleteBonusGame, resumeIncompleteBonusGame } from './incomplete-game-handler.js';

// Export the incomplete game handling functions
export { checkForIncompleteBonusGame, resumeIncompleteBonusGame };

/**
 * Check if a bonus game should be triggered based on scatter symbols
 * 
 * @param {Array} reelResults - 2D array of symbol IDs from reels
 * @param {Object} theme - Theme configuration
 * @returns {number} Number of scatter symbols found (0 if not enough to trigger)
 */
export function checkBonusTrigger(reelResults, theme) {

    console.log('checkBonusTrigger', reelResults, theme);
    // Get the theme's scatter symbol ID (default to 0)
    const scatterSymbolId = theme.config?.scatterSymbolId || 0;

    // Count how many scatter symbols are in the results
    let scatterCount = 0;
    for (const reel of reelResults) {
        for (const symbol of reel) {
            if (symbol === scatterSymbolId) {
                scatterCount++;
            }
        }
    }

    // Return the count of scatter symbols (0 if not enough)
    return scatterCount >= 3 ? scatterCount : 0;
}

/**
 * Load theme-specific bonus game configuration
 * 
 * @param {Object} theme - Theme configuration
 * @param {AudioContext} audioContext - Web audio context for loading sounds
 * @returns {Promise<Object>} The bonus game configuration
 */
export async function loadBonusGameConfig(theme, audioContext) {
    if (!theme) return null;

    // Determine which bonus game type to load based on theme configuration
    const bonusGameType = theme.bonusGame?.type || 'board-game';

    switch (bonusGameType) {
        case 'board-game':
            // Get base config structure
            const baseConfig = {
                boardSize: 24,
                diceMax: 6,
                boardLayout: 'circle',
                assets: {
                    background: null,
                    dice: [],
                    player: null,
                    tiles: {
                        win: null,
                        moveForward: null,
                        moveBackward: null
                    },
                    sounds: {
                        start: null,
                        roll: null,
                        move: null,
                        win: null
                    }
                },
                text: {
                    title: `${theme.name} Bonus Game`,
                    instructions: "Spin to move around the board!",
                    rollButton: "Spin",
                    winPrefix: "Win ",
                    forward: "Forward ",
                    backward: "Back ",
                    gameOver: "Bonus Complete!",
                    totalWin: "Total Win: "
                }
            };

            // If theme has specific bonus game config, merge it
            if (theme.bonusGame) {
                Object.assign(baseConfig, theme.bonusGame);
            }

            // Load assets if available
            if (baseConfig.assets) {
                baseConfig.assets = await loadAssets(baseConfig.assets, audioContext);
            }

            return baseConfig;

        // Add more bonus game types here in the future
        // case 'wheel-of-fortune':
        //     return loadWheelOfFortuneConfig(theme, audioContext);

        default:
            console.warn(`Unknown bonus game type: ${bonusGameType}`);
            return null;
    }
}

/**
 * Start a bonus game
 * 
 * @param {Object} theme - Theme configuration
 * @param {HTMLCanvasElement} canvas - Canvas element
 * @param {CanvasRenderingContext2D} ctx - Canvas rendering context
 * @param {Object} options - Additional options
 * @returns {Object} The bonus game instance
 */
export function startBonusGame(theme, canvas, ctx, options = {}) {
    if (!theme || !canvas || !ctx) {
        console.error('Missing required parameters for bonus game');
        return null;
    }    // Determine which bonus game type to start based on theme configuration
    const bonusGameType = theme.bonusGame?.type || 'board-game';
    switch (bonusGameType) {
        case 'board-game':
            const bonusGame = BoardGame.createBoardGameBonus({
                canvas,
                ctx,
                gameId: options.gameId || `bonus_${Date.now()}`,
                fixedBoardConfig: options.fixedBoardConfig || theme.bonusGame?.fixedBoardConfig,
                spinResults: options.spinResults,
                scatter: options.scatter || 3,
                betAmount: options.betAmount || 10,
                audioContext: options.audioContext,
                masterGainNode: options.masterGainNode,
                soundEnabled: options.soundEnabled !== false,
                onComplete: options.onComplete || function (winAmount) {
                    console.log(`Bonus game complete! Won: ${winAmount}`);
                },
                config: options.config
            });

            // Start the bonus game
            bonusGame.start();

            return bonusGame;

        // Add more bonus game types here in the future
        // case 'wheel-of-fortune':
        //     return startWheelOfFortuneGame(theme, canvas, ctx, options);

        default:
            console.warn(`Unknown bonus game type: ${bonusGameType}`);
            return null;
    }
}

/**
 * Load assets for the bonus game
 * 
 * @param {Object} assets - Assets configuration
 * @param {AudioContext} audioContext - Web audio context for sounds
 * @returns {Promise<Object>} Loaded assets
 */
async function loadAssets(assets, audioContext) {
    // Create a copy to avoid modifying the original
    const loadedAssets = JSON.parse(JSON.stringify(assets));

    // Load background image if provided
    if (loadedAssets.background && typeof loadedAssets.background === 'string') {
        loadedAssets.background = await loadImage(loadedAssets.background);
    }

    // Load player image if provided
    if (loadedAssets.player && typeof loadedAssets.player === 'string') {
        loadedAssets.player = await loadImage(loadedAssets.player);
    }

    // Load dice images
    if (loadedAssets.dice && Array.isArray(loadedAssets.dice)) {
        const dicePromises = loadedAssets.dice.map(dice => {
            return typeof dice === 'string' ? loadImage(dice) : Promise.resolve(dice);
        });
        loadedAssets.dice = await Promise.all(dicePromises);
    }

    // Load tile images
    if (loadedAssets.tiles) {
        for (const tileType in loadedAssets.tiles) {
            const tilePath = loadedAssets.tiles[tileType];
            if (typeof tilePath === 'string') {
                loadedAssets.tiles[tileType] = await loadImage(tilePath);
            }
        }
    }

    // Load sound assets
    if (loadedAssets.sounds && audioContext) {
        for (const soundType in loadedAssets.sounds) {
            const soundPath = loadedAssets.sounds[soundType];
            if (typeof soundPath === 'string') {
                loadedAssets.sounds[soundType] = await loadSound(soundPath, audioContext);
            }
        }
    }

    return loadedAssets;
}

// Map to store preloaded audio buffers for efficiency
const audioBuffers = {};

/**
 * Helper function to load an image
 * 
 * @param {string} src - Image source URL
 * @returns {Promise<HTMLImageElement>} Loaded image
 */
function loadImage(src) {
    return new Promise((resolve, reject) => {
        if (!src) {
            resolve(null);
            return;
        }

        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => {
            console.error(`Failed to load image: ${src}`);
            resolve(null);
        };
        img.src = src;
    });
}

/**
 * Helper function to load a sound file
 * 
 * @param {string} src - Sound source URL
 * @param {AudioContext} audioContext - Web audio context
 * @returns {Promise<AudioBuffer>} Loaded audio buffer
 */
async function loadSound(src, audioContext) {
    if (!src || !audioContext) {
        return null;
    }

    // Check if already loaded (cache hit)
    if (audioBuffers[src]) {
        return audioBuffers[src];
    }

    try {
        const response = await fetch(src);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

        // Cache the decoded buffer
        audioBuffers[src] = audioBuffer;

        return audioBuffer;
    } catch (error) {
        console.error(`Error loading sound ${src}:`, error);
        return null;
    }
}
