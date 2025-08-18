// Minimal gallery logic: filters, load more, lightbox
(function(){
  const PAGE_SIZE = 9;
  let shown = 0;
  let active = 'all';
  const grid = document.getElementById('grid');
  if(!grid) return;
  const items = Array.from(grid.querySelectorAll('figure'));
  const btn = document.getElementById('loadMore');
  const filters = document.querySelectorAll('[data-filter]');

  function apply(){
    items.forEach(el => {
      const match = active==='all' || el.dataset.cat===active;
      el.dataset.match = match ? '1':'0';
    });
  }
  function render(reset){
    if(reset){ shown=0; items.forEach(i=>i.classList.add('hidden')); }
    const match = items.filter(i=>i.dataset.match==='1');
    match.slice(shown, shown+PAGE_SIZE).forEach(i=>i.classList.remove('hidden'));
    shown += PAGE_SIZE;
    if(btn) btn.style.display = shown < match.length ? '' : 'none';
  }
  filters.forEach(f=>f.addEventListener('click', e=>{ e.preventDefault(); active=f.dataset.filter; apply(); render(true);}));
  if(btn) btn.addEventListener('click', ()=>render());

  // Lightbox
  (function(){
    if(!items.length) return;
    const overlay = document.createElement('div');
    overlay.className='fixed inset-0 bg-black/80 flex items-center justify-center p-4 opacity-0 pointer-events-none transition-opacity z-50';
    overlay.innerHTML='<div class="relative max-w-3xl w-full"><button type="button" aria-label="Close" class="absolute -top-10 right-0 text-white text-2xl font-bold" id="lbX">×</button><img id="lbImg" class="max-h-[70vh] w-auto mx-auto rounded shadow" alt="" /><p id="lbCap" class="text-center text-white mt-4 text-sm"></p></div>';
    document.body.appendChild(overlay);
    const img=overlay.querySelector('#lbImg');
    const cap=overlay.querySelector('#lbCap');
    const closeBtn=overlay.querySelector('#lbX');
    function open(fig){
      img.src=fig.dataset.full; img.alt=fig.dataset.title||''; cap.textContent=fig.dataset.title||'';
      overlay.style.pointerEvents='auto'; overlay.classList.remove('opacity-0'); overlay.classList.add('opacity-100');
    }
    function close(){ overlay.classList.add('opacity-0'); overlay.classList.remove('opacity-100'); overlay.style.pointerEvents='none'; }
    items.forEach(f=>{ f.addEventListener('click',()=>open(f)); f.addEventListener('keydown',e=>{ if(e.key==='Enter'||e.key===' ') { e.preventDefault(); open(f);} }); });
    closeBtn.addEventListener('click', close); overlay.addEventListener('click',e=>{ if(e.target===overlay) close(); });
    document.addEventListener('keydown',e=>{ if(e.key==='Escape') close(); });
  })();

  apply();
  render(true);
})();
