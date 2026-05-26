// ============================================
// TETRIS GAME - CONSTANTS & CONFIGURATION
// ============================================

const canvas = document.getElementById('tetris');
const context = canvas.getContext('2d');
context.scale(24, 24);

// New Canvas elements for the Next Piece Preview
const nextCanvas = document.getElementById('nextCanvas');
const nextContext = nextCanvas.getContext('2d');
nextContext.scale(24, 24); // Scale is the same, but canvas is smaller (5x5 grid)

// Hold piece canvas
const holdCanvas = document.getElementById('holdCanvas');
const holdContext = holdCanvas.getContext('2d');
holdContext.scale(24, 24);

// Game configuration constants
const ARENA_WIDTH = 10;
const ARENA_HEIGHT = 20;
const INITIAL_DROP_INTERVAL = 1000;  // ms between piece drops
const MIN_DROP_INTERVAL = 100;       // ms - fastest possible drop speed
const LEVEL_SPEED_INCREMENT = 100;   // ms faster per level
const LINES_PER_LEVEL = 10;          // lines cleared to advance level

// Tetris piece shapes and colors
const SHAPES = 'ILJOTSZ';
const COLORS = [
    null,
    '#FF0D72', '#0DC2FF', '#0DFF72',  // I, L, J
    '#F538FF', '#FF8E0D', '#FFE138', '#3877FF'  // O, Z, S, T
];

// Scoring constants
const LINE_SCORES = [0, 40, 100, 300, 1200];  // Points for 0-4 lines cleared

// Create the game arena
const arena = createMatrix(ARENA_WIDTH, ARENA_HEIGHT);

// ============================================
// GAME STATE VARIABLES
// ============================================

let score = 0;
let lines = 0;
let level = 1;
let dropInterval = INITIAL_DROP_INTERVAL;
let isPaused = false;
let gameOver = false;
let highScore = localStorage.getItem('tetrisHighScore') || 0;
let currentTheme = localStorage.getItem('tetrisTheme') || 'dark';

const player = {
    pos: {x: 0, y: 0},
    matrix: null,
    nextMatrix: null,    // Holds the upcoming piece
    holdMatrix: null     // Holds the stored piece
};

// ============================================
// MATRIX & PIECE CREATION
// ============================================

/**
 * Creates an empty matrix (2D array) with specified dimensions
 * @param {number} w - Width (columns)
 * @param {number} h - Height (rows)
 * @returns {Array<Array>} 2D array filled with zeros
 */
function createMatrix(w, h) {
    const matrix = [];
    while (h--) { matrix.push(new Array(w).fill(0)); }
    return matrix;
}

/**
 * Creates a Tetris piece matrix based on type
 * Each piece is represented by a 2D array with numbers 1-7
 * @param {string} type - One of 'I', 'L', 'J', 'O', 'Z', 'S', 'T'
 * @returns {Array<Array>} 2D array representing the piece
 */
function createPiece(type) {
    if (type === 'I') return [[0,1,0,0], [0,1,0,0], [0,1,0,0], [0,1,0,0]];
    if (type === 'L') return [[0,2,0], [0,2,0], [0,2,2]];
    if (type === 'J') return [[0,3,0], [0,3,0], [3,3,0]];
    if (type === 'O') return [[4,4], [4,4]];
    if (type === 'Z') return [[5,5,0], [0,5,5], [0,0,0]];
    if (type === 'S') return [[0,6,6], [6,6,0], [0,0,0]];
    if (type === 'T') return [[0,7,0], [7,7,7], [0,0,0]];
}

/**
 * Returns a random Tetris piece
 * @returns {Array<Array>} Random piece matrix
 */
function getRandomPiece() {
    const randomIndex = Math.floor(Math.random() * SHAPES.length);
    return createPiece(SHAPES[randomIndex]);
}

// ============================================
// COLLISION & PHYSICS
// ============================================

/**
 * Checks if the current piece collides with the arena or other pieces
 * @param {Array<Array>} arena - The game board
 * @param {Object} player - Player object with matrix and pos
 * @returns {boolean} True if collision detected
 */
function collide(arena, player) {
    const [m, o] = [player.matrix, player.pos];
    for (let y = 0; y < m.length; ++y) {
        for (let x = 0; x < m[y].length; ++x) {
            // Check if piece cell is not empty AND arena cell at that position is occupied
            if (m[y][x] !== 0 &&
               (arena[y + o.y] && arena[y + o.y][x + o.x]) !== 0) {
                return true;
            }
        }
    }
    return false;
}

/**
 * Merges the current piece into the arena permanently
 * @param {Array<Array>} arena - The game board
 * @param {Object} player - Player object with matrix and pos
 */
function merge(arena, player) {
    player.matrix.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) {
                arena[y + player.pos.y][x + player.pos.x] = value;
            }
        });
    });
}

/**
 * Deep copies a piece matrix
 * @param {Array<Array>} matrix - The piece to copy
 * @returns {Array<Array>} A new independent copy
 */
function copyMatrix(matrix) {
    return matrix.map(row => [...row]);
}

// ============================================
// DRAWING & RENDERING
// ============================================

/**
 * Universal draw function that works for both main and preview canvases
 * Renders a matrix (piece or arena) to a specified canvas context
 * @param {Array<Array>} matrix - 2D array to draw
 * @param {Object} offset - {x, y} position offset
 * @param {CanvasRenderingContext2D} ctx - Canvas context to draw to
 */
function drawMatrix(matrix, offset, ctx) {
    matrix.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) {
                ctx.fillStyle = COLORS[value];
                ctx.fillRect(x + offset.x, y + offset.y, 1, 1);
            }
        });
    });
}

/**
 * Main draw function - renders arena, current piece, and previews
 */
function draw() {
    // Clear and draw main game arena
    context.fillStyle = '#111';
    context.fillRect(0, 0, canvas.width, canvas.height);
    drawMatrix(arena, {x: 0, y: 0}, context);
    drawMatrix(player.matrix, player.pos, context);

    // Clear and draw next piece preview (centered in 5x5 grid)
    nextContext.fillStyle = '#111';
    nextContext.fillRect(0, 0, nextCanvas.width, nextCanvas.height);
    if (player.nextMatrix) {
        const pX = (5 - player.nextMatrix[0].length) / 2;
        const pY = (5 - player.nextMatrix.length) / 2;
        drawMatrix(player.nextMatrix, {x: pX, y: pY}, nextContext);
    }

    // Clear and draw hold piece preview (centered in 5x5 grid)
    holdContext.fillStyle = '#111';
    holdContext.fillRect(0, 0, holdCanvas.width, holdCanvas.height);
    if (player.holdMatrix) {
        const hX = (5 - player.holdMatrix[0].length) / 2;
        const hY = (5 - player.holdMatrix.length) / 2;
        drawMatrix(player.holdMatrix, {x: hX, y: hY}, holdContext);
    }
}

// ============================================
// GAME LOGIC
// ============================================

/**
 * Scans the arena for complete rows and removes them
 * Updates score, lines, and level accordingly
 * Implements classic Tetris scoring: 40, 100, 300, 1200 points
 */
function arenaSweep() {
    let rowCount = 0;
    outer: for (let y = arena.length - 1; y >= 0; --y) {
        for (let x = 0; x < arena[y].length; ++x) {
            if (arena[y][x] === 0) {
                continue outer;  // Row not complete, skip to next row
            }
        }
        // Row is complete - remove it and add empty row at top
        const row = arena.splice(y, 1)[0].fill(0);
        arena.unshift(row);
        ++y;  // Check the same y position again (new row moved down)
        rowCount++;
    }

    if (rowCount > 0) {
        lines += rowCount;
        
        // Apply score multiplier based on level
        score += LINE_SCORES[rowCount] * level;
        
        // Level up every LINES_PER_LEVEL lines cleared
        level = Math.floor(lines / LINES_PER_LEVEL) + 1;
        
        // Increase difficulty - make pieces drop faster (capped at MIN_DROP_INTERVAL)
        dropInterval = Math.max(MIN_DROP_INTERVAL, INITIAL_DROP_INTERVAL - (level - 1) * LEVEL_SPEED_INCREMENT);
        
        // Play sound effect
        playSound('clear');
    }
}

/**
 * Moves the current piece left or right
 * @param {number} dir - Direction: -1 for left, 1 for right
 */
function playerMove(dir) {
    player.pos.x += dir;
    if (collide(arena, player)) {
        player.pos.x -= dir;  // Undo move if collision detected
    }
}

/**
 * Drops the current piece one row
 * When piece can't drop further, merge it and spawn new piece
 */
function playerDrop() {
    player.pos.y++;
    if (collide(arena, player)) {
        player.pos.y--;
        merge(arena, player);
        arenaSweep();
        playerReset();
        updateStats();
    }
    dropCounter = 0;
}

/**
 * Swaps current piece with held piece (classic Tetris mechanic)
 * Can only hold once per piece drop
 */
function playerHold() {
    // Swap current matrix with hold matrix
    const temp = player.matrix;
    player.matrix = player.holdMatrix;
    player.holdMatrix = temp;
    
    // If no held piece existed, use next piece instead
    if (player.matrix === null) {
        player.matrix = player.nextMatrix;
        player.nextMatrix = getRandomPiece();
    }
    
    // Reset piece position to top-center
    player.pos.y = 0;
    player.pos.x = (arena[0].length / 2 | 0) - (player.matrix[0].length / 2 | 0);
    
    playSound('hold');
}

/**
 * Rotates the current piece with wall kick support
 * Wall kick allows rotation to succeed even at edges by nudging the piece
 * @param {number} dir - Rotation direction: -1 for CCW, 1 for CW
 */
function playerRotate(dir) {
    const pos = player.pos.x;
    let offset = 1;
    rotate(player.matrix, dir);
    // Wall kick - try different horizontal positions if collision detected
    while (collide(arena, player)) {
        player.pos.x += offset;
        offset = -(offset + (offset > 0 ? 1 : -1));
        if (offset > player.matrix[0].length) {
            rotate(player.matrix, -dir);  // Undo rotation if can't find valid position
            player.pos.x = pos;
            return;
        }
    }
    playSound('rotate');
}

/**
 * Rotates a piece matrix 90 degrees in the specified direction
 * CCW (dir < 0): transpose then reverse each row
 * CW (dir > 0): reverse then transpose
 * @param {Array<Array>} matrix - The piece to rotate
 * @param {number} dir - Rotation direction
 */
function rotate(matrix, dir) {
    // Transpose matrix
    for (let y = 0; y < matrix.length; ++y) {
        for (let x = 0; x < y; ++x) {
            [matrix[x][y], matrix[y][x]] = [matrix[y][x], matrix[x][y]];
        }
    }
    // Reverse rows for clockwise, reverse entire matrix for counter-clockwise
    if (dir > 0) {
        matrix.forEach(row => row.reverse());
    } else {
        matrix.reverse();
    }
}

/**
 * Resets player piece to starting state
 * Spawns new piece at top-center of arena
 * Triggers game over if piece immediately collides
 */
function playerReset() {
    // Initialize next piece if it doesn't exist yet (first game start)
    if (!player.nextMatrix) {
        player.nextMatrix = getRandomPiece();
    }

    // Current piece becomes the next piece
    player.matrix = player.nextMatrix;
    // Roll a new upcoming piece
    player.nextMatrix = getRandomPiece();
    
    // Position new piece at top-center
    player.pos.y = 0;
    player.pos.x = (arena[0].length / 2 | 0) - (player.matrix[0].length / 2 | 0);
    
    // Check for game over - if new piece immediately collides at spawn point
    if (collide(arena, player)) {
        triggerGameOver();
    }
}

/**
 * Toggle pause state
 */
function togglePause() {
    if (!gameOver) {
        isPaused = !isPaused;
        document.getElementById('pauseBtn').innerText = isPaused ? 'Resume' : 'Pause';
        document.getElementById('pauseOverlay').style.display = isPaused ? 'flex' : 'none';
    }
}

/**
 * Handles game over state
 */
function triggerGameOver() {
    gameOver = true;
    playSound('gameOver');
    
    // Update high score
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('tetrisHighScore', highScore);
    }
    
    // Show game over modal
    showGameOverModal();
}

// ============================================
// UI & STATS
// ============================================

/**
 * Updates all on-screen statistics (score, level, lines, high score)
 */
function updateStats() {
    document.getElementById('score').innerText = score;
    document.getElementById('level').innerText = level;
    document.getElementById('lines').innerText = lines;
    document.getElementById('highScore').innerText = highScore;
}

/**
 * Displays game over modal with final stats and restart option
 */
function showGameOverModal() {
    const modal = document.getElementById('gameOverModal');
    document.getElementById('finalScore').innerText = score;
    document.getElementById('finalLevel').innerText = level;
    document.getElementById('finalLines').innerText = lines;
    document.getElementById('isNewHighScore').innerText = score > highScore ? '🎉 NEW HIGH SCORE!' : '';
    modal.style.display = 'flex';
}

/**
 * Resets the entire game state
 */
function resetGame() {
    arena.forEach(row => row.fill(0));
    score = 0;
    lines = 0;
    level = 1;
    dropInterval = INITIAL_DROP_INTERVAL;
    gameOver = false;
    isPaused = false;
    player.nextMatrix = null;
    player.holdMatrix = null;
    document.getElementById('gameOverModal').style.display = 'none';
    document.getElementById('pauseBtn').innerText = 'Pause';
    document.getElementById('pauseOverlay').style.display = 'none';
    playerReset();
    updateStats();
}

/**
 * Cycles through available themes and saves to localStorage
 */
function changeTheme() {
    const themes = ['dark', 'light', 'neon'];
    const currentIndex = themes.indexOf(currentTheme);
    currentTheme = themes[(currentIndex + 1) % themes.length];
    localStorage.setItem('tetrisTheme', currentTheme);
    applyTheme();
}

/**
 * Applies the current theme to the page
 */
function applyTheme() {
    document.body.setAttribute('data-theme', currentTheme);
}

// ============================================
// SOUND EFFECTS
// ============================================

/**
 * Plays a sound effect (using Web Audio API)
 * @param {string} type - Type of sound: 'clear', 'rotate', 'hold', 'gameOver'
 */
function playSound(type) {
    // Only play sounds if not muted
    if (document.getElementById('soundToggle').checked === false) return;
    
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const now = audioContext.currentTime;
        
        if (type === 'clear') {
            // Ascending tone for line clear
            for (let i = 0; i < 4; i++) {
                const osc = audioContext.createOscillator();
                const gain = audioContext.createGain();
                osc.connect(gain);
                gain.connect(audioContext.destination);
                osc.frequency.value = 400 + (i * 200);
                gain.gain.setValueAtTime(0.3, now + (i * 0.1));
                gain.gain.exponentialRampToValueAtTime(0.01, now + (i * 0.1) + 0.1);
                osc.start(now + (i * 0.1));
                osc.stop(now + (i * 0.1) + 0.1);
            }
        } else if (type === 'rotate') {
            // Short beep for rotation
            const osc = audioContext.createOscillator();
            const gain = audioContext.createGain();
            osc.connect(gain);
            gain.connect(audioContext.destination);
            osc.frequency.value = 800;
            gain.gain.setValueAtTime(0.2, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
            osc.start(now);
            osc.stop(now + 0.05);
        } else if (type === 'hold') {
            // Soft tone for hold
            const osc = audioContext.createOscillator();
            const gain = audioContext.createGain();
            osc.connect(gain);
            gain.connect(audioContext.destination);
            osc.frequency.value = 600;
            gain.gain.setValueAtTime(0.2, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
            osc.start(now);
            osc.stop(now + 0.08);
        } else if (type === 'gameOver') {
            // Descending tone for game over
            for (let i = 0; i < 4; i++) {
                const osc = audioContext.createOscillator();
                const gain = audioContext.createGain();
                osc.connect(gain);
                gain.connect(audioContext.destination);
                osc.frequency.value = 600 - (i * 150);
                gain.gain.setValueAtTime(0.3, now + (i * 0.1));
                gain.gain.exponentialRampToValueAtTime(0.01, now + (i * 0.1) + 0.1);
                osc.start(now + (i * 0.1));
                osc.stop(now + (i * 0.1) + 0.1);
            }
        }
    } catch (e) {
        // Audio context not available, silently fail
    }
}

// ============================================
// MAIN GAME LOOP & INPUT
// ============================================

let dropCounter = 0;
let lastTime = 0;

/**
 * Main game loop called by requestAnimationFrame
 * Updates game state, checks for auto-drop, and renders
 * @param {number} time - Current timestamp in milliseconds
 */
function update(time = 0) {
    const deltaTime = time - lastTime;
    lastTime = time;

    // Skip update if paused
    if (isPaused) {
        draw();
        requestAnimationFrame(update);
        return;
    }

    // Auto-drop piece based on dropInterval
    dropCounter += deltaTime;
    if (dropCounter > dropInterval) {
        playerDrop();
    }

    draw();
    requestAnimationFrame(update);
}

/**
 * Keyboard input handler for game controls
 */
document.addEventListener('keydown', event => {
    if (gameOver) return;  // Ignore input when game is over
    
    if (event.key === ' ') {
        event.preventDefault();
        togglePause();
    } else if (!isPaused) {
        if (event.key === 'ArrowLeft') {
            playerMove(-1);
        } else if (event.key === 'ArrowRight') {
            playerMove(1);
        } else if (event.key === 'ArrowDown') {
            playerDrop();
        } else if (event.key.toLowerCase() === 'q') {
            playerRotate(-1);  // Rotate counter-clockwise
        } else if (event.key.toLowerCase() === 'e') {
            playerRotate(1);   // Rotate clockwise
        } else if (event.key.toLowerCase() === 'z') {
            playerHold();      // Hold piece
        }
    }
});

/**
 * Mobile touch controls handler
 */
let touchStartX = 0;
document.addEventListener('touchstart', (e) => {
    touchStartX = e.touches[0].clientX;
});

document.addEventListener('touchmove', (e) => {
    if (gameOver || isPaused) return;
    e.preventDefault();
    const touchEndX = e.touches[0].clientX;
    const diff = touchEndX - touchStartX;
    
    if (diff < -30) {
        playerMove(-1);  // Swipe left
        touchStartX = touchEndX;
    } else if (diff > 30) {
        playerMove(1);   // Swipe right
        touchStartX = touchEndX;
    }
}, false);

// ============================================
// INITIALIZATION
// ============================================

// Apply saved theme on startup
applyTheme();

// Start the game
playerReset();
updateStats();
update();
