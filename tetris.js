// ============================================
// TETRIS GAME - CONSTANTS & CONFIGURATION
// ============================================

const canvas = document.getElementById('tetris');
const context = canvas.getContext('2d');

// New Canvas elements for the Next Piece Preview
const nextCanvas = document.getElementById('nextCanvas');
const nextContext = nextCanvas.getContext('2d');

// Hold piece canvas
const holdCanvas = document.getElementById('holdCanvas');
const holdContext = holdCanvas.getContext('2d');
let cellSize = 24;
let gameMode = null;
let lastTapTime = 0;

/**
 * Resize canvases to fit small screens crisply.
 * Keeps drawing coordinates in "cell units" (1 unit = 1 cell).
 */
function resizeCanvases() {
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    const isSmallScreen = gameMode === 'mobile' || (window.matchMedia && window.matchMedia('(max-width: 768px)').matches);

    // Fit board to screen width on mobile, use larger board on desktop.
    const horizontalPadding = isSmallScreen ? 32 : 0;
    const maxBoardCssWidth = isSmallScreen ? Math.max(220, window.innerWidth - horizontalPadding) : 300;
    cellSize = Math.max(14, Math.min(28, Math.floor(maxBoardCssWidth / ARENA_WIDTH)));

    const boardCssW = cellSize * ARENA_WIDTH;
    const boardCssH = cellSize * ARENA_HEIGHT;

    canvas.style.width = `${boardCssW}px`;
    canvas.style.height = `${boardCssH}px`;
    canvas.width = Math.floor(boardCssW * dpr);
    canvas.height = Math.floor(boardCssH * dpr);

    context.setTransform(1, 0, 0, 1, 0, 0);
    context.scale(cellSize * dpr, cellSize * dpr);

    // Previews are drawn in a 5x5 grid.
    const previewCells = 5;
    const previewCellSize = Math.max(10, Math.floor(cellSize * 0.8));
    const previewCss = previewCellSize * previewCells;

    for (const [c, ctx] of [[nextCanvas, nextContext], [holdCanvas, holdContext]]) {
        c.style.width = `${previewCss}px`;
        c.style.height = `${previewCss}px`;
        c.width = Math.floor(previewCss * dpr);
        c.height = Math.floor(previewCss * dpr);
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.scale(previewCellSize * dpr, previewCellSize * dpr);
    }
}

// Game configuration constants
const ARENA_WIDTH = 10;
const ARENA_HEIGHT = 20;
const INITIAL_DROP_INTERVAL = 1000;
const MIN_DROP_INTERVAL = 100;
const LEVEL_SPEED_INCREMENT = 100;
const LINES_PER_LEVEL = 10;

// Tetris piece shapes and colors
const SHAPES = 'ILJOTSZ';
const COLORS = [
    null,
    '#FF0D72', '#0DC2FF', '#0DFF72',
    '#F538FF', '#FF8E0D', '#FFE138', '#3877FF'
];

const LINE_SCORES = [0, 40, 100, 300, 1200];

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
let gameStarted = false;
let highScore = localStorage.getItem('tetrisHighScore') || 0;
let currentTheme = localStorage.getItem('tetrisTheme') || 'dark';
let gameOverSoundPlayed = false;

const player = {
    pos: {x: 0, y: 0},
    matrix: null,
    nextMatrix: null,
    holdMatrix: null
};

// ============================================
// MATRIX & PIECE CREATION
// ============================================

/**
 * Creates an empty matrix (2D array) with specified dimensions
 */
function createMatrix(w, h) {
    const matrix = [];
    while (h--) { matrix.push(new Array(w).fill(0)); }
    return matrix;
}

/**
 * Creates a Tetris piece matrix based on type
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
 */
function collide(arena, player) {
    const [m, o] = [player.matrix, player.pos];
    for (let y = 0; y < m.length; ++y) {
        for (let x = 0; x < m[y].length; ++x) {
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
 */
function copyMatrix(matrix) {
    return matrix.map(row => [...row]);
}

/**
 * Calculate the ghost piece (preview of final position)
 */
function getGhostPiecePos() {
    const ghostPlayer = {
        pos: {x: player.pos.x, y: player.pos.y},
        matrix: player.matrix
    };
    
    while (!collide(arena, ghostPlayer)) {
        ghostPlayer.pos.y++;
    }
    ghostPlayer.pos.y--;
    
    return ghostPlayer.pos;
}

// ============================================
// DRAWING & RENDERING
// ============================================

/**
 * Draw a single block with 3D effect and grid
 */
function drawBlock(ctx, x, y, colorIndex) {
    const color = COLORS[colorIndex];
    if (!color) return;
    
    // Main block
    ctx.fillStyle = color;
    ctx.fillRect(x, y, 1, 1);
    
    // Grid lines (darker outline)
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.lineWidth = 0.05;
    ctx.strokeRect(x, y, 1, 1);
    
    // 3D effect - highlight
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 0.04;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 0.9, y);
    ctx.lineTo(x + 0.9, y + 0.1);
    ctx.stroke();
    
    // 3D effect - shadow
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.lineWidth = 0.04;
    ctx.beginPath();
    ctx.moveTo(x + 1, y + 1);
    ctx.lineTo(x + 0.1, y + 1);
    ctx.lineTo(x + 0.1, y + 0.1);
    ctx.stroke();
}

/**
 * Universal draw function - renders a matrix to canvas with texture
 */
function drawMatrix(matrix, offset, ctx, isGhost = false) {
    matrix.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) {
                const xPos = x + offset.x;
                const yPos = y + offset.y;
                
                if (isGhost) {
                    // Ghost piece - semi-transparent with just outline
                    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
                    ctx.lineWidth = 0.08;
                    ctx.strokeRect(xPos, yPos, 1, 1);
                } else {
                    // Regular piece with texture
                    drawBlock(ctx, xPos, yPos, value);
                }
            }
        });
    });
}

/**
 * Draw grid on the arena
 */
function drawGrid() {
    context.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    context.lineWidth = 0.02;
    
    // Vertical lines
    for (let x = 0; x <= ARENA_WIDTH; x++) {
        context.beginPath();
        context.moveTo(x, 0);
        context.lineTo(x, ARENA_HEIGHT);
        context.stroke();
    }
    
    // Horizontal lines
    for (let y = 0; y <= ARENA_HEIGHT; y++) {
        context.beginPath();
        context.moveTo(0, y);
        context.lineTo(ARENA_WIDTH, y);
        context.stroke();
    }
}

/**
 * Main draw function - renders arena, current piece, ghost piece, and previews
 */
function draw() {
    // Clear and draw main game arena
    context.fillStyle = '#111';
    context.fillRect(0, 0, ARENA_WIDTH, ARENA_HEIGHT);
    
    // Draw grid
    drawGrid();
    
    // Draw placed blocks
    drawMatrix(arena, {x: 0, y: 0}, context);
    
    // Draw ghost piece (preview of final position)
    if (player.matrix) {
        const ghostPos = getGhostPiecePos();
        drawMatrix(player.matrix, ghostPos, context, true);
    }
    
    // Draw current falling piece
    drawMatrix(player.matrix, player.pos, context);

    // Clear and draw next piece preview
    nextContext.fillStyle = '#111';
    nextContext.fillRect(0, 0, 5, 5);
    if (player.nextMatrix) {
        const pX = (5 - player.nextMatrix[0].length) / 2;
        const pY = (5 - player.nextMatrix.length) / 2;
        drawMatrix(player.nextMatrix, {x: pX, y: pY}, nextContext);
    }

    // Clear and draw hold piece preview
    holdContext.fillStyle = '#111';
    holdContext.fillRect(0, 0, 5, 5);
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
 */
function arenaSweep() {
    let rowCount = 0;
    outer: for (let y = arena.length - 1; y >= 0; --y) {
        for (let x = 0; x < arena[y].length; ++x) {
            if (arena[y][x] === 0) {
                continue outer;
            }
        }
        const row = arena.splice(y, 1)[0].fill(0);
        arena.unshift(row);
        ++y;
        rowCount++;
    }

    if (rowCount > 0) {
        lines += rowCount;
        score += LINE_SCORES[rowCount] * level;
        level = Math.floor(lines / LINES_PER_LEVEL) + 1;
        dropInterval = Math.max(MIN_DROP_INTERVAL, INITIAL_DROP_INTERVAL - (level - 1) * LEVEL_SPEED_INCREMENT);
        
        playSound('clear');
    }
}

/**
 * Moves the current piece left or right
 */
function playerMove(dir) {
    player.pos.x += dir;
    if (collide(arena, player)) {
        player.pos.x -= dir;
    }
}

/**
 * Hard drop - instantly place piece at bottom
 */
function playerHardDrop() {
    while (!collide(arena, {matrix: player.matrix, pos: {x: player.pos.x, y: player.pos.y + 1}})) {
        player.pos.y++;
    }
    playerDrop();
}

/**
 * Soft drop - drops the piece one row
 */
function playerDrop() {
    if (gameOver) return;
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
 * Swaps current piece with held piece
 */
function playerHold() {
    const temp = player.matrix;
    player.matrix = player.holdMatrix;
    player.holdMatrix = temp;
    
    if (player.matrix === null) {
        player.matrix = player.nextMatrix;
        player.nextMatrix = getRandomPiece();
    }
    
    player.pos.y = 0;
    player.pos.x = (arena[0].length / 2 | 0) - (player.matrix[0].length / 2 | 0);
    
    playSound('hold');
}

/**
 * Rotates the current piece with wall kick support
 */
function playerRotate(dir) {
    const pos = player.pos.x;
    let offset = 1;
    rotate(player.matrix, dir);
    while (collide(arena, player)) {
        player.pos.x += offset;
        offset = -(offset + (offset > 0 ? 1 : -1));
        if (offset > player.matrix[0].length) {
            rotate(player.matrix, -dir);
            player.pos.x = pos;
            return;
        }
    }
    playSound('rotate');
}

/**
 * Rotates a piece matrix 90 degrees
 */
function rotate(matrix, dir) {
    for (let y = 0; y < matrix.length; ++y) {
        for (let x = 0; x < y; ++x) {
            [matrix[x][y], matrix[y][x]] = [matrix[y][x], matrix[x][y]];
        }
    }
    if (dir > 0) {
        matrix.forEach(row => row.reverse());
    } else {
        matrix.reverse();
    }
}

/**
 * Resets player piece to starting state
 */
function playerReset() {
    if (!player.nextMatrix) {
        player.nextMatrix = getRandomPiece();
    }

    player.matrix = player.nextMatrix;
    player.nextMatrix = getRandomPiece();
    
    player.pos.y = 0;
    player.pos.x = (arena[0].length / 2 | 0) - (player.matrix[0].length / 2 | 0);
    
    if (collide(arena, player)) {
        triggerGameOver();
        return;
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
    gameOverSoundPlayed = false;  // Reset flag so sound plays once
    playSound('gameOver');
    
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('tetrisHighScore', highScore);
    }
    
    showGameOverModal();
}

// ============================================
// UI & STATS
// ============================================

/**
 * Updates all on-screen statistics
 */
function updateStats() {
    document.getElementById('score').innerText = score;
    document.getElementById('level').innerText = level;
    document.getElementById('lines').innerText = lines;
    document.getElementById('highScore').innerText = highScore;
}

/**
 * Displays game over modal
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
    gameOverSoundPlayed = false;
    isPaused = false;
    player.nextMatrix = null;
    player.holdMatrix = null;
    document.getElementById('gameOverModal').style.display = 'none';
    document.getElementById('pauseBtn').innerText = 'Pause';
    document.getElementById('pauseOverlay').style.display = 'none';
    dropCounter = 0;
    lastTime = 0;
    playerReset();
    updateStats();
    update();
}

/**
 * Cycles through available themes
 */
function changeTheme() {
    const themes = ['dark', 'light', 'neon'];
    const currentIndex = themes.indexOf(currentTheme);
    currentTheme = themes[(currentIndex + 1) % themes.length];
    localStorage.setItem('tetrisTheme', currentTheme);
    applyTheme();
}

/**
 * Applies the current theme
 */
function applyTheme() {
    document.body.setAttribute('data-theme', currentTheme);
}

// ============================================
// SOUND EFFECTS
// ============================================

/**
 * Plays a sound effect using Web Audio API
 */
function playSound(type) {
    // Only play if not muted
    if (document.getElementById('soundToggle').checked === false) return;
    
    // Game over sound should only play once
    if (type === 'gameOver' && gameOverSoundPlayed) return;
    if (type === 'gameOver') gameOverSoundPlayed = true;
    
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const now = audioContext.currentTime;
        
        if (type === 'clear') {
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
        // Audio context not available
    }
}

// ============================================
// MAIN GAME LOOP & INPUT
// ============================================

let dropCounter = 0;
let lastTime = 0;

/**
 * Main game loop
 */
function update(time = 0) {
    const deltaTime = time - lastTime;
    lastTime = time;

    if (!gameStarted) {
        draw();
        requestAnimationFrame(update);
        return;
    }

    if (gameOver) {
        draw();
        return;
    }

    if (isPaused) {
        draw();
        requestAnimationFrame(update);
        return;
    }

    dropCounter += deltaTime;
    if (dropCounter > dropInterval) {
        playerDrop();
    }

    draw();
    requestAnimationFrame(update);
}

/**
 * Keyboard input handler
 */
document.addEventListener('keydown', event => {
    if (gameOver) return;
    
    if (event.key === 'p' || event.key === 'P') {
        event.preventDefault();
        togglePause();
    } else if (!isPaused) {
        if (event.key === 'ArrowLeft') {
            playerMove(-1);
        } else if (event.key === 'ArrowRight') {
            playerMove(1);
        } else if (event.key === 'ArrowDown') {
            playerDrop();
        } else if (event.key === 'ArrowUp') {
            playerRotate(1);  // Up arrow = clockwise rotate
        } else if (event.key.toLowerCase() === 'q') {
            playerRotate(-1);  // Q = counter-clockwise
        } else if (event.key.toLowerCase() === 'e') {
            playerRotate(1);   // E = clockwise
        } else if (event.key === ' ') {
            event.preventDefault();
            playerHardDrop();  // Space = hard drop
        } else if (event.key.toLowerCase() === 'z') {
            playerHold();
        }
    }
});

let touchStartX = 0;
let touchStartY = 0;

/**
 * Mobile gesture controls (active only in mobile mode):
 * swipe left/right = move, swipe down = soft drop, swipe up = hard drop,
 * tap = rotate, double tap = hold.
 */
canvas.addEventListener('touchstart', (e) => {
    if (gameMode !== 'mobile') return;
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
}, { passive: true });

canvas.addEventListener('touchend', (e) => {
    if (gameMode !== 'mobile' || gameOver || isPaused) return;
    const touch = e.changedTouches[0];
    const diffX = touch.clientX - touchStartX;
    const diffY = touch.clientY - touchStartY;
    const absX = Math.abs(diffX);
    const absY = Math.abs(diffY);
    const now = Date.now();
    const isTap = absX < 12 && absY < 12;

    if (isTap) {
        if (now - lastTapTime < 300) {
            playerHold();
            lastTapTime = 0;
        } else {
            playerRotate(1);
            lastTapTime = now;
        }
        return;
    }

    if (absX > absY) {
        if (diffX > 24) playerMove(1);
        if (diffX < -24) playerMove(-1);
    } else {
        if (diffY > 24) playerDrop();
        if (diffY < -24) playerHardDrop();
    }
}, { passive: true });

function setGameMode(mode) {
    gameMode = mode;
    gameStarted = true;
    document.body.setAttribute('data-mode', mode);
    const modal = document.getElementById('modeModal');
    if (modal) modal.style.display = 'none';
    resizeCanvases();
    update();
}

function setupModeSelector() {
    const desktopBtn = document.getElementById('desktopModeBtn');
    const mobileBtn = document.getElementById('mobileModeBtn');
    if (!desktopBtn || !mobileBtn) {
        setGameMode('desktop');
        return;
    }

    desktopBtn.addEventListener('click', () => setGameMode('desktop'));
    mobileBtn.addEventListener('click', () => setGameMode('mobile'));
}

// ============================================
// INITIALIZATION
// ============================================

applyTheme();
resizeCanvases();
window.addEventListener('resize', resizeCanvases);
window.addEventListener('orientationchange', resizeCanvases);
setupModeSelector();
playerReset();
updateStats();
update();
