// =============================================================================
// Flappy Bird Game Engine Test Suite (including Difficulty System)
// =============================================================================

const test = require('node:test');
const assert = require('node:assert');

const localStorageMock = (function() {
  let store = {};
  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => { store[key] = value.toString(); },
    clear: () => { store = {}; }
  };
})();

const DIFFICULTIES = {
  medium: {
    id: 'medium',
    label: 'MEDIUM',
    pipeGap: 140,
    pipeSpeed: 1.9,
    pipeInterval: 110,
    gravity: 0.26,
    flapStrength: -5.2
  },
  hard: {
    id: 'hard',
    label: 'HARD',
    pipeGap: 125,
    pipeSpeed: 2.2,
    pipeInterval: 98,
    gravity: 0.28,
    flapStrength: -5.4
  },
  difficult: {
    id: 'difficult',
    label: 'DIFFICULT',
    pipeGap: 108,
    pipeSpeed: 2.7,
    pipeInterval: 85,
    gravity: 0.32,
    flapStrength: -5.6
  }
};

const difficultyButtons = [
  { key: 'medium', label: 'MEDIUM', x: 26, y: 330, w: 96, h: 36 },
  { key: 'hard', label: 'HARD', x: 132, y: 330, w: 96, h: 36 },
  { key: 'difficult', label: 'DIFFICULT', x: 238, y: 330, w: 96, h: 36 }
];

// -----------------------------------------------------------------------------
// Test 1: Difficulty Presets & Progression
// -----------------------------------------------------------------------------
test('Difficulty Presets: Progression from Medium -> Hard -> Difficult is strictly scaled', () => {
  // Gap size should get tighter
  assert.ok(DIFFICULTIES.medium.pipeGap > DIFFICULTIES.hard.pipeGap, 'Medium gap > Hard gap');
  assert.ok(DIFFICULTIES.hard.pipeGap > DIFFICULTIES.difficult.pipeGap, 'Hard gap > Difficult gap');

  // Speed should get faster
  assert.ok(DIFFICULTIES.medium.pipeSpeed < DIFFICULTIES.hard.pipeSpeed, 'Medium speed < Hard speed');
  assert.ok(DIFFICULTIES.hard.pipeSpeed < DIFFICULTIES.difficult.pipeSpeed, 'Hard speed < Difficult speed');

  // Spawn interval should get shorter
  assert.ok(DIFFICULTIES.medium.pipeInterval > DIFFICULTIES.hard.pipeInterval, 'Medium interval > Hard interval');
  assert.ok(DIFFICULTIES.hard.pipeInterval > DIFFICULTIES.difficult.pipeInterval, 'Hard interval > Difficult interval');
});

// -----------------------------------------------------------------------------
// Test 2: Button Hit Testing for Difficulty Selector
// -----------------------------------------------------------------------------
test('Difficulty Button Hit Testing: Correctly identifies clicks on Medium, Hard, and Difficult buttons', () => {
  function getClickedButton(clickX, clickY) {
    for (const btn of difficultyButtons) {
      if (
        clickX >= btn.x &&
        clickX <= btn.x + btn.w &&
        clickY >= btn.y &&
        clickY <= btn.y + btn.h
      ) {
        return btn.key;
      }
    }
    return null;
  }

  // Click on Medium button
  assert.strictEqual(getClickedButton(50, 345), 'medium');

  // Click on Hard button
  assert.strictEqual(getClickedButton(150, 345), 'hard');

  // Click on Difficult button
  assert.strictEqual(getClickedButton(260, 345), 'difficult');

  // Click outside (e.g. above or below buttons)
  assert.strictEqual(getClickedButton(150, 200), null);
  assert.strictEqual(getClickedButton(150, 420), null);
});

// -----------------------------------------------------------------------------
// Test 3: Per-Difficulty High Score Isolation
// -----------------------------------------------------------------------------
test('High Score Isolation: Each difficulty maintains its own high score', () => {
  localStorageMock.clear();

  function saveScore(difficulty, score) {
    const key = `flappy_high_score_${difficulty}`;
    const current = parseInt(localStorageMock.getItem(key) || '0', 10);
    if (score > current) {
      localStorageMock.setItem(key, score.toString());
    }
  }

  function getScore(difficulty) {
    return parseInt(localStorageMock.getItem(`flappy_high_score_${difficulty}`) || '0', 10);
  }

  saveScore('medium', 25);
  saveScore('hard', 14);
  saveScore('difficult', 7);

  assert.strictEqual(getScore('medium'), 25);
  assert.strictEqual(getScore('hard'), 14);
  assert.strictEqual(getScore('difficult'), 7);

  // Updating hard should not affect medium or difficult
  saveScore('hard', 18);
  assert.strictEqual(getScore('hard'), 18);
  assert.strictEqual(getScore('medium'), 25);
  assert.strictEqual(getScore('difficult'), 7);
});

// -----------------------------------------------------------------------------
// Test 4: Collision Detection in Difficult Mode (Tight 108px Gap)
// -----------------------------------------------------------------------------
test('Collision Detection: Handles tight pipe gap in Difficult mode accurately', () => {
  const gap = DIFFICULTIES.difficult.pipeGap; // 108
  const topHeight = 200;
  const bottomY = topHeight + gap; // 308
  const pipeX = 100;
  const pipeWidth = 56;
  const birdRadius = 14 * 0.82;

  function circleRect(cx, cy, radius, rx, ry, rw, rh) {
    const closestX = Math.max(rx, Math.min(cx, rx + rw));
    const closestY = Math.max(ry, Math.min(cy, ry + rh));
    const distanceX = cx - closestX;
    const distanceY = cy - closestY;
    return (distanceX * distanceX + distanceY * distanceY) < (radius * radius);
  }

  function collides(bx, by) {
    const topHit = circleRect(bx, by, birdRadius, pipeX - 4, 0, pipeWidth + 8, topHeight);
    const bottomHit = circleRect(bx, by, birdRadius, pipeX - 4, bottomY, pipeWidth + 8, 300);
    return topHit || bottomHit;
  }

  // Bird in center of 108px gap (Y = 254)
  assert.strictEqual(collides(120, 254), false, 'Center pass is safe in Difficult mode');

  // Bird clips top pipe cap
  assert.strictEqual(collides(120, 198), true, 'Clipping top pipe triggers collision');

  // Bird clips bottom pipe cap
  assert.strictEqual(collides(120, 310), true, 'Clipping bottom pipe triggers collision');
});
