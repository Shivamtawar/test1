"use strict";

const TILE_SIZE = 28;
const MAZE_WIDTH = 21;
const MAZE_HEIGHT = 21;
const CANVAS_SIZE = TILE_SIZE * MAZE_WIDTH;
const PLAYER_SPEED = 4.2;
const RESPAWN_DELAY = 1.15;
const COLLISION_DISTANCE = 0.48;
const GHOST_PEN = {
  left: 8,
  right: 12,
  top: 7,
  bottom: 11,
  exit: { x: 10, y: 11 }
};
const GHOST_RELEASE_SCORES = [100, 200, 300, 400];
const DIRECTIONS = {
  up: { x: 0, y: -1 },
  right: { x: 1, y: 0 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  none: { x: 0, y: 0 }
};
const KEY_DIRECTIONS = {
  ArrowUp: "up",
  ArrowRight: "right",
  ArrowDown: "down",
  ArrowLeft: "left"
};
const GHOST_CONFIG = [
  { marker: "R", name: "Red", color: "#ff4568", speed: 3.1, spawn: { x: 9, y: 9 } },
  { marker: "I", name: "Pink", color: "#ff9ed5", speed: 3.0, spawn: { x: 10, y: 9 } },
  { marker: "B", name: "Blue", color: "#42d5ff", speed: 2.9, spawn: { x: 11, y: 9 } },
  { marker: "O", name: "Orange", color: "#ffad43", speed: 2.8, spawn: { x: 10, y: 10 } }
];

const canvas = document.getElementById("game-canvas");
const context = canvas.getContext("2d");
const scoreValue = document.getElementById("score-value");
const livesValue = document.getElementById("lives-value");
const releasedGhostsValue = document.getElementById("released-ghosts-value");
const gameStatus = document.getElementById("game-status");
const terminalScreen = document.getElementById("terminal-screen");
const terminalTitle = document.getElementById("terminal-title");
const finalScore = document.getElementById("final-score");
const restartButton = document.getElementById("restart-button");

canvas.width = CANVAS_SIZE;
canvas.height = CANVAS_SIZE;

let maze;
let player;
let ghosts;
let score;
let lives;
let gameState;
let hasStarted;
let nextGhostReleaseIndex;
let respawnTimer;
let lastFrameTime = 0;

function buildMazeRows() {
  const rows = Array.from({ length: MAZE_HEIGHT }, () =>
    Array.from({ length: MAZE_WIDTH }, () => "#")
  );

  for (let y = 1; y < MAZE_HEIGHT - 1; y += 2) {
    for (let x = 1; x < MAZE_WIDTH - 1; x += 1) {
      rows[y][x] = ".";
    }
  }
  for (const x of [1, 5, 10, 15, 19]) {
    for (let y = 1; y < MAZE_HEIGHT - 1; y += 1) {
      rows[y][x] = ".";
    }
  }

  for (let y = GHOST_PEN.top; y <= GHOST_PEN.bottom; y += 1) {
    for (let x = GHOST_PEN.left; x <= GHOST_PEN.right; x += 1) {
      rows[y][x] = "#";
    }
  }
  for (let y = GHOST_PEN.top + 1; y < GHOST_PEN.bottom; y += 1) {
    for (let x = GHOST_PEN.left + 1; x < GHOST_PEN.right; x += 1) {
      rows[y][x] = " ";
    }
  }

  rows[1][1] = "o";
  rows[1][19] = "o";
  rows[19][1] = "o";
  rows[19][19] = "o";
  rows[19][10] = "P";
  for (const ghost of GHOST_CONFIG) {
    rows[ghost.spawn.y][ghost.spawn.x] = ghost.marker;
  }

  return rows.map((row) => row.join(""));
}

function parseMaze() {
  const rows = buildMazeRows();
  if (rows.length !== MAZE_HEIGHT || rows.some((row) => row.length !== MAZE_WIDTH)) {
    throw new Error("Maze rows must all match the configured maze dimensions.");
  }

  const walls = [];
  const collectibles = [];
  let playerSpawn = null;
  const ghostSpawns = new Map();
  let remainingCollectibles = 0;

  for (let y = 0; y < MAZE_HEIGHT; y += 1) {
    walls[y] = [];
    collectibles[y] = [];
    for (let x = 0; x < MAZE_WIDTH; x += 1) {
      const tile = rows[y][x];
      walls[y][x] = tile === "#";
      collectibles[y][x] = null;

      if (tile === ".") {
        collectibles[y][x] = "dot";
        remainingCollectibles += 1;
      } else if (tile === "o") {
        collectibles[y][x] = "power";
        remainingCollectibles += 1;
      } else if (tile === "P") {
        playerSpawn = { x, y };
      } else if (GHOST_CONFIG.some((ghost) => ghost.marker === tile)) {
        ghostSpawns.set(tile, { x, y });
      } else if (tile !== "#" && tile !== " ") {
        throw new Error(`Unknown maze tile "${tile}" at column ${x}, row ${y}.`);
      }
    }
  }

  if (!playerSpawn || GHOST_CONFIG.some((ghost) => !ghostSpawns.has(ghost.marker))) {
    throw new Error("The maze must define the player spawn and all four ghost spawns.");
  }
  return {
    walls,
    collectibles,
    remainingCollectibles,
    playerSpawn,
    ghostSpawns,
    penExit: { ...GHOST_PEN.exit, open: false }
  };
}

function createActor(position, speed) {
  return {
    x: position.x,
    y: position.y,
    direction: "none",
    speed
  };
}

function resetGame() {
  maze = parseMaze();
  player = createActor(maze.playerSpawn, PLAYER_SPEED);
  ghosts = createGhosts(false);
  score = 0;
  lives = 3;
  gameState = "playing";
  hasStarted = false;
  nextGhostReleaseIndex = 0;
  respawnTimer = 0;
  terminalScreen.hidden = true;
  terminalTitle.textContent = "";
  updateHud();
  gameStatus.textContent = "Use the arrow keys to start. Ghosts release every 100 points.";
  draw(0);
}

function createGhosts(preserveReleasedState) {
  return GHOST_CONFIG.map((config) => {
    const previousGhost = preserveReleasedState
      ? ghosts.find((ghost) => ghost.marker === config.marker)
      : null;
    return {
      ...config,
      ...createActor(maze.ghostSpawns.get(config.marker), config.speed),
      released: previousGhost ? previousGhost.released : false
    };
  });
}

function updateHud() {
  scoreValue.textContent = String(score);
  livesValue.textContent = String(lives);
  const releasedCount = ghosts.filter((ghost) => ghost.released).length;
  releasedGhostsValue.textContent = `${releasedCount} / ${ghosts.length}`;
}

function isWalkable(x, y) {
  const tileX = Math.round(x);
  const tileY = Math.round(y);
  return (
    tileX >= 0 &&
    tileX < MAZE_WIDTH &&
    tileY >= 0 &&
    tileY < MAZE_HEIGHT &&
    !maze.walls[tileY][tileX]
  );
}

function isAtTileCenter(actor) {
  return Math.abs(actor.x - Math.round(actor.x)) < 0.0001 &&
    Math.abs(actor.y - Math.round(actor.y)) < 0.0001;
}

function canMoveFromCenter(actor, direction) {
  const vector = DIRECTIONS[direction];
  if (!vector || direction === "none") return false;
  return isWalkable(Math.round(actor.x) + vector.x, Math.round(actor.y) + vector.y);
}

function distanceToNextCenter(actor, direction) {
  const vector = DIRECTIONS[direction];
  const movement = vector.x || vector.y;
  const coordinate = vector.x ? actor.x : actor.y;
  if (movement > 0) {
    return Math.floor(coordinate + 0.000001) + 1 - coordinate;
  }
  return coordinate - (Math.ceil(coordinate - 0.000001) - 1);
}

function snapToCenterAlongDirection(actor, direction) {
  if (DIRECTIONS[direction].x !== 0) {
    actor.x = Math.round(actor.x);
  } else {
    actor.y = Math.round(actor.y);
  }
}

function collectAtPlayerTile() {
  const x = Math.round(player.x);
  const y = Math.round(player.y);
  const collectible = maze.collectibles[y][x];
  if (!collectible) return;

  maze.collectibles[y][x] = null;
  maze.remainingCollectibles -= 1;
  score += collectible === "dot" ? 10 : 50;
  releaseGhostsForScore();
  updateHud();

  if (maze.remainingCollectibles === 0) {
    finishGame("won");
  }
}

function releaseGhostsForScore() {
  while (
    nextGhostReleaseIndex < GHOST_RELEASE_SCORES.length &&
    score >= GHOST_RELEASE_SCORES[nextGhostReleaseIndex]
  ) {
    ghosts[nextGhostReleaseIndex].released = true;
    nextGhostReleaseIndex += 1;
    if (!maze.penExit.open) {
      maze.penExit.open = true;
      maze.walls[maze.penExit.y][maze.penExit.x] = false;
    }
  }
}

function movePlayer(deltaTime) {
  let distanceRemaining = player.speed * deltaTime;
  let steps = 0;
  while (distanceRemaining > 0.0001 && steps < 8 && gameState === "playing") {
    steps += 1;
    if (isAtTileCenter(player)) {
      player.x = Math.round(player.x);
      player.y = Math.round(player.y);
      collectAtPlayerTile();
      if (gameState !== "playing") return;

      const wantedDirection = player.requestedDirection;
      if (wantedDirection && canMoveFromCenter(player, wantedDirection)) {
        player.direction = wantedDirection;
      }
      if (!canMoveFromCenter(player, player.direction)) {
        player.direction = "none";
        break;
      }
    }

    const vector = DIRECTIONS[player.direction];
    if (player.direction === "none") break;
    const distanceToCenter = distanceToNextCenter(player, player.direction);
    const step = Math.min(distanceRemaining, distanceToCenter);
    player.x += vector.x * step;
    player.y += vector.y * step;
    distanceRemaining -= step;
    if (step >= distanceToCenter - 0.000001) {
      snapToCenterAlongDirection(player, player.direction);
    }
  }

  if (isAtTileCenter(player) && gameState === "playing") {
    collectAtPlayerTile();
  }
}

function targetForGhost(ghost) {
  const pacmanTile = { x: Math.round(player.x), y: Math.round(player.y) };
  if (ghost.name === "Red") return pacmanTile;

  if (ghost.name === "Pink") {
    const direction = DIRECTIONS[player.direction === "none" ? "right" : player.direction];
    return {
      x: pacmanTile.x + direction.x * 4,
      y: pacmanTile.y + direction.y * 4
    };
  }

  if (ghost.name === "Blue") {
    const direction = DIRECTIONS[player.direction === "none" ? "right" : player.direction];
    const ahead = {
      x: pacmanTile.x + direction.x * 2,
      y: pacmanTile.y + direction.y * 2
    };
    const red = ghosts.find((candidate) => candidate.name === "Red");
    return {
      x: ahead.x * 2 - Math.round(red.x),
      y: ahead.y * 2 - Math.round(red.y)
    };
  }

  const distanceToPlayer = Math.hypot(ghost.x - player.x, ghost.y - player.y);
  if (distanceToPlayer > 6) return pacmanTile;
  return { x: MAZE_WIDTH - 2, y: MAZE_HEIGHT - 2 };
}

function keyForTile(x, y) {
  return y * MAZE_WIDTH + x;
}

function tileFromKey(key) {
  return { x: key % MAZE_WIDTH, y: Math.floor(key / MAZE_WIDTH) };
}

function findNextStep(start, target, ghost) {
  const startX = Math.round(start.x);
  const startY = Math.round(start.y);
  const startKey = keyForTile(startX, startY);
  const targetX = Math.max(1, Math.min(MAZE_WIDTH - 2, Math.round(target.x)));
  const targetY = Math.max(1, Math.min(MAZE_HEIGHT - 2, Math.round(target.y)));
  const targetKey = keyForTile(targetX, targetY);
  const queue = [startKey];
  const parents = new Map([[startKey, -1]]);
  const directionOrder = ghost.name === "Pink"
    ? ["up", "left", "down", "right"]
    : ghost.name === "Blue"
      ? ["right", "down", "left", "up"]
      : ghost.name === "Orange"
        ? ["down", "right", "up", "left"]
        : ["up", "right", "down", "left"];

  for (let queueIndex = 0; queueIndex < queue.length; queueIndex += 1) {
    const currentKey = queue[queueIndex];
    const current = tileFromKey(currentKey);
    for (const direction of directionOrder) {
      const vector = DIRECTIONS[direction];
      const nextX = current.x + vector.x;
      const nextY = current.y + vector.y;
      if (nextX < 0 || nextX >= MAZE_WIDTH || nextY < 0 || nextY >= MAZE_HEIGHT) continue;
      const nextKey = keyForTile(nextX, nextY);
      if (maze.walls[nextY][nextX] || parents.has(nextKey)) continue;
      parents.set(nextKey, currentKey);
      queue.push(nextKey);
    }
  }

  let destinationKey = targetKey;
  if (!parents.has(destinationKey)) {
    let bestDistance = Infinity;
    for (const reachableKey of parents.keys()) {
      const tile = tileFromKey(reachableKey);
      const distance = Math.abs(tile.x - targetX) + Math.abs(tile.y - targetY);
      if (distance < bestDistance) {
        destinationKey = reachableKey;
        bestDistance = distance;
      }
    }
  }

  if (destinationKey === startKey) {
    const legalDirections = directionOrder.filter((direction) => canMoveFromCenter(start, direction));
    const nonReverse = legalDirections.filter((direction) =>
      direction !== oppositeDirection(ghost.direction)
    );
    const choices = nonReverse.length > 0 ? nonReverse : legalDirections;
    if (choices.length === 0) return null;
    const vector = DIRECTIONS[choices[0]];
    return { x: startX + vector.x, y: startY + vector.y };
  }

  let stepKey = destinationKey;
  while (parents.get(stepKey) !== startKey && parents.get(stepKey) !== -1) {
    stepKey = parents.get(stepKey);
  }
  return tileFromKey(stepKey);
}

function oppositeDirection(direction) {
  return {
    up: "down",
    right: "left",
    down: "up",
    left: "right",
    none: "none"
  }[direction];
}

function moveGhost(ghost, deltaTime) {
  if (!ghost.released) return;
  let distanceRemaining = ghost.speed * deltaTime;
  let steps = 0;
  while (distanceRemaining > 0.0001 && steps < 8) {
    steps += 1;
    if (isAtTileCenter(ghost)) {
      ghost.x = Math.round(ghost.x);
      ghost.y = Math.round(ghost.y);
      const next = findNextStep(ghost, targetForGhost(ghost), ghost);
      if (!next) {
        ghost.direction = "none";
        break;
      }
      const dx = next.x - ghost.x;
      const dy = next.y - ghost.y;
      ghost.direction = dx === 1 ? "right" : dx === -1 ? "left" : dy === 1 ? "down" : "up";
    }

    const vector = DIRECTIONS[ghost.direction];
    const distanceToCenter = distanceToNextCenter(ghost, ghost.direction);
    const step = Math.min(distanceRemaining, distanceToCenter);
    ghost.x += vector.x * step;
    ghost.y += vector.y * step;
    distanceRemaining -= step;
    if (step >= distanceToCenter - 0.000001) {
      snapToCenterAlongDirection(ghost, ghost.direction);
    }
  }
}

function hasCollision() {
  return ghosts.some((ghost) =>
    ghost.released && Math.hypot(ghost.x - player.x, ghost.y - player.y) < COLLISION_DISTANCE
  );
}

function handleCollision() {
  lives -= 1;
  updateHud();
  if (lives <= 0) {
    finishGame("lost");
    return;
  }

  player = createActor(maze.playerSpawn, PLAYER_SPEED);
  ghosts = createGhosts(true);
  gameState = "respawning";
  respawnTimer = RESPAWN_DELAY;
  gameStatus.textContent = "Life lost! Get ready...";
}

function finishGame(result) {
  gameState = result;
  terminalScreen.hidden = false;
  terminalTitle.textContent = result === "won" ? "LEVEL COMPLETED / YOU WIN" : "GAME OVER";
  finalScore.textContent = String(score);
  gameStatus.textContent = result === "won" ? "Every collectible cleared!" : "All lives lost.";
}

function update(deltaTime) {
  if (gameState === "respawning") {
    respawnTimer -= deltaTime;
    if (respawnTimer <= 0) {
      gameState = "playing";
      gameStatus.textContent = "Collect every dot and avoid the ghosts!";
    }
    return;
  }
  if (gameState !== "playing") return;

  movePlayer(deltaTime);
  if (gameState !== "playing") return;
  if (!hasStarted) return;
  if (hasCollision()) {
    handleCollision();
    return;
  }

  for (const ghost of ghosts) {
    moveGhost(ghost, deltaTime);
    if (hasCollision()) {
      handleCollision();
      return;
    }
  }
}

function drawWall(x, y) {
  const inset = 1.5;
  const px = x * TILE_SIZE;
  const py = y * TILE_SIZE;
  context.fillStyle = "#10183f";
  context.fillRect(px, py, TILE_SIZE, TILE_SIZE);
  context.strokeStyle = "#263a9c";
  context.lineWidth = 1.5;
  context.strokeRect(px + inset, py + inset, TILE_SIZE - inset * 2, TILE_SIZE - inset * 2);
}

function drawGhostPen() {
  context.fillStyle = "#aeb8ff";
  context.font = `bold ${TILE_SIZE * 0.26}px "Trebuchet MS", sans-serif`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(
    "GHOST PEN",
    ((GHOST_PEN.left + GHOST_PEN.right + 1) / 2) * TILE_SIZE,
    (GHOST_PEN.top + 1.3) * TILE_SIZE
  );

  if (!maze.penExit.open) {
    const gateX = maze.penExit.x * TILE_SIZE;
    const gateY = maze.penExit.y * TILE_SIZE;
    context.strokeStyle = "#ffe34a";
    context.lineWidth = 2;
    for (const offset of [6, 14, 22]) {
      context.beginPath();
      context.moveTo(gateX + offset, gateY + 4);
      context.lineTo(gateX + offset, gateY + TILE_SIZE - 4);
      context.stroke();
    }
  }
}

function drawPlayer(timestamp) {
  const cx = (player.x + 0.5) * TILE_SIZE;
  const cy = (player.y + 0.5) * TILE_SIZE;
  const radius = TILE_SIZE * 0.39;
  const direction = DIRECTIONS[player.direction === "none" ? "right" : player.direction];
  const angle = Math.atan2(direction.y, direction.x);
  const mouth = 0.12 + Math.abs(Math.sin(timestamp / 85)) * 0.35;

  context.fillStyle = "#ffe34a";
  context.beginPath();
  context.arc(cx, cy, radius, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = "#050817";
  context.beginPath();
  context.moveTo(cx, cy);
  context.arc(cx, cy, radius + 1, angle - mouth, angle + mouth);
  context.closePath();
  context.fill();
}

function drawGhost(ghost) {
  const cx = (ghost.x + 0.5) * TILE_SIZE;
  const cy = (ghost.y + 0.5) * TILE_SIZE;
  const radius = TILE_SIZE * 0.37;
  context.fillStyle = ghost.color;
  context.beginPath();
  context.arc(cx, cy - 1, radius, Math.PI, 0);
  context.lineTo(cx + radius, cy + radius);
  context.lineTo(cx + radius * 0.35, cy + radius * 0.62);
  context.lineTo(cx, cy + radius);
  context.lineTo(cx - radius * 0.35, cy + radius * 0.62);
  context.lineTo(cx - radius, cy + radius);
  context.closePath();
  context.fill();

  const eyeOffset = TILE_SIZE * 0.13;
  const eyeY = cy - TILE_SIZE * 0.04;
  context.fillStyle = "#fff";
  context.beginPath();
  context.ellipse(cx - eyeOffset, eyeY, TILE_SIZE * 0.09, TILE_SIZE * 0.12, 0, 0, Math.PI * 2);
  context.ellipse(cx + eyeOffset, eyeY, TILE_SIZE * 0.09, TILE_SIZE * 0.12, 0, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = "#18275c";
  context.beginPath();
  context.arc(cx - eyeOffset, eyeY, TILE_SIZE * 0.045, 0, Math.PI * 2);
  context.arc(cx + eyeOffset, eyeY, TILE_SIZE * 0.045, 0, Math.PI * 2);
  context.fill();
}

function draw(timestamp) {
  if (!context || !maze) return;
  context.fillStyle = "#050817";
  context.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

  for (let y = 0; y < MAZE_HEIGHT; y += 1) {
    for (let x = 0; x < MAZE_WIDTH; x += 1) {
      if (maze.walls[y][x]) {
        drawWall(x, y);
      } else if (maze.collectibles[y][x]) {
        const powerPellet = maze.collectibles[y][x] === "power";
        context.beginPath();
        context.fillStyle = powerPellet ? "#fff0a0" : "#f8e6bf";
        context.arc(
          (x + 0.5) * TILE_SIZE,
          (y + 0.5) * TILE_SIZE,
          powerPellet ? TILE_SIZE * 0.22 : TILE_SIZE * 0.085,
          0,
          Math.PI * 2
        );
        context.fill();
      }
    }
  }

  drawGhostPen();
  drawPlayer(timestamp);
  for (const ghost of ghosts) drawGhost(ghost);
}

window.addEventListener("keydown", (event) => {
  const direction = KEY_DIRECTIONS[event.key];
  if (!direction) return;
  if (gameState === "playing" || gameState === "respawning") {
    event.preventDefault();
    if (gameState === "playing") {
      player.requestedDirection = direction;
      hasStarted = true;
    }
  }
});

restartButton.addEventListener("click", resetGame);

function frame(timestamp) {
  const deltaTime = lastFrameTime === 0
    ? 0
    : Math.min((timestamp - lastFrameTime) / 1000, 0.05);
  lastFrameTime = timestamp;
  update(deltaTime);
  draw(timestamp);
  window.requestAnimationFrame(frame);
}

resetGame();
window.requestAnimationFrame(frame);
