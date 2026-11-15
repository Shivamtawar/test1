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

  playSelect() {
    if (this.muted || !this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const now = this.ctx.currentTime;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(480, now);
      osc.frequency.exponentialRampToValueAtTime(620, now + 0.08);

      gain.gain.setValueAtTime(0.18, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.08);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.08);
    } catch (_) {}
  }

  toggleMute() {
    this.muted = !this.muted;
    return this.muted;
  }
}

const sounds = new SoundController();

// -----------------------------------------------------------------------------
// Difficulty Presets
// -----------------------------------------------------------------------------
const DIFFICULTIES = {
  medium: {
    id: 'medium',
    label: 'MEDIUM',
    color: '#4caf50',
    accent: '#81c784',
    pipeGap: 140,
    pipeSpeed: 1.9,
    pipeInterval: 110,
    gravity: 0.26,
    flapStrength: -5.2
  },
  hard: {
    id: 'hard',
    label: 'HARD',
    color: '#ff9800',
    accent: '#ffb74d',
    pipeGap: 125,
    pipeSpeed: 2.2,
    pipeInterval: 98,
    gravity: 0.28,
    flapStrength: -5.4
  },
  difficult: {
    id: 'difficult',
    label: 'DIFFICULT',
    color: '#f44336',
    accent: '#e57373',
    pipeGap: 108,
    pipeSpeed: 2.7,
    pipeInterval: 85,
    gravity: 0.32,
    flapStrength: -5.6
  }
};

const DIFFICULTY_KEYS = ['medium', 'hard', 'difficult'];
let currentDifficultyKey = localStorage.getItem('flappy_selected_difficulty') || 'medium';
if (!DIFFICULTIES[currentDifficultyKey]) currentDifficultyKey = 'medium';

// -----------------------------------------------------------------------------
// Game Constants & Configuration
// -----------------------------------------------------------------------------
const GROUND_HEIGHT = 80;
const PLAYABLE_HEIGHT = CANVAS_HEIGHT - GROUND_HEIGHT;
const PIPE_WIDTH = 56;
const MIN_PIPE_HEIGHT = 45;
const MAX_FALL_SPEED = 8.5;

function getDifficultyConfig() {
  return DIFFICULTIES[currentDifficultyKey];
}

function getHighScoreKey() {
  return `flappy_high_score_${currentDifficultyKey}`;
}

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
let highScore = parseInt(localStorage.getItem(getHighScoreKey()) || '0', 10);
let isNewHighScore = false;
let screenShake = 0;

// Buttons geometry for difficulty selector (defined for hit-testing and drawing)
const difficultyButtons = [
  { key: 'medium', label: 'MEDIUM', x: 26, y: 330, w: 96, h: 36, color: '#4caf50' },
  { key: 'hard', label: 'HARD', x: 132, y: 330, w: 96, h: 36, color: '#ff9800' },
  { key: 'difficult', label: 'DIFFICULT', x: 238, y: 330, w: 96, h: 36, color: '#f44336' }
];

function selectDifficulty(key) {
  if (DIFFICULTIES[key]) {
    currentDifficultyKey = key;
    localStorage.setItem('flappy_selected_difficulty', key);
    highScore = parseInt(localStorage.getItem(getHighScoreKey()) || '0', 10);
    sounds.playSelect();
  }
}

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
  const cfg = getDifficultyConfig();

  if (gameState !== STATE.GAMEOVER) {
    groundOffset = (groundOffset + cfg.pipeSpeed) % 20;
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
  y: 250,
  radius: 14,
  velocity: 0,
  rotation: 0,
  wingPhase: 0,

  reset() {
    this.x = 80;
    this.y = 250;
    this.velocity = 0;
    this.rotation = 0;
    this.wingPhase = 0;
  },

  flap() {
    const cfg = getDifficultyConfig();
    this.velocity = cfg.flapStrength;
    sounds.playJump();
  },

  update() {
    if (gameState === STATE.START) {
      this.wingPhase += 0.12;
      this.y = 250 + Math.sin(this.wingPhase) * 6;
      this.rotation = 0;
      return;
    }

    if (gameState === STATE.PLAYING || gameState === STATE.GAMEOVER) {
      const cfg = getDifficultyConfig();
      this.velocity += cfg.gravity;
      if (this.velocity > MAX_FALL_SPEED) {
        this.velocity = MAX_FALL_SPEED;
      }
      this.y += this.velocity;

      // Rotation based on velocity
      if (this.velocity < 0) {
        this.rotation = -0.38;
      } else {
        this.rotation += 0.045;
        if (this.rotation > 1.25) this.rotation = 1.25;
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

    // Eye
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
    const cfg = getDifficultyConfig();
    this.x = x;
    this.width = PIPE_WIDTH;
    this.gap = cfg.pipeGap;
    this.passed = false;

    const maxTop = PLAYABLE_HEIGHT - this.gap - MIN_PIPE_HEIGHT;
    this.topHeight = Math.floor(Math.random() * (maxTop - MIN_PIPE_HEIGHT + 1)) + MIN_PIPE_HEIGHT;
    this.bottomY = this.topHeight + this.gap;
    this.bottomHeight = PLAYABLE_HEIGHT - this.bottomY;
  }

  update() {
    const cfg = getDifficultyConfig();
    this.x -= cfg.pipeSpeed;
  }

  draw() {
    const bodyColor = '#73bf2e';
    const highlight = '#9fe855';
    const shadow = '#558022';
    const borderColor = '#543847';
    const capHeight = 22;
    const capExtra = 4;

    // --- TOP PIPE ---
    ctx.fillStyle = bodyColor;
    ctx.fillRect(this.x, 0, this.width, this.topHeight - capHeight);
    ctx.fillStyle = highlight;
    ctx.fillRect(this.x + 3, 0, 5, this.topHeight - capHeight);
    ctx.fillStyle = shadow;
    ctx.fillRect(this.x + this.width - 8, 0, 6, this.topHeight - capHeight);
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 2;
    ctx.strokeRect(this.x, -2, this.width, this.topHeight - capHeight + 2);

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
    const bCapY = this.bottomY;
    ctx.fillStyle = bodyColor;
    ctx.fillRect(capX, bCapY, capW, capHeight);
    ctx.fillStyle = highlight;
    ctx.fillRect(capX + 3, bCapY, 5, capHeight);
    ctx.fillStyle = shadow;
    ctx.fillRect(capX + capW - 8, bCapY, 6, capHeight);
    ctx.strokeRect(capX, bCapY, capW, capHeight);

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
    const r = b.radius * 0.82;
    if (this.circleRectCollision(b.x, b.y, r, this.x - 4, 0, this.width + 8, this.topHeight)) {
      return true;
    }
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
    ctx.strokeText(score.toString(), CANVAS_WIDTH / 2, 65);
    ctx.fillText(score.toString(), CANVAS_WIDTH / 2, 65);

    // Active Difficulty Badge at top
    const cfg = getDifficultyConfig();
    ctx.font = 'bold 11px monospace';
    ctx.fillStyle = cfg.color;
    roundRect(CANVAS_WIDTH / 2 - 40, 78, 80, 18, 4, true, false);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(cfg.label, CANVAS_WIDTH / 2, 91);
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
  ctx.strokeText('FLAPPY BIRD', CANVAS_WIDTH / 2, 145);
  ctx.fillText('FLAPPY BIRD', CANVAS_WIDTH / 2, 145);

  // Difficulty Header text
  ctx.fillStyle = '#543847';
  ctx.font = 'bold 13px monospace';
  ctx.fillText('SELECT DIFFICULTY:', CANVAS_WIDTH / 2, 315);

  // Render Difficulty Selection Buttons
  difficultyButtons.forEach(btn => {
    const isSelected = btn.key === currentDifficultyKey;

    if (isSelected) {
      // Glow / Selection border
      ctx.fillStyle = btn.color;
      ctx.strokeStyle = '#543847';
      ctx.lineWidth = 3;
      roundRect(btn.x, btn.y, btn.w, btn.h, 8, true, true);

      // Selected Indicator tick
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px monospace';
      ctx.fillText(btn.label, btn.x + btn.w / 2, btn.y + 22);
    } else {
      // Unselected button
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.strokeStyle = '#7a606e';
      ctx.lineWidth = 2;
      roundRect(btn.x, btn.y, btn.w, btn.h, 8, true, true);

      ctx.fillStyle = '#543847';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(btn.label, btn.x + btn.w / 2, btn.y + 22);
    }
  });

  // Start Action Card
  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.strokeStyle = '#543847';
  ctx.lineWidth = 3;
  roundRect(CANVAS_WIDTH / 2 - 120, 395, 240, 75, 10, true, true);

  const pulse = 0.5 + 0.5 * Math.sin(frameCount * 0.08);
  ctx.fillStyle = `rgba(84, 56, 71, ${pulse.toFixed(2)})`;
  ctx.font = 'bold 15px monospace';
  ctx.fillText('PRESS SPACE OR TAP', CANVAS_WIDTH / 2, 428);
  ctx.fillText('TO START FLYING', CANVAS_WIDTH / 2, 450);

  // Best score for selected mode
  ctx.fillStyle = '#543847';
  ctx.font = 'bold 12px monospace';
  ctx.fillText(`BEST (${getDifficultyConfig().label}): ${highScore}`, CANVAS_WIDTH / 2, 500);

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
  ctx.strokeText('GAME OVER', CANVAS_WIDTH / 2, 140);
  ctx.fillText('GAME OVER', CANVAS_WIDTH / 2, 140);

  // Scoreboard Card
  const cardX = CANVAS_WIDTH / 2 - 130;
  const cardY = 175;
  const cardW = 260;
  const cardH = 190;

  ctx.fillStyle = '#ded895';
  ctx.strokeStyle = '#543847';
  ctx.lineWidth = 3;
  roundRect(cardX, cardY, cardW, cardH, 12, true, true);

  // Difficulty tag
  const cfg = getDifficultyConfig();
  ctx.fillStyle = cfg.color;
  roundRect(cardX + 20, cardY + 14, 80, 18, 4, true, false);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 10px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(cfg.label, cardX + 60, cardY + 27);

  // Medal Display
  ctx.textAlign = 'center';
  ctx.fillStyle = '#543847';
  ctx.font = 'bold 13px monospace';
  ctx.fillText('MEDAL', cardX + 60, cardY + 60);

  let medalColor = null;
  if (score >= 35) { medalColor = '#e5e4e2'; }
  else if (score >= 20) { medalColor = '#ffd700'; }
  else if (score >= 10) { medalColor = '#c0c0c0'; }
  else if (score >= 5) { medalColor = '#cd7f32'; }

  if (medalColor) {
    ctx.beginPath();
    ctx.arc(cardX + 60, cardY + 105, 24, 0, Math.PI * 2);
    ctx.fillStyle = medalColor;
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#543847';
    ctx.stroke();

    ctx.fillStyle = '#543847';
    ctx.font = 'bold 12px monospace';
    ctx.fillText('★', cardX + 60, cardY + 110);
  } else {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
    ctx.beginPath();
    ctx.arc(cardX + 60, cardY + 105, 22, 0, Math.PI * 2);
    ctx.fill();
  }

  // Scores text inside card
  ctx.textAlign = 'right';
  ctx.fillStyle = '#f56a00';
  ctx.font = 'bold 12px monospace';
  ctx.fillText('SCORE', cardX + cardW - 25, cardY + 45);
  ctx.fillStyle = '#543847';
  ctx.font = 'bold 26px monospace';
  ctx.fillText(score.toString(), cardX + cardW - 25, cardY + 75);

  ctx.fillStyle = '#f56a00';
  ctx.font = 'bold 12px monospace';
  ctx.fillText('BEST', cardX + cardW - 25, cardY + 115);
  ctx.fillStyle = '#543847';
  ctx.font = 'bold 26px monospace';
  ctx.fillText(highScore.toString(), cardX + cardW - 25, cardY + 145);

  // New High Score Ribbon
  if (isNewHighScore) {
    ctx.fillStyle = '#e91e63';
    roundRect(cardX + cardW - 85, cardY + 98, 48, 16, 4, true, false);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 9px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('NEW', cardX + cardW - 61, cardY + 110);
  }

  // Restart Button
  ctx.textAlign = 'center';
  const pulse = 0.6 + 0.4 * Math.sin(frameCount * 0.09);
  ctx.fillStyle = `rgba(255, 255, 255, ${pulse.toFixed(2)})`;
  ctx.strokeStyle = '#543847';
  ctx.lineWidth = 3;
  roundRect(CANVAS_WIDTH / 2 - 110, 395, 220, 50, 10, true, true);

  ctx.fillStyle = '#543847';
  ctx.font = 'bold 15px monospace';
  ctx.fillText('PRESS TO RESTART', CANVAS_WIDTH / 2, 426);

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

    const key = getHighScoreKey();
    if (score > highScore) {
      highScore = score;
      isNewHighScore = true;
      localStorage.setItem(key, highScore.toString());
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
  highScore = parseInt(localStorage.getItem(getHighScoreKey()) || '0', 10);
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
    const cfg = getDifficultyConfig();
    if (frameCount % cfg.pipeInterval === 0) {
      pipes.push(new PipePair(CANVAS_WIDTH));
    }

    for (let i = pipes.length - 1; i >= 0; i--) {
      const p = pipes[i];
      p.update();

      if (!p.passed && p.x + p.width < bird.x) {
        p.passed = true;
        score++;
        sounds.playScore();
      }

      if (p.checkCollision(bird)) {
        triggerGameOver();
      }

      if (p.isOffscreen()) {
        pipes.splice(i, 1);
      }
    }
  }

  pipes.forEach(p => p.draw());

  // 3. Ground & Collision with borders
  drawGround();

  // 4. Bird Update & Render
  bird.update();

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
function handleCanvasClick(clientX, clientY) {
  sounds.init();

  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const canvasX = (clientX - rect.left) * scaleX;
  const canvasY = (clientY - rect.top) * scaleY;

  // Check mute button click
  const distSq = Math.pow(canvasX - (CANVAS_WIDTH - 24), 2) + Math.pow(canvasY - 24, 2);
  if (distSq <= 18 * 18) {
    sounds.toggleMute();
    return;
  }

  // On Start screen, check difficulty button clicks
  if (gameState === STATE.START) {
    for (const btn of difficultyButtons) {
      if (
        canvasX >= btn.x &&
        canvasX <= btn.x + btn.w &&
        canvasY >= btn.y &&
        canvasY <= btn.y + btn.h
      ) {
        selectDifficulty(btn.key);
        return;
      }
    }

    // Otherwise, start the game
    gameState = STATE.PLAYING;
    bird.flap();
    return;
  }

  if (gameState === STATE.PLAYING) {
    bird.flap();
    return;
  }

  if (gameState === STATE.GAMEOVER) {
    if (bird.y >= PLAYABLE_HEIGHT - bird.radius - 2) {
      resetGame();
    }
  }
}

function handleKeyAction(e) {
  sounds.init();

  // Numbers 1, 2, 3 to switch difficulty on start screen
  if (gameState === STATE.START) {
    if (e.key === '1') { selectDifficulty('medium'); return; }
    if (e.key === '2') { selectDifficulty('hard'); return; }
    if (e.key === '3') { selectDifficulty('difficult'); return; }
  }

  if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
    e.preventDefault();
    if (gameState === STATE.START) {
      gameState = STATE.PLAYING;
      bird.flap();
    } else if (gameState === STATE.PLAYING) {
      bird.flap();
    } else if (gameState === STATE.GAMEOVER) {
      if (bird.y >= PLAYABLE_HEIGHT - bird.radius - 2) {
        resetGame();
      }
    }
  }
}

// Keyboard events
window.addEventListener('keydown', handleKeyAction);

// Canvas pointer/click/touch
canvas.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  handleCanvasClick(e.clientX, e.clientY);
});

// Start loop
requestAnimationFrame(gameLoop);
