// Dark mode initial application without inline script (CSP friendly)
(function(){
  try {
    const key='pref-theme';
    const stored=localStorage.getItem(key);
    if(stored){
      document.documentElement.classList.toggle('dark', stored==='dark');
    } else if(window.matchMedia('(prefers-color-scheme: dark)').matches){
      document.documentElement.classList.add('dark');
    }
  } catch(e) { if(window && window.console) console.warn('Theme init failed', e); }
})();
