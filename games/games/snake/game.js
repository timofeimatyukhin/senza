// ЗМЕЙКА - полноэкранная версия
(() => {
  // КОНФИГУРАЦИЯ ИГРЫ
  const GAME_CONFIG = {
    name: 'Змейка',
    icon: '🐍',
    colors: [
      { name: 'red', value: '#FE112E', display: 'Красный' },
      { name: 'green', value: '#2ED573', display: 'Зелёный' },
      { name: 'yellow', value: '#FFE23F', display: 'Жёлтый' },
      { name: 'blue', value: '#1E6FE3', display: 'Синий' }
    ],
    fieldTypes: [
      { type: 'empty', name: 'Пустое поле (телепорт)' },
      { type: 'bordered', name: 'С рамкой' },
      { type: 'donut', name: 'Поле-бублик' }
    ],
    directions: {
      UP: { x: 0, y: -1 },
      DOWN: { x: 0, y: 1 },
      LEFT: { x: -1, y: 0 },
      RIGHT: { x: 1, y: 0 }
    }
  };

  // ФУНКЦИИ КОНВЕРТАЦИИ ЦВЕТОВ
  function hexToHsv(hex) {
    // Убираем # если есть
    hex = hex.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16) / 255;
    const g = parseInt(hex.substr(2, 2), 16) / 255;
    const b = parseInt(hex.substr(4, 2), 16) / 255;
    
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const delta = max - min;
    
    let h = 0;
    if (delta !== 0) {
      if (max === r) {
        h = ((g - b) / delta) % 6;
      } else if (max === g) {
        h = (b - r) / delta + 2;
      } else {
        h = (r - g) / delta + 4;
      }
    }
    h = Math.round(h * 60);
    if (h < 0) h += 360;
    
    const s = max === 0 ? 0 : delta / max;
    const v = max;
    
    return { h, s, v };
  }

  function hsvToHex(h, s, v) {
    const c = v * s;
    const x = c * (1 - Math.abs((h / 60) % 2 - 1));
    const m = v - c;
    
    let r, g, b;
    if (h < 60) {
      r = c; g = x; b = 0;
    } else if (h < 120) {
      r = x; g = c; b = 0;
    } else if (h < 180) {
      r = 0; g = c; b = x;
    } else if (h < 240) {
      r = 0; g = x; b = c;
    } else if (h < 300) {
      r = x; g = 0; b = c;
    } else {
      r = c; g = 0; b = x;
    }
    
    r = Math.round((r + m) * 255);
    g = Math.round((g + m) * 255);
    b = Math.round((b + m) * 255);
    
    return '#' + [r, g, b].map(x => {
      const hex = x.toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    }).join('');
  }

  // Функция для получения бледного цвета (S в 2 раза меньше)
  function getPaleColor(hexColor) {
    const hsv = hexToHsv(hexColor);
    const paleS = hsv.s / 2; // Уменьшаем насыщенность в 2 раза
    return hsvToHex(hsv.h, paleS, hsv.v);
  }

  // СОСТОЯНИЕ ИГРЫ
  const gameState = {
    currentPlayers: 2,
    currentField: 'empty',
    speed: 1,
    isPlaying: false,
    gamePhase: 'selecting',
    isWin: false,
    gameLoop: null,
    speedIncreaseTimer: 0,
    field: null,
    snakes: [],
    food: [], // Массив еды вместо одного элемента
    gameStartTime: 0,
    foodSpawnTimer: 0,
    maxFood: 5 // Максимальное количество еды на поле
    ,
    // Набор активных указателей (pointerId) для проверки мультитача
    activePointerIds: new Set()
  };

  // DOM ЭЛЕМЕНТЫ
  let stage, gameField, controlsPanel;

  // ИНИЦИАЛИЗАЦИЯ
  function initGame() {
    console.log('Инициализация игры змейка');
    stage = document.getElementById('stage');
    if (!stage) {
      console.error('Элемент stage не найден!');
      return;
    }
    
    createGameInterface();
    updateDisplay();
    bindEvents();
    showDifficultyModal();
    // create multitouch test panel for phone testing
    createMultitouchPanelSnake();
    console.log('Игра инициализирована');
  }

  // СОЗДАНИЕ ИНТЕРФЕЙСА
  function createGameInterface() {
    stage.innerHTML = `
      <div class="game-field" id="gameField" style="display: none;">
        <!-- ИГРОВЫЕ ЭЛЕМЕНТЫ СОЗДАЮТСЯ ДИНАМИЧЕСКИ -->
      </div>
      <div class="controls-panel" id="controlsPanel" style="display: none;">
        <!-- ПАНЕЛЬ УПРАВЛЕНИЯ СОЗДАЕТСЯ ДИНАМИЧЕСКИ -->
      </div>
    `;
    
    gameField = document.getElementById('gameField');
    controlsPanel = document.getElementById('controlsPanel');
  }

  // ОБЯЗАТЕЛЬНЫЕ ФУНКЦИИ
  function updateDisplay() {
    const scoreLeft = document.getElementById('scoreLeft');
    const scoreRight = document.getElementById('scoreRight');
    if (scoreLeft) scoreLeft.textContent = `Скорость: ${gameState.speed}`;
    if (scoreRight) scoreRight.textContent = `Скорость: ${gameState.speed}`;
    
    if (!gameState.isPlaying) {
      const turnLabelLeft = document.getElementById('turnLabelLeft');
      const turnLabelRight = document.getElementById('turnLabelRight');
      if (turnLabelLeft) turnLabelLeft.innerHTML = `<span class="icon-emoji">${GAME_CONFIG.icon}</span> ${GAME_CONFIG.name}`;
      if (turnLabelRight) turnLabelRight.innerHTML = `<span class="icon-emoji">${GAME_CONFIG.icon}</span> ${GAME_CONFIG.name}`;
    }
  }

  function updateHUDInfo(text) {
    const turnLabelLeft = document.getElementById('turnLabelLeft');
    const turnLabelRight = document.getElementById('turnLabelRight');
    if (turnLabelLeft) turnLabelLeft.textContent = text;
    if (turnLabelRight) turnLabelRight.textContent = text;
  }

  function showHUDCheckButton() {
    // Не используется в змейке
  }

  function hideHUDCheckButton() {
    // Не используется в змейке
  }

  function resetGame() {
    gameState.speed = 1;
    gameState.isPlaying = false;
    gameState.gamePhase = 'selecting';
    gameState.isWin = false;
    gameState.speedIncreaseTimer = 0;
    gameState.foodSpawnTimer = 0;
    gameState.snakes = [];
    gameState.food = [];
    
    if (gameState.gameLoop) {
      clearInterval(gameState.gameLoop);
      gameState.gameLoop = null;
    }
    
    const modalBackdrop = document.getElementById('modalBackdrop');
    if (modalBackdrop) {
      modalBackdrop.hidden = true;
      modalBackdrop.style.display = 'none';
    }
    
    if (gameField) gameField.style.display = 'none';
    if (controlsPanel) controlsPanel.style.display = 'none';
    
    showDifficultyModal();
    updateDisplay();
  }

  // МОДАЛЬНЫЕ ОКНА
  function showDifficultyModal() {
    console.log('Показываем модальное окно настроек');
    const modalBackdrop = document.getElementById('modalBackdrop');
    if (modalBackdrop) {
      modalBackdrop.hidden = true;
      modalBackdrop.style.display = 'none';
    }
    
    const difficultyModal = document.getElementById('difficultyModal');
    if (difficultyModal) {
      difficultyModal.style.display = 'flex';
      console.log('Модальное окно показано');
    } else {
      console.error('Модальное окно не найдено!');
    }
  }

  function hideDifficultyModal() {
    const difficultyModal = document.getElementById('difficultyModal');
    if (difficultyModal) difficultyModal.style.display = 'none';
  }

  function showEndModal() {
    const modalBackdrop = document.getElementById('modalBackdrop');
    const modalTitle = document.getElementById('modalTitle');
    const modalSubtitle = document.getElementById('modalSubtitle');
    const difficultyModal = document.getElementById('difficultyModal');
    
    // Скрываем модальное окно настроек, если оно открыто
    if (difficultyModal) {
      difficultyModal.style.display = 'none';
    }
    
    if (modalBackdrop && modalTitle && modalSubtitle) {
      const aliveSnakes = gameState.snakes.filter(snake => snake.alive);
      
      if (gameState.currentPlayers === 1) {
        // Для одного игрока
        if (aliveSnakes.length === 0) {
          modalTitle.textContent = 'Игра окончена';
          modalSubtitle.textContent = 'Змея погибла';
        } else {
          modalTitle.textContent = 'Игра окончена';
          modalSubtitle.textContent = 'Победил Игрок 1';
        }
      } else {
        // Для нескольких игроков
        if (aliveSnakes.length > 0) {
          const winner = aliveSnakes[0];
          const playerNumber = winner.id + 1; // id начинается с 0, поэтому +1
          modalTitle.textContent = 'Игра окончена';
          modalSubtitle.textContent = `победил Игрок ${playerNumber}`;
        } else {
          // Все змеи погибли (маловероятно, но на всякий случай)
          modalTitle.textContent = 'Игра окончена';
          modalSubtitle.textContent = 'Ничья';
        }
      }
      
      // Убираем атрибут hidden и явно устанавливаем display
      modalBackdrop.hidden = false;
      modalBackdrop.style.display = 'flex';
    }
  }

  // ОБРАБОТЧИКИ СОБЫТИЙ
  function bindEvents() {
    // Выбор количества игроков
    const playerOptions = document.querySelectorAll('.player-option');
    playerOptions.forEach(option => {
      option.addEventListener('click', (e) => {
        playerOptions.forEach(opt => opt.classList.remove('selected'));
        e.currentTarget.classList.add('selected');
        gameState.currentPlayers = parseInt(e.currentTarget.dataset.players);
        updateStartButton();
      });
    });

    // Выбор типа поля
    const fieldOptions = document.querySelectorAll('.field-option');
    fieldOptions.forEach(option => {
      option.addEventListener('click', (e) => {
        fieldOptions.forEach(opt => opt.classList.remove('selected'));
        e.currentTarget.classList.add('selected');
        gameState.currentField = e.currentTarget.dataset.field;
        updateStartButton();
      });
    });

    // Кнопка начала игры
    const startGameBtn = document.getElementById('startGameBtn');
    if (startGameBtn) {
      startGameBtn.addEventListener('click', () => {
        hideDifficultyModal();
        startGame();
      });
    }

    // Кнопки HUD
    const btnBackLeft = document.getElementById('btnBackLeft');
    const btnBackRight = document.getElementById('btnBackRight');
    const btnRematch = document.getElementById('btnRematch');
    const btnToMenu = document.getElementById('btnToMenu');
    
    if (btnBackLeft) btnBackLeft.addEventListener('click', () => window.location.href = '../../index.html');
    if (btnBackRight) btnBackRight.addEventListener('click', () => window.location.href = '../../index.html');
    if (btnRematch) btnRematch.addEventListener('click', () => {
      const modalBackdrop = document.getElementById('modalBackdrop');
      if (modalBackdrop) {
        modalBackdrop.hidden = true;
        modalBackdrop.style.display = 'none';
      }
      resetGame();
    });
    if (btnToMenu) btnToMenu.addEventListener('click', () => window.location.href = '../../index.html');

    // Клавиатура
    document.addEventListener('keydown', handleKeyPress);
  }

  function updateStartButton() {
    const startBtn = document.getElementById('startGameBtn');
    const playersSelected = document.querySelector('.player-option.selected');
    const fieldSelected = document.querySelector('.field-option.selected');
    
    if (startBtn && playersSelected && fieldSelected) {
      startBtn.disabled = false;
    }
  }

  // АЛГОРИТМ ИГРЫ
  function startGame() {
    console.log('Начинаем игру!');
    gameState.isPlaying = true;
    gameState.gamePhase = 'playing';
    gameState.gameStartTime = Date.now();
    gameState.speedIncreaseTimer = 0;
    
    createGameField();
    createSnakes();
    createFood();
    createControls();
    
    // Принудительно обновляем отображение змей
    updateSnakesDisplay();
    
    // Тестируем отображение змей и еды
    setTimeout(() => {
      console.log('Тестируем отображение змей и еды через 1 секунду...');
      updateSnakesDisplay();
      updateFoodDisplay();
    }, 1000);
    
    updateDisplay();
    updateHUDInfo('Играйте!');
    startGameLoop();
  }

  function createGameField() {
    if (gameField) {
      console.log('Создаем игровое поле 20x20');
      gameField.style.display = 'grid';
      gameField.style.gridTemplateColumns = 'repeat(20, 1fr)';
      gameField.style.gridTemplateRows = 'repeat(20, 1fr)';
      gameField.style.gap = '2px';
      gameField.innerHTML = '';
      
      // Создаем сетку 20x20
      for (let y = 0; y < 20; y++) {
        for (let x = 0; x < 20; x++) {
          const cell = document.createElement('div');
          cell.className = 'field-cell';
          cell.dataset.x = x;
          cell.dataset.y = y;
          cell.id = `cell-${x}-${y}`;
          gameField.appendChild(cell);
        }
      }
      
      console.log(`Создано ${gameField.children.length} ячеек`);
      
      // Добавляем стены в зависимости от типа поля
      addWalls();
    } else {
      console.error('gameField не найден!');
    }
  }

  function addWalls() {
    if (gameState.currentField === 'bordered' || gameState.currentField === 'donut') {
      // Рамка по периметру
      for (let x = 0; x < 20; x++) {
        addWall(x, 0);
        addWall(x, 19);
      }
      for (let y = 0; y < 20; y++) {
        addWall(0, y);
        addWall(19, y);
      }
    }
    
    if (gameState.currentField === 'donut') {
      // Стенка посередине (бублик)
      for (let x = 8; x <= 11; x++) {
        for (let y = 8; y <= 11; y++) {
          addWall(x, y);
        }
      }
    }
  }

  function addWall(x, y) {
    const cell = document.getElementById(`cell-${x}-${y}`);
    if (cell) {
      cell.classList.add('wall');
    }
  }

  function createSnakes() {
    console.log('Создаем змей для', gameState.currentPlayers, 'игроков');
    gameState.snakes = [];
    const startPositions = [
      { x: 10, y: 14, direction: GAME_CONFIG.directions.RIGHT }, // Центр для 1 игрока (ниже бублика)
      { x: 2, y: 2, direction: GAME_CONFIG.directions.RIGHT },   // Левый верх для 2 игроков
      { x: 17, y: 2, direction: GAME_CONFIG.directions.LEFT },   // Правый верх для 2 игроков
      { x: 2, y: 17, direction: GAME_CONFIG.directions.RIGHT },  // Левый низ для 3 игроков
      { x: 17, y: 17, direction: GAME_CONFIG.directions.LEFT }   // Правый низ для 4 игроков
    ];

    for (let i = 0; i < gameState.currentPlayers; i++) {
      const snake = {
        id: i,
        color: GAME_CONFIG.colors[i].value,
        colorName: GAME_CONFIG.colors[i].display,
        segments: [],
        direction: startPositions[i].direction,
        nextDirection: startPositions[i].direction,
        alive: true,
        keys: getPlayerKeys(i)
      };

      // Создаем начальные сегменты
      for (let j = 0; j < 5; j++) {
        snake.segments.push({
          x: startPositions[i].x - j,
          y: startPositions[i].y
        });
      }

      gameState.snakes.push(snake);
      console.log(`Создана змея ${i}:`, snake.segments);
    }
    
    console.log('Все змеи созданы:', gameState.snakes);
  }

  function getPlayerKeys(playerIndex) {
    const keyMappings = [
      { left: 'ArrowLeft', right: 'ArrowRight' },
      { left: 'KeyA', right: 'KeyD' },
      { left: 'KeyJ', right: 'KeyL' },
      { left: 'Numpad4', right: 'Numpad6' }
    ];
    return keyMappings[playerIndex] || keyMappings[0];
  }

  function createFood() {
    if (gameState.food.length >= gameState.maxFood) {
      return; // Уже достаточно еды
    }
    
    console.log('Создаем еду...');
    let foodPosition;
    let attempts = 0;
    
    do {
      foodPosition = {
        x: Math.floor(Math.random() * 20),
        y: Math.floor(Math.random() * 20),
        id: Date.now() + Math.random() // Уникальный ID
      };
      attempts++;
      if (attempts > 100) {
        console.error('Не удалось найти свободную позицию для еды!');
        return;
      }
    } while (!isPositionFree(foodPosition.x, foodPosition.y));
    
    gameState.food.push(foodPosition);
    console.log(`Еда создана в позиции ${foodPosition.x},${foodPosition.y}. Всего еды: ${gameState.food.length}`);
    updateFoodDisplay();
  }

  function isPositionFree(x, y) {
    // Проверяем, что позиция не занята змеями
    for (const snake of gameState.snakes) {
      for (const segment of snake.segments) {
        if (segment.x === x && segment.y === y) {
          return false;
        }
      }
    }
    
    // Проверяем, что позиция не занята едой
    for (const food of gameState.food) {
      if (food.x === x && food.y === y) {
        return false;
      }
    }
    
    // Проверяем, что позиция не занята стеной
    const cell = document.getElementById(`cell-${x}-${y}`);
    if (cell && cell.classList.contains('wall')) {
      return false;
    }
    
    return true;
  }

  function updateFoodDisplay() {
    // Сначала скрываем всю еду
    document.querySelectorAll('.food').forEach(food => {
      food.style.opacity = '0';
    });
    
    // Затем показываем только нужную еду
    gameState.food.forEach((foodItem, index) => {
      const cell = document.getElementById(`cell-${foodItem.x}-${foodItem.y}`);
      if (cell) {
        // Ищем существующий элемент еды или создаем новый
        let foodElement = cell.querySelector('.food');
        
        if (!foodElement) {
          foodElement = document.createElement('div');
          foodElement.className = 'food';
          foodElement.dataset.foodId = foodItem.id;
          cell.appendChild(foodElement);
        }
        
        // Плавно показываем еду
        foodElement.style.opacity = '1';
        foodElement.style.transform = 'scale(1)';
      }
    });
    
    // Удаляем скрытую еду
    setTimeout(() => {
      document.querySelectorAll('.food').forEach(food => {
        if (food.style.opacity === '0') {
          food.remove();
        }
      });
    }, 300);
  }

  function createControls() {
    // Показываем кнопки управления в HUD
    const player1Controls = document.getElementById('player1Controls');
    const player2Controls = document.getElementById('player2Controls');
    
    if (player1Controls) {
      player1Controls.style.display = gameState.currentPlayers >= 1 ? 'flex' : 'none';
    }
    if (player2Controls) {
      player2Controls.style.display = gameState.currentPlayers >= 2 ? 'flex' : 'none';
    }
    
    // Скрываем основную панель управления
    if (controlsPanel) {
      controlsPanel.style.display = 'none';
    }
    
    // Добавляем обработчики для кнопок управления
    // Поддержка мультитач: используем pointer events для touch и mouse events для десктопа
    const activePointers = new Map();
    document.querySelectorAll('.control-btn-overlay').forEach(btn => {
      const player = parseInt(btn.dataset.player);
      const action = btn.dataset.action;

        // Touch и другие pointer типы (мультитач)
        btn.addEventListener('pointerdown', (e) => {
          if (e.pointerType !== 'touch') return; // mouse handled separately
          e.preventDefault();
          activePointers.set(e.pointerId, btn);
          // Добавляем в глобальный набор активных указателей для проверки мультитача
          gameState.activePointerIds.add(e.pointerId);
          btn.classList.add('active');
          handlePlayerInput(player, action);
          // no indicator
        }, { passive: false });

        btn.addEventListener('pointerup', (e) => {
          if (e.pointerType !== 'touch') return;
          const stored = activePointers.get(e.pointerId);
          if (stored) {
            stored.classList.remove('active');
            activePointers.delete(e.pointerId);
          }
          // Удаляем из глобального набора
          gameState.activePointerIds.delete(e.pointerId);
        });

        btn.addEventListener('pointercancel', (e) => {
          if (e.pointerType !== 'touch') return;
          const stored = activePointers.get(e.pointerId);
          if (stored) {
            stored.classList.remove('active');
            activePointers.delete(e.pointerId);
          }
          gameState.activePointerIds.delete(e.pointerId);
        });

      // Mouse (desktop) - поддерживаем зажатие мыши
      btn.addEventListener('mousedown', (e) => {
        if (e.button !== 0) return;
        e.preventDefault();
        btn.classList.add('active');
        handlePlayerInput(player, action);
      });

      btn.addEventListener('mouseup', () => {
        btn.classList.remove('active');
      });

      btn.addEventListener('mouseleave', () => {
        btn.classList.remove('active');
      });
    });
  }

  function handleKeyPress(e) {
    if (!gameState.isPlaying) return;
    
    for (let i = 0; i < gameState.snakes.length; i++) {
      const snake = gameState.snakes[i];
      if (e.code === snake.keys.left) {
        e.preventDefault();
        turnSnakeLeft(i);
      } else if (e.code === snake.keys.right) {
        e.preventDefault();
        turnSnakeRight(i);
      }
    }
  }

  // indicator removed — keeping default UI

  // Multitouch test panel: 4 buttons in center that highlight on pointerdown
  function createMultitouchPanelSnake() {
    if (document.getElementById('multitouch-panel-snake')) return;
    const panel = document.createElement('div');
    panel.id = 'multitouch-panel-snake';
    panel.style.cssText = 'position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);display:grid;grid-template-columns:repeat(2,120px);grid-gap:16px;padding:12px;z-index:100000;pointer-events:auto;';

    const pointerMap = new Map();

    for (let i = 0; i < 4; i++) {
      const btn = document.createElement('button');
      btn.className = 'mt-btn';
      btn.dataset.index = i;
      btn.textContent = `Btn ${i+1}`;
      btn.style.cssText = 'width:120px;height:120px;border-radius:12px;background:#eee;border:1px solid #ccc;font-weight:700;';

      btn.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        pointerMap.set(e.pointerId, btn);
        btn.style.background = '#ffcc00';
      }, { passive: false });

      btn.addEventListener('pointerup', (e) => {
        const stored = pointerMap.get(e.pointerId);
        if (stored) {
          stored.style.background = '#eee';
          pointerMap.delete(e.pointerId);
        }
      });

      btn.addEventListener('pointercancel', (e) => {
        const stored = pointerMap.get(e.pointerId);
        if (stored) {
          stored.style.background = '#eee';
          pointerMap.delete(e.pointerId);
        }
      });

      // mouse support
      btn.addEventListener('mousedown', (e) => {
        if (e.button !== 0) return;
        btn.style.background = '#ffcc00';
      });
      btn.addEventListener('mouseup', () => btn.style.background = '#eee');

      panel.appendChild(btn);
    }

    document.body.appendChild(panel);
  }

  function handlePlayerInput(player, action) {
    if (action === 'left') {
      turnSnakeLeft(player);
    } else if (action === 'right') {
      turnSnakeRight(player);
    }
  }

  function turnSnakeLeft(playerIndex) {
    const snake = gameState.snakes[playerIndex];
    if (!snake.alive) return;
    
    const directions = [
      GAME_CONFIG.directions.RIGHT,
      GAME_CONFIG.directions.DOWN,
      GAME_CONFIG.directions.LEFT,
      GAME_CONFIG.directions.UP
    ];
    
    const currentIndex = directions.findIndex(dir => 
      dir.x === snake.direction.x && dir.y === snake.direction.y
    );
    
    const newIndex = (currentIndex - 1 + 4) % 4;
    snake.nextDirection = directions[newIndex];
  }

  function turnSnakeRight(playerIndex) {
    const snake = gameState.snakes[playerIndex];
    if (!snake.alive) return;
    
    const directions = [
      GAME_CONFIG.directions.RIGHT,
      GAME_CONFIG.directions.DOWN,
      GAME_CONFIG.directions.LEFT,
      GAME_CONFIG.directions.UP
    ];
    
    const currentIndex = directions.findIndex(dir => 
      dir.x === snake.direction.x && dir.y === snake.direction.y
    );
    
    const newIndex = (currentIndex + 1) % 4;
    snake.nextDirection = directions[newIndex];
  }

  function startGameLoop() {
    const gameSpeed = Math.max(100, 200 - (gameState.speed - 1) * 20); // Более плавное движение
    
    gameState.gameLoop = setInterval(() => {
      updateGame();
      updateSpeed();
      updateFoodSpawn();
    }, gameSpeed);
  }

  function updateGame() {
    // Обновляем направление змей
    gameState.snakes.forEach(snake => {
      if (snake.alive) {
        snake.direction = snake.nextDirection;
      }
    });
    
    // Двигаем змей
    gameState.snakes.forEach(snake => {
      if (snake.alive) {
        moveSnake(snake);
      }
    });
    
    // Обновляем отображение
    updateSnakesDisplay();
    checkCollisions();
    checkWinCondition();
  }

  function moveSnake(snake) {
    const head = snake.segments[0];
    const newHead = {
      x: head.x + snake.direction.x,
      y: head.y + snake.direction.y
    };
    
    // Обработка телепорта для пустого поля
    if (gameState.currentField === 'empty') {
      newHead.x = (newHead.x + 20) % 20;
      newHead.y = (newHead.y + 20) % 20;
    }
    
    snake.segments.unshift(newHead);
    
    // Проверяем, съела ли змея еду
    let ateFood = false;
    for (let i = gameState.food.length - 1; i >= 0; i--) {
      const foodItem = gameState.food[i];
      if (newHead.x === foodItem.x && newHead.y === foodItem.y) {
        console.log(`Змея ${snake.id} съела еду в позиции ${newHead.x},${newHead.y}`);
        gameState.food.splice(i, 1); // Удаляем съеденную еду
        ateFood = true;
        break;
      }
    }
    
    if (ateFood) {
      // Создаем новую еду через некоторое время
      setTimeout(() => createFood(), 500);
    } else {
      snake.segments.pop();
    }
  }

  function updateSnakesDisplay() {
    // Сначала скрываем все существующие сегменты
    document.querySelectorAll('.snake-segment, .snake-head').forEach(el => {
      el.style.opacity = '0';
    });
    
    // Затем показываем только нужные
    gameState.snakes.forEach((snake, snakeIndex) => {
      if (!snake.alive) {
        return;
      }
      
      // Вычисляем бледный цвет для тела один раз для каждой змеи
      const paleColor = getPaleColor(snake.color);
      
      snake.segments.forEach((segment, index) => {
        const cell = document.getElementById(`cell-${segment.x}-${segment.y}`);
        if (cell) {
          // Ищем существующий элемент или создаем новый
          let segmentElement = cell.querySelector('.snake-segment, .snake-head');
          
          if (!segmentElement) {
            segmentElement = document.createElement('div');
            segmentElement.className = index === 0 ? 'snake-head' : 'snake-segment';
            
            // Применяем правильный цвет
            const colorClass = snake.colorName.toLowerCase();
            segmentElement.classList.add(`snake-${colorClass}`);
            
            // Голова - полный цвет, тело - бледный цвет
            if (index === 0) {
              segmentElement.style.backgroundColor = snake.color;
            } else {
              segmentElement.style.backgroundColor = paleColor;
            }
            
            cell.appendChild(segmentElement);
          } else {
            // Обновляем цвет для существующих элементов
            if (index === 0) {
              segmentElement.style.backgroundColor = snake.color;
            } else {
              segmentElement.style.backgroundColor = paleColor;
            }
          }
          
          // Плавно показываем элемент
          segmentElement.style.opacity = '1';
          segmentElement.style.transform = 'scale(1)';
        }
      });
    });
    
    // Удаляем элементы, которые больше не нужны
    setTimeout(() => {
      document.querySelectorAll('.snake-segment, .snake-head').forEach(el => {
        if (el.style.opacity === '0') {
          el.remove();
        }
      });
    }, 300);
  }

  function checkCollisions() {
    gameState.snakes.forEach(snake => {
      if (!snake.alive) return;
      
      const head = snake.segments[0];
      
      // Проверка столкновения со стеной
      if (gameState.currentField !== 'empty') {
        if (head.x < 0 || head.x >= 20 || head.y < 0 || head.y >= 20) {
          killSnake(snake);
          return;
        }
        
        const cell = document.getElementById(`cell-${head.x}-${head.y}`);
        if (cell && cell.classList.contains('wall')) {
          killSnake(snake);
          return;
        }
      }
      
      // Проверка столкновения с хвостом
      for (let i = 1; i < snake.segments.length; i++) {
        if (head.x === snake.segments[i].x && head.y === snake.segments[i].y) {
          killSnake(snake);
          return;
        }
      }
      
      // Проверка столкновения с другими змеями
      gameState.snakes.forEach(otherSnake => {
        if (otherSnake.id === snake.id || !otherSnake.alive) return;
        
        otherSnake.segments.forEach(segment => {
          if (head.x === segment.x && head.y === segment.y) {
            killSnake(snake);
            return;
          }
        });
      });
    });
  }

  function killSnake(snake) {
    snake.alive = false;
    updateHUDInfo(`Змея ${snake.colorName} погибла!`);
  }

  function checkWinCondition() {
    const aliveSnakes = gameState.snakes.filter(snake => snake.alive);
    
    if (gameState.currentPlayers === 1) {
      // Для 1 игрока - игра продолжается пока змея жива
      if (aliveSnakes.length === 0) {
        endGame();
      }
    } else {
      // Для 2+ игроков - игра заканчивается когда остается 1 змея
      if (aliveSnakes.length <= 1) {
        endGame();
      }
    }
  }

  function updateSpeed() {
    gameState.speedIncreaseTimer += 100;
    
    if (gameState.speedIncreaseTimer >= 30000) { // 30 секунд
      gameState.speed++;
      gameState.speedIncreaseTimer = 0;
      updateDisplay();
      
      // Перезапускаем игровой цикл с новой скоростью
      if (gameState.gameLoop) {
        clearInterval(gameState.gameLoop);
        startGameLoop();
      }
    }
  }

  function updateFoodSpawn() {
    gameState.foodSpawnTimer += 100;
    
    // Создаем еду каждые 2-3 секунды
    if (gameState.foodSpawnTimer >= 2000 + Math.random() * 1000) {
      gameState.foodSpawnTimer = 0;
      createFood();
    }
  }

  function endGame() {
    gameState.isPlaying = false;
    gameState.gamePhase = 'finished';
    
    if (gameState.gameLoop) {
      clearInterval(gameState.gameLoop);
      gameState.gameLoop = null;
    }
    
    updateHUDInfo('Игра окончена!');
    showEndModal();
  }

  // ЗАПУСК ИГРЫ
  document.addEventListener('DOMContentLoaded', initGame);
  
  // ГЛОБАЛЬНАЯ ФУНКЦИЯ ДЛЯ НАВИГАЦИИ
  window.goToMenu = () => {
    window.location.href = '../../index.html';
  };
})();
