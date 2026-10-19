/**
 * Board renderer for bonus games
 * Handles drawing the game board and tiles
 */


export function drawBoard(ctx, board, config, canvasWidth, canvasHeight) {
    const { boardLayout } = config;
    const centerX = canvasWidth / 2;
    const centerY = canvasHeight / 2 - 50; // Move up a bit
    const boardRadius = Math.min(canvasWidth, canvasHeight) * 0.35; // For circle layout
    const tileSize = 60;

    // Calculate positions based on layout *before* drawing
    // For square layout, calculation happens *inside* drawSquareBoard now.
    // For other layouts, use updateTilePositions.
    if (boardLayout === 'circle') {
        updateTilePositions(board, 'circle', centerX, centerY, boardRadius, tileSize);
        drawCircleBoard(ctx, board); // Pass only needed params
    } else if (boardLayout === 'square') {
        // Let drawSquareBoard handle position calculation AND drawing
        drawSquareBoard(ctx, board, centerX, centerY, tileSize);
    } else { // Assuming 'path' or other types
        updateTilePositions(board, boardLayout, centerX, centerY, 0, tileSize); // Radius not needed
        drawPathBoard(ctx, board); // Pass only needed params
    }
}


/**
 * Calculate and retrieve the center (x, y) coordinates for a given tile index.
 * This function becomes the single source of truth for positioning.
 *
 * @param {number} tileIndex - The index of the tile (0 to board.length - 1)
 * @param {Array} board - The board array (needed for length)
 * @param {string} boardLayout - The layout type ('square', 'circle', 'path')
 * @param {number} centerX - Center X of the board area
 * @param {number} centerY - Center Y of the board area
 * @param {number} tileSize - Size of one tile
 * @param {number} radius - Radius (only for 'circle' layout)
 * @returns {{x: number, y: number} | null} Center coordinates or null if invalid index/layout
 */
export function getTileCenterPosition(tileIndex, board, boardLayout, centerX, centerY, tileSize, radius) {
    const boardLength = board.length;
    if (tileIndex < 0 || tileIndex >= boardLength) return null; // Invalid index

    let tileX, tileY;

    if (boardLayout === 'square') {
        // Use the exact same logic as drawSquareBoard for positioning
        // For a 12-tile board (4 sides of 3 movement segments)
        if (boardLength !== 12) {
            console.warn("Square layout calculation currently assumes exactly 12 tiles.");
            // Add more robust calculation for other sizes if needed
            return null;
        }
        const tilesPerSide = 3; // Number of tiles *between* corners
        const totalSideLength = tilesPerSide * tileSize; // Length of the moving path on one side

        // Calculate corner offsets relative to center
        // Half the total length of one side (including corners)
        const halfBoardWidth = (tilesPerSide + 1) * tileSize / 2; // e.g. (3+1)*60/2 = 120
        const halfBoardHeight = halfBoardWidth; // Assuming square

        // Calculate position based on index range
        if (tileIndex >= 0 && tileIndex < tilesPerSide) { // Top edge (excluding top-right corner)
            // Starts near top-left, moves right
            tileX = centerX - halfBoardWidth + tileSize / 2 + tileIndex * tileSize;
            tileY = centerY - halfBoardHeight + tileSize / 2;
        } else if (tileIndex >= tilesPerSide && tileIndex < tilesPerSide * 2) { // Right edge (excluding bottom-right corner)
            // Starts near top-right, moves down
            tileX = centerX + halfBoardWidth - tileSize / 2;
            tileY = centerY - halfBoardHeight + tileSize / 2 + (tileIndex - tilesPerSide) * tileSize;
        } else if (tileIndex >= tilesPerSide * 2 && tileIndex < tilesPerSide * 3) { // Bottom edge (excluding bottom-left corner)
            // Starts near bottom-right, moves left
            tileX = centerX + halfBoardWidth - tileSize / 2 - (tileIndex - tilesPerSide * 2) * tileSize;
            tileY = centerY + halfBoardHeight - tileSize / 2;
        } else if (tileIndex >= tilesPerSide * 3 && tileIndex < tilesPerSide * 4) { // Left edge (excluding top-left corner)
            // Starts near bottom-left, moves up
            tileX = centerX - halfBoardWidth + tileSize / 2;
            tileY = centerY + halfBoardHeight - tileSize / 2 - (tileIndex - tilesPerSide * 3) * tileSize;
        } else {
            return null; // Should not happen for 0-11 index on 12 tiles
        }

    } else if (boardLayout === 'circle') {
        if (!radius) return null;
        const angle = (tileIndex / boardLength) * Math.PI * 2 - Math.PI / 2; // Start at top
        tileX = centerX + Math.cos(angle) * radius;
        tileY = centerY + Math.sin(angle) * radius;

    } else { // 'path' or default
        // Re-implement path logic if needed, or use stored coords if updateTilePositions ran
        // Placeholder: Assume updateTilePositions has run and stored coords
        if (board[tileIndex] && board[tileIndex].x !== undefined) {
            // Return center of the tile based on stored top-left corner
            tileX = board[tileIndex].x + tileSize / 2;
            tileY = board[tileIndex].y + tileSize / 2;
        } else {
            return null; // Cannot determine position
        }
    }

    return { x: tileX, y: tileY };
}


/**
 * Update positions of all tiles on the board based on layout
 * (REMOVED square logic from here)
 */
function updateTilePositions(board, boardLayout, centerX, centerY, radius, tileSize) {
    if (!board || board.length === 0) return;

    if (boardLayout === 'circle') {
        for (let i = 0; i < board.length; i++) {
            const pos = getTileCenterPosition(i, board, boardLayout, centerX, centerY, tileSize, radius);
            if (pos) {
                board[i].x = pos.x - tileSize / 2;
                board[i].y = pos.y - tileSize / 2;
                board[i].width = tileSize;
                board[i].height = tileSize;
            }
        }
    } else if (boardLayout === 'square') {
        // POSITIONING IS NOW HANDLED WITHIN drawSquareBoard or getTileCenterPosition
        // We *could* pre-calculate and store them here using getTileCenterPosition,
        // but let's keep it simpler and calculate on-the-fly or during drawing.
        // If performance becomes an issue, pre-calculate here:
        /*
        for (let i = 0; i < board.length; i++) {
            const pos = getTileCenterPosition(i, board, boardLayout, centerX, centerY, tileSize, 0); // Radius not needed
            if (pos) {
                board[i].x = pos.x - tileSize / 2;
                board[i].y = pos.y - tileSize / 2;
                board[i].width = tileSize;
                board[i].height = tileSize;
            }
        }
        */
    } else { // 'path' layout (Example - adjust as needed)
        const rowSize = Math.min(8, Math.ceil(board.length / 3));
        const startOffsetX = (rowSize * tileSize) / 2 - tileSize / 2; // Centering adjust
        const startOffsetY = 100; // Arbitrary start Y

        let tileIndex = 0;
        let row = 0;
        let col = 0;
        let moveRight = true;

        for (let i = 0; i < board.length; i++) {
            // Calculate top-left corner for the tile
            const x = centerX - startOffsetX + col * tileSize;
            const y = centerY - startOffsetY + row * tileSize;

            // Update tile object
            board[i].x = x;
            board[i].y = y;
            board[i].width = tileSize;
            board[i].height = tileSize;

            // Move to next position in zigzag pattern
            if (moveRight) {
                col++;
                if (col >= rowSize) { // End of rightward row
                    col = rowSize - 1; // Stay in last column
                    row++;             // Move down
                    moveRight = false; // Change direction
                }
            } else { // Moving left
                col--;
                if (col < 0) { // End of leftward row
                    col = 0;           // Stay in first column
                    row++;             // Move down
                    moveRight = true;  // Change direction
                }
            }
        }
    }
}

/**
* Draws a board with tiles arranged in a circle
*/
function drawCircleBoard(ctx, board) {
    // Assumes updateTilePositions has already set x, y, width, height
    for (let i = 0; i < board.length; i++) {
        if (board[i].x !== undefined) { // Check if position is set
            drawTile(ctx, board[i]);
        }
    }
}

/**
* Draws a board with tiles arranged in a square (12 tiles assumed)
* Also calculates and stores the tile positions.
*/
function drawSquareBoard(ctx, board, centerX, centerY, tileSize) {
    if (board.length !== 12) {
        console.error("drawSquareBoard currently requires exactly 12 tiles.");
        return;
    }

    for (let i = 0; i < board.length; i++) {
        const centerPos = getTileCenterPosition(i, board, 'square', centerX, centerY, tileSize, 0);
        if (centerPos) {
            // Calculate top-left corner from center for drawing rect
            const tileX = centerPos.x - tileSize / 2;
            const tileY = centerPos.y - tileSize / 2;

            // Store position in the tile object (important for player drawing)
            board[i].x = tileX;
            board[i].y = tileY;
            board[i].width = tileSize;
            board[i].height = tileSize;

            // Draw the tile using the stored properties
            drawTile(ctx, board[i]);
        }
    }
}


/**
* Draws a board with tiles arranged in a zigzag path
*/
function drawPathBoard(ctx, board) {
    // Assumes updateTilePositions has already set x, y, width, height
    for (let i = 0; i < board.length; i++) {
        if (board[i].x !== undefined) { // Check if position is set
            drawTile(ctx, board[i]);
        }
    }
}


/**
 * Draws an individual tile
 * 
 * @param {Object} ctx - Canvas rendering context
 * @param {Object} tile - Tile object with position, size, type and value
 */
export function drawTile(ctx, tile) {
    const { x, y, width, height, type, value } = tile;

    // Default colors if not provided by the theme
    const tileColors = {
        win: '#4CAF50',
        moveForward: '#2196F3',
        moveBackward: '#F44336'
    };

    // Draw tile background
    ctx.fillStyle = tileColors[type] || '#333333';
    ctx.fillRect(x, y, width, height);

    // Draw border
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, width, height);

    // Draw tile text
    ctx.fillStyle = '#ffffff';
    ctx.font = '14px Arial';
    ctx.textAlign = 'center';

    let text = '';
    switch (type) {
        case 'win':
            text = 'Win ' + value + 'x';
            break;
        case 'moveForward':
            text = 'Forward ' + value;
            break;
        case 'moveBackward':
            text = 'Back ' + value;
            break;
    }

    ctx.fillText(text, x + width / 2, y + height / 2 + 5);
}
