const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;


const mapWidth = 10000;
const mapHeight = 10000;
const MAGNET_DISTANCE = 100;
const MAGNET_SPEED = 2;
let food = [];
const maxFood = 1500;
const TRAP_DISTANCE = 200;

let player;
let enemies = [];
let gameOver = false;

let playerScore = 0;
let aiScores = {};

let mouse = { x: canvas.width / 2, y: canvas.height / 2 };
let framesSinceStart = 0;
let isPaused = false;

document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
        togglePause();
    }
});
function togglePause() {
    if (gameOver) return;

    isPaused = !isPaused;

    if (isPaused) {
        showPauseMenu();
    } else {
        hidePauseMenu();
        requestAnimationFrame(gameLoop);
    }
}
function showPauseMenu() {
    const pauseMenu = document.createElement('div');
    pauseMenu.id = 'pauseMenu';
    pauseMenu.innerHTML = `
        <div class="menu-content">
            <h1>Game Paused</h1>
            <button onclick="quitGame()">Quit Game</button>
        </div>
    `;
    document.body.appendChild(pauseMenu);


    pauseMenu.style.display = 'flex';
    setTimeout(() => {
        pauseMenu.style.opacity = '1';
        pauseMenu.style.transform = 'scale(1)';
    }, 50);
}


function hidePauseMenu() {
    const pauseMenu = document.getElementById('pauseMenu');
    if (pauseMenu) {
        pauseMenu.style.opacity = '0';
        pauseMenu.style.transform = 'scale(0.9)';
        setTimeout(() => {
            pauseMenu.remove();
        }, 300);
    }
}

const pauseMenuStyles = document.createElement('style');
pauseMenuStyles.innerHTML = `
    #pauseMenu {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        display: none;
        justify-content: center;
        align-items: center;
        background: rgba(0, 0, 0, 0.7);
        opacity: 0;
        transition: opacity 0.3s ease, transform 0.3s ease;
        z-index: 1000;
    }
    .menu-content {
        background: white;
        padding: 30px;
        text-align: center;
        border-radius: 10px;
        transform: scale(0.9);
        transition: transform 0.3s ease;
    }
    #pauseMenu h1 {
        margin-bottom: 20px;
    }
    #pauseMenu button {
        margin: 10px;
        padding: 10px 20px;
        font-size: 18px;
        cursor: pointer;
        transition: background 0.3s;
    }
    #pauseMenu button:hover {
        background: #ddd;
    }
`;
document.head.appendChild(pauseMenuStyles);
document.addEventListener('mousemove', (event) => {
    mouse.x = event.clientX;
    mouse.y = event.clientY;
});
document.addEventListener('mousedown', (event) => {
    if (event.button === 0) {
        activateBoost(player);
    }
});
function activateBoost(snake) {
    const currentTime = Date.now();
    if (!snake.isBoosting && currentTime - snake.lastBoostTime >= snake.boostCooldown) {
        snake.isBoosting = true;
        snake.lastBoostTime = currentTime;


        setTimeout(() => {
            snake.isBoosting = false;
        }, snake.boostDuration);
    }
}

function generateAIName(existingNames) {
    const names = ["Rex", "lee", "Zara", "Sly", "Fang", "Flash", "Echo", "Blaze", "Nova", "Spike", "Bash", "Fire", "Thunder", "Ace", "Shadow", "Mystic", "Glimmer", "Venom", "Razor", "Light", "Phantom"];
    let name;
    do {
        name = names[Math.floor(Math.random() * names.length)] + Math.floor(Math.random() * 100);
    } while (existingNames.has(name));
    existingNames.add(name);
    return name;
}


function getRandomColor(existingColors) {
    let color;
    do {
        color = `#${Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')}`;
    } while (existingColors.has(color));
    existingColors.add(color);
    return color;
}


function updateScoreDisplay() {

    document.getElementById('playerScore').textContent = playerScore;


    const currentUser = localStorage.getItem('currentUser');
    let userHighScores = JSON.parse(localStorage.getItem('userHighScores')) || {};
    let highScore = currentUser && userHighScores[currentUser] ? userHighScores[currentUser] : 0;


    if (playerScore > highScore) {
        highScore = playerScore;
        userHighScores[currentUser] = highScore;
        localStorage.setItem('userHighScores', JSON.stringify(userHighScores));
    }


    document.getElementById('highScoreDisplay').textContent = `High Score: ${highScore}`;


    const combinedScores = [...Object.entries(aiScores), ["Player", playerScore]];
    const sortedScores = combinedScores.sort((a, b) => b[1] - a[1]).slice(0, 5);


    const leaderboardDiv = document.getElementById('leaderboard');
    leaderboardDiv.innerHTML = '';

    sortedScores.forEach(([name, score], index) => {
        const scoreEntry = document.createElement('div');
        scoreEntry.classList.add('score-entry');


        const rankNameDiv = document.createElement('div');
        rankNameDiv.classList.add('rank-name');
        rankNameDiv.innerHTML = `<span class="rank">${index + 1}.</span> ${name}`;

        scoreEntry.appendChild(rankNameDiv);


        const scoreSpan = document.createElement('span');
        scoreSpan.textContent = score;
        scoreEntry.appendChild(scoreSpan);

        if (name === "Player") {
            scoreEntry.classList.add('player-highlight');
        }

        leaderboardDiv.appendChild(scoreEntry);
    });
}








function createSnake(x, y, color, name = null) {
    return {
        x: x,
        y: y,
        size: 10,
        visualSize: 10,
        height: 5,
        body: Array.from({ length: 5 }, (_, i) => ({ x: x - i * 20, y: y })),
        speed: 3,
        boostSpeed: 5,
        isBoosting: false,
        boostDuration: 1000,
        boostCooldown: 3000,
        lastBoostTime: 0,
        length: 5,
        growthQueue: 0,
        direction: { x: 0, y: 0 },
        angle: 0,
        color: color,
        name: name || 'Player',
        alive: true
    };
}


function getRandomFoodColor() {
    return `#${Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')}`;
}

function spawnFood() {
    while (food.length < maxFood) {
        let foodX, foodY, dist;
        let isFarEnough;

        do {
            foodX = Math.random() * mapWidth - mapWidth / 2;
            foodY = Math.random() * mapHeight - mapHeight / 2;

            dist = Math.hypot(foodX - player.x, foodY - player.y);
            isFarEnough = dist >= player.size * 15;

            for (let enemy of enemies) {
                if (Math.hypot(foodX - enemy.x, foodY - enemy.y) < enemy.size * 10) {
                    isFarEnough = false;
                    break;
                }
            }
        } while (!isFarEnough);

        food.push({
            x: foodX,
            y: foodY,
            size: 5,
            color: getRandomFoodColor()
        });
    }
}
setInterval(spawnFood, 5000);


function updatePlayer() {
    if (gameOver) return;


    if (checkFoodCollision(player)) {
        player.growthQueue += 1;
    }


    player.angle = Math.atan2(mouse.y - canvas.height / 2, mouse.x - canvas.width / 2);
    let nextX = player.x + Math.cos(player.angle) * player.speed;
    let nextY = player.y + Math.sin(player.angle) * player.speed;


    if (nextX < -mapWidth / 2 || nextX > mapWidth / 2 || nextY < -mapHeight / 2 || nextY > mapHeight / 2) {
        endGame('You hit the boundary and died!');
        return;
    }


    player.x = nextX;
    player.y = nextY;


    player.body.unshift({ x: player.x, y: player.y });
    if (player.growthQueue > 0) {
        player.length += 1;
        player.growthQueue -= 1;
    } else if (player.body.length > player.length) {
        player.body.pop();
    }


    if (framesSinceStart > 10) {
        for (let i = 10; i < player.body.length; i++) {
            if (Math.hypot(player.body[i].x - player.x, player.body[i].y - player.y) < player.size * 0.9) {
                endGame('You collided with yourself.');
                return;
            }
        }
    }


    if (checkCollisionWithEnemies()) {
        endGame('You collided with an enemy snake.');
        return;
    }
}



function updateEnemies() {
    enemies.forEach((enemy) => {
        if (!enemy.alive) return;

        const distanceToPlayer = Math.hypot(player.x - enemy.x, player.y - enemy.y);


        if (distanceToPlayer < TRAP_DISTANCE) {

            enemy.trapMode = true;


            enemy.angle += (Math.random() - 0.5) * 1.0;
            let nextX = enemy.x + Math.cos(enemy.angle) * enemy.speed;
            let nextY = enemy.y + Math.sin(enemy.angle) * enemy.speed;


            enemy.x = nextX;
            enemy.y = nextY;

        } else {

            enemy.trapMode = false;
            enemy.angle += (Math.random() - 0.5) * 0.1;
            let nextX = enemy.x + Math.cos(enemy.angle) * enemy.speed;
            let nextY = enemy.y + Math.sin(enemy.angle) * enemy.speed;


            if (nextX < -mapWidth / 2 + enemy.size || nextX > mapWidth / 2 - enemy.size) {
                enemy.angle = Math.PI - enemy.angle + (Math.random() - 0.5) * 0.5;
                nextX = enemy.x + Math.cos(enemy.angle) * enemy.speed;
            }
            if (nextY < -mapHeight / 2 + enemy.size || nextY > mapHeight / 2 - enemy.size) {
                enemy.angle = -enemy.angle + (Math.random() - 0.5) * 0.5;
                nextY = enemy.y + Math.sin(enemy.angle) * enemy.speed;
            }

            enemy.x = nextX;
            enemy.y = nextY;
        }


        enemy.body.unshift({ x: enemy.x, y: enemy.y });
        if (enemy.growthQueue > 0) {
            enemy.length += 1;
            enemy.growthQueue -= 1;
        } else if (enemy.body.length > enemy.length) {
            enemy.body.pop();
        }


        if (checkFoodCollision(enemy)) {
            enemy.growthQueue += 1;
        }


        if (checkCollisionWithPlayerBody(enemy)) {
            enemy.alive = false;
            dropFoodAtEnemyPosition(enemy);


            setTimeout(() => {
                resetAndRespawnEnemy(enemy);
            }, 500);
        }
    });
}
function activateBoost(snake) {

    if (snake === player && playerScore <= 0) {
        console.log("Not enough score to use boost!");
        return;
    }

    const currentTime = Date.now();
    if (!snake.isBoosting && currentTime - snake.lastBoostTime >= snake.boostCooldown) {
        snake.isBoosting = true;
        snake.lastBoostTime = currentTime;


        snake.originalVisualSize = snake.visualSize;
        snake.visualSize *= 0.8;
        snake.originalHeight = snake.height;
        snake.height *= 0.8;


        snake.originalSpeed = snake.speed;
        snake.speed = snake.boostSpeed;


        snake.boostScoreInterval = setInterval(() => {
            if (snake === player && playerScore > 0) {
                playerScore -= 1;
                updateScoreDisplay();
            }
        }, 100);


        setTimeout(() => {
            snake.isBoosting = false;
            snake.visualSize = snake.originalVisualSize;
            snake.speed = snake.originalSpeed;


            snake.height *= 0.9;


            clearInterval(snake.boostScoreInterval);
        }, snake.boostDuration);
    }
}





function drawSnake(snake) {
    ctx.fillStyle = snake.color;
    for (let i = 0; i < snake.body.length; i++) {
        ctx.beginPath();
        ctx.arc(snake.body[i].x, snake.body[i].y, snake.visualSize, 0, Math.PI * 2);
        ctx.fill();
    }
}

function drawFood() {
    food.forEach(f => {
        ctx.fillStyle = f.color;
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.size, 0, Math.PI * 2);
        ctx.fill();
    });
}

function checkFoodCollision(snake) {
    let ateFood = false;
    for (let i = food.length - 1; i >= 0; i--) {
        let f = food[i];
        let dist = Math.hypot(f.x - snake.x, f.y - snake.y);

        if (dist < snake.size + f.size + 2) {
            food.splice(i, 1);
            spawnFood();
            ateFood = true;
            snake.growthQueue += 1;

            if (snake === player) {
                playerScore += 1;
            } else {
                aiScores[snake.name] = (aiScores[snake.name] || 0) + 1;
            }
            updateScoreDisplay();
        }
    }
    return ateFood;
}
function attractFoodToSnake(foodItem, snake) {
    const dx = snake.x - foodItem.x;
    const dy = snake.y - foodItem.y;
    const distance = Math.hypot(dx, dy);

    if (distance < MAGNET_DISTANCE) {

        foodItem.x += (dx / distance) * MAGNET_SPEED;
        foodItem.y += (dy / distance) * MAGNET_SPEED;
    }
}

function applyMagnetEffect() {
    food.forEach(foodItem => {
        attractFoodToSnake(foodItem, player);

        enemies.forEach(enemy => {
            attractFoodToSnake(foodItem, enemy);
        });
    });
}
function spawnEnemies(count) {
    const usedNames = new Set();
    const usedColors = new Set();
    for (let i = 0; i < count; i++) {
        const aiName = generateAIName(usedNames);
        const aiColor = getRandomColor(usedColors);
        let enemy = createSnake(Math.random() * mapWidth - mapWidth / 2, Math.random() * mapHeight - mapHeight / 2, aiColor, aiName);
        aiScores[aiName] = 0;
        enemy.speed = 1.5;
        enemy.angle = Math.random() * Math.PI * 2;
        enemies.push(enemy);
    }
}


function endGame(message) {
    gameOver = true;

    const currentUser = localStorage.getItem('currentUser');
    let userHighScores = JSON.parse(localStorage.getItem('userHighScores')) || {};


    if (currentUser) {
        const currentScore = playerScore;
        if (currentScore > (userHighScores[currentUser] || 0)) {
            userHighScores[currentUser] = currentScore;
            localStorage.setItem('userHighScores', JSON.stringify(userHighScores));
        }
    }

    showGameOverMessage(message);
}



function restartGame() {
    hidePauseMenu();
    isPaused = false;
    gameOver = false;
    framesSinceStart = 0;
    playerScore = 0;


    player.speed = 2;
    player.isBoosting = false;
    player.lastBoostTime = 0;

    updateScoreDisplay();
    init();

    requestAnimationFrame(gameLoop);
}

function quitGame() {
    window.location.href = 'snakegame.html';
}
function drawBoundaries() {
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 5;
    ctx.strokeRect(-mapWidth / 2, -mapHeight / 2, mapWidth, mapHeight);
}

function checkCollisionWithPlayerBody(enemy) {
    for (let i = 0; i < player.body.length; i++) {
        const segment = player.body[i];
        const dist = Math.hypot(segment.x - enemy.x, segment.y - enemy.y);
        if (dist < enemy.size) {
            return true;
        }
    }
    return false;
}

function dropFoodAtEnemyPosition(enemy) {
    enemy.body.forEach(segment => {
        food.push({
            x: segment.x,
            y: segment.y,
            size: 5,
            color: getRandomFoodColor(),
            visible: false,
            animationProgress: 0
        });
    });
    console.log(`Dropped food at exact positions for ${enemy.name}:`, enemy.body);
}

function resetAndRespawnEnemy(enemy) {

    enemy.x = Math.random() * mapWidth - mapWidth / 2;
    enemy.y = Math.random() * mapHeight - mapHeight / 2;
    enemy.length = 5;
    enemy.growthQueue = 0;
    enemy.body = Array.from({ length: enemy.length }, (_, i) => ({ x: enemy.x - i * 20, y: enemy.y }));
    enemy.alive = true;


    aiScores[enemy.name] = 0;
    updateScoreDisplay();
}

function checkCollisionWithEnemies() {
    for (let enemy of enemies) {
        if (!enemy.alive) continue;

        for (let segment of enemy.body) {
            const dist = Math.hypot(player.x - segment.x, player.y - segment.y);
            if (dist < player.size) {
                return true;
            }
        }
    }
    return false;
}
function showGameOverMessage(message) {

    let messageContainer = document.getElementById('gameOverMessage');
    if (!messageContainer) {
        messageContainer = document.createElement('div');
        messageContainer.id = 'gameOverMessage';
        messageContainer.innerHTML = `
            <h1>${message}</h1>
            <button onclick="quitGame()">Quit Game</button>
        `;
        document.body.appendChild(messageContainer);
    } else {
        messageContainer.querySelector('h1').textContent = message;
    }


    setTimeout(() => {
        messageContainer.classList.add('show');
    }, 50);
}
function gameLoop() {
    if (gameOver || isPaused) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(-player.x + canvas.width / 2, -player.y + canvas.height / 2);

    drawBoundaries();
    applyMagnetEffect();
    drawFood();
    drawSnake(player);
    checkFoodCollision(player);

    updateEnemies();
    enemies.forEach(enemy => {
        drawSnake(enemy);
        checkFoodCollision(enemy);
    });

    ctx.restore();

    updatePlayer();

    requestAnimationFrame(gameLoop);
}
function init() {
    food = [];
    enemies = [];
    aiScores = {};
    player = createSnake(canvas.width / 2, canvas.height / 2, 'yellow');
    player.length = 5;
    framesSinceStart = 0;
    spawnFood();
    spawnEnemies(21);
    gameOver = false;
    gameLoop();
}

init();
