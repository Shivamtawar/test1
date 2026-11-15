const guessForm = document.querySelector("#guess-form");
const guessInput = document.querySelector("#guess-input");
const feedback = document.querySelector("#feedback");
const attemptCount = document.querySelector("#attempt-count");
const restartButton = document.querySelector("#restart-button");

let targetNumber;
let attempts;
let gameOver;

function startGame() {
  targetNumber = Math.floor(Math.random() * 100) + 1;
  attempts = 0;
  gameOver = false;

  attemptCount.textContent = attempts;
  feedback.textContent = "Make your first guess to get started!";
  feedback.className = "feedback";
  guessInput.value = "";
  guessInput.disabled = false;
  guessForm.querySelector("button").disabled = false;
  guessInput.focus();
}

guessForm.addEventListener("submit", (event) => {
  event.preventDefault();

  if (gameOver || !guessInput.reportValidity()) {
    return;
  }

  const guess = Number(guessInput.value);
  attempts += 1;
  attemptCount.textContent = attempts;

  if (guess === targetNumber) {
    feedback.textContent = `You got it! The number was ${targetNumber}. Great job!`;
    feedback.className = "feedback correct";
    gameOver = true;
    guessInput.disabled = true;
    guessForm.querySelector("button").disabled = true;
  } else if (guess > targetNumber) {
    feedback.textContent = "Too high! Try a smaller number.";
    feedback.className = "feedback too-high";
  } else {
    feedback.textContent = "Too low! Try a bigger number.";
    feedback.className = "feedback too-low";
  }

  if (!gameOver) {
    guessInput.select();
  }
});

restartButton.addEventListener("click", startGame);

startGame();
