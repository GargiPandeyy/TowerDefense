// get canvas and context
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// game variables
let gameRunning = false;
let fps = 0;
let lastTime = 0;
let enemies = [];
let towers = [];
let bullets = [];
let selectedTowerType = 'basic';
let previewTower = null;
let kills = 0;
let money = 400;
let health = 30;
let currentWave = 1;
let waveInProgress = false;
let waveSpawnTimer = 0;
let enemiesSpawned = 0;
let enemiesPerWave = 5;
let maxWaves = 10;
let gameWon = false;
let showTutorial = true;
let tutorialStep = 0;

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
    constructor(x, y, type = 'basic', waveMultiplier = 1) {
        this.x = x;
        this.y = y;
        this.type = type;
        this.pathIndex = 0;
        this.waveMultiplier = waveMultiplier;
        
        // set stats based on type with wave scaling
        if (type === 'fast') {
            this.health = Math.floor(30 * (1 + waveMultiplier * 0.2));
            this.maxHealth = this.health;
            this.speed = 2 + (waveMultiplier * 0.1);
            this.reward = Math.floor(15 * (1 + waveMultiplier * 0.3));
            this.color = '#FFD700'; // gold color
            this.attackDamage = 5;
            this.attackRange = 30;
            this.attackRate = 1000; // 1 second
        } else if (type === 'tank') {
            this.health = Math.floor(100 * (1 + waveMultiplier * 0.3));
            this.maxHealth = this.health;
            this.speed = Math.max(0.5 - (waveMultiplier * 0.02), 0.2);
            this.reward = Math.floor(25 * (1 + waveMultiplier * 0.4));
            this.color = '#8B4513'; // brown color
            this.attackDamage = 15;
            this.attackRange = 40;
            this.attackRate = 1500; // 1.5 seconds
        } else {
            // basic enemy
            this.health = Math.floor(50 * (1 + waveMultiplier * 0.25));
            this.maxHealth = this.health;
            this.speed = 1 + (waveMultiplier * 0.05);
            this.reward = Math.floor(10 * (1 + waveMultiplier * 0.2));
            this.color = '#FF6B6B'; // red color
            this.attackDamage = 8;
            this.attackRange = 35;
            this.attackRate = 1200; // 1.2 seconds
        }

        this.lastAttackTime = 0;
        this.isAttackingTower = false;
    }
    
    // update enemy position
    update() {
        if (this.pathIndex >= path.length - 1) {
            // reached end - reduce player health
            health--;
            console.log(`enemy reached end! health: ${health}`);
            return 'reached_end';
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
    
    // find and attack nearby towers
    attackNearbyTowers() {
        const currentTime = Date.now();
        if (currentTime - this.lastAttackTime < this.attackRate) {
            return; // can't attack yet
        }

        // find closest tower in range
        let closestTower = null;
        let closestDistance = this.attackRange;

        towers.forEach(tower => {
            const dx = tower.x - this.x;
            const dy = tower.y - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance <= this.attackRange && distance < closestDistance) {
                closestTower = tower;
                closestDistance = distance;
            }
        });

        if (closestTower) {
            closestTower.health -= this.attackDamage;
            this.lastAttackTime = currentTime;
            this.isAttackingTower = true;
            console.log(`${this.type} enemy attacked tower! damage: ${this.attackDamage}, tower health: ${closestTower.health}`);
        } else {
            this.isAttackingTower = false;
        }
    }

    // draw the enemy
    draw() {
        // draw enemy body
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, 12, 0, 2 * Math.PI);
        ctx.fill();

        // draw attack indicator if attacking tower
        if (this.isAttackingTower) {
            ctx.strokeStyle = '#FF0000';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(this.x, this.y, 15, 0, 2 * Math.PI);
            ctx.stroke();
        }

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

// tower class
class Tower {
    constructor(x, y, type = 'basic') {
        this.x = x;
        this.y = y;
        this.type = type;
        
        // set stats based on type
        if (type === 'sniper') {
            this.damage = 40;
            this.range = 200;
            this.fireRate = 2000; // milliseconds
            this.cost = 100;
            this.health = 150;
            this.maxHealth = 150;
            this.color = '#4169E1'; // royal blue
        } else if (type === 'splash') {
            this.damage = 15;
            this.range = 80;
            this.fireRate = 1500;
            this.cost = 120;
            this.splashRadius = 50;
            this.health = 120;
            this.maxHealth = 120;
            this.color = '#32CD32'; // lime green
        } else {
            // basic tower
            this.damage = 10;
            this.range = 100;
            this.fireRate = 1000;
            this.cost = 50;
            this.health = 100;
            this.maxHealth = 100;
            this.color = '#FF6347'; // tomato red
        }

        this.lastFireTime = 0;
        this.showRange = false;
        this.level = 1;
        this.upgradeCost = Math.floor(this.cost * 0.5);
    }
    
    // draw the tower
    draw() {
        // draw range circle if hovering
        if (this.showRange) {
            ctx.strokeStyle = 'rgba(255, 255, 0, 0.5)'; // semi-transparent yellow
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.range, 0, 2 * Math.PI);
            ctx.stroke();
        }

        // draw tower body
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x - 15, this.y - 15, 30, 30);

        // draw tower border
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.strokeRect(this.x - 15, this.y - 15, 30, 30);

        // draw level indicator
        ctx.fillStyle = 'white';
        ctx.font = '12px Arial';
        ctx.fillText(this.level.toString(), this.x - 5, this.y + 5);

        // draw health bar
        const barWidth = 30;
        const barHeight = 4;
        const barX = this.x - barWidth/2;
        const barY = this.y - 25;

        // background (red)
        ctx.fillStyle = '#FF0000';
        ctx.fillRect(barX, barY, barWidth, barHeight);

        // health (green)
        const healthPercent = this.health / this.maxHealth;
        ctx.fillStyle = '#00FF00';
        ctx.fillRect(barX, barY, barWidth * healthPercent, barHeight);
    }
    
    // draw preview (semi-transparent)
    drawPreview() {
        // draw range preview
        ctx.strokeStyle = 'rgba(255, 255, 0, 0.3)'; // very transparent yellow
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.range, 0, 2 * Math.PI);
        ctx.stroke();
        
        ctx.fillStyle = this.color + '80'; // add transparency
        ctx.fillRect(this.x - 15, this.y - 15, 30, 30);
        
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.strokeRect(this.x - 15, this.y - 15, 30, 30);
    }
    
    // upgrade tower
    upgrade() {
        if (money >= this.upgradeCost) {
            money -= this.upgradeCost;
            this.level++;
            this.damage = Math.floor(this.damage * 1.3);
            this.range = Math.floor(this.range * 1.1);
            this.fireRate = Math.floor(this.fireRate * 0.9);
            this.maxHealth = Math.floor(this.maxHealth * 1.2);
            this.health = this.maxHealth; // fully heal on upgrade
            this.upgradeCost = Math.floor(this.upgradeCost * 1.5);
            console.log(`tower upgraded to level ${this.level}`);
            return true;
        }
        return false;
    }
    
    // find target enemy
    findTarget() {
        let closestEnemy = null;
        let closestDistance = this.range;
        
        enemies.forEach(enemy => {
            const dx = enemy.x - this.x;
            const dy = enemy.y - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance <= this.range && distance < closestDistance) {
                closestEnemy = enemy;
                closestDistance = distance;
            }
        });
        
        return closestEnemy;
    }
    
    // shoot at target
    shoot() {
        const currentTime = Date.now();
        if (currentTime - this.lastFireTime >= this.fireRate) {
            const target = this.findTarget();
            if (target) {
                const splashRadius = this.splashRadius || 0;
                const bullet = new Bullet(this.x, this.y, target.x, target.y, this.damage, splashRadius);
                bullets.push(bullet);
                this.lastFireTime = currentTime;
            }
        }
    }
}

// bullet class
class Bullet {
    constructor(x, y, targetX, targetY, damage, splashRadius = 0) {
        this.x = x;
        this.y = y;
        this.targetX = targetX;
        this.targetY = targetY;
        this.damage = damage;
        this.splashRadius = splashRadius;
        this.speed = 5;
        
        // calculate direction
        const dx = targetX - x;
        const dy = targetY - y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        this.vx = (dx / distance) * this.speed;
        this.vy = (dy / distance) * this.speed;
    }
    
    // update bullet position
    update() {
        this.x += this.vx;
        this.y += this.vy;
    }
    
    // draw bullet
    draw() {
        if (this.splashRadius > 0) {
            // splash bullet - green
            ctx.fillStyle = '#00FF00';
        } else {
            // regular bullet - yellow
            ctx.fillStyle = '#FFFF00';
        }
        ctx.beginPath();
        ctx.arc(this.x, this.y, 3, 0, 2 * Math.PI);
        ctx.fill();
    }
    
    // check if bullet reached target
    reachedTarget() {
        const dx = this.targetX - this.x;
        const dy = this.targetY - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        return distance < 5;
    }
    
    // apply splash damage
    applySplashDamage() {
        if (this.splashRadius > 0) {
            // draw splash effect
            ctx.strokeStyle = 'rgba(255, 255, 0, 0.8)';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.splashRadius, 0, 2 * Math.PI);
            ctx.stroke();
            
            enemies.forEach(enemy => {
                const dx = enemy.x - this.x;
                const dy = enemy.y - this.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance <= this.splashRadius) {
                    enemy.health -= this.damage;
                    console.log(`splash damage: ${this.damage} to enemy`);
                }
            });
        } else {
            // single target damage
            enemies.forEach(enemy => {
                const dx = enemy.x - this.x;
                const dy = enemy.y - this.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < 10) {
                    enemy.health -= this.damage;
                    console.log(`damage: ${this.damage} to enemy`);
                }
            });
        }
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
    const nextWaveBtn = document.getElementById('nextWaveBtn');
    const tutorialBtn = document.getElementById('tutorialBtn');
    
    startBtn.addEventListener('click', startGame);
    pauseBtn.addEventListener('click', pauseGame);
    nextWaveBtn.addEventListener('click', startWave);
    tutorialBtn.addEventListener('click', () => {
        showTutorial = true;
        tutorialStep = 0;
    });
    
    // add mouse events for tower placement
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('click', handleMouseClick);
    canvas.addEventListener('contextmenu', handleRightClick);
    
    // add tower selection buttons
    const basicTowerBtn = document.getElementById('basicTowerBtn');
    const sniperTowerBtn = document.getElementById('sniperTowerBtn');
    const splashTowerBtn = document.getElementById('splashTowerBtn');
    
    basicTowerBtn.addEventListener('click', () => selectTowerType('basic'));
    sniperTowerBtn.addEventListener('click', () => selectTowerType('sniper'));
    splashTowerBtn.addEventListener('click', () => selectTowerType('splash'));
}

// start game
function startGame() {
    gameRunning = true;
    console.log('game started');
    
    // start first wave
    startWave();
}

// pause game
function pauseGame() {
    gameRunning = false;
    console.log('game paused');
}

// select tower type
function selectTowerType(type) {
    selectedTowerType = type;
    
    // update button styles
    document.querySelectorAll('.tower-btn').forEach(btn => btn.classList.remove('active'));
    
    if (type === 'basic') {
        document.getElementById('basicTowerBtn').classList.add('active');
    } else if (type === 'sniper') {
        document.getElementById('sniperTowerBtn').classList.add('active');
    } else if (type === 'splash') {
        document.getElementById('splashTowerBtn').classList.add('active');
    }
    
    console.log(`selected tower type: ${type}`);
}

// handle mouse move for tower preview
function handleMouseMove(event) {
    const rect = canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;
    
    // convert to grid coordinates
    const gridPos = pixelToGrid(mouseX, mouseY);
    const pixelPos = gridToPixel(gridPos.x, gridPos.y);
    
    // create preview tower
    previewTower = new Tower(pixelPos.x + cellWidth/2, pixelPos.y + cellHeight/2, selectedTowerType);
    
    // check if hovering over existing tower
    const hoveredTower = getTowerAtPosition(mouseX, mouseY);
    if (hoveredTower) {
        hoveredTower.showRange = true;
    } else {
        // hide range for all towers
        towers.forEach(tower => tower.showRange = false);
    }
}

// get tower at mouse position
function getTowerAtPosition(mouseX, mouseY) {
    return towers.find(tower => {
        const dx = mouseX - tower.x;
        const dy = mouseY - tower.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        return distance <= 15; // tower radius
    });
}

// handle mouse click for tower placement
function handleMouseClick(event) {
    // check tutorial first
    if (handleTutorialClick(event)) {
        return;
    }
    
    const rect = canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;
    
    // convert to grid coordinates
    const gridPos = pixelToGrid(mouseX, mouseY);
    const pixelPos = gridToPixel(gridPos.x, gridPos.y);
    
    // check if position is valid (not on path)
    const isValidPosition = !isOnPath(gridPos.x, gridPos.y);
    
    if (isValidPosition) {
        // create tower to check cost
        const tower = new Tower(pixelPos.x + cellWidth/2, pixelPos.y + cellHeight/2, selectedTowerType);

        // check if player can afford tower
        if (money >= tower.cost) {
            towers.push(tower);
            money -= tower.cost;
            console.log(`placed ${selectedTowerType} tower at (${gridPos.x}, ${gridPos.y}) for $${tower.cost}`);
        } else {
            console.log(`not enough money! need $${tower.cost}, have $${money}`);
        }
    }
}

// check if grid position is on the path
function isOnPath(gridX, gridY) {
    return path.some(point => point.x === gridX && point.y === gridY);
}

// handle right click for tower upgrade
function handleRightClick(event) {
    event.preventDefault(); // prevent context menu
    
    const rect = canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;
    
    // find tower at mouse position
    const tower = getTowerAtPosition(mouseX, mouseY);
    if (tower) {
        if (tower.upgrade()) {
            console.log(`upgraded tower to level ${tower.level}`);
        } else {
            console.log(`not enough money to upgrade! need $${tower.upgradeCost}`);
        }
    }
}

// tutorial steps
const tutorialSteps = [
    {
        title: "Welcome to Tower Defense!",
        text: "Place towers to stop enemies from reaching the end of the path. Click anywhere on the grid to place a tower.",
        action: "Click to place a tower"
    },
    {
        title: "Tower Types",
        text: "Choose different tower types: Basic (fast, low damage), Sniper (slow, high damage), Splash (area damage).",
        action: "Try different tower types"
    },
    {
        title: "Tower Upgrades",
        text: "Right-click on towers to upgrade them. Upgrades increase damage, range, and fire rate.",
        action: "Right-click a tower to upgrade"
    },
    {
        title: "Waves & Money",
        text: "Kill enemies to earn money. Complete waves to get bonus money. Survive 10 waves to win!",
        action: "Start your first wave"
    }
];

// draw tutorial
function drawTutorial() {
    if (!showTutorial) return;
    
    const step = tutorialSteps[tutorialStep];
    if (!step) return;
    
    // semi-transparent overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // tutorial box
    const boxWidth = 400;
    const boxHeight = 200;
    const boxX = (canvas.width - boxWidth) / 2;
    const boxY = (canvas.height - boxHeight) / 2;
    
    ctx.fillStyle = '#2c3e50';
    ctx.fillRect(boxX, boxY, boxWidth, boxHeight);
    
    ctx.strokeStyle = '#3498db';
    ctx.lineWidth = 3;
    ctx.strokeRect(boxX, boxY, boxWidth, boxHeight);
    
    // title
    ctx.fillStyle = '#3498db';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(step.title, canvas.width / 2, boxY + 40);
    
    // text
    ctx.fillStyle = 'white';
    ctx.font = '16px Arial';
    ctx.fillText(step.text, canvas.width / 2, boxY + 80);
    
    // action
    ctx.fillStyle = '#f39c12';
    ctx.font = 'bold 18px Arial';
    ctx.fillText(step.action, canvas.width / 2, boxY + 120);
    
    // next button
    ctx.fillStyle = '#27ae60';
    ctx.fillRect(boxX + 50, boxY + 140, 100, 40);
    ctx.fillStyle = 'white';
    ctx.font = '16px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Next', boxX + 100, boxY + 165);
    
    // skip button
    ctx.fillStyle = '#e74c3c';
    ctx.fillRect(boxX + 250, boxY + 140, 100, 40);
    ctx.fillStyle = 'white';
    ctx.fillText('Skip', boxX + 300, boxY + 165);
    
    ctx.textAlign = 'left'; // reset alignment
}

// handle tutorial clicks
function handleTutorialClick(event) {
    if (!showTutorial) return;
    
    const rect = canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;
    
    const boxWidth = 400;
    const boxHeight = 200;
    const boxX = (canvas.width - boxWidth) / 2;
    const boxY = (canvas.height - boxHeight) / 2;
    
    // check if click is in tutorial box
    if (mouseX >= boxX && mouseX <= boxX + boxWidth && 
        mouseY >= boxY && mouseY <= boxY + boxHeight) {
        
        // next button
        if (mouseX >= boxX + 50 && mouseX <= boxX + 150 && 
            mouseY >= boxY + 140 && mouseY <= boxY + 180) {
            tutorialStep++;
            if (tutorialStep >= tutorialSteps.length) {
                showTutorial = false;
            }
        }
        
        // skip button
        if (mouseX >= boxX + 250 && mouseX <= boxX + 350 && 
            mouseY >= boxY + 140 && mouseY <= boxY + 180) {
            showTutorial = false;
        }
        
        return true; // tutorial handled the click
    }
    
    return false; // tutorial didn't handle the click
}

// update UI display
function updateUI() {
    document.getElementById('money').textContent = money;
    document.getElementById('health').textContent = health;
    document.getElementById('wave').textContent = currentWave;
    document.getElementById('kills').textContent = kills;
}

// start wave
function startWave() {
    if (!waveInProgress) {
        waveInProgress = true;
        enemiesSpawned = 0;
        waveSpawnTimer = 0;
        console.log(`starting wave ${currentWave}`);
    }
}

// spawn enemy
function spawnEnemy() {
    const startPos = gridToPixel(path[0].x, path[0].y);
    
    // determine enemy type based on wave with better progression
    let enemyType = 'basic';
    const rand = Math.random();
    
    if (currentWave >= 2) {
        if (rand < 0.2) enemyType = 'fast';
    }
    if (currentWave >= 4) {
        if (rand < 0.1) enemyType = 'tank';
        else if (rand < 0.4) enemyType = 'fast';
    }
    if (currentWave >= 7) {
        if (rand < 0.2) enemyType = 'tank';
        else if (rand < 0.5) enemyType = 'fast';
    }
    
    enemies.push(new Enemy(startPos.x + cellWidth/2, startPos.y + cellHeight/2, enemyType, currentWave));
    enemiesSpawned++;
    console.log(`spawned ${enemyType} enemy (${enemiesSpawned}/${enemiesPerWave}) - Wave ${currentWave}`);
}

// check if wave is complete
function checkWaveComplete() {
    if (waveInProgress && enemiesSpawned >= enemiesPerWave && enemies.length === 0) {
        waveInProgress = false;
        
        if (currentWave >= maxWaves) {
            // game won!
            gameWon = true;
            gameRunning = false;
            console.log('VICTORY! All waves completed!');
        } else {
            // next wave
            currentWave++;
            enemiesPerWave = Math.min(enemiesPerWave + 2, 15); // cap at 15 enemies per wave
            money += 50 + (currentWave * 10); // increasing bonus money
            console.log(`wave ${currentWave - 1} complete! bonus: $${50 + (currentWave * 10)}`);
        }
    }
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
    
    // update and draw enemies (iterate backwards to safely remove)
    for (let i = enemies.length - 1; i >= 0; i--) {
        const enemy = enemies[i];
        const result = enemy.update();

        // attack nearby towers
        enemy.attackNearbyTowers();

        // remove dead enemies
        if (enemy.health <= 0) {
            enemies.splice(i, 1);
            kills++;
            money += enemy.reward;
            console.log(`enemy killed! +${enemy.reward} money, total kills: ${kills}, money: ${money}`);
        } else if (result === 'reached_end') {
            // remove enemy that reached end
            enemies.splice(i, 1);
        } else {
            enemy.draw();
        }
    }
    
    // update towers (shooting) and remove destroyed ones
    for (let i = towers.length - 1; i >= 0; i--) {
        const tower = towers[i];

        // remove destroyed towers
        if (tower.health <= 0) {
            towers.splice(i, 1);
            console.log(`Tower destroyed! ${towers.length} towers remaining`);
        } else {
            tower.shoot();
            tower.draw();
        }
    }
    
    // update and draw bullets (iterate backwards to safely remove)
    for (let i = bullets.length - 1; i >= 0; i--) {
        const bullet = bullets[i];
        bullet.update();
        bullet.draw();

        // remove bullets that reached target and apply damage
        if (bullet.reachedTarget()) {
            bullet.applySplashDamage();
            bullets.splice(i, 1);
        }
    }
    
    // draw preview tower
    if (previewTower) {
        previewTower.drawPreview();
    }
    
    // draw tutorial
    drawTutorial();
    
    // draw fps counter
    ctx.fillStyle = 'white';
    ctx.font = '16px Arial';
    ctx.fillText(`FPS: ${fps}`, 10, 25);
    ctx.fillText(`Kills: ${kills}`, 10, 50);
    ctx.fillText(`Money: $${money}`, 10, 75);
    
    // draw wave progress
    if (waveInProgress) {
        ctx.fillText(`Wave ${currentWave}: ${enemiesSpawned}/${enemiesPerWave}`, 10, 100);
        ctx.fillText(`Difficulty: ${Math.floor(currentWave * 1.2)}%`, 10, 120);
    } else if (!gameWon && health > 0) {
        ctx.fillText(`Wave ${currentWave} Complete! Click Next Wave`, 10, 100);
        ctx.fillText(`Bonus Money: +$${50 + (currentWave * 10)}`, 10, 120);
    }
    
    // update UI
    updateUI();
    
    // handle wave spawning
    if (gameRunning && waveInProgress && enemiesSpawned < enemiesPerWave) {
        waveSpawnTimer++;
        if (waveSpawnTimer >= 60) { // spawn every 60 frames (1 second at 60fps)
            spawnEnemy();
            waveSpawnTimer = 0;
        }
    }
    
    // check wave completion
    checkWaveComplete();
    
    // check game over
    if (health <= 0) {
        ctx.fillStyle = 'red';
        ctx.font = '48px Arial';
        ctx.fillText('GAME OVER', canvas.width/2 - 150, canvas.height/2);
        gameRunning = false;
    } else if (gameWon) {
        ctx.fillStyle = 'gold';
        ctx.font = '48px Arial';
        ctx.fillText('VICTORY!', canvas.width/2 - 120, canvas.height/2);
        ctx.font = '24px Arial';
        ctx.fillText(`Waves Completed: ${maxWaves}`, canvas.width/2 - 100, canvas.height/2 + 50);
        ctx.fillText(`Total Kills: ${kills}`, canvas.width/2 - 80, canvas.height/2 + 80);
    } else if (gameRunning) {
        // game is running
        ctx.fillStyle = 'yellow';
        ctx.font = '16px Arial';
        ctx.fillText('GAME RUNNING', 10, 140);
    } else {
        // game is paused
        ctx.fillStyle = 'red';
        ctx.font = '16px Arial';
        ctx.fillText('GAME PAUSED', 10, 140);
    }
    
    // continue loop
    requestAnimationFrame(gameLoop);
}

// start the game when page loads
window.addEventListener('load', init);
