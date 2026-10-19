/**
 * Main bonus game class that integrates all modules
 */
import {
    DEFAULT_BOARD_CONFIGURATION,
    DEFAULT_SPIN_RESULTS,
    DEFAULT_TILE_CONFIG,
    DEFAULT_TEXT_CONFIG,
    DEFAULT_GAME_CONFIG
} from './config/board-config.js';
import { saveGameState, loadGameState, clearGameState } from './core/game-state.js';
import { generateBoard } from './core/board-generator.js';
import { drawBoard, drawTile } from './renderers/board-renderer.js';
import { drawPlayer } from './renderers/player-renderer.js';
import { drawSpinner, isSpinButtonClicked } from './renderers/spinner-renderer.js';
import {
    drawUI,
    drawBackground,
    prepareWinScreen,
    drawWinScreen
} from './renderers/ui-renderer.js';
import { spinReel } from './mechanics/spinner.js';
import { startMoving, processMove, shouldProcessMove } from './mechanics/movement.js';
import { processTileEffect } from './mechanics/tile-effects.js';
import { playSound } from './utils/audio.js';

/**
 * BoardGameBonus class - Main class for the bonus game
 */
export class BoardGameBonus {
    /**
     * Creates a new bonus game instance
     * 
     * @param {Object} options - Game options
     */
    constructor(options = {}) {
        // Canvas and rendering context
        this.canvas = options.canvas;
        this.ctx = options.ctx;

        // Initialize game state
        this.initGameState(options);

        // Set up game assets and configuration
        this.setupAssets(options);
        this.setupConfig(options);

        // Generate the game board
        this.board = generateBoard({
            fixedBoardConfig: this.fixedBoardConfig,
            tiles: this.config.tiles,
            boardSize: this.config.boardSize
        });

        // Bind event handlers
        this.handleClick = this.handleClick.bind(this);
    }

    /**
     * Initialize the game state
     */
    initGameState(options) {
        const savedState = options.savedState;

        // Game state
        this.active = false;
        this.position = savedState?.position || 0;
        this.totalWin = savedState?.totalWin || 0;
        this.currentRoll = null;
        this.moving = false;
        this.gameOver = false;
        this.scatter = options.scatter || 3;
        this.remainingSpins = savedState?.remainingSpins || options.scatter || 3;
        this.showingWinScreen = false;
        this.winAnimationStartTime = 0;
        this.displayWinAmount = 0;

        // Spinner state
        this.isSpinning = false;
        this.spinnerPosition = 0;
        this.spinnerSymbols = [1, 2, 3, 4, 5, 6];
        this.spinStartTime = 0;

        // Movement state
        this.moveStartTime = 0;

        // Game identifier for saving/loading
        this.gameId = options.gameId || `bonus_game_${Date.now()}`;

        // Fixed board configuration (if provided)
        this.fixedBoardConfig = options.fixedBoardConfig || null;

        // Predetermined spin results
        this.spinResults = options.spinResults || [];
        this.spinIndex = savedState?.spinIndex || 0;

        // Animation
        this.animationId = null;
        this.lastTime = 0;
    }

    /**
     * Set up game assets
     */
    setupAssets(options) {
        // Audio
        this.audioContext = options.audioContext;
        this.masterGainNode = options.masterGainNode;
        this.soundEnabled = options.soundEnabled !== false;

        // Callback when game ends
        this.onComplete = options.onComplete || function () { };
    }

    /**
     * Set up game configuration
     */
    setupConfig(options) {
        // Base configuration
        this.config = {
            boardSize: DEFAULT_GAME_CONFIG.boardSize,
            diceMax: DEFAULT_GAME_CONFIG.diceMax,
            boardLayout: DEFAULT_GAME_CONFIG.boardLayout,
            baseBet: options.betAmount || 10,
            tiles: DEFAULT_TILE_CONFIG,
            assets: {
                background: null,
                dice: [],
                player: null,
                tiles: {
                    win: null,
                    moveForward: null,
                    moveBackward: null,
                },
                sounds: {
                    start: null,
                    roll: null,
                    move: null,
                    win: null,
                }
            },
            text: DEFAULT_TEXT_CONFIG
        };

        // Override with theme-specific config
        if (options.config) {
            this.applyThemeConfig(options.config);
        }
    }

    /**
     * Apply theme-specific configuration
     */
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

    /**
     * Start the bonus game
     */
    start() {
        if (this.active) return;

        this.active = true;

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

    /**
     * Stop the bonus game
     */
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

    /**
     * Handle click events
     */
    handleClick(event) {
        if (!this.active || (this.gameOver && !this.showingWinScreen)) return;

        // Get mouse position
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        const mouseX = (event.clientX - rect.left) * scaleX;
        const mouseY = (event.clientY - rect.top) * scaleY;

        // Check if the spin button was clicked
        if (isSpinButtonClicked(
            mouseX,
            mouseY,
            this.canvas.width,
            this.canvas.height,
            this.isSpinning,
            this.moving,
            this.gameOver,
            this.showingWinScreen,
            this.remainingSpins
        )) {
            this.handleSpin();
        }

        // If on win screen, clicking anywhere will end the game
        if (this.showingWinScreen) {
            this.stop();
        }
    }

    /**
     * Handle spinning the reel
     */
    handleSpin() {
        // Create a game state object for the spinner mechanics
        const gameState = {
            isSpinning: this.isSpinning,
            moving: this.moving,
            remainingSpins: this.remainingSpins,
            spinStartTime: this.spinStartTime,
            currentRoll: this.currentRoll,
            spinIndex: this.spinIndex,
            gameOver: this.gameOver
        };

        // Spin the reel
        spinReel(
            gameState,
            this.spinResults,
            this.spinIndex,
            this.config.diceMax,
            (roll) => this.handleSpinComplete(roll),
            (sound) => this.playSound(sound),
            () => this.saveGameState()
        );

        // Update instance properties from gameState
        this.isSpinning = gameState.isSpinning;
        this.moving = gameState.moving;
        this.remainingSpins = gameState.remainingSpins;
        this.spinStartTime = gameState.spinStartTime;
        this.currentRoll = gameState.currentRoll;
        this.spinIndex = gameState.spinIndex;
        this.gameOver = gameState.gameOver;
    }

    /**
     * Handle spin completion
     */
    handleSpinComplete(roll) {
        this.currentRoll = roll;
        this.startMoving();
    }

    /**
     * Start moving the player
     */
    startMoving() {
        // Create a game state object for the movement mechanics
        const gameState = {
            moving: this.moving,
            moveStartTime: this.moveStartTime
        };

        // Start the movement
        startMoving(gameState, (sound) => this.playSound(sound));

        // Update instance properties from gameState
        this.moving = gameState.moving;
        this.moveStartTime = gameState.moveStartTime;
    }

    /**
     * Process player movement
     */
    handleProcessMove() {
        // Create a game state object for the movement mechanics
        const gameState = {
            position: this.position,
            currentRoll: this.currentRoll,
            moving: this.moving
        };

        // Process the movement
        processMove(
            gameState,
            this.board.length,
            (sound) => this.playSound(sound),
            () => this.processTileEffect()
        );

        // Update instance properties from gameState
        this.position = gameState.position;
        this.currentRoll = gameState.currentRoll;
        this.moving = gameState.moving;
    }

    /**
     * Process tile effect when landing on a tile
     */
    processTileEffect() {
        // Create a game state object for the tile effects
        const gameState = {
            position: this.position,
            totalWin: this.totalWin,
            currentRoll: this.currentRoll,
            moving: this.moving,
            remainingSpins: this.remainingSpins,
            isSpinning: this.isSpinning,
            gameOver: this.gameOver
        };

        // Process the tile effect
        processTileEffect(
            gameState,
            this.board,
            this.config.baseBet,
            (sound) => this.playSound(sound),
            () => this.startMoving(),
            () => this.saveGameState()
        );

        // Update instance properties from gameState
        this.position = gameState.position;
        this.totalWin = gameState.totalWin;
        this.currentRoll = gameState.currentRoll;
        this.moving = gameState.moving;
        this.gameOver = gameState.gameOver;
    }

    /**
     * Play a sound effect
     */
    playSound(soundName) {
        playSound(
            soundName,
            this.audioContext,
            this.masterGainNode,
            this.config.assets.sounds,
            this.soundEnabled
        );
    }

    /**
     * Save current game state
     */
    saveGameState() {
        return saveGameState({
            position: this.position,
            remainingSpins: this.remainingSpins,
            totalWin: this.totalWin,
            spinIndex: this.spinIndex,
            gameOver: this.gameOver,
            board: this.board
        }, this.gameId);
    }

    /**
     * Clear saved game state
     */
    clearGameState() {
        clearGameState(this.gameId);
    }

    /**
     * Main update loop
     */
    update(timestamp) {
        // Calculate delta time
        const deltaTime = (timestamp - this.lastTime) / 1000;
        this.lastTime = timestamp;

        // Clear the canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw the game
        this.draw(timestamp);

        // Process movement if needed
        if (shouldProcessMove(
            { moving: this.moving, moveStartTime: this.moveStartTime },
            timestamp
        )) {
            this.handleProcessMove();
            this.moveStartTime = timestamp;
        }

        // Continue animation loop if active
        if (this.active) {
            this.animationId = requestAnimationFrame(timestamp => this.update(timestamp));
        }
    }

    /**
     * Draw the game
     */
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
        drawUI(
            this.ctx,
            this.canvas.width,
            this.canvas.height,
            { position: this.position, totalWin: this.totalWin },
            this.board,
            this.config.text
        );

        // Draw game over state if applicable
        if (this.gameOver && !this.showingWinScreen) {
            this.prepareWinScreen(timestamp);
        }
    }

    /**
     * Prepare the win screen
     */
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
}

/**
 * Create a new bonus game instance
 * 
 * @param {Object} options - Game options
 * @returns {BoardGameBonus} New bonus game instance
 */
export function createBoardGameBonus(options = {}) {
    // Always use the fixed board configuration unless explicitly overridden
    if (!options.fixedBoardConfig) {
        options.fixedBoardConfig = DEFAULT_BOARD_CONFIGURATION;
    }

    // Use predetermined spin results unless explicitly provided
    if (!options.spinResults || options.spinResults.length === 0) {
        // Create spin results based on the number of scatters
        const spinsCount = options.scatter || 3;
        // Either use default or generate new predictable sequence
        options.spinResults = DEFAULT_SPIN_RESULTS.slice(0, spinsCount);
    }

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

    return new BoardGameBonus(options);
}
