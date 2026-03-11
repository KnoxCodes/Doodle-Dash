const API_URL = "http://127.0.0.1:8000/predict";
const CLASSES = ["cat", "dog", "fish", "car", "apple", "tree", "house", "star", "crown", "airplane"];
const GAME_TIME = 10;

const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

const promptText = document.getElementById("promptText");
const scoreValue = document.getElementById("scoreValue");
const timerText = document.getElementById("timerText");
const timerFill = document.getElementById("timerFill");
const statusBox = document.getElementById("statusBox");
const predictionState = document.getElementById("predictionState");
const predictionsBox = document.getElementById("predictions");

const startBtn = document.getElementById("startBtn");
const newRoundBtn = document.getElementById("newRoundBtn");
const clearBtn = document.getElementById("clearBtn");

let isDrawing = false;
let hasDrawn = false;
let hasChangedSinceLastSend = false;
let gameState = "idle";
let currentPrompt = "cat";
let score = 0;
let timeLeft = GAME_TIME;
let timerInterval = null;
let predictionInterval = null;

function setupCanvas() {
  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = "black";
  ctx.lineWidth = 12;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
}

function clearCanvas() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.beginPath();
  hasDrawn = false;
  hasChangedSinceLastSend = false;
}

function getRandomPrompt() {
  return CLASSES[Math.floor(Math.random() * CLASSES.length)];
}

function updateScore() {
  scoreValue.textContent = String(score);
}

function updatePrompt() {
  promptText.textContent = currentPrompt.toUpperCase();
}

function updateTimerUI() {
  timerText.textContent = `${timeLeft}s`;
  const pct = (timeLeft / GAME_TIME) * 100;
  timerFill.style.width = `${pct}%`;
}

function setStatus(message, type = "") {
  statusBox.className = "status-box";
  if (type === "success") statusBox.classList.add("success");
  if (type === "fail") statusBox.classList.add("fail");
  statusBox.innerHTML = message;
}

function resetPredictionsUI() {
  predictionState.textContent = "Waiting for drawing...";
  predictionsBox.innerHTML = `
    <div class="prediction-item"><span>#1</span><span>—</span></div>
    <div class="prediction-item"><span>#2</span><span>—</span></div>
    <div class="prediction-item"><span>#3</span><span>—</span></div>
  `;
}

function renderPredictions(predictions) {
  if (!predictions || predictions.length === 0) {
    resetPredictionsUI();
    return;
  }

  predictionState.textContent = "Live predictions";
  predictionsBox.innerHTML = predictions
    .map((p, i) => {
      const cls = i === 0 ? "prediction-item top" : "prediction-item";
      return `
        <div class="${cls}">
          <span class="prediction-label">#${i + 1} ${p.class}</span>
          <span class="prediction-confidence">${(p.confidence * 100).toFixed(1)}%</span>
        </div>
      `;
    })
    .join("");
}

function stopLoops() {
  if (timerInterval) clearInterval(timerInterval);
  if (predictionInterval) clearInterval(predictionInterval);
  timerInterval = null;
  predictionInterval = null;
}

function startGame() {
  stopLoops();
  gameState = "playing";
  currentPrompt = getRandomPrompt();
  timeLeft = GAME_TIME;

  updatePrompt();
  updateTimerUI();
  resetPredictionsUI();
  clearCanvas();

  setStatus(`Draw <strong>${currentPrompt.toUpperCase()}</strong> before time runs out.`);
  predictionState.textContent = "Start drawing...";

  timerInterval = setInterval(() => {
    timeLeft -= 1;
    updateTimerUI();

    if (timeLeft <= 0) {
      finishGame(false);
    }
  }, 1000);

  predictionInterval = setInterval(async () => {
    if (gameState !== "playing") return;
    if (!hasDrawn || !hasChangedSinceLastSend) return;

    try {
      predictionState.textContent = "AI is guessing...";
      const predictions = await sendDrawingForPrediction();
      renderPredictions(predictions);

      if (predictions.length > 0 && predictions[0].class === currentPrompt) {
        finishGame(true);
      }
    } catch (error) {
      predictionState.textContent = "AI unavailable";
    }
  }, 1000);
}

function finishGame(won) {
  stopLoops();
  gameState = "result";

  if (won) {
    score += 10;
    updateScore();
    setStatus(`🎉 Correct! The AI guessed <strong>${currentPrompt.toUpperCase()}</strong>. +10 points`, "success");
  } else {
    setStatus(`⏱ Time's up! You were supposed to draw <strong>${currentPrompt.toUpperCase()}</strong>.`, "fail");
  }
}

async function sendDrawingForPrediction() {
  hasChangedSinceLastSend = false;

  const blob = await new Promise((resolve, reject) => {
    canvas.toBlob((b) => {
      if (b) resolve(b);
      else reject(new Error("Failed to create image blob"));
    }, "image/png");
  });

  const formData = new FormData();
  formData.append("file", blob, "drawing.png");

  const response = await fetch(API_URL, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error("Prediction request failed");
  }

  const data = await response.json();
  return data.predictions || [];
}

function getCanvasPos(e) {
  const rect = canvas.getBoundingClientRect();

  if (e.touches && e.touches[0]) {
    return {
      x: e.touches[0].clientX - rect.left,
      y: e.touches[0].clientY - rect.top,
    };
  }

  return {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top,
  };
}

function startDraw(e) {
  if (gameState !== "playing") return;
  isDrawing = true;
  const pos = getCanvasPos(e);
  ctx.beginPath();
  ctx.moveTo(pos.x, pos.y);
  e.preventDefault();
}

function draw(e) {
  if (!isDrawing || gameState !== "playing") return;
  const pos = getCanvasPos(e);
  ctx.lineTo(pos.x, pos.y);
  ctx.stroke();
  hasDrawn = true;
  hasChangedSinceLastSend = true;
  e.preventDefault();
}

function endDraw() {
  isDrawing = false;
  ctx.beginPath();
}

canvas.addEventListener("mousedown", startDraw);
canvas.addEventListener("mousemove", draw);
canvas.addEventListener("mouseup", endDraw);
canvas.addEventListener("mouseleave", endDraw);

canvas.addEventListener("touchstart", startDraw, { passive: false });
canvas.addEventListener("touchmove", draw, { passive: false });
canvas.addEventListener("touchend", endDraw);

startBtn.addEventListener("click", startGame);
newRoundBtn.addEventListener("click", startGame);
clearBtn.addEventListener("click", () => {
  clearCanvas();
  resetPredictionsUI();
  if (gameState === "playing") {
    predictionState.textContent = "Canvas cleared. Start drawing again...";
    setStatus(`Draw <strong>${currentPrompt.toUpperCase()}</strong> before time runs out.`);
  } else {
    setStatus("Canvas cleared.");
  }
});

setupCanvas();
updatePrompt();
updateScore();
updateTimerUI();
resetPredictionsUI();