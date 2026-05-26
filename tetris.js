const canvas = document.getElementById('tetris');
const context = canvas.getContext('2d');
context.scale(24, 24);

// New Canvas elements for the Next Piece Preview
const nextCanvas = document.getElementById('nextCanvas');
const nextContext = nextCanvas.getContext('2d');
nextContext.scale(24, 24); // Scale is the same, but canvas is smaller (5x5 grid)

const arena = createMatrix(10, 20);

// Game progression variables
let score = 0;
let lines = 0;
let level = 1;
let dropInterval = 1000; // Starts at 1 second (1000ms)

const SHAPES = 'ILJOTSZ';
const COLORS = [
    null,
    '#FF0D72', '#0DC2FF', '#0DFF72',
    '#F538FF', '#FF8E0D', '#FFE138', '#3877FF'
];

const player = {
    pos: {x: 0, y: 0},
    matrix: null,
    nextMatrix: null // Holds the upcoming piece shape
};

function createMatrix(w, h) {
    const matrix = [];
    while (h--) { matrix.push(new Array(w).fill(0)); }
    return matrix;
}

function createPiece(type) {
    if (type === 'I') return [[0,1,0,0], [0,1,0,0], [0,1,0,0], [0,1,0,0]];
    if (type === 'L') return [[0,2,0], [0,2,0], [0,2,2]];
    if (type === 'J') return [[0,3,0], [0,3,0], [3,3,0]];
    if (type === 'O') return [[4,4], [4,4]];
    if (type === 'Z') return [[5,5,0], [0,5,5], [0,0,0]];
    if (type === 'S') return [[0,6,6], [6,6,0], [0,0,0]];
    if (type === 'T') return [[0,7,0], [7,7,7], [0,0,0]];
}

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

function merge(arena, player) {
    player.matrix.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) {
                arena[y + player.pos.y][x + player.pos.x] = value;
            }
        });
    });
}

// Universal draw function that works for both canvases
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

function draw() {
    // Clear main arena
    context.fillStyle = '#111';
    context.fillRect(0, 0, canvas.width, canvas.height);
    drawMatrix(arena, {x: 0, y: 0}, context);
    drawMatrix(player.matrix, player.pos, context);

    // Clear preview canvas
    nextContext.fillStyle = '#111';
    nextContext.fillRect(0, 0, nextCanvas.width, nextCanvas.height);
    
    // Center the preview piece in the 5x5 preview window
    const pX = (5 - player.nextMatrix[0].length) / 2;
    const pY = (5 - player.nextMatrix.length) / 2;
    drawMatrix(player.nextMatrix, {x: pX, y: pY}, nextContext);
}

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
        // Classic Tetris scoring mechanics
        const lineValues = [0, 40, 100, 300, 1200];
        score += lineValues[rowCount] * level;
        
        // Level up every 10 lines
        level = Math.floor(lines / 10) + 1;
        
        // Make the game faster! Minimum interval of 100ms
        dropInterval = Math.max(100, 1000 - (level - 1) * 100);
    }
}

function playerMove(dir) {
    player.pos.x += dir;
    if (collide(arena, player)) {
        player.pos.x -= dir;
    }
}

function playerReset() {
    // Initialize next piece if it doesn't exist yet
    if (!player.nextMatrix) {
        player.nextMatrix = createPiece(SHAPES[SHAPES.length * Math.random() | 0]);
    }

    // Current piece becomes the next piece
    player.matrix = player.nextMatrix;
    // Roll a new upcoming piece
    player.nextMatrix = createPiece(SHAPES[SHAPES.length * Math.random() | 0]);
    
    player.pos.y = 0;
    player.pos.x = (arena[0].length / 2 | 0) - (player.matrix[0].length / 2 | 0);
    
    if (collide(arena, player)) {
        // Game Over - Reset Everything
        arena.forEach(row => row.fill(0));
        score = 0;
        lines = 0;
        level = 1;
        dropInterval = 1000;
        player.nextMatrix = null;
        playerReset();
    }
}

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
}

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

function updateStats() {
    document.getElementById('score').innerText = score;
    document.getElementById('level').innerText = level;
    document.getElementById('lines').innerText = lines;
}

let dropCounter = 0;
let lastTime = 0;

function update(time = 0) {
    const deltaTime = time - lastTime;
    lastTime = time;

    dropCounter += deltaTime;
    if (dropCounter > dropInterval) {
        playerDrop();
    }

    draw();
    requestAnimationFrame(update);
}

document.addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft') {
        playerMove(-1);
    } else if (event.key === 'ArrowRight') {
        playerMove(1);
    } else if (event.key === 'ArrowDown') {
        playerDrop();
    } else if (event.key === 'q' || event.key === 'Q') {
        playerRotate(-1);
    } else if (event.key === 'e' || event.key === 'E') {
        playerRotate(1);
    }
});

playerReset();
updateStats();
update();