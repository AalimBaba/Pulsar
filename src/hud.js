const levelElement = document.getElementById('level');
const healthElement = document.getElementById('health');
const timeLoopElement = document.getElementById('timeLoop');
const echoesElement = document.getElementById('echoes');
const scoreElement = document.getElementById('score');
const gameOverElement = document.getElementById('gameOver');
const restartBtn = document.getElementById('restartBtn');

let currentLevel = 1;
let currentScore = 0;
let isGameOver = false;
let onRestartCallback = null;

export function initHUD() {
  restartBtn.addEventListener('click', onRestartClick);
}

function onRestartClick() {
  if (onRestartCallback) {
    onRestartCallback();
  }
}

export function setOnRestartCallback(callback) {
  onRestartCallback = callback;
}

export function updateHUD(level, health, timeLoopProgress, echoCount, score) {
  if (levelElement) {
    levelElement.textContent = level;
  }

  if (healthElement) {
    healthElement.textContent = Math.max(0, health);
    if (health <= 25) {
      healthElement.classList.add('warning');
    } else {
      healthElement.classList.remove('warning');
    }
  }

  if (timeLoopElement) {
    timeLoopElement.textContent = Math.floor(timeLoopProgress) + '%';
    if (timeLoopProgress >= 90) {
      timeLoopElement.classList.add('warning');
    } else {
      timeLoopElement.classList.remove('warning');
    }
  }

  if (echoesElement) {
    echoesElement.textContent = echoCount;
  }

  if (scoreElement) {
    scoreElement.textContent = score;
  }
}

export function setLevel(level) {
  currentLevel = level;
  if (levelElement) {
    levelElement.textContent = level;
  }
}

export function setScore(score) {
  currentScore = score;
  if (scoreElement) {
    scoreElement.textContent = score;
  }
}

export function addScore(points) {
  currentScore += points;
  if (scoreElement) {
    scoreElement.textContent = currentScore;
  }
}

export function showGameOver() {
  isGameOver = true;
  if (gameOverElement) {
    gameOverElement.style.display = 'block';
  }
}

export function hideGameOver() {
  isGameOver = false;
  if (gameOverElement) {
    gameOverElement.style.display = 'none';
  }
}

export function isGameOverVisible() {
  return isGameOver;
}

export function resetHUD() {
  currentLevel = 1;
  currentScore = 0;
  isGameOver = false;

  if (levelElement) {
    levelElement.textContent = '1';
    levelElement.classList.remove('warning');
  }

  if (healthElement) {
    healthElement.textContent = '100';
    healthElement.classList.remove('warning');
  }

  if (timeLoopElement) {
    timeLoopElement.textContent = '0%';
    timeLoopElement.classList.remove('warning');
  }

  if (echoesElement) {
    echoesElement.textContent = '0';
  }

  if (scoreElement) {
    scoreElement.textContent = '0';
  }

  hideGameOver();
}

export function cleanup() {
  restartBtn.removeEventListener('click', onRestartClick);
}
