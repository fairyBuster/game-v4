# Slot Game

A customizable casino slot machine game with multiple themes, built using pure JavaScript, HTML5 Canvas, and Web Audio API.

Try it here: [Slot Game Demo](https://slots.compsmart.co.uk)


![Slot Game Screenshot](https://github.com/compsmart/simpleslots/raw/v11/screenshot.png)

## Features

- Multiple visual themes including Classic, Space Adventure, Ancient Egypt, Aztec, Fantasy Forest, and Gemstones
- 20 configurable paylines
- Customizable symbols, payouts, and visual effects
- Epic win animations with visual and sound effects
- Win amount display with glowing pulse effects
- Interactive UI with visual feedback
- Game history tracking
- Responsive design
- Theme-specific sound effects and background music
- Pay table and payline visualization

## Installation

### Option 1: Quick Start with a Web Server

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/slot-game.git
   cd slot-game
   ```

2. Start a local server. You can use any of these methods:

   Using Node.js:
   ```
   npx http-server
   ```

   Using Python:
   ```
   # Python 3
   python -m http.server
   
   # Python 2
   python -m SimpleHTTPServer
   ```

3. Open your browser and navigate to:
   ```
   http://localhost:8080
   ```

### Option 2: Direct File Access

1. Download the ZIP from GitHub
2. Extract all files
3. Open `index.html` in your browser
   - Note: Some browsers may restrict audio playback when running from a local file

## Configuration

The game is highly configurable through several JavaScript files in the `themes` directory.

### Theme Configuration

Each theme has its own configuration file (e.g., `space-adventure.js`, `classic.js`). You can:

1. Edit symbol images and payout rates
2. Customize visual effects
3. Change background animations
4. Modify sound effects

### Visual Effects Guide

The slot game includes a sophisticated visual effects system that can be customized for each theme. Below is a comprehensive guide to all available visual effects and how to configure them.

#### Master Effects Controls

```javascript
visualEffects: {
    enabled: true,       // Master switch for all effects
    intensity: 0.7,      // Overall intensity multiplier (0.0-1.0)
    
    // Individual effects configured below...
}
```

#### Neon Glow

Creates a glowing outline around symbols.

```javascript
neonGlow: {
    enabled: true,       // Enable/disable this effect
    color: '#00ffff',    // Glow color (hex)
    size: 10,            // Glow size in pixels
    pulseSpeed: 1000,    // Pulse cycle in milliseconds
    intensity: 0.8       // Specific effect intensity
}
```

#### Electric Edges

Generates electric arcs along the edges of symbols.

```javascript
electricEdges: {
    enabled: true,       // Enable/disable this effect
    color: '#ffffff',    // Color of the electric effect
    arcs: 5,             // Number of electric arcs
    speed: 800,          // Speed of movement in ms
    intensity: 0.7       // Specific effect intensity
}
```

#### Reel Mask

Controls the appearance of the reel borders and separators.

```javascript
reelMask: {
    enabled: true,             // Enable special effects for reel mask
    borderWidth: 5,            // Width of the border in pixels
    separatorWidth: 2,         // Width of separator lines
    
    // Glowing border effect
    glowEffect: {
        enabled: true,         // Enable glow around borders
        color: '#ffcc00',      // Base glow color
        intensity: 0.8,        // Glow intensity
        size: 10               // Glow size in pixels
    },
    
    // Pulsing opacity effect
    pulseEffect: {
        enabled: true,         // Enable pulsing effect
        speed: 1500,           // Pulse cycle in milliseconds
        minOpacity: 0.6,       // Minimum opacity during pulse
        maxOpacity: 1.0        // Maximum opacity during pulse
    },
    
    // Color transition effect
    colorTransition: {
        enabled: true,         // Enable color transition effect
        colors: ['#ffcc00', '#ff5500', '#ff00ff', '#00ffff', '#ffcc00'],
        speed: 5000,           // Full color cycle duration in ms
        mode: 'gradient'       // 'gradient' or 'solid'
    }
}
```

#### Background Effects

Controls the background appearance and animations.

```javascript
backgroundEffects: {
    enabled: true,           // Master switch for background effects
    
    // Background image
    backgroundImage: {
        enabled: true,       // Use a background image
        path: 'images/themename/background.jpg',
        opacity: 1.0         // Image opacity
    },
    
    // Floating particles
    particles: {
        enabled: true,       // Enable floating particles
        count: 50,           // Number of particles
        color: '#ffffff',    // Particle color
        size: { min: 2, max: 6 }, // Size range
        sparkle: false       // Add twinkling effect
    },
    
    // Background color pulsing
    pulse: {
        enabled: true,       // Enable pulsing background
        color: '#0a0a2a',    // Base color
        speed: 2000,         // Pulse cycle in ms
        intensity: 0.3       // How strong the pulse is
    }
}
```

#### Win Effects

Special effects that activate when a winning combination occurs.

```javascript
winEffects: {
    enabled: true,           // Master switch for win effects
    explosions: false,       // Explosive particle effects on wins
    shockwave: false,        // Shockwave effect around winning symbols
    flashingSymbols: true,   // Make winning symbols flash
    
    // 3D rotation effect
    spinEffect3d: {
        enabled: false,      // 3D rotation effect on win
        rotations: 1,        // Number of full rotations
        duration: 1000,      // Duration in ms
        easing: 'easeOutBack' // Easing function
    }
}
```

#### Reel Spinning Effects

Effects that appear during reel spinning.

```javascript
reelEffects: {
    enabled: true,           // Master switch for reel effects
    blurAmount: 5,           // Motion blur intensity
    lightTrails: false,      // Light trails behind symbols
    spinningGlow: true,      // Glow during spinning
    spinColor: '#3498db'     // Color during spin
}
```

#### Epic Win Animations

Special animations that play for big wins (typically 5 matching symbols).

```javascript
themeSpecific: {
    epicWinAnimation: {
        enabled: true,
        name: "Epic Win",
        duration: 8000,      // Animation duration in ms
        
        // Theme-specific options (vary by theme)
        goldenRain: true,    // Gold coins falling animation
        pyramidExplosion: true, // Example from Ancient Egypt theme
        shimmerEffect: true  // Example from Classic theme
        // Other options specific to each theme
    }
}
```

#### Effect Presets

The game includes several predefined effect configurations that can be used as a starting point:

- **Neon**: Bright, colorful effects with cyan glow
- **Retro**: Purple/pink effects with a classic arcade feel
- **Electric**: Energetic yellow effects with light trails
- **Subtle**: Soft blue effects with minimal intensity
- **None**: No visual effects (clean look)

To use a preset:

```javascript
visualEffects: {
    ...EffectPresets.neon,  // Import the preset
    // Override specific settings as needed
    intensity: 0.85,
    neonGlow: {
        enabled: false      // Disable specific effect
    }
}
```

### Payline Configuration

Paylines are defined in `themes/config.js`:

```javascript
export const PAYLINES = [
    // Line 1: Middle Horizontal
    [{ reel: 0, row: 1 }, { reel: 1, row: 1 }, { reel: 2, row: 1 }, { reel: 3, row: 1 }, { reel: 4, row: 1 }],
    // Additional paylines...
];
```

### Symbol Payout Rules

Symbol payouts are configured as multipliers in each theme file:

```javascript
export const symbolMultipliers = [
    5,   // Symbol 0
    10,  // Symbol 1
    15,  // Symbol 2
    20,  // Symbol 3
    50   // Symbol 4
];
```

### RTP (Return to Player) Adjustments

You can fine-tune the game's RTP by:

1. Modifying symbol frequencies on the reel strips
2. Adjusting symbol payout multipliers
3. Changing the number of active paylines

## How to Play

1. **Start the Game**: Open the game in your web browser.
2. **Adjust Your Bet**: Use the + and - buttons next to the bet display to increase or decrease your wager.
3. **Spin the Reels**: Click the "SPIN" button to play.
4. **View Paylines**: Toggle the "SHOW PAYLINES" button to see all possible winning combinations.
5. **View Pay Table**: Click the "PAY TABLE" button to see symbol payouts.
6. **Check History**: View your previous spins in the "HISTORY" section.
7. **Mute Sounds**: Toggle the sound button (speaker icon) to mute or unmute game audio.
8. **Switch Themes**: Select different themes from the dropdown menu (if available).

## Winning Combinations

- You win when matching symbols appear on an active payline, from left to right.
- The first symbol must be on the leftmost reel.
- Minimum 3 matching symbols are required for a win.
- Higher value symbols pay more.
- Winnings are multiplied by your bet amount.

## Demo Epic Win Animation

You can test the epic win animation by clicking the "TEST EPIC WIN" button.

## Development

### Project Structure

- `game.js` - Main game logic
- `index.html` - Main entry point
- `styles.css` - Game styling
- `themes/` - Theme configurations and effects
- `images/symbols/` - Symbol images
- `sounds/` - Sound effects and music

### Adding New Themes

1. Create a new theme file in `themes/` directory
2. Define symbols, their images, and payout values
3. Configure visual effects and animations
4. Add the theme's sound files in `sounds/themes/[your-theme-name]/`
5. Register the new theme in `themes/index.js`

## Browser Compatibility

- Chrome (recommended)
- Firefox
- Edge
- Safari

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Credits

- Sound effects from the internet
- Symbol artwork by Google Image FX
- Background music by the intenet

## Future Enhancements

- Mobile touch support
- Progressive jackpots
- Bonus mini-games
- Local save system
- Additional themes
- Free spin features

---

Enjoy the game! Feel free to contribute or report issues.
