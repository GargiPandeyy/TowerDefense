// get canvas and context
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// game variables
let gameRunning = false;
let fps = 0;
let lastTime = 0;
let enemies = [];

// grid variables
const gridSize = 20; // 20x20 grid
const cellWidth = canvas.width / gridSize;
const cellHeight = canvas.height / gridSize;

// path variables
const path = [
    { x: 0, y: 10 },   // start point
    { x: 5, y: 10 },
    { x: 5, y: 5 },
    { x: 15, y: 5 },
    { x: 15, y: 15 },
    { x: 19, y: 15 }   // end point
];

// enemy class
class Enemy {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.health = 50;
        this.maxHealth = 50;
        this.speed = 1;
        this.pathIndex = 0;
        this.reward = 10;
    }
    
    // update enemy position
    update() {
        if (this.pathIndex >= path.length - 1) {
            return; // reached end
        }
        
        // get current target
        const target = path[this.pathIndex + 1];
        const targetPos = gridToPixel(target.x, target.y);
        const targetX = targetPos.x + cellWidth/2;
        const targetY = targetPos.y + cellHeight/2;
        
        // calculate direction
        const dx = targetX - this.x;
        const dy = targetY - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < 2) {
            // reached waypoint, move to next
            this.pathIndex++;
        } else {
            // move towards target
            this.x += (dx / distance) * this.speed;
            this.y += (dy / distance) * this.speed;
        }
    }
    
    // draw the enemy
    draw() {
        // draw enemy body
        ctx.fillStyle = '#FF6B6B'; // red color
        ctx.beginPath();
        ctx.arc(this.x, this.y, 12, 0, 2 * Math.PI);
        ctx.fill();
        
        // draw health bar
        const barWidth = 20;
        const barHeight = 4;
        const barX = this.x - barWidth/2;
        const barY = this.y - 20;
        
        // background (red)
        ctx.fillStyle = '#FF0000';
        ctx.fillRect(barX, barY, barWidth, barHeight);
        
        // health (green)
        const healthPercent = this.health / this.maxHealth;
        ctx.fillStyle = '#00FF00';
        ctx.fillRect(barX, barY, barWidth * healthPercent, barHeight);
    }
}

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
    
    // create test enemy at start point
    const startPos = gridToPixel(path[0].x, path[0].y);
    enemies.push(new Enemy(startPos.x + cellWidth/2, startPos.y + cellHeight/2));
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

// draw the enemy path
function drawPath() {
    ctx.strokeStyle = '#8B4513'; // brown color
    ctx.lineWidth = 8;
    ctx.lineCap = 'round';
    
    // draw path lines
    for (let i = 0; i < path.length - 1; i++) {
        const start = gridToPixel(path[i].x, path[i].y);
        const end = gridToPixel(path[i + 1].x, path[i + 1].y);
        
        ctx.beginPath();
        ctx.moveTo(start.x + cellWidth/2, start.y + cellHeight/2);
        ctx.lineTo(end.x + cellWidth/2, end.y + cellHeight/2);
        ctx.stroke();
    }
    
    // draw start point
    const startPos = gridToPixel(path[0].x, path[0].y);
    ctx.fillStyle = '#228B22'; // green for start
    ctx.beginPath();
    ctx.arc(startPos.x + cellWidth/2, startPos.y + cellHeight/2, 8, 0, 2 * Math.PI);
    ctx.fill();
    
    // draw end point
    const endPos = gridToPixel(path[path.length - 1].x, path[path.length - 1].y);
    ctx.fillStyle = '#DC143C'; // red for end
    ctx.beginPath();
    ctx.arc(endPos.x + cellWidth/2, endPos.y + cellHeight/2, 8, 0, 2 * Math.PI);
    ctx.fill();
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
    
    // draw path
    drawPath();
    
    // update and draw enemies
    enemies.forEach(enemy => {
        enemy.update();
        enemy.draw();
    });
    
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
