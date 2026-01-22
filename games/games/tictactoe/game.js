(() => {
  const boardEl = document.getElementById('board');
  const modalBackdrop = document.getElementById('modalBackdrop');
  const modalTitle = document.getElementById('modalTitle');
  const modalSubtitle = document.getElementById('modalSubtitle');

  // HUD labels
  const turnLabelLeft = document.getElementById('turnLabelLeft');
  const turnLabelRight = document.getElementById('turnLabelRight');

  const scoreLeftEl = document.getElementById('scoreLeft');
  const scoreRightEl = document.getElementById('scoreRight');

  // Buttons (both HUDs)
  const btnNewLeft = document.getElementById('btnNewLeft');
  const btnNewRight = document.getElementById('btnNewRight');
  const btnBackLeft = document.getElementById('btnBackLeft');
  const btnBackRight = document.getElementById('btnBackRight');
  const btnRematch = document.getElementById('btnRematch');
  const btnToMenu = document.getElementById('btnToMenu');

  // State
  const state = {
    board: Array(9).fill(null),    // 'X' | 'O' | null
    phase: 'place',                // 'place' | 'move'
    turn: 'X',                     // 'X' | 'O'
    placed: { X: 0, O: 0 },
    order: { X: [], O: [] },       // FIFO order of pieces
    nextIndex: { X: 0, O: 0 },     // which piece must move in move-phase
    score: { X: 0, O: 0 },
    gameOver: false
  };

  const wins = [
    [0,1,2],[3,4,5],[6,7,8],
    [0,3,6],[1,4,7],[2,5,8],
    [0,4,8],[2,4,6]
  ];

  function svgMark(type){
    const sw = 14; // stroke width in 0..100 viewBox units
    if(type === 'X'){
      return `<svg viewBox="0 0 100 100" aria-hidden="true">
        <line x1="15" y1="15" x2="85" y2="85" stroke-width="${sw}"></line>
        <line x1="85" y1="15" x2="15" y2="85" stroke-width="${sw}"></line>
      </svg>`;
    }else if(type === 'O'){
      return `<svg viewBox="0 0 100 100" aria-hidden="true">
        <circle cx="50" cy="50" r="35" stroke-width="${sw}"></circle>
      </svg>`;
    }
    return '';
  }

  function renderBoard(){
    boardEl.innerHTML = '';
    for(let i=0;i<9;i++){
      const cell = document.createElement('button');
      cell.className = 'cell';
      cell.setAttribute('role','gridcell');
      cell.setAttribute('aria-label', `Клетка ${i+1}`);
      cell.dataset.index = i;

      const mark = document.createElement('span');
      mark.className = 'mark';
      const v = state.board[i];
      if(v === 'X'){
        mark.classList.add('x','show');
        mark.innerHTML = svgMark('X');
      } else if(v === 'O'){
        mark.classList.add('o','show');
        mark.innerHTML = svgMark('O');
      }
      cell.appendChild(mark);

      cell.addEventListener('click', onCellClick);
      cell.addEventListener('touchstart', onCellClick, { passive: true });
      boardEl.appendChild(cell);
    }
    updateHUD();
    showHighlights();
  }

  function updateHUD(){
    const turnText = `Ход ${state.turn}`;
    if (turnLabelLeft) turnLabelLeft.textContent = turnText;
    if (turnLabelRight) turnLabelRight.textContent = turnText;

    const wins1 = state.score.X; // Игрок 1 (X)
    const wins2 = state.score.O; // Игрок 2 (O)
    if (scoreLeftEl) scoreLeftEl.textContent = `Победы: ${wins1} – ${wins2}`;
    if (scoreRightEl) scoreRightEl.textContent = `Победы: ${wins2} – ${wins1}`;
  }

  function emptyCells(){
    const list = [];
    for(let i=0;i<9;i++) if(state.board[i] === null) list.push(i);
    return list;
  }

  function cellEl(idx){ return boardEl.querySelector(`.cell[data-index="${idx}"]`); }

  function clearHighlights(){ boardEl.querySelectorAll('.cell.highlight').forEach(el => el.classList.remove('highlight')); }

  function showHighlights(){
    clearHighlights();
    if(state.gameOver) return;
    if(state.phase === 'place'){
      emptyCells().forEach(i => cellEl(i).classList.add('highlight'));
    }else{
      const fifo = state.order[state.turn];
      if(fifo.length < 3){
        emptyCells().forEach(i => cellEl(i).classList.add('highlight'));
        return;
      }
      emptyCells().forEach(i => cellEl(i).classList.add('highlight'));
    }
  }

  function onCellClick(e){
    if(state.gameOver) return;
    const idx = Number(e.currentTarget.dataset.index);
    if(state.phase === 'place'){
      handlePlace(idx);
    }else{
      handleMove(idx);
    }
  }

  function handlePlace(idx){
    if(state.board[idx] !== null) return;
    const t = state.turn;
    placeMark(t, idx);
    if(checkWin(t)){ endGame(`${t}`); return; }
    if(state.placed.X >= 3 && state.placed.O >= 3){ state.phase = 'move'; }
    switchTurn();
  }

  function handleMove(destinationIdx){
    const t = state.turn;
    if(state.board[destinationIdx] !== null) return;
    const fifo = state.order[t];
    if(fifo.length < 3){ handlePlace(destinationIdx); return; }
    const movePointer = state.nextIndex[t] % 3;
    const sourceIdx = fifo[movePointer];
    state.board[sourceIdx] = null; updateCell(sourceIdx);
    state.board[destinationIdx] = t; updateCell(destinationIdx);
    fifo[movePointer] = destinationIdx;
    state.nextIndex[t] = (state.nextIndex[t] + 1) % 3;
    if(checkWin(t)){ endGame(`${t}`); return; }
    switchTurn();
  }

  function placeMark(t, idx){
    state.board[idx] = t;
    updateCell(idx);
    state.placed[t] += 1;
    state.order[t].push(idx);
    if(state.order[t].length > 3){ state.order[t].shift(); }
  }

  function updateCell(idx){
    const el = cellEl(idx);
    if(!el) return;
    const mark = el.querySelector('.mark');
    mark.className = 'mark';
    if(state.board[idx] === 'X'){
      mark.classList.add('x','show'); mark.innerHTML = svgMark('X');
    } else if(state.board[idx] === 'O'){
      mark.classList.add('o','show'); mark.innerHTML = svgMark('O');
    } else {
      mark.innerHTML = '';
    }
    showHighlights();
  }

  function switchTurn(){
    state.turn = state.turn === 'X' ? 'O' : 'X';
    updateHUD();
    showHighlights();
  }

  function checkWin(t){
    for(const line of wins){
      const [a,b,c] = line;
      if(state.board[a]===t && state.board[b]===t && state.board[c]===t){
        return true;
      }
    }
    if(emptyCells().length === 0 && state.phase === 'place'){
      endGame(null);
      return false;
    }
    return false;
  }

  function endGame(winner){
    state.gameOver = true;
    if(winner === 'X') state.score.X += 1;
    if(winner === 'O') state.score.O += 1;
    updateHUD();
    openModal(winner);
  }

  function openModal(winner){
    if(winner){
      modalTitle.textContent = `Победил ${winner}`;
      modalSubtitle.textContent = `Три в ряд`;
    }else{
      modalTitle.textContent = `Ничья`;
      modalSubtitle.textContent = `Ходов больше нет`;
    }
    modalBackdrop.hidden = false;
  }
  function closeModal(){ modalBackdrop.hidden = true; }

  const MENU_URL = "../../index.html";

  [btnNewLeft, btnNewRight].filter(Boolean).forEach(b => b.addEventListener('click', () => resetBoard(true)));
  [btnBackLeft, btnBackRight].filter(Boolean).forEach(b => b.addEventListener('click', () => { try{ window.location.href = MENU_URL; }catch(e){ history.back(); } }));
  btnRematch && btnRematch.addEventListener('click', () => { closeModal(); resetBoard(true); });
  btnToMenu && btnToMenu.addEventListener('click', () => { try{ window.location.href = MENU_URL; }catch(e){ closeModal(); history.back(); } });

  function resetBoard(keepScore=true){
    state.board = Array(9).fill(null);
    state.phase = 'place';
    state.turn = 'X';
    state.placed = { X:0, O:0 };
    state.order = { X:[], O:[] };
    state.nextIndex = { X:0, O:0 };
    state.gameOver = false;
    if(!keepScore) state.score = { X:0, O:0 };
    renderBoard();
  }

  renderBoard();
})();