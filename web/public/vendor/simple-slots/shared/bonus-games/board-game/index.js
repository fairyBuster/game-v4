/**
 * Board Game Bonus Feature
 * 
 * A fun and engaging bonus game that triggers when 3+ scatter symbols appear.
 * Players spin a wheel to move around a board with different tiles that award
 * prizes, extra moves, or other effects.
 */

import { generateBoard } from './core/board-generator.js';
import { saveGameState, loadGameState, clearGameState } from './core/game-state.js';
import { drawBoard, drawTile } from './renderers/board-renderer.js';
import { drawPlayer } from './renderers/player-renderer.js';
import { drawSpinner, isSpinButtonClicked } from './renderers/spinner-renderer.js';
import { drawUI, drawBackground, drawWinScreen, prepareWinScreen } from './renderers/ui-renderer.js';
import { spinReel } from './mechanics/spinner.js';
import { startMoving, processMove, shouldProcessMove } from './mechanics/movement.js';
import { processTileEffect } from './mechanics/tile-effects.js';
import { playSound } from './utils/audio.js';
import { DEFAULT_BOARD_CONFIGURATION, DEFAULT_SPIN_RESULTS, DEFAULT_TILE_CONFIG, DEFAULT_TEXT_CONFIG } from './config/board-config.js';

/**
 * BoardGameBonus class - Main implementation of the board game bonus feature
 */
export class BoardGameBonus {
    constructor(options = {}) {
        // Canvas and context
        this.canvas = options.canvas;
        this.ctx = options.ctx;

        // Game state
        this.active = false;
        this.position = options.savedState?.position || 0;
        this.totalWin = options.savedState?.totalWin || 0;
        this.currentRoll = null;
        this.moving = false;
        this.gameOver = false;
        this.scatter = options.scatter || 3; // Number of scatters that triggered the bonus
        this.remainingSpins = options.savedState?.remainingSpins || options.scatter || 3; // Remaining spins based on scatter count
        this.showingWinScreen = false;
        this.winAnimationStartTime = 0;
        this.displayWinAmount = 0;

        // Game identifier for saving/loading state
        this.gameId = options.gameId || `bonus_game_${Date.now()}`;

        // Fixed board configuration (if provided)
        this.fixedBoardConfig = options.fixedBoardConfig || null;        // Predetermined spin results
        // If we have saved spin results, use those
        // If not, generate random results based on the number of remaining spins
        if (options.savedState?.spinResults) {
            this.spinResults = options.savedState.spinResults;
        } else if (options.spinResults && options.spinResults.length > 0) {
            // Use provided spin results (for testing or fixed scenarios)
            this.spinResults = options.spinResults;
        } else {
            // Generate random spin results for all spins at initialization
            this.spinResults = this.generateRandomSpinResults(this.remainingSpins);
            console.log("Generated predetermined spin results:", this.spinResults);
        }
        this.spinIndex = options.savedState?.spinIndex || 0;

        // Spinner state
        this.isSpinning = false;
        this.spinnerPosition = 0;
        this.spinnerSymbols = [1, 2, 3, 4, 5, 6]; // Values that can appear on the spinner

        // Timers and animation
        this.animationId = null;
        this.lastTime = 0;
        this.spinStartTime = 0;
        this.moveStartTime = 0;

        // Audio
        this.audioContext = options.audioContext;
        this.masterGainNode = options.masterGainNode;
        this.soundEnabled = options.soundEnabled !== false;

        // Callback when game ends
        this.onComplete = options.onComplete || function () { };

        // Base configuration - will be overridden by theme
        this.config = {
            boardSize: 24, // Number of tiles
            diceMax: 6,    // Maximum dice roll
            boardLayout: 'circle', // 'circle', 'square', 'path'
            baseBet: options.betAmount || 10,
            tiles: DEFAULT_TILE_CONFIG,
            // Theme-specific assets will be set via theme config
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
            // Theme-specific text
            text: DEFAULT_TEXT_CONFIG
        };

        // Override with theme-specific config
        if (options.config) {
            this.applyThemeConfig(options.config);
        }

        // Generate the game board
        this.board = this.generateBoard();

        // Bind event handlers
        this.handleClick = this.handleClick.bind(this);
    }

    // Apply theme-specific configuration
    applyThemeConfig(themeConfig) {
        // Deep merge the theme config with the base config
        if (themeConfig.boardSize) this.config.boardSize = themeConfig.boardSize;
        if (themeConfig.diceMax) this.config.diceMax = themeConfig.diceMax;
        if (themeConfig.boardLayout) this.config.boardLayout = themeConfig.boardLayout;

        // Merge tile configuration
        if (themeConfig.tiles) {
            for (const tileType in themeConfig.tiles) {
                if (this.config.tiles[tileType]) {
                    Object.assign(this.config.tiles[tileType], themeConfig.tiles[tileType]);
                }
            }
        }

        // Merge assets
        if (themeConfig.assets) {
            Object.assign(this.config.assets, themeConfig.assets);
        }

        // Merge text
        if (themeConfig.text) {
            Object.assign(this.config.text, themeConfig.text);
        }
    }

    // Generate the game board
    generateBoard() {
        return generateBoard({
            fixedBoardConfig: this.fixedBoardConfig,
            tiles: this.config.tiles,
            boardSize: this.config.boardSize
        });
    }

    // Start the bonus game
    start() {
        if (this.active) return;

        this.active = true;
        // We're using the position from the constructor now, which could be from a saved state
        // Only reset win amount and game over state if we're not resuming a saved game
        if (!this.fixedBoardConfig && this.totalWin === 0) {
            this.totalWin = 0;
            this.gameOver = false;
        }

        // Play start sound
        this.playSound('start');

        // Add event listener for clicks
        this.canvas.addEventListener('click', this.handleClick);

        // Start the animation loop
        this.lastTime = performance.now();
        this.animationId = requestAnimationFrame(timestamp => this.update(timestamp));

        // Save initial game state
        this.saveGameState();
    }

    // Stop the bonus game
    stop() {
        this.active = false;

        // Remove event listener
        this.canvas.removeEventListener('click', this.handleClick);

        // Stop animation loop
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }

        // Clear the saved game state as the game is complete
        this.clearGameState();

        // Call the completion callback with the total win
        this.onComplete(this.totalWin);
    }

    // Handle clicks during the bonus game
    handleClick(event) {
        if (!this.active || (this.gameOver && !this.showingWinScreen)) return;

        // Get mouse position
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        const mouseX = (event.clientX - rect.left) * scaleX;
        const mouseY = (event.clientY - rect.top) * scaleY;

        // Check if the spin button was clicked
        if (this.isSpinButtonClicked(mouseX, mouseY)) {
            this.spinReel();
        }

        // If on win screen, clicking anywhere will end the game
        if (this.showingWinScreen) {
            this.stop();
        }
    }

    // Check if the spin button was clicked
    isSpinButtonClicked(x, y) {
        return isSpinButtonClicked(
            x, y,
            this.canvas.width,
            this.canvas.height,
            this.isSpinning,
            this.moving,
            this.gameOver,
            this.showingWinScreen,
            this.remainingSpins
        );
    }

    // Spin the reel
    spinReel() {
        spinReel(
            this,
            this.spinResults,
            this.spinIndex,
            this.config.diceMax,
            (roll) => this.startMoving(),
            (sound) => this.playSound(sound),
            () => this.saveGameState()
        );
    }

    // Start moving the player
    startMoving() {
        startMoving(this, (sound) => this.playSound(sound));
    }

    // Process a single step move
    processMove() {
        processMove(
            this,
            this.board.length,
            (sound) => this.playSound(sound),
            () => this.processTileEffect()
        );
    }

    // Process the effect of the current tile
    processTileEffect() {
        processTileEffect(
            this,
            this.board,
            this.config.baseBet,
            (sound) => this.playSound(sound),
            () => this.startMoving(),
            () => this.saveGameState()
        );
    }    // Main update loop
    update(timestamp) {
        // Calculate delta time
        const deltaTime = (timestamp - this.lastTime) / 1000;
        this.lastTime = timestamp;

        // Clear the canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw the game
        this.draw(timestamp);

        // Process movement if needed
        if (shouldProcessMove(this, timestamp)) {
            this.processMove();
            // Update the move timer after processing a step to control the timing of the next step
            this.moveStartTime = timestamp;
        }

        // Continue animation loop if active
        if (this.active) {
            this.animationId = requestAnimationFrame(timestamp => this.update(timestamp));
        }
    }

    // Draw the game
    draw(timestamp) {
        // Draw background
        drawBackground(this.ctx, this.canvas.width, this.canvas.height, this.config.assets.background);

        // If showing win screen, only draw that
        if (this.showingWinScreen) {
            this.displayWinAmount = drawWinScreen(
                this.ctx,
                this.canvas.width,
                this.canvas.height,
                timestamp,
                this.winAnimationStartTime,
                this.totalWin
            );
            return;
        }

        // Draw board
        drawBoard(this.ctx, this.board, this.config, this.canvas.width, this.canvas.height);

        // Draw player
        drawPlayer(this.ctx, this.board, this.position, this.config.assets.player);

        // Draw spinner
        drawSpinner(
            this.ctx,
            this.canvas.width,
            this.canvas.height,
            {
                isSpinning: this.isSpinning,
                spinStartTime: this.spinStartTime,
                currentRoll: this.currentRoll,
                symbols: this.spinnerSymbols
            },
            this.remainingSpins,
            this.gameOver,
            this.moving
        );

        // Draw UI
        drawUI(this.ctx, this.canvas.width, this.canvas.height, this, this.board, this.config.text);

        // Draw game over state if applicable
        if (this.gameOver && !this.showingWinScreen) {
            this.prepareWinScreen(timestamp);
        }
    }

    // Prepare to show the win screen
    prepareWinScreen(timestamp) {
        prepareWinScreen(
            this.showingWinScreen,
            this.remainingSpins,
            () => {
                this.showingWinScreen = true;
                this.winAnimationStartTime = performance.now();
                this.displayWinAmount = 0;

                // Play the win sound
                this.playSound('win');
            }
        );
    }

    // Play a sound effect
    playSound(name) {
        playSound(
            name,
            this.audioContext,
            this.masterGainNode,
            this.config.assets.sounds,
            this.soundEnabled
        );
    }

    // Save current game state
    saveGameState() {
        return saveGameState(this, this.gameId);
    }

    // Clear saved game state
    clearGameState() {
        clearGameState(this.gameId);
    }

    // Generate random spin results for all available spins
    generateRandomSpinResults(numSpins) {
        const results = [];
        const diceMax = this.config?.diceMax || 6;

        for (let i = 0; i < numSpins; i++) {
            // Generate a random number between 1 and diceMax (inclusive)
            const roll = Math.floor(Math.random() * diceMax) + 1;
            results.push(roll);
        }

        return results;
    }
}

/**
 * Create a board game bonus instance
 */
export function createBoardGameBonus(options = {}) {
    // Check if we have a game ID and should try to load a saved state
    if (options.gameId) {
        const savedState = loadGameState(options.gameId);
        if (savedState) {
            console.log(`Resuming saved bonus game: ${options.gameId}`);
            // If we found a saved state, include it in the options
            options.savedState = savedState;
            // Use the saved board configuration if available
            if (savedState.board) {
                options.fixedBoardConfig = savedState.board;
            }
        }
    }

    // Always use fixed board configuration unless explicitly overridden
    if (!options.fixedBoardConfig) {
        options.fixedBoardConfig = DEFAULT_BOARD_CONFIGURATION;
    }

    // Use predetermined spin results unless explicitly provided
    if (!options.spinResults || options.spinResults.length === 0) {
        const spinsCount = options.scatter || 3;
        options.spinResults = DEFAULT_SPIN_RESULTS.slice(0, spinsCount);
    }

    return new BoardGameBonus(options);
}
