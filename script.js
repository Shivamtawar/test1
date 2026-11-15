(function () {
  "use strict";

  const GRID_SIZE = 20;
  const TICK_MS = 120;
  const INITIAL_SNAKE = [
    { row: 10, column: 8 },
    { row: 10, column: 7 },
    { row: 10, column: 6 },
  ];
  const DIRECTIONS = {
    ArrowUp: { row: -1, column: 0 },
    ArrowDown: { row: 1, column: 0 },
    ArrowLeft: { row: 0, column: -1 },
    ArrowRight: { row: 0, column: 1 },
  };

  const boardElement = document.querySelector("#board");
  const scoreElement = document.querySelector("#score");
  const statusElement = document.querySelector("#status");
  const startButton = document.querySelector("#start-button");
  const cells = [];

  const state = {
    snake: [],
    direction: DIRECTIONS.ArrowRight,
    nextDirection: DIRECTIONS.ArrowRight,
    food: null,
    score: 0,
    running: false,
    gameOver: false,
    animationFrame: null,
    lastFrame: 0,
    elapsed: 0,
  };

  function samePosition(first, second) {
    return first.row === second.row && first.column === second.column;
  }

  function positionToIndex(position) {
    return position.row * GRID_SIZE + position.column;
  }

  function isInsideBoard(position) {
    return (
      position.row >= 0 &&
      position.row < GRID_SIZE &&
      position.column >= 0 &&
      position.column < GRID_SIZE
    );
  }

  function isOccupied(position, segments) {
    return segments.some((segment) => samePosition(segment, position));
  }

  function createFood(segments) {
    const emptyCells = [];

    for (let row = 0; row < GRID_SIZE; row += 1) {
      for (let column = 0; column < GRID_SIZE; column += 1) {
        const position = { row, column };
        if (!isOccupied(position, segments)) {
          emptyCells.push(position);
        }
      }
    }

    if (emptyCells.length === 0) {
      return null;
    }

    return emptyCells[Math.floor(Math.random() * emptyCells.length)];
  }

  function createBoard() {
    const fragment = document.createDocumentFragment();

    for (let index = 0; index < GRID_SIZE * GRID_SIZE; index += 1) {
      const cell = document.createElement("div");
      cell.className = "cell";
      cell.setAttribute("role", "gridcell");
      fragment.appendChild(cell);
      cells.push(cell);
    }

    boardElement.appendChild(fragment);
  }

  function render() {
    cells.forEach((cell) => {
      cell.className = "cell";
    });

    state.snake.forEach((segment, index) => {
      const cell = cells[positionToIndex(segment)];
      cell.classList.add("cell--snake");
      if (index === 0) {
        cell.classList.add("cell--snake-head");
      }
    });

    if (state.food) {
      cells[positionToIndex(state.food)].classList.add("cell--food");
    }

    scoreElement.textContent = String(state.score);
  }

  function setStatus(message, isGameOver) {
    statusElement.textContent = message;
    statusElement.classList.toggle("status--game-over", isGameOver);
  }

  function resetState() {
    state.snake = INITIAL_SNAKE.map((segment) => ({ ...segment }));
    state.direction = DIRECTIONS.ArrowRight;
    state.nextDirection = DIRECTIONS.ArrowRight;
    state.food = createFood(state.snake);
    state.score = 0;
    state.running = false;
    state.gameOver = false;
    state.lastFrame = 0;
    state.elapsed = 0;
    startButton.textContent = "Start game";
    setStatus("Press Start to begin.", false);
    render();
  }

  function stopGame(message) {
    state.running = false;
    state.gameOver = true;
    setStatus(message, true);
    startButton.textContent = "Play again";
  }

  function moveSnake() {
    state.direction = state.nextDirection;
    const head = state.snake[0];
    const nextHead = {
      row: head.row + state.direction.row,
      column: head.column + state.direction.column,
    };
    const eating = state.food && samePosition(nextHead, state.food);
    const bodyToCheck = eating ? state.snake : state.snake.slice(0, -1);

    if (!isInsideBoard(nextHead) || isOccupied(nextHead, bodyToCheck)) {
      stopGame("Game over! Try again.");
      return;
    }

    state.snake.unshift(nextHead);

    if (eating) {
      state.score += 1;
      state.food = createFood(state.snake);

      if (!state.food) {
        stopGame("You filled the board! You win!");
        render();
        return;
      }
    } else {
      state.snake.pop();
    }

    render();
  }

  function gameLoop(timestamp) {
    if (!state.running) {
      state.animationFrame = null;
      return;
    }

    if (!state.lastFrame) {
      state.lastFrame = timestamp;
    }

    state.elapsed += timestamp - state.lastFrame;
    state.lastFrame = timestamp;

    while (state.elapsed >= TICK_MS && state.running) {
      state.elapsed -= TICK_MS;
      moveSnake();
    }

    state.animationFrame = window.requestAnimationFrame(gameLoop);
  }

  function startGame() {
    if (state.animationFrame !== null) {
      window.cancelAnimationFrame(state.animationFrame);
    }

    resetState();
    state.running = true;
    state.gameOver = false;
    startButton.textContent = "Restart game";
    setStatus("Game in progress.", false);
    state.animationFrame = window.requestAnimationFrame(gameLoop);
  }

  function handleKeyDown(event) {
    const requestedDirection = DIRECTIONS[event.key];
    if (!requestedDirection) {
      return;
    }

    event.preventDefault();
    const currentDirection = state.direction;
    const isReverse =
      requestedDirection.row + currentDirection.row === 0 &&
      requestedDirection.column + currentDirection.column === 0;

    if (!isReverse) {
      state.nextDirection = requestedDirection;
    }
  }

  createBoard();
  resetState();
  document.addEventListener("keydown", handleKeyDown);
  startButton.addEventListener("click", startGame);

  window.SnakeGame = {
    createFood,
    isInsideBoard,
    samePosition,
    state,
  };
})();
