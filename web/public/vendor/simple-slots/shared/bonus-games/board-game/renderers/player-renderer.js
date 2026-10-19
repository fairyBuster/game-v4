/**
 * Player renderer for bonus games
 * Handles drawing the player token on the board
 */

/**
 * Draws the player token on the current position
 * 
 * @param {Object} ctx - Canvas rendering context
 * @param {Array} board - Array of tile objects
 * @param {number} position - Current player position on the board
 * @param {Object} playerImage - Optional player image asset
 */
export function drawPlayer(ctx, board, position, playerImage) {
    if (board.length === 0 || position >= board.length) return;

    const tile = board[position];
    const { x, y, width, height } = tile;

    if (playerImage) {
        // Draw themed player image
        ctx.drawImage(
            playerImage,
            x + width / 2 - 20,
            y + height / 2 - 20,
            40, 40
        );
    } else {
        // Draw default player token
        ctx.fillStyle = '#ffeb3b';
        ctx.beginPath();
        ctx.arc(
            x + width / 2,
            y + height / 2,
            20,
            0, Math.PI * 2
        );
        ctx.fill();

        ctx.strokeStyle = '#ffd600';
        ctx.lineWidth = 3;
        ctx.stroke();
    }
}
