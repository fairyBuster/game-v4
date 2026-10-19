/**
 * Audio utilities for bonus games
 * Handles playing sound effects
 */

/**
 * Play a sound effect
 * 
 * @param {string} name - Name of the sound to play
 * @param {AudioContext} audioContext - Web audio context
 * @param {GainNode} masterGainNode - Master gain node
 * @param {Object} soundAssets - Sound assets object
 * @param {boolean} soundEnabled - Whether sound is enabled
 */
export function playSound(name, audioContext, masterGainNode, soundAssets, soundEnabled) {
    // Check if sound is enabled and we have audio context
    if (!soundEnabled || !audioContext || audioContext.state === 'suspended') {
        return;
    }

    // Get the sound buffer
    const buffer = soundAssets && soundAssets[name];
    if (!buffer) {
        console.log(`Sound "${name}" not found or not loaded.`);
        return;
    }

    try {
        // Create a source node
        const source = audioContext.createBufferSource();
        source.buffer = buffer;

        // Connect to master gain node
        if (masterGainNode) {
            source.connect(masterGainNode);
        } else {
            source.connect(audioContext.destination);
        }

        // Play the sound
        source.start(0);
    } catch (error) {
        console.error(`Error playing sound "${name}":`, error);
    }
}
