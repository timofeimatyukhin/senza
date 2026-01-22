// Сёма - полноэкранная версия
(() => {
  // КОНФИГУРАЦИЯ ИГРЫ
  const GAME_CONFIG = {
    name: 'Цветовой код',
    icon: '🔢',
    colors: [
      { name: 'red', value: '#FE112E', display: 'Красный', sector: 'top-left' },
      { name: 'blue', value: '#1E6FE3', display: 'Синий', sector: 'top-right' },
      { name: 'green', value: '#2ED573', display: 'Зелёный', sector: 'bottom-left' },
      { name: 'yellow', value: '#FFE23F', display: 'Жёлтый', sector: 'bottom-right' }
    ],
    flashDuration: 400,
    pauseDuration: 200,
    sequenceStartLength: 1
  };

  // СОСТОЯНИЕ ИГРЫ
  const gameState = {
    currentPlayers: 1,
    gameMode: 'hard', // 'easy' или 'hard'
    score: 0,
    level: 1,
    isPlaying: false,
    gamePhase: 'selecting', // 'selecting', 'showing', 'waiting', 'finished'
    isWin: false,
    currentSequence: [],
    playerSequences: {}, // Объект для хранения последовательностей каждого игрока
    currentPlayerIndex: 0,
    players: [],
    showSequenceIndex: 0,
    isShowingSequence: false,
    playersAnswered: 0, // Количество игроков, давших ответ
    totalActivePlayers: 0, // Текущее количество активных игроков
    playersAtRoundStart: 0, // Количество активных игроков в начале раунда
    roundTransitionInProgress: false // Флаг для предотвращения повторного перехода к следующему уровню
  };

  // DOM ЭЛЕМЕНТЫ
  let stage, centerCircle, playersSection;
  let hudCheckLeft, hudCheckRight;

  // ИНИЦИАЛИЗАЦИЯ
  function initGame() {
    console.log('Инициализация игры Сёма...');
    stage = document.getElementById('stage');
    if (!stage) {
      console.error('Элемент stage не найден!');
      return;
    }
    
    // Убеждаемся, что модальное окно результатов скрыто при загрузке
    const modalBackdrop = document.getElementById('modalBackdrop');
    if (modalBackdrop) {
      modalBackdrop.hidden = true;
      modalBackdrop.style.display = 'none';
      modalBackdrop.style.visibility = 'hidden';
    }
    
    console.log('Создание интерфейса...');
    createGameInterface();
    updateDisplay();
    bindEvents();
    
    // Синхронизируем начальное состояние с HTML (по умолчанию выбран простой режим и 1 игрок)
    gameState.gameMode = 'easy';
    gameState.currentPlayers = 1;
    
    showDifficultyModal();
    // Обновляем состояние кнопки "Начать игру" после загрузки
    setTimeout(() => updateStartButton(), 100);
    console.log('Игра инициализирована!');
  }

  // СОЗДАНИЕ ИНТЕРФЕЙСА
  function createGameInterface() {
    console.log('Создание игрового интерфейса...');
    stage.innerHTML = `
      <div class="syoma-game" id="syomaGame">
        <div class="center-circle" id="centerCircle">
          <div class="sector top-left" data-color="red"></div>
          <div class="sector top-right" data-color="blue"></div>
          <div class="sector bottom-left" data-color="green"></div>
          <div class="sector bottom-right" data-color="yellow"></div>
        </div>
        <div class="players-section" id="playersSection">
          <div style="grid-column: 1/-1; text-align: center; color: white; font-size: 28px;">
            Выберите количество игроков для начала игры
          </div>
        </div>
      </div>
    `;
    
    const syomaGame = document.getElementById('syomaGame');
    centerCircle = document.getElementById('centerCircle');
    playersSection = document.getElementById('playersSection');
    hudCheckLeft = document.getElementById('hudCheckLeft');
    hudCheckRight = document.getElementById('hudCheckRight');
    
    console.log('Элементы созданы:', {
      syomaGame: !!syomaGame,
      centerCircle: !!centerCircle,
      playersSection: !!playersSection
    });
  }

  // ОБЯЗАТЕЛЬНЫЕ ФУНКЦИИ
  function updateDisplay() {
    const scoreLeft = document.getElementById('scoreLeft');
    const scoreRight = document.getElementById('scoreRight');
    if (scoreLeft) scoreLeft.textContent = `Уровень: ${gameState.level}`;
    if (scoreRight) scoreRight.textContent = `Уровень: ${gameState.level}`;
    
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
    gameState.score = 0;
    gameState.level = 1;
    gameState.isPlaying = false;
    gameState.gamePhase = 'selecting';
    gameState.isWin = false;
    gameState.currentSequence = []; // Сбрасываем последовательность для обоих режимов
    gameState.playerSequences = {};
    gameState.currentPlayerIndex = 0;
    gameState.players = [];
    gameState.showSequenceIndex = 0;
    gameState.isShowingSequence = false;
    gameState.playersAnswered = 0;
    gameState.totalActivePlayers = 0;
    gameState.playersAtRoundStart = 0;
    gameState.roundTransitionInProgress = false; // Сбрасываем флаг
    // Режим игры не сбрасываем, оставляем выбранный
    
    const modalBackdrop = document.getElementById('modalBackdrop');
    if (modalBackdrop) {
      modalBackdrop.hidden = true;
      modalBackdrop.style.display = 'none';
      modalBackdrop.style.visibility = 'hidden';
    }
    
    hideHUDCheckButton();
    
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

  function showEndModal(winner, finalScore) {
    console.log('showEndModal вызвана:', { winner, finalScore });
    const modalBackdrop = document.getElementById('modalBackdrop');
    const modalTitle = document.getElementById('modalTitle');
    const modalSubtitle = document.getElementById('modalSubtitle');
    const difficultyModal = document.getElementById('difficultyModal');
    
    // Скрываем модальное окно настроек, если оно открыто
    if (difficultyModal) {
      difficultyModal.style.display = 'none';
    }
    
    console.log('Элементы модального окна:', {
      modalBackdrop: !!modalBackdrop,
      modalTitle: !!modalTitle,
      modalSubtitle: !!modalSubtitle
    });
    
    if (modalBackdrop && modalTitle && modalSubtitle) {
      if (winner) {
        modalTitle.textContent = `Победил Игрок ${winner.id}`;
        modalSubtitle.textContent = `Ваш счёт: ${finalScore}`;
      } else {
        modalTitle.textContent = 'Игра окончена!';
        modalSubtitle.textContent = `Все игроки выбыли. Счёт: ${finalScore}`;
      }
      modalBackdrop.hidden = false;
      modalBackdrop.style.display = 'flex';
      modalBackdrop.style.visibility = 'visible';
      console.log('Модальное окно показано');
    } else {
      console.error('Элементы модального окна не найдены!');
    }
  }

  function updateStartButton() {
    const startBtn = document.getElementById('startGameBtn');
    const modeSelected = document.querySelector('.mode-option.selected');
    const playersSelected = document.querySelector('.player-option.selected');
    
    if (startBtn && modeSelected && playersSelected) {
      startBtn.disabled = false;
    }
  }

  // ОБРАБОТЧИКИ СОБЫТИЙ
  function bindEvents() {
    // Выбор режима игры
    const modeOptions = document.querySelectorAll('.mode-option');
    modeOptions.forEach(option => {
      option.addEventListener('click', (e) => {
        modeOptions.forEach(opt => opt.classList.remove('selected'));
        e.currentTarget.classList.add('selected');
        gameState.gameMode = e.currentTarget.dataset.mode;
        updateStartButton();
      });
    });

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

    // Кнопка начала игры
    const startGameBtn = document.getElementById('startGameBtn');
    if (startGameBtn) {
      startGameBtn.addEventListener('click', () => {
        hideDifficultyModal();
        startGame();
      });
    }

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
        modalBackdrop.style.visibility = 'hidden';
      }
      resetGame();
    });
    if (btnToMenu) btnToMenu.addEventListener('click', () => window.location.href = '../../index.html');
  }

  // АЛГОРИТМ ИГРЫ
  function startGame() {
    gameState.isPlaying = true;
    gameState.gamePhase = 'showing';
    
    // Инициализация игроков
    gameState.players = [];
    for (let i = 1; i <= gameState.currentPlayers; i++) {
      gameState.players.push({
        id: i,
        status: 'active',
        score: 0
      });
    }
    
    createPlayersInterface();
    updateDisplay();
    showGameInstructions();
  }

  function createPlayersInterface() {
    if (!playersSection) return;
    
    playersSection.innerHTML = '';
    
    gameState.players.forEach((player, index) => {
      const playerDiv = document.createElement('div');
      playerDiv.className = 'player-controls';
      // Для игроков 1 и 2 меняем порядок и переворачиваем
      if (player.id <= 2) {
        playerDiv.innerHTML = `
          <div class="player-status ${player.status} flipped">${getPlayerStatusText(player.status)}</div>
          <div class="player-buttons">
            <button class="player-btn red" data-color="red" data-player="${player.id}"></button>
            <button class="player-btn blue" data-color="blue" data-player="${player.id}"></button>
            <button class="player-btn green" data-color="green" data-player="${player.id}"></button>
            <button class="player-btn yellow" data-color="yellow" data-player="${player.id}"></button>
          </div>
          <div class="player-label flipped">Игрок ${player.id}</div>
        `;
      } else {
        playerDiv.innerHTML = `
          <div class="player-label">Игрок ${player.id}</div>
          <div class="player-buttons">
            <button class="player-btn red" data-color="red" data-player="${player.id}"></button>
            <button class="player-btn blue" data-color="blue" data-player="${player.id}"></button>
            <button class="player-btn green" data-color="green" data-player="${player.id}"></button>
            <button class="player-btn yellow" data-color="yellow" data-player="${player.id}"></button>
          </div>
          <div class="player-status ${player.status}">${getPlayerStatusText(player.status)}</div>
        `;
      }
      
      // Позиционируем игроков по углам (с учетом HUD панелей)
      // Определяем отступы в зависимости от размера экрана
      const isMobile = window.innerWidth <= 768;
      const isSmallMobile = window.innerWidth <= 480;
      const leftRightOffset = isSmallMobile ? '15px' : isMobile ? '18px' : '20px';
      
      const positions = [
        { top: '20px', left: leftRightOffset },      // Верхний левый
        { top: '20px', right: leftRightOffset },     // Верхний правый
        { bottom: '20px', left: leftRightOffset },   // Нижний левый
        { bottom: '20px', right: leftRightOffset }   // Нижний правый
      ];
      
      if (positions[index]) {
        Object.assign(playerDiv.style, positions[index]);
      }
      
      playersSection.appendChild(playerDiv);
    });
    
    // Добавляем обработчики для кнопок игроков
    const playerBtns = playersSection.querySelectorAll('.player-btn');
    playerBtns.forEach(btn => {
      btn.addEventListener('click', handlePlayerButtonClick);
    });
  }

  function getPlayerStatusText(status) {
    switch (status) {
      case 'active': return 'Активен';
      case 'eliminated': return 'Выбыл';
      case 'winner': return 'Победитель!';
      default: return '';
    }
  }

  function showGameInstructions() {
    updateHUDInfo('Смотрите на последовательность...');
    setTimeout(() => {
      generateNewSequence();
      showSequence();
    }, 2000);
  }

  function generateNewSequence() {
    if (gameState.gameMode === 'easy') {
      // Простой режим: добавляем один новый цвет к существующей последовательности
      if (gameState.currentSequence.length === 0) {
        // Первый раунд - начинаем с одного случайного цвета
        const randomColor = GAME_CONFIG.colors[Math.floor(Math.random() * GAME_CONFIG.colors.length)];
        gameState.currentSequence = [randomColor.name];
      } else {
        // Последующие раунды - добавляем один новый случайный цвет
        const randomColor = GAME_CONFIG.colors[Math.floor(Math.random() * GAME_CONFIG.colors.length)];
        gameState.currentSequence.push(randomColor.name);
      }
    } else {
      // Сложный режим: генерируем новую последовательность каждый раз
      gameState.currentSequence = [];
      const sequenceLength = gameState.level;
      
      for (let i = 0; i < sequenceLength; i++) {
        const randomColor = GAME_CONFIG.colors[Math.floor(Math.random() * GAME_CONFIG.colors.length)];
        gameState.currentSequence.push(randomColor.name);
      }
    }
    
    // Сбрасываем последовательности всех игроков
    gameState.playerSequences = {};
    gameState.playersAnswered = 0;
    gameState.totalActivePlayers = gameState.players.filter(p => p.status === 'active').length;
    gameState.playersAtRoundStart = gameState.totalActivePlayers;
    gameState.showSequenceIndex = 0;
    gameState.isShowingSequence = true;
    gameState.roundTransitionInProgress = false; // Сбрасываем флаг при генерации новой последовательности
  }

  async function showSequence() {
    updateHUDInfo('Повторите последовательность');
    
    // Убеждаемся, что все сектора неактивны в начале
    const allSectors = centerCircle.querySelectorAll('.sector');
    allSectors.forEach(sector => sector.classList.remove('active'));
    
    for (let i = 0; i < gameState.currentSequence.length; i++) {
      const color = gameState.currentSequence[i];
      const sector = centerCircle.querySelector(`[data-color="${color}"]`);
      
      if (sector) {
        // Убеждаемся, что предыдущие сектора неактивны
        allSectors.forEach(s => s.classList.remove('active'));
        
        // Активируем текущий сектор
        sector.classList.add('active');
        await sleep(GAME_CONFIG.flashDuration);
        
        // Деактивируем сектор
        sector.classList.remove('active');
        await sleep(GAME_CONFIG.pauseDuration);
      }
    }
    
    // Финальная очистка - убеждаемся, что все сектора неактивны
    allSectors.forEach(sector => sector.classList.remove('active'));
    
    gameState.isShowingSequence = false;
    gameState.gamePhase = 'waiting';
    enablePlayerInput();
  }

  function enablePlayerInput() {
    const activePlayers = gameState.players.filter(p => p.status === 'active');
    if (activePlayers.length === 0) {
      endGame();
      return;
    }
    
    updateHUDInfo(`Повторите последовательность (${gameState.playersAnswered}/${gameState.playersAtRoundStart})`);
    
    const playerBtns = playersSection.querySelectorAll('.player-btn');
    playerBtns.forEach(btn => {
      const playerId = parseInt(btn.dataset.player);
      const player = gameState.players.find(p => p.id === playerId);
      btn.disabled = !player || player.status !== 'active';
    });
  }

  function handlePlayerButtonClick(e) {
    if (gameState.gamePhase !== 'waiting' || gameState.isShowingSequence) return;
    
    const color = e.target.dataset.color;
    const playerId = parseInt(e.target.dataset.player);
    const player = gameState.players.find(p => p.id === playerId);
    
    if (!player || player.status !== 'active') return;
    
    // Инициализируем последовательность игрока, если её нет
    if (!gameState.playerSequences[playerId]) {
      gameState.playerSequences[playerId] = [];
    }
    
    // Добавляем цвет к последовательности игрока
    gameState.playerSequences[playerId].push(color);
    
    // Подсвечиваем нажатую кнопку
    e.target.style.transform = 'scale(0.9)';
    setTimeout(() => {
      e.target.style.transform = '';
    }, 150);
    
    // Проверяем, завершил ли игрок последовательность
    if (gameState.playerSequences[playerId].length === gameState.currentSequence.length) {
      checkPlayerSequence(player);
    }
  }

  function checkPlayerSequence(player) {
    const playerSequence = gameState.playerSequences[player.id];
    const isCorrect = playerSequence.every((color, index) => 
      color === gameState.currentSequence[index]
    );
    
    // Увеличиваем счетчик отвечавших игроков
    gameState.playersAnswered++;
    
    if (isCorrect) {
      player.score++;
      gameState.score = Math.max(gameState.score, player.score);
      
      updateHUDInfo(`Игрок ${player.id} правильно! (${gameState.playersAnswered}/${gameState.playersAtRoundStart})`);
      
      // Если все игроки ответили, переходим к следующему уровню
      if (gameState.playersAnswered >= gameState.playersAtRoundStart && !gameState.roundTransitionInProgress) {
        gameState.roundTransitionInProgress = true; // Устанавливаем флаг
        gameState.level++;
        
        setTimeout(() => {
          updateHUDInfo(`Все правильно! Уровень ${gameState.level}`);
          setTimeout(() => {
            generateNewSequence();
            showSequence();
          }, 1500);
        }, 1000);
      }
      
    } else {
      // Игрок выбывает
      player.status = 'eliminated';
      gameState.totalActivePlayers--;
      
      updateHUDInfo(`Игрок ${player.id} выбыл! (${gameState.playersAnswered}/${gameState.playersAtRoundStart})`);
      
      // Обновляем интерфейс игрока
      updatePlayerStatus(player.id);
      
      // Проверяем, нужно ли завершать раунд
      setTimeout(() => {
        const activePlayers = gameState.players.filter(p => p.status === 'active');
        
        // Если это одиночная игра или остался 1 или меньше активных игроков, завершаем игру
        if (gameState.currentPlayers === 1 || activePlayers.length <= 1) {
          endGame();
        } else {
          // Проверяем, ответили ли все игроки
          if (gameState.playersAnswered >= gameState.playersAtRoundStart && !gameState.roundTransitionInProgress) {
            // Все игроки ответили, переходим к следующему уровню
            gameState.roundTransitionInProgress = true; // Устанавливаем флаг
            gameState.level++;
            setTimeout(() => {
              generateNewSequence();
              showSequence();
            }, 1500);
          } else {
            // Не все игроки ответили, продолжаем ждать
            enablePlayerInput();
          }
        }
      }, 1500);
    }
    
    updateDisplay();
  }

  function updatePlayerStatus(playerId) {
    const player = gameState.players.find(p => p.id === playerId);
    if (!player) return;
    
    const playerDiv = playersSection.querySelector(`[data-player="${playerId}"]`)?.closest('.player-controls');
    if (playerDiv) {
      const statusDiv = playerDiv.querySelector('.player-status');
      if (statusDiv) {
        // Для игроков 1 и 2 добавляем класс flipped
        const flippedClass = player.id <= 2 ? ' flipped' : '';
        statusDiv.className = `player-status ${player.status}${flippedClass}`;
        statusDiv.textContent = getPlayerStatusText(player.status);
      }
      
      // Отключаем кнопки игрока
      const playerBtns = playerDiv.querySelectorAll('.player-btn');
      playerBtns.forEach(btn => {
        btn.disabled = true;
      });
    }
  }

  function endGame() {
    console.log('endGame вызвана');
    gameState.isPlaying = false;
    gameState.gamePhase = 'finished';
    
    hideHUDCheckButton();
    
    let winner = null;
    let finalScore = gameState.level - 1; // Раунд, на котором остановилась игра
    
    if (gameState.currentPlayers === 1) {
      updateHUDInfo('Игра завершена!');
      winner = { id: 1 };
    } else {
      winner = gameState.players.find(p => p.status === 'active');
      if (winner) {
        winner.status = 'winner';
        updatePlayerStatus(winner.id);
        updateHUDInfo(`Победитель: Игрок ${winner.id}!`);
      } else {
        updateHUDInfo('Все игроки выбыли!');
        // Если все выбыли, победителя нет
        winner = null;
      }
    }
    
    console.log('Показываем модальное окно:', { winner, finalScore });
    showEndModal(winner, finalScore);
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