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
  
});
