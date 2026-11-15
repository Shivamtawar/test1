# Product Requirement Document (PRD)
## Project: Simple Flappy Bird Web Game

* **Status:** Proposed / Planning
* **Author:** Antigravity
* **Date:** 2026-11-15
* **Target Stack:** HTML5, CSS3, Vanilla JavaScript (Zero external dependencies)

---

## 1. Executive Summary
The goal of this project is to build a lightweight, responsive, and fun browser-based clone of the classic **Flappy Bird** arcade game. The game will be built entirely using standard web technologies (HTML5 Canvas, CSS, and Vanilla JS) with no build tools, bundlers, or third-party libraries required. It must be instantly runnable by opening `index.html` in any modern web browser or hosting on any static web server.

---

## 2. Key Objectives & Success Criteria
* **Simplicity & Accessibility:** Completely self-contained within 3 core files (`index.html`, `style.css`, `game.js`).
* **Instant Playability:** Supports keyboard (Space / Up Arrow), mouse clicks, and touch/tap controls for mobile devices.
* **Authentic Arcade Feel:** Smooth physics (gravity, jump velocity, bird tilt angle) and 60fps canvas rendering.
* **Zero External Asset Hassles:** Procedural canvas graphics (pixel/retro bird, pipes, ground, sky) and optional procedural Web Audio API retro sound effects (jump, score, hit) so no missing assets or CORS issues occur.
* **Persistent Scoring:** Local high-score tracking stored in `localStorage`.

---

## 3. Game Specifications & Mechanics

### 3.1 Game States
1. **START (`get-ready`)**:
   - Bird idles with a gentle sinusoidal bobbing motion.
   - Screen displays prompt: *"Press Space or Tap to Fly"*.
   - Pipes are not moving; score is reset to 0.
2. **PLAYING**:
   - Gravity applies to the bird on every animation frame.
   - Pipes spawn at regular intervals and scroll leftward.
   - Passing through pipe gaps awards +1 point.
   - Player inputs apply instant upward impulses (flap).
3. **GAMEOVER**:
   - Triggered on collision with ground, ceiling, or any pipe.
   - Bird drops and screen shakes briefly.
   - Displays final score, best score from `localStorage`, and prompt: *"Press Space or Tap to Restart"*.

### 3.2 Physics & Tuning Parameters
| Parameter | Value / Range | Description |
| :--- | :--- | :--- |
| **Canvas Size** | 360 x 640 px | Native mobile aspect ratio (9:16), centered & scaled by CSS |
| **Gravity** | ~0.25 - 0.3 px/frame² | Constant downward acceleration |
| **Flap Strength** | -4.5 to -5.5 px/frame | Instant vertical velocity boost |
| **Terminal Velocity** | 8.0 px/frame | Maximum falling speed |
| **Pipe Speed** | 2.0 px/frame | Horizontal scroll speed to the left |
| **Pipe Gap** | 120 - 130 px | Vertical gap distance between top and bottom pipes |
| **Pipe Spawn Rate** | Every 100 - 120 frames | Frequency of new pipe obstacles |

### 3.3 Visual & Audio Design
* **Graphics:**
  - Sky: Soft blue background with procedurally drawn fluffy clouds.
  - Pipes: Classic arcade green with distinct darker rims/caps and highlights.
  - Ground: Striped moving ground layer to give a sense of continuous motion.
  - Bird: Yellow round body, large cartoon eye, orange beak, flapping wing animation, and rotation tied to vertical velocity (tilts up when flapping, dives downward when falling).
* **Audio (Web Audio API Synthesizer):**
  - Synthesized retro square/sine wave tones for:
    - *Flap*: Quick rising frequency blip.
    - *Score*: Bright two-tone chime.
    - *Hit / Fall*: Low-pitch noise / thud.
  - Guaranteed to work offline with zero external audio file dependencies.

### 3.4 Controls
* **Desktop Keyboard:** `Space` bar, `ArrowUp`, or `W`
* **Desktop Mouse:** Left Mouse Button click
* **Mobile / Touch:** Any screen tap (`touchstart`)

---

## 4. Architecture & File Structure

```
FlappyGame/
│
├── index.html       # HTML5 boilerplate, canvas container, game UI overlays
├── style.css        # Minimalist layout, centering, arcade border, responsive canvas
└── game.js          # Game loop, state machine, physics, audio synth, input handlers
```

---

## 5. Implementation Milestones

* **Milestone 1: Project Setup & Canvas Scaffolding**
  - Setup `index.html` and `style.css`.
  - Initialize the `<canvas>` element and `requestAnimationFrame` render loop.
* **Milestone 2: Bird Entity & Physics**
  - Implement Bird object with position, velocity, gravity, jump impulse, and tilt angle.
  - Add user input listeners (Keyboard, Mouse, Touch).
* **Milestone 3: Pipe Generation & Scrolling**
  - Implement Pipe generator with random heights and consistent gap distance.
  - Implement horizontal scrolling and cleanup of off-screen pipes.
* **Milestone 4: Collision Detection & Score Tracking**
  - Circular / bounding box collision detection against ceiling, ground, and pipe obstacles.
  - Pipe passing detection and score incrementing.
  - `localStorage` high score persistence.
* **Milestone 5: State Machine & UI Polish**
  - Implement Start, Playing, and Game Over states.
  - Add start/game-over text overlays and sound effects via Web Audio API.

---

## 6. Acceptance Criteria
1. Running `index.html` loads the game without console errors.
2. Pressing Space or tapping makes the bird flap up against gravity.
3. Pipes spawn and move smoothly at ~60fps.
4. Colliding with pipes or ground immediately triggers Game Over.
5. High score persists across browser refreshes.
6. Responsive and playable on both desktop and mobile viewports.
