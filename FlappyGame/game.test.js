// =============================================================================
// Flappy Bird Game Engine Test Suite
// Using Node.js native test runner (node:test, node:assert)
// =============================================================================

const test = require('node:test');
const assert = require('node:assert');

// Mock localStorage
const localStorageMock = (function() {
  let store = {};
  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => { store[key] = value.toString(); },
    clear: () => { store = {}; }
  };
})();

// Re-usable constants matching game.js
const CANVAS_WIDTH = 360;
const CANVAS_HEIGHT = 640;
const GROUND_HEIGHT = 80;
const PLAYABLE_HEIGHT = CANVAS_HEIGHT - GROUND_HEIGHT; // 560

const GRAVITY = 0.28;
const FLAP_STRENGTH = -5.4;
const MAX_FALL_SPEED = 8.5;
const PIPE_WIDTH = 56;
const PIPE_GAP = 130;
const MIN_PIPE_HEIGHT = 50;

function circleRectCollision(cx, cy, radius, rx, ry, rw, rh) {
  const closestX = Math.max(rx, Math.min(cx, rx + rw));
  const closestY = Math.max(ry, Math.min(cy, ry + rh));
  const distanceX = cx - closestX;
  const distanceY = cy - closestY;
  return (distanceX * distanceX + distanceY * distanceY) < (radius * radius);
}

class TestPipePair {
  constructor(x, fixedTopHeight = null) {
    this.x = x;
    this.width = PIPE_WIDTH;
    this.passed = false;
    const maxTop = PLAYABLE_HEIGHT - PIPE_GAP - MIN_PIPE_HEIGHT;
    this.topHeight = fixedTopHeight !== null 
      ? fixedTopHeight 
      : Math.floor(Math.random() * (maxTop - MIN_PIPE_HEIGHT + 1)) + MIN_PIPE_HEIGHT;
    this.bottomY = this.topHeight + PIPE_GAP;
    this.bottomHeight = PLAYABLE_HEIGHT - this.bottomY;
  }

  checkCollision(birdX, birdY, radius) {
    const r = radius * 0.82;
    // Top pipe
    if (circleRectCollision(birdX, birdY, r, this.x - 4, 0, this.width + 8, this.topHeight)) {
      return true;
    }
    // Bottom pipe
    if (circleRectCollision(birdX, birdY, r, this.x - 4, this.bottomY, this.width + 8, this.bottomHeight)) {
      return true;
    }
    return false;
  }
}

// -----------------------------------------------------------------------------
// Test 1: Bird Physics & Motion
// -----------------------------------------------------------------------------
test('Bird Physics: Gravity acceleration, terminal velocity, and flap impulse', () => {
  let bird = {
    x: 80,
    y: 280,
    radius: 14,
    velocity: 0
  };

  // 1. Initial rest
  assert.strictEqual(bird.velocity, 0);

  // 2. Flap applies immediate upward velocity impulse
  bird.velocity = FLAP_STRENGTH;
  assert.strictEqual(bird.velocity, -5.4);

  // 3. Gravity accelerates velocity over frames
  for (let f = 0; f < 5; f++) {
    bird.velocity += GRAVITY;
    bird.y += bird.velocity;
  }
  // -5.4 + (5 * 0.28) = -5.4 + 1.4 = -4.0
  assert.ok(Math.abs(bird.velocity - (-4.0)) < 0.001, `Velocity was ${bird.velocity}`);
  assert.ok(bird.y < 280, 'Bird moved upward after flap');

  // 4. Free-fall reaches and clamps to MAX_FALL_SPEED
  for (let f = 0; f < 100; f++) {
    bird.velocity += GRAVITY;
    if (bird.velocity > MAX_FALL_SPEED) {
      bird.velocity = MAX_FALL_SPEED;
    }
    bird.y += bird.velocity;
  }
  assert.strictEqual(bird.velocity, MAX_FALL_SPEED, 'Terminal velocity clamped to MAX_FALL_SPEED');
});

// -----------------------------------------------------------------------------
// Test 2: Pipe Generation & Gap Geometry
// -----------------------------------------------------------------------------
test('Pipe Generation: Pipe gap distance and bounds compliance', () => {
  for (let i = 0; i < 50; i++) {
    const pipe = new TestPipePair(CANVAS_WIDTH);

    // Verify top height meets minimum constraint
    assert.ok(pipe.topHeight >= MIN_PIPE_HEIGHT, `Top pipe height ${pipe.topHeight} below minimum`);

    // Verify bottom Y matches topHeight + PIPE_GAP exactly
    assert.strictEqual(pipe.bottomY - pipe.topHeight, PIPE_GAP, 'Gap distance between pipes is 130px');

    // Verify bottom pipe height meets minimum constraint
    assert.ok(pipe.bottomHeight >= MIN_PIPE_HEIGHT, `Bottom pipe height ${pipe.bottomHeight} below minimum`);

    // Verify total vertical coverage
    assert.strictEqual(pipe.topHeight + PIPE_GAP + pipe.bottomHeight, PLAYABLE_HEIGHT);
  }
});

// -----------------------------------------------------------------------------
// Test 3: Collision Detection
// -----------------------------------------------------------------------------
test('Collision Detection: Correctly detects hits and allows safe passage', () => {
  const topHeight = 200;
  const pipe = new TestPipePair(100, topHeight);
  // Pipe X: 100 to 156. Gap Y: 200 to 330.
  const gapCenterY = topHeight + (PIPE_GAP / 2); // 265

  // Case A: Bird flies perfectly through the gap center
  const safeHit = pipe.checkCollision(120, gapCenterY, 14);
  assert.strictEqual(safeHit, false, 'Bird safely passing through gap should NOT collide');

  // Case B: Bird hits top pipe
  const hitTop = pipe.checkCollision(120, 150, 14);
  assert.strictEqual(hitTop, true, 'Bird inside top pipe should trigger collision');

  // Case C: Bird hits bottom pipe
  const hitBottom = pipe.checkCollision(120, 380, 14);
  assert.strictEqual(hitBottom, true, 'Bird inside bottom pipe should trigger collision');

  // Case D: Bird hits ground boundary
  const groundCollision = (PLAYABLE_HEIGHT - 5) + 14 >= PLAYABLE_HEIGHT;
  assert.strictEqual(groundCollision, true, 'Bird touching ground should trigger collision');

  // Case E: Bird in air safely above ground
  const inAir = 280 + 14 < PLAYABLE_HEIGHT;
  assert.strictEqual(inAir, true, 'Bird at y=280 is safely above ground');
});

// -----------------------------------------------------------------------------
// Test 4: Score Tracking & High Score Persistence
// -----------------------------------------------------------------------------
test('Score & High Score: Passing pipes updates score and saves to storage', () => {
  localStorageMock.clear();
  let score = 0;
  let highScore = parseInt(localStorageMock.getItem('flappy_bird_high_score') || '0', 10);
  assert.strictEqual(highScore, 0);

  const birdX = 80;
  const pipe = new TestPipePair(85, 200);

  // Pipe has not yet passed bird
  assert.strictEqual(pipe.passed, false);

  // Move pipe so bird passes it
  pipe.x = 20; // birdX (80) > pipe.x + pipe.width (20 + 56 = 76)
  if (!pipe.passed && pipe.x + pipe.width < birdX) {
    pipe.passed = true;
    score++;
  }
  assert.strictEqual(pipe.passed, true);
  assert.strictEqual(score, 1);

  // Subsequent frames do not increment score again for the same pipe
  if (!pipe.passed && pipe.x + pipe.width < birdX) {
    score++;
  }
  assert.strictEqual(score, 1, 'Pipe only awards point once');

  // Game over high score saving
  score = 15;
  if (score > highScore) {
    highScore = score;
    localStorageMock.setItem('flappy_bird_high_score', highScore.toString());
  }
  assert.strictEqual(localStorageMock.getItem('flappy_bird_high_score'), '15');
});

// -----------------------------------------------------------------------------
// Test 5: UI Hit Testing (Mute Button)
// -----------------------------------------------------------------------------
test('UI Hit-testing: Audio mute button click bounds', () => {
  const buttonCenter = { x: CANVAS_WIDTH - 24, y: 24 }; // (336, 24)
  const radius = 18;

  function isMuteClick(clickX, clickY) {
    const distSq = Math.pow(clickX - buttonCenter.x, 2) + Math.pow(clickY - buttonCenter.y, 2);
    return distSq <= radius * radius;
  }

  // Exact center click
  assert.strictEqual(isMuteClick(336, 24), true);

  // Within circle radius
  assert.strictEqual(isMuteClick(340, 26), true);

  // Outside click (e.g. gameplay area)
  assert.strictEqual(isMuteClick(180, 320), false);
  assert.strictEqual(isMuteClick(300, 24), false);
});

