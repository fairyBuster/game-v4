/**
 * RTP Simulator for Slot Game
 * 
 * This tool simulates a large number of spins to calculate the average Return to Player (RTP)
 * percentage for the slot game. It helps with balancing the game's payout rate.
 */

// Import necessary game configuration
import { reelStrips, symbolNumberMultipliers, PAYOUT_RULES, PAYLINES } from './themes/config.js';

// Configuration for simulation
const DEFAULT_SIMULATION_SETTINGS = {
    spins: 100000,        // Number of spins to simulate
    betAmount: 10,        // Bet amount per spin
    logFrequency: 10000,  // How often to log progress
    detailedResults: true // Whether to show detailed breakdown
};

// Main simulation function
function simulateRTP(settings = {}) {
    // Merge default settings with provided settings
    const config = { ...DEFAULT_SIMULATION_SETTINGS, ...settings };

    console.log(`Starting RTP simulation with ${config.spins.toLocaleString()} spins...`);
    console.time('Simulation completed in');

    // Variables to track results
    let totalBet = 0;
    let totalWin = 0;
    let spinResults = [];
    let symbolWinCounts = {};
    let paylineWinCounts = {};
    let winDistribution = {
        '0x': 0,        // No win
        '0-1x': 0,      // 0-1x bet
        '1-2x': 0,      // 1-2x bet
        '2-5x': 0,      // 2-5x bet
        '5-10x': 0,     // 5-10x bet
        '10-20x': 0,    // 10-20x bet
        '20-50x': 0,    // 20-50x bet
        '50-100x': 0,   // 50-100x bet
        '100x+': 0      // Over 100x bet
    };

    // Initialize symbol win tracking
    for (let i = 0; i < 5; i++) {
        symbolWinCounts[i] = {
            name: `Symbol ${i}`,
            count: 0,
            totalWin: 0
        };
    }

    // Initialize payline win tracking
    for (let i = 0; i < PAYLINES.length; i++) {
        paylineWinCounts[i] = {
            hits: 0,
            totalWin: 0
        };
    }

    // Run the simulation
    for (let spin = 1; spin <= config.spins; spin++) {
        // Track bet amount
        totalBet += config.betAmount;

        // Generate random reel positions
        const reelPositions = [];
        for (let reel = 0; reel < reelStrips.length; reel++) {
            reelPositions.push(Math.floor(Math.random() * reelStrips[reel].length));
        }

        // Get visible symbols grid (3x5)
        const visibleSymbols = [];
        for (let reel = 0; reel < reelStrips.length; reel++) {
            const reelSymbols = [];
            const strip = reelStrips[reel];

            for (let row = 0; row < 3; row++) {
                const position = (reelPositions[reel] + row) % strip.length;
                reelSymbols.push(strip[position]);
            }

            visibleSymbols.push(reelSymbols);
        }

        // Calculate wins
        const spinWins = calculateWins(visibleSymbols, config.betAmount);
        const totalSpinWin = spinWins.totalWin;

        // Update stats
        totalWin += totalSpinWin;

        // Track individual spin results if detailed tracking is enabled
        if (config.detailedResults) {
            spinResults.push({
                spin,
                win: totalSpinWin,
                multiplier: totalSpinWin / config.betAmount
            });

            // Update win distribution
            const winMultiplier = totalSpinWin / config.betAmount;
            if (winMultiplier === 0) winDistribution['0x']++;
            else if (winMultiplier <= 1) winDistribution['0-1x']++;
            else if (winMultiplier <= 2) winDistribution['1-2x']++;
            else if (winMultiplier <= 5) winDistribution['2-5x']++;
            else if (winMultiplier <= 10) winDistribution['5-10x']++;
            else if (winMultiplier <= 20) winDistribution['10-20x']++;
            else if (winMultiplier <= 50) winDistribution['20-50x']++;
            else if (winMultiplier <= 100) winDistribution['50-100x']++;
            else winDistribution['100x+']++;

            // Update symbol and payline stats
            spinWins.winningLines.forEach(line => {
                const symbolNumber = line.symbolNumber;
                const paylineIndex = line.paylineIndex;

                symbolWinCounts[symbolNumber].count++;
                symbolWinCounts[symbolNumber].totalWin += line.win;

                paylineWinCounts[paylineIndex].hits++;
                paylineWinCounts[paylineIndex].totalWin += line.win;
            });
        }

        // Log progress
        if (spin % config.logFrequency === 0 || spin === config.spins) {
            const currentRTP = (totalWin / totalBet) * 100;
            console.log(`Processed ${spin.toLocaleString()}/${config.spins.toLocaleString()} spins (${(spin / config.spins * 100).toFixed(1)}%), Current RTP: ${currentRTP.toFixed(2)}%`);
        }
    }

    // Calculate final RTP
    const finalRTP = (totalWin / totalBet) * 100;

    // Display results
    console.log('\n=== RTP SIMULATION RESULTS ===');
    console.log(`Total Spins: ${config.spins.toLocaleString()}`);
    console.log(`Total Bet: ${totalBet.toLocaleString()}`);
    console.log(`Total Win: ${totalWin.toLocaleString()}`);
    console.log(`Final RTP: ${finalRTP.toFixed(2)}%`);

    // Show detailed results if enabled
    if (config.detailedResults) {
        console.log('\n=== WIN DISTRIBUTION ===');
        for (const [range, count] of Object.entries(winDistribution)) {
            const percentage = (count / config.spins) * 100;
            console.log(`${range}: ${count.toLocaleString()} spins (${percentage.toFixed(2)}%)`);
        }

        console.log('\n=== SYMBOL WINS ===');
        for (const [symbolNumber, stats] of Object.entries(symbolWinCounts)) {
            const symbolRTP = (stats.totalWin / totalBet) * 100;
            console.log(`Symbol ${symbolNumber}: ${stats.count.toLocaleString()} wins, Total Win: ${stats.totalWin.toLocaleString()}, Symbol RTP: ${symbolRTP.toFixed(2)}%`);
        }

        console.log('\n=== PAYLINE HITS ===');
        for (const [paylineIndex, stats] of Object.entries(paylineWinCounts)) {
            if (stats.hits > 0) {
                const paylineRTP = (stats.totalWin / totalBet) * 100;
                console.log(`Payline ${paylineIndex}: ${stats.hits.toLocaleString()} hits, Total Win: ${stats.totalWin.toLocaleString()}, Payline RTP: ${paylineRTP.toFixed(2)}%`);
            }
        }

        // Find highest win and its frequency
        let highestWin = 0;
        let highestWinMultiplier = 0;

        spinResults.forEach(result => {
            if (result.win > highestWin) {
                highestWin = result.win;
                highestWinMultiplier = result.multiplier;
            }
        });

        console.log('\n=== HIGHEST WIN ===');
        console.log(`Highest Win: ${highestWin.toLocaleString()} (${highestWinMultiplier.toFixed(1)}x bet)`);
    }

    console.timeEnd('Simulation completed in');
    return finalRTP;
}

// Function to calculate wins (similar to your game's win calculation logic)
function calculateWins(visibleSymbols, betAmount) {
    const result = {
        winningLines: [],
        totalWin: 0
    };    // Check each payline
    PAYLINES.forEach((payline, paylineIndex) => {
        // Get symbols on this payline
        const lineSymbols = [];
        for (let reel = 0; reel < visibleSymbols.length; reel++) {
            const rowIndex = payline[reel].row;  // Access the row property of the payline object
            lineSymbols.push(visibleSymbols[reel][rowIndex]);
        }

        // Check for wins
        const firstSymbol = lineSymbols[0];
        let sequenceLength = 1;

        for (let i = 1; i < lineSymbols.length; i++) {
            if (lineSymbols[i] === firstSymbol) {
                sequenceLength++;
            } else {
                break;
            }
        }

        // Check if sequence is long enough for a win
        if (sequenceLength >= 3) { // Minimum 3 symbols for a win
            // Calculate win amount
            const multiplier = symbolNumberMultipliers[firstSymbol] || 1;
            const lineWin = calculateLineWin(sequenceLength, multiplier, betAmount);

            if (lineWin > 0) {
                result.winningLines.push({
                    paylineIndex,
                    symbolNumber: firstSymbol,
                    count: sequenceLength,
                    win: lineWin
                });

                result.totalWin += lineWin;
            }
        }
    });

    return result;
}

// Calculate win amount based on symbol count, multiplier and bet
function calculateLineWin(count, multiplier, bet) {
    const rule = PAYOUT_RULES[count];
    if (!rule) return 0;

    const baseWin = bet * rule;
    return baseWin * multiplier;
}

// Export the simulator function
export { simulateRTP };