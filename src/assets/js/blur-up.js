// Attach load listeners to remove blur without inline handlers (CSP friendly)
(function(){
  function onLoad(e){ e.target.classList.add('loaded'); }
  window.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('img.blur-up[data-blur]').forEach(img => {
      if(img.complete) onLoad({target: img}); else img.addEventListener('load', onLoad, { once: true });
    });
  });
})();
