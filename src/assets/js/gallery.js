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

  // Lightbox (inline styles ensure reliability without Tailwind classes)
  (function(){
    if(!items.length) return;
    const SHOW_CAPTION = true; // set to false to hide caption text overlay
    const overlay = document.createElement('div');
    overlay.setAttribute('role','dialog');
    overlay.setAttribute('aria-modal','true');
    overlay.style.cssText = [
      'position:fixed','inset:0','background:rgba(0,0,0,0.8)','display:flex','align-items:center',
      'justify-content:center','padding:1rem','z-index:999','opacity:0','pointer-events:none',
      'transition:opacity .18s ease'
    ].join(';');
    overlay.innerHTML = [
      '<div style="position:relative;max-width:900px;width:100%;text-align:center;color:#fff;font:inherit;display:flex;flex-direction:column;align-items:center;">',
      '  <button type="button" aria-label="Close" id="lbX"',
      '    style="position:absolute;top:8px;right:8px;background:rgba(0,0,0,.4);border:0;color:#fff;font-size:28px;line-height:1;cursor:pointer;font-weight:600;width:40px;height:40px;border-radius:6px;">×</button>',
      '  <img id="lbImg" alt="" style="max-height:70vh;width:auto;max-width:100%;border-radius:8px;box-shadow:0 4px 24px rgba(0,0,0,.4);object-fit:contain;" />',
      '  <div id="lbCaptionWrap" style="position:absolute;left:0;bottom:0;width:100%;pointer-events:none;">',
      '    <p id="lbCap" style="margin:0;padding:12px 16px;font-size:14px;line-height:1.3;background:linear-gradient(to top,rgba(0,0,0,.55),rgba(0,0,0,0));text-shadow:0 1px 2px rgba(0,0,0,.6);"></p>',
      '  </div>',
      '</div>'
    ].join('');
    document.body.appendChild(overlay);
    const img = overlay.querySelector('#lbImg');
    const cap = overlay.querySelector('#lbCap');
    const closeBtn = overlay.querySelector('#lbX');
    const captionWrap = overlay.querySelector('#lbCaptionWrap');
    function open(fig){
      img.src = fig.dataset.full;
      img.alt = fig.dataset.title || '';
      const title = fig.dataset.title || '';
      if(SHOW_CAPTION && title){
        cap.textContent = title;
        captionWrap.style.display='block';
      } else {
        cap.textContent='';
        captionWrap.style.display='none';
      }
      overlay.style.pointerEvents = 'auto';
      overlay.style.opacity = '1';
      // focus close for accessibility
      setTimeout(()=>closeBtn.focus(), 30);
    }
    function close(){
      overlay.style.opacity = '0';
      overlay.style.pointerEvents = 'none';
    }
    items.forEach(f=>{
      f.addEventListener('click',()=>open(f));
      f.addEventListener('keydown',e=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); open(f);} });
    });
    closeBtn.addEventListener('click', close);
    overlay.addEventListener('click', e=>{ if(e.target===overlay) close(); });
    document.addEventListener('keydown', e=>{ if(e.key==='Escape') close(); });
  })();

  apply();
  render(true);

  // Deep link: if URL hash matches a figure id, open it after initial render
  const params = new URLSearchParams(location.search);
  const directId = params.get('slug') || (location.hash ? location.hash.slice(1) : '');
  if(directId){
    const fig = items.find(i=>i.id===directId);
    if(fig) setTimeout(()=>fig.click(), 30);
  }
})();
