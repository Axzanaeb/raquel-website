// Dark mode toggle separated for CSP friendliness
(function(){
  function setTheme(mode){
    document.documentElement.classList.toggle('dark', mode==='dark');
    localStorage.setItem('pref-theme', mode);
    const btn=document.getElementById('themeToggle');
    if(btn) btn.textContent = mode==='dark' ? '☀️' : '🌙';
  }
  window.addEventListener('DOMContentLoaded', () => {
    const btn=document.getElementById('themeToggle');
    if(!btn) return;
    const initial = document.documentElement.classList.contains('dark') ? 'dark':'light';
    btn.textContent = initial==='dark' ? '☀️' : '🌙';
    btn.addEventListener('click', () => {
      const dark=document.documentElement.classList.contains('dark');
      setTheme(dark?'light':'dark');
    });
  });
})();
