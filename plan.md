# Snake Game Implementation Plan

> Project root: `/Users/apple/Desktop/Demo/ai-assisted-coding`

## Summary

Build a small browser-based Snake game from scratch using semantic HTML, custom CSS, and vanilla JavaScript. The game will use a grid board, arrow-key controls, wall and self-collision game over rules, food collection that grows the snake by one segment and increases the score, and a minimal start/restart interface. Tailwind CSS and other UI frameworks are out of scope.

## Confirmed Decisions

- Technology: HTML, CSS, and vanilla JavaScript only.
- Controls: Arrow keys.
- Collision rules: Hitting a wall or the snake's own body ends the game.
- Food: Food respawns in an empty cell; eating it adds one segment and increases the score.
- UI: Minimal board, score, start/restart control, and game-over state.
- Persistence: No localStorage high-score persistence.

## Requirements

- REQ-001: Provide a playable Snake game in a browser using HTML, CSS, and vanilla JavaScript.
- REQ-002: Render a bounded grid board with a visible snake and food item.
- REQ-003: Move the snake from keyboard arrow-key input on a timed game loop.
- REQ-004: End the current game when the snake hits a wall or its own body.
- REQ-005: When the snake eats food, increase its length by one segment, increase the score, and place food in an unoccupied cell.
- REQ-006: Provide minimal start, restart, score, and game-over UI states.
- REQ-007: Keep styling framework-free and responsive enough for common desktop and mobile browser widths.

## Technical Context

- Start with a static project containing `index.html`, `styles.css`, and `script.js`.
- Use a fixed logical grid represented by row/column coordinates in JavaScript.
- Keep game state in a single explicit model: snake segments, direction, queued direction, food position, score, timer, and running/game-over status.
- Render the board through DOM elements or CSS grid; use distinct classes for snake segments and food.
- Prevent immediate 180-degree turns and ensure food placement never overlaps the snake.
- Use `requestAnimationFrame` with elapsed-time stepping or a controlled interval; centralize timing so restart cannot create duplicate loops.
- Use accessible button text and status messaging without introducing a framework or persistence layer.

## Constitution Check

- No repository constitution or existing application constraints are present because the workspace is empty.
- Scope is limited to the requested game; no framework, backend, database, analytics, or high-score persistence will be introduced.
- Changes will be directly testable through browser interaction and lightweight JavaScript checks.

## Applied Guidelines

- No repository-specific guidelines were found.
- Use progressive enhancement-friendly HTML, CSS custom properties, clear state transitions, and small pure helpers for coordinate/collision logic.

## Implementation Steps

### Phase 1: Setup

#### P1.1: Create the static game shell (REQ-001, REQ-002, REQ-006, REQ-007)

Create the HTML document with a game heading, score display, board container, status message, and start/restart button. Add framework-free responsive CSS for the page, board grid, snake segments, food, button, and game-over presentation.

Tasks:

- [ ] T001 [Plan:P1.1] Create `index.html` with the semantic game shell, board element, score/status elements, and start/restart button.
- [ ] T002 [P] [Plan:P1.1] Create `styles.css` with responsive layout, board grid styling, snake/food classes, and game-state visual styles.

### Phase 2: Foundational Game Engine

#### P2.1: Implement state, rendering, and game loop (REQ-002, REQ-003, REQ-006)

Implement the coordinate-based state model, board initialization, rendering helpers, timed movement loop, start/reset behavior, and score/status updates in vanilla JavaScript.

Tasks:

- [ ] T003 [Plan:P2.1] Create `script.js` with grid constants, initial state, board-cell creation, and render functions.
- [ ] T004 [Plan:P2.1] Implement arrow-key input handling, direction validation, timed movement, and duplicate-loop prevention.
- [ ] T005 [Plan:P2.1] Implement start, restart, and game-over state transitions with score and status updates.

### Phase 3: Core Gameplay

#### P3.1: Implement collision and food mechanics (REQ-004, REQ-005)

Add movement calculation, wall/self collision detection, food collision handling, growth, score updates, and random food placement constrained to empty cells.

Tasks:

- [ ] T006 [Plan:P3.1] Add pure coordinate helpers and collision checks for walls, self-collision, and food occupancy in `script.js`.
- [ ] T007 [Plan:P3.1] Update movement to grow the snake and increment score when food is eaten.
- [ ] T008 [Plan:P3.1] Implement empty-cell food spawning and the win/game-over-safe behavior for a full board.

### Phase 4: Verification and Polish

#### P4.1: Verify required behavior and browser UX (REQ-001 through REQ-007)

Run focused checks against the static files and manually verify the core interaction paths in a browser at desktop and narrow viewport widths.

Tasks:

- [ ] T009 [Plan:P4.1] Validate the HTML/CSS/JavaScript files for syntax and confirm no Tailwind or external UI framework dependency is present.
- [ ] T010 [Plan:P4.1] Exercise start, arrow-key movement, food growth/score, wall collision, self-collision, restart, and responsive layout behavior.

## Project Structure

```text
project-root/
├── index.html
├── styles.css
└── script.js
└── plan.md
```

The approved plan will also be written to `plan.md` in the project root, as requested. The session copy remains the planning artifact used for approval and tracking.

## Requirement Mapping

| REQ ID | Description | Plan Items | Implementation Evidence |
|--------|-------------|-------------|-------------------------|
| REQ-001 | Playable browser Snake game using HTML/CSS/vanilla JS | P1.1, P2.1, P4.1 | `index.html`, `styles.css`, `script.js` |
| REQ-002 | Bounded grid with visible snake and food | P1.1, P2.1 | Board markup, CSS grid, render functions |
| REQ-003 | Arrow-key movement on a timed loop | P2.1 | Keyboard handler and game loop in `script.js` |
| REQ-004 | Wall and self collision end the game | P3.1 | Collision helpers and game-over transition |
| REQ-005 | Food grows snake, increases score, and respawns safely | P3.1 | Movement, growth, scoring, and empty-cell spawning |
| REQ-006 | Minimal start/restart, score, and game-over UI | P1.1, P2.1 | Controls, score/status elements, state transitions |
| REQ-007 | Framework-free responsive styling | P1.1, P4.1 | `styles.css`, dependency check, narrow viewport verification |

## Notes

- The implementation should wait for the player to press Start before moving.
- The initial snake should have a short multi-segment body and a predictable starting direction.
- Randomness affects food placement only; all collision and growth behavior should remain deterministic for a given input sequence.
