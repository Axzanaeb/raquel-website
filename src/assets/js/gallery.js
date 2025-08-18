// Gallery interactions externalized for CSP tightening
(function(){
  const PAGE_SIZE = 9;
  let currentShown = 0;
  let activeCategory = 'all';
  const grid = document.getElementById('grid');
  if(!grid) return;
  const gridItems = Array.from(grid.querySelectorAll('figure'));
  const loadBtn = document.getElementById('loadMore');
  const filterLinks = document.querySelectorAll('[data-filter]');

  function applyCategory(){
    gridItems.forEach(el => {
      const match = (activeCategory==='all') || (el.dataset.cat === activeCategory);
      el.dataset.match = match ? '1' : '0';
    });
  }
  function renderBatch(reset=false){
    if(reset){
      currentShown = 0;
      gridItems.forEach(el => el.classList.add('hidden'));
    }
    const matching = gridItems.filter(el => el.dataset.match==='1');
    const nextSlice = matching.slice(currentShown, currentShown + PAGE_SIZE);
    nextSlice.forEach(el => el.classList.remove('hidden'));
    currentShown += nextSlice.length;
    if(loadBtn) loadBtn.style.display = currentShown < matching.length ? '' : 'none';
  }
  function setCategory(cat){
    activeCategory = cat;
    applyCategory();
    renderBatch(true);
  }
  filterLinks.forEach(a => a.addEventListener('click', e => { e.preventDefault(); setCategory(a.dataset.filter); }));
  if(loadBtn) loadBtn.addEventListener('click', () => renderBatch());

  // Lightbox
  (function(){
    const figures = gridItems;
    if(!figures.length) return;
    const overlay = document.createElement('div');
    overlay.setAttribute('role','dialog');
    overlay.setAttribute('aria-modal','true');
    overlay.className = 'fixed inset-0 bg-black/80 flex items-center justify-center p-4 opacity-0 pointer-events-none transition-opacity z-50';
    overlay.innerHTML = '<div class="relative max-w-3xl w-full"><button type="button" aria-label="Close" class="absolute -top-10 right-0 text-white text-2xl font-bold" id="lbClose">×</button><img id="lbImg" src="" alt="" class="max-h-[70vh] w-auto mx-auto rounded shadow-lg"/><p id="lbCaption" class="text-center text-white mt-4 text-sm"></p></div>';
    document.body.appendChild(overlay);
    const imgEl = overlay.querySelector('#lbImg');
    const capEl = overlay.querySelector('#lbCaption');
    const closeBtn = overlay.querySelector('#lbClose');
    let lastFocus = null;
    function trap(e){ if(e.key === 'Tab'){ e.preventDefault(); closeBtn.focus(); } }
    function open(fig){
      lastFocus = document.activeElement;
      imgEl.src = fig.dataset.full;
      imgEl.alt = fig.dataset.title || '';
      capEl.textContent = fig.dataset.title || '';
      overlay.style.pointerEvents = 'auto';
      overlay.classList.remove('opacity-0');
      overlay.classList.add('opacity-100');
      closeBtn.focus();
      document.addEventListener('keydown', escHandler);
      document.addEventListener('keydown', trap);
    }
    function close(){
      overlay.classList.add('opacity-0');
      overlay.classList.remove('opacity-100');
      overlay.style.pointerEvents = 'none';
      document.removeEventListener('keydown', escHandler);
      document.removeEventListener('keydown', trap);
      if(lastFocus) lastFocus.focus();
    }
    function escHandler(e){ if(e.key === 'Escape') close(); }
    figures.forEach(f => {
      f.addEventListener('click', () => open(f));
      f.addEventListener('keydown', e => { if(e.key==='Enter' || e.key===' ') { e.preventDefault(); open(f);} });
    });
    closeBtn.addEventListener('click', close);
    overlay.addEventListener('click', e => { if(e.target === overlay) close(); });
  })();

  // Init
  applyCategory();
  renderBatch(true);
})();
