// =============================================================================
// Flappy Bird - Pure Vanilla HTML5 Canvas Game
// Zero external dependencies, self-contained procedural graphics & Web Audio API
// =============================================================================

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const CANVAS_WIDTH = 360;
const CANVAS_HEIGHT = 640;
canvas.width = CANVAS_WIDTH;
canvas.height = CANVAS_HEIGHT;

// -----------------------------------------------------------------------------
// Audio Synthesizer (Web Audio API)
// -----------------------------------------------------------------------------
class SoundController {
  constructor() {
    this.ctx = null;
    this.muted = false;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playJump() {
    if (this.muted || !this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const now = this.ctx.currentTime;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(700, now + 0.12);

      gain.gain.setValueAtTime(0.3, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.12);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.12);
    } catch (_) {}
  }

  playScore() {
    if (this.muted || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      [
        { f: 587.33, t: 0 },
        { f: 880.0, t: 0.08 }
      ].forEach(({ f, t }) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, now + t);

        gain.gain.setValueAtTime(0.25, now + t);
        gain.gain.exponentialRampToValueAtTime(0.001, now + t + 0.15);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now + t);
        osc.stop(now + t + 0.16);
      });
    } catch (_) {}
  }

  playHit() {
    if (this.muted || !this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const now = this.ctx.currentTime;

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(200, now);
      osc.frequency.exponentialRampToValueAtTime(40, now + 0.25);

      gain.gain.setValueAtTime(0.35, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.25);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.25);
    } catch (_) {}
  }

  toggleMute() {
    this.muted = !this.muted;
    return this.muted;
  }
}

const sounds = new SoundController();

// -----------------------------------------------------------------------------
// Game Constants & Configuration
// -----------------------------------------------------------------------------
const GROUND_HEIGHT = 80;
const PLAYABLE_HEIGHT = CANVAS_HEIGHT - GROUND_HEIGHT;

const GRAVITY = 0.28;
const FLAP_STRENGTH = -5.4;
const MAX_FALL_SPEED = 8.5;

const PIPE_WIDTH = 56;
const PIPE_GAP = 130;
const PIPE_SPEED = 2.1;
const PIPE_INTERVAL = 105; // frames between spawns
const MIN_PIPE_HEIGHT = 50;

const STORAGE_KEY = 'flappy_bird_high_score';

// -----------------------------------------------------------------------------
// State Management
// -----------------------------------------------------------------------------
const STATE = {
  START: 'start',
  PLAYING: 'playing',
  GAMEOVER: 'gameover'
};

let gameState = STATE.START;
let frameCount = 0;
let score = 0;
let highScore = parseInt(localStorage.getItem(STORAGE_KEY) || '0', 10);
let isNewHighScore = false;
let screenShake = 0;

// -----------------------------------------------------------------------------
// Background Entities (Clouds & Cityline)
// -----------------------------------------------------------------------------
const clouds = [
  { x: 40, y: 80, scale: 1.0, speed: 0.4 },
  { x: 180, y: 130, scale: 0.8, speed: 0.3 },
  { x: 290, y: 60, scale: 1.2, speed: 0.5 }
];

let groundOffset = 0;

function drawBackground() {
  // Sky gradient
  const skyGrad = ctx.createLinearGradient(0, 0, 0, PLAYABLE_HEIGHT);
  skyGrad.addColorStop(0, '#4dc3d8');
  skyGrad.addColorStop(0.7, '#88dcee');
  skyGrad.addColorStop(1, '#d0f4f7');
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, CANVAS_WIDTH, PLAYABLE_HEIGHT);

  // Background Clouds
  ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
  clouds.forEach(c => {
    if (gameState === STATE.PLAYING || gameState === STATE.START) {
      c.x -= c.speed;
      if (c.x < -80) c.x = CANVAS_WIDTH + 40;
    }
    drawCloud(c.x, c.y, c.scale);
  });

  // Distant City Skyline
  ctx.fillStyle = '#a9e1d8';
  const buildings = [
    { x: 0, w: 35, h: 45 }, { x: 40, w: 25, h: 65 }, { x: 70, w: 30, h: 35 },
    { x: 105, w: 45, h: 80 }, { x: 155, w: 30, h: 50 }, { x: 190, w: 35, h: 70 },
    { x: 230, w: 25, h: 40 }, { x: 260, w: 40, h: 60 }, { x: 305, w: 30, h: 55 },
    { x: 340, w: 30, h: 75 }
  ];
  buildings.forEach(b => {
    ctx.fillRect(b.x, PLAYABLE_HEIGHT - b.h, b.w, b.h);
  });

  // Distant Bush Silhouette
  ctx.fillStyle = '#6ec89b';
  for (let i = 0; i < CANVAS_WIDTH + 30; i += 30) {
    ctx.beginPath();
    ctx.arc(i, PLAYABLE_HEIGHT, 18, Math.PI, 0, false);
    ctx.fill();
  }
}

function drawCloud(x, y, scale) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.beginPath();
  ctx.arc(0, 0, 18, 0, Math.PI * 2);
  ctx.arc(14, -8, 14, 0, Math.PI * 2);
  ctx.arc(28, 0, 16, 0, Math.PI * 2);
  ctx.arc(14, 6, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawGround() {
  const y = PLAYABLE_HEIGHT;
  const h = GROUND_HEIGHT;

  if (gameState !== STATE.GAMEOVER) {
    groundOffset = (groundOffset + PIPE_SPEED) % 20;
  }

  // Dirt body
  ctx.fillStyle = '#ded895';
  ctx.fillRect(0, y, CANVAS_WIDTH, h);

  // Top Grass line
  ctx.fillStyle = '#73bf2e';
  ctx.fillRect(0, y, CANVAS_WIDTH, 14);

  // Grass bottom border
  ctx.fillStyle = '#558822';
  ctx.fillRect(0, y + 14, CANVAS_WIDTH, 3);

  // Moving decorative stripes on dirt
  ctx.strokeStyle = '#cbbf69';
  ctx.lineWidth = 3;
  ctx.beginPath();
  for (let x = -20 - groundOffset; x < CANVAS_WIDTH + 20; x += 18) {
    ctx.moveTo(x, y + 17);
    ctx.lineTo(x - 12, y + h);
  }
  ctx.stroke();

  // Top border highlight
  ctx.fillStyle = '#a6e247';
  ctx.fillRect(0, y, CANVAS_WIDTH, 3);
}

// -----------------------------------------------------------------------------
// Bird Entity
// -----------------------------------------------------------------------------
const bird = {
  x: 80,
  y: 280,
  radius: 14,
  velocity: 0,
  rotation: 0,
  wingPhase: 0,

  reset() {
    this.x = 80;
    this.y = 280;
    this.velocity = 0;
    this.rotation = 0;
    this.wingPhase = 0;
  },

  flap() {
    this.velocity = FLAP_STRENGTH;
    sounds.playJump();
  },

  update() {
    if (gameState === STATE.START) {
      // Gentle floating hover
      this.wingPhase += 0.12;
      this.y = 280 + Math.sin(this.wingPhase) * 6;
      this.rotation = 0;
      return;
    }

    if (gameState === STATE.PLAYING || gameState === STATE.GAMEOVER) {
      this.velocity += GRAVITY;
      if (this.velocity > MAX_FALL_SPEED) {
        this.velocity = MAX_FALL_SPEED;
      }
      this.y += this.velocity;

      // Calculate tilt angle based on velocity
      if (this.velocity < 0) {
        this.rotation = -0.38; // ~ -22 deg when jumping
      } else {
        this.rotation += 0.045;
        if (this.rotation > 1.25) this.rotation = 1.25; // ~ 72 deg diving
      }

      if (gameState === STATE.PLAYING) {
        this.wingPhase += 0.25;
      }
    }
  },

  draw() {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);

    // Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
    ctx.beginPath();
    ctx.ellipse(0, 16, 12, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Body (Yellow)
    ctx.fillStyle = '#f8e71c';
    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#543847';
    ctx.stroke();

    // Belly highlight
    ctx.fillStyle = '#fff477';
    ctx.beginPath();
    ctx.arc(-2, -3, this.radius * 0.7, 0, Math.PI * 2);
    ctx.fill();

    // Wing
    const wingY = Math.sin(this.wingPhase) * 4;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(-5, wingY, 7, 4.5, -0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#543847';
    ctx.lineWidth = 1.8;
    ctx.stroke();

    // Eye (White with black pupil)
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(6, -5, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#543847';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(8, -5, 2.2, 0, Math.PI * 2);
    ctx.fill();

    // Eye glint
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(7.5, -6, 1, 0, Math.PI * 2);
    ctx.fill();

    // Beak (Orange)
    ctx.fillStyle = '#f56a00';
    ctx.beginPath();
    ctx.moveTo(11, -2);
    ctx.lineTo(19, 2);
    ctx.lineTo(11, 6);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#543847';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Cheek blush
    ctx.fillStyle = 'rgba(245, 106, 0, 0.35)';
    ctx.beginPath();
    ctx.arc(2, 4, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
};

// -----------------------------------------------------------------------------
// Pipes Controller
// -----------------------------------------------------------------------------
class PipePair {
  constructor(x) {
    this.x = x;
    this.width = PIPE_WIDTH;
    this.passed = false;

    // Pick top pipe height randomly within constraints
    const maxTop = PLAYABLE_HEIGHT - PIPE_GAP - MIN_PIPE_HEIGHT;
    this.topHeight = Math.floor(Math.random() * (maxTop - MIN_PIPE_HEIGHT + 1)) + MIN_PIPE_HEIGHT;
    this.bottomY = this.topHeight + PIPE_GAP;
    this.bottomHeight = PLAYABLE_HEIGHT - this.bottomY;
  }

  update() {
    this.x -= PIPE_SPEED;
  }

  draw() {
    // Pipe styling colors
    const bodyColor = '#73bf2e';
    const highlight = '#9fe855';
    const shadow = '#558022';
    const borderColor = '#543847';
    const capHeight = 22;
    const capExtra = 4; // cap sticks out by 4px on each side

    // --- TOP PIPE ---
    // Main shaft
    ctx.fillStyle = bodyColor;
    ctx.fillRect(this.x, 0, this.width, this.topHeight - capHeight);
    // Shaft highlight & shadow
    ctx.fillStyle = highlight;
    ctx.fillRect(this.x + 3, 0, 5, this.topHeight - capHeight);
    ctx.fillStyle = shadow;
    ctx.fillRect(this.x + this.width - 8, 0, 6, this.topHeight - capHeight);
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 2;
    ctx.strokeRect(this.x, -2, this.width, this.topHeight - capHeight + 2);

    // Top Pipe Cap (Lip)
    const capX = this.x - capExtra;
    const capW = this.width + capExtra * 2;
    const capY = this.topHeight - capHeight;
    ctx.fillStyle = bodyColor;
    ctx.fillRect(capX, capY, capW, capHeight);
    ctx.fillStyle = highlight;
    ctx.fillRect(capX + 3, capY, 5, capHeight);
    ctx.fillStyle = shadow;
    ctx.fillRect(capX + capW - 8, capY, 6, capHeight);
    ctx.strokeRect(capX, capY, capW, capHeight);

    // --- BOTTOM PIPE ---
    // Bottom Pipe Cap (Lip)
    const bCapY = this.bottomY;
    ctx.fillStyle = bodyColor;
    ctx.fillRect(capX, bCapY, capW, capHeight);
    ctx.fillStyle = highlight;
    ctx.fillRect(capX + 3, bCapY, 5, capHeight);
    ctx.fillStyle = shadow;
    ctx.fillRect(capX + capW - 8, bCapY, 6, capHeight);
    ctx.strokeRect(capX, bCapY, capW, capHeight);

    // Bottom Pipe Main Shaft
    const bShaftY = this.bottomY + capHeight;
    const bShaftH = this.bottomHeight - capHeight;
    ctx.fillStyle = bodyColor;
    ctx.fillRect(this.x, bShaftY, this.width, bShaftH);
    ctx.fillStyle = highlight;
    ctx.fillRect(this.x + 3, bShaftY, 5, bShaftH);
    ctx.fillStyle = shadow;
    ctx.fillRect(this.x + this.width - 8, bShaftY, 6, bShaftH);
    ctx.strokeRect(this.x, bShaftY, this.width, bShaftH + 4);
  }

  isOffscreen() {
    return this.x + this.width + 10 < 0;
  }

  checkCollision(b) {
    // Circle vs AABB collision detection
    const r = b.radius * 0.82; // Slight forgiving hitbox for great arcade feel

    // Check collision with top pipe
    if (this.circleRectCollision(b.x, b.y, r, this.x - 4, 0, this.width + 8, this.topHeight)) {
      return true;
    }

    // Check collision with bottom pipe
    if (this.circleRectCollision(b.x, b.y, r, this.x - 4, this.bottomY, this.width + 8, this.bottomHeight)) {
      return true;
    }

    return false;
  }

  circleRectCollision(cx, cy, radius, rx, ry, rw, rh) {
    const closestX = Math.max(rx, Math.min(cx, rx + rw));
    const closestY = Math.max(ry, Math.min(cy, ry + rh));
    const distanceX = cx - closestX;
    const distanceY = cy - closestY;
    return (distanceX * distanceX + distanceY * distanceY) < (radius * radius);
  }
}

let pipes = [];

// -----------------------------------------------------------------------------
// UI & HUD Rendering
// -----------------------------------------------------------------------------
function drawScore() {
  if (gameState === STATE.PLAYING) {
    ctx.save();
    ctx.font = 'bold 44px monospace';
    ctx.textAlign = 'center';
    ctx.lineWidth = 6;
    ctx.strokeStyle = '#543847';
    ctx.fillStyle = '#ffffff';
    ctx.strokeText(score.toString(), CANVAS_WIDTH / 2, 70);
    ctx.fillText(score.toString(), CANVAS_WIDTH / 2, 70);
    ctx.restore();
  }
}

function drawMuteButton() {
  ctx.save();
  ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
  ctx.beginPath();
  ctx.arc(CANVAS_WIDTH - 24, 24, 16, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.font = '14px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(sounds.muted ? '🔇' : '🔊', CANVAS_WIDTH - 24, 25);
  ctx.restore();
}

function drawStartScreen() {
  ctx.save();
  ctx.textAlign = 'center';

  // Title with shadow
  ctx.font = 'bold 36px monospace';
  ctx.lineWidth = 6;
  ctx.strokeStyle = '#543847';
  ctx.fillStyle = '#f8e71c';
  ctx.strokeText('FLAPPY BIRD', CANVAS_WIDTH / 2, 170);
  ctx.fillText('FLAPPY BIRD', CANVAS_WIDTH / 2, 170);

  // Ready Card
  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.strokeStyle = '#543847';
  ctx.lineWidth = 3;
  roundRect(CANVAS_WIDTH / 2 - 120, 340, 240, 90, 10, true, true);

  // Prompt Text
  const alpha = 0.5 + 0.5 * Math.sin(frameCount * 0.08);
  ctx.fillStyle = `rgba(84, 56, 71, ${alpha.toFixed(2)})`;
  ctx.font = 'bold 16px monospace';
  ctx.fillText('TAP OR PRESS SPACE', CANVAS_WIDTH / 2, 380);
  ctx.fillText('TO FLAP & START', CANVAS_WIDTH / 2, 405);

  ctx.restore();
}

function drawGameOverScreen() {
  ctx.save();
  ctx.textAlign = 'center';

  // Banner: GAME OVER
  ctx.font = 'bold 36px monospace';
  ctx.lineWidth = 6;
  ctx.strokeStyle = '#543847';
  ctx.fillStyle = '#f44336';
  ctx.strokeText('GAME OVER', CANVAS_WIDTH / 2, 160);
  ctx.fillText('GAME OVER', CANVAS_WIDTH / 2, 160);

  // Scoreboard Card
  const cardX = CANVAS_WIDTH / 2 - 130;
  const cardY = 200;
  const cardW = 260;
  const cardH = 170;

  ctx.fillStyle = '#ded895';
  ctx.strokeStyle = '#543847';
  ctx.lineWidth = 3;
  roundRect(cardX, cardY, cardW, cardH, 12, true, true);

  // Medal Display
  ctx.fillStyle = '#543847';
  ctx.font = 'bold 14px monospace';
  ctx.fillText('MEDAL', cardX + 55, cardY + 35);

  let medalColor = null;
  let medalName = '';
  if (score >= 40) { medalColor = '#e5e4e2'; medalName = 'PLATINUM'; }
  else if (score >= 25) { medalColor = '#ffd700'; medalName = 'GOLD'; }
  else if (score >= 10) { medalColor = '#c0c0c0'; medalName = 'SILVER'; }
  else if (score >= 5) { medalColor = '#cd7f32'; medalName = 'BRONZE'; }

  if (medalColor) {
    ctx.beginPath();
    ctx.arc(cardX + 55, cardY + 80, 24, 0, Math.PI * 2);
    ctx.fillStyle = medalColor;
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#543847';
    ctx.stroke();

    ctx.fillStyle = '#543847';
    ctx.font = 'bold 10px monospace';
    ctx.fillText('★', cardX + 55, cardY + 84);
  } else {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
    ctx.beginPath();
    ctx.arc(cardX + 55, cardY + 80, 22, 0, Math.PI * 2);
    ctx.fill();
  }

  // Scores text inside card
  ctx.textAlign = 'right';
  ctx.fillStyle = '#f56a00';
  ctx.font = 'bold 13px monospace';
  ctx.fillText('SCORE', cardX + cardW - 25, cardY + 35);
  ctx.fillStyle = '#543847';
  ctx.font = 'bold 26px monospace';
  ctx.fillText(score.toString(), cardX + cardW - 25, cardY + 65);

  ctx.fillStyle = '#f56a00';
  ctx.font = 'bold 13px monospace';
  ctx.fillText('BEST', cardX + cardW - 25, cardY + 105);
  ctx.fillStyle = '#543847';
  ctx.font = 'bold 26px monospace';
  ctx.fillText(highScore.toString(), cardX + cardW - 25, cardY + 135);

  // New High Score Ribbon
  if (isNewHighScore) {
    ctx.fillStyle = '#e91e63';
    roundRect(cardX + cardW - 85, cardY + 88, 48, 16, 4, true, false);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 9px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('NEW', cardX + cardW - 61, cardY + 100);
  }

  // Restart Button
  ctx.textAlign = 'center';
  const pulse = 0.6 + 0.4 * Math.sin(frameCount * 0.09);
  ctx.fillStyle = `rgba(255, 255, 255, ${pulse.toFixed(2)})`;
  ctx.strokeStyle = '#543847';
  ctx.lineWidth = 3;
  roundRect(CANVAS_WIDTH / 2 - 110, 400, 220, 50, 10, true, true);

  ctx.fillStyle = '#543847';
  ctx.font = 'bold 15px monospace';
  ctx.fillText('PRESS TO RESTART', CANVAS_WIDTH / 2, 431);

  ctx.restore();
}

function roundRect(x, y, w, h, r, fill, stroke) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
  if (fill) ctx.fill();
  if (stroke) ctx.stroke();
}

// -----------------------------------------------------------------------------
// Trigger Death & Game Over
// -----------------------------------------------------------------------------
function triggerGameOver() {
  if (gameState !== STATE.GAMEOVER) {
    gameState = STATE.GAMEOVER;
    sounds.playHit();
    screenShake = 14;

    if (score > highScore) {
      highScore = score;
      isNewHighScore = true;
      localStorage.setItem(STORAGE_KEY, highScore.toString());
    } else {
      isNewHighScore = false;
    }
  }
}

function resetGame() {
  gameState = STATE.START;
  score = 0;
  frameCount = 0;
  pipes = [];
  bird.reset();
  isNewHighScore = false;
  screenShake = 0;
}

// -----------------------------------------------------------------------------
// Main Game Loop
// -----------------------------------------------------------------------------
function gameLoop() {
  frameCount++;

  // Screen shake handling
  ctx.save();
  if (screenShake > 0) {
    const dx = (Math.random() - 0.5) * screenShake;
    const dy = (Math.random() - 0.5) * screenShake;
    ctx.translate(dx, dy);
    screenShake *= 0.85;
    if (screenShake < 0.5) screenShake = 0;
  }

  // 1. Draw Environment
  drawBackground();

  // 2. Pipes Logic
  if (gameState === STATE.PLAYING) {
    // Spawn pipes
    if (frameCount % PIPE_INTERVAL === 0) {
      pipes.push(new PipePair(CANVAS_WIDTH));
    }

    // Update & check collisions
    for (let i = pipes.length - 1; i >= 0; i--) {
      const p = pipes[i];
      p.update();

      // Passing check for score
      if (!p.passed && p.x + p.width < bird.x) {
        p.passed = true;
        score++;
        sounds.playScore();
      }

      // Collision check
      if (p.checkCollision(bird)) {
        triggerGameOver();
      }

      if (p.isOffscreen()) {
        pipes.splice(i, 1);
      }
    }
  }

  // Render pipes
  pipes.forEach(p => p.draw());

  // 3. Ground & Collision with borders
  drawGround();

  // 4. Bird Update & Render
  bird.update();

  // Check ceiling and floor
  if (bird.y + bird.radius >= PLAYABLE_HEIGHT) {
    bird.y = PLAYABLE_HEIGHT - bird.radius;
    triggerGameOver();
  }
  if (bird.y - bird.radius <= 0) {
    bird.y = bird.radius;
    bird.velocity = 0;
  }

  bird.draw();

  // 5. HUD & Overlays
  drawScore();
  drawMuteButton();

  if (gameState === STATE.START) {
    drawStartScreen();
  } else if (gameState === STATE.GAMEOVER) {
    drawGameOverScreen();
  }

  ctx.restore();

  requestAnimationFrame(gameLoop);
}

// -----------------------------------------------------------------------------
// Input Handling
// -----------------------------------------------------------------------------
function handleAction(clientX, clientY) {
  sounds.init();

  // Check mute button hit
  if (clientX !== undefined && clientY !== undefined) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const canvasX = (clientX - rect.left) * scaleX;
    const canvasY = (clientY - rect.top) * scaleY;

    // Mute button circle centered at (CANVAS_WIDTH - 24, 24), radius 18
    const distSq = Math.pow(canvasX - (CANVAS_WIDTH - 24), 2) + Math.pow(canvasY - 24, 2);
    if (distSq <= 18 * 18) {
      sounds.toggleMute();
      return;
    }
  }

  if (gameState === STATE.START) {
    gameState = STATE.PLAYING;
    bird.flap();
  } else if (gameState === STATE.PLAYING) {
    bird.flap();
  } else if (gameState === STATE.GAMEOVER) {
    // Only restart after bird has stopped moving / hit ground
    if (bird.y >= PLAYABLE_HEIGHT - bird.radius - 2) {
      resetGame();
    }
  }
}

// Keyboard events
window.addEventListener('keydown', (e) => {
  if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
    e.preventDefault();
    handleAction();
  }
});

// Canvas pointer/click/touch
canvas.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  handleAction(e.clientX, e.clientY);
});

// Start loop
requestAnimationFrame(gameLoop);

