# Pac-Man Browser Game Plan

## Goal

Build a single-player Pac-Man-style game that runs in a desktop browser. The player navigates a fixed maze with the arrow keys, collects every dot and power pellet, avoids four ghosts, and either completes the level or loses all three lives.

## Scope and implementation choices

- Use plain HTML, CSS, and JavaScript with the Canvas 2D API; no framework, external assets, or build step.
- Use a fixed, rectangular tile-grid maze. The same grid defines walls, walkable corridors, collectibles, and valid ghost routes.
- Draw the maze, pellets, Pac-Man, and ghosts with canvas shapes so the game has no asset dependencies.
- Treat a power pellet as a collectible worth 50 points. It does not frighten ghosts or otherwise change their behavior in this version.
- Keep the game to one level. Restarting resets the maze, score, lives, player, and ghosts.

## Proposed files

- `index.html` — canvas, score/lives display, status message, and restart control; loads the game script.
- `styles.css` — centered game layout, readable HUD, canvas sizing, and terminal-screen styling.
- `game.js` — maze data, input, game loop, movement, ghost AI, collisions, rendering, scoring, and game states.
- `README.md` — how to run the game and its controls.

## Gameplay design

### Maze and rendering

1. Represent the maze as rows of equal-width tile characters: wall, empty corridor, normal dot, power pellet, and spawn markers.
2. Parse the map once at startup into a wall grid and a mutable collectible grid. Keep the map dimensions and tile size in named constants.
3. Use a single canvas renderer that draws walls, remaining collectibles, the player, and ghosts from the current game state.
4. Scale the canvas to fit the page while preserving the maze's aspect ratio; keep tile positions in logical grid coordinates.

### Player controls and movement

1. Capture the four arrow keys and prevent their default page-scrolling behavior while the game is active.
2. Store the requested direction separately from the current direction. Apply a requested turn at the next tile center if that direction is open, so turns feel responsive.
3. Move at a fixed rate in tile units per second using elapsed frame time, and reject movement into wall tiles.
4. On entering a collectible tile, remove it and add 10 points for a normal dot or 50 points for a power pellet.
5. Count remaining dots and power pellets together; transition to the win state when the count reaches zero.

### Ghost movement and collision

1. Create four ghosts with separate spawn positions, colors, and target-selection policies:
   - Red targets Pac-Man's current tile.
   - Pink targets a tile several steps ahead of Pac-Man's current direction.
   - Blue targets a tile derived from Pac-Man's position and Red's position.
   - Orange chases when far from Pac-Man and targets a home corner when nearby.
2. Start all ghosts inside a central pen. Keep them stationary and harmless until released; draw the pen and its exit gate on the maze.
3. Release one ghost at each score milestone: Red at 100, Pink at 200, Blue at 300, and Orange at 400. Open the pen exit when the first ghost is released and show how many ghosts are out in the HUD.
4. Use breadth-first search over walkable tiles to select a shortest wall-free route toward each released ghost's target. Re-evaluate routes at tile centers.
5. If a target is a wall or unreachable, use a reachable fallback target and choose only legal neighboring tiles; never move through a wall.
6. Check for a player-ghost collision after movement. A collision with a released ghost costs exactly one life, pauses movement briefly, then resets Pac-Man and all ghosts to their spawns without changing which ghosts have been released.
7. Ensure the respawn pause prevents overlapping ghosts from immediately removing multiple lives.

### Score, lives, and game states

- Initialize score to 0 and lives to 3; show both in the HUD throughout play.
- On the final life loss, stop the game loop's gameplay updates and show `GAME OVER`, the final score, and a Restart Game button.
- When all collectibles are gathered, stop gameplay updates and show `LEVEL COMPLETED / YOU WIN` and the final score.
- Restart from either terminal state by restoring the initial map, score, lives, positions, directions, and active state.

## Work sequence

1. Create the page shell, HUD, canvas, styling, fixed maze, and initial draw.
2. Add tile-based Pac-Man movement, arrow-key input, wall blocking, and collectible scoring.
3. Add four ghosts, their target policies, BFS routing, and one-life-per-collision handling.
4. Add respawn timing, win/game-over screens, final score, and restart behavior.
5. Add concise run instructions and verify the requirements with the checklist below.

## Acceptance checklist

- Arrow keys move Pac-Man through open corridors; walls block both player and ghosts.
- Each normal dot adds 10 points; each power pellet adds 50 points.
- Four ghosts use distinct target policies and navigate around walls.
- All four ghosts begin inside the pen and are released one at a time at 100, 200, 300, and 400 points in Red, Pink, Blue, Orange order.
- A ghost collision removes one life and resets both player and ghosts; the game starts with three lives.
- Losing all lives shows `GAME OVER`, the final score, and a working restart button.
- Collecting every dot and power pellet shows `LEVEL COMPLETED / YOU WIN`.
- Restart restores a clean game state, including all collectibles and the original score and lives.
- The game can be launched in a browser by opening `index.html`; no dependency installation is needed.
