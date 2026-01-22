// ТЕННИС - полноэкранная версия
(() => {
  
  const BALL_IMAGE_PATH = '../../../shared/img/logo_ruj.png'; // путь к изображению мяча
  
  // ТЕСТОВЫЙ РЕЖИМ (измените на false для отключения)
  const TEST_MODE = false; 
  
  // КОНФИГУРАЦИЯ ИГРЫ
  const GAME_CONFIG = {
    name: 'Теннис',
    icon: '🎾',
    maxScore: 5,
    ballSpeed: {
      min: 1,
      max: 4
    },
    paddleSpeed: 8,
    ballSize: 50, 
    paddleSize: { width: 30, height: 240 },
    bonusSpawnInterval: 1000, // 1 секунду
    bonusLifetime: 10000 // 10 секунд
  };

  // СОСТОЯНИЕ ИГРЫ
  const gameState = {
    currentDifficulty: 2,
    score: { left: 0, right: 0 },
    isPlaying: false,
    gamePhase: 'selecting', // 'selecting', 'playing', 'finished'
    isWin: false,
    ball: { x: 0, y: 0, vx: 0, vy: 0, size: 50, color: 'black' },
    paddleLeft: { x: 0, y: 0, width: 30, height: 240 },
    paddleRight: { x: 0, y: 0, width: 30, height: 240 },
    fieldWidth: 0,
    fieldHeight: 0,
    gameLoop: null,
    touchStartY: { left: 0, right: 0 },
    touchCurrentY: { left: 0, right: 0 },
    activeTouches: { left: null, right: null }, // Отслеживание ID касаний
    // Система бонусов
    bonuses: [],
    bonusTimers: { spawn: null, lifetime: null },
    activeBonuses: { left: [], right: [] },
    originalPaddleHeight: 240,
    originalBallSpeed: { min: 2, max: 8 }
  };

  // ТИПЫ БОНУСОВ
  const BONUS_TYPES = {
    PADDLE_LONG: { id: 'paddle_long', name: 'Длинная ракетка', icon: '📏', color: '#10b981' },
    PADDLE_SHORT: { id: 'paddle_short', name: 'Короткая ракетка', icon: '📐', color: '#ef4444' },
    BALL_FAST: { id: 'ball_fast', name: 'Быстрый мяч', icon: '⚡', color: '#f59e0b' },
    BALL_SLOW: { id: 'ball_slow', name: 'Медленный мяч', icon: '🐌', color: '#6b7280' },
    BALL_DOUBLE: { id: 'ball_double', name: 'Двойной мяч', icon: '⚽⚽', color: '#8b5cf6' },
    CONTROLS_INVERT: { id: 'controls_invert', name: 'Инверсное управление', icon: '🔄', color: '#ec4899' }
  };

  // DOM ЭЛЕМЕНТЫ
  let stage, gameField, ballElement, paddleLeftElement, paddleRightElement;
  let hudCheckLeft, hudCheckRight;

  // ИНИЦИАЛИЗАЦИЯ
  function initGame() {
    stage = document.getElementById('stage');
    if (!stage) return;
    
    createGameInterface();
    updateDisplay();
    bindEvents();
    showDifficultyModal();
  }

  // СОЗДАНИЕ ИНТЕРФЕЙСА
  function createGameInterface() {
    stage.innerHTML = `
      <div class="tennis-field" id="tennisField" style="display: none;">
        <div class="center-line"></div>
        <div class="score-display" id="scoreDisplay">0 - 0</div>
        <div class="paddle paddle-left" id="paddleLeft"></div>
        <div class="paddle paddle-right" id="paddleRight"></div>
        <div class="ball" id="ball">
          <img src="" alt="" class="ball-image" id="ballImage">
        </div>
        <div class="touch-area touch-area-left" id="touchAreaLeft"></div>
        <div class="touch-area touch-area-right" id="touchAreaRight"></div>
      </div>
    `;
    
    gameField = document.getElementById('tennisField');
    ballElement = document.getElementById('ball');
    paddleLeftElement = document.getElementById('paddleLeft');
    paddleRightElement = document.getElementById('paddleRight');
    hudCheckLeft = document.getElementById('hudCheckLeft');
    hudCheckRight = document.getElementById('hudCheckRight');
    
    // Устанавливаем изображение мяча
    const ballImage = document.getElementById('ballImage');
    if (ballImage) {
      if (BALL_IMAGE_PATH) {
        ballImage.src = BALL_IMAGE_PATH;
        ballImage.onload = () => {
          console.log('✅ Изображение мяча загружено:', BALL_IMAGE_PATH);
          // Убираем фон когда изображение загрузилось
          ballElement.style.background = 'transparent';
        };
        ballImage.onerror = () => {
          console.error('❌ Ошибка загрузки изображения мяча:', BALL_IMAGE_PATH);
        };
      } else {
        console.log('ℹ️ Путь к изображению мяча не указан, используется градиент');
      }
    }
  }

  // ОБЯЗАТЕЛЬНЫЕ ФУНКЦИИ
  function updateDisplay() {
    const scoreLeft = document.getElementById('scoreLeft');
    const scoreRight = document.getElementById('scoreRight');
    const scoreDisplay = document.getElementById('scoreDisplay');
    
    const scoreText = `${gameState.score.left} - ${gameState.score.right}`;
    if (scoreLeft) scoreLeft.textContent = `Счёт: ${scoreText}`;
    if (scoreRight) scoreRight.textContent = `Счёт: ${scoreText}`;
    if (scoreDisplay) scoreDisplay.textContent = scoreText;
    
    if (!gameState.isPlaying) {
      const turnLabelLeft = document.getElementById('turnLabelLeft');
      const turnLabelRight = document.getElementById('turnLabelRight');
      if (turnLabelLeft) turnLabelLeft.textContent = `${GAME_CONFIG.icon} ${GAME_CONFIG.name}`;
      if (turnLabelRight) turnLabelRight.textContent = `${GAME_CONFIG.icon} ${GAME_CONFIG.name}`;
    }
  }

  function updateHUDInfo(text) {
    const turnLabelLeft = document.getElementById('turnLabelLeft');
    const turnLabelRight = document.getElementById('turnLabelRight');
    if (turnLabelLeft) turnLabelLeft.textContent = text;
    if (turnLabelRight) turnLabelRight.textContent = text;
  }

  function showHUDCheckButton() {
    if (hudCheckLeft) hudCheckLeft.style.display = 'block';
    if (hudCheckRight) hudCheckRight.style.display = 'block';
  }

  function hideHUDCheckButton() {
    if (hudCheckLeft) hudCheckLeft.style.display = 'none';
    if (hudCheckRight) hudCheckRight.style.display = 'none';
  }

  function resetGame() {
    gameState.score = { left: 0, right: 0 };
    gameState.isPlaying = false;
    gameState.gamePhase = 'selecting';
    gameState.isWin = false;
    
    if (gameState.gameLoop) {
      clearInterval(gameState.gameLoop);
      gameState.gameLoop = null;
    }
    
    const modalBackdrop = document.getElementById('modalBackdrop');
    if (modalBackdrop) modalBackdrop.hidden = true;
    
    if (gameField) gameField.style.display = 'none';
    hideHUDCheckButton();
    
    // Удаляем тестовую панель при сбросе
    if (TEST_MODE) {
      removeTestBonusPanel();
    }
    
    showDifficultyModal();
    updateDisplay();
  }

  // МОДАЛЬНЫЕ ОКНА
  function showDifficultyModal() {
    const modalBackdrop = document.getElementById('modalBackdrop');
    if (modalBackdrop) modalBackdrop.hidden = true;
    
    const difficultyModal = document.getElementById('difficultyModal');
    if (difficultyModal) difficultyModal.style.display = 'flex';
  }

  function hideDifficultyModal() {
    const difficultyModal = document.getElementById('difficultyModal');
    if (difficultyModal) difficultyModal.style.display = 'none';
  }

  function showEndModal() {
    const modalBackdrop = document.getElementById('modalBackdrop');
    const modalTitle = document.getElementById('modalTitle');
    const modalSubtitle = document.getElementById('modalSubtitle');
    
    if (modalBackdrop && modalTitle && modalSubtitle) {
      const winner = gameState.score.left > gameState.score.right ? 'Красный' : 'Синий';
      modalTitle.textContent = `Победил ${winner} игрок!`;
      modalSubtitle.textContent = `Финальный счёт: ${gameState.score.left} - ${gameState.score.right}`;
      modalBackdrop.hidden = false;
      modalBackdrop.style.display = 'flex';
    }
  }

  // ОБРАБОТЧИКИ СОБЫТИЙ
  function bindEvents() {
    // Выбор сложности
    const difficultyOptions = document.querySelectorAll('.difficulty-option');
    difficultyOptions.forEach(option => {
      option.addEventListener('click', (e) => {
        const level = parseInt(e.currentTarget.dataset.level);
        gameState.currentDifficulty = level;
        hideDifficultyModal();
        startGame();
      });
    });

    // Кнопки HUD
    const btnNewLeft = document.getElementById('btnNewLeft');
    const btnNewRight = document.getElementById('btnNewRight');
    const btnBackLeft = document.getElementById('btnBackLeft');
    const btnBackRight = document.getElementById('btnBackRight');
    const btnRematch = document.getElementById('btnRematch');
    const btnToMenu = document.getElementById('btnToMenu');
    
    if (btnNewLeft) btnNewLeft.addEventListener('click', resetGame);
    if (btnNewRight) btnNewRight.addEventListener('click', resetGame);
    if (btnBackLeft) btnBackLeft.addEventListener('click', () => window.location.href = '../../index.html');
    if (btnBackRight) btnBackRight.addEventListener('click', () => window.location.href = '../../index.html');
    if (btnRematch) btnRematch.addEventListener('click', () => {
      const modalBackdrop = document.getElementById('modalBackdrop');
      if (modalBackdrop) {
        modalBackdrop.hidden = true;
        modalBackdrop.style.display = 'none';
      }
      // Сбрасываем счет и перезапускаем игру с той же сложностью
      gameState.score = { left: 0, right: 0 };
      updateDisplay();
      startGame();
    });
    if (btnToMenu) btnToMenu.addEventListener('click', () => window.location.href = '../../index.html');

    // Кнопки проверки (не используются в теннисе)
    if (hudCheckLeft) hudCheckLeft.addEventListener('click', () => {});
    if (hudCheckRight) hudCheckRight.addEventListener('click', () => {});
  }

  // ИГРОВАЯ ЛОГИКА
  function startGame() {
    gameState.gamePhase = 'playing';
    
    // Показываем игровое поле перед получением размеров
    if (gameField) gameField.style.display = 'block';
    
    // Небольшая задержка для корректного получения размеров
    setTimeout(() => {
      // Инициализация размеров поля
      const rect = gameField.getBoundingClientRect();
      gameState.fieldWidth = rect.width;
      gameState.fieldHeight = rect.height;
      
      // Инициализация позиций
      initGameObjects();
      
      updateDisplay();
      showGameInstructions();
    }, 100);
  }

  function initGameObjects() {
    // Позиция мяча в центре
    gameState.ball.x = gameState.fieldWidth / 2;
    gameState.ball.y = gameState.fieldHeight / 2;
    gameState.ball.vx = (Math.random() > 0.5 ? 1 : -1) * (GAME_CONFIG.ballSpeed.min + gameState.currentDifficulty);
    gameState.ball.vy = (Math.random() - 0.5) * 2;
    
    // Позиции ракеток (в центре поля)
    gameState.paddleLeft.x = 20;
    gameState.paddleLeft.y = gameState.fieldHeight / 2 - gameState.paddleLeft.height / 2;
    
    gameState.paddleRight.x = gameState.fieldWidth - 40;
    gameState.paddleRight.y = gameState.fieldHeight / 2 - gameState.paddleRight.height / 2;
    
    console.log('Field height:', gameState.fieldHeight);
    console.log('Paddle height:', gameState.paddleLeft.height);
    console.log('Max paddle Y:', gameState.fieldHeight - gameState.paddleLeft.height);
    
    updateGameObjects();
  }

  function updateGameObjects() {
    if (ballElement) {
      ballElement.style.left = `${gameState.ball.x - gameState.ball.size / 2}px`;
      ballElement.style.top = `${gameState.ball.y - gameState.ball.size / 2}px`;
      
      // Применяем цвет мяча
      if (gameState.ball.color === 'red') {
        ballElement.style.background = 'linear-gradient(45deg, #dc2626, #ef4444)';
        ballElement.style.borderColor = '#b91c1c';
        ballElement.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3), 0 0 15px rgba(220, 38, 38, 0.5)';
      } else if (gameState.ball.color === 'blue') {
        ballElement.style.background = 'linear-gradient(45deg, #2563eb, #3b82f6)';
        ballElement.style.borderColor = '#1d4ed8';
        ballElement.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3), 0 0 15px rgba(37, 99, 235, 0.5)';
      } else if (gameState.ball.color === 'black') {
        ballElement.style.background = 'linear-gradient(45deg, #1e293b, #334155)';
        ballElement.style.borderColor = '#0f172a';
        ballElement.style.boxShadow = '0 2px 8px rgba(0,0,0,0.5), 0 0 15px rgba(0,0,0,0.3)';
      } else {
        ballElement.style.background = 'linear-gradient(45deg, #fff, #f0f0f0)';
        ballElement.style.borderColor = '#e5e7eb';
        ballElement.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3), 0 0 15px rgba(255,255,255,0.3)';
      }
    }
    
    if (paddleLeftElement) {
      paddleLeftElement.style.top = `${gameState.paddleLeft.y}px`;
      paddleLeftElement.style.transform = 'none'; // Убираем любые трансформы
    }
    
    if (paddleRightElement) {
      paddleRightElement.style.top = `${gameState.paddleRight.y}px`;
      paddleRightElement.style.transform = 'none'; // Убираем любые трансформы
    }
    
    // Обновляем второй мяч если он существует
    if (gameState.secondBall) {
      const secondBallElement = document.getElementById('secondBall');
      if (secondBallElement) {
        secondBallElement.style.left = `${gameState.secondBall.x - gameState.secondBall.size / 2}px`;
        secondBallElement.style.top = `${gameState.secondBall.y - gameState.secondBall.size / 2}px`;
      }
    }
    
    // Обновляем бонусы
    updateBonuses();
  }

  // СИСТЕМА БОНУСОВ
  function spawnBonus() {
    if (gameState.bonuses.length >= 1) return; // Не больше 1 бонуса на экране
    
    const bonusTypes = Object.values(BONUS_TYPES);
    const randomBonus = bonusTypes[Math.floor(Math.random() * bonusTypes.length)];
    
    const bonus = {
      id: Date.now(),
      type: randomBonus,
      x: Math.random() * (gameState.fieldWidth - 100) + 50,
      y: Math.random() * (gameState.fieldHeight - 100) + 50,
      size: 80,
      spawnTime: Date.now()
    };
    
    gameState.bonuses.push(bonus);
    createBonusElement(bonus);
    
    // Устанавливаем таймер исчезновения
    gameState.bonusTimers.lifetime = setTimeout(() => {
      removeBonus(bonus.id);
    }, GAME_CONFIG.bonusLifetime);
  }

  function createBonusElement(bonus) {
    const bonusElement = document.createElement('div');
    bonusElement.className = 'bonus';
    bonusElement.id = `bonus-${bonus.id}`;
    bonusElement.style.cssText = `
      position: absolute;
      left: ${bonus.x}px;
      top: ${bonus.y}px;
      width: ${bonus.size}px;
      height: ${bonus.size}px;
      background: ${bonus.type.color};
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 40px;
      box-shadow: 0 0 40px ${bonus.type.color}80;
      z-index: 5;
      animation: bonusPulse 1s infinite;
    `;
    bonusElement.textContent = bonus.type.icon;
    bonusElement.title = bonus.type.name;
    
    if (gameField) {
      gameField.appendChild(bonusElement);
    }
  }

  function updateBonuses() {
    gameState.bonuses.forEach(bonus => {
      const bonusElement = document.getElementById(`bonus-${bonus.id}`);
      if (bonusElement) {
        bonusElement.style.left = `${bonus.x}px`;
        bonusElement.style.top = `${bonus.y}px`;
      }
    });
  }

  function removeBonus(bonusId) {
    const bonusIndex = gameState.bonuses.findIndex(b => b.id === bonusId);
    if (bonusIndex !== -1) {
      gameState.bonuses.splice(bonusIndex, 1);
    }
    
    const bonusElement = document.getElementById(`bonus-${bonusId}`);
    if (bonusElement) {
      bonusElement.remove();
    }
  }

  function checkBonusCollision() {
    const ball = gameState.ball;
    
    gameState.bonuses.forEach(bonus => {
      const distance = Math.sqrt(
        Math.pow(ball.x + ball.size/2 - bonus.x - bonus.size/2, 2) +
        Math.pow(ball.y + ball.size/2 - bonus.y - bonus.size/2, 2)
      );
      
      if (distance < (ball.size + bonus.size) / 2) {
        // Бонус поднят
        applyBonus(bonus);
        removeBonus(bonus.id);
      }
    });
  }

  function applyBonus(bonus) {
    const ballColor = gameState.ball.color;
    const player = ballColor === 'red' ? 'left' : ballColor === 'blue' ? 'right' : null;
    
    if (!player) return;
    
    gameState.activeBonuses[player].push(bonus.type.id);
    
    switch (bonus.type.id) {
      case 'paddle_long':
        if (player === 'left') {
          gameState.paddleLeft.height = gameState.originalPaddleHeight * 2;
        } else {
          gameState.paddleRight.height = gameState.originalPaddleHeight * 2;
        }
        // Обновляем визуальное отображение ракеток
        updatePaddleVisuals();
        break;
        
      case 'paddle_short':
        const opponent = player === 'left' ? 'right' : 'left';
        if (opponent === 'left') {
          gameState.paddleLeft.height = gameState.originalPaddleHeight / 2;
        } else {
          gameState.paddleRight.height = gameState.originalPaddleHeight / 2;
        }
        // Обновляем визуальное отображение ракеток
        updatePaddleVisuals();
        break;
        
      case 'ball_fast':
        gameState.ball.vx *= 1.5;
        gameState.ball.vy *= 1.5;
        // Применяем к второму мячу если он существует
        if (gameState.secondBall) {
          gameState.secondBall.vx *= 1.5;
          gameState.secondBall.vy *= 1.5;
        }
        break;
        
      case 'ball_slow':
        gameState.ball.vx *= 0.7;
        gameState.ball.vy *= 0.7;
        // Применяем к второму мячу если он существует
        if (gameState.secondBall) {
          gameState.secondBall.vx *= 0.7;
          gameState.secondBall.vy *= 0.7;
        }
        break;
        
      case 'ball_double':
        // Создаем второй мяч
        createSecondBall();
        break;
        
      case 'controls_invert':
        // Инвертируем управление для игрока
        gameState.controlsInverted = player;
        break;
    }
    
    // Показываем уведомление
    showBonusNotification(bonus.type.name, player);
    // Планируем автоматическое снятие бонуса через заданное время
    setTimeout(() => {
      removeActiveBonus(bonus.type.id, player);
    }, GAME_CONFIG.bonusLifetime);
  }

  function createSecondBall() {
    // Создаем второй мяч в том же направлении, но смещенный
    const offset = 40; // Смещение по вертикали
    const secondBall = {
      x: gameState.ball.x,
      y: gameState.ball.y + offset, // Смещаем вниз
      vx: gameState.ball.vx, // Та же скорость по X (в том же направлении)
      vy: gameState.ball.vy, // Та же скорость по Y
      size: gameState.ball.size,
      color: gameState.ball.color
    };
    
    // Добавляем второй мяч в состояние
    gameState.secondBall = secondBall;
    
    // Создаем визуальный элемент для второго мяча
    createSecondBallElement();
  }

  function createSecondBallElement() {
    if (!gameField) return;
    
    const secondBallElement = document.createElement('div');
    secondBallElement.id = 'secondBall';
    secondBallElement.className = 'ball second-ball';
    secondBallElement.style.cssText = `
      position: absolute;
      width: ${gameState.secondBall.size}px;
      height: ${gameState.secondBall.size}px;
      background: linear-gradient(45deg, #8b5cf6, #a855f7);
      border-radius: 50%;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3), 0 0 15px rgba(139, 92, 246, 0.5);
      border: 2px solid #7c3aed;
      z-index: 3;
    `;
    
    gameField.appendChild(secondBallElement);
  }

  function showBonusNotification(bonusName, player) {
    const notification = document.createElement('div');
    notification.className = 'bonus-notification';
    notification.textContent = bonusName; // Только название бонуса
    notification.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(0,0,0,0.8);
      color: white;
      padding: 10px 20px;
      border-radius: 10px;
      z-index: 1000;
      font-size: 18px;
      font-weight: bold;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.remove();
    }, 2000);
  }

  function resetAllBonuses() {
    // Сбрасываем все активные бонусы
    gameState.activeBonuses = { left: [], right: [] };
    
    // Сбрасываем размеры ракеток
    gameState.paddleLeft.height = gameState.originalPaddleHeight;
    gameState.paddleRight.height = gameState.originalPaddleHeight;
    
    // Обновляем визуальное отображение ракеток
    updatePaddleVisuals();
    
    // Сбрасываем скорость мяча
    gameState.ball.vx = Math.abs(gameState.ball.vx) * (gameState.ball.vx > 0 ? 1 : -1);
    gameState.ball.vy = gameState.ball.vy;
    
    // Убираем инвертированное управление
    gameState.controlsInverted = null;
    
    // Удаляем второй мяч
    const secondBallElement = document.getElementById('secondBall');
    if (secondBallElement) secondBallElement.remove();
    gameState.secondBall = null;
  }

  // Удаляет активный бонус и откатывает эффект для указанного игрока
  function removeActiveBonus(bonusTypeId, player) {
    // Удаляем бонус из списка активных (один экземпляр)
    const idx = gameState.activeBonuses[player].indexOf(bonusTypeId);
    if (idx !== -1) gameState.activeBonuses[player].splice(idx, 1);

    // Откат эффекта по типу
    switch (bonusTypeId) {
      case 'paddle_long':
        if (player === 'left') gameState.paddleLeft.height = gameState.originalPaddleHeight;
        else gameState.paddleRight.height = gameState.originalPaddleHeight;
        updatePaddleVisuals();
        break;
      case 'paddle_short':
        const opponent = player === 'left' ? 'right' : 'left';
        if (opponent === 'left') gameState.paddleLeft.height = gameState.originalPaddleHeight;
        else gameState.paddleRight.height = gameState.originalPaddleHeight;
        updatePaddleVisuals();
        break;
      case 'ball_fast':
        if (gameState.ball) {
          gameState.ball.vx = gameState.ball.vx / 1.5;
          gameState.ball.vy = gameState.ball.vy / 1.5;
        }
        if (gameState.secondBall) {
          gameState.secondBall.vx = gameState.secondBall.vx / 1.5;
          gameState.secondBall.vy = gameState.secondBall.vy / 1.5;
        }
        break;
      case 'ball_slow':
        if (gameState.ball) {
          gameState.ball.vx = gameState.ball.vx / 0.7;
          gameState.ball.vy = gameState.ball.vy / 0.7;
        }
        if (gameState.secondBall) {
          gameState.secondBall.vx = gameState.secondBall.vx / 0.7;
          gameState.secondBall.vy = gameState.secondBall.vy / 0.7;
        }
        break;
      case 'ball_double':
        const secondBallElement = document.getElementById('secondBall');
        if (secondBallElement) secondBallElement.remove();
        gameState.secondBall = null;
        break;
      case 'controls_invert':
        if (gameState.controlsInverted === player) gameState.controlsInverted = null;
        break;
    }
  }

  function updatePaddleVisuals() {
    // Обновляем визуальное отображение левой ракетки
    if (paddleLeftElement) {
      paddleLeftElement.style.height = `${gameState.paddleLeft.height}px`;
    }
    
    // Обновляем визуальное отображение правой ракетки
    if (paddleRightElement) {
      paddleRightElement.style.height = `${gameState.paddleRight.height}px`;
    }
  }

  function startBonusSystem() {
    // Запускаем таймер появления бонусов
    gameState.bonusTimers.spawn = setInterval(() => {
      spawnBonus();
    }, GAME_CONFIG.bonusSpawnInterval);
  }

  // ТЕСТОВЫЙ РЕЖИМ
  function createTestBonusPanel() {
    if (!TEST_MODE) return;
    
    const testPanel = document.createElement('div');
    testPanel.id = 'testBonusPanel';
    testPanel.style.cssText = `
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      background: rgba(0, 0, 0, 0.8);
      padding: 10px;
      display: flex;
      justify-content: center;
      gap: 10px;
      z-index: 2000;
      border-top: 2px solid #333;
    `;
    
    // Создаем кнопки для каждого типа бонуса
    Object.values(BONUS_TYPES).forEach(bonusType => {
      const button = document.createElement('button');
      button.className = 'test-bonus-btn';
      button.style.cssText = `
        width: 50px;
        height: 50px;
        border-radius: 50%;
        background: ${bonusType.color};
        border: 2px solid #fff;
        color: white;
        font-size: 20px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s ease;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      `;
      button.textContent = bonusType.icon;
      button.title = bonusType.name;
      
      // Добавляем эффекты при наведении
      button.addEventListener('mouseenter', () => {
        button.style.transform = 'scale(1.1)';
        button.style.boxShadow = '0 4px 12px rgba(0,0,0,0.4)';
      });
      
      button.addEventListener('mouseleave', () => {
        button.style.transform = 'scale(1)';
        button.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
      });
      
      // Обработчик клика
      button.addEventListener('click', () => {
        applyTestBonus(bonusType);
      });
      
      testPanel.appendChild(button);
    });
    
    document.body.appendChild(testPanel);
  }

  function applyTestBonus(bonusType) {
    // Определяем игрока по цвету мяча
    const ballColor = gameState.ball.color;
    const player = ballColor === 'red' ? 'left' : ballColor === 'blue' ? 'right' : 'left'; // По умолчанию левый
    
    // Создаем временный объект бонуса
    const tempBonus = {
      type: bonusType,
      id: 'test'
    };
    
    // Применяем бонус
    applyBonus(tempBonus);
  }

  function removeTestBonusPanel() {
    const testPanel = document.getElementById('testBonusPanel');
    if (testPanel) {
      testPanel.remove();
    }
  }

  function showGameInstructions() {
    updateHUDInfo('Касайтесь экрана для управления ракетками');
    setTimeout(() => {
      startGameplay();
    }, 2000);
  }

  function startGameplay() {
    updateHUDInfo('Играйте!');
    gameState.isPlaying = true; // Активируем игру только когда начинается геймплей
    setupTouchControls();
    startGameLoop();
    startBonusSystem();
    
    // Создаем тестовую панель если включен тестовый режим
    if (TEST_MODE) {
      createTestBonusPanel();
    }
  }

  function setupTouchControls() {
    const touchAreaLeft = document.getElementById('touchAreaLeft');
    const touchAreaRight = document.getElementById('touchAreaRight');
    
    if (touchAreaLeft) {
      // Touch события
      touchAreaLeft.addEventListener('touchstart', handleTouchStart.bind(null, 'left'));
      touchAreaLeft.addEventListener('touchmove', handleTouchMove.bind(null, 'left'));
      touchAreaLeft.addEventListener('touchend', handleTouchEnd.bind(null, 'left'));
      
      // Mouse события для тестирования
      touchAreaLeft.addEventListener('mousedown', handleMouseStart.bind(null, 'left'));
      touchAreaLeft.addEventListener('mousemove', handleMouseMove.bind(null, 'left'));
      touchAreaLeft.addEventListener('mouseup', handleMouseEnd.bind(null, 'left'));
    }
    
    if (touchAreaRight) {
      // Touch события
      touchAreaRight.addEventListener('touchstart', handleTouchStart.bind(null, 'right'));
      touchAreaRight.addEventListener('touchmove', handleTouchMove.bind(null, 'right'));
      touchAreaRight.addEventListener('touchend', handleTouchEnd.bind(null, 'right'));
      
      // Mouse события для тестирования
      touchAreaRight.addEventListener('mousedown', handleMouseStart.bind(null, 'right'));
      touchAreaRight.addEventListener('mousemove', handleMouseMove.bind(null, 'right'));
      touchAreaRight.addEventListener('mouseup', handleMouseEnd.bind(null, 'right'));
    }
  }

  function handleTouchStart(side, e) {
    e.preventDefault();
    
    // Находим касание в нужной области
    const rect = gameField.getBoundingClientRect();
    const areaLeft = side === 'left' ? 0 : rect.width / 2;
    const areaRight = side === 'left' ? rect.width / 2 : rect.width;
    
    for (let i = 0; i < e.touches.length; i++) {
      const touch = e.touches[i];
      const touchX = touch.clientX - rect.left;
      
      // Проверяем, попадает ли касание в нужную область
      if (touchX >= areaLeft && touchX < areaRight && !gameState.activeTouches[side]) {
        gameState.activeTouches[side] = touch.identifier;
        gameState.touchStartY[side] = touch.clientY - rect.top;
        gameState.touchCurrentY[side] = gameState.touchStartY[side];
        break;
      }
    }
  }

  function handleTouchMove(side, e) {
    e.preventDefault();
    
    if (gameState.activeTouches[side] === null) return;
    
    // Находим касание с нужным ID
    const rect = gameField.getBoundingClientRect();
    let touch = null;
    
    for (let i = 0; i < e.touches.length; i++) {
      if (e.touches[i].identifier === gameState.activeTouches[side]) {
        touch = e.touches[i];
        break;
      }
    }
    
    if (!touch) return;
    
    let touchY = touch.clientY - rect.top;
    
    // Инвертируем управление если активен бонус
    if (gameState.controlsInverted === side) {
      touchY = gameState.fieldHeight - touchY;
    }
    
    // Обновляем позицию ракетки (центр ракетки следует за касанием)
    const paddle = side === 'left' ? gameState.paddleLeft : gameState.paddleRight;
    const newY = touchY - paddle.height / 2;
    // Ограничиваем движение ракетки границами поля
    paddle.y = Math.max(0, Math.min(gameState.fieldHeight - paddle.height, newY));
  }

  function handleTouchEnd(side, e) {
    e.preventDefault();
    
    // Проверяем, было ли отпущено наше касание
    const changedTouches = e.changedTouches;
    for (let i = 0; i < changedTouches.length; i++) {
      if (changedTouches[i].identifier === gameState.activeTouches[side]) {
        gameState.activeTouches[side] = null;
        break;
      }
    }
  }

  // Mouse обработчики
  function handleMouseStart(side, e) {
    e.preventDefault();
    const rect = gameField.getBoundingClientRect();
    gameState.touchStartY[side] = e.clientY - rect.top;
    gameState.touchCurrentY[side] = gameState.touchStartY[side];
  }

  function handleMouseMove(side, e) {
    e.preventDefault();
    if (e.buttons === 1) { // Только если левая кнопка мыши нажата
      const rect = gameField.getBoundingClientRect();
      let mouseY = e.clientY - rect.top;
      
      // Инвертируем управление если активен бонус
      if (gameState.controlsInverted === side) {
        mouseY = gameState.fieldHeight - mouseY;
      }
      
      // Обновляем позицию ракетки (центр ракетки следует за мышью)
      const paddle = side === 'left' ? gameState.paddleLeft : gameState.paddleRight;
      const newY = mouseY - paddle.height / 2;
      // Ограничиваем движение ракетки границами поля
      paddle.y = Math.max(0, Math.min(gameState.fieldHeight - paddle.height, newY));
    }
  }

  function handleMouseEnd(side, e) {
    e.preventDefault();
  }

  function startGameLoop() {
    gameState.gameLoop = setInterval(() => {
      updateGame();
    }, 16); // ~60 FPS
  }

  function updateGame() {
    if (!gameState.isPlaying) return;
    
    // Сохраняем предыдущую позицию мяча
    const prevX = gameState.ball.x;
    const prevY = gameState.ball.y;
    
    // Обновляем позицию мяча
    gameState.ball.x += gameState.ball.vx;
    gameState.ball.y += gameState.ball.vy;
    
    // Обновляем позицию второго мяча если он существует
    if (gameState.secondBall) {
      gameState.secondBall.x += gameState.secondBall.vx;
      gameState.secondBall.y += gameState.secondBall.vy;
      
      // Проверяем столкновения второго мяча со стенами
      if (gameState.secondBall.y <= 0 || gameState.secondBall.y >= gameState.fieldHeight - gameState.secondBall.size) {
        gameState.secondBall.vy = -gameState.secondBall.vy;
        if (gameState.secondBall.y <= 0) gameState.secondBall.y = 0;
        if (gameState.secondBall.y >= gameState.fieldHeight - gameState.secondBall.size) {
          gameState.secondBall.y = gameState.fieldHeight - gameState.secondBall.size;
        }
      }
      
      // Проверяем столкновения второго мяча с ракетками
      checkSecondBallPaddleCollision('left', gameState.secondBall.x - gameState.secondBall.vx, gameState.secondBall.y - gameState.secondBall.vy);
      checkSecondBallPaddleCollision('right', gameState.secondBall.x - gameState.secondBall.vx, gameState.secondBall.y - gameState.secondBall.vy);
      
      // Проверяем голы для второго мяча
      if (gameState.secondBall.x < -gameState.secondBall.size) {
        // Засчитываем очко правому игроку
        gameState.score.right++;
        updateDisplay();
        
        // Удаляем второй мяч (но НЕ останавливаем раунд)
        const secondBallElement = document.getElementById('secondBall');
        if (secondBallElement) secondBallElement.remove();
        gameState.secondBall = null;
      } else if (gameState.secondBall.x > gameState.fieldWidth + gameState.secondBall.size) {
        // Засчитываем очко левому игроку
        gameState.score.left++;
        updateDisplay();
        
        // Удаляем второй мяч (но НЕ останавливаем раунд)
        const secondBallElement = document.getElementById('secondBall');
        if (secondBallElement) secondBallElement.remove();
        gameState.secondBall = null;
      }
    }
    
    // Проверяем столкновения со стенами
    if (gameState.ball.y <= 0 || gameState.ball.y >= gameState.fieldHeight - gameState.ball.size) {
      gameState.ball.vy = -gameState.ball.vy;
      // Корректируем позицию, чтобы мяч не застрял в стене
      if (gameState.ball.y <= 0) gameState.ball.y = 0;
      if (gameState.ball.y >= gameState.fieldHeight - gameState.ball.size) {
        gameState.ball.y = gameState.fieldHeight - gameState.ball.size;
      }
    }
    
    // Проверяем столкновения с ракетками (с учетом траектории)
    checkPaddleCollisionWithTrajectory('left', prevX, prevY);
    checkPaddleCollisionWithTrajectory('right', prevX, prevY);
    
    // Проверяем столкновения с бонусами
    checkBonusCollision();
    
    // Проверяем голы (только если мяч действительно вышел за границы)
    if (gameState.ball.x < -gameState.ball.size) {
      gameState.score.right++;
      resetBall();
    } else if (gameState.ball.x > gameState.fieldWidth + gameState.ball.size) {
      gameState.score.left++;
      resetBall();
    }
    
    // Проверяем окончание игры
    if (gameState.score.left >= GAME_CONFIG.maxScore || gameState.score.right >= GAME_CONFIG.maxScore) {
      endGame();
      return;
    }
    
    updateGameObjects();
    updateDisplay();
  }

  function checkPaddleCollisionWithTrajectory(side, prevX, prevY) {
    const paddle = side === 'left' ? gameState.paddleLeft : gameState.paddleRight;
    const ball = gameState.ball;
    
    // Проверяем, пересекает ли траектория мяча ракетку
    const ballLeft = ball.x;
    const ballRight = ball.x + ball.size;
    const ballTop = ball.y;
    const ballBottom = ball.y + ball.size;
    
    const paddleLeft = paddle.x;
    const paddleRight = paddle.x + paddle.width;
    const paddleTop = paddle.y;
    const paddleBottom = paddle.y + paddle.height;
    
    // Проверяем столкновение с левой ракеткой (красная)
    if (side === 'left' && ball.vx < 0) {
      // Мяч движется влево и пересекает вертикальную линию ракетки
      if (prevX + ball.size >= paddleRight && ballRight <= paddleRight) {
        // Проверяем пересечение по Y (включая касание краев)
        if (ballBottom > paddleTop && ballTop < paddleBottom) {
          // Корректируем позицию мяча
          ball.x = paddleRight;
          ball.vx = Math.abs(ball.vx) * 1.1;
          
          // Добавляем угол отскока в зависимости от того, где мяч попал в ракетку
          const hitPoint = (ball.y + ball.size/2 - paddle.y) / paddle.height;
          const angle = (hitPoint - 0.5) * 4; // -2 до +2
          ball.vy += angle;
          
          // Меняем цвет мяча на красный
          ball.color = 'red';
          
          ballElement.classList.add('ball-hit');
          setTimeout(() => ballElement.classList.remove('ball-hit'), 200);
        }
      }
    }
    
    // Проверяем столкновение с правой ракеткой (синяя)
    if (side === 'right' && ball.vx > 0) {
      // Мяч движется вправо и пересекает вертикальную линию ракетки
      if (prevX <= paddleLeft && ballLeft >= paddleLeft) {
        // Проверяем пересечение по Y (включая касание краев)
        if (ballBottom > paddleTop && ballTop < paddleBottom) {
          // Корректируем позицию мяча
          ball.x = paddleLeft - ball.size;
          ball.vx = -Math.abs(ball.vx) * 1.1;
          
          // Добавляем угол отскока в зависимости от того, где мяч попал в ракетку
          const hitPoint = (ball.y + ball.size/2 - paddle.y) / paddle.height;
          const angle = (hitPoint - 0.5) * 4; // -2 до +2
          ball.vy += angle;
          
          // Меняем цвет мяча на синий
          ball.color = 'blue';
          
          ballElement.classList.add('ball-hit');
          setTimeout(() => ballElement.classList.remove('ball-hit'), 200);
        }
      }
    }
  }

  // Старая функция для совместимости
  function checkPaddleCollision(side) {
    checkPaddleCollisionWithTrajectory(side, gameState.ball.x - gameState.ball.vx, gameState.ball.y - gameState.ball.vy);
  }

  // Функция для проверки столкновений второго мяча с синхронизацией скоростей
  function checkSecondBallPaddleCollision(side, prevX, prevY) {
    if (!gameState.secondBall) return;
    
    const paddle = side === 'left' ? gameState.paddleLeft : gameState.paddleRight;
    const ball = gameState.secondBall;
    
    const ballLeft = ball.x;
    const ballRight = ball.x + ball.size;
    const ballTop = ball.y;
    const ballBottom = ball.y + ball.size;
    
    const paddleLeft = paddle.x;
    const paddleRight = paddle.x + paddle.width;
    const paddleTop = paddle.y;
    const paddleBottom = paddle.y + paddle.height;
    
    // Проверяем столкновение с левой ракеткой
    if (side === 'left' && ball.vx < 0) {
      if (prevX + ball.size >= paddleRight && ballRight <= paddleRight) {
        if (ballBottom >= paddleTop && ballTop <= paddleBottom) {
          // Корректируем позицию второго мяча
          ball.x = paddleRight;
          ball.vx = Math.abs(ball.vx) * 1.1;
          
          // Добавляем угол отскока
          const hitPoint = (ball.y + ball.size/2 - paddle.y) / paddle.height;
          const angle = (hitPoint - 0.5) * 4;
          ball.vy += angle;
          
          // Визуальный эффект
          const secondBallElement = document.getElementById('secondBall');
          if (secondBallElement) {
            secondBallElement.classList.add('ball-hit');
            setTimeout(() => secondBallElement.classList.remove('ball-hit'), 200);
          }
        }
      }
    }
    
    // Проверяем столкновение с правой ракеткой
    if (side === 'right' && ball.vx > 0) {
      if (prevX <= paddleLeft && ballLeft >= paddleLeft) {
        if (ballBottom >= paddleTop && ballTop <= paddleBottom) {
          // Корректируем позицию второго мяча
          ball.x = paddleLeft - ball.size;
          ball.vx = -Math.abs(ball.vx) * 1.1;
          
          // Добавляем угол отскока
          const hitPoint = (ball.y + ball.size/2 - paddle.y) / paddle.height;
          const angle = (hitPoint - 0.5) * 4;
          ball.vy += angle;
          
          // Визуальный эффект
          const secondBallElement = document.getElementById('secondBall');
          if (secondBallElement) {
            secondBallElement.classList.add('ball-hit');
            setTimeout(() => secondBallElement.classList.remove('ball-hit'), 200);
          }
        }
      }
    }
  }

  function resetBall() {
    gameState.ball.x = gameState.fieldWidth / 2;
    gameState.ball.y = gameState.fieldHeight / 2;
    gameState.ball.vx = (Math.random() > 0.5 ? 1 : -1) * (GAME_CONFIG.ballSpeed.min + gameState.currentDifficulty);
    gameState.ball.vy = (Math.random() - 0.5) * 2;
    gameState.ball.color = 'black'; // Сбрасываем цвет мяча
    
    // НЕ сбрасываем бонусы при голе - ракетки сохраняют размеры
    
    // Удаляем все бонусы с поля
    gameState.bonuses.forEach(bonus => {
      const bonusElement = document.getElementById(`bonus-${bonus.id}`);
      if (bonusElement) bonusElement.remove();
    });
    gameState.bonuses = [];
    
    // Очищаем таймеры бонусов
    if (gameState.bonusTimers.lifetime) {
      clearTimeout(gameState.bonusTimers.lifetime);
      gameState.bonusTimers.lifetime = null;
    }
    
    // Обновляем позицию мяча на экране
    updateGameObjects();
  }

  function endGame() {
    gameState.isPlaying = false;
    gameState.gamePhase = 'finished';
    
    if (gameState.gameLoop) {
      clearInterval(gameState.gameLoop);
      gameState.gameLoop = null;
    }
    
    hideHUDCheckButton();
    updateHUDInfo('Игра окончена!');
    showEndModal();
  }

  // ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ЗАПУСК ИГРЫ
  document.addEventListener('DOMContentLoaded', initGame);
  
  // ГЛОБАЛЬНАЯ ФУНКЦИЯ ДЛЯ НАВИГАЦИИ
  window.goToMenu = () => {
    window.location.href = '../../index.html';
  };
})();
