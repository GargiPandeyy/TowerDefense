// get canvas and context
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// game variables
let gameRunning = false;
let fps = 0;
let lastTime = 0;

// grid variables
const gridSize = 20; // 20x20 grid
const cellWidth = canvas.width / gridSize;
const cellHeight = canvas.height / gridSize;

// initialize game
function init() {
    console.log('game initialized');
    setupEventListeners();
    gameLoop();
}

// setup event listeners
function setupEventListeners() {
    const startBtn = document.getElementById('startBtn');
    const pauseBtn = document.getElementById('pauseBtn');
    
    startBtn.addEventListener('click', startGame);
    pauseBtn.addEventListener('click', pauseGame);
}

// start game
function startGame() {
    gameRunning = true;
    console.log('game started');
}

// pause game
function pauseGame() {
    gameRunning = false;
    console.log('game paused');
}

// convert pixel coordinates to grid coordinates
function pixelToGrid(x, y) {
    const gridX = Math.floor(x / cellWidth);
    const gridY = Math.floor(y / cellHeight);
    return { x: gridX, y: gridY };
}

// convert grid coordinates to pixel coordinates
function gridToPixel(gridX, gridY) {
    const pixelX = gridX * cellWidth;
    const pixelY = gridY * cellHeight;
    return { x: pixelX, y: pixelY };
}

// draw the grid
function drawGrid() {
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    
    // draw vertical lines
    for (let i = 0; i <= gridSize; i++) {
        const x = i * cellWidth;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
    }
    
    // draw horizontal lines
    for (let i = 0; i <= gridSize; i++) {
        const y = i * cellHeight;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
    }
}

// main game loop
function gameLoop(currentTime) {
    // calculate fps
    if (currentTime - lastTime >= 1000) {
        fps = Math.round(1000 / (currentTime - lastTime));
        lastTime = currentTime;
    }
    
    // clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // draw grid
    drawGrid();
    
    // draw fps counter
    ctx.fillStyle = 'white';
    ctx.font = '16px Arial';
    ctx.fillText(`FPS: ${fps}`, 10, 25);
    
    // draw game elements (will add later)
    if (gameRunning) {
        // game is running
        ctx.fillStyle = 'yellow';
        ctx.fillText('GAME RUNNING', 10, 50);
    } else {
        // game is paused
        ctx.fillStyle = 'red';
        ctx.fillText('GAME PAUSED', 10, 50);
    }
    
    // continue loop
    requestAnimationFrame(gameLoop);
}

// start the game when page loads
window.addEventListener('load', init);
