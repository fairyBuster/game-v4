// filepath: c:\projects\copilot-agent\theme-slots\themes\index.js
// Updated import paths for the refactored theme structure
import { ClassicTheme } from './classic/theme.js';
import { AncientEgyptTheme } from './ancient-egypt/theme.js';
import { SpaceAdventureTheme } from './space-adventure/theme.js';
import { FantasyForestTheme } from './fantasy-forest/theme.js';
import { GemstonesTheme } from './gemstones/theme.js';
import { AztecTheme } from './aztec/theme.js';
import { PirateTheme } from './pirate/theme.js';

// Collect all themes in a single object for easy access
export const THEMES = {
    [ClassicTheme.name]: ClassicTheme,
    [AncientEgyptTheme.name]: AncientEgyptTheme,
    [SpaceAdventureTheme.name]: SpaceAdventureTheme,
    [FantasyForestTheme.name]: FantasyForestTheme,
    [GemstonesTheme.name]: GemstonesTheme,
    [AztecTheme.name]: AztecTheme,
    [PirateTheme.name]: PirateTheme
};

// Export individual themes for direct imports if needed
export {
    ClassicTheme,
    AncientEgyptTheme,
    SpaceAdventureTheme,
    FantasyForestTheme,
    GemstonesTheme,
    AztecTheme,
    PirateTheme
};
