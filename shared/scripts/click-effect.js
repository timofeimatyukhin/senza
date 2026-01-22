document.addEventListener('DOMContentLoaded', function() {
  
  function showTap(x, y) {
    var circle = document.createElement('div');
    circle.className = 'tap-circle';
    circle.style.left = x + 'px';
    circle.style.top = y + 'px';
    document.body.appendChild(circle);
    
    setTimeout(function() {
      circle.remove();
    }, 300);
  }
  
  // pointerdown в фазе capture — перехватывает ДО preventDefault в играх
  document.addEventListener('pointerdown', function(e) {
    showTap(e.clientX, e.clientY);
  }, true);

  // Добавим временное визуальное уменьшение для интерактивных элементов
  // чтобы после тапа элемент возвращался к исходному состоянию.
  document.addEventListener('pointerdown', function(e) {
    try {
      const selector = '.player-btn, .control-btn, .btn, .hud-check-btn, .difficulty-option, .field-cell';
      const el = e.target.closest ? e.target.closest(selector) : null;
      if (!el) return;

      // Сохраняем оригинальную трансформацию (inline или computed)
      const origTransform = el.style.transform || window.getComputedStyle(el).transform || '';
      el.dataset._origTransform = origTransform;
      // Добавляем небольшое уменьшение
      el.style.transition = (el.style.transition ? el.style.transition + ', ' : '') + 'transform 0.12s ease';
      el.style.transform = (origTransform && origTransform !== 'none' ? origTransform + ' ' : '') + 'scale(0.96)';
    } catch (err) {
      // ignore
    }
  }, true);

  function restorePressedTransform(e) {
    try {
      const selector = '.player-btn, .control-btn, .btn, .hud-check-btn, .difficulty-option, .field-cell';
      const el = e.target.closest ? e.target.closest(selector) : null;
      if (!el) return;
      if (el.dataset._origTransform !== undefined) {
        el.style.transform = el.dataset._origTransform;
        delete el.dataset._origTransform;
      }
    } catch (err) {
      // ignore
    }
  }

  document.addEventListener('pointerup', restorePressedTransform, true);
  document.addEventListener('pointercancel', restorePressedTransform, true);
  
});
