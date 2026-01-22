// ШАЙБА - игра для двух игроков
(() => {
  // ПУТИ К ИЗОБРАЖЕНИЯМ ДЛЯ ШАРОВ (оставьте пустыми, если не нужны изображения)
  const PUCK_IMAGE_RED = '../../../shared/img/logo_ruj.png'; // Вставьте сюда путь к изображению для красного игрока
  const PUCK_IMAGE_BLUE = '../../../shared/img/logo_ruj.png'; // Вставьте сюда путь к изображению для синего игрока
  
  // КОНФИГУРАЦИЯ ИГРЫ
  const GAME_CONFIG = {
    name: 'Шайба',
    icon: '🏒',
    puckRadius: 60, // Радиус шайбы (диаметр = 120px)
    puckMass: 1.0, // Масса шайбы
    gateSize: 180, // Размер ворот = 1.5 * диаметр шайбы (1.5 * 120 = 180)
    pucksPerPlayer: 6,
    friction: 0.98, // Трение (замедление)
    wallRestitution: 0.85, // Коэффициент отскока от стен
    puckRestitution: 0.9, // Коэффициент отскока шайб друг от друга
    minVelocity: 0.1, // Минимальная скорость (ниже этой шайба останавливается)
    maxAimDistance: 300 // Максимальная длина стрелки прицеливания (5 * диаметр = 5 * 60 = 300)
  };

  // СОСТОЯНИЕ ИГРЫ
  const gameState = {
    isPlaying: false,
    controlMode: 'direct', // 'direct' или 'aim'
    pucks: [],
    fieldWidth: 0,
    fieldHeight: 0,
    gameLoop: null,
    activeTouches: new Map(), // Map<touchId, puckId>
    draggedPucks: new Map(), // Map<puckId, {startX, startY, touchX, touchY, history: [{x, y, time}]}>
    aimArrows: new Map() // Map<puckId, arrowElement> для прицельного режима
  };

  // DOM ЭЛЕМЕНТЫ
  let stage, gameField, gateElement;

  // ИНИЦИАЛИЗАЦИЯ
  function initGame() {
    stage = document.getElementById('stage');
    if (!stage) return;
    
    createGameInterface();
    bindEvents();
    
    // Небольшая задержка для корректного получения размеров поля
    setTimeout(() => {
      const rect = gameField.getBoundingClientRect();
      gameState.fieldWidth = rect.width;
      gameState.fieldHeight = rect.height;
    }, 100);
    
    // Показываем модальное окно выбора режима при первой загрузке
    // Модальное окно уже видимо по умолчанию в HTML
  }

  // СОЗДАНИЕ ИНТЕРФЕЙСА
  function createGameInterface() {
    stage.innerHTML = `
      <div class="shaiba-field" id="shaibaField">
        <div class="center-wall"></div>
        <div class="gate" id="gate"></div>
      </div>
    `;
    
    gameField = document.getElementById('shaibaField');
    gateElement = document.getElementById('gate');
  }

  // ОБРАБОТЧИКИ СОБЫТИЙ
  function bindEvents() {
    // Выбор режима управления
    const controlModeOptions = document.querySelectorAll('[data-mode]');
    controlModeOptions.forEach(option => {
      option.addEventListener('click', (e) => {
        const mode = e.currentTarget.dataset.mode;
        gameState.controlMode = mode;
        hideControlModeModal();
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
    const btnToMenuFromMode = document.getElementById('btnToMenuFromMode');
    
    if (btnNewLeft) btnNewLeft.addEventListener('click', resetGame);
    if (btnNewRight) btnNewRight.addEventListener('click', resetGame);
    if (btnBackLeft) btnBackLeft.addEventListener('click', () => window.location.href = '../../index.html');
    if (btnBackRight) btnBackRight.addEventListener('click', () => window.location.href = '../../index.html');
    if (btnRematch) btnRematch.addEventListener('click', () => {
      const modalBackdrop = document.getElementById('modalBackdrop');
      if (modalBackdrop) modalBackdrop.hidden = true;
      showControlModeModal();
    });
    if (btnToMenu) btnToMenu.addEventListener('click', () => window.location.href = '../../index.html');
    if (btnToMenuFromMode) btnToMenuFromMode.addEventListener('click', () => window.location.href = '../../index.html');
  }
  
  function showControlModeModal() {
    const controlModeModal = document.getElementById('controlModeModal');
    if (controlModeModal) controlModeModal.style.display = 'flex';
  }
  
  function hideControlModeModal() {
    const controlModeModal = document.getElementById('controlModeModal');
    if (controlModeModal) controlModeModal.style.display = 'none';
  }

  // ИГРОВАЯ ЛОГИКА
  function startGame() {
    if (!gameField) return;
    
    // Останавливаем предыдущий игровой цикл если он был
    if (gameState.gameLoop) {
      clearInterval(gameState.gameLoop);
      gameState.gameLoop = null;
    }
    
    // Получаем размеры поля
    const rect = gameField.getBoundingClientRect();
    gameState.fieldWidth = rect.width;
    gameState.fieldHeight = rect.height;
    
    // Устанавливаем размер ворот
    if (gateElement) {
      gateElement.style.height = `${GAME_CONFIG.gateSize}px`;
    }
    
    // Создаем шайбы
    createPucks();
    
    // Запускаем игровой цикл
    gameState.isPlaying = true;
    startGameLoop();
    
    // Настраиваем мультитач управление
    setupTouchControls();
  }

  function createPucks() {
    // Очищаем существующие шайбы
    gameState.pucks = [];
    const existingPucks = gameField.querySelectorAll('.puck');
    existingPucks.forEach(puck => puck.remove());
    
    const puckDiameter = GAME_CONFIG.puckRadius * 2;
    const puckRadius = GAME_CONFIG.puckRadius;
    const centerY = gameState.fieldHeight / 2;
    
    // Создаем красные шайбы (левая сторона) треугольником
    // Расположение: 3 у борта, 2 в середине, 1 ближе к центру (вершина к центру)
    const redPucks = [];
    
    // Латеральный столбец (3 шайбы) - у левого борта
    for (let i = 0; i < 3; i++) {
      redPucks.push({
        x: puckRadius + 10, // у самого борта
        y: centerY + (i - 1) * (puckDiameter + 5) // центрируем по вертикали
      });
    }
    
    // Средний столбец (2 шайбы) - ближе к центру
    for (let i = 0; i < 2; i++) {
      redPucks.push({
        x: puckRadius + 10 + 60, // смещаем от борта
        y: centerY + (i - 0.5) * (puckDiameter + 5) // центрируем по вертикали
      });
    }
    
    // Медиальный столбец (1 шайба) - ближе всего к центру
    redPucks.push({
      x: puckRadius + 10 + 120, // еще ближе к центру
      y: centerY
    });
    
    for (let i = 0; i < GAME_CONFIG.pucksPerPlayer; i++) {
      const pos = redPucks[i];
      const puck = {
        id: `red-${i}`,
        color: 'red',
        x: pos.x,
        y: pos.y,
        vx: 0,
        vy: 0,
        radius: puckRadius,
        mass: GAME_CONFIG.puckMass
      };
      gameState.pucks.push(puck);
      createPuckElement(puck);
    }
    
    // Создаем синие шайбы (правая сторона) треугольником
    // Расположение: 3 у борта, 2 в середине, 1 ближе к центру (вершина к центру)
    const bluePucks = [];
    
    // Латеральный столбец (3 шайбы) - у правого борта
    for (let i = 0; i < 3; i++) {
      bluePucks.push({
        x: gameState.fieldWidth - puckRadius - 10, // у самого борта
        y: centerY + (i - 1) * (puckDiameter + 5) // центрируем по вертикали
      });
    }
    
    // Средний столбец (2 шайбы) - ближе к центру
    for (let i = 0; i < 2; i++) {
      bluePucks.push({
        x: gameState.fieldWidth - puckRadius - 10 - 60, // смещаем от борта
        y: centerY + (i - 0.5) * (puckDiameter + 5) // центрируем по вертикали
      });
    }
    
    // Медиальный столбец (1 шайба) - ближе всего к центру
    bluePucks.push({
      x: gameState.fieldWidth - puckRadius - 10 - 120, // еще ближе к центру
      y: centerY
    });
    
    for (let i = 0; i < GAME_CONFIG.pucksPerPlayer; i++) {
      const pos = bluePucks[i];
      const puck = {
        id: `blue-${i}`,
        color: 'blue',
        x: pos.x,
        y: pos.y,
        vx: 0,
        vy: 0,
        radius: puckRadius,
        mass: GAME_CONFIG.puckMass
      };
      gameState.pucks.push(puck);
      createPuckElement(puck);
    }
    
    updatePuckCount();
  }

  function createPuckElement(puck) {
    const puckElement = document.createElement('div');
    puckElement.className = `puck ${puck.color}`;
    puckElement.id = puck.id;
    puckElement.style.width = `${puck.radius * 2}px`;
    puckElement.style.height = `${puck.radius * 2}px`;
    puckElement.style.left = `${puck.x - puck.radius}px`;
    puckElement.style.top = `${puck.y - puck.radius}px`;
    
    // Добавление изображения в шар, если путь указан
    const imagePath = puck.color === 'red' ? PUCK_IMAGE_RED : PUCK_IMAGE_BLUE;
    if (imagePath) {
      const img = document.createElement('img');
      img.className = 'puck-image';
      img.src = imagePath;
      img.onload = () => {
        puckElement.style.background = 'transparent';
        console.log(`Изображение для ${puck.color} шара загружено`);
      };
      img.onerror = () => {
        console.error(`Ошибка загрузки изображения для ${puck.color} шара:`, imagePath);
      };
      puckElement.appendChild(img);
    }
    
    if (gameField) {
      gameField.appendChild(puckElement);
    }
  }

  function setupTouchControls() {
    if (!gameField) return;
    
    // Touch события
    gameField.addEventListener('touchstart', handleTouchStart, { passive: false });
    gameField.addEventListener('touchmove', handleTouchMove, { passive: false });
    gameField.addEventListener('touchend', handleTouchEnd, { passive: false });
    gameField.addEventListener('touchcancel', handleTouchEnd, { passive: false });
    
    // Mouse события для тестирования
    gameField.addEventListener('mousedown', handleMouseDown);
    gameField.addEventListener('mousemove', handleMouseMove);
    gameField.addEventListener('mouseup', handleMouseUp);
  }

  function handleTouchStart(e) {
    e.preventDefault();
    const rect = gameField.getBoundingClientRect();
    
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      const touchX = touch.clientX - rect.left;
      const touchY = touch.clientY - rect.top;
      
      // Находим шайбу под пальцем
      const puck = findPuckAtPosition(touchX, touchY);
      // Проверяем, что касание не обрабатывается и шайба не захвачена другим касанием
      if (puck && !gameState.activeTouches.has(touch.identifier) && !gameState.draggedPucks.has(puck.id)) {
        gameState.activeTouches.set(touch.identifier, puck.id);
        const now = Date.now();
        gameState.draggedPucks.set(puck.id, {
          startX: puck.x,
          startY: puck.y,
          touchX: touchX,
          touchY: touchY,
          history: [{ x: touchX, y: touchY, time: now }] // История позиций с временными метками
        });
        
        // Останавливаем шайбу
        puck.vx = 0;
        puck.vy = 0;
        
        // Добавляем класс для визуального эффекта
        const puckElement = document.getElementById(puck.id);
        if (puckElement) puckElement.classList.add('dragging');
        
        // В прицельном режиме создаем стрелку
        if (gameState.controlMode === 'aim') {
          createAimArrow(puck.id, puck.x, puck.y);
        }
      }
    }
  }

  function handleTouchMove(e) {
    e.preventDefault();
    const rect = gameField.getBoundingClientRect();
    
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      const puckId = gameState.activeTouches.get(touch.identifier);
      
      if (puckId) {
        const puck = gameState.pucks.find(p => p.id === puckId);
        const dragData = gameState.draggedPucks.get(puckId);
        
        if (puck && dragData) {
          const touchX = touch.clientX - rect.left;
          const touchY = touch.clientY - rect.top;
          
          if (gameState.controlMode === 'direct') {
            // Прямой режим - перемещаем шайбу
            puck.x = touchX;
            puck.y = touchY;
            
            // Ограничиваем позицию границами поля
            puck.x = Math.max(puck.radius, Math.min(gameState.fieldWidth - puck.radius, puck.x));
            puck.y = Math.max(puck.radius, Math.min(gameState.fieldHeight - puck.radius, puck.y));
            
            // Обновляем touchX и touchY для расчета скорости при отпускании
            dragData.touchX = touchX;
            dragData.touchY = touchY;
            
            // Добавляем позицию в историю для расчета скорости
            const now = Date.now();
            dragData.history.push({ x: touchX, y: touchY, time: now });
            
            // Ограничиваем историю последними 200ms (для оптимизации)
            const maxHistoryTime = 200;
            dragData.history = dragData.history.filter(point => now - point.time <= maxHistoryTime);
          } else if (gameState.controlMode === 'aim') {
            // Прицельный режим - обновляем стрелку
            updateAimArrow(puckId, puck.x, puck.y, touchX, touchY);
          }
        }
      }
    }
  }

  function handleTouchEnd(e) {
    e.preventDefault();
    
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      const puckId = gameState.activeTouches.get(touch.identifier);
      
      if (puckId) {
        const puck = gameState.pucks.find(p => p.id === puckId);
        const dragData = gameState.draggedPucks.get(puckId);
        
        if (puck && dragData) {
          const rect = gameField.getBoundingClientRect();
          const touchX = touch.clientX - rect.left;
          const touchY = touch.clientY - rect.top;
          
          if (gameState.controlMode === 'direct') {
            // Прямой режим - вычисляем скорость на основе истории движения
            const now = Date.now();
            const history = dragData.history || [];
            
            // Добавляем текущую позицию в историю
            history.push({ x: touchX, y: touchY, time: now });
            
            // Фильтруем историю за последние 150ms
            const timeWindow = 150;
            const recentHistory = history.filter(point => now - point.time <= timeWindow);
            
            if (recentHistory.length >= 2) {
              // Вычисляем среднюю скорость на основе нескольких точек
              const firstPoint = recentHistory[0];
              const lastPoint = recentHistory[recentHistory.length - 1];
              const timeDelta = (lastPoint.time - firstPoint.time) || 1; // Избегаем деления на 0
              
              const dx = lastPoint.x - firstPoint.x;
              const dy = lastPoint.y - firstPoint.y;
              
              // Конвертируем пиксели в скорость (пиксели за кадр при 60 FPS)
              // timeDelta в миллисекундах, нужно перевести в кадры (16.67ms на кадр)
              const frames = timeDelta / 16.67;
              const speedMultiplier = 0.8; // Коэффициент для регулировки силы броска
              
              puck.vx = (dx / frames) * speedMultiplier;
              puck.vy = (dy / frames) * speedMultiplier;
            } else {
              // Если истории недостаточно, используем простой расчет
              const dx = touchX - dragData.touchX;
              const dy = touchY - dragData.touchY;
              puck.vx = dx * 0.5;
              puck.vy = dy * 0.5;
            }
          } else if (gameState.controlMode === 'aim') {
            // Прицельный режим - запускаем шайбу в направлении стрелки
            const dx = touchX - dragData.startX;
            const dy = touchY - dragData.startY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance > 5) {
              // Ограничиваем дистанцию максимальной длиной стрелки
              const clampedDistance = Math.min(distance, GAME_CONFIG.maxAimDistance);
              const power = clampedDistance / GAME_CONFIG.maxAimDistance; // 0 до 1
              
              // Направление от центра шайбы к точке касания
              const dirX = dx / distance;
              const dirY = dy / distance;
              
              // Максимальная скорость для прицельного режима
              const maxSpeed = 25;
              puck.vx = dirX * maxSpeed * power;
              puck.vy = dirY * maxSpeed * power;
            }
          }
          
          // Ограничиваем максимальную скорость
          const maxSpeed = 25;
          const speed = Math.sqrt(puck.vx * puck.vx + puck.vy * puck.vy);
          if (speed > maxSpeed) {
            puck.vx = (puck.vx / speed) * maxSpeed;
            puck.vy = (puck.vy / speed) * maxSpeed;
          }
        }
        
        // Убираем визуальный эффект
        const puckElement = document.getElementById(puckId);
        if (puckElement) puckElement.classList.remove('dragging');
        
        // Удаляем стрелку в прицельном режиме
        if (gameState.controlMode === 'aim') {
          removeAimArrow(puckId);
        }
        
        gameState.activeTouches.delete(touch.identifier);
        gameState.draggedPucks.delete(puckId);
      }
    }
  }

  // Mouse обработчики для тестирования
  let currentMousePuck = null;
  let mouseStartPos = { x: 0, y: 0 };
  let mouseHistory = [];

  function handleMouseDown(e) {
    const rect = gameField.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    const puck = findPuckAtPosition(mouseX, mouseY);
    if (puck && !gameState.draggedPucks.has(puck.id)) {
      currentMousePuck = puck;
      mouseStartPos = { x: puck.x, y: puck.y };
      const now = Date.now();
      mouseHistory = [{ x: mouseX, y: mouseY, time: now }];
      puck.vx = 0;
      puck.vy = 0;
      
      const puckElement = document.getElementById(puck.id);
      if (puckElement) puckElement.classList.add('dragging');
      
      // В прицельном режиме создаем стрелку
      if (gameState.controlMode === 'aim') {
        createAimArrow(puck.id, puck.x, puck.y);
      }
    }
  }

  function handleMouseMove(e) {
    if (currentMousePuck) {
      const rect = gameField.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      
      if (gameState.controlMode === 'direct') {
        // Прямой режим - перемещаем шайбу
        currentMousePuck.x = mouseX;
        currentMousePuck.y = mouseY;
        
        // Ограничиваем позицию границами поля
        currentMousePuck.x = Math.max(currentMousePuck.radius, Math.min(gameState.fieldWidth - currentMousePuck.radius, currentMousePuck.x));
        currentMousePuck.y = Math.max(currentMousePuck.radius, Math.min(gameState.fieldHeight - currentMousePuck.radius, currentMousePuck.y));
        
        // Добавляем позицию в историю
        const now = Date.now();
        mouseHistory.push({ x: mouseX, y: mouseY, time: now });
        
        // Ограничиваем историю последними 200ms
        const maxHistoryTime = 200;
        mouseHistory = mouseHistory.filter(point => now - point.time <= maxHistoryTime);
      } else if (gameState.controlMode === 'aim') {
        // Прицельный режим - обновляем стрелку
        updateAimArrow(currentMousePuck.id, currentMousePuck.x, currentMousePuck.y, mouseX, mouseY);
      }
    }
  }

  function handleMouseUp(e) {
    if (currentMousePuck) {
      const rect = gameField.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      
      if (gameState.controlMode === 'direct') {
        // Прямой режим - вычисляем скорость на основе истории движения
        const now = Date.now();
        mouseHistory.push({ x: mouseX, y: mouseY, time: now });
        
        // Фильтруем историю за последние 150ms
        const timeWindow = 150;
        const recentHistory = mouseHistory.filter(point => now - point.time <= timeWindow);
        
        if (recentHistory.length >= 2) {
          const firstPoint = recentHistory[0];
          const lastPoint = recentHistory[recentHistory.length - 1];
          const timeDelta = (lastPoint.time - firstPoint.time) || 1;
          
          const dx = lastPoint.x - firstPoint.x;
          const dy = lastPoint.y - firstPoint.y;
          
          const frames = timeDelta / 16.67;
          const speedMultiplier = 0.8;
          
          currentMousePuck.vx = (dx / frames) * speedMultiplier;
          currentMousePuck.vy = (dy / frames) * speedMultiplier;
        } else {
          // Если истории недостаточно, используем простой расчет
          const dx = mouseX - currentMousePuck.x;
          const dy = mouseY - currentMousePuck.y;
          currentMousePuck.vx = dx * 0.5;
          currentMousePuck.vy = dy * 0.5;
        }
      } else if (gameState.controlMode === 'aim') {
        // Прицельный режим
        const dx = mouseX - mouseStartPos.x;
        const dy = mouseY - mouseStartPos.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > 5) {
          const clampedDistance = Math.min(distance, GAME_CONFIG.maxAimDistance);
          const power = clampedDistance / GAME_CONFIG.maxAimDistance;
          
          const dirX = dx / distance;
          const dirY = dy / distance;
          
          const maxSpeed = 25;
          currentMousePuck.vx = dirX * maxSpeed * power;
          currentMousePuck.vy = dirY * maxSpeed * power;
        }
      }
      
      // Ограничиваем максимальную скорость
      const maxSpeed = 25;
      const speed = Math.sqrt(currentMousePuck.vx * currentMousePuck.vx + currentMousePuck.vy * currentMousePuck.vy);
      if (speed > maxSpeed) {
        currentMousePuck.vx = (currentMousePuck.vx / speed) * maxSpeed;
        currentMousePuck.vy = (currentMousePuck.vy / speed) * maxSpeed;
      }
      
      const puckElement = document.getElementById(currentMousePuck.id);
      if (puckElement) puckElement.classList.remove('dragging');
      
      // Удаляем стрелку в прицельном режиме
      if (gameState.controlMode === 'aim') {
        removeAimArrow(currentMousePuck.id);
      }
      
      currentMousePuck = null;
    }
  }
  
  // ФУНКЦИИ ДЛЯ ТРЕУГОЛЬНИКА ПРИЦЕЛИВАНИЯ
  function createAimArrow(puckId, startX, startY) {
    // Удаляем существующий треугольник если он есть
    removeAimArrow(puckId);
    
    // Создаем SVG элемент
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.id = `arrow-${puckId}`;
    svg.classList.add('aim-triangle');
    svg.style.left = `${startX}px`;
    svg.style.top = `${startY}px`;
    svg.style.overflow = 'visible';
    
    // Создаем градиент для круглой ауры
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    const radialGradient = document.createElementNS('http://www.w3.org/2000/svg', 'radialGradient');
    radialGradient.id = `auraGradient-${puckId}`;
    radialGradient.setAttribute('cx', '50%');
    radialGradient.setAttribute('cy', '50%');
    radialGradient.setAttribute('r', '50%');
    
    // Зеленый в центре
    const stop1 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
    stop1.setAttribute('offset', '0%');
    stop1.setAttribute('stop-color', '#22c55e');
    stop1.setAttribute('stop-opacity', '0.8');
    
    // Желтый в середине
    const stop2 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
    stop2.setAttribute('offset', '50%');
    stop2.setAttribute('stop-color', '#eab308');
    stop2.setAttribute('stop-opacity', '0.8');
    
    // Красный по краям
    const stop3 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
    stop3.setAttribute('offset', '100%');
    stop3.setAttribute('stop-color', '#ef4444');
    stop3.setAttribute('stop-opacity', '0.8');
    
    radialGradient.appendChild(stop1);
    radialGradient.appendChild(stop2);
    radialGradient.appendChild(stop3);
    defs.appendChild(radialGradient);
    
    // Создаем круглую ауру (видна только в области треугольника)
    const auraCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    auraCircle.setAttribute('r', GAME_CONFIG.maxAimDistance); // радиус ауры = максимальная высота треугольника
    auraCircle.setAttribute('fill', `url(#auraGradient-${puckId})`);
    auraCircle.setAttribute('cx', '0');
    auraCircle.setAttribute('cy', '0');
    
    // Создаем треугольник (без заливки, только обводка)
    const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
    polygon.setAttribute('fill', 'none');
    polygon.setAttribute('stroke', 'rgba(0, 0, 0, 0.3)');
    polygon.setAttribute('stroke-width', '2');
    
    // Создаем маску для ауры (чтобы она была видна только в области треугольника)
    const mask = document.createElementNS('http://www.w3.org/2000/svg', 'mask');
    mask.id = `triangleMask-${puckId}`;
    
    const maskRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    maskRect.setAttribute('width', '100%');
    maskRect.setAttribute('height', '100%');
    maskRect.setAttribute('fill', 'black');
    
    const maskPolygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
    maskPolygon.setAttribute('fill', 'white');
    
    mask.appendChild(maskRect);
    mask.appendChild(maskPolygon);
    defs.appendChild(mask);
    
    // Применяем маску к ауре
    auraCircle.setAttribute('mask', `url(#triangleMask-${puckId})`);
    
    svg.appendChild(defs);
    svg.appendChild(auraCircle);
    svg.appendChild(polygon);
    
    if (gameField) {
      gameField.appendChild(svg);
      gameState.aimArrows.set(puckId, svg);
    }
  }
  
  function updateAimArrow(puckId, startX, startY, endX, endY) {
    const svg = gameState.aimArrows.get(puckId);
    if (!svg) return;
    
    const dx = endX - startX;
    const dy = endY - startY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance < 1) return;
    
    // Ограничиваем длину
    const clampedDistance = Math.min(distance, GAME_CONFIG.maxAimDistance);
    
    // Вычисляем ширину основания при максимальной высоте
    // При maxAimDistance (300px) основание = диаметр шайбы (60px)
    const puckDiameter = GAME_CONFIG.puckRadius * 2;
    const baseWidthAtMax = puckDiameter;
    
    // Пропорционально уменьшаем ширину основания при меньшей высоте
    const baseWidth = (clampedDistance / GAME_CONFIG.maxAimDistance) * baseWidthAtMax;
    const halfBase = baseWidth / 2;
    
    // Вычисляем угол направления
    const angle = Math.atan2(dy, dx);
    
    // Координаты треугольника (вершина в центре (0,0))
    // Точка 1: вершина (в центре шайбы)
    const p1x = 0;
    const p1y = 0;
    
    // Точка 2: левый угол основания
    const p2x = Math.cos(angle) * clampedDistance - Math.sin(angle) * halfBase;
    const p2y = Math.sin(angle) * clampedDistance + Math.cos(angle) * halfBase;
    
    // Точка 3: правый угол основания
    const p3x = Math.cos(angle) * clampedDistance + Math.sin(angle) * halfBase;
    const p3y = Math.sin(angle) * clampedDistance - Math.cos(angle) * halfBase;
    
     // Обновляем polygon
     const polygon = svg.querySelector('polygon');
     if (polygon) {
       polygon.setAttribute('points', `${p1x},${p1y} ${p2x},${p2y} ${p3x},${p3y}`);
       
       // Обновляем маску для ауры
       const maskPolygon = svg.querySelector('mask polygon');
       if (maskPolygon) {
         maskPolygon.setAttribute('points', `${p1x},${p1y} ${p2x},${p2y} ${p3x},${p3y}`);
       }
       
       // Обновляем позицию ауры (центр в вершине треугольника)
       const auraCircle = svg.querySelector('circle');
       if (auraCircle) {
         auraCircle.setAttribute('cx', `${p1x}`);
         auraCircle.setAttribute('cy', `${p1y}`);
       }
     }
    
    // Вычисляем границы для viewBox
    const minX = Math.min(p1x, p2x, p3x);
    const minY = Math.min(p1y, p2y, p3y);
    const maxX = Math.max(p1x, p2x, p3x);
    const maxY = Math.max(p1y, p2y, p3y);
    
    const padding = 5;
    const viewBoxWidth = maxX - minX + padding * 2;
    const viewBoxHeight = maxY - minY + padding * 2;
    
    // Устанавливаем viewBox с центром в (0,0) - вершине треугольника
    svg.setAttribute('viewBox', `${minX - padding} ${minY - padding} ${viewBoxWidth} ${viewBoxHeight}`);
    svg.setAttribute('width', `${viewBoxWidth}`);
    svg.setAttribute('height', `${viewBoxHeight}`);
    
    // Корректируем позицию SVG так, чтобы точка (0,0) была в центре шайбы
    svg.style.left = `${startX + minX - padding}px`;
    svg.style.top = `${startY + minY - padding}px`;
  }
  
  function removeAimArrow(puckId) {
    const arrow = gameState.aimArrows.get(puckId);
    if (arrow) {
      arrow.remove();
      gameState.aimArrows.delete(puckId);
    }
  }

  function findPuckAtPosition(x, y) {
    for (let i = gameState.pucks.length - 1; i >= 0; i--) {
      const puck = gameState.pucks[i];
      const dx = x - puck.x;
      const dy = y - puck.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance <= puck.radius) {
        return puck;
      }
    }
    return null;
  }

  // ФИЗИКА
  function startGameLoop() {
    gameState.gameLoop = setInterval(() => {
      updatePhysics();
      updateDisplay();
      checkWinCondition();
    }, 16); // ~60 FPS
  }

  function updatePhysics() {
    // Обновляем позиции всех шайб
    for (let puck of gameState.pucks) {
      // Пропускаем перетаскиваемые шайбы
      if (gameState.draggedPucks.has(puck.id)) continue;
      
      // Применяем трение
      puck.vx *= GAME_CONFIG.friction;
      puck.vy *= GAME_CONFIG.friction;
      
      // Останавливаем очень медленные шайбы
      if (Math.abs(puck.vx) < GAME_CONFIG.minVelocity) puck.vx = 0;
      if (Math.abs(puck.vy) < GAME_CONFIG.minVelocity) puck.vy = 0;
      
      // Обновляем позицию
      puck.x += puck.vx;
      puck.y += puck.vy;
    }
    
    // Проверяем столкновения со стенами
    for (let puck of gameState.pucks) {
      checkWallCollision(puck);
    }
    
    // Проверяем столкновения между шайбами
    for (let i = 0; i < gameState.pucks.length; i++) {
      for (let j = i + 1; j < gameState.pucks.length; j++) {
        checkPuckCollision(gameState.pucks[i], gameState.pucks[j]);
      }
    }
    
    // Обновляем визуальные элементы
    for (let puck of gameState.pucks) {
      const puckElement = document.getElementById(puck.id);
      if (puckElement) {
        puckElement.style.left = `${puck.x - puck.radius}px`;
        puckElement.style.top = `${puck.y - puck.radius}px`;
      }
    }
  }

  function checkWallCollision(puck) {
    const centerX = gameState.fieldWidth / 2;
    const gateTop = gameState.fieldHeight / 2 - GAME_CONFIG.gateSize / 2;
    const gateBottom = gameState.fieldHeight / 2 + GAME_CONFIG.gateSize / 2;
    
    // Проверка левой и правой стен
    if (puck.x - puck.radius < 0) {
      puck.x = puck.radius;
      puck.vx = Math.abs(puck.vx) * GAME_CONFIG.wallRestitution;
    } else if (puck.x + puck.radius > gameState.fieldWidth) {
      puck.x = gameState.fieldWidth - puck.radius;
      puck.vx = -Math.abs(puck.vx) * GAME_CONFIG.wallRestitution;
    }
    
    // Проверка верхней и нижней стен
    if (puck.y - puck.radius < 0) {
      puck.y = puck.radius;
      puck.vy = Math.abs(puck.vy) * GAME_CONFIG.wallRestitution;
    } else if (puck.y + puck.radius > gameState.fieldHeight) {
      puck.y = gameState.fieldHeight - puck.radius;
      puck.vy = -Math.abs(puck.vy) * GAME_CONFIG.wallRestitution;
    }
    
    // Проверка центральной стены (с учетом ворот)
    const wallThickness = 8;
    const wallLeft = centerX - wallThickness / 2;
    const wallRight = centerX + wallThickness / 2;
    
    // Проверяем пересечение с центральной стеной
    if (puck.x + puck.radius > wallLeft && puck.x - puck.radius < wallRight) {
      // Проверяем, не в воротах ли шайба
      if (puck.y < gateTop || puck.y > gateBottom) {
        // Столкновение со стеной (не с воротами)
        if (puck.vx > 0) {
          // Движется вправо
          puck.x = wallLeft - puck.radius;
          puck.vx = -Math.abs(puck.vx) * GAME_CONFIG.wallRestitution;
        } else if (puck.vx < 0) {
          // Движется влево
          puck.x = wallRight + puck.radius;
          puck.vx = Math.abs(puck.vx) * GAME_CONFIG.wallRestitution;
        }
      }
    }
  }

  function checkPuckCollision(puck1, puck2) {
    const dx = puck2.x - puck1.x;
    const dy = puck2.y - puck1.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const minDistance = puck1.radius + puck2.radius;
    
    if (distance < minDistance && distance > 0) {
      // Нормализуем вектор столкновения
      const nx = dx / distance;
      const ny = dy / distance;
      
      // Разделяем шайбы, чтобы они не перекрывались
      const overlap = minDistance - distance;
      const separationX = nx * overlap / 2;
      const separationY = ny * overlap / 2;
      
      puck1.x -= separationX;
      puck1.y -= separationY;
      puck2.x += separationX;
      puck2.y += separationY;
      
      // Вычисляем относительную скорость
      const dvx = puck2.vx - puck1.vx;
      const dvy = puck2.vy - puck1.vy;
      
      // Скорость вдоль линии столкновения
      const dvn = dvx * nx + dvy * ny;
      
      // Проверяем, движутся ли шайбы навстречу друг другу
      if (dvn < 0) {
        // Упругое столкновение с учетом масс
        const m1 = puck1.mass;
        const m2 = puck2.mass;
        const impulse = (2 * dvn) / (m1 + m2);
        
        puck1.vx += impulse * m2 * nx * GAME_CONFIG.puckRestitution;
        puck1.vy += impulse * m2 * ny * GAME_CONFIG.puckRestitution;
        puck2.vx -= impulse * m1 * nx * GAME_CONFIG.puckRestitution;
        puck2.vy -= impulse * m1 * ny * GAME_CONFIG.puckRestitution;
        
        // Визуальный эффект столкновения
        const puckElement1 = document.getElementById(puck1.id);
        const puckElement2 = document.getElementById(puck2.id);
        if (puckElement1) {
          puckElement1.classList.add('puck-collision');
          setTimeout(() => puckElement1.classList.remove('puck-collision'), 200);
        }
        if (puckElement2) {
          puckElement2.classList.add('puck-collision');
          setTimeout(() => puckElement2.classList.remove('puck-collision'), 200);
        }
      }
    }
  }

  function checkWinCondition() {
    const centerX = gameState.fieldWidth / 2;
    
    let leftSidePucks = 0;
    let rightSidePucks = 0;
    
    for (let puck of gameState.pucks) {
      if (puck.x < centerX) {
        leftSidePucks++;
      } else {
        rightSidePucks++;
      }
    }
    
    // Игра заканчивается, когда на одной из половин не осталось ни одной шайбы
    // Побеждает игрок, на чьей территории не осталось шайб
    if (leftSidePucks === 0 && rightSidePucks > 0) {
      endGame('Красный'); // На территории красного нет шайб - красный победил
    } else if (rightSidePucks === 0 && leftSidePucks > 0) {
      endGame('Синий'); // На территории синего нет шайб - синий победил
    }
  }

  function updatePuckCount() {
    const centerX = gameState.fieldWidth / 2;
    
    let leftSidePucks = 0;
    let rightSidePucks = 0;
    
    for (let puck of gameState.pucks) {
      if (puck.x < centerX) {
        leftSidePucks++;
      } else {
        rightSidePucks++;
      }
    }
    
    const scoreText = `Красный: ${leftSidePucks} | Синий: ${rightSidePucks}`;
    const scoreLeft = document.getElementById('scoreLeft');
    const scoreRight = document.getElementById('scoreRight');
    if (scoreLeft) scoreLeft.textContent = scoreText;
    if (scoreRight) scoreRight.textContent = scoreText;
  }

  function updateDisplay() {
    updatePuckCount();
  }

  function endGame(winner) {
    gameState.isPlaying = false;
    
    if (gameState.gameLoop) {
      clearInterval(gameState.gameLoop);
      gameState.gameLoop = null;
    }
    
    // Останавливаем все шайбы
    for (let puck of gameState.pucks) {
      puck.vx = 0;
      puck.vy = 0;
    }
    
    // Показываем модальное окно
    const modalBackdrop = document.getElementById('modalBackdrop');
    const modalTitle = document.getElementById('modalTitle');
    const modalSubtitle = document.getElementById('modalSubtitle');
    
    if (modalBackdrop && modalTitle && modalSubtitle) {
      modalTitle.textContent = `Победил ${winner} игрок!`;
      modalSubtitle.textContent = 'Поздравляем с победой!';
      modalBackdrop.hidden = false;
    }
  }

  function resetGame() {
    // Останавливаем игровой цикл
    if (gameState.gameLoop) {
      clearInterval(gameState.gameLoop);
      gameState.gameLoop = null;
    }
    
    // Очищаем касания
    gameState.activeTouches.clear();
    gameState.draggedPucks.clear();
    
    // Удаляем все стрелки прицеливания
    gameState.aimArrows.forEach(arrow => arrow.remove());
    gameState.aimArrows.clear();
    
    // Скрываем модальное окно результатов
    const modalBackdrop = document.getElementById('modalBackdrop');
    if (modalBackdrop) modalBackdrop.hidden = true;
    
    // Показываем модальное окно выбора режима
    showControlModeModal();
  }

  // ЗАПУСК ИГРЫ
  document.addEventListener('DOMContentLoaded', initGame);
  
  // ГЛОБАЛЬНАЯ ФУНКЦИЯ ДЛЯ НАВИГАЦИИ
  window.goToMenu = () => {
    window.location.href = '../../index.html';
  };
})();


