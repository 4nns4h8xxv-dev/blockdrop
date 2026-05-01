(() => {
  "use strict";

  const COLS = 10;
  const ROWS = 20;
  const PREVIEW_SIZE = 4;
  const NORMAL_STORAGE_KEY = "blockdrop-highscore-normal";
  const CHALLENGE_STORAGE_KEY = "blockdrop-highscore-challenge";
  const LEGACY_STORAGE_KEY = "blockdrop-highscore";
  const CHALLENGE_BLOCK = "CHALLENGE";
  const LINE_SCORES = [0, 100, 300, 500, 800];
  const START_DROP_MS = 900;
  const LEVEL_DROP_STEP_MS = 70;
  const MIN_DROP_MS = 110;

  const PIECES = {
    I: [
      [0, 0, 0, 0],
      [1, 1, 1, 1],
      [0, 0, 0, 0],
      [0, 0, 0, 0]
    ],
    O: [
      [1, 1],
      [1, 1]
    ],
    T: [
      [0, 1, 0],
      [1, 1, 1],
      [0, 0, 0]
    ],
    L: [
      [0, 0, 1],
      [1, 1, 1],
      [0, 0, 0]
    ],
    J: [
      [1, 0, 0],
      [1, 1, 1],
      [0, 0, 0]
    ],
    S: [
      [0, 1, 1],
      [1, 1, 0],
      [0, 0, 0]
    ],
    Z: [
      [1, 1, 0],
      [0, 1, 1],
      [0, 0, 0]
    ]
  };

  const challengeLevels = [
    {
      name: "Level 1: Sauberer Start",
      targetScore: 300,
      speedLevel: 1,
      description: "Erreiche 300 Punkte auf einem leeren Feld."
    },
    {
      name: "Level 2: Mehr Tempo",
      targetScore: 500,
      speedLevel: 3,
      description: "Etwas schneller, aber noch ohne Hindernisse."
    },
    {
      name: "Level 3: Lueckenarbeit",
      targetLines: 4,
      speedLevel: 2,
      description: "Loesche vier Linien trotz erster Startbloecke.",
      startBoard: [
        "..........",
        "..........",
        "..........",
        "..........",
        "..........",
        "..........",
        "..........",
        "..........",
        "..........",
        "..........",
        "..........",
        "..........",
        "..........",
        "..........",
        "..........",
        "..........",
        "..XX..XX..",
        "..XX..XX..",
        ".XXX..XXX.",
        "XXXX..XXXX"
      ]
    },
    {
      name: "Level 4: Druckstellen",
      targetScore: 800,
      speedLevel: 4,
      description: "Schneller Fall und versetzte Hindernisse.",
      startBoard: [
        "..........",
        "..........",
        "..........",
        "..........",
        "..........",
        "..........",
        "..........",
        "..........",
        "..........",
        "..........",
        "..........",
        "..........",
        "..........",
        "....XX....",
        "...XXXX...",
        "..........",
        ".XX....XX.",
        ".XXX..XXX.",
        "XX..XX..XX",
        "XXX....XXX"
      ]
    },
    {
      name: "Level 5: Enger Abschluss",
      targetLines: 6,
      speedLevel: 5,
      description: "Sechs Linien loeschen, ohne die Mitte zu verlieren.",
      startBoard: [
        "..........",
        "..........",
        "..........",
        "..........",
        "..........",
        "..........",
        "..........",
        "..........",
        "..........",
        "..........",
        "..........",
        ".....X....",
        "..X..X..X.",
        "..X.....X.",
        ".XX.XX.XX.",
        "XX..XX..XX",
        ".XXX..XXX.",
        "XX.XXXX.XX",
        "XXX.XX.XXX",
        "XXXX..XXXX"
      ]
    }
  ];

  const boardElement = document.querySelector("#board");
  const nextBoardElement = document.querySelector("#nextBoard");
  const scoreElement = document.querySelector("#score");
  const highScoreElement = document.querySelector("#highScore");
  const levelElement = document.querySelector("#level");
  const linesElement = document.querySelector("#lines");
  const scoreLabelElement = document.querySelector("#scoreLabel");
  const highScoreLabelElement = document.querySelector("#highScoreLabel");
  const levelLabelElement = document.querySelector("#levelLabel");
  const linesLabelElement = document.querySelector("#linesLabel");
  const modeLabelElement = document.querySelector("#modeLabel");
  const challengeNameElement = document.querySelector("#challengeName");
  const goalTextElement = document.querySelector("#goalText");
  const progressTextElement = document.querySelector("#progressText");
  const goalMeterElement = document.querySelector("#goalMeter");
  const goalBarElement = document.querySelector("#goalBar");
  const totalTextElement = document.querySelector("#totalText");
  const statusTextElement = document.querySelector("#statusText");
  const stateOverlay = document.querySelector("#stateOverlay");
  const stateTitle = document.querySelector("#stateTitle");
  const stateMessage = document.querySelector("#stateMessage");
  const finalScore = document.querySelector("#finalScore");
  const modeSelectElement = document.querySelector("#modeSelect");
  const overlayActionsElement = document.querySelector("#overlayActions");
  const overlayAction = document.querySelector("#overlayAction");
  const overlaySecondary = document.querySelector("#overlaySecondary");
  const primaryControl = document.querySelector("#primaryControl");
  const restartControl = document.querySelector("#restartControl");
  const touchButtons = document.querySelectorAll(".touch-button");
  const modeButtons = document.querySelectorAll("[data-mode]");
  const SWIPE_STEP_PX = 30;
  const SWIPE_VERTICAL_STEP_PX = 34;
  const SWIPE_TAP_LIMIT_PX = 8;

  let board = createBoard();
  let cells = [];
  let previewCells = [];
  let currentPiece = null;
  let nextType = null;
  let bag = [];
  let score = 0;
  let highScore = loadHighScore(NORMAL_STORAGE_KEY, LEGACY_STORAGE_KEY);
  let level = 1;
  let lines = 0;
  let gameMode = "normal";
  let gameState = "modeSelect";
  let challengeLevelIndex = 0;
  let challengeLevelScore = 0;
  let challengeTotalScore = 0;
  let challengeTarget = null;
  let dropCounter = 0;
  let lastTime = 0;

  function createBoard() {
    return Array.from({ length: ROWS }, () => Array(COLS).fill(null));
  }

  function buildCells() {
    boardElement.innerHTML = "";
    nextBoardElement.innerHTML = "";

    cells = Array.from({ length: COLS * ROWS }, () => {
      const cell = document.createElement("div");
      cell.className = "cell";
      cell.setAttribute("aria-hidden", "true");
      boardElement.appendChild(cell);
      return cell;
    });

    previewCells = Array.from({ length: PREVIEW_SIZE * PREVIEW_SIZE }, () => {
      const cell = document.createElement("div");
      cell.className = "preview-cell";
      nextBoardElement.appendChild(cell);
      return cell;
    });
  }

  function cloneMatrix(matrix) {
    return matrix.map((row) => row.slice());
  }

  function shuffle(items) {
    for (let index = items.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      [items[index], items[swapIndex]] = [items[swapIndex], items[index]];
    }
    return items;
  }

  function getNextTypeFromBag() {
    if (bag.length === 0) {
      bag = shuffle(Object.keys(PIECES));
    }

    return bag.pop();
  }

  function getActiveChallengeLevel() {
    return challengeLevels[challengeLevelIndex] || challengeLevels[0];
  }

  function getChallengeTarget(levelConfig) {
    if (levelConfig.targetLines) {
      return {
        type: "lines",
        amount: levelConfig.targetLines,
        label: `${levelConfig.targetLines} Linien`
      };
    }

    return {
      type: "score",
      amount: levelConfig.targetScore,
      label: `${levelConfig.targetScore} Punkte`
    };
  }

  function createPiece(type) {
    const matrix = cloneMatrix(PIECES[type]);
    const firstFilledRow = matrix.findIndex((row) => row.some(Boolean));

    return {
      type,
      matrix,
      row: firstFilledRow > 0 ? -firstFilledRow : 0,
      col: Math.floor((COLS - matrix[0].length) / 2)
    };
  }

  function spawnPiece() {
    currentPiece = createPiece(nextType || getNextTypeFromBag());
    nextType = getNextTypeFromBag();
    drawNextPiece();

    if (checkCollision(currentPiece.matrix, currentPiece.row, currentPiece.col)) {
      endGame();
    }
  }

  function checkCollision(matrix, row, col) {
    for (let y = 0; y < matrix.length; y += 1) {
      for (let x = 0; x < matrix[y].length; x += 1) {
        if (!matrix[y][x]) {
          continue;
        }

        const boardRow = row + y;
        const boardCol = col + x;

        if (boardCol < 0 || boardCol >= COLS || boardRow >= ROWS) {
          return true;
        }

        if (boardRow >= 0 && board[boardRow][boardCol]) {
          return true;
        }
      }
    }

    return false;
  }

  function movePiece(deltaCol, deltaRow) {
    if (gameState !== "running" || !currentPiece) {
      return false;
    }

    const nextRow = currentPiece.row + deltaRow;
    const nextCol = currentPiece.col + deltaCol;

    if (checkCollision(currentPiece.matrix, nextRow, nextCol)) {
      return false;
    }

    currentPiece.row = nextRow;
    currentPiece.col = nextCol;
    drawBoard();
    return true;
  }

  function rotatePiece() {
    if (gameState !== "running" || !currentPiece) {
      return false;
    }

    const rotated = currentPiece.type === "O"
      ? cloneMatrix(currentPiece.matrix)
      : rotateMatrix(currentPiece.matrix);
    const kicks = [0, -1, 1, -2, 2];

    for (const offset of kicks) {
      if (!checkCollision(rotated, currentPiece.row, currentPiece.col + offset)) {
        currentPiece.matrix = rotated;
        currentPiece.col += offset;
        drawBoard();
        return true;
      }
    }

    return false;
  }

  function rotateMatrix(matrix) {
    return matrix[0].map((_, col) => matrix.map((row) => row[col]).reverse());
  }

  function mergePiece() {
    let lockedAboveBoard = false;

    currentPiece.matrix.forEach((row, y) => {
      row.forEach((value, x) => {
        if (!value) {
          return;
        }

        const boardRow = currentPiece.row + y;
        const boardCol = currentPiece.col + x;

        if (boardRow < 0) {
          lockedAboveBoard = true;
          return;
        }

        if (boardRow < ROWS && boardCol >= 0 && boardCol < COLS) {
          board[boardRow][boardCol] = currentPiece.type;
        }
      });
    });

    return lockedAboveBoard;
  }

  function lockPiece() {
    if (!currentPiece) {
      return;
    }

    const lockedAboveBoard = mergePiece();
    currentPiece = null;

    if (lockedAboveBoard) {
      endGame();
      return;
    }

    clearLines();

    if (gameState !== "running") {
      updateStats();
      drawBoard();
      return;
    }

    spawnPiece();
    dropCounter = 0;
    updateStats();
    drawBoard();
  }

  function clearLines() {
    let cleared = 0;

    for (let row = ROWS - 1; row >= 0; row -= 1) {
      if (board[row].every(Boolean)) {
        board.splice(row, 1);
        board.unshift(Array(COLS).fill(null));
        cleared += 1;
        row += 1;
      }
    }

    if (cleared > 0) {
      lines += cleared;

      if (gameMode === "normal") {
        level = Math.floor(lines / 10) + 1;
      }

      updateScore(LINE_SCORES[cleared] || 0);
    }

    updateGoalDisplay();
    return cleared;
  }

  function updateScore(points = 0) {
    score += points;

    if (gameMode === "challenge") {
      challengeLevelScore = score;
      updateStats();
      checkChallengeProgress();
      return;
    }

    if (score > highScore) {
      highScore = score;
      saveHighScore(NORMAL_STORAGE_KEY, highScore);
    }

    updateStats();
  }

  function updateStats() {
    if (gameMode === "challenge") {
      scoreLabelElement.textContent = "Levelscore";
      highScoreLabelElement.textContent = "Challenge-Best";
      levelLabelElement.textContent = "Challenge";
      linesLabelElement.textContent = "Linien";
      highScore = loadHighScore(CHALLENGE_STORAGE_KEY);
      scoreElement.textContent = String(challengeLevelScore);
      highScoreElement.textContent = String(highScore);
      levelElement.textContent = `${challengeLevelIndex + 1}/${challengeLevels.length}`;
      linesElement.textContent = String(lines);
    } else {
      scoreLabelElement.textContent = "Punkte";
      highScoreLabelElement.textContent = "Highscore";
      levelLabelElement.textContent = "Level";
      linesLabelElement.textContent = "Linien";
      scoreElement.textContent = String(score);
      highScoreElement.textContent = String(highScore);
      levelElement.textContent = String(level);
      linesElement.textContent = String(lines);
    }

    updateGoalDisplay();
  }

  function getPieceClass(type) {
    return type === CHALLENGE_BLOCK
      ? "piece-challenge"
      : `piece-${type.toLowerCase()}`;
  }

  function drawBoard() {
    const displayBoard = board.map((row) => row.slice());

    if (currentPiece) {
      currentPiece.matrix.forEach((row, y) => {
        row.forEach((value, x) => {
          if (!value) {
            return;
          }

          const boardRow = currentPiece.row + y;
          const boardCol = currentPiece.col + x;

          if (boardRow >= 0 && boardRow < ROWS && boardCol >= 0 && boardCol < COLS) {
            displayBoard[boardRow][boardCol] = currentPiece.type;
          }
        });
      });
    }

    displayBoard.flat().forEach((type, index) => {
      cells[index].className = type
        ? `cell filled ${getPieceClass(type)}`
        : "cell";
    });
  }

  function drawNextPiece() {
    previewCells.forEach((cell) => {
      cell.className = "preview-cell";
    });

    if (!nextType) {
      return;
    }

    const matrix = PIECES[nextType];
    const rowOffset = Math.floor((PREVIEW_SIZE - matrix.length) / 2);
    const colOffset = Math.floor((PREVIEW_SIZE - matrix[0].length) / 2);

    matrix.forEach((row, y) => {
      row.forEach((value, x) => {
        if (!value) {
          return;
        }

        const previewRow = y + rowOffset;
        const previewCol = x + colOffset;

        if (previewRow >= 0 && previewCol >= 0) {
          const index = previewRow * PREVIEW_SIZE + previewCol;
          previewCells[index].className = `preview-cell filled piece-${nextType.toLowerCase()}`;
        }
      });
    });
  }

  function softDrop() {
    if (gameState !== "running") {
      return;
    }

    if (movePiece(0, 1)) {
      updateScore(1);
      dropCounter = 0;
    } else {
      lockPiece();
    }
  }

  function hardDrop() {
    if (gameState !== "running" || !currentPiece) {
      return;
    }

    let rowsDropped = 0;

    while (!checkCollision(currentPiece.matrix, currentPiece.row + 1, currentPiece.col)) {
      currentPiece.row += 1;
      rowsDropped += 1;
    }

    updateScore(rowsDropped * 2);

    if (gameState === "running") {
      lockPiece();
    }
  }

  function getDropInterval() {
    const activeChallenge = getActiveChallengeLevel();

    if (gameMode === "challenge" && activeChallenge.dropInterval) {
      return Math.max(MIN_DROP_MS, activeChallenge.dropInterval);
    }

    return Math.max(MIN_DROP_MS, START_DROP_MS - (level - 1) * LEVEL_DROP_STEP_MS);
  }

  function gameLoop(timestamp = 0) {
    if (!lastTime) {
      lastTime = timestamp;
    }

    const deltaTime = timestamp - lastTime;
    lastTime = timestamp;

    if (gameState === "running") {
      dropCounter += deltaTime;

      if (dropCounter >= getDropInterval()) {
        if (!movePiece(0, 1)) {
          lockPiece();
        }
        dropCounter = 0;
      }
    }

    requestAnimationFrame(gameLoop);
  }

  function resetGame(startImmediately = true) {
    if (gameMode === "challenge") {
      loadChallengeLevel(challengeLevelIndex);
      return;
    }

    board = createBoard();
    bag = [];
    nextType = getNextTypeFromBag();
    currentPiece = null;
    score = 0;
    level = 1;
    lines = 0;
    challengeLevelScore = 0;
    dropCounter = 0;
    lastTime = performance.now();
    highScore = loadHighScore(NORMAL_STORAGE_KEY, LEGACY_STORAGE_KEY);
    gameState = startImmediately ? "running" : "modeSelect";

    if (startImmediately) {
      spawnPiece();
    } else {
      nextType = null;
      drawNextPiece();
    }

    updateStats();
    updateOverlay();
    drawBoard();
  }

  function showModeSelect() {
    gameMode = "normal";
    gameState = "modeSelect";
    board = createBoard();
    bag = [];
    nextType = null;
    currentPiece = null;
    score = 0;
    highScore = loadHighScore(NORMAL_STORAGE_KEY, LEGACY_STORAGE_KEY);
    level = 1;
    lines = 0;
    challengeLevelIndex = 0;
    challengeLevelScore = 0;
    challengeTotalScore = 0;
    challengeTarget = null;
    dropCounter = 0;
    updateStats();
    drawNextPiece();
    drawBoard();
    updateOverlay();
  }

  function startNormalMode() {
    gameMode = "normal";
    highScore = loadHighScore(NORMAL_STORAGE_KEY, LEGACY_STORAGE_KEY);
    resetGame(true);
  }

  function startChallengeMode() {
    gameMode = "challenge";
    challengeLevelIndex = 0;
    challengeTotalScore = 0;
    highScore = loadHighScore(CHALLENGE_STORAGE_KEY);
    loadChallengeLevel(0);
  }

  function loadChallengeLevel(index) {
    const activeChallenge = challengeLevels[index];

    if (!activeChallenge) {
      completeChallenge();
      return;
    }

    gameMode = "challenge";
    challengeLevelIndex = index;
    challengeTarget = getChallengeTarget(activeChallenge);
    board = createBoard();
    applyStartBoard(activeChallenge.startBoard);
    bag = [];
    nextType = getNextTypeFromBag();
    currentPiece = null;
    score = 0;
    challengeLevelScore = 0;
    lines = 0;
    level = activeChallenge.speedLevel || 1;
    dropCounter = 0;
    lastTime = performance.now();
    gameState = "running";
    spawnPiece();
    updateStats();
    updateOverlay();
    drawBoard();
  }

  function retryChallengeLevel() {
    loadChallengeLevel(challengeLevelIndex);
  }

  function applyStartBoard(pattern) {
    if (!Array.isArray(pattern)) {
      return;
    }

    const normalizedRows = Array.from({ length: ROWS }, () => ".".repeat(COLS));
    const sourceRows = pattern.slice(-ROWS);
    const startAt = ROWS - sourceRows.length;

    sourceRows.forEach((row, index) => {
      const normalizedRow = String(row).padEnd(COLS, ".").slice(0, COLS);
      normalizedRows[startAt + index] = normalizedRow;
    });

    normalizedRows.forEach((row, rowIndex) => {
      [...row].forEach((char, colIndex) => {
        board[rowIndex][colIndex] = char === "." ? null : CHALLENGE_BLOCK;
      });
    });
  }

  function updateGoalDisplay() {
    if (gameState === "modeSelect") {
      modeLabelElement.textContent = "Modus waehlen";
      challengeNameElement.textContent = "Bereit";
      goalTextElement.textContent = "Normalmodus oder Challenge-Modus starten.";
      progressTextElement.textContent = "Fortschritt: -";
      totalTextElement.hidden = true;
      goalMeterElement.hidden = true;
      goalBarElement.style.width = "0%";
      return;
    }

    goalMeterElement.hidden = false;

    if (gameMode === "challenge") {
      const activeChallenge = getActiveChallengeLevel();
      const currentProgress = challengeTarget.type === "lines" ? lines : challengeLevelScore;
      const cappedProgress = Math.min(currentProgress, challengeTarget.amount);
      const progressPercent = Math.min(100, (cappedProgress / challengeTarget.amount) * 100);

      modeLabelElement.textContent = "Modus: Challenge";
      challengeNameElement.textContent = activeChallenge.name;
      goalTextElement.textContent = `Ziel: ${challengeTarget.label}`;
      progressTextElement.textContent = `Fortschritt: ${cappedProgress} / ${challengeTarget.amount}`;
      totalTextElement.hidden = false;
      totalTextElement.textContent = `Challenge-Gesamt: ${challengeTotalScore + challengeLevelScore}`;
      goalBarElement.style.width = `${progressPercent}%`;
      return;
    }

    const normalProgress = lines % 10;
    modeLabelElement.textContent = "Modus: Normal";
    challengeNameElement.textContent = "Endlosspiel";
    goalTextElement.textContent = "Ziel: So lange wie moeglich spielen.";
    progressTextElement.textContent = `Naechstes Level: ${normalProgress} / 10 Linien`;
    totalTextElement.hidden = true;
    goalBarElement.style.width = `${normalProgress * 10}%`;
  }

  function checkChallengeProgress() {
    if (gameMode !== "challenge" || gameState !== "running" || !challengeTarget) {
      return;
    }

    const currentProgress = challengeTarget.type === "lines" ? lines : challengeLevelScore;

    if (currentProgress >= challengeTarget.amount) {
      completeChallengeLevel();
    }
  }

  function completeChallengeLevel() {
    if (gameState !== "running") {
      return;
    }

    challengeTotalScore += challengeLevelScore;
    currentPiece = null;

    if (challengeLevelIndex >= challengeLevels.length - 1) {
      completeChallenge();
      return;
    }

    gameState = "challengeLevelComplete";
    updateStats();
    updateOverlay();
    drawBoard();
  }

  function continueChallenge() {
    loadChallengeLevel(challengeLevelIndex + 1);
  }

  function completeChallenge() {
    gameState = "challengeComplete";
    currentPiece = null;

    if (challengeTotalScore > highScore) {
      highScore = challengeTotalScore;
      saveHighScore(CHALLENGE_STORAGE_KEY, highScore);
    }

    updateStats();
    updateOverlay();
    drawBoard();
  }

  function pauseGame() {
    if (gameState !== "running") {
      return;
    }

    gameState = "paused";
    updateOverlay();
  }

  function resumeGame() {
    if (gameState !== "paused") {
      return;
    }

    gameState = "running";
    dropCounter = 0;
    lastTime = performance.now();
    updateOverlay();
  }

  function togglePause() {
    if (gameState === "running") {
      pauseGame();
    } else if (gameState === "paused") {
      resumeGame();
    }
  }

  function handlePrimaryAction() {
    if (gameState === "running") {
      pauseGame();
    } else if (gameState === "paused") {
      resumeGame();
    } else if (gameState === "modeSelect") {
      startNormalMode();
    } else if (gameState === "challengeLevelComplete") {
      continueChallenge();
    } else if (gameState === "challengeFailed") {
      retryChallengeLevel();
    } else if (gameState === "challengeComplete") {
      startChallengeMode();
    } else if (gameMode === "challenge") {
      retryChallengeLevel();
    } else {
      startNormalMode();
    }
  }

  function endGame() {
    if (gameMode === "challenge") {
      gameState = "challengeFailed";
    } else {
      gameState = "gameover";
    }

    currentPiece = null;
    updateStats();
    updateOverlay();
    drawBoard();
  }

  function setOverlaySecondary(visible, label = "Zur Modus-Auswahl") {
    overlaySecondary.hidden = !visible;
    overlaySecondary.textContent = label;
  }

  function updateOverlay() {
    stateOverlay.classList.toggle("is-hidden", gameState === "running");
    stateOverlay.classList.toggle("is-complete", gameState === "challengeLevelComplete" || gameState === "challengeComplete");
    modeSelectElement.hidden = gameState !== "modeSelect";
    overlayActionsElement.hidden = gameState === "modeSelect";
    finalScore.hidden = true;
    setOverlaySecondary(false);

    document.body.classList.toggle("is-playing", gameState === "running" || gameState === "paused");

    if (gameState === "modeSelect") {
      stateTitle.textContent = "BlockDrop";
      stateMessage.textContent = "Waehle deinen Spielmodus.";
      primaryControl.textContent = "Start";
      restartControl.textContent = "Neustart";
      statusTextElement.textContent = "Bereit";
    } else if (gameState === "running") {
      primaryControl.textContent = "Pause";
      restartControl.textContent = gameMode === "challenge" ? "Level neu" : "Neustart";
      statusTextElement.textContent = gameMode === "challenge"
        ? `Challenge ${challengeLevelIndex + 1}/${challengeLevels.length}`
        : "Normalmodus";
    } else if (gameState === "paused") {
      stateTitle.textContent = "Pause";
      stateMessage.textContent = "Weiter mit P oder dem Button.";
      overlayAction.textContent = "Weiter";
      primaryControl.textContent = "Weiter";
      statusTextElement.textContent = "Pause";
    } else if (gameState === "gameover") {
      stateTitle.textContent = "Game Over";
      stateMessage.textContent = "Neue Runde starten?";
      finalScore.hidden = false;
      finalScore.textContent = `Finaler Punktestand: ${score}`;
      overlayAction.textContent = "Neu starten";
      primaryControl.textContent = "Start";
      setOverlaySecondary(true);
      statusTextElement.textContent = "Game Over";
    } else if (gameState === "challengeFailed") {
      const activeChallenge = getActiveChallengeLevel();
      stateTitle.textContent = "Challenge gescheitert";
      stateMessage.textContent = `${activeChallenge.name} erneut versuchen?`;
      finalScore.hidden = false;
      finalScore.textContent = `Levelscore: ${challengeLevelScore} | Linien: ${lines} | Gesamt: ${challengeTotalScore}`;
      overlayAction.textContent = "Level erneut versuchen";
      primaryControl.textContent = "Level neu";
      setOverlaySecondary(true);
      statusTextElement.textContent = "Gescheitert";
    } else if (gameState === "challengeLevelComplete") {
      const activeChallenge = getActiveChallengeLevel();
      stateTitle.textContent = "Level geschafft";
      stateMessage.textContent = activeChallenge.description || "Stark geloest.";
      finalScore.hidden = false;
      finalScore.textContent = `Levelscore: ${challengeLevelScore} | Linien: ${lines} | Gesamt: ${challengeTotalScore}`;
      overlayAction.textContent = "Naechstes Level";
      primaryControl.textContent = "Weiter";
      setOverlaySecondary(true);
      statusTextElement.textContent = "Level geschafft";
    } else if (gameState === "challengeComplete") {
      stateTitle.textContent = "Challenge abgeschlossen";
      stateMessage.textContent = "Alle Level geloest.";
      finalScore.hidden = false;
      finalScore.textContent = `Gesamtpunktzahl: ${challengeTotalScore}`;
      overlayAction.textContent = "Challenge neu starten";
      primaryControl.textContent = "Neu starten";
      setOverlaySecondary(true);
      statusTextElement.textContent = "Abgeschlossen";
    }

    updateGoalDisplay();
  }

  function loadHighScore(key, fallbackKey = null) {
    try {
      const storedScore = Number(window.localStorage.getItem(key));

      if (Number.isFinite(storedScore) && storedScore > 0) {
        return storedScore;
      }

      if (fallbackKey) {
        const fallbackScore = Number(window.localStorage.getItem(fallbackKey));
        return Number.isFinite(fallbackScore) ? fallbackScore : 0;
      }

      return 0;
    } catch {
      return 0;
    }
  }

  function saveHighScore(key, value) {
    try {
      window.localStorage.setItem(key, String(value));
    } catch {
      // Private browsing modes can block localStorage.
    }
  }

  function handleKeyDown(event) {
    const key = event.key.toLowerCase();
    const gameKeys = ["arrowleft", "arrowright", "arrowdown", "arrowup", " ", "p", "r"];

    if (gameKeys.includes(key)) {
      event.preventDefault();
    }

    if (key === "r") {
      if (gameMode === "challenge") {
        retryChallengeLevel();
      } else {
        startNormalMode();
      }
      return;
    }

    if (key === "p") {
      togglePause();
      return;
    }

    if (gameState !== "running") {
      return;
    }

    if (key === "arrowleft") {
      movePiece(-1, 0);
    } else if (key === "arrowright") {
      movePiece(1, 0);
    } else if (key === "arrowdown") {
      softDrop();
    } else if (key === "arrowup" || key === " ") {
      rotatePiece();
    }
  }

  function performTouchAction(action) {
    if (action === "left") {
      movePiece(-1, 0);
    } else if (action === "right") {
      movePiece(1, 0);
    } else if (action === "rotate") {
      rotatePiece();
    } else if (action === "down") {
      softDrop();
    } else if (action === "drop") {
      hardDrop();
    }
  }

  function bindBoardSwipeControls() {
    let gesture = null;

    const resetGesture = () => {
      gesture = null;
    };

    boardElement.addEventListener("pointerdown", (event) => {
      if (event.pointerType === "mouse") {
        return;
      }

      event.preventDefault();
      boardElement.setPointerCapture(event.pointerId);
      gesture = {
        id: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        lastX: event.clientX,
        lastY: event.clientY,
        offsetX: 0,
        offsetY: 0,
        rotatedUp: false
      };
    }, { passive: false });

    boardElement.addEventListener("pointermove", (event) => {
      if (!gesture || event.pointerId !== gesture.id) {
        return;
      }

      event.preventDefault();

      gesture.offsetX += event.clientX - gesture.lastX;
      gesture.offsetY += event.clientY - gesture.lastY;
      gesture.lastX = event.clientX;
      gesture.lastY = event.clientY;

      const absX = Math.abs(gesture.offsetX);
      const absY = Math.abs(gesture.offsetY);

      if (absX > absY && absX >= SWIPE_STEP_PX) {
        const direction = Math.sign(gesture.offsetX);
        performTouchAction(direction > 0 ? "right" : "left");
        gesture.offsetX -= direction * SWIPE_STEP_PX;
        gesture.offsetY = 0;
        return;
      }

      if (absY > absX && absY >= SWIPE_VERTICAL_STEP_PX) {
        if (gesture.offsetY > 0) {
          performTouchAction("down");
          gesture.offsetY -= SWIPE_VERTICAL_STEP_PX;
          gesture.offsetX = 0;
        } else if (!gesture.rotatedUp) {
          performTouchAction("rotate");
          gesture.rotatedUp = true;
          gesture.offsetX = 0;
          gesture.offsetY = 0;
        }
      }
    }, { passive: false });

    boardElement.addEventListener("pointerup", (event) => {
      if (!gesture || event.pointerId !== gesture.id) {
        return;
      }

      const movedX = Math.abs(event.clientX - gesture.startX);
      const movedY = Math.abs(event.clientY - gesture.startY);

      if (movedX <= SWIPE_TAP_LIMIT_PX && movedY <= SWIPE_TAP_LIMIT_PX) {
        performTouchAction("rotate");
      }

      resetGesture();
    });

    boardElement.addEventListener("pointercancel", resetGesture);
    boardElement.addEventListener("lostpointercapture", resetGesture);
  }

  function bindTouchButton(button) {
    let holdDelay = null;
    let repeat = null;
    const action = button.dataset.action;
    const repeatable = action === "left" || action === "right" || action === "down";

    const clearTimers = () => {
      window.clearTimeout(holdDelay);
      window.clearInterval(repeat);
      holdDelay = null;
      repeat = null;
    };

    button.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      button.setPointerCapture(event.pointerId);
      performTouchAction(action);

      if (repeatable) {
        holdDelay = window.setTimeout(() => {
          repeat = window.setInterval(() => performTouchAction(action), 90);
        }, 180);
      }
    });

    button.addEventListener("pointerup", clearTimers);
    button.addEventListener("pointercancel", clearTimers);
    button.addEventListener("pointerleave", clearTimers);
    button.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        performTouchAction(action);
      }
    });
  }

  buildCells();
  showModeSelect();
  requestAnimationFrame(gameLoop);

  modeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      if (button.dataset.mode === "challenge") {
        startChallengeMode();
      } else {
        startNormalMode();
      }
    });
  });
  overlayAction.addEventListener("click", handlePrimaryAction);
  overlaySecondary.addEventListener("click", showModeSelect);
  primaryControl.addEventListener("click", handlePrimaryAction);
  restartControl.addEventListener("click", () => {
    if (gameMode === "challenge") {
      retryChallengeLevel();
    } else {
      startNormalMode();
    }
  });
  document.addEventListener("keydown", handleKeyDown);
  touchButtons.forEach(bindTouchButton);
  bindBoardSwipeControls();
})();
