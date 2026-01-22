document.addEventListener('DOMContentLoaded', () => {
  const scrollBtn = document.getElementById('scrollTop');
  
  if (!scrollBtn) return;

  window.addEventListener('scroll', () => {
    const trigger = window.innerHeight * 1.5;

    if (window.scrollY > trigger) {
      scrollBtn.classList.add('visible');
    }
    else {
      scrollBtn.classList.remove('visible');
    }
  });

  scrollBtn.addEventListener('click', () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    })
  })
});