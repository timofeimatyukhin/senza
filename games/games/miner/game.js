// МИНЁР - многопользовательская игра в стиле Бомбермена
(() => {
  // ПУТИ К ИЗОБРАЖЕНИЯМ ИГРОКОВ (оставьте пустыми, если не нужны изображения)
  const PLAYER_IMAGE_RED = '../../../shared/img/logo_ruj.png'; // Вставьте сюда путь к изображению для красного игрока
  const PLAYER_IMAGE_GREEN = '../../../shared/img/logo_ruj.png'; // Вставьте сюда путь к изображению для зелёного игрока
  const PLAYER_IMAGE_YELLOW = '../../../shared/img/logo_ruj.png'; // Вставьте сюда путь к изображению для жёлтого игрока
  const PLAYER_IMAGE_BLUE = '../../../shared/img/logo_ruj.png'; // Вставьте сюда путь к изображению для синего игрока
  
  // КОНФИГУРАЦИЯ ИГРЫ
  const GAME_CONFIG = {
    name: 'Минёр',
    icon: '💣',
    gridSize: 15,
    roundTime: 180, // 3 минуты в секундах
    bombTimer: 3000, // 3 секунды
    explosionDuration: 500, // 0.5 секунды
    moveDelay: 150, // задержка между ходами в мс
    colors: [
      { name: 'red', value: '#FE112E', display: 'Красный' },
      { name: 'green', value: '#2ED573', display: 'Зелёный' },
      { name: 'yellow', value: '#FFE23F', display: 'Жёлтый' },
      { name: 'blue', value: '#1E6FE3', display: 'Синий' }
    ],
    startPositions: [
      { x: 1, y: 1 }, // красный
      { x: 13, y: 13 }, // зелёный
      { x: 1, y: 13 }, // жёлтый
      { x: 13, y: 1 } // синий
    ]
  };

  // КОНФИГУРАЦИЯ КНОПОК УПРАВЛЕНИЯ
  // Кнопки для игроков 1 и 4 (перевернутые блоки)
  const BUTTONS_PLAYERS_1_4 = {
    up: { action: 'down', label: '↑' },
    down: { action: 'up', label: '↓' },
    left: { action: 'right', label: '←' },
    right: { action: 'left', label: '→' },
    bomb: { action: 'bomb', label: '💣' }
  };

  // Кнопки для игроков 2 и 3 (обычные блоки)
  const BUTTONS_PLAYERS_2_3 = {
    up: { action: 'up', label: '↑' },
    down: { action: 'down', label: '↓' },
    left: { action: 'left', label: '←' },
    right: { action: 'right', label: '→' },
    bomb: { action: 'bomb', label: '💣' }
  };

  // СОСТОЯНИЕ ИГРЫ
  const gameState = {
    playerCount: 2,
    isPlaying: false,
    timeLeft: GAME_CONFIG.roundTime,
    gridSize: GAME_CONFIG.gridSize,
    cells: [], // двумерный массив клеток
    players: [], // массив игроков
    bombs: [], // массив бомб
    bonuses: [], // массив бонусов
    explosions: [], // массив взрывов
    timerInterval: null,
    lastMoveTime: {} // время последнего хода для каждого игрока
  };

  // DOM ЭЛЕМЕНТЫ
  let stage, gameField, playersSection;

  // ИНИЦИАЛИЗАЦИЯ
  function initGame() {
    stage = document.getElementById('stage');
    if (!stage) return;
    
    playersSection = document.getElementById('playersSection');
    
    createGameInterface();
    updateDisplay();
    bindEvents();
  }

  // СОЗДАНИЕ ИНТЕРФЕЙСА
  function createGameInterface() {
    stage.innerHTML = `
      <div class="game-field" id="gameField" style="display: none;"></div>
    `;
    
    gameField = document.getElementById('gameField');
    gameField.style.gridTemplateColumns = `repeat(${GAME_CONFIG.gridSize}, 1fr)`;
    gameField.style.gridTemplateRows = `repeat(${GAME_CONFIG.gridSize}, 1fr)`;
  }

  // ОБНОВЛЕНИЕ ДИСПЛЕЯ
  function updateDisplay() {
    const scoreLeft = document.getElementById('scoreLeft');
    const scoreRight = document.getElementById('scoreRight');
    
    if (gameState.isPlaying) {
      const minutes = Math.floor(gameState.timeLeft / 60);
      const seconds = gameState.timeLeft % 60;
      const timeString = `${minutes}:${seconds.toString().padStart(2, '0')}`;
      
      if (scoreLeft) scoreLeft.textContent = `Время: ${timeString}`;
      if (scoreRight) scoreRight.textContent = `Время: ${timeString}`;
    } else {
      if (scoreLeft) scoreLeft.textContent = `Время: 3:00`;
      if (scoreRight) scoreRight.textContent = `Время: 3:00`;
    }
  }

  function updateHUDInfo(text) {
    const turnLabelLeft = document.getElementById('turnLabelLeft');
    const turnLabelRight = document.getElementById('turnLabelRight');
    if (turnLabelLeft) turnLabelLeft.textContent = text;
    if (turnLabelRight) turnLabelRight.textContent = text;
  }

  // СБРОС ИГРЫ
  function resetGame() {
    gameState.isPlaying = false;
    gameState.timeLeft = GAME_CONFIG.roundTime;
    gameState.cells = [];
    gameState.players = [];
    gameState.bombs = [];
    gameState.bonuses = [];
    gameState.explosions = [];
    
    if (gameState.timerInterval) {
      clearInterval(gameState.timerInterval);
      gameState.timerInterval = null;
    }
    
    const modalBackdrop = document.getElementById('modalBackdrop');
    if (modalBackdrop) {
      modalBackdrop.hidden = true;
      modalBackdrop.style.display = 'none';
    }
    
    if (gameField) gameField.style.display = 'none';
    
    hideAllPlayerControls();
    showDifficultyModal();
    updateDisplay();
  }

  // МОДАЛЬНЫЕ ОКНА
  function showDifficultyModal() {
    const difficultyModal = document.getElementById('difficultyModal');
    if (difficultyModal) difficultyModal.style.display = 'flex';
  }

  function hideDifficultyModal() {
    const difficultyModal = document.getElementById('difficultyModal');
    if (difficultyModal) difficultyModal.style.display = 'none';
  }

  function showEndModal(winner) {
    const modalBackdrop = document.getElementById('modalBackdrop');
    const modalTitle = document.getElementById('modalTitle');
    const modalSubtitle = document.getElementById('modalSubtitle');
    
    if (modalBackdrop && modalTitle && modalSubtitle) {
      if (winner) {
        modalTitle.textContent = `Победил ${winner.color.display} игрок!`;
        modalSubtitle.textContent = '';
      } else {
        modalTitle.textContent = 'Ничья';
        modalSubtitle.textContent = '';
      }
      modalBackdrop.style.display = 'flex';
      modalBackdrop.hidden = false;
    }
  }

  // ОБРАБОТЧИКИ СОБЫТИЙ
  function bindEvents() {
    // Универсальный обработчик для кнопок (click и touch)
    const addButtonHandler = (element, handler) => {
      if (!element) return;
      
      element.addEventListener('click', handler);
      element.addEventListener('touchend', (e) => {
        e.preventDefault();
        handler(e);
      });
    };
    
    // Выбор количества игроков
    const playerOptions = document.querySelectorAll('.player-option');
    playerOptions.forEach(option => {
      const handler = (e) => {
        playerOptions.forEach(opt => opt.classList.remove('selected'));
        e.currentTarget.classList.add('selected');
        gameState.playerCount = parseInt(e.currentTarget.dataset.players);
      };
      
      addButtonHandler(option, handler);
    });

    // Кнопка старта
    const startGameBtn = document.getElementById('startGameBtn');
    addButtonHandler(startGameBtn, () => {
      hideDifficultyModal();
      startGame();
    });

    // Кнопки HUD
    const btnNewLeft = document.getElementById('btnNewLeft');
    const btnNewRight = document.getElementById('btnNewRight');
    const btnBackLeft = document.getElementById('btnBackLeft');
    const btnBackRight = document.getElementById('btnBackRight');
    const btnRematch = document.getElementById('btnRematch');
    const btnToMenu = document.getElementById('btnToMenu');
    
    addButtonHandler(btnNewLeft, resetGame);
    addButtonHandler(btnNewRight, resetGame);
    addButtonHandler(btnBackLeft, () => window.location.href = '../../index.html');
    addButtonHandler(btnBackRight, () => window.location.href = '../../index.html');
    addButtonHandler(btnRematch, resetGame);
    addButtonHandler(btnToMenu, () => window.location.href = '../../index.html');

    // Управление игроками с кнопок (мультитач)
    const activeButtons = new Set();
    
    // Touch события для мультитача
    document.addEventListener('touchstart', (e) => {
      e.preventDefault(); // Предотвращаем стандартное поведение
      
      Array.from(e.changedTouches).forEach(touch => {
        const element = document.elementFromPoint(touch.clientX, touch.clientY);
        if (element && element.classList.contains('control-btn')) {
          const player = parseInt(element.dataset.player);
          const action = element.dataset.action;
          
          if (!gameState.isPlaying || !gameState.players[player] || !gameState.players[player].alive) {
            return;
          }
          
          const buttonId = `${player}-${action}`;
          if (!activeButtons.has(buttonId)) {
            activeButtons.add(buttonId);
            element.classList.add('active');
            handlePlayerAction(player, action);
          }
        }
      });
    }, { passive: false });
    
    document.addEventListener('touchend', (e) => {
      Array.from(e.changedTouches).forEach(touch => {
        const element = document.elementFromPoint(touch.clientX, touch.clientY);
        if (element && element.classList.contains('control-btn')) {
          const player = parseInt(element.dataset.player);
          const action = element.dataset.action;
          const buttonId = `${player}-${action}`;
          activeButtons.delete(buttonId);
          element.classList.remove('active');
        }
      });
    }, { passive: false });
    
    document.addEventListener('touchcancel', (e) => {
      Array.from(e.changedTouches).forEach(touch => {
        const element = document.elementFromPoint(touch.clientX, touch.clientY);
        if (element && element.classList.contains('control-btn')) {
          const player = parseInt(element.dataset.player);
          const action = element.dataset.action;
          const buttonId = `${player}-${action}`;
          activeButtons.delete(buttonId);
          element.classList.remove('active');
        }
      });
    }, { passive: false });
    
    // Click события для десктопа
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('control-btn')) {
        const player = parseInt(e.target.dataset.player);
        const action = e.target.dataset.action;
        
        if (!gameState.isPlaying || !gameState.players[player] || !gameState.players[player].alive) {
          return;
        }
        
        handlePlayerAction(player, action);
      }
    });

    // Управление с клавиатуры
    document.addEventListener('keydown', (e) => {
      if (!gameState.isPlaying) return;
      
      const keyMap = {
        // Игрок 1 (WASD + Q)
        'KeyW': { player: 0, action: 'up' },
        'KeyS': { player: 0, action: 'down' },
        'KeyA': { player: 0, action: 'left' },
        'KeyD': { player: 0, action: 'right' },
        'KeyQ': { player: 0, action: 'bomb' },
        
        // Игрок 2 (Стрелки + Enter)
        'ArrowUp': { player: 1, action: 'up' },
        'ArrowDown': { player: 1, action: 'down' },
        'ArrowLeft': { player: 1, action: 'left' },
        'ArrowRight': { player: 1, action: 'right' },
        'Enter': { player: 1, action: 'bomb' },
        
        // Игрок 3 (TFGH + R)
        'KeyT': { player: 2, action: 'up' },
        'KeyG': { player: 2, action: 'down' },
        'KeyF': { player: 2, action: 'left' },
        'KeyH': { player: 2, action: 'right' },
        'KeyR': { player: 2, action: 'bomb' },
        
        // Игрок 4 (IJKL + U)
        'KeyI': { player: 3, action: 'up' },
        'KeyK': { player: 3, action: 'down' },
        'KeyJ': { player: 3, action: 'left' },
        'KeyL': { player: 3, action: 'right' },
        'KeyU': { player: 3, action: 'bomb' }
      };
      
      const command = keyMap[e.code];
      if (command && gameState.players[command.player] && gameState.players[command.player].alive) {
        e.preventDefault();
        handlePlayerAction(command.player, command.action);
      }
    });
  }

  // ОБРАБОТКА ДЕЙСТВИЙ ИГРОКА
  function handlePlayerAction(playerIndex, action) {
    const player = gameState.players[playerIndex];
    if (!player || !player.alive) return;
    
    const now = Date.now();
    const lastMove = gameState.lastMoveTime[playerIndex] || 0;
    
    if (action === 'bomb') {
      placeBomb(player);
    } else {
      if (now - lastMove < GAME_CONFIG.moveDelay) return;
      
      const directions = {
        'up': { dx: 0, dy: -1 },
        'down': { dx: 0, dy: 1 },
        'left': { dx: -1, dy: 0 },
        'right': { dx: 1, dy: 0 }
      };
      
      const dir = directions[action];
      if (dir) {
        movePlayer(player, dir.dx, dir.dy);
        gameState.lastMoveTime[playerIndex] = now;
      }
    }
  }

  // ДВИЖЕНИЕ ИГРОКА
  function movePlayer(player, dx, dy) {
    const newX = player.x + dx;
    const newY = player.y + dy;
    
    // Проверка границ
    if (newX < 0 || newX >= gameState.gridSize || newY < 0 || newY >= gameState.gridSize) {
      return;
    }
    
    const cell = gameState.cells[newY][newX];
    
    // Проверка препятствий
    if (cell.type === 'wall' || cell.type === 'brick' || cell.type === 'bomb') {
      return;
    }
    
    // Движение
    player.x = newX;
    player.y = newY;
    
    // Проверка бонусов
    if (cell.bonusType) {
      pickupBonus(player, cell);
    }
    
    renderField();
  }

  // УСТАНОВКА БОМБЫ
  function placeBomb(player) {
    // Проверка лимита бомб
    const playerBombs = gameState.bombs.filter(b => b.owner === player.index);
    if (playerBombs.length >= player.maxBombs) {
      return;
    }
    
    // Проверка, нет ли уже бомбы на этой клетке
    const existingBomb = gameState.bombs.find(b => b.x === player.x && b.y === player.y);
    if (existingBomb) {
      return;
    }
    
    const bomb = {
      x: player.x,
      y: player.y,
      owner: player.index,
      radius: player.explosionRadius,
      timer: setTimeout(() => explodeBomb(bomb), GAME_CONFIG.bombTimer)
    };
    
    gameState.bombs.push(bomb);
    gameState.cells[player.y][player.x].type = 'bomb';
    renderField();
  }

  // ВЗРЫВ БОМБЫ
  function explodeBomb(bomb) {
    // Удаляем бомбу
    const bombIndex = gameState.bombs.indexOf(bomb);
    if (bombIndex === -1) return;
    
    gameState.bombs.splice(bombIndex, 1);
    
    const explosionCells = [];
    explosionCells.push({ x: bomb.x, y: bomb.y });
    
    // Распространение взрыва в 4 направлениях
    const directions = [
      { dx: 0, dy: -1 }, // вверх
      { dx: 0, dy: 1 },  // вниз
      { dx: -1, dy: 0 }, // влево
      { dx: 1, dy: 0 }   // вправо
    ];
    
    directions.forEach(dir => {
      for (let i = 1; i <= bomb.radius; i++) {
        const x = bomb.x + dir.dx * i;
        const y = bomb.y + dir.dy * i;
        
        if (x < 0 || x >= gameState.gridSize || y < 0 || y >= gameState.gridSize) break;
        
        const cell = gameState.cells[y][x];
        
        if (cell.type === 'wall') {
          break; // Неразрушаемая стена останавливает взрыв
        }
        
        explosionCells.push({ x, y });
        
        if (cell.type === 'brick') {
          cell.type = 'empty';
          break; // Кирпич останавливает взрыв после разрушения
        }
        
        if (cell.type === 'bomb') {
          // Взрыв активирует другую бомбу
          const chainBomb = gameState.bombs.find(b => b.x === x && b.y === y);
          if (chainBomb) {
            clearTimeout(chainBomb.timer);
            setTimeout(() => explodeBomb(chainBomb), 100);
          }
          break;
        }
      }
    });
    
    // Применяем эффекты взрыва
    explosionCells.forEach(pos => {
      const cell = gameState.cells[pos.y][pos.x];
      
      // Уничтожение бонусов
      if (cell.bonusType) {
        cell.bonusType = null;
      }
      
      // Уничтожение кирпичей
      if (cell.type === 'brick') {
        cell.type = 'empty';
      }
      
      // Очистка бомб
      if (cell.type === 'bomb') {
        cell.type = 'empty';
      }
      
      // Урон игрокам
      gameState.players.forEach(player => {
        if (player.alive && player.x === pos.x && player.y === pos.y) {
          player.alive = false;
          checkGameEnd();
        }
      });
      
      // Визуальный эффект взрыва
      cell.explosion = true;
    });
    
    renderField();
    
    // Убираем эффект взрыва
    setTimeout(() => {
      explosionCells.forEach(pos => {
        gameState.cells[pos.y][pos.x].explosion = false;
      });
      renderField();
    }, GAME_CONFIG.explosionDuration);
  }

  // ПОДБОР БОНУСА
  function pickupBonus(player, cell) {
    if (cell.bonusType === 'fire') {
      player.explosionRadius++;
    } else if (cell.bonusType === 'bomb') {
      player.maxBombs++;
    }
    
    cell.bonusType = null;
    renderField();
  }

  // ПРОВЕРКА ОКОНЧАНИЯ ИГРЫ
  function checkGameEnd() {
    const alivePlayers = gameState.players.filter(p => p.alive);
    
    if (alivePlayers.length === 1) {
      // Остался 1 игрок - победа
      endGame(alivePlayers[0]);
    } else if (alivePlayers.length === 0) {
      // Никого не осталось - ничья
      endGame(null);
    }
  }

  // ОКОНЧАНИЕ ИГРЫ
  function endGame(winner) {
    gameState.isPlaying = false;
    
    if (gameState.timerInterval) {
      clearInterval(gameState.timerInterval);
      gameState.timerInterval = null;
    }
    
    // Очистка всех бомб
    gameState.bombs.forEach(bomb => {
      if (bomb.timer) clearTimeout(bomb.timer);
    });
    gameState.bombs = [];
    
    updateHUDInfo('💣 Минёр');
    
    // Показываем результат через небольшую задержку
    setTimeout(() => {
      showEndModal(winner);
    }, 1000);
  }

  // СТАРТ ИГРЫ
  function startGame() {
    gameState.isPlaying = true;
    gameState.timeLeft = GAME_CONFIG.roundTime;
    initializeGrid();
    initializePlayers();
    showPlayerControls();
    
    if (gameField) gameField.style.display = 'grid';
    
    renderField();
    updateDisplay();
    updateHUDInfo('Начали!');
    
    // Запуск таймера
    gameState.timerInterval = setInterval(() => {
      gameState.timeLeft--;
      updateDisplay();
      
      if (gameState.timeLeft <= 0) {
        endGame(null);
      }
    }, 1000);
  }

  // ИНИЦИАЛИЗАЦИЯ СЕТКИ
  function initializeGrid() {
    gameState.cells = [];
    
    for (let y = 0; y < gameState.gridSize; y++) {
      gameState.cells[y] = [];
      for (let x = 0; x < gameState.gridSize; x++) {
        gameState.cells[y][x] = {
          type: 'empty',
          bonusType: null,
          explosion: false
        };
      }
    }
    
    // Размещение неразрушаемых стен по периметру
    for (let i = 0; i < gameState.gridSize; i++) {
      gameState.cells[0][i].type = 'wall';
      gameState.cells[gameState.gridSize - 1][i].type = 'wall';
      gameState.cells[i][0].type = 'wall';
      gameState.cells[i][gameState.gridSize - 1].type = 'wall';
    }
    
    // Размещение неразрушаемых блоков в виде сетки
    for (let y = 2; y < gameState.gridSize - 1; y += 2) {
      for (let x = 2; x < gameState.gridSize - 1; x += 2) {
        gameState.cells[y][x].type = 'wall';
      }
    }
    
    // Подсчет свободных клеток
    const freeCells = [];
    for (let y = 1; y < gameState.gridSize - 1; y++) {
      for (let x = 1; x < gameState.gridSize - 1; x++) {
        if (gameState.cells[y][x].type === 'empty') {
          freeCells.push({ x, y });
        }
      }
    }
    
    // Исключаем зоны старта игроков
    const safeZones = [];
    for (let i = 0; i < gameState.playerCount; i++) {
      const start = GAME_CONFIG.startPositions[i];
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          safeZones.push({ x: start.x + dx, y: start.y + dy });
        }
      }
    }
    
    const safeCells = freeCells.filter(cell => {
      return !safeZones.some(safe => safe.x === cell.x && safe.y === cell.y);
    });
    
    // Размещаем кирпичи на 70% свободных клеток
    const brickCount = Math.floor(safeCells.length * 0.7);
    const shuffled = safeCells.sort(() => Math.random() - 0.5);
    
    for (let i = 0; i < brickCount; i++) {
      const cell = shuffled[i];
      gameState.cells[cell.y][cell.x].type = 'brick';
      
      // 20% шанс разместить бонус под кирпичом
      if (Math.random() < 0.2) {
        gameState.cells[cell.y][cell.x].bonusType = Math.random() < 0.5 ? 'fire' : 'bomb';
      }
    }
  }

  // ИНИЦИАЛИЗАЦИЯ ИГРОКОВ
  function initializePlayers() {
    gameState.players = [];
    
    for (let i = 0; i < gameState.playerCount; i++) {
      const pos = GAME_CONFIG.startPositions[i];
      gameState.players.push({
        index: i,
        x: pos.x,
        y: pos.y,
        alive: true,
        maxBombs: 1,
        explosionRadius: 2,
        color: GAME_CONFIG.colors[i]
      });
    }
  }

  // ПОКАЗ УПРАВЛЕНИЯ ИГРОКОВ
  function showPlayerControls() {
    if (!playersSection) return;
    
    playersSection.innerHTML = '';
    
    const playerPositions = [
      { class: 'player-1', name: 'Игрок 1', color: 'red', buttons: BUTTONS_PLAYERS_1_4 },
      { class: 'player-4', name: 'Игрок 2', color: 'green', buttons: BUTTONS_PLAYERS_2_3 },
      { class: 'player-3', name: 'Игрок 3', color: 'yellow', buttons: BUTTONS_PLAYERS_2_3 },
      { class: 'player-2', name: 'Игрок 4', color: 'blue', buttons: BUTTONS_PLAYERS_1_4 }
    ];
    
    for (let i = 0; i < gameState.playerCount; i++) {
      const playerDiv = document.createElement('div');
      playerDiv.className = `player-controls ${playerPositions[i].class}`;
      
      const playerInfo = playerPositions[i];
      const buttons = playerInfo.buttons;
      
      playerDiv.innerHTML = `
        <div class="player-info ${playerInfo.color}">${playerInfo.name}</div>
        <div class="control-buttons">
          <button class="control-btn" data-player="${i}" data-action="${buttons.up.action}">${buttons.up.label}</button>
          <button class="control-btn" data-player="${i}" data-action="${buttons.down.action}">${buttons.down.label}</button>
          <button class="control-btn" data-player="${i}" data-action="${buttons.left.action}">${buttons.left.label}</button>
          <button class="control-btn" data-player="${i}" data-action="${buttons.right.action}">${buttons.right.label}</button>
          <button class="control-btn bomb-btn" data-player="${i}" data-action="${buttons.bomb.action}">${buttons.bomb.label}</button>
        </div>
      `;
      
      playersSection.appendChild(playerDiv);
    }
  }

  function hideAllPlayerControls() {
    if (playersSection) {
      playersSection.innerHTML = '';
    }
  }

  // ОТРИСОВКА ПОЛЯ
  function renderField() {
    if (!gameField) return;
    
    gameField.innerHTML = '';
    
    for (let y = 0; y < gameState.gridSize; y++) {
      for (let x = 0; x < gameState.gridSize; x++) {
        const cell = gameState.cells[y][x];
        const cellDiv = document.createElement('div');
        cellDiv.className = 'field-cell';
        
        // Фон клетки
        if (cell.type === 'wall') {
          cellDiv.classList.add('wall');
        } else if (cell.type === 'brick') {
          cellDiv.classList.add('brick');
        }
        
        // Эффект взрыва
        if (cell.explosion) {
          cellDiv.classList.add('explosion');
        }
        
        // Бонусы (если нет кирпича сверху)
        if (cell.bonusType && cell.type !== 'brick') {
          const bonusDiv = document.createElement('div');
          bonusDiv.className = `bonus bonus-${cell.bonusType}`;
          cellDiv.appendChild(bonusDiv);
        }
        
        // Бомбы
        if (cell.type === 'bomb') {
          const bombDiv = document.createElement('div');
          bombDiv.className = 'bomb';
          cellDiv.appendChild(bombDiv);
        }
        
        // Игроки
        gameState.players.forEach(player => {
          if (player.alive && player.x === x && player.y === y) {
            const playerDiv = document.createElement('div');
            playerDiv.className = `player player-${player.color.name}`;
            
            // Добавление изображения, если путь указан
            const imagePath = player.color.name === 'red' ? PLAYER_IMAGE_RED :
                            player.color.name === 'green' ? PLAYER_IMAGE_GREEN :
                            player.color.name === 'yellow' ? PLAYER_IMAGE_YELLOW :
                            player.color.name === 'blue' ? PLAYER_IMAGE_BLUE : '';
            
            if (imagePath) {
              const img = document.createElement('img');
              img.className = 'player-image';
              img.src = imagePath;
              img.onload = () => {
                playerDiv.style.background = 'transparent';
              };
              img.onerror = () => {
                console.error(`Ошибка загрузки изображения для ${player.color.name} игрока:`, imagePath);
              };
              playerDiv.appendChild(img);
            }
            
            cellDiv.appendChild(playerDiv);
          }
        });
        
        gameField.appendChild(cellDiv);
      }
    }
  }

  // ЗАПУСК ИГРЫ
  document.addEventListener('DOMContentLoaded', initGame);
  
  // ГЛОБАЛЬНАЯ ФУНКЦИЯ ДЛЯ НАВИГАЦИИ
  window.goToMenu = () => {
    window.location.href = '../../index.html';
  };
})();

