// Import themes FIRST
import { THEMES } from './themes/index.js'; // <-- Import themes from refactored structure
import { EffectsHelper } from './shared/effects.js'; // <-- Import EffectsHelper from shared
import { checkBonusTrigger, loadBonusGameConfig, startBonusGame } from './shared/bonus-games/index.js'; // <-- Import bonus game functions

// ---------------------------------------------------------------------------------
// DY01 portal wallet bridge
// The lobby frames this build in an iframe (?portal=1&alias=slot-xxxx). In that mode
// the balance is NOT ours to keep: every stake and payout is asked of the parent,
// which settles against the shared DY01 wallet. `balance` then becomes a mirror the
// server keeps in sync — money still only moves on the backend.
const PORTAL_BETS = [200, 500, 1000, 2500, 5000, 10000];
const portalWallet = {
    on: false,
    ready: false,
    alias: '',
    spinId: null,
    seq: 0,
    waiting: new Map(),
    init() {
        if (window.parent === window) return;                 // not framed
        const params = new URLSearchParams(window.location.search);
        if (params.get('portal') !== '1') return;             // framed, but not by the portal
        this.on = true;
        this.alias = params.get('alias') || '';
        window.addEventListener('message', (event) => {
            if (event.origin !== window.location.origin) return;
            const data = event.data || {};
            if (data.source !== 'dy01-portal') return;
            if (data.type === 'balance') { balance = Number(data.value) || 0; this.ready = true; return; }
            const key = data.type + ':' + data.id;
            const pending = this.waiting.get(key);
            if (pending) { this.waiting.delete(key); pending(data); }
        });
        // keep asking until the parent answers with our balance (iframe may beat its listener)
        const announce = (tries) => {
            if (this.ready) return;
            window.parent.postMessage({ source: 'dy01-vendor', type: 'ready' }, window.location.origin);
            if (tries > 0) setTimeout(() => announce(tries - 1), 900);
        };
        announce(6);
    },
    ask(type, payload) {
        return new Promise((resolve) => {
            const id = ++this.seq;
            this.waiting.set(type + ':' + id, resolve);
            window.parent.postMessage({ source: 'dy01-vendor', type, id, alias: this.alias, ...payload }, window.location.origin);
            setTimeout(() => {                                     // never leave a spin hanging
                if (this.waiting.delete(type + ':' + id)) resolve({ ok: false, message: 'portal tidak merespons' });
            }, 8000);
        });
    },
    /** charge the stake through the shared wallet -> {ok, balance, spinId, message} */
    async bet(amount) {
        const r = await this.ask('bet', { amount });
        if (r.ok) { balance = Number(r.balance) || balance; this.spinId = r.spinId ?? null; }
        return r;
    },
    /** credit a payout (line win or bonus) into the shared wallet */
    async win(amount) {
        const r = await this.ask('win', { amount, spinId: this.spinId });
        if (r.ok) { balance = Number(r.balance) || balance; this.spinId = null; }
        return r;
    },
};
portalWallet.init();

// Small toast for wallet errors inside the frame
let notifyTimer = null;
function notify(text) {
    const el = document.getElementById('portalMsg');
    if (!el) { console.warn(text); return; }
    el.textContent = text;
    el.classList.add('on');
    clearTimeout(notifyTimer);
    notifyTimer = setTimeout(() => el.classList.remove('on'), 2600);
}

// Loading screen constants
const MINIMUM_LOADING_TIME = 3000; // Minimum time to show loading screen (3 seconds)
let loadingStartTime = 0;
let loadingScreenActive = false;
let themeLoadPromise = null;

// Loading screen functions
function showLoadingScreen(themeName) {
    const loadingScreen = document.getElementById('loadingScreen');
    if (!loadingScreen) return false;

    // Get theme-specific loading background if available
    const theme = THEMES[themeName];
    if (theme && theme.loadingBackground) {
        loadingScreen.style.backgroundImage = `url(${theme.loadingBackground})`;
    } else if (theme && theme.background) {
        // Fall back to regular theme background if loading background isn't specified
        loadingScreen.style.backgroundImage = `url(${theme.background})`;
    } else {
        // Default fallback
        loadingScreen.style.backgroundImage = 'none';
        loadingScreen.style.backgroundColor = '#0f172a';
    }

    // Set theme color for spinner
    if (theme && theme.layout && theme.layout.themeColor) {
        document.documentElement.style.setProperty('--theme-color', theme.layout.themeColor);
    }

    loadingScreen.style.display = 'flex';
    loadingScreen.style.opacity = '1';
    loadingStartTime = Date.now();
    loadingScreenActive = true;
    return true;
}

function hideLoadingScreen() {
    const loadingScreen = document.getElementById('loadingScreen');
    if (!loadingScreen) return false;

    const currentTime = Date.now();
    const elapsedTime = currentTime - loadingStartTime;

    // Ensure the loading screen displays for at least MINIMUM_LOADING_TIME
    if (elapsedTime < MINIMUM_LOADING_TIME) {
        setTimeout(() => {
            completeHideLoadingScreen();
        }, MINIMUM_LOADING_TIME - elapsedTime);
    } else {
        completeHideLoadingScreen();
    }

    return true;
}

function completeHideLoadingScreen() {
    const loadingScreen = document.getElementById('loadingScreen');
    if (!loadingScreen) return;

    loadingScreen.style.opacity = '0';
    setTimeout(() => {
        loadingScreen.style.display = 'none';
        loadingScreenActive = false;
    }, 500); // Wait for fade out transition
}

// Game constants and variables
const REEL_COUNT = 5;
// const SYMBOL_COUNT = 5; // No longer needed directly, derived from theme
const SYMBOL_SIZE = 100; // Pixel size of each symbol

// Define the number of results per page for the history modal
const RESULTS_PER_PAGE = 10;

// Helper function to lighten a color by a percentage
function lightenColor(color, percent) {
    // Convert hex to RGB
    let r = parseInt(color.substring(1, 3), 16);
    let g = parseInt(color.substring(3, 5), 16);
    let b = parseInt(color.substring(5, 7), 16);

    // Lighten
    r = Math.min(255, Math.round(r + (255 - r) * (percent / 100)));
    g = Math.min(255, Math.round(g + (255 - g) * (percent / 100)));
    b = Math.min(255, Math.round(b + (255 - b) * (percent / 100)));

    // Convert back to hex
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}
const REEL_SPIN_SPEED_FACTOR = 50; // Controls max speed (higher = faster) - ADJUST AS NEEDED
const SPIN_DURATION = 4000; // Base duration in ms
const DECELERATION_DURATION_RATIO = 0.4; // % of duration used for deceleration
const REEL_STAGGER_START = 80; // ms delay between reel starts
const REEL_STAGGER_STOP = 150; // ms added to duration for each subsequent reel
const DEFAULT_BALANCE = 1000;
const DEFAULT_BET = 10;
const VISIBLE_ROWS = 3; // Should always be 3 for this layout
const SYMBOLS_ON_STRIP = 30; // How many symbols on the virtual reel strip

// Game state
let canvas;
let ctx;
let balance = DEFAULT_BALANCE; // standalone only; while framed by the portal this mirrors the shared wallet
let betAmount = DEFAULT_BET;
let spinning = false;
let bonusGameActive = false; // Track when a bonus game is in progress
let reels = []; // Holds reel state objects { position, symbols[], targetPosition, spinning, ... }
let currentReelResults = []; // Stores final symbol IDs [reelIndex][rowIndex] after spin
let winningLines = []; // Tracks which paylines resulted in wins
let payTable = [];
let spinHistory = [];
let historyCurrentPage = 0; // Track current page for history pagination
let backgroundParticles = [];
let svgSymbolSheet; // Hold the SVG sprite sheet Image object
let svgLoaded = false; // Track if the SVG has been loaded
let warpStars = []; // For space theme star warping effect
let lastTime = 0;
let winAnimationActive = false; // State tracking for win celebrations
let buttonEffects = {
    spin: { scale: 1, active: false, pressed: false },
    bet: { scale: 1, active: false, pressed: false, decreaseActive: false, increaseActive: false }
};

// Sound effects
let soundEnabled = true;
let audioContext;
let audioBuffers = {}; // Store decoded audio buffers
let hasUserInteraction = false; // Track if user has interacted with the page
let backgroundMusicSource = null; // For tracking and controlling background music
let currentThemeSounds = { // Track which theme sounds are currently loaded
    theme: null,
    backgroundLoaded: false,
    spinLoaded: false,
    winLoaded: false
};
let muteState = false; // Track if sound is muted
let showPaylines = false; // Track if paylines should be visible
let showHistory = false; // Track if history modal should be visible
let showPaytable = false; // Track if paytable modal should be visible

// Audio gain nodes for volume control
let masterGainNode = null;
let backgroundGainNode = null;
let effectsGainNode = null;
let themeVolumeSettings = {
    master: 1.0,
    background: 1.0,
    effects: 1.0
};

// Create a variable to store the spin sound source
let spinSoundSource = null;

// Function to stop the spin sound
function stopSpinSound() {
    if (spinSoundSource) {
        try {
            spinSoundSource.stop();
            spinSoundSource = null;
        } catch (error) {
            console.error("Error stopping spin sound:", error);
        }
    }
}
let winAmount;
// DOM Elements
let balanceElement;
let betAmountElement;
let spinButton;
let decreaseBetButton;
let increaseBetButton;

// --- Game State Variable ---
let currentThemeName = "Aztec"; // Default theme
let symbols = []; // Holds the currently loaded symbol objects for the active theme

// --- REMOVED OLD SYMBOLS and REEL_SETS ---
// const SYMBOLS = [ ... ]; // REMOVED
// const REEL_SETS = { ... }; // REMOVED

// --- Initialize game when all content is loaded ---
window.addEventListener('load', initGame);

// Parse URL parameters to check for theme
function getThemeFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    const themeParam = urlParams.get('theme');

    if (themeParam && THEMES[themeParam]) {
        console.log(`Found valid theme parameter: ${themeParam}`);
        return themeParam;
    }
    return null;
}

// Wait for the DOM to fully load before initializing window.betAmount
window.addEventListener('DOMContentLoaded', () => {
    const betAmountElement = document.getElementById('betAmount');
    if (betAmountElement) {
        const betAmountValue = parseFloat(betAmountElement.textContent);
        if (!isNaN(betAmountValue)) {
            window.betAmount = betAmountValue;
        } else {
            console.warn('Invalid bet amount in <span> element. Defaulting to 10.');
            window.betAmount = 10; // Default value
        }
    } else {
        console.warn('<span id="betAmount"> element not found. Defaulting to 10.');
        window.betAmount = 10; // Default value
    }

    // Check for theme URL parameter
    const urlTheme = getThemeFromURL();
    if (urlTheme) {
        currentThemeName = urlTheme; // Set the theme name before initialization
        console.log(`Setting initial theme from URL: ${urlTheme}`);
    }
});

function initGame() {
    console.log("[DEBUG] initGame - START"); // <-- Log Start

    // Get DOM elements
    canvas = document.getElementById('gameCanvas');
    // Check if canvas exists immediately
    if (!canvas) {
        console.error("CRITICAL: Canvas element with ID 'gameCanvas' not found!");
        return; // Stop if no canvas
    }
    ctx = canvas.getContext('2d');
    if (!ctx) {
        console.error("CRITICAL: Failed to get 2D context from canvas!");
        return; // Stop if no context
    } console.log("[DEBUG] initGame - Canvas and Context obtained."); balanceElement = document.getElementById('balance');
    betAmountElement = document.getElementById('betAmount');
    spinButton = document.getElementById('spinButton');
    decreaseBetButton = document.getElementById('decreaseBet');
    increaseBetButton = document.getElementById('increaseBet');
    console.log("[DEBUG] initGame - DOM elements retrieved.");

    // Framed by the portal: stake in rupiah, starting at the second rung of the ladder.
    if (portalWallet.on && !PORTAL_BETS.includes(betAmount)) betAmount = PORTAL_BETS[1];

    // Check for saved bonus game state
    const savedBonusGameState = localStorage.getItem('bonusGameState');
    let bonusStateToRestore = null;

    if (savedBonusGameState) {
        try {
            bonusStateToRestore = JSON.parse(savedBonusGameState);
            console.log("[DEBUG] initGame - Found saved bonus game state:", bonusStateToRestore);

            // Check if the saved state is not too old (e.g., 1 hour max)
            const MAX_BONUS_STATE_AGE = 60 * 60 * 1000; // 1 hour in milliseconds
            if (Date.now() - bonusStateToRestore.timestamp > MAX_BONUS_STATE_AGE) {
                console.log("[DEBUG] initGame - Saved bonus state is too old, discarding");
                localStorage.removeItem('bonusGameState');
                bonusStateToRestore = null;
            } else if (bonusStateToRestore.active) {
                // Set the current theme to the one that had the bonus game
                currentThemeName = bonusStateToRestore.theme || currentThemeName;
                // Set the bet amount to match the saved state
                betAmount = bonusStateToRestore.betAmount || DEFAULT_BET;
            }
        } catch (e) {
            console.error("[DEBUG] initGame - Error parsing saved bonus game state:", e);
            localStorage.removeItem('bonusGameState');
            bonusStateToRestore = null;
        }
    }

    // Load sound effects
    console.log("[DEBUG] initGame - Loading sounds...");
    loadSounds(); // Assuming this doesn't block indefinitely

    // Set up event listeners
    console.log("[DEBUG] initGame - Setting up event listeners...");
    if (spinButton) spinButton.addEventListener('click', () => { if (!spinning) spinReels(); });
    if (decreaseBetButton) decreaseBetButton.addEventListener('click', decreaseBet);
    if (increaseBetButton) increaseBetButton.addEventListener('click', increaseBet);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mouseup', handleMouseUp);

    // Themes are one game each in the DY01 portal, so there is no in-game switcher.
    // 1. Validate shared config first
    console.log("[DEBUG] initGame - Validating configuration...");
    const isConfigValid = validateConfiguration();
    console.log(`[DEBUG] initGame - Configuration valid: ${isConfigValid}`); // <-- Log validation result
    if (!isConfigValid) {
        console.error("CRITICAL: Initial configuration validation failed. Game cannot start.");
        if (ctx) {
            ctx.fillStyle = 'red'; ctx.font = '24px Arial'; ctx.textAlign = 'center';
            ctx.fillText("Configuration Error!", canvas.width / 2, canvas.height / 2);
        }
        return; // Stop initialization
    }

    // Show loading screen before loading theme assets
    console.log("[DEBUG] initGame - Showing loading screen...");
    showLoadingScreen(currentThemeName);

    // 2. Load initial theme's VISUALS
    console.log(`[DEBUG] initGame - Loading visuals for theme: ${currentThemeName}...`);
    loadThemeVisuals(currentThemeName).then(() => {
        console.log("[DEBUG] initGame - Theme visuals loaded successfully."); // <-- Log success

        // 3. Initialize reels using the validated GLOBAL config
        console.log("[DEBUG] initGame - Initializing reels...");
        initReels();
        console.log("[DEBUG] initGame - Reels initialized.");

        // 4. Update displays
        console.log("[DEBUG] initGame - Updating balance/bet displays...");
        updateBalanceDisplay();
        updateBetDisplay(); // Also calls populatePaytable

        // 5. Start the game loop
        console.log("[DEBUG] initGame - Starting game loop (requestAnimationFrame)..."); // <-- Log before final step
        requestAnimationFrame(drawGame);
        console.log("[DEBUG] initGame - Game loop requested.");

    }).catch(error => {
        console.error("CRITICAL: Failed to initialize game after loading theme visuals:", error); // Log the actual error
        // Handle initialization error (e.g., display error on canvas)
        if (ctx) {
            ctx.fillStyle = 'red'; ctx.font = '20px Arial'; ctx.textAlign = 'center';
            ctx.fillText("Theme Loading Error!", canvas.width / 2, canvas.height / 2);
        }
    });
    console.log("[DEBUG] initGame - End of synchronous part (loadThemeVisuals promise pending)."); // <-- Log end of sync code
}

function validateConfiguration() {
    let isValid = true;
    console.log("Checking theme", currentThemeName); // <-- Log current theme name
    // Get current theme's configuration
    const currentTheme = THEMES[currentThemeName];
    if (!currentTheme) {
        console.error(`Config Error: Invalid theme name: ${currentThemeName}`);
        return false;
    }    // Get theme-specific configuration from the imported config
    const themeConfig = currentTheme.config || {};
    // Access the named exports directly
    const reelStrips = themeConfig.reelStrips;
    const symbolNumberMultipliers = themeConfig.symbolNumberMultipliers;
    console.log("Theme config loaded:", themeConfig);
    console.log("Accessing reelStrips:", reelStrips);

    if (!reelStrips || reelStrips.length !== REEL_COUNT) {
        console.error("Config Error: Theme reelStrips is missing or doesn't have 5 reels.");
        isValid = false;
    } else {
        reelStrips.forEach((strip, i) => {
            if (!strip || strip.length === 0) {
                console.error(`Config Error: Reel strip ${i} is empty.`);
                isValid = false;
            } else {
                // Check if all indices are valid numbers (0-4 in this case)
                const validIndices = Object.keys(symbolNumberMultipliers || {}).map(Number); // Get valid symbol numbers [0, 1, 2, 3, 4]
                if (strip.some(index => !validIndices.includes(index))) {
                    console.error(`Config Error: Reel strip ${i} contains invalid symbol numbers. Valid numbers are: ${validIndices.join(', ')}`, strip);
                    isValid = false;
                }
            }
        });
    }
    if (!symbolNumberMultipliers || Object.keys(symbolNumberMultipliers).length !== currentTheme.symbols.attributes.length) { // Assuming 5 unique symbols 0-4
        console.error("Config Error: symbolNumberMultipliers is missing or doesnt match the number of symbols.");
        isValid = false;
    } if (!themeConfig.PAYOUT_RULES) {
        console.error("Config Error: PAYOUT_RULES are missing or incomplete (need entries for 3, 4, 5).");
        isValid = false;
    }
    if (!themeConfig.PAYLINES || themeConfig.PAYLINES.length === 0) {
        console.error("Config Error: PAYLINES are missing or incomplete");
        isValid = false;
    }

    return isValid;
}

// Function to draw a symbol from the SVG sprite sheet
function drawSymbol(symbolName, context, dx, dy, dw, dh) {
    const themeKey = currentThemeName.toLowerCase().replace(/\s+/g, '');

    // First check if we have a valid symbol map for the current theme
    if (!svgLoaded || !svgSymbolSheet || !SYMBOL_MAPS[themeKey] || !SYMBOL_MAPS[themeKey][symbolName.toLowerCase()]) {
        // console.warn(`SVG not loaded or symbol ${symbolName} not found in symbol map.`);
        return false; // Return false to indicate symbol wasn't drawn from SVG
    }

    const s = SYMBOL_MAPS[themeKey][symbolName.toLowerCase()];
    context.drawImage(
        svgSymbolSheet,
        s.sx, s.sy, s.sw, s.sh, // Source rectangle (from SVG)
        dx, dy, dw, dh          // Destination rectangle (on canvas)
    );
    return true; // Return true to indicate symbol was drawn from SVG
}

async function loadThemeVisuals(themeName) {
    console.log(`Attempting to load visuals for theme: ${themeName}`);
    // Get a fresh copy of the theme to avoid using a previously modified version
    let themeVisuals = JSON.parse(JSON.stringify(THEMES[themeName])); // Make a deep copy
    svgLoaded = false; // Reset SVG loaded state

    // First check if theme exists
    if (!themeVisuals) {
        console.error(`Theme "${themeName}" not found. Falling back to Aztec.`);
        themeName = "Aztec"; // Default fallback theme name
        themeVisuals = JSON.parse(JSON.stringify(THEMES[themeName])); // Make a deep copy
        if (!themeVisuals) {
            console.error("CRITICAL: Fallback theme 'Aztec' not found!");
            return Promise.reject(new Error("Failed to load any valid theme."));
        }
    }

    // Create a standardized symbols array from theme data
    let symbolsArray = [];

    // Keep track of whether we should use sprite map
    let useSprite = false;
    let spriteMapPath = null;
    let symbolMapData = null;    // Handle different theme symbol formats
    if (themeVisuals.symbols) {
        if (themeVisuals.symbols.attributes && Array.isArray(themeVisuals.symbols.attributes) && themeVisuals.symbols.attributes.length > 0) {
            console.log(`Theme ${themeName} using new attributes array format with ${themeVisuals.symbols.attributes.length} symbols`);

            // Using the new attributes array directly
            themeVisuals.symbols.attributes.forEach(symbolAttr => {
                const symbolObj = {
                    name: symbolAttr.name || `Symbol ${symbolAttr.id}`,
                    id: symbolAttr.id !== undefined ? symbolAttr.id : symbolsArray.length,
                    backgroundColor: symbolAttr.backgroundColor === undefined ? "#ffffff" : symbolAttr.backgroundColor,
                    imagePath: symbolAttr.imagePath || null,
                    animation: symbolAttr.animation || null
                };

                symbolsArray.push(symbolObj);
            });

            // Check if theme is configured to use sprite sheet
            useSprite = themeVisuals.symbols.useSprite === true;

            if (useSprite) {
                spriteMapPath = themeVisuals.symbols.path || `./themes/${themeName.toLowerCase().replace(/\s+/g, '')}/images/symbols.svg`;
                symbolMapData = themeVisuals.symbols.spriteMap;
                console.log(`Theme ${themeName} using sprite map from ${spriteMapPath}`);

                // Validate sprite map data
                if (!symbolMapData) {
                    console.warn(`Theme ${themeName} has useSprite=true but missing spriteMap data. Falling back to individual images.`);
                    useSprite = false;
                }
            }

            // Store in window for reference by other functions
            window.SYMBOL_MAPS = window.SYMBOL_MAPS || {};
            window.SYMBOL_MAPS[themeName.toLowerCase().replace(/\s+/g, '')] = symbolMapData;
        } else {
            console.error(`Theme "${themeName}" has invalid symbols structure.`);
            return Promise.reject(new Error("Invalid theme symbols structure."));
        }
    } else {
        console.error(`Theme "${themeName}" is missing symbols.`);
        return Promise.reject(new Error("Theme missing symbols."));
    }    // Store our standardized symbols array and update themeVisuals.symbols with it
    themeVisuals.symbols = symbolsArray;

    // Set current theme name and update body class for CSS styling
    currentThemeName = themeName;
    document.body.className = `theme-${themeName.toLowerCase().replace(/\s+/g, '-')}`;
    console.log(`Loading symbol visuals for theme: ${currentThemeName}`);
    symbols = []; // Clear existing symbols

    let loadSvgPromise;

    // Only try to load SVG sprite sheet if useSprite is true
    if (useSprite && spriteMapPath) {
        console.log(`Loading SVG sprite sheet from: ${spriteMapPath}`);

        // Create a promise to load the SVG sprite sheet
        loadSvgPromise = new Promise((resolve) => {
            svgSymbolSheet = new Image();
            svgSymbolSheet.onload = () => {
                console.log(`Successfully loaded SVG sprite sheet for theme: ${themeName}`);
                svgLoaded = true;
                resolve(true);
            };
            svgSymbolSheet.onerror = (err) => {
                console.warn(`Failed to load SVG sprite sheet for theme: ${themeName}:`, err);
                svgLoaded = false;
                resolve(false); // Resolve with false to indicate failure
            };
            svgSymbolSheet.src = spriteMapPath;
        });
    } else {
        // If not using sprite, create a resolved promise to maintain flow
        loadSvgPromise = Promise.resolve(false);
    }

    // Wait for the SVG sprite sheet to load (or fail) before continuing
    const spritesheetLoaded = await loadSvgPromise;

    // If sprite sheet was supposed to load but failed, log a warning
    if (useSprite && !spritesheetLoaded) {
        console.warn(`Sprite sheet failed to load for theme ${themeName}. Will try individual images as fallback.`);
    }

    const themeSymbolsData = themeVisuals.symbols; // Get the 5 symbols

    // Process symbol loading based on sprite sheet or individual images
    const symbolPromises = themeSymbolsData.map((symbolData, index) => {
        // Basic validation of visual data
        if (!symbolData || !symbolData.name) {
            console.warn(`Invalid symbol visual data at index ${index} for theme ${themeName}`, symbolData);
            // Create a placeholder visual if needed
            symbols[index] = { name: `Symbol ${index}`, path: null, image: null, color: getRandomColor(), id: index };
            return Promise.resolve();
        }

        return new Promise((resolve) => {
            const loadedSymbol = {
                ...symbolData, // name, path, winAnimation, imagePath, backgroundColor
                image: null,
                id: index // Store the index (0-4)
            };

            // Check if we're actually using the sprite sheet (configured AND loaded successfully)
            if (useSprite && svgLoaded) {
                console.log(`Using sprite sheet for ${symbolData.name} (symbol ${index})`);
                loadedSymbol.color = symbolData.backgroundColor || getRandomColor();
                symbols[index] = loadedSymbol; // Place in correct index
                resolve();
                return;
            }

            // If we're not using sprite (or sprite failed to load), try individual images
            if (symbolData.imagePath) {
                const img = new Image();
                img.src = symbolData.imagePath;

                img.onload = () => {
                    console.log(`Loaded image for ${symbolData.name} from imagePath: ${symbolData.imagePath}`);
                    loadedSymbol.image = img;
                    // Keep the backgroundColor from the theme config
                    loadedSymbol.color = symbolData.backgroundColor || getRandomColor();
                    symbols[index] = loadedSymbol; // Place in correct index
                    resolve();
                };

                img.onerror = (err) => {
                    console.warn(`Failed to load image from imagePath for ${symbolData.name}, trying SVG path as fallback...`);
                    // Fall back to SVG path if image loading fails and path exists
                    if (symbolData.path) {
                        const svgImg = new Image();
                        svgImg.src = symbolData.path;

                        svgImg.onload = () => {
                            console.log(`Loaded fallback SVG for ${symbolData.name} from path: ${symbolData.path}`);
                            loadedSymbol.image = svgImg;
                            loadedSymbol.color = symbolData.backgroundColor || getRandomColor();
                            symbols[index] = loadedSymbol;
                            resolve();
                        };

                        svgImg.onerror = (svgErr) => {
                            console.error(`Failed to load both image and SVG for ${symbolData.name}:`, svgErr);
                            loadedSymbol.color = symbolData.backgroundColor || getRandomColor();
                            symbols[index] = loadedSymbol;
                            resolve();
                        };
                    } else {
                        console.error(`No fallback SVG path for ${symbolData.name}:`, err);
                        loadedSymbol.color = symbolData.backgroundColor || getRandomColor();
                        symbols[index] = loadedSymbol;
                        resolve();
                    }
                };
            } else if (symbolData.path) {
                // If no imagePath provided, use SVG path directly
                const img = new Image();
                img.src = symbolData.path;

                img.onload = () => {
                    loadedSymbol.image = img;
                    loadedSymbol.color = symbolData.backgroundColor || getRandomColor();
                    symbols[index] = loadedSymbol;
                    resolve();
                };

                img.onerror = (err) => {
                    console.error(`Failed to load SVG for ${symbolData.name} (${symbolData.path}):`, err);
                    loadedSymbol.color = symbolData.backgroundColor || getRandomColor();
                    symbols[index] = loadedSymbol;
                    resolve();
                };
            } else {
                // Neither imagePath nor path is available - create a placeholder with color
                console.warn(`No image source available for symbol ${symbolData.name}. Using color placeholder.`);
                loadedSymbol.color = symbolData.backgroundColor || getRandomColor();
                symbols[index] = loadedSymbol;
                resolve();
            }
        });
    });

    await Promise.all(symbolPromises);    // Ensure symbols array has 5 elements, even if some failed loading
    for (let i = 0; i < 5; i++) {
        if (!symbols[i]) {
            console.warn(`Symbol visual for index ${i} was missing after loading theme ${themeName}. Creating placeholder.`);
            symbols[i] = { name: `Symbol ${i}`, path: null, image: null, color: getRandomColor(), id: i };
        }
    }

    console.log(`Finished loading visuals for theme: ${themeName}. ${symbols.length} visual maps ready.`);

    // Hide the loading screen after all assets are loaded
    hideLoadingScreen();
}

// --- Sound Loading and Playing (Using Web Audio API) ---
function loadSounds() {
    try {
        window.AudioContext = window.AudioContext || window.webkitAudioContext;
        audioContext = new AudioContext();

        // Setup gain nodes for volume control
        masterGainNode = audioContext.createGain();
        masterGainNode.connect(audioContext.destination);

        // Create separate gain nodes for background music and effects
        backgroundGainNode = audioContext.createGain();
        backgroundGainNode.connect(masterGainNode);

        effectsGainNode = audioContext.createGain();
        effectsGainNode.connect(masterGainNode);

        // Get initial volume settings from the current theme
        getAndApplyThemeVolumeSettings(currentThemeName);

        // Load generic button click sound
        loadAudioBuffer('click', 'shared/sounds/button-click.mp3');

        // Load initial theme sounds
        loadThemeSounds(currentThemeName);

        // User interaction listener to unlock audio
        const unlockAudio = () => {
            if (audioContext && audioContext.state === 'suspended') {
                audioContext.resume();
            }
            hasUserInteraction = true;
            document.removeEventListener('click', unlockAudio);
            document.removeEventListener('touchstart', unlockAudio);
            document.removeEventListener('keydown', unlockAudio);
            console.log("Audio context resumed by user interaction.");

            // Start playing background music after user interaction
            if (currentThemeSounds.theme && currentThemeSounds.backgroundLoaded) {
                playBackgroundMusic(currentThemeSounds.theme);
            }
        };
        document.addEventListener('click', unlockAudio, { once: true });
        document.addEventListener('touchstart', unlockAudio, { once: true });
        document.addEventListener('keydown', unlockAudio, { once: true });

    } catch (e) {
        console.warn('Web Audio API not supported. Sound effects disabled.', e);
        soundEnabled = false;
    }
}

function loadThemeSounds(themeName) {    // Reset theme sound tracking
    currentThemeSounds = {
        theme: themeName,
        backgroundLoaded: false,
        spinLoaded: false,
        winLoaded: false,
        jackpotLoaded: false
    };

    console.log(`Loading sounds for theme: ${themeName}`);

    // Get and apply volume settings from the new theme
    getAndApplyThemeVolumeSettings(themeName);

    // Stop any currently playing background music
    stopBackgroundMusic();

    // Define theme-specific sound paths
    const themePath = `themes/${themeName.toLowerCase().replace(/\s+/g, '-')}/sounds`;

    // Load background music
    loadAudioBuffer('background', `${themePath}/background.mp3`)
        .then(() => {
            currentThemeSounds.backgroundLoaded = true;
            // If user has already interacted, start playing background music
            if (hasUserInteraction) {
                playBackgroundMusic(themeName);
            }
        }).catch(error => {
            console.warn(`Could not load theme background music: ${error}`);
            // Try to load default background music
            loadAudioBuffer('background', 'themes/classic/sounds/background.mp3')
                .then(() => {
                    currentThemeSounds.backgroundLoaded = true;
                    if (hasUserInteraction) {
                        playBackgroundMusic(themeName); // Use current theme name, not hardcoded 'classic'
                    }
                });
        });

    // Load spin sound
    loadAudioBuffer('spin', `${themePath}/spin.mp3`)
        .then(() => {
            currentThemeSounds.spinLoaded = true;
        })
        .catch(error => {
            console.warn(`Could not load theme spin sound: ${error}`);
            // Try to load default spin sound
            loadAudioBuffer('spin', 'sounds/spin.mp3');
        });    // Load win sound
    loadAudioBuffer('win', `${themePath}/win.mp3`)
        .then(() => {
            currentThemeSounds.winLoaded = true;
        })
        .catch(error => {
            console.warn(`Could not load theme win sound: ${error}`);
            // Try to load default win sound
            loadAudioBuffer('win', 'sounds/win.mp3');
        });

    // Load jackpot sound for epic win animation
    loadAudioBuffer('jackpot', `${themePath}/jackpot.mp3`)
        .then(() => {
            currentThemeSounds.jackpotLoaded = true;
        })
        .catch(error => {
            console.warn(`Could not load theme jackpot sound: ${error}`);
            // Try to load default jackpot sound from classic theme
            loadAudioBuffer('jackpot', 'themes/classic/sounds/jackpot.mp3')
                .catch(fallbackError => {
                    console.warn(`Could not load fallback jackpot sound: ${fallbackError}`);
                });
        });
}

// Helper function to load audio for bonus games
function loadAudio(context, url) {
    // Generate a unique ID for this audio
    const id = `bonus-${url.split('/').pop()}`;

    // Use our existing audio loading infrastructure
    return loadAudioBuffer(id, url)
        .then(buffer => {
            // Just return the decoded buffer as the bonus game code expects
            return buffer;
        });
}

function playBackgroundMusic(themeName) {
    if (!soundEnabled || !hasUserInteraction || !audioContext || !audioBuffers['background']) {
        console.log("Background music couldn't play: Sound disabled or not loaded");
        return;
    }

    // Stop any existing background music
    stopBackgroundMusic();

    try {
        if (audioContext.state === 'suspended') {
            audioContext.resume().then(() => {
                startBackgroundMusicLoop();
            });
        } else {
            startBackgroundMusicLoop();
        }
    } catch (error) {
        console.error("Error playing background music:", error);
    }
}

function startBackgroundMusicLoop() {
    if (!audioBuffers['background']) return;

    backgroundMusicSource = audioContext.createBufferSource();
    backgroundMusicSource.buffer = audioBuffers['background'];
    backgroundMusicSource.loop = true;

    // Connect to the background gain node for theme-specific volume control
    backgroundMusicSource.connect(backgroundGainNode);

    // Update background volume with current theme settings
    backgroundGainNode.gain.value = muteState ? 0 : themeVolumeSettings.master * themeVolumeSettings.background;

    backgroundMusicSource.start(0);
    console.log("Background music started with volume:", backgroundGainNode.gain.value);
}

function stopBackgroundMusic() {
    if (backgroundMusicSource) {
        try {
            backgroundMusicSource.stop();
        } catch (e) {
            // Ignore errors if sound was already stopped
        }
        backgroundMusicSource = null;
    }
}

function loadAudioBuffer(id, url) {
    if (!audioContext) return Promise.reject("AudioContext not available");
    return fetch(url)
        .then(response => {
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status} for ${url}`);
            return response.arrayBuffer();
        })
        .then(arrayBuffer => audioContext.decodeAudioData(arrayBuffer))
        .then(audioBuffer => {
            audioBuffers[id] = audioBuffer;
            console.log(`Loaded audio: ${id}`);
        })
        .catch(error => console.error(`Error loading audio ${id} from ${url}:`, error));
}

function playSound(id) {
    if (!soundEnabled || !hasUserInteraction || !audioBuffers[id] || !audioContext) {
        // console.log(`Sound ${id} blocked: enabled=${soundEnabled}, interaction=${hasUserInteraction}, buffer=${!!audioBuffers[id]}, context=${!!audioContext}`);
        return;
    }
    try {
        // Ensure context is running
        if (audioContext.state === 'suspended') {
            audioContext.resume().then(() => {
                console.log("Audio context resumed for sound playback.");
                playSoundInternal(id);
            }).catch(err => console.error("Error resuming audio context:", err));
        } else {
            playSoundInternal(id);
        }
    } catch (error) {
        console.error(`Error initiating sound playback for ${id}:`, error);
    }
}

function playSoundInternal(id) {
    try {
        const source = audioContext.createBufferSource();
        source.buffer = audioBuffers[id];

        // Connect to the effects gain node for theme-specific volume control
        source.connect(effectsGainNode);

        // Update effects volume with current theme settings
        effectsGainNode.gain.value = muteState ? 0 : themeVolumeSettings.master * themeVolumeSettings.effects;

        source.start(0);

        // Store reference to spin sound so we can stop it later
        if (id === 'spin') {
            spinSoundSource = source;
        }
    } catch (error) {
        console.error(`Error playing sound ${id} (internal):`, error);
    }
}


// --- Symbol Loading (REMOVED loadSymbols) ---
// async function loadSymbols() { ... } // REMOVED

function getRandomColor() {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}

// --- Reel Initialization ---
// ... (initReels, generateReelSymbols functions remain largely the same, but use the global 'symbols' array) ...
function initReels() {
    reels = [];

    // Get the current theme's configuration for reel strips
    const currentTheme = THEMES[currentThemeName];
    if (!currentTheme || !currentTheme.config) {
        console.error("CRITICAL: Cannot initialize reels - theme or theme config is missing");
        return;
    }    // Get the reel strips from the theme's config
    const themeReelStrips = currentTheme.config.reelStrips;
    // Create alias for backward compatibility with any code referencing reelStrips
    window.reelStrips = themeReelStrips; // Make this a global variable

    if (!themeReelStrips || themeReelStrips.length !== REEL_COUNT) {
        console.error("CRITICAL: Invalid reel strips in theme configuration");
        return;
    }

    console.log("Initializing reels with theme-specific reel strips:", themeReelStrips);

    for (let i = 0; i < REEL_COUNT; i++) {
        // Config validation moved to initGame
        reels.push({
            position: Math.floor(Math.random() * themeReelStrips[i].length), // Start random
            symbols: [...themeReelStrips[i]], // Use the theme's reel strips
            targetPosition: 0,
            spinning: false,
            startTime: 0,
            duration: 0,
            startPosition: 0,
            distance: 0,
        });
    }
    currentReelResults = Array(REEL_COUNT).fill(null).map(() => Array(VISIBLE_ROWS).fill(0));
    console.log("Reels initialized with theme-specific configured strips.");
}



// --- Main Game Loop ---
// Update drawGame to include epic win animation rendering
function drawGame(timestamp) {
    if (!ctx) return; // Ensure context is available

    // Calculate delta time for smooth animations
    if (!lastTime) lastTime = timestamp;
    const deltaTime = (timestamp - lastTime) / 1000.0; // Delta time in seconds
    lastTime = timestamp;

    // Throttle updates if delta time is too large (e.g., tabbed out)
    // const maxDeltaTime = 0.1; // 100ms max step
    // const clampedDeltaTime = Math.min(deltaTime, maxDeltaTime);
    // Use clampedDeltaTime for physics/animation updates if needed

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawBackground(timestamp); // Draw static or animated background
    drawReels(deltaTime, timestamp); // Update and draw reels, passing timestamp for effects
    drawReelMask(); // Draw mask/overlay over reels if needed

    drawUIElements(); // Draw balance, bet, buttons

    if (!spinning && winningLines.length > 0) {
        drawWinLines(timestamp); // Draw winning line highlights
    }

    if (showPaylines) {
        drawAllPaylines(timestamp); // Draw all paylines if toggled on
    }    // Always call drawWinCelebration to update the animation state
    // even if winAnimationActive is false (to clean up any remaining particles)
    drawWinCelebration(deltaTime); // Draw confetti etc.

    drawPaytableModal(); // Draw Pay Table modal if active
    drawHistoryModal(); // Draw History modal if active

    // Draw epic win animation if active - now at the very end to ensure it's on top of everything
    if (isPlayingEpicWinAnimation) {
        drawEpicWinAnimation(timestamp - epicWinStartTime, deltaTime);
    }

    requestAnimationFrame(drawGame);
}

// --- Drawing Functions ---
// ... (drawBackground, drawReels, drawReelMask functions remain the same) ...
function drawBackground(timestamp) {
    // Check if current theme has visual effects enabled
    const themeEffects = THEMES[currentThemeName]?.visualEffects;
    const effectsEnabled = themeEffects?.enabled !== false;
    // Get background effect settings or use defaults
    const bgEffects = themeEffects?.backgroundEffects;
    const usePulse = effectsEnabled && bgEffects?.pulse?.enabled !== false;
    const useParticles = effectsEnabled && bgEffects?.particles?.enabled !== false;

    // Base background - enhanced with pulse if enabled
    const baseColor = bgEffects?.pulse?.color || '#1a1a2e';
    let topColor = baseColor;
    let bottomColor = bgEffects?.pulse?.color2 || '#2c3e50';    // Add pulsing effect if enabled
    if (usePulse && bgEffects && bgEffects.pulse) {
        const pulseSpeed = bgEffects.pulse.speed || 3000;
        const pulseIntensity = bgEffects.pulse.intensity || 0.3;
        const pulseValue = Math.sin(timestamp / pulseSpeed) * pulseIntensity;

        // Create slightly shifting colors for the pulse effect
        topColor = shiftColor(baseColor, pulseValue * 30);
        bottomColor = shiftColor(bottomColor, -pulseValue * 20);

        // Add subtle radial pulse
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const maxRadius = Math.max(canvas.width, canvas.height);
        const pulseRadius = maxRadius * (0.7 + pulseValue * 0.3);

        const radialGradient = ctx.createRadialGradient(
            centerX, centerY, 10,
            centerX, centerY, pulseRadius
        );
        radialGradient.addColorStop(0, shiftColor(baseColor, pulseValue * 50, 0.8));
        radialGradient.addColorStop(1, 'transparent');

        ctx.fillStyle = radialGradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }    // Draw the base gradient background
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, topColor);
    gradient.addColorStop(1, bottomColor);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw theme background image if available
    const currentTheme = THEMES[currentThemeName];
    if (currentTheme && currentTheme.background && !currentTheme._backgroundImage) {
        // Load the background image if not already loaded
        currentTheme._backgroundImage = new Image();
        currentTheme._backgroundImage.src = currentTheme.background;
        console.log(`Loading background image: ${currentTheme.background}`);
    }

    // Draw the background image if it's loaded
    if (currentTheme && currentTheme._backgroundImage && currentTheme._backgroundImage.complete) {
        // Draw the image with proper sizing to cover the canvas while maintaining aspect ratio
        const img = currentTheme._backgroundImage;
        const canvasRatio = canvas.width / canvas.height;
        const imgRatio = img.width / img.height;

        let drawWidth, drawHeight, x, y;

        if (canvasRatio > imgRatio) {
            // Canvas is wider than image ratio
            drawWidth = canvas.width;
            drawHeight = canvas.width / imgRatio;
            x = 0;
            y = (canvas.height - drawHeight) / 2;
        } else {
            // Canvas is taller than image ratio
            drawHeight = canvas.height;
            drawWidth = canvas.height * imgRatio;
            x = (canvas.width - drawWidth) / 2;
            y = 0;
        }

        // Apply a slight opacity to allow effects to show through
        ctx.globalAlpha = 0.8;
        ctx.drawImage(img, x, y, drawWidth, drawHeight);
        ctx.globalAlpha = 1.0;
    }
    // Draw particles if enabled
    if (useParticles && bgEffects?.particles) {

        // Initialize particles if they don't exist or theme changed
        if (!backgroundParticles.length || backgroundParticles.themeId !== currentThemeName) {
            initBackgroundParticles(bgEffects.particles);
        }

        // Update and draw existing particles
        drawBackgroundParticles(timestamp, bgEffects.particles);
    }

    // Draw theme-specific background effects
    if (effectsEnabled && themeEffects?.themeSpecific) {
        drawThemeSpecificBackgroundEffects(timestamp, themeEffects);
    }
}

// Helper function to shift color for pulsing effects
function shiftColor(color, amount, alpha = undefined) {
    // Handle hex colors
    if (color.startsWith('#')) {
        const r = parseInt(color.slice(1, 3), 16);
        const g = parseInt(color.slice(3, 5), 16);
        const b = parseInt(color.slice(5, 7), 16);

        // Apply the shift within bounds
        const newR = Math.max(0, Math.min(255, r + amount));
        const newG = Math.max(0, Math.min(255, g + amount));
        const newB = Math.max(0, Math.min(255, b + amount));

        if (alpha !== undefined) {
            return `rgba(${Math.round(newR)}, ${Math.round(newG)}, ${Math.round(newB)}, ${alpha})`;
        } else {
            return `rgb(${Math.round(newR)}, ${Math.round(newG)}, ${Math.round(newB)})`;
        }
    }
    // Handle other color formats - just return the original
    return alpha !== undefined ? `${color.split(')')[0]}, ${alpha})` : color;
}

// Initialize background particles based on theme settings
function initBackgroundParticles(particleSettings = {}) {
    const count = particleSettings?.count || 50;
    const baseColor = particleSettings?.color || '#ffffff';
    const sizeRange = particleSettings?.size || { min: 1, max: 5 };
    const sparkle = particleSettings?.sparkle || false;

    backgroundParticles = [];
    backgroundParticles.themeId = currentThemeName;

    for (let i = 0; i < count; i++) {
        const size = Math.random() * (sizeRange.max - sizeRange.min) + sizeRange.min;
        let color = baseColor;

        // Add color variance if sparkle is enabled
        if (sparkle) {
            const hue = Math.random() * 360;
            color = `hsl(${hue}, 100%, 70%)`;
        }

        backgroundParticles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            size: size,
            speedX: (Math.random() - 0.5) * 0.8,
            speedY: (Math.random() - 0.5) * 0.8,
            color: color,
            opacity: Math.random() * 0.5 + 0.3,
            // For sparkle effect
            twinkle: sparkle ? {
                active: true,
                speed: Math.random() * 0.05 + 0.02,
                phase: Math.random() * Math.PI * 2
            } : null
        });
    }
}

// Draw the background particles
function drawBackgroundParticles(timestamp, settings = {}) {
    const sparkle = settings?.sparkle || false;

    backgroundParticles.forEach(particle => {
        // Update position
        particle.x += particle.speedX;
        particle.y += particle.speedY;

        // Wrap around screen edges
        if (particle.x < 0) particle.x = canvas.width;
        if (particle.x > canvas.width) particle.x = 0;
        if (particle.y < 0) particle.y = canvas.height;
        if (particle.y > canvas.height) particle.y = 0;

        // Calculate opacity for twinkling effect
        let opacity = particle.opacity;
        if (sparkle && particle.twinkle) {
            particle.twinkle.phase += particle.twinkle.speed;
            opacity = particle.opacity * (0.5 + Math.sin(particle.twinkle.phase) * 0.5);
        }

        // Draw the particle
        ctx.fillStyle = sparkle ? particle.color : `rgba(255, 255, 255, ${opacity})`;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fill();

        // Add glow for larger particles if we have sparkle effect
        if (sparkle && particle.size > 3) {
            ctx.save();
            ctx.globalAlpha = opacity * 0.4;
            ctx.filter = `blur(${particle.size}px)`;
            ctx.beginPath();
            ctx.arc(particle.x, particle.y, particle.size * 1.5, 0, Math.PI * 2);
            ctx.fillStyle = particle.color;
            ctx.fill();
            ctx.restore();
        }
    });
}

// Draw theme-specific background effects
function drawThemeSpecificBackgroundEffects(timestamp, themeEffects) {
    // Get the current theme object
    const currentTheme = THEMES[currentThemeName];

    // First check if the theme has a custom renderer function
    if (currentTheme && currentTheme.ThemeEffectsHelper &&
        typeof currentTheme.ThemeEffectsHelper.applyThemeEffect === 'function') {
        // Use ThemeEffectsHelper.applyThemeEffect as an alternative approach
        currentTheme.ThemeEffectsHelper.applyThemeEffect(ctx, canvas, 1,
            currentTheme, timestamp);
    } else {
        console.warn("Theme has no ThemeEffectsHelper.applyThemeEffect implementation");
    }
}

function drawReels(deltaTime, timestamp) {
    const reelWidth = SYMBOL_SIZE;

    // Get the current theme's layout configuration
    const themeLayout = THEMES[currentThemeName]?.layout;
    const themeEffects = THEMES[currentThemeName]?.visualEffects;

    // Get the desired spacing from theme, or use a default value
    const desiredSpacing = themeLayout?.reelSpacing || 10; // Default to 10px if not specified

    // Calculate total space needed for all reels
    const totalReelWidth = reelWidth * REEL_COUNT;

    // Calculate total space available for spacing (between and on edges)
    const totalAvailableForSpacing = canvas.width - totalReelWidth;

    // Ensure we have at least minimal spacing between reels
    const minSpacingNeeded = REEL_COUNT + 1; // One space between each reel and on both ends

    let actualSpacing;
    if (totalAvailableForSpacing >= desiredSpacing * minSpacingNeeded) {
        // We can use the desired spacing
        actualSpacing = desiredSpacing;
    } else {
        // Not enough space for desired spacing, calculate maximum possible
        actualSpacing = totalAvailableForSpacing / minSpacingNeeded;
    }

    // Center the entire reel area
    const startX = (canvas.width - (totalReelWidth + actualSpacing * (REEL_COUNT - 1))) / 2;
    const startY = 100;
    const reelViewportHeight = SYMBOL_SIZE * VISIBLE_ROWS;

    // Draw reels container background with theme-specific color and opacity
    if (themeLayout?.reelsContainer) {
        // Calculate container dimensions to fit all reels with proper padding
        const reelContainerWidth = totalReelWidth + (actualSpacing * (REEL_COUNT - 1)); // Add padding on both sides
        const reelContainerHeight = reelViewportHeight; // Add a little padding

        // Calculate container position to center it
        const containerX = (canvas.width - reelContainerWidth) / 2;

        ctx.save();
        ctx.fillStyle = themeLayout.reelsContainer.backgroundColor || "#333333";
        ctx.globalAlpha = themeLayout.reelsContainer.opacity || 0.8;
        ctx.fillRect(containerX, startY - 0, reelContainerWidth, reelContainerHeight);
        ctx.globalAlpha = 1.0; // Reset alpha
        ctx.restore();
    }
    const effectsEnabled = themeEffects?.enabled !== false;
    const reelEffectsConfig = effectsEnabled ? themeEffects?.reelEffects : null;
    const reelEffectsIntensity = reelEffectsConfig?.intensity || 0.7; // Use theme intensity or default

    for (let i = 0; i < REEL_COUNT; i++) {
        const reel = reels[i];
        if (!reel) continue;
        // Use the proper spacing for positioning each reel
        const reelX = startX + (i * (reelWidth + actualSpacing));

        // --- Animate Reel Position if Spinning ---
        if (reel.spinning) {
            updateReelPosition(reel, Date.now());
        }

        // --- Pre-Symbol Effects (Blur) ---
        let blurApplied = false;
        if (reel.spinning && reelEffectsConfig?.enabled && reelEffectsConfig.blurAmount > 0) {
            // Calculate blur based on velocity (symbols/sec) - Needs scaling
            // Let's cap velocity for blur calculation to avoid excessive blur
            const effectiveVelocity = Math.min(reel.velocity || 0, REEL_SPIN_SPEED_FACTOR * 2); // Adjust cap as needed
            // Scale blur: higher velocity -> more blur, up to config amount
            const blurScale = effectiveVelocity / (REEL_SPIN_SPEED_FACTOR * 1.5); // Adjust denominator for sensitivity
            const blurAmount = reelEffectsConfig.blurAmount * reelEffectsIntensity * Math.min(blurScale, 1.0); // Cap scale at 1

            if (blurAmount > 0.5) { // Apply blur only if significant
                ctx.save(); // Save state before applying filter
                ctx.filter = `blur(${blurAmount.toFixed(1)}px)`;
                blurApplied = true;
            }
        }

        // --- Draw Symbols (Clipped) ---
        ctx.save(); // Save state for clipping
        ctx.beginPath();
        ctx.rect(reelX, startY, reelWidth, reelViewportHeight);
        ctx.clip();

        const numSymbolsOnStrip = reel.symbols.length;
        if (numSymbolsOnStrip > 0) {
            const currentPosition = reel.position;
            const topVisibleSymbolIndex = Math.floor(currentPosition);
            const verticalOffset = (currentPosition - topVisibleSymbolIndex) * SYMBOL_SIZE;

            for (let j = -1; j <= VISIBLE_ROWS; j++) {
                const symbolStripIndex = (topVisibleSymbolIndex + j + numSymbolsOnStrip) % numSymbolsOnStrip;
                const symbolId = reel.symbols[symbolStripIndex];
                const symbol = symbols[symbolId]; // Get theme symbol
                const symbolTopY = startY + (j * SYMBOL_SIZE) - verticalOffset;

                if (symbolTopY + SYMBOL_SIZE >= startY && symbolTopY <= startY + reelViewportHeight) {
                    if (symbol) {
                        // --- Draw Symbol Logic (SVG/Image/Fallback) ---
                        let drawnFromSprite = false; // Initialize the variable
                        if (svgLoaded && symbol.name) {
                            // Only draw background if backgroundColor is specified
                            if (symbol.backgroundColor) {
                                ctx.fillStyle = symbol.backgroundColor;
                                ctx.fillRect(reelX, symbolTopY, SYMBOL_SIZE, SYMBOL_SIZE);
                            }
                            drawnFromSprite = drawSymbol(symbol.name, ctx, reelX, symbolTopY, SYMBOL_SIZE, SYMBOL_SIZE);
                        }
                        if (!drawnFromSprite) {
                            if (symbol.image && symbol.image.complete && symbol.image.naturalHeight !== 0) {
                                // Only draw background for transparent PNGs if backgroundColor is specified
                                if (symbol.imagePath && symbol.backgroundColor) {
                                    ctx.fillStyle = symbol.backgroundColor;
                                    ctx.fillRect(reelX, symbolTopY, SYMBOL_SIZE, SYMBOL_SIZE);
                                }
                                ctx.drawImage(symbol.image, reelX, symbolTopY, SYMBOL_SIZE, SYMBOL_SIZE);
                            } else {
                                // For placeholder/fallback, we still need a background
                                if (symbol.backgroundColor) {
                                    ctx.fillStyle = symbol.backgroundColor;
                                } else if (symbol.color) {
                                    ctx.fillStyle = symbol.color;
                                } else {
                                    ctx.fillStyle = '#cccccc';
                                }
                                ctx.fillRect(reelX, symbolTopY, SYMBOL_SIZE, SYMBOL_SIZE);
                                ctx.fillStyle = '#000000'; ctx.font = '16px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                                ctx.fillText(symbol.name ? symbol.name.substring(0, 1) : '?', reelX + SYMBOL_SIZE / 2, symbolTopY + SYMBOL_SIZE / 2);
                            }
                        }
                        // --- End Symbol Drawing ---
                    } else {
                        // Draw placeholder for missing symbol
                        ctx.fillStyle = '#555'; ctx.fillRect(reelX, symbolTopY, SYMBOL_SIZE, SYMBOL_SIZE);
                        ctx.fillStyle = '#fff'; ctx.font = 'bold 20px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                        ctx.fillText('?', reelX + SYMBOL_SIZE / 2, symbolTopY + SYMBOL_SIZE / 2);
                    }
                }
            }
        }
        ctx.restore(); // Restore from clipping state

        // --- Post-Symbol Effects (Glow, Trails) ---
        // These are drawn *after* the clipping is removed

        if (blurApplied) {
            ctx.restore(); // Restore from the blur filter save state
        }

        // Apply Glow and Trails using the separate function, passing necessary info
        if (reel.spinning && reelEffectsConfig?.enabled) {
            const currentPosition = reel.position; // Get position again for offset calculation
            const topVisibleSymbolIndex = Math.floor(currentPosition);
            const verticalOffset = (currentPosition - topVisibleSymbolIndex) * SYMBOL_SIZE;
            applyPostReelEffects(ctx, reel, reelEffectsConfig, reelEffectsIntensity, reelX, startY, reelWidth, reelViewportHeight, verticalOffset, timestamp);
        }
    } // End of reel loop
}

// New function for effects drawn *after* symbols and clipping
function applyPostReelEffects(ctx, reel, effects, intensity, reelX, startY, reelWidth, reelHeight, verticalOffset, timestamp) {
    ctx.save(); // Save state before applying post effects

    // --- Spinning Glow ---
    if (effects.spinningGlow) {
        const glowRadius = reelWidth * (0.6 + Math.sin(timestamp / 400) * 0.1); // Pulsating radius
        const glowCenterX = reelX + reelWidth / 2;
        const glowCenterY = startY + reelHeight / 2;
        const gradient = ctx.createRadialGradient(
            glowCenterX, glowCenterY, 0,
            glowCenterX, glowCenterY, glowRadius
        );
        const spinColor = effects.spinColor || '#3498db';
        // Use HSL for easier opacity/brightness adjustments
        const glowColorBase = EffectsHelper.hexToHsl(spinColor); // Assuming EffectsHelper has this
        if (glowColorBase) {
            gradient.addColorStop(0, `hsla(${glowColorBase.h}, ${glowColorBase.s}%, ${glowColorBase.l + 15}%, ${0.15 * intensity})`); // Brighter center
            gradient.addColorStop(0.6, `hsla(${glowColorBase.h}, ${glowColorBase.s}%, ${glowColorBase.l}%, ${0.10 * intensity})`);
            gradient.addColorStop(1, `hsla(${glowColorBase.h}, ${glowColorBase.s}%, ${glowColorBase.l}%, 0)`);
        } else { // Fallback if color conversion fails
            gradient.addColorStop(0, `${spinColor}28`);
            gradient.addColorStop(0.6, `${spinColor}1A`);
            gradient.addColorStop(1, `${spinColor}00`);
        }

        ctx.fillStyle = gradient;
        // Draw slightly larger than the reel area to ensure glow coverage
        ctx.fillRect(reelX - reelWidth * 0.1, startY - reelHeight * 0.1, reelWidth * 1.2, reelHeight * 1.2);
    }

    // --- Light Trails ---
    if (effects.lightTrails) {
        const numSymbolsOnStrip = reel.symbols.length;
        if (numSymbolsOnStrip > 0 && reel.velocity > 5) { // Only draw trails if moving reasonably fast
            const trailColor = effects.spinColor || '#3498db';
            const maxTrailLengthFactor = 0.8; // Max length relative to symbol size
            // Scale trail length based on velocity, capped
            const trailLengthFactor = Math.min((reel.velocity / (REEL_SPIN_SPEED_FACTOR * 2.5)) * maxTrailLengthFactor, maxTrailLengthFactor) * intensity;

            if (trailLengthFactor > 0.05) { // Minimum length to draw
                const trailPixelLength = trailLengthFactor * SYMBOL_SIZE;

                // Draw trails for visible symbols
                for (let j = -1; j <= VISIBLE_ROWS; j++) {
                    const symbolTopY = startY + (j * SYMBOL_SIZE) - verticalOffset;
                    // Check if the symbol *start* is roughly within viewport (+1 symbol buffer)
                    if (symbolTopY + SYMBOL_SIZE >= startY - SYMBOL_SIZE && symbolTopY <= startY + reelHeight + SYMBOL_SIZE) {

                        // Create a vertical gradient for the trail
                        const gradient = ctx.createLinearGradient(
                            reelX, symbolTopY, // Start slightly behind the symbol top
                            reelX, symbolTopY - trailPixelLength // End further up
                        );
                        // Use HSL for trail color with fading alpha
                        const trailColorBase = EffectsHelper.hexToHsl(trailColor);
                        if (trailColorBase) {
                            gradient.addColorStop(0, `hsla(${trailColorBase.h}, ${trailColorBase.s}%, ${trailColorBase.l}%, ${0.5 * intensity})`); // Stronger near symbol
                            gradient.addColorStop(1, `hsla(${trailColorBase.h}, ${trailColorBase.s}%, ${trailColorBase.l + 10}%, 0)`); // Fade to transparent
                        } else {
                            gradient.addColorStop(0, `${trailColor}80`);
                            gradient.addColorStop(1, `${trailColor}00`);
                        }

                        ctx.fillStyle = gradient;
                        ctx.fillRect(reelX, symbolTopY - trailPixelLength, reelWidth, trailPixelLength);
                    }
                }
            }
        }
    }

    ctx.restore(); // Restore from post-effects save state
}

// Helper function (add to EffectsHelper or place globally if needed)
EffectsHelper.hexToHsl = function (hex) {
    // Remove '#' if present
    hex = hex.replace(/^#/, '');
    // Convert hex to RGB
    const r = parseInt(hex.substring(0, 2), 16) / 255;
    const g = parseInt(hex.substring(2, 4), 16) / 255;
    const b = parseInt(hex.substring(4, 6), 16) / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;

    if (max === min) {
        h = s = 0; // achromatic
    } else {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }

    return {
        h: Math.round(h * 360),
        s: Math.round(s * 100),
        l: Math.round(l * 100)
    };
};

function drawReelMask() {
    const reelWidth = SYMBOL_SIZE;

    // Get the current theme's layout configuration
    const themeLayout = THEMES[currentThemeName]?.layout;

    // Get the current theme's effect configuration for reelMask
    const reelMaskEffects = THEMES[currentThemeName]?.visualEffects?.reelMask || {};
    const effects = {
        enabled: reelMaskEffects.enabled ?? true,
        borderWidth: reelMaskEffects.borderWidth ?? 5,
        separatorWidth: reelMaskEffects.separatorWidth ?? 2,
        glowEffect: {
            enabled: reelMaskEffects.glowEffect?.enabled ?? false,
            color: reelMaskEffects.glowEffect?.color ?? '#ffcc00',
            intensity: reelMaskEffects.glowEffect?.intensity ?? 0.8,
            size: reelMaskEffects.glowEffect?.size ?? 10
        },
        pulseEffect: {
            enabled: reelMaskEffects.pulseEffect?.enabled ?? false,
            speed: reelMaskEffects.pulseEffect?.speed ?? 1500,
            minOpacity: reelMaskEffects.pulseEffect?.minOpacity ?? 0.6,
            maxOpacity: reelMaskEffects.pulseEffect?.maxOpacity ?? 1.0
        },
        colorTransition: {
            enabled: reelMaskEffects.colorTransition?.enabled ?? false,
            colors: reelMaskEffects.colorTransition?.colors ?? ['#ffcc00', '#ff5500', '#ff00ff', '#00ffff', '#ffcc00'],
            speed: reelMaskEffects.colorTransition?.speed ?? 5000,
            mode: reelMaskEffects.colorTransition?.mode ?? 'gradient'
        }
    };

    // If effects are disabled, exit early
    if (!effects.enabled) return;

    // Get the desired spacing from theme, or use a default value
    const desiredSpacing = themeLayout?.reelSpacing || 10; // Default to 10px if not specified

    // Calculate total space needed for all reels
    const totalReelWidth = reelWidth * REEL_COUNT;

    // Calculate total space available for spacing (between and on edges)
    const totalAvailableForSpacing = canvas.width - totalReelWidth;

    // Ensure we have at least minimal spacing between reels
    const minSpacingNeeded = REEL_COUNT + 1; // One space between each reel and on both ends

    let actualSpacing;
    if (totalAvailableForSpacing >= desiredSpacing * minSpacingNeeded) {
        // We can use the desired spacing
        actualSpacing = desiredSpacing;
    } else {
        // Not enough space for desired spacing, calculate maximum possible
        actualSpacing = totalAvailableForSpacing / minSpacingNeeded;
    }

    // Center the entire reel area
    const startX = (canvas.width - (totalReelWidth + actualSpacing * (REEL_COUNT - 1))) / 2;
    const startY = 100;
    const reelViewportHeight = SYMBOL_SIZE * VISIBLE_ROWS;

    // Calculate the total width properly accounting for spacing between reels
    const totalWidth = REEL_COUNT * reelWidth + (REEL_COUNT - 1) * actualSpacing;

    // Get the current time for animations
    const currentTime = performance.now();

    // Calculate color based on color transition effect
    let currentColor = '#ffcc00';  // Default color

    if (effects.colorTransition.enabled) {
        const colors = effects.colorTransition.colors;
        if (colors && colors.length > 0) {
            const cycleTime = currentTime % effects.colorTransition.speed;
            const cycleProgress = cycleTime / effects.colorTransition.speed;

            if (effects.colorTransition.mode === 'gradient') {
                // Smooth transition between colors
                const colorIndex = Math.floor(cycleProgress * (colors.length - 1));
                const nextColorIndex = (colorIndex + 1) % colors.length;
                const colorProgress = (cycleProgress * (colors.length - 1)) % 1;

                const color1 = EffectsHelper.hexToRgb(colors[colorIndex]);
                const color2 = EffectsHelper.hexToRgb(colors[nextColorIndex]);

                if (color1 && color2) {
                    const r = Math.floor(color1.r + (color2.r - color1.r) * colorProgress);
                    const g = Math.floor(color1.g + (color2.g - color1.g) * colorProgress);
                    const b = Math.floor(color1.b + (color2.b - color1.b) * colorProgress);

                    currentColor = `rgb(${r}, ${g}, ${b})`;
                }
            } else {
                // Solid color changes
                const colorIndex = Math.floor(cycleProgress * colors.length) % colors.length;
                currentColor = colors[colorIndex];
            }
        }
    }

    // Calculate opacity based on pulse effect
    let currentOpacity = 1.0;

    if (effects.pulseEffect.enabled) {
        const pulseProgress = ((currentTime % effects.pulseEffect.speed) / effects.pulseEffect.speed);

        // Create a sinusoidal pulse effect
        const pulseValue = Math.sin(pulseProgress * Math.PI * 2);
        const normalizedPulse = (pulseValue + 1) / 2; // Convert from -1..1 to 0..1

        // Map to the configured opacity range
        currentOpacity = effects.pulseEffect.minOpacity +
            (effects.pulseEffect.maxOpacity - effects.pulseEffect.minOpacity) * normalizedPulse;
    }

    // Apply glow effect if enabled
    if (effects.glowEffect.enabled) {
        ctx.shadowColor = effects.glowEffect.color;
        ctx.shadowBlur = effects.glowEffect.size * effects.glowEffect.intensity;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
    }

    // Draw a border around the entire reel area
    ctx.strokeStyle = currentColor;
    ctx.globalAlpha = currentOpacity;
    ctx.lineWidth = effects.borderWidth;
    ctx.strokeRect(startX - ctx.lineWidth / 2, startY - ctx.lineWidth / 2,
        totalWidth + ctx.lineWidth, reelViewportHeight + ctx.lineWidth);

    // Draw separators between reels
    ctx.strokeStyle = currentColor;
    ctx.lineWidth = effects.separatorWidth;
    for (let i = 1; i < REEL_COUNT; i++) {
        // Calculate the correct position for each divider
        const lineX = startX + i * (reelWidth + actualSpacing) - actualSpacing / 2;
        ctx.beginPath();
        ctx.moveTo(lineX, startY);
        ctx.lineTo(lineX, startY + reelViewportHeight);
        ctx.stroke();
    }

    // Reset shadow and opacity for other drawing operations
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1.0;
}

async function spinReels() {
    if (spinning) return;
    // Basic check: Ensure reels and their symbols are loaded
    if (!reels || reels.length !== REEL_COUNT || reels.some(r => !r || !r.symbols || r.symbols.length === 0)) {
        console.error("Cannot spin: Reels not properly initialized with valid strips.");
        return;
    }
    if (portalWallet.on) {
        spinning = true; // reserve the spin while the shared wallet answers
        const charge = await portalWallet.bet(betAmount);
        if (!charge.ok) {
            spinning = false;
            notify(`${charge.message || 'saldo kurang'} — top up dulu dari lobby.`);
            return;
        }
    } else if (balance < betAmount) {
        console.warn("Insufficient balance!");
        // Add visual feedback if desired
        return;
    }
    // Only play spin sound for the configured duration (4 seconds)
    if (soundEnabled) {
        playSound('spin');

        // Set a timeout to stop the spin sound after the configured duration
        setTimeout(() => {
            stopSpinSound();
        }, SPIN_DURATION + 1000);
    }

    if (!portalWallet.on) balance -= betAmount;
    updateBalanceDisplay(); spinning = true;
    winningLines = [];
    winAnimationActive = false;
    // No need to reset confetti particles here - now managed by EffectsHelper
    buttonEffects.spin.pressed = false;

    let maxDuration = 0;
    let spinStartTime = Date.now();

    // --- NEW CORE LOGIC ---
    const stopIndexes = []; // Store the chosen random stop index for each reel

    for (let i = 0; i < REEL_COUNT; i++) {
        const reel = reels[i];
        reel.spinning = true;

        // 1. Determine Random Stop Position for this reel
        const reelLength = reel.symbols.length;
        const stopIndex = Math.floor(Math.random() * reelLength); // Random index on the virtual strip
        stopIndexes.push(stopIndex); // Store it - this index will align with the middle row

        // 2. Set Animation Target
        reel.targetPosition = stopIndex; // The animation will stop with this index in the middle row

        // 3. Calculate Animation Parameters (Mostly same as before)
        reel.startTime = spinStartTime + i * REEL_STAGGER_START;
        reel.duration = SPIN_DURATION + i * REEL_STAGGER_STOP;
        reel.startPosition = reel.position; // Current visual position

        // Calculate distance needed to land targetPosition at the middle row visual top (which is index targetPosition)
        const currentPositionMod = reel.startPosition % reelLength;
        let difference = (reel.targetPosition - currentPositionMod + reelLength) % reelLength;
        if (difference < 1 && reel.duration > 0) { // Ensure at least one full rotation if not already there
            difference += reelLength;
        }

        const rotations = 3 + Math.floor(i / 2); // Add rotations for visual effect
        reel.distance = (rotations * reelLength) + difference;

        // --- REMOVE symbol overwriting ---
        // DELETE the lines like: reel.symbols[finalMiddleStripIndex] = ...

        // Track max duration
        const reelEndTime = reel.startTime + reel.duration;
        if (reelEndTime > maxDuration) {
            maxDuration = reelEndTime;
        }
    }

    // --- REMOVE finalResultsGrid generation ---
    // DELETE the loop that created finalResultsGrid upfront

    // Schedule completion check (same as before, but it will now *read* results)
    const completionDelay = Math.max(0, maxDuration - Date.now() + 100);
    setTimeout(() => spinCompleted(stopIndexes), completionDelay); // Pass stopIndexes if needed, or read from reels later
}


function updateReelPosition(reel, currentTime) {
    const elapsed = currentTime - reel.startTime;

    if (elapsed < 0) return; // Not started yet (due to stagger)

    // Store the previous position before updating
    const lastPosition = reel.position || reel.startPosition; // Use start if it's the first update

    if (elapsed >= reel.duration) {
        // --- Animation End ---
        reel.position = reel.targetPosition; // Snap precisely
        reel.spinning = false;
        reel.velocity = 0; // Explicitly set velocity to 0 when stopped
        // Clean up animation vars? Optional.
        // delete reel.startPosition;
        // delete reel.startTime;
        // delete reel.duration;
        // delete reel.distance;
        return;
    }

    // --- Animation In Progress ---
    const progress = elapsed / reel.duration; // Overall progress (0 to 1)
    const easeOutQuart = (t) => 1 - Math.pow(1 - t, 4);
    const easedProgress = easeOutQuart(progress);

    // Calculate the new position
    let newPosition = reel.startPosition + reel.distance * easedProgress;

    // Calculate velocity (change in position since last frame)
    // Normalize based on a typical frame time (e.g., 16.67ms for 60fps)
    // This gives a rough speed in 'symbols per second' * a scaling factor
    const deltaTime = (currentTime - (reel.lastUpdateTime || reel.startTime)) || 16.67; // Avoid division by zero
    reel.velocity = Math.abs(newPosition - lastPosition) / (deltaTime / 1000); // Symbols per second
    reel.lastUpdateTime = currentTime; // Store time for next frame's calculation

    reel.position = newPosition;
}

// Modify spinCompleted to accept stopIndexes or read from reels
function spinCompleted() {
    // Force reels to their final position if any are still marked as spinning
    reels.forEach(reel => {
        if (reel?.spinning) {
            console.warn("SpinCompleted called while a reel was still marked spinning. Snapping to target.");
            // Snap position first for visual consistency before reading results
            reel.position = reel.targetPosition;
            reel.spinning = false;
        }
        // Ensure position is precisely the target integer after potential floating point issues/early call
        reel.position = reel.targetPosition;
    });

    spinning = false; // Set global flag

    // --- READ the visible symbols CORRECTLY based on drawReels logic ---
    currentReelResults = []; // Reset results grid
    for (let i = 0; i < REEL_COUNT; i++) {
        const reel = reels[i];
        const reelLength = reel.symbols.length;

        // targetPosition is the index intended to be at the TOP of the viewport when stopped
        // (because drawReels uses floor(position) as the top visible index)
        const finalTopIndex = Math.round(reel.targetPosition) % reelLength; // Index T

        // Calculate indices for middle andbottom rows relative to the top row index
        const finalMiddleIndex = (finalTopIndex + 1) % reelLength;        // Index T+1
        const finalBottomIndex = (finalTopIndex + 2) % reelLength;        // Index T+2

        // Get the actual symbol IDs from the configured reel strip at these visual positions
        const topSymbolId = reel.symbols[finalTopIndex];
        const middleSymbolId = reel.symbols[finalMiddleIndex];
        const bottomSymbolId = reel.symbols[finalBottomIndex];

        // Store results in [Top, Middle, Bottom] order
        currentReelResults[i] = [topSymbolId, middleSymbolId, bottomSymbolId];
    }
    console.log("Final Visible Results (Read Correctly):", currentReelResults); // DEBUG

    // --- Check for Wins (using the *actual* visual results) ---
    checkWinAndFinalize(); // This function remains the same as it uses currentReelResults
}

// --- Epic Win Animation Functions ---
let isPlayingEpicWinAnimation = false;
let epicWinStartTime = 0;

// Function to trigger the epic win animation
function triggerEpicWinAnimation(winAmount) {
    if (spinning) return; // Don't trigger during spins

    // Prevent multiple animations from running simultaneously
    if (isPlayingEpicWinAnimation) {
        stopEpicWinAnimation();
        return;
    }

    // Store the current win amount globally so themes can access it
    window.currentWinAmount = winAmount;

    // Start the epic win animation
    isPlayingEpicWinAnimation = true;
    epicWinStartTime = performance.now();
    console.log("Epic Win Animation Started! Win amount:", window.currentWinAmount);

    // Stop background music before playing jackpot sound
    stopBackgroundMusic();

    // Play jackpot sound for the current theme
    playSound('jackpot');

    // Stop the animation after the theme's duration (or default to 8 seconds)
    const currentTheme = THEMES[currentThemeName];
    const animDuration = currentTheme?.visualEffects?.themeSpecific?.epicWinAnimation?.duration || 8000;

    // Add a small buffer to ensure animation completes fully before stopping
    setTimeout(() => {
        stopEpicWinAnimation();
    }, animDuration + 500);
}

// Function to stop the epic win animation
function stopEpicWinAnimation() {
    isPlayingEpicWinAnimation = false;
    console.log("Epic Win Animation Stopped!");

    // Restart background music if user has interacted and sound is enabled
    if (hasUserInteraction && !muteState && currentThemeSounds.backgroundLoaded) {
        playBackgroundMusic(currentThemeSounds.theme);
    }
}

// Add epic win animation to win conditions
function checkWinAndFinalize() {
    spinning = false; // Set global spinning flag to false
    // Re-enable UI elements visually if needed (state check in drawUI handles this)

    // Check for wins using the stored currentReelResults
    const winInfo = checkWin(); // Returns null or win details object
    winAmount = winInfo ? winInfo.totalAmount : 0;
    // Create a result object for history tracking
    const spinResult = {
        reels: currentReelResults,
        totalWin: winInfo ? winInfo.totalAmount : 0,
        winningLines: winInfo ? winInfo.allLines : []
    };

    // Add to game history for the history modal
    addSpinToHistory(spinResult);    // Check for bonus game trigger (scatter symbols)
    const currentTheme = THEMES[currentThemeName];
    if (currentTheme && !bonusGameActive) { // Only check for bonus trigger if no bonus game is currently active
        // Check if there are enough scatter symbols to trigger the bonus game
        const scatterCount = checkBonusTrigger(currentReelResults, currentTheme);
        if (scatterCount >= 3) {
            console.log(`Bonus game triggered with ${scatterCount} scatter symbols!`);

            // Set bonus game as active to prevent retriggering
            bonusGameActive = true;
            localStorage.setItem('bonusGameState', true); // Store in local storage

            // Load bonus game configuration and start it
            loadBonusGameConfig(currentTheme, audioContext).then(bonusConfig => {
                // Stop any background music
                stopBackgroundMusic();

                // Play bonus start sound if available
                if (bonusConfig?.assets?.sounds?.start) {
                    playSound('bonus-start');
                }// Start the bonus game (will handle its own completion)
                startBonusGame(currentTheme, canvas, ctx, {
                    config: bonusConfig,
                    betAmount,
                    scatter: scatterCount,
                    audioContext,
                    masterGainNode,
                    soundEnabled, onComplete: (bonusWin) => {
                        // Reset bonus game active flag
                        bonusGameActive = false;

                        // When bonus game completes, add the win to balance
                        if (bonusWin > 0) {
                            if (portalWallet.on) {
                                // bonus pays into the shared wallet, tied to the spin that triggered it
                                portalWallet.win(bonusWin).then((r) => {
                                    if (!r.ok) notify(r.message || 'gagal menambah saldo');
                                    updateBalanceDisplay();
                                });
                            } else {
                                balance += bonusWin;
                            }
                            updateBalanceDisplay();

                            // Play win sound
                            playSound('win');

                            // Add to history
                            addToHistory(true, "Bonus Game", 1, bonusWin);

                            // Trigger celebration for significant wins
                            if (bonusWin >= betAmount * 10) {
                                triggerEpicWinAnimation(bonusWin);
                            } else if (bonusWin >= betAmount * 3) {
                                triggerWinCelebration(bonusWin);
                            }
                        }

                        // Restart background music
                        playBackgroundMusic(currentThemeName);
                    }
                });
                return; // Exit early as bonus game is handling the flow
            }).catch(error => {
                console.error("Error starting bonus game:", error);
                // Continue with normal win processing
                processNormalWin(winInfo);
            });
        } else {
            // No bonus, process normal win
            processNormalWin(winInfo);
        }
    } else {
        // Theme not found, process normal win
        processNormalWin(winInfo);
    }

    // Ensure button states are reset visually if needed
    buttonEffects.spin.pressed = false;
    // Hover states will be updated by mousemove
}

// Helper function to process normal wins (extracted from above)
function processNormalWin(winInfo) {
    if (winInfo && winInfo.totalAmount > 0) {
        if (portalWallet.on) {
            // payout goes to the shared wallet; balance mirror follows the server answer
            portalWallet.win(winInfo.totalAmount).then((r) => {
                if (!r.ok) notify(r.message || 'gagal menambah saldo');
                updateBalanceDisplay();
            });
        } else {
            balance += winInfo.totalAmount;
        }
        updateBalanceDisplay();
        playSound('win');
        // Add to history display (use info from winInfo or winningLines)
        // Pass the number of winning paylines instead of symbol count
        addToHistory(true, winInfo.bestMatch.symbolName, winInfo.allLines.length, winInfo.totalAmount);

        // Check if this is a 5-of-a-kind win and trigger epic animation
        if (winInfo.allLines.some(line => line.count >= 7)) {
            triggerEpicWinAnimation(winInfo.totalAmount);
        }
        // Trigger win celebration if significant win
        else if (winInfo.totalAmount >= betAmount * 5) { // Example threshold
            triggerWinCelebration(winInfo.totalAmount);
        }
    } else {
        // Get middle symbol NUMBERS for loss history
        try {
            const middleSymbolNumbers = currentReelResults.map(reelResult => reelResult[1]); // Get middle number (0-4)
            addToHistory(false, `Middle: ${middleSymbolNumbers.join(', ')}`, 0, 0); // Pass numbers
        } catch (e) {
            console.error("Error getting middle symbol numbers for history:", e, currentReelResults);
            addToHistory(false, "Spin finished", 0, 0);
        }
    }
}


// --- Win Checking (Uses Config Multipliers) ---
function checkWin() {    // Basic validation
    if (!currentReelResults || currentReelResults.length !== REEL_COUNT || !currentReelResults[0]) {
        console.error("Win check called with invalid results grid.");
        return null;
    } if (!symbols || !symbols.length) {
        console.error("Win check called but theme visuals (symbols array) not loaded.");
        return null;
    }

    // Get the current theme's configuration
    const currentTheme = THEMES[currentThemeName];
    if (!currentTheme || !currentTheme.config) {
        console.error("Win check called but theme or theme config is missing");
        return null;
    }    // Get all required configurations from the theme's config
    const PAYLINES = currentTheme.config.PAYLINES;
    // Get PAYOUT_RULES and symbolNumberMultipliers
    const PAYOUT_RULES = currentTheme.config.PAYOUT_RULES;
    const symbolNumberMultipliers = currentTheme.config.symbolNumberMultipliers;
    const MIN_WIN_LENGTH = currentTheme.config.PAYOUT_RULES?.minWinLength || 3; // Default to 3 if not specified

    if (!PAYLINES || PAYLINES.length === 0) {
        console.error("Win check called but no PAYLINES are defined in config.");
        return null;
    }

    // --- DEBUG LOG: Starting checkWin with current results ---
    try {
        console.log("[DEBUG] checkWin - Starting. Results Grid:", JSON.parse(JSON.stringify(currentReelResults)));
    } catch (e) {
        console.error("[DEBUG] checkWin - Error stringifying currentReelResults:", e);
        console.log("[DEBUG] checkWin - Raw currentReelResults:", currentReelResults);
    }


    winningLines = []; // Reset winning lines array for this spin
    let totalWinAmount = 0;
    let bestMatchDetails = null; // Track the single highest multiplier win    // --- Iterate through each defined PAYLINE ---
    PAYLINES.forEach((payline, paylineIndex) => {
        // --- DEBUG LOG: Checking specific payline ---
        console.log(`[DEBUG] checkWin - Checking Payline ${paylineIndex}`);

        // 1. Get the symbol on the first reel of this payline
        const firstReelPos = 0; // First reel is always at index 0
        const firstRowPos = payline[0]; // Row position from payline definition

        // Check if results grid has data for this position
        if (!currentReelResults[firstReelPos] || currentReelResults[firstReelPos][firstRowPos] === undefined) {
            console.warn(`[DEBUG] checkWin - Payline ${paylineIndex}: Missing result data at Reel ${firstReelPos}, Row ${firstRowPos}`);
            return; // Skip this payline if data is missing
        }
        const winningSymbolNumber = currentReelResults[firstReelPos][firstRowPos]; const visualSymbol = symbols[winningSymbolNumber]; // Get visual data
        const baseMultiplier = symbolNumberMultipliers[winningSymbolNumber];

        // --- DEBUG LOG: Payline starting symbol and multiplier ---
        console.log(`[DEBUG] checkWin - Payline ${paylineIndex} starts with symbol#: ${winningSymbolNumber} (Name: ${visualSymbol?.name || 'N/A'}) at [${firstReelPos},${firstRowPos}]. Base Multiplier: ${baseMultiplier}`);


        // Skip if the first symbol is invalid or doesn't have a multiplier
        if (!visualSymbol || baseMultiplier === undefined || baseMultiplier <= 0) {
            // --- DEBUG LOG: Skipping invalid start symbol ---
            console.log(`[DEBUG] checkWin - Payline ${paylineIndex}: Symbol ${winningSymbolNumber} is not a valid winning start.`);
            return; // Not a paying symbol start
        }        // 2. Count consecutive matching symbols along the payline from left-to-right
        let consecutiveCount = 1;
        let winningPositionsOnThisLine = [{ reel: 0, row: payline[0] }]; // Start with the first position

        for (let i = 1; i < payline.length; i++) { // Start checking from the second position on the line
            const reelIndex = i; // Reel index matches the position in the loop
            const rowIndex = payline[i]; // Row index from the payline definition

            // Check if reel index is within bounds
            if (reelIndex >= currentReelResults.length) {
                console.log(`[DEBUG] checkWin - Payline ${paylineIndex}: Reel index ${reelIndex} out of bounds.`);
                break;
            }
            // Check if result data exists
            if (!currentReelResults[reelIndex] || currentReelResults[reelIndex][rowIndex] === undefined) {
                console.log(`[DEBUG] checkWin - Payline ${paylineIndex}: Result data missing at [${reelIndex}, ${rowIndex}].`);
                break; // Stop if data missing
            } const currentSymbolNumber = currentReelResults[reelIndex][rowIndex];

            // --- DEBUG LOG: Checking next position on the line ---
            console.log(`[DEBUG] checkWin - Payline ${paylineIndex}: Checking pos [${reelIndex},${rowIndex}]. Found Symbol#: ${currentSymbolNumber}. Need Symbol#: ${winningSymbolNumber}`);

            // --- Check for Match ---
            if (currentSymbolNumber === winningSymbolNumber) {
                consecutiveCount++;
                winningPositionsOnThisLine.push({ reel: reelIndex, row: rowIndex }); // Add matching position with correct structure
                console.log(`[DEBUG] checkWin - Payline ${paylineIndex}: Match found! Count is now ${consecutiveCount}`);
            } else {
                console.log(`[DEBUG] checkWin - Payline ${paylineIndex}: Sequence broken at Reel ${reelIndex}.`);
                break; // Sequence broken
            }
        }

        // --- DEBUG LOG: Final consecutive count for this line ---
        console.log(`[DEBUG] checkWin - Payline ${paylineIndex}: Final Consecutive Count = ${consecutiveCount}`);        // 3. Check if the count meets the minimum length and has a payout rule
        const minWin = MIN_WIN_LENGTH || 3; // Use configured minimum or default to 3

        // Check if we have enough consecutive symbols and if there's a payout for this symbol count
        if (consecutiveCount >= minWin && typeof baseMultiplier === 'object' && baseMultiplier[consecutiveCount]) {
            // Use the new structure: baseMultiplier[consecutiveCount] gives us the direct multiplier for this number of symbols
            const finalMultiplier = baseMultiplier[consecutiveCount];
            const winAmount = finalMultiplier * betAmount;

            // --- DEBUG LOG: Checking payout condition ---
            console.log(`[DEBUG] checkWin - Payline ${paylineIndex}: Count ${consecutiveCount} >= ${minWin}. Symbol multiplier for ${consecutiveCount}: ${finalMultiplier}. Win amount ${winAmount}`);

            // Only add if win amount is greater than 0
            if (winAmount > 0) {
                // --- DEBUG LOG: *** WIN DETECTED *** ---
                console.log(`%c[DEBUG] checkWin - *** WIN FOUND on Payline ${paylineIndex}! Symbol: ${winningSymbolNumber}, Count: ${consecutiveCount}, Amount: ${winAmount} ***`, "color: lime; font-weight: bold;");

                totalWinAmount += winAmount;

                const winLineData = {
                    paylineId: paylineIndex,
                    symbolName: visualSymbol.name,
                    symbolIndex: winningSymbolNumber,
                    positions: winningPositionsOnThisLine,
                    count: consecutiveCount,
                    multiplier: finalMultiplier,
                    amount: winAmount
                };
                winningLines.push(winLineData); // Add this winning line result

                // Update best overall match details based on multiplier
                if (!bestMatchDetails || finalMultiplier > bestMatchDetails.multiplier) {
                    bestMatchDetails = {
                        paylineId: paylineIndex,
                        symbolName: visualSymbol.name,
                        multiplier: finalMultiplier,
                        count: consecutiveCount,
                        amount: winAmount
                    };
                    console.log(`[DEBUG] checkWin - Updated bestMatchDetails.`);
                }
            } else {
                console.log(`[DEBUG] checkWin - Payline ${paylineIndex}: Calculated win amount is 0, not adding.`);
            }
        } else {
            // --- DEBUG LOG: Win condition not met ---
            console.log(`[DEBUG] checkWin - Payline ${paylineIndex}: Win condition not met (Count ${consecutiveCount} < ${minWin} or no PAYOUT_RULE for ${consecutiveCount}).`);
        }
    }); // --- End of PAYLINES loop ---

    // --- DEBUG LOG: Final result of checkWin ---
    try {
        console.log(`[DEBUG] checkWin - Complete. totalWinAmount=${totalWinAmount}. Final winningLines:`, JSON.parse(JSON.stringify(winningLines)));
    } catch (e) {
        console.error("[DEBUG] checkWin - Error stringifying final winningLines:", e);
        console.log("[DEBUG] checkWin - Raw final winningLines:", winningLines);
    }

    if (totalWinAmount > 0) {
        return {
            totalAmount: totalWinAmount,
            bestMatch: bestMatchDetails,
            allLines: winningLines
        };
    } else {
        return null; // No win on any payline
    }
}

// Using checkBonusTrigger imported from shared/bonus-games/index.js

// Function to load and prepare bonus game configuration
// Using loadBonusGameConfig imported from shared/bonus-games/index.js

// --- UI Drawing and Interaction ---
// ... (drawUIElements, drawText, drawRoundedRect functions remain the same) ...
// ... (handleMouseMove, handleMouseDown, handleMouseUp, getMousePos, isMouseOver functions remain the same) ...
function drawUIElements() {
    const padding = 15; // Padding inside the boxes

    // Right-aligned text that shrinks to fit its box: our wallet is IDR, so the amount can be
    // 9-10 digits and the fixed 22px font used to sit on top of the label.
    function drawFittedRight(text, rightX, y, maxWidth, baseSize, color) {
        let size = baseSize;
        do {
            ctx.font = `bold ${size}px Arial`;
            if (ctx.measureText(text).width <= maxWidth) break;
            size -= 1;
        } while (size > 11);
        drawText(text, rightX, y, `bold ${size}px Arial`, color, 'right', 'middle');
    }

    // Draw Balance Display
    const balanceX = 50;
    const balanceY = canvas.height - 80;
    const balanceWidth = 200;
    const balanceHeight = 50;

    drawRoundedRect(balanceX, balanceY, balanceWidth, balanceHeight, 8, 'rgba(0, 0, 0, 0.6)', '#ffcc00', 2);
    // Label aligned left ('SALDO' - shorter than BALANCE, and the app is Indonesian)
    ctx.font = 'bold 18px Arial';
    const balanceLabel = 'SALDO:';
    const balanceLabelWidth = ctx.measureText(balanceLabel).width;
    drawText(balanceLabel, balanceX + padding, balanceY + balanceHeight / 2, 'bold 18px Arial', '#ffcc00', 'left', 'middle');
    // Amount aligned right
    drawFittedRight(balance.toLocaleString(), balanceX + balanceWidth - padding, balanceY + balanceHeight / 2,
        balanceWidth - padding * 2 - balanceLabelWidth - 6, 22, '#ffffff');

    // Draw Theme Test Button
    drawThemeTestButton();

    // Draw Buttons for Paylines, Pay Table, and History
    const btnHeight = 40;
    const btnSpacing = 10;
    const btnY = 20;

    // Paylines Button
    const paylinesBtnWidth = 130;
    const paylinesBtnX = canvas.width - paylinesBtnWidth - 10;
    const paylinesBtnColor = showPaylines ? '#ff9900' : '#ffcc00';

    drawRoundedRect(paylinesBtnX, btnY, paylinesBtnWidth, btnHeight, 8, 'rgba(0, 0, 0, 0.6)', paylinesBtnColor, 2);
    drawText('SHOW PAYLINES', paylinesBtnX + paylinesBtnWidth / 2, btnY + btnHeight / 2, 'bold 14px Arial', '#FFFFFF', 'center', 'middle');

    // Pay Table Button
    const paytableBtnWidth = 110;
    const paytableBtnX = paylinesBtnX - paytableBtnWidth - btnSpacing;
    const paytableBtnColor = showPaytable ? '#ff9900' : '#ffcc00';

    drawRoundedRect(paytableBtnX, btnY, paytableBtnWidth, btnHeight, 8, 'rgba(0, 0, 0, 0.6)', paytableBtnColor, 2);
    drawText('PAY TABLE', paytableBtnX + paytableBtnWidth / 2, btnY + btnHeight / 2, 'bold 14px Arial', '#FFFFFF', 'center', 'middle');

    // History Button
    const historyBtnWidth = 90;
    const historyBtnX = paytableBtnX - historyBtnWidth - btnSpacing;
    const historyBtnColor = showHistory ? '#ff9900' : '#ffcc00';

    drawRoundedRect(historyBtnX, btnY, historyBtnWidth, btnHeight, 8, 'rgba(0, 0, 0, 0.6)', historyBtnColor, 2);
    drawText('HISTORY', historyBtnX + historyBtnWidth / 2, btnY + btnHeight / 2, 'bold 14px Arial', '#FFFFFF', 'center', 'middle');

    // Draw Mute Button
    const muteBtnSize = 40;
    const muteBtnX = 20;
    const muteBtnY = 20;
    const muteBtnColor = muteState ? '#ff3366' : '#ffcc00';
    const muteBtnStroke = '#ffffff';

    drawRoundedRect(muteBtnX, muteBtnY, muteBtnSize, muteBtnSize, 8, 'rgba(0, 0, 0, 0.6)', muteBtnColor, 2);

    // Draw sound icon or muted icon based on state
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();

    if (muteState) {
        // Draw muted speaker icon
        // Speaker base
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(muteBtnX + 10, muteBtnY + 17, 6, 6);
        // Speaker cone outline
        ctx.moveTo(muteBtnX + 16, muteBtnY + 17);
        ctx.lineTo(muteBtnX + 22, muteBtnY + 12);
        ctx.lineTo(muteBtnX + 22, muteBtnY + 28);
        ctx.lineTo(muteBtnX + 16, muteBtnY + 23);
        ctx.closePath();
        ctx.fill();

        // X over the speaker
        ctx.beginPath();
        ctx.moveTo(muteBtnX + 26, muteBtnY + 14);
        ctx.lineTo(muteBtnX + 32, muteBtnY + 26);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(muteBtnX + 26, muteBtnY + 26);
        ctx.lineTo(muteBtnX + 32, muteBtnY + 14);
        ctx.stroke();
    } else {
        // Draw unmuted speaker icon
        // Speaker base
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(muteBtnX + 10, muteBtnY + 17, 6, 6);
        // Speaker cone outline
        ctx.moveTo(muteBtnX + 16, muteBtnY + 17);
        ctx.lineTo(muteBtnX + 22, muteBtnY + 12);
        ctx.lineTo(muteBtnX + 22, muteBtnY + 28);
        ctx.lineTo(muteBtnX + 16, muteBtnY + 23);
        ctx.closePath();
        ctx.fill();

        // Sound waves
        ctx.beginPath();
        ctx.arc(muteBtnX + 22, muteBtnY + 20, 5, -Math.PI / 3, Math.PI / 3);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(muteBtnX + 22, muteBtnY + 20, 9, -Math.PI / 3, Math.PI / 3);
        ctx.stroke();
    }

    // Draw Bet Display and Buttons
    const betWidth = 150;
    const betHeight = 50;
    const betX = canvas.width / 2 - betWidth / 2;
    const betY = canvas.height - 80;
    const adjustBtnSize = 40;
    const decreaseBtnX = betX - adjustBtnSize - 10;
    const increaseBtnX = betX + betWidth + 10;
    const adjustBtnY = betY + (betHeight - adjustBtnSize) / 2;

    // Bet Amount Box
    drawRoundedRect(betX, betY, betWidth, betHeight, 8, 'rgba(0, 0, 0, 0.6)', '#ffcc00', 2);
    ctx.font = 'bold 18px Arial';
    const betLabelWidth = ctx.measureText('BET:').width;
    drawText('BET:', betX + padding, betY + betHeight / 2, 'bold 18px Arial', '#ffcc00', 'left', 'middle');
    drawFittedRight(betAmount.toString(), betX + betWidth - padding, betY + betHeight / 2,
        betWidth - padding * 2 - betLabelWidth - 6, 22, '#ffffff');

    const decColor = buttonEffects.bet.decreaseActive ? '#cc9900' : '#ffcc00';
    const decFill = spinning ? '#555555' : decColor; // Grey out if spinning
    const decStroke = spinning ? '#888888' : '#ffffff';
    drawRoundedRect(decreaseBtnX, adjustBtnY, adjustBtnSize, adjustBtnSize, 5, decFill, decStroke, 2);
    drawText('-', decreaseBtnX + adjustBtnSize / 2, adjustBtnY + adjustBtnSize / 2 + 1, 'bold 30px Arial', spinning ? '#aaaaaa' : '#1a1a2e', 'center', 'middle');
    // Increase Bet Button (+) - Only draw if not spinning
    const incColor = buttonEffects.bet.increaseActive ? '#cc9900' : '#ffcc00';
    const incFill = spinning ? '#555555' : incColor; // Grey out if spinning
    const incStroke = spinning ? '#888888' : '#ffffff';
    drawRoundedRect(increaseBtnX, adjustBtnY, adjustBtnSize, adjustBtnSize, 5, incFill, incStroke, 2);
    drawText('+', increaseBtnX + adjustBtnSize / 2, adjustBtnY + adjustBtnSize / 2 + 1, 'bold 30px Arial', spinning ? '#aaaaaa' : '#1a1a2e', 'center', 'middle');


    // Draw Spin Button
    const spinBtnWidth = 120;
    const spinBtnHeight = 50;
    const spinBtnX = canvas.width - spinBtnWidth - 50; // Positioned from right edge
    const spinBtnY = canvas.height - 80;

    // Apply scale effect (subtle hover)
    const targetScale = buttonEffects.spin.active && !spinning ? 1.05 : 1.0; // Only hover if not spinning
    buttonEffects.spin.scale += (targetScale - buttonEffects.spin.scale) * 0.2; // Smooth transition

    // Apply pressed effect
    let buttonShiftY = buttonEffects.spin.pressed && !spinning ? 3 : 0; // Only press if not spinning

    // Set button color based on state
    let btnGradientColors;
    if (spinning) {
        // Disabled look
        btnGradientColors = ['#666666', '#444444'];
    } else if (buttonEffects.spin.pressed) {
        // Pressed look
        btnGradientColors = ['#cc2855', '#dd0022'];
    } else if (buttonEffects.spin.active) {
        // Hover look (slightly brighter/different)
        btnGradientColors = ['#ff5588', '#ff2255'];
    }
    else {
        // Default look
        btnGradientColors = ['#ff3366', '#ff0033'];
    }

    const btnGradient = ctx.createLinearGradient(0, spinBtnY, 0, spinBtnY + spinBtnHeight);
    btnGradient.addColorStop(0, btnGradientColors[0]);
    btnGradient.addColorStop(1, btnGradientColors[1]);

    ctx.save();
    // Translate for scaling and pressing, centered on the button
    ctx.translate(spinBtnX + spinBtnWidth / 2, spinBtnY + spinBtnHeight / 2);
    ctx.scale(buttonEffects.spin.scale, buttonEffects.spin.scale);
    ctx.translate(-(spinBtnX + spinBtnWidth / 2), -(spinBtnY + spinBtnHeight / 2 + buttonShiftY)); // Apply shift *after* scaling rotation point

    // Draw the button shape
    const spinStrokeColor = spinning ? '#888888' : '#ffffff';
    drawRoundedRect(spinBtnX, spinBtnY, spinBtnWidth, spinBtnHeight, 10, btnGradient, spinStrokeColor, 2);

    // Draw text (adjust position slightly because of translation if needed, though center align helps)
    const spinTextColor = spinning ? '#aaaaaa' : '#ffffff';
    drawText('SPIN', spinBtnX + spinBtnWidth / 2, spinBtnY + spinBtnHeight / 2 + 1, 'bold 24px Arial', spinTextColor, 'center', 'middle');

    ctx.restore();
}

// Draw the theme test button
function drawThemeTestButton() {
    // Get mute button position for reference
    const muteBtnSize = 40;
    const muteBtnX = 20;
    const muteBtnY = 20;

    // Position test button to the right of the mute button with some spacing
    const testBtnWidth = 120;
    const testBtnHeight = 40;
    const testBtnX = muteBtnX + muteBtnSize + 10; // 10px spacing between buttons
    const testBtnY = muteBtnY; // Same Y position as mute button

    // Draw the button
    drawRoundedRect(testBtnX, testBtnY, testBtnWidth, testBtnHeight, 8, 'rgba(255, 51, 102, 0.8)', '#ffffff', 2);
    drawText('TEST EPIC WIN', testBtnX + testBtnWidth / 2, testBtnY + testBtnHeight / 2, 'bold 14px Arial', '#FFFFFF', 'center', 'middle');
}

function drawText(text, x, y, font, color, align = 'left', baseline = 'top') {
    ctx.fillStyle = color;
    ctx.font = font;
    ctx.textAlign = align;
    ctx.textBaseline = baseline;
    ctx.fillText(text, x, y);
}

function drawRoundedRect(x, y, width, height, radius, fillStyle, strokeStyle, lineWidth) {
    ctx.beginPath();
    // Ensure radius is not too large for the rectangle dimensions
    const maxRadius = Math.min(width / 2, height / 2);
    const actualRadius = Math.min(radius, maxRadius);

    if (ctx.roundRect) {
        // Use native roundRect if available
        ctx.roundRect(x, y, width, height, actualRadius);
    } else {
        // Fallback for older browsers
        ctx.moveTo(x + actualRadius, y);
        ctx.lineTo(x + width - actualRadius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + actualRadius);
        ctx.lineTo(x + width, y + height - actualRadius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - actualRadius, y + height);
        ctx.lineTo(x + actualRadius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - actualRadius);
        ctx.lineTo(x, y + actualRadius);
        ctx.quadraticCurveTo(x, y, x + actualRadius, y);
    }
    ctx.closePath();

    if (fillStyle) {
        ctx.fillStyle = fillStyle;
        ctx.fill();
    }
    if (strokeStyle && lineWidth > 0) {
        ctx.strokeStyle = strokeStyle;
        ctx.lineWidth = lineWidth;
        ctx.stroke();
    }
}

function handleMouseMove(e) {
    if (spinning) { // Don't update hover effects while spinning
        buttonEffects.spin.active = false;
        buttonEffects.bet.decreaseActive = false;
        buttonEffects.bet.increaseActive = false;
        return;
    }
    const { mouseX, mouseY } = getMousePos(e);

    // Check Mute Button
    const muteBtnSize = 40;
    const muteBtnX = 20;
    const muteBtnY = 20;
    const isOverMuteBtn = isMouseOver(mouseX, mouseY, muteBtnX, muteBtnY, muteBtnSize, muteBtnSize);

    // Check Spin Button
    const spinBtnWidth = 120;
    const spinBtnHeight = 50;
    const spinBtnX = canvas.width - spinBtnWidth - 50;
    const spinBtnY = canvas.height - 80;
    buttonEffects.spin.active = isMouseOver(mouseX, mouseY, spinBtnX, spinBtnY, spinBtnWidth, spinBtnHeight);

    // Check Bet Buttons
    const betWidth = 150;
    const betX = canvas.width / 2 - betWidth / 2;
    const betY = canvas.height - 80;
    const adjustBtnSize = 40;
    const topBtnHeight = 40; // Renamed from btnHeight to avoid conflict
    const decreaseBtnX = betX - adjustBtnSize - 10;
    const increaseBtnX = betX + betWidth + 10;
    const adjustBtnY = betY + (topBtnHeight - adjustBtnSize) / 2;
    buttonEffects.bet.decreaseActive = isMouseOver(mouseX, mouseY, decreaseBtnX, adjustBtnY, adjustBtnSize, adjustBtnSize);
    buttonEffects.bet.increaseActive = isMouseOver(mouseX, mouseY, increaseBtnX, adjustBtnY, adjustBtnSize, adjustBtnSize);
}

// Handle all interactions when a modal is displayed
function handleModalInteractions(mouseX, mouseY) {
    // Modal dimensions
    const modalWidth = 800;
    const modalHeight = 600; // Updated height
    const modalX = canvas.width / 2 - modalWidth / 2;
    const modalY = canvas.height / 2 - modalHeight / 2;

    // Modal close button dimensions
    const closeBtnSize = 40;
    const closeBtnX = modalX + modalWidth - closeBtnSize - 10;
    const closeBtnY = modalY + 10;

    // Check if close button was clicked
    if (isMouseOver(mouseX, mouseY, closeBtnX, closeBtnY, closeBtnSize, closeBtnSize)) {
        playSound('click');
        showPaytable = false;
        showHistory = false;
        return;
    }

    // Handle history pagination if history modal is shown
    if (showHistory) {
        // Pagination button dimensions
        const pageBtnWidth = 80;
        const pageBtnHeight = 40;
        const pageBtnY = canvas.height - 80;
        const prevBtnX = canvas.width / 2 - pageBtnWidth - 20;
        const nextBtnX = canvas.width / 2 + 20;

        // Calculate total pages
        const totalPages = Math.ceil(spinHistory.length / RESULTS_PER_PAGE);

        // Check Previous button click
        if (historyCurrentPage > 0 && isMouseOver(mouseX, mouseY, prevBtnX, pageBtnY, pageBtnWidth, pageBtnHeight)) {
            playSound('click');
            historyCurrentPage--;
            return;
        }

        // Check Next button click
        if (historyCurrentPage < totalPages - 1 && isMouseOver(mouseX, mouseY, nextBtnX, pageBtnY, pageBtnWidth, pageBtnHeight)) {
            playSound('click');
            historyCurrentPage++;
            return;
        }
    }
}

function handleMouseDown(e) {
    const { mouseX, mouseY } = getMousePos(e);

    // If a modal is open, only handle modal-specific interactions
    if (showPaytable || showHistory) {
        handleModalInteractions(mouseX, mouseY);
        return;
    }

    // Check Mute Button Click
    const muteBtnSize = 40;
    const muteBtnX = 20;
    const muteBtnY = 20;
    if (isMouseOver(mouseX, mouseY, muteBtnX, muteBtnY, muteBtnSize, muteBtnSize)) {
        playSound('click');
        toggleMute();
        return;
    }

    // Button measurements for all top buttons
    const topBtnHeight = 40; // Renamed from btnHeight to avoid conflict
    const btnY = 20;
    const btnSpacing = 10;

    // Check Paylines Button Click
    const paylinesBtnWidth = 130;
    const paylinesBtnX = canvas.width - paylinesBtnWidth - 10;
    if (isMouseOver(mouseX, mouseY, paylinesBtnX, btnY, paylinesBtnWidth, topBtnHeight)) {
        playSound('click');
        showPaylines = !showPaylines; // Toggle paylines visibility
        return;
    }

    // Check Pay Table Button Click
    const paytableBtnWidth = 110;
    const paytableBtnX = paylinesBtnX - paytableBtnWidth - btnSpacing;
    if (isMouseOver(mouseX, mouseY, paytableBtnX, btnY, paytableBtnWidth, topBtnHeight)) {
        playSound('click');
        showPaytable = true;
        showHistory = false; // Close other modal if open
        return;
    }

    // Check History Button Click
    const historyBtnWidth = 90;
    const historyBtnX = paytableBtnX - historyBtnWidth - btnSpacing;
    if (isMouseOver(mouseX, mouseY, historyBtnX, btnY, historyBtnWidth, topBtnHeight)) {
        playSound('click');
        showHistory = true;
        showPaytable = false; // Close other modal if open
        return;
    }

    // Check Spin Button Click
    const spinBtnWidth = 120;
    const spinBtnHeight = 50;
    const spinBtnX = canvas.width - spinBtnWidth - 50;
    const spinBtnY = canvas.height - 80;
    if (isMouseOver(mouseX, mouseY, spinBtnX, spinBtnY, spinBtnWidth, spinBtnHeight)) {
        buttonEffects.spin.pressed = true;
        playSound('click');
        // Trigger spin slightly delayed to show press, then reset press state visually
        setTimeout(() => {
            spinReels();
            // No need to reset pressed here, spinReels start handles it
        }, 100); // Short delay to see the press
    }

    // Check Bet Buttons Click
    const betWidth = 150;
    const betX = canvas.width / 2 - betWidth / 2;
    const betY = canvas.height - 80;
    const adjustBtnSize = 40;
    // Remove the duplicate declaration of topBtnHeight here
    const decreaseBtnX = betX - adjustBtnSize - 10;
    const increaseBtnX = betX + betWidth + 10;
    const adjustBtnY = betY + (topBtnHeight - adjustBtnSize) / 2;

    if (isMouseOver(mouseX, mouseY, decreaseBtnX, adjustBtnY, adjustBtnSize, adjustBtnSize)) {
        playSound('click');
        decreaseBet();
        // Visual feedback is handled by hover state change + maybe draw state change if needed
    } else if (isMouseOver(mouseX, mouseY, increaseBtnX, adjustBtnY, adjustBtnSize, adjustBtnSize)) {
        playSound('click');
        increaseBet();
        // Visual feedback handled by hover state
    }    // Check Theme Test Button Click
    const testBtnWidth = 120;
    const testBtnHeight = 40;

    // Position test button to the right of the mute button with same spacing
    const testBtnX = muteBtnX + muteBtnSize + 10; // 10px spacing between buttons
    const testBtnY = muteBtnY; // Same Y position as mute button

    if (isMouseOver(mouseX, mouseY, testBtnX, testBtnY, testBtnWidth, testBtnHeight)) {
        playSound('click');
        triggerEpicWinAnimation(winAmount);
    }
}
function handleMouseUp(e) {
    // Reset pressed state for the spin button when mouse is released, *if* not spinning
    if (buttonEffects.spin.pressed && !spinning) {
        buttonEffects.spin.pressed = false;
        // Check if the mouse is still over the button to maintain active state
        handleMouseMove(e);
    }
}

function getMousePos(e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
        mouseX: (e.clientX - rect.left) * scaleX,
        mouseY: (e.clientY - rect.top) * scaleY
    };
}

function isMouseOver(mouseX, mouseY, x, y, width, height) {
    return mouseX >= x && mouseX <= x + width && mouseY >= y && mouseY <= y + height;
}


// --- Win Line Drawing ---
function drawWinLines(timestamp) {
    // No change needed at the start (check winningLines)
    if (!winningLines || winningLines.length === 0) return;

    const reelWidth = SYMBOL_SIZE;

    // Get the current theme's layout configuration
    const themeLayout = THEMES[currentThemeName]?.layout;

    // Get the desired spacing from theme, or use a default value
    const desiredSpacing = themeLayout?.reelSpacing || 10; // Default to 10px if not specified

    // Calculate total space needed for all reels
    const totalReelWidth = reelWidth * REEL_COUNT;

    // Calculate total space available for spacing (between and on edges)
    const totalAvailableForSpacing = canvas.width - totalReelWidth;

    // Ensure we have at least minimal spacing between reels
    const minSpacingNeeded = REEL_COUNT - 1; // Spacing only needed between reels, not on edges

    let actualSpacing;
    if (totalAvailableForSpacing >= desiredSpacing * minSpacingNeeded) {
        // We can use the desired spacing
        actualSpacing = desiredSpacing;
    } else {
        // Not enough space for desired spacing, calculate maximum possible
        actualSpacing = totalAvailableForSpacing / minSpacingNeeded;
    }

    // Center the entire reel area
    const startX = (canvas.width - (totalReelWidth + actualSpacing * (REEL_COUNT - 1))) / 2;
    const startY = 100;
    const symbolCenterOffsetY = SYMBOL_SIZE / 2;
    const symbolCenterOffsetX = SYMBOL_SIZE / 2;

    const flash = Math.floor(timestamp / 300) % 2 === 0; // Flash effect toggle

    // Define line colors - cycle through them for multiple winning lines
    const lineColors = ['#ff3366', '#ffcc00', '#4caf50', '#2196f3', '#9c27b0', '#ff9800', '#00bcd4', '#e91e63'];    // Get the current theme's configuration for minimum win length
    const currentTheme = THEMES[currentThemeName];
    const minWinLength = currentTheme?.config?.PAYOUT_RULES?.minWinLength || 3; // Default to 3 if not specified

    // --- Iterate through EACH winning line found ---
    winningLines.forEach((lineData, lineIndex) => {
        if (!lineData || !lineData.positions || lineData.positions.length < minWinLength) return;

        const color = lineColors[lineIndex % lineColors.length]; // Cycle through colors for each line
        // --- Draw the specific line segment connecting winning positions ---
        ctx.strokeStyle = flash ? color : '#ffffff'; // Use assigned color with flash
        ctx.lineWidth = 5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.globalAlpha = 0.85; ctx.beginPath(); for (let k = 0; k < lineData.positions.length; k++) { // Iterate ONLY through positions of THIS line
            const pos = lineData.positions[k];
            // Use the configured actualSpacing to calculate correct position
            const x = startX + pos.reel * (reelWidth + actualSpacing) + symbolCenterOffsetX;
            const y = startY + pos.row * SYMBOL_SIZE + symbolCenterOffsetY;

            if (k === 0) {
                ctx.moveTo(x, y); // Start the line path
            } else {
                ctx.lineTo(x, y); // Draw segment to the next point on this line
            }
        }
        ctx.stroke(); // Draw the complete line segment for this winning line
        ctx.globalAlpha = 1.0; // Reset alpha  
        lineData.positions.forEach(pos => {
            const symbolData = symbols[lineData.symbolIndex]; // Get visual data
            if (!symbolData) return;            // Fix: Use 'reel' and 'row' properties consistent with line drawing
            const x = startX + pos.reel * (reelWidth + actualSpacing);
            const y = startY + pos.row * SYMBOL_SIZE;
            const highlightColor = flash ? color : '#ffffff'; // Match line color
            let highlightInset = 4;
            let highlightLineWidth = 3;

            if (symbolData.winAnimation) {
                // Mark specific instances? Tricky without unique IDs.
                // For now, just pulse any symbol matching the winning type.
                // A better approach might involve tagging specific drawn instances.
                // Let's keep the existing pulse logic based on symbol type for now.
                if (symbolData.winAnimation.lastUpdate === undefined) symbolData.winAnimation.lastUpdate = timestamp;
                if (timestamp - symbolData.winAnimation.lastUpdate > symbolData.winAnimation.frameRate) {
                    symbolData.winAnimation.currentFrame = (symbolData.winAnimation.currentFrame + 1) % symbolData.winAnimation.frames;
                    symbolData.winAnimation.lastUpdate = timestamp;
                }
                const pulseFactor = Math.sin((symbolData.winAnimation.currentFrame / symbolData.winAnimation.frames) * Math.PI);
                highlightInset = 4 - pulseFactor * 2;
                highlightLineWidth = 3 + pulseFactor * 2;
            }

            ctx.strokeStyle = highlightColor;
            ctx.lineWidth = highlightLineWidth;
            //draws the border around winning symbols
            drawRoundedRect(x + highlightInset, y + highlightInset, SYMBOL_SIZE - 2 * highlightInset, SYMBOL_SIZE - 2 * highlightInset, 5, null, highlightColor, highlightLineWidth);
        });

        // Apply win effects
        applyWinEffects(ctx, lineData, timestamp);
    }); // --- End of winningLines loop ---


    // --- Display Total Win Amount (No change needed here) ---
    const totalWin = winningLines.reduce((sum, line) => sum + line.amount, 0);
    if (totalWin > 0) {
        let winTextY = startY + SYMBOL_SIZE * VISIBLE_ROWS + 50;
        const winTextX = canvas.width / 2;
        // ... (rest of win amount drawing logic remains the same) ...
        const pulse = Math.sin(timestamp / 200) * 0.05 + 1;
        const baseFontSize = 36;
        const fontSize = Math.floor(baseFontSize * pulse);
        const glowIntensity = Math.abs(Math.sin(timestamp / 350)) * 10 + 5;
        const glowColor = `rgba(255, 223, 0, ${0.6 + Math.abs(Math.sin(timestamp / 350)) * 0.4})`;

        ctx.save();
        ctx.font = `bold ${fontSize}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = glowColor;
        ctx.shadowBlur = glowIntensity;
        ctx.fillStyle = '#ffffff';
        ctx.fillText(`WIN: ${totalWin.toLocaleString()}`, winTextX, winTextY);
        ctx.restore();
    }
}

// Draw all configured paylines when the Show Paylines button is toggled on
function drawAllPaylines(timestamp) {
    if (!showPaylines) return;

    const reelWidth = SYMBOL_SIZE;

    // Get the current theme's layout configuration
    const themeLayout = THEMES[currentThemeName]?.layout;

    // Get the desired spacing from theme, or use a default value
    const desiredSpacing = themeLayout?.reelSpacing || 10; // Default to 10px if not specified

    // Calculate total space needed for all reels
    const totalReelWidth = reelWidth * REEL_COUNT;

    // Calculate total space available for spacing (between and on edges)
    const totalAvailableForSpacing = canvas.width - totalReelWidth;

    // Ensure we have at least minimal spacing between reels
    const minSpacingNeeded = REEL_COUNT + 1; // One space between each reel and on both ends

    let actualSpacing;
    if (totalAvailableForSpacing >= desiredSpacing * minSpacingNeeded) {
        // We can use the desired spacing
        actualSpacing = desiredSpacing;
    } else {
        // Not enough space for desired spacing, calculate maximum possible
        actualSpacing = totalAvailableForSpacing / minSpacingNeeded;
    }

    // Center the entire reel area
    const startX = (canvas.width - (totalReelWidth + actualSpacing * (REEL_COUNT - 1))) / 2;
    const startY = 100;
    const symbolCenterOffsetY = SYMBOL_SIZE / 2;
    const symbolCenterOffsetX = SYMBOL_SIZE / 2;

    const flash = Math.floor(timestamp / 300) % 2 === 0; // Flash effect toggle    // Define line colors for different paylines
    const lineColors = ['#ff3366', '#ffcc00', '#4caf50', '#2196f3', '#9c27b0', '#ff9800', '#00bcd4', '#e91e63'];

    // Get PAYLINES from the current theme's configuration
    const currentTheme = THEMES[currentThemeName];
    if (!currentTheme || !currentTheme.config) {
        console.error("Cannot draw paylines: theme or theme config is missing");
        return;
    }
    const PAYLINES = currentTheme.config.PAYLINES;
    if (!PAYLINES || PAYLINES.length === 0) {
        console.error("Cannot draw paylines: no paylines defined in theme config");
        return;
    }    // Draw each payline with a unique color
    PAYLINES.forEach((payline, lineIndex) => {
        const color = lineColors[lineIndex % lineColors.length]; // Cycle colors per line

        ctx.strokeStyle = flash ? color : '#ffffff'; // Alternate between color and white
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.globalAlpha = 0.7;
        ctx.beginPath();

        // Convert the numerical payline format to positions with x,y coordinates
        for (let i = 0; i < payline.length; i++) {
            // In the theme config, payline is an array of row indices
            // We need to convert each to {reel: i, row: payline[i]} format
            const rowIndex = payline[i];
            const reelIndex = i;

            const x = startX + reelIndex * (reelWidth + actualSpacing) + symbolCenterOffsetX;
            const y = startY + rowIndex * SYMBOL_SIZE + symbolCenterOffsetY;

            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
        ctx.stroke();

        // Add line number indicator at the first position
        const firstRowIndex = payline[0];
        const labelX = startX + 0 * (reelWidth + actualSpacing) + symbolCenterOffsetX - 15; // First reel (index 0)
        const labelY = startY + firstRowIndex * SYMBOL_SIZE + symbolCenterOffsetY;

        // Draw small circle with line number
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(labelX, labelY, 10, 0, Math.PI * 2);
        ctx.fill();

        // Draw line number
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 10px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(lineIndex + 1, labelX, labelY);
    });

    ctx.globalAlpha = 1.0; // Reset alpha
}

// --- Win Celebration ---
// ... (triggerWinCelebration, drawWinCelebration functions remain the same) ...
function triggerWinCelebration(amount) {
    // Get the current theme's configuration for win effects
    const currentTheme = THEMES[currentThemeName];
    const themeEffects = currentTheme?.visualEffects || {};
    const winEffectsConfig = themeEffects.winEffects || {};
    const celebrationConfig = winEffectsConfig.celebration || {};

    // Check if win celebration is enabled in the theme configuration
    const celebrationEnabled = winEffectsConfig.enabled !== false && celebrationConfig.enabled !== false;

    // If not enabled, don't trigger celebration
    if (!celebrationEnabled) return;

    // Set global state for tracking
    winAnimationActive = true;

    // Use the shared implementation from EffectsHelper
    EffectsHelper.triggerWinCelebration(ctx, canvas, amount, betAmount, {
        particleCount: Math.min(
            celebrationConfig.maxParticles || 150,
            Math.max(celebrationConfig.minParticles || 30,
                Math.floor(amount / (betAmount * 0.1))
            )
        ),
        duration: celebrationConfig.duration || 5000,
        intensity: celebrationConfig.intensity || 0.7
    });

    // If the theme has its own custom win celebration method, call that too
    if (currentTheme.ThemeEffectsHelper &&
        typeof currentTheme.ThemeEffectsHelper.triggerThemeWinCelebration === 'function') {
        currentTheme.ThemeEffectsHelper.triggerThemeWinCelebration(ctx, canvas, amount, betAmount);
    }
}

function drawWinCelebration(deltaTime) {
    // Use the shared implementation from EffectsHelper
    const isActive = EffectsHelper.drawWinCelebration(ctx, canvas, deltaTime);

    // Update global state if needed
    winAnimationActive = isActive || winAnimationActive;

    // Get the current theme
    const currentTheme = THEMES[currentThemeName];

    // If the theme has its own custom win celebration drawing method, call that too
    if (currentTheme && currentTheme.ThemeEffectsHelper &&
        typeof currentTheme.ThemeEffectsHelper.drawThemeWinCelebration === 'function') {
        // Pass performance.now() as timestamp since it's not provided as a parameter
        const currentTimestamp = performance.now();
        const themeStillActive = currentTheme.ThemeEffectsHelper.drawThemeWinCelebration(
            ctx, canvas, deltaTime, currentTimestamp
        );

        // Combined activity state
        winAnimationActive = winAnimationActive || themeStillActive;
    }

    // If all animations are finished, set global state to inactive
    if (!winAnimationActive) {
        // No cleanup needed - particles are now managed in EffectsHelper
    }
}


// --- Bet/Balance Management ---

function decreaseBet() {
    if (spinning) return;
    // Rupiah stakes while framed by the portal, demo credits otherwise
    const betOptions = portalWallet.on ? PORTAL_BETS : [5, 10, 20, 50, 100, 200];
    let currentIndex = betOptions.indexOf(betAmount);
    if (currentIndex > 0) {
        betAmount = betOptions[currentIndex - 1];
        updateBetDisplay(); // Updates display AND paytable
    }
    // else: Optionally play a 'min bet' sound/visual cue
}

function increaseBet() {
    if (spinning) return;
    const betOptions = portalWallet.on ? PORTAL_BETS : [5, 10, 20, 50, 100, 200];
    let currentIndex = betOptions.indexOf(betAmount);
    if (currentIndex === -1) currentIndex = 0; // portal bet left over from a previous mirror
    if (currentIndex < betOptions.length - 1) {
        const nextBet = betOptions[currentIndex + 1];
        if (balance >= nextBet) { // Check if balance allows increase
            betAmount = nextBet;
            updateBetDisplay(); // Updates display AND paytable
        } else {
            // Optional: Visual feedback that bet can't be increased due to balance
            console.log("Cannot increase bet, insufficient balance.");
            // Simple flash effect on bet display (using CSS class)
            if (betAmountElement) {
                betAmountElement.classList.add('flash-warn');
                setTimeout(() => { betAmountElement.classList.remove('flash-warn'); }, 300);
            }
            // Optional: Play a 'cannot afford' sound?
        }
    }
    // else: Optionally play a 'max bet' sound/visual cue
}

function updateBalanceDisplay() {
    if (balanceElement) {
        balanceElement.textContent = balance.toLocaleString(); // Format with commas
    }
}

// UPDATED updateBetDisplay to call populatePaytable
function updateBetDisplay() {
    if (betAmountElement) {
        betAmountElement.textContent = betAmount;
    }
    populatePaytable(); // Update paytable whenever bet changes
}

// --- Theme Loading and Management ---
// The old in-game theme picker (changeTheme / setupThemeSwitcher) is gone on purpose:
// every theme is its own game card in the DY01 lobby, reached with ?theme=<name>.

// UPDATED function to load symbols for a specific theme using imported THEMES
async function loadThemeSymbols(themeName) {
    console.log(`Attempting to load theme: ${themeName}`);
    const themeData = THEMES[themeName]; // <-- Use imported THEMES

    if (!themeData || !themeData.symbols) {
        console.error(`Theme "${themeName}" not found or is invalid! Falling back to Classic.`);
        themeName = "Aztec"; // Default fallback theme
        themeData = THEMES[themeName];
        if (!themeData || !themeData.symbols) {
            console.error("CRITICAL: Fallback theme 'Classic' also not found or invalid!");
            // Handle critical failure - maybe display error on canvas?
            symbols = []; // Ensure symbols is empty
            return Promise.reject(new Error("Failed to load any valid theme.")); // Reject the promise
        }
    }

    currentThemeName = themeName; // Update the current theme name state
    document.body.className = `theme-${themeName.toLowerCase().replace(/\s+/g, '-')}`; // Optional: Add theme class to body for CSS styling
    console.log(`Loading symbols for theme: ${currentThemeName}`);
    symbols = []; // Clear existing symbols

    // Use the symbols array directly from the themeData object
    const themeSymbolsData = themeData.symbols;

    const symbolPromises = themeSymbolsData.map((symbolData, index) => {
        // Basic validation of symbol data
        if (!symbolData || !symbolData.path || !symbolData.name) {
            console.warn(`Invalid symbol data at index ${index} for theme ${themeName}`, symbolData);
            return Promise.resolve(); // Skip this symbol but continue loading others
        }
        return new Promise((resolve) => { // No reject needed, just resolve after attempt
            const img = new Image();
            img.src = symbolData.path;
            // Add crossOrigin attribute if loading from external URLs
            // img.crossOrigin = "Anonymous";

            const loadedSymbol = {
                ...symbolData,
                image: null, // Start with null image
                id: index     // Store original index if needed
            };

            img.onload = () => {
                loadedSymbol.image = img; // Assign image on successful load
                symbols.push(loadedSymbol);
                // console.log(`Loaded image for: ${symbolData.name}`);
                resolve();
            };
            img.onerror = (err) => {
                console.error(`Failed to load image for ${symbolData.name} (${symbolData.path}) in theme ${themeName}:`, err);
                loadedSymbol.color = getRandomColor(); // Assign fallback color
                symbols.push(loadedSymbol); // Add symbol even if image fails, uses fallback drawing
                resolve(); // Still resolve so game doesn't halt
            };
        });
    });

    await Promise.all(symbolPromises);

    // Sort the loaded 'symbols' array to match the order in the theme definition file.
    // This is crucial because reel generation and win checking rely on index matching.
    symbols.sort((a, b) => {
        const indexA = themeSymbolsData.findIndex(s => s.name === a.name);
        const indexB = themeSymbolsData.findIndex(s => s.name === b.name);
        return indexA - indexB;
    });


    if (symbols.length === 0) {
        console.error(`CRITICAL: No symbols were successfully processed for theme ${themeName}!`);
        // Potentially reject promise or set a flag to prevent game start
        return Promise.reject(new Error(`No symbols loaded for theme ${themeName}`));
    } else if (symbols.length !== themeSymbolsData.length) {
        console.warn(`Loaded ${symbols.length} symbols, but theme definition has ${themeSymbolsData.length}. Some may have failed loading.`);
    }

    console.log(`Finished loading symbols for theme: ${themeName}. ${symbols.length} symbols ready.`);
    // The promise resolves implicitly here if no errors were thrown/rejected
}

function populatePaytable() {
    // This function now does nothing as we're only using the canvas-based modal
    // The pay table information is drawn directly in drawPaytableModal function
}

// Draw the Pay Table modal
function drawPaytableModal() {
    if (!showPaytable) return;

    // Draw semi-transparent overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw modal content container
    const modalWidth = 800;
    const modalHeight = 600;
    const modalX = canvas.width / 2 - modalWidth / 2;
    const modalY = canvas.height / 2 - modalHeight / 2;

    // Draw modal background
    drawRoundedRect(modalX, modalY, modalWidth, modalHeight, 15,
        'rgba(40, 40, 60, 0.95)', '#ffcc00', 3);

    // Draw title
    drawText('PAY TABLE', canvas.width / 2, modalY + 40, 'bold 28px Arial', '#ffffff', 'center', 'middle');

    // Draw close button
    const closeBtnSize = 40;
    const closeBtnX = modalX + modalWidth - closeBtnSize - 10;
    const closeBtnY = modalY + 10;
    drawRoundedRect(closeBtnX, closeBtnY, closeBtnSize, closeBtnSize, 8, '#ff3366', '#ffffff', 2);

    // Draw X
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(closeBtnX + 12, closeBtnY + 12);
    ctx.lineTo(closeBtnX + closeBtnSize - 12, closeBtnY + closeBtnSize - 12);
    ctx.moveTo(closeBtnX + 12, closeBtnY + closeBtnSize - 12);
    ctx.lineTo(closeBtnX + closeBtnSize - 12, closeBtnY + 12);
    ctx.stroke();

    // Draw pay table content
    const contentX = modalX + 50;
    const contentY = modalY + 80;
    const symbolWidth = 60;
    const rowHeight = 70;
    const colWidth = 200;    // Use the loaded symbols array from the global scope instead of trying to read from THEMES
    // The global 'symbols' array already contains the loaded images and other properties

    // Draw columns headers
    drawText('Symbol', contentX + symbolWidth / 2, contentY, 'bold 18px Arial', '#ffcc00', 'center', 'middle');
    drawText('3 of a kind', contentX + colWidth, contentY, 'bold 18px Arial', '#ffcc00', 'center', 'middle');
    drawText('4 of a kind', contentX + colWidth * 2, contentY, 'bold 18px Arial', '#ffcc00', 'center', 'middle');
    drawText('5 of a kind', contentX + colWidth * 3, contentY, 'bold 18px Arial', '#ffcc00', 'center', 'middle');    // Draw divider line
    ctx.strokeStyle = '#ffcc00';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(contentX, contentY + 20);
    ctx.lineTo(contentX + colWidth * 3.5, contentY + 20);
    ctx.stroke();    // Draw symbols and payouts - increase vertical offset from header for better spacing
    let currentY = contentY + 60; // Increased from 40 to 60 to add more space after header

    // Get the current theme's configuration
    const currentTheme = THEMES[currentThemeName];
    if (!currentTheme || !currentTheme.config) {
        console.error("Cannot display paytable: theme or theme config is missing");
        return;
    }

    // Get PAYLINES from the theme's config
    const PAYLINES = currentTheme.config.PAYLINES || [];
    const PAYOUT_RULES = currentTheme.config.PAYOUT_RULES || {};
    const symbolNumberMultipliers = currentTheme.config.symbolNumberMultipliers || {};

    // First draw info about paylines
    drawText('Active Paylines: ' + PAYLINES.length, contentX, modalY + modalHeight - 60, 'bold 18px Arial', '#ffffff', 'left', 'middle');
    // Calculate bet per line (total bet divided by number of paylines)
    const betPerLine = PAYLINES.length > 0 ? (betAmount / PAYLINES.length).toFixed(2) : betAmount;
    drawText('Bet per Line: ' + betPerLine, contentX, modalY + modalHeight - 30, 'bold 18px Arial', '#ffffff', 'left', 'middle');

    // Draw payline illustrations in a grid at the bottom
    const paylineGridX = contentX + colWidth * 2;
    const paylineGridY = modalY + modalHeight - 100;
    drawText('Paylines:', paylineGridX, paylineGridY, 'bold 18px Arial', '#ffffff', 'left', 'middle');

    // Draw each symbol and its payouts
    if (symbols.length > 0) {
        for (let i = 0; i < symbols.length; i++) {
            const symbol = symbols[i];
            if (i >= 8) break; // Maximum 8 symbols to display            // Draw symbol - first try sprite sheet, then fallback to individual image
            let symbolDrawn = false;

            // First try to draw from sprite sheet if loaded
            if (svgLoaded && symbol.name) {
                // Draw background for transparent symbols only if backgroundColor is defined
                if (symbol.backgroundColor) {
                    ctx.fillStyle = symbol.backgroundColor;
                    ctx.fillRect(contentX - symbolWidth / 2, currentY - symbolWidth / 2, symbolWidth, symbolWidth);
                }

                // Try to draw from SVG sprite map
                symbolDrawn = drawSymbol(symbol.name, ctx, contentX - symbolWidth / 2, currentY - symbolWidth / 2, symbolWidth, symbolWidth);
            }

            // If sprite drawing failed, fall back to individual image
            if (!symbolDrawn) {
                if (symbol.image && symbol.image.complete && symbol.image.naturalHeight !== 0) {
                    // If using separate PNG with transparency, first draw background only if backgroundColor is defined
                    if (symbol.imagePath && symbol.backgroundColor) {
                        ctx.fillStyle = symbol.backgroundColor;
                        ctx.fillRect(contentX - symbolWidth / 2, currentY - symbolWidth / 2, symbolWidth, symbolWidth);
                    }
                    ctx.drawImage(symbol.image, contentX - symbolWidth / 2, currentY - symbolWidth / 2, symbolWidth, symbolWidth);
                } else {
                    // Placeholder if no image available - use backgroundColor if available, otherwise fallback to color or default
                    if (symbol.backgroundColor) {
                        ctx.fillStyle = symbol.backgroundColor;
                    } else if (symbol.color) {
                        ctx.fillStyle = symbol.color;
                    } else {
                        ctx.fillStyle = '#888888';
                    }
                    ctx.fillRect(contentX - symbolWidth / 2, currentY - symbolWidth / 2, symbolWidth, symbolWidth);
                    ctx.fillStyle = '#ffffff';
                    ctx.font = '16px Arial';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(symbol.name ? symbol.name.substring(0, 1) : '?', contentX, currentY);
                }
            }            // Draw payouts (3, 4, 5 of a kind) - Get multipliers from theme config
            // Find the symbol index in the current theme
            const symbolIndex = i; // Symbol index matches the loop counter
            const baseMultiplier = symbolNumberMultipliers[symbolIndex] || 0;

            // Calculate final multipliers for 3, 4, and 5 matches
            const multiplier3 = typeof baseMultiplier === 'object' ? (baseMultiplier[3] || 0) : (baseMultiplier * (PAYOUT_RULES[3] || 0));
            const multiplier4 = typeof baseMultiplier === 'object' ? (baseMultiplier[4] || 0) : (baseMultiplier * (PAYOUT_RULES[4] || 0));
            const multiplier5 = typeof baseMultiplier === 'object' ? (baseMultiplier[5] || 0) : (baseMultiplier * (PAYOUT_RULES[5] || 0));

            // Display the calculated multiplier values
            drawText(multiplier3 + 'x', contentX + colWidth, currentY, 'bold 18px Arial', '#ffffff', 'center', 'middle');
            drawText(multiplier4 + 'x', contentX + colWidth * 2, currentY, 'bold 18px Arial', '#ffffff', 'center', 'middle');
            drawText(multiplier5 + 'x', contentX + colWidth * 3, currentY, 'bold 18px Arial', '#ffffff', 'center', 'middle');

            currentY += rowHeight;
        }
    }
}

// Define a simple data structure to store game history
const gameHistory = [];
const MAX_HISTORY_ENTRIES = 50;

// Function to add a spin result to history
function addSpinToHistory(result) {
    // Create a history entry with timestamp, bet amount, win amount, and symbols
    const historyEntry = {
        timestamp: new Date().toLocaleTimeString(),
        totalBet: betAmount,  // Use the global betAmount directly
        winAmount: result.totalWin,
        symbols: JSON.parse(JSON.stringify(result.reels)),
        winningLines: result.winningLines ? result.winningLines.length : 0
    };

    // Add to the beginning of the array
    gameHistory.unshift(historyEntry);

    // Keep array at max size
    if (gameHistory.length > MAX_HISTORY_ENTRIES) {
        gameHistory.pop();
    }
}

// Draw the History modal
function drawHistoryModal() {
    if (!showHistory) return;

    // Draw semi-transparent overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw modal content container
    const modalWidth = 800;
    const modalHeight = 600;
    const modalX = canvas.width / 2 - modalWidth / 2;
    const modalY = canvas.height / 2 - modalHeight / 2;

    // Draw modal background
    drawRoundedRect(modalX, modalY, modalWidth, modalHeight, 15,
        'rgba(40, 40, 60, 0.95)', '#ffcc00', 3);

    // Draw title
    drawText('GAME HISTORY', canvas.width / 2, modalY + 40, 'bold 28px Arial', '#ffffff', 'center', 'middle');

    // Draw close button
    const closeBtnSize = 40;
    const closeBtnX = modalX + modalWidth - closeBtnSize - 10;
    const closeBtnY = modalY + 10;
    drawRoundedRect(closeBtnX, closeBtnY, closeBtnSize, closeBtnSize, 8, '#ff3366', '#ffffff', 2);

    // Draw X
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(closeBtnX + 12, closeBtnY + 12);
    ctx.lineTo(closeBtnX + closeBtnSize - 12, closeBtnY + closeBtnSize - 12);
    ctx.moveTo(closeBtnX + 12, closeBtnY + closeBtnSize - 12);
    ctx.lineTo(closeBtnX + closeBtnSize - 12, closeBtnY + 12);
    ctx.stroke();

    // Draw history table header
    const contentX = modalX + 30;
    const contentY = modalY + 80;
    const rowHeight = 40;

    ctx.font = 'bold 16px Arial';
    ctx.fillStyle = '#ffcc00';
    ctx.textAlign = 'left';
    ctx.fillText('Time', contentX, contentY);
    ctx.fillText('Bet', contentX + 150, contentY);
    ctx.fillText('Win', contentX + 250, contentY);
    ctx.fillText('Paylines Hit', contentX + 350, contentY);
    ctx.fillText('Return %', contentX + 500, contentY);

    // Draw divider line
    ctx.strokeStyle = '#ffcc00';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(contentX, contentY + 20);
    ctx.lineTo(contentX + 700, contentY + 20);
    ctx.stroke();    // Draw history entries
    let currentY = contentY + 60;

    if (gameHistory.length === 0) {
        drawText('No game history available', contentX + modalWidth / 2 - 100, currentY + 50, '20px Arial', '#ffffff', 'left', 'middle');
    } else {
        const entriesPerPage = 10;
        const startIndex = historyCurrentPage * entriesPerPage;
        const endIndex = Math.min(startIndex + entriesPerPage, gameHistory.length);
        const totalPages = Math.ceil(gameHistory.length / entriesPerPage);

        for (let i = startIndex; i < endIndex; i++) {
            const entry = gameHistory[i];
            const winPercentage = entry.totalBet > 0 ? Math.round((entry.winAmount / entry.totalBet) * 100) : 0;
            const color = entry.winAmount > 0 ? '#4caf50' : '#ffffff';

            ctx.font = '16px Arial';
            ctx.fillStyle = '#ffffff';
            ctx.textAlign = 'left';            // Convert stored timestamp to readable date - fixing the invalid date issue
            const date = new Date(parseInt(entry.time));
            ctx.fillText(entry.timestamp || date.toLocaleTimeString(), contentX, currentY);
            ctx.fillText(entry.totalBet, contentX + 150, currentY);            // Use green text for wins
            ctx.fillStyle = color;
            ctx.fillText(Math.round(entry.winAmount), contentX + 250, currentY);
            ctx.fillText(entry.count || 0, contentX + 350, currentY);
            ctx.fillText(winPercentage + '%', contentX + 500, currentY);

            currentY += rowHeight;
        }

        // Draw pagination controls
        currentY = modalY + modalHeight - 100;

        // Page indicator
        ctx.font = '16px Arial';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.fillText(`Page ${historyCurrentPage + 1} of ${totalPages}`, contentX + 350, currentY);

        // Previous page button
        const prevBtnX = contentX + 250;
        const nextBtnX = contentX + 450;
        const pageBtnY = currentY - 5;
        const pageBtnWidth = 80;
        const pageBtnHeight = 30;

        // Only draw Previous button if not on first page
        if (historyCurrentPage > 0) {
            ctx.fillStyle = '#444444';
            ctx.fillRect(prevBtnX, pageBtnY, pageBtnWidth, pageBtnHeight);
            ctx.strokeStyle = '#888888';
            ctx.lineWidth = 2;
            ctx.strokeRect(prevBtnX, pageBtnY, pageBtnWidth, pageBtnHeight);

            ctx.fillStyle = '#ffffff';
            ctx.textAlign = 'center';
            ctx.fillText('< Prev', prevBtnX + pageBtnWidth / 2, pageBtnY + pageBtnHeight / 2 + 6);
        }

        // Only draw Next button if not on last page
        if (historyCurrentPage < totalPages - 1) {
            ctx.fillStyle = '#444444';
            ctx.fillRect(nextBtnX, pageBtnY, pageBtnWidth, pageBtnHeight);
            ctx.strokeStyle = '#888888';
            ctx.lineWidth = 2;
            ctx.strokeRect(nextBtnX, pageBtnY, pageBtnWidth, pageBtnHeight);

            ctx.fillStyle = '#ffffff';
            ctx.textAlign = 'center';
            ctx.fillText('Next >', nextBtnX + pageBtnWidth / 2, pageBtnY + pageBtnHeight / 2 + 6);
        }
    }

    // Draw stats at the bottom
    let totalBet = 0;
    let totalWin = 0;
    gameHistory.forEach(entry => {
        totalBet += entry.totalBet;
        totalWin += entry.winAmount;
    });

    const overallReturn = totalBet > 0 ? (totalWin / totalBet) * 100 : 0;

    ctx.font = 'bold 18px Arial';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'left';
    ctx.fillText(`Session Summary: Spins: ${gameHistory.length}`, contentX, modalY + modalHeight - 60);
    ctx.fillText(`Total Bet: ${totalBet}  Total Win: ${totalWin}  Return: ${overallReturn.toFixed(2)}%`, contentX, modalY + modalHeight - 30);
}

// (changeTheme / setupThemeSwitcher lived here — removed: the portal opens one game per
// theme, so nothing may switch themes inside a running round.)

// --- History ---
// ... (addToHistory function remains the same) ...
function addToHistory(isWin, details, count, amount) {
    return;
    if (!historyElement) return; // Don't run if element missing

    const item = document.createElement('div');
    item.className = `history-item ${isWin ? 'win' : 'loss'}`;
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }); // Add seconds

    let displayDetails = details;
    if (!isWin && details.startsWith("Middle:")) {
        try {
            // Example details: "Middle: 4, 1, 0, 2, 4"
            const numbers = details.substring("Middle: ".length).split(',').map(s => parseInt(s.trim(), 10));
            displayDetails = "Middle: " + numbers.map(num => symbols[num]?.name || `Num ${num}?`).join(', ');
        } catch (e) {
            console.error("Error parsing history details:", e);
            displayDetails = details; // Fallback to raw numbers
        }
    }


    if (isWin) {
        item.innerHTML = `
            <span class="timestamp">${timestamp}</span>
            <strong>WIN: ${amount.toLocaleString()}</strong> (Bet: ${betAmount})<br>
            <span class="details">${count}x ${displayDetails}</span>
        `;
    } else {
        item.innerHTML = `
             <span class="timestamp">${timestamp}</span>
             <span>No Win</span> (Bet: ${betAmount})<br>
             <span class="details">${displayDetails}</span> <!-- Shows symbol names on loss -->
        `;
    }

    historyElement.prepend(item); // Add to top
    // ... (limit history items, store in spinHistory array) ...    spinHistory.unshift({ isWin, details: displayDetails, count, betAmount, winAmount: amount, time: new Date().getTime(), theme: currentThemeName });
    if (spinHistory.length > 100) spinHistory.pop();
}

// --- Mute Toggle ---
function toggleMute() {
    muteState = !muteState;
    soundEnabled = !muteState;

    // If muting, stop any currently playing background music
    if (muteState && backgroundMusicSource) {
        stopBackgroundMusic();
    }
    // If unmuting and user has already interacted, restart background music
    else if (!muteState && hasUserInteraction && currentThemeSounds.backgroundLoaded) {
        playBackgroundMusic(currentThemeSounds.theme);
    }

    console.log(`Sound ${muteState ? 'muted' : 'unmuted'}`);
}


// Draw theme-specific epic win animation
function drawEpicWinAnimation(elapsedTime, deltaTime) {
    if (!isPlayingEpicWinAnimation) return;

    // Get the current theme
    const currentTheme = THEMES[currentThemeName];
    if (!currentTheme || !currentTheme.visualEffects) {
        console.error("Cannot draw epic win animation: Theme effects not found");
        return;
    }

    // Get the animation duration from the theme configuration
    const animDuration = currentTheme?.visualEffects?.themeSpecific?.epicWinAnimation?.duration || 6000;    // Pass the win amount to the custom renderer or use animation duration in the fallback
    if (typeof currentTheme.renderEpicWinAnimation === 'function') {
        // Use the stored win amount instead of animation duration
        currentTheme.renderEpicWinAnimation(ctx, canvas, elapsedTime, deltaTime, window.currentWinAmount || 0);
    } else {
        drawGenericEpicWinAnimation(elapsedTime, deltaTime, animDuration);
    }
}

// Generic epic win animation as a fallback
function drawGenericEpicWinAnimation(elapsedTime, deltaTime, duration) {
    const progress = Math.min(elapsedTime / duration, 1.0);

    // Central explosion effect
    const maxRadius = Math.min(canvas.width, canvas.height) * 0.8;
    const radius = maxRadius * progress;

    // Pulse effect
    const pulseIntensity = Math.sin(elapsedTime / 200) * 0.3 + 0.7;

    // Create a radial gradient for the explosion
    const gradient = ctx.createRadialGradient(
        canvas.width / 2, canvas.height / 2, 0,
        canvas.width / 2, canvas.height / 2, radius
    );

    gradient.addColorStop(0, `rgba(255, 215, 0, ${0.8 * pulseIntensity})`);
    gradient.addColorStop(0.7, `rgba(255, 165, 0, ${0.5 * pulseIntensity})`);
    gradient.addColorStop(1, 'rgba(255, 69, 0, 0)');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw "EPIC WIN" text with growing/pulsing effect
    const textSize = 60 * (0.5 + progress * 0.5) * pulseIntensity;

    ctx.save();
    ctx.font = `bold ${textSize}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Text glow effect
    ctx.shadowColor = 'rgba(255, 215, 0, 0.8)';
    ctx.shadowBlur = 20 * pulseIntensity;

    // Draw text with outline
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#ff9900';
    ctx.lineWidth = 3;
    ctx.fillText('EPIC WIN!', canvas.width / 2, canvas.height / 2);
    ctx.strokeText('EPIC WIN!', canvas.width / 2, canvas.height / 2);
    ctx.restore();
}

// --- Reel Effects Implementation ---
function applyReelEffects(ctx, reel, timestamp) {
    // Get the current theme
    const themeKey = currentThemeName.toLowerCase().replace(/\s+/g, '');
    const currentTheme = THEMES[currentThemeName];

    // Check if effects are available and enabled for this theme
    if (!currentTheme || !currentTheme.visualEffects || !currentTheme.visualEffects.reelEffects || !currentTheme.visualEffects.reelEffects.enabled) {
        console.log('reel effects not found')
        return; // No effects to apply
    }

    const effects = currentTheme.visualEffects.reelEffects;
    const intensity = currentTheme.intensity || 0.7; // Default intensity if not specified

    // Only apply effects while the reel is spinning
    if (!reel.spinning) return;

    // Save the canvas state before applying effects
    ctx.save();

    // Apply motion blur if enabled
    if (effects.blurAmount > 0) {
        const blurAmount = effects.blurAmount * intensity * (reel.velocity / REEL_SPIN_SPEED_FACTOR);
        ctx.filter = `blur(${blurAmount}px)`;
    }    // Apply spinning glow if enabled
    if (effects.spinningGlow) {
        // Calculate the position for the glow effect - we need to compute these values
        const reelWidth = SYMBOL_SIZE;
        const reelHeight = VISIBLE_ROWS * SYMBOL_SIZE;
        const reelSpacing = (canvas.width - (reelWidth * REEL_COUNT)) / (REEL_COUNT + 1);
        const startX = reelSpacing;
        const startY = 100; // Top Y of the reel viewport in drawReels

        // Get the correct X position for this reel
        const reelIndex = reels.indexOf(reel);
        if (reelIndex === -1) return; // Safety check
        const reelX = startX + reelIndex * (reelWidth + reelSpacing);

        // Create a radial gradient for the glow effect
        const gradient = ctx.createRadialGradient(
            reelX + reelWidth / 2, startY + reelHeight / 2, 0,
            reelX + reelWidth / 2, startY + reelHeight / 2, reelWidth
        );

        // Set the gradient colors
        const spinColor = effects.spinColor || '#3498db';
        gradient.addColorStop(0, `${spinColor}22`); // Semi-transparent
        gradient.addColorStop(1, 'transparent');

        // Draw the glow effect
        ctx.fillStyle = gradient;
        ctx.fillRect(reelX, startY, reelWidth, reelHeight);
    }

    // Apply light trails if enabled
    if (effects.lightTrails) {
        // For each visible symbol in the reel
        for (let i = 0; i < VISIBLE_ROWS + 1; i++) {
            const symbolIndex = Math.floor((reel.position + i) % reel.symbols.length);
            const symbol = reel.symbols[symbolIndex];
            if (!symbol) continue;

            const y = reel.y + (i * SYMBOL_SIZE) - (reel.position % 1) * SYMBOL_SIZE;

            // Skip if the symbol is outside the visible area
            if (y < reel.y - SYMBOL_SIZE || y > reel.y + (VISIBLE_ROWS * SYMBOL_SIZE)) continue;

            // Create a trail behind the symbol based on velocity
            const trailLength = reel.velocity / 10 * intensity;
            if (trailLength > 0.1) { // Only draw if there's a noticeable trail
                ctx.globalAlpha = 0.3 * intensity;
                ctx.fillStyle = effects.spinColor || '#3498db';

                // Draw trail as a rectangle with gradient
                const gradient = ctx.createLinearGradient(0, y, 0, y - trailLength * SYMBOL_SIZE);
                gradient.addColorStop(0, `${effects.spinColor || '#3498db'}88`);
                gradient.addColorStop(1, 'transparent');
                ctx.fillStyle = gradient;
                ctx.fillRect(reel.x, y - trailLength * SYMBOL_SIZE, SYMBOL_SIZE, trailLength * SYMBOL_SIZE);
            }
        }
    }

    // Restore the canvas state after applying effects
    ctx.restore();
}

// --- Win Effects Implementation (Corrected) ---
function applyWinEffects(ctx, winningLine, timestamp) {
    const currentTheme = THEMES[currentThemeName];

    // Check if effects are available and enabled
    if (!currentTheme?.visualEffects?.winEffects?.enabled) {
        return; // No effects to apply
    }

    const effects = currentTheme.visualEffects.winEffects;
    const intensity = currentTheme.visualEffects.intensity || 0.7;
    const positions = winningLine.positions; // Use positions array

    if (!positions || positions.length === 0) return;    // Constants needed for coordinate calculation (match drawReels/drawWinLines)
    const reelWidth = SYMBOL_SIZE;

    // Get the current theme's layout configuration
    const themeLayout = THEMES[currentThemeName]?.layout;

    // Get the desired spacing from theme, or use a default value
    const desiredSpacing = themeLayout?.reelSpacing || 10; // Default to 10px if not specified

    // Calculate total space needed for all reels
    const totalReelWidth = reelWidth * REEL_COUNT;

    // Calculate total space available for spacing
    const totalAvailableForSpacing = canvas.width - totalReelWidth;

    // Ensure we have at least minimal spacing between reels
    const minSpacingNeeded = REEL_COUNT - 1; // Spacing only needed between reels

    let actualSpacing;
    if (totalAvailableForSpacing >= desiredSpacing * minSpacingNeeded) {
        // We can use the desired spacing
        actualSpacing = desiredSpacing;
    } else {
        // Not enough space for desired spacing, calculate maximum possible
        actualSpacing = totalAvailableForSpacing / minSpacingNeeded;
    }

    // Center the entire reel area
    const startX = (canvas.width - (totalReelWidth + actualSpacing * (REEL_COUNT - 1))) / 2;
    const startY = 100;

    if (effects.rotateEffect?.enabled) {
        // Initialize timestamp on the line data if it's the first time
        if (!winningLine.rotateAnimationStartTime) {
            winningLine.rotateAnimationStartTime = timestamp;
        }

        const elapsedTime = timestamp - (winningLine.rotateAnimationStartTime || timestamp); // Ensure startTime exists
        const duration = effects.rotateEffect.duration || 1500;
        const progress = Math.min(elapsedTime / duration, 1.0); // Ensure progress doesn't exceed 1

        if (elapsedTime <= duration) {
            const rotations = effects.rotateEffect.rotations || 2;
            let easedProgress = progress; // Default to linear

            // --- Easing Functions (keep as is) ---
            if (effects.rotateEffect.easing === 'easeOutElastic') {
                const c4 = (2 * Math.PI) / 3;
                easedProgress = progress === 0 ? 0 : progress === 1 ? 1 :
                    Math.pow(2, -10 * progress) * Math.sin((progress * 10 - 0.75) * c4) + 1;
            } else if (effects.rotateEffect.easing === 'easeOutBounce') {
                const n1 = 7.5625; const d1 = 2.75;
                if (progress < 1 / d1) { easedProgress = n1 * progress * progress; }
                else if (progress < 2 / d1) { easedProgress = n1 * (progress -= 1.5 / d1) * progress + 0.75; }
                else if (progress < 2.5 / d1) { easedProgress = n1 * (progress -= 2.25 / d1) * progress + 0.9375; }
                else { easedProgress = n1 * (progress -= 2.625 / d1) * progress + 0.984375; }
            } else if (effects.rotateEffect.easing === 'easeOutQuad') {
                easedProgress = 1 - (1 - progress) * (1 - progress);
            } else if (effects.rotateEffect.easing === 'easeOutCubic') {
                easedProgress = 1 - Math.pow(1 - progress, 3);
            }
            // --- End Easing ---

            const directionFactor = effects.rotateEffect.direction === 'counterclockwise' ? -1 : 1;
            const angle = Math.PI * 2 * rotations * easedProgress * directionFactor;

            positions.forEach(pos => {
                const symbolX = startX + pos.reel * (reelWidth + actualSpacing);
                const symbolY = startY + pos.row * SYMBOL_SIZE;
                const centerX = symbolX + SYMBOL_SIZE / 2;
                const centerY = symbolY + SYMBOL_SIZE / 2;

                ctx.save();
                ctx.translate(centerX, centerY); // Move origin to symbol center
                ctx.rotate(angle);              // Rotate
                ctx.translate(-centerX, -centerY); // Move origin back                // Get the actual symbol data for this position
                const symbolData = symbols[winningLine.symbolIndex];
                if (!symbolData) {
                    console.warn(`rotateEffect: No symbolData found for index ${winningLine.symbolIndex}`);
                    return; // Skip if no valid symbol data
                }

                // Draw the symbol content (sprite or image) WITHOUT background fill
                let drawnFromSprite = false;
                if (svgLoaded && svgSymbolSheet && symbolData.name && SYMBOL_MAPS[themeKey]?.[symbolData.name.toLowerCase()]) {
                    // Use drawSymbol function which draws ONLY the sprite portion
                    drawnFromSprite = drawSymbol(symbolData.name, ctx, symbolX, symbolY, SYMBOL_SIZE, SYMBOL_SIZE);
                    if (!drawnFromSprite) {
                        console.warn(`rotateEffect: drawSymbol failed for ${symbolData.name}`);
                    }
                }

                // Fallback if not drawn from sprite (e.g., PNG image)
                if (!drawnFromSprite) {
                    if (symbolData.image && symbolData.image.complete && symbolData.image.naturalHeight !== 0) {
                        // Draw the image directly. Assumes image has transparency if needed.
                        ctx.drawImage(symbolData.image, symbolX, symbolY, SYMBOL_SIZE, SYMBOL_SIZE);
                    } else {
                        // Last resort fallback: Draw a character representation (optional)
                        // This will rotate the character within the static background square
                        ctx.fillStyle = '#000'; // Contrasting color
                        ctx.font = 'bold 24px Arial';
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        ctx.fillText(symbolData.name ? symbolData.name.substring(0, 1) : '?', centerX, centerY); // Draw at center
                    }
                }

                ctx.restore();
            });
        } else if (progress >= 1.0) { // Check if animation just finished
            // Reset animation start time once it completes fully
            // This ensures the symbol snaps back to non-rotated state if drawWinLines stops being called
            delete winningLine.rotateAnimationStartTime;

            // Explicitly redraw the symbol in its non-rotated state ONE last time
            // This prevents it getting stuck mid-rotation if win lines disappear
            positions.forEach(pos => {
                const symbolX = startX + pos.reel * (reelWidth + actualSpacing);
                const symbolY = startY + pos.row * SYMBOL_SIZE;
                const symbolData = symbols[winningLine.symbolIndex];
                if (!symbolData) return;

                // Draw background
                ctx.fillStyle = symbolData.backgroundColor || symbolData.color || '#cccccc';
                ctx.fillRect(symbolX, symbolY, SYMBOL_SIZE, SYMBOL_SIZE); // Draw background first

                // Draw content (non-rotated)
                let drawnFromSprite = false;
                if (svgLoaded && svgSymbolSheet && symbolData.name && SYMBOL_MAPS[themeKey]?.[symbolData.name.toLowerCase()]) {
                    drawnFromSprite = drawSymbol(symbolData.name, ctx, symbolX, symbolY, SYMBOL_SIZE, SYMBOL_SIZE);
                }
                if (!drawnFromSprite) {
                    if (symbolData.image && symbolData.image.complete && symbolData.image.naturalHeight !== 0) {
                        ctx.drawImage(symbolData.image, symbolX, symbolY, SYMBOL_SIZE, SYMBOL_SIZE);
                    } else {
                        // Last resort fallback: Draw a character representation (optional)
                        // This will rotate the character within the static background square
                        ctx.fillStyle = '#000'; // Contrasting color
                        ctx.font = 'bold 24px Arial';
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        ctx.fillText(symbolData.name ? symbolData.name.substring(0, 1) : '?', symbolX + SYMBOL_SIZE / 2, symbolY + SYMBOL_SIZE / 2);
                    }
                }
            });
        }
    }

    // Apply flashing effect to winning symbols
    if (effects.flashingSymbols) {
        const flashIntensity = 0.6 * intensity; // Slightly less intense flash
        const flashRate = 400; // ms cycle time
        const flashOpacity = Math.abs(Math.sin(timestamp / flashRate * Math.PI)) * flashIntensity; // Use PI for full 0-1-0 cycle

        ctx.save();
        ctx.fillStyle = `rgba(255, 255, 255, ${flashOpacity})`; positions.forEach(pos => {
            // Calculate correct top-left position
            const symbolX = startX + pos.reel * (reelWidth + actualSpacing);
            const symbolY = startY + pos.row * SYMBOL_SIZE;
            ctx.fillRect(symbolX, symbolY, SYMBOL_SIZE, SYMBOL_SIZE);
        });
        ctx.restore();
    }

    // Apply 3D spin effect on win
    if (effects.spinEffect3d?.enabled) {
        // Initialize timestamp on the line data if it's the first time
        if (!winningLine.animationStartTime) {
            winningLine.animationStartTime = timestamp;
        }

        const elapsedTime = timestamp - winningLine.animationStartTime;
        const duration = effects.spinEffect3d.duration || 1000;

        if (elapsedTime <= duration) {
            const progress = elapsedTime / duration;
            const rotations = effects.spinEffect3d.rotations || 1;
            let easedProgress = progress;

            // Example easing (can use a library or more functions)
            if (effects.spinEffect3d.easing === 'easeOutBack') {
                const c1 = 1.70158;
                const c3 = c1 + 1;
                easedProgress = 1 + c3 * Math.pow(progress - 1, 3) + c1 * Math.pow(progress - 1, 2);
            } else if (effects.spinEffect3d.easing === 'easeOutQuad') {
                easedProgress = 1 - (1 - progress) * (1 - progress);
            } // Add more easing functions as needed

            const angle = Math.PI * 2 * rotations * easedProgress;
            const scaleX = Math.cos(angle); // Creates the shrinking/expanding effect

            positions.forEach(pos => {
                const symbolX = startX + pos.reel * (reelWidth + actualSpacing);
                const symbolY = startY + pos.row * SYMBOL_SIZE;
                const centerX = symbolX + SYMBOL_SIZE / 2;
                const centerY = symbolY + SYMBOL_SIZE / 2;

                ctx.save();
                ctx.translate(centerX, centerY);
                ctx.scale(scaleX, 1); // Apply scaling on X-axis for 3D flip illusion
                ctx.translate(-centerX, -centerY); // Translate back

                // Draw the symbol again (or a placeholder during flip?)
                // Getting the actual symbol requires accessing 'symbols[winningLine.symbolIndex]'
                const symbolData = symbols[winningLine.symbolIndex];
                if (symbolData) {
                    // Draw the symbol image or placeholder (copied logic from drawReels/drawPaytable)
                    let drawnFromSprite = false;
                    if (svgLoaded && symbolData.name) {
                        ctx.fillStyle = symbolData.backgroundColor || symbolData.color || '#cccccc';
                        ctx.fillRect(symbolX, symbolY, SYMBOL_SIZE, SYMBOL_SIZE); // Draw background first
                        drawnFromSprite = drawSymbol(symbolData.name, ctx, symbolX, symbolY, SYMBOL_SIZE, SYMBOL_SIZE);
                        if (!drawnFromSprite) {
                            console.warn(`spinEffect3d: drawSymbol failed for ${symbolData.name}`);
                        }
                    }

                    // Fallback if not drawn from sprite (e.g., PNG image)
                    if (!drawnFromSprite) {
                        if (symbolData.image && symbolData.image.complete && symbolData.image.naturalHeight !== 0) {
                            ctx.drawImage(symbolData.image, symbolX, symbolY, SYMBOL_SIZE, SYMBOL_SIZE);
                        } else {
                            // Last resort fallback: Draw a character representation (optional)
                            // This will rotate the character within the static background square
                            ctx.fillStyle = '#000'; // Contrasting color
                            ctx.font = 'bold 24px Arial';
                            ctx.textAlign = 'center';
                            ctx.textBaseline = 'middle';
                            ctx.fillText(symbolData.name ? symbolData.name.substring(0, 1) : '?', centerX, centerY); // Draw at center
                        }
                    }
                } else {
                    // Fallback: just draw a simple rect if symbolData is missing
                    ctx.fillStyle = `rgba(255, 255, 255, ${0.5 * Math.abs(1 - scaleX)})`;
                    ctx.fillRect(symbolX, symbolY, SYMBOL_SIZE, SYMBOL_SIZE);
                }

                ctx.restore();
            });
        } else if (progress >= 1.0) { // Check if animation just finished
            // Reset animation start time once it completes fully
            // This ensures the symbol snaps back to non-rotated state if drawWinLines stops being called
            delete winningLine.animationStartTime;
        }
    }

    // Apply explosion effect
    if (effects.explosions) {        // Initialize particles ONCE per winning line reveal
        if (!winningLine.explosions) {
            winningLine.explosions = [];
            winningLine.explosionsActive = true; // Flag to control particle updates

            positions.forEach(pos => {
                const centerX = startX + pos.reel * (reelWidth + actualSpacing) + SYMBOL_SIZE / 2;
                const centerY = startY + pos.row * SYMBOL_SIZE + SYMBOL_SIZE / 2;
                const particleCount = Math.floor(15 * intensity); // More particles

                for (let i = 0; i < particleCount; i++) {
                    const angle = Math.random() * Math.PI * 2;
                    const speed = Math.random() * 8 * intensity + 2;
                    winningLine.explosions.push({
                        x: centerX, y: centerY,
                        vx: Math.cos(angle) * speed,
                        vy: Math.sin(angle) * speed,
                        size: Math.random() * 5 * intensity + 2, // Smaller particles
                        color: `hsl(${Math.random() * 60 + 20}, 100%, ${Math.random() * 30 + 50}%)`, // Yellow/Orange/Red sparks
                        life: 1.0, // Start with full life
                        gravity: 0.1 // Slight downward pull
                    });
                }
            });
        }
    }

    // Animate existing particles if the effect is active
    if (winningLine.explosionsActive && winningLine.explosions.length > 0) {
        ctx.save();
        let activeParticles = false;
        for (let i = winningLine.explosions.length - 1; i >= 0; i--) {
            const p = winningLine.explosions[i];
            p.x += p.vx;
            p.y += p.vy;
            p.vy += p.gravity; // Apply gravity
            p.life -= 0.025; // Fade rate
            p.vx *= 0.98; // Air resistance
            p.vy *= 0.98;

            if (p.life <= 0) {
                winningLine.explosions.splice(i, 1);
            } else {
                activeParticles = true;
                ctx.globalAlpha = p.life;
                ctx.fillStyle = p.color;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2); // Size shrinks with life
                ctx.fill();
            }
        }
        ctx.restore();
        // Deactivate particle updates once all particles are gone
        if (!activeParticles) {
            winningLine.explosionsActive = false;
        }
    }


    // Apply shockwave effect
    if (effects.shockwave) {
        // Initialize ONCE per winning line reveal
        if (!winningLine.shockwaves) {
            winningLine.shockwaves = [];
            winningLine.shockwavesActive = true;

            positions.forEach(pos => {
                const centerX = startX + pos.reel * (reelWidth + actualSpacing) + SYMBOL_SIZE / 2;
                const centerY = startY + pos.row * SYMBOL_SIZE + SYMBOL_SIZE / 2;
                winningLine.shockwaves.push({
                    x: centerX, y: centerY,
                    radius: 0,
                    maxRadius: SYMBOL_SIZE * 1.2 * intensity, // Scale max radius with intensity
                    life: 1.0,
                    lineWidth: 4 // Initial line width
                });
            });
        }

        // Animate existing shockwaves if active
        if (winningLine.shockwavesActive && winningLine.shockwaves.length > 0) {
            ctx.save();
            let activeWaves = false;
            for (let i = winningLine.shockwaves.length - 1; i >= 0; i--) {
                const wave = winningLine.shockwaves[i];
                wave.radius += 3 * intensity; // Speed scales with intensity
                wave.life -= 0.03; // Fade rate
                wave.lineWidth = Math.max(1, 4 * wave.life); // Line width shrinks

                if (wave.life <= 0 || wave.radius >= wave.maxRadius) {
                    winningLine.shockwaves.splice(i, 1);
                } else {
                    activeWaves = true;
                    ctx.globalAlpha = wave.life * 0.7; // Apply fade
                    ctx.strokeStyle = `rgba(255, 255, 255, ${wave.life})`; // Fade color too
                    ctx.lineWidth = wave.lineWidth;
                    ctx.beginPath();
                    ctx.arc(wave.x, wave.y, wave.radius, 0, Math.PI * 2);
                    ctx.stroke();
                }
            }
            ctx.restore();
            if (!activeWaves) {
                winningLine.shockwavesActive = false;
            }
        }
    }
}

// Function to get and apply volume settings from the current theme
function getAndApplyThemeVolumeSettings(themeName) {
    // Default volume settings if none are specified in the theme
    const defaultSettings = {
        master: 1.0,
        background: 0.7,
        effects: 1.0
    };

    let volumeSettings = defaultSettings;

    // Try to get volume settings from the current theme
    const currentTheme = THEMES[themeName];
    if (currentTheme && currentTheme.audio && currentTheme.audio.volume) {
        // Use theme-specific volume settings
        volumeSettings = {
            master: currentTheme.audio.volume.master !== undefined ? currentTheme.audio.volume.master : defaultSettings.master,
            background: currentTheme.audio.volume.background !== undefined ? currentTheme.audio.volume.background : defaultSettings.background,
            effects: currentTheme.audio.volume.effects !== undefined ? currentTheme.audio.volume.effects : defaultSettings.effects
        };
        console.log(`Applied volume settings from theme ${themeName}:`, volumeSettings);
    } else {
        console.log(`No volume settings found for theme ${themeName}, using defaults:`, defaultSettings);
    }

    // Store the current volume settings
    themeVolumeSettings = volumeSettings;

    // Update gain node values if they exist
    updateVolumeGainNodes();

    return volumeSettings;
}

// Function to update gain nodes with current volume settings
function updateVolumeGainNodes() {
    if (!audioContext) return;

    // Apply master volume
    if (masterGainNode) {
        masterGainNode.gain.value = muteState ? 0 : themeVolumeSettings.master;
    }

    // Apply background music volume
    if (backgroundGainNode) {
        backgroundGainNode.gain.value = muteState ? 0 : themeVolumeSettings.master * themeVolumeSettings.background;
    }

    // Apply sound effects volume
    if (effectsGainNode) {
        effectsGainNode.gain.value = muteState ? 0 : themeVolumeSettings.master * themeVolumeSettings.effects;
    }
}

function onBonusGameComplete(bonusWin) {
    // Reset bonus game active flag
    bonusGameActive = false;

    // Clear bonus game state from localStorage
    localStorage.removeItem('bonusGameState');

    // When bonus game completes, add the win to balance
    if (bonusWin > 0) {
        balance += bonusWin;
        updateBalanceDisplay();
        playSound('win'); // Play win sound
    }

    // Optionally, trigger a bonus win animation or effect here
    triggerBonusWinAnimation(bonusWin);
}

