// Admin registrations page logic externalized
(function(){
  const slugInput = document.getElementById('filter-slug');
  const startInput = document.getElementById('filter-start');
  const endInput = document.getElementById('filter-end');
  const statusEl = document.getElementById('status');
  const autoChk = document.getElementById('auto-refresh');
  const tbody = document.querySelector('#table tbody');
  let masked = true;
  let timer = null;

  function maskEmail(e){
    if(!masked) { return e; }
    const parts = e.split('@');
    if(parts.length<2) { return e; }
    return parts[0][0] + '***@' + parts[1];
  }
  function buildUrl(base){
    const params = new URLSearchParams();
    const slug = slugInput.value.trim();
    if(slug) { params.set('slug', slug); }
    if(startInput.value) { params.set('start', startInput.value); }
    if(endInput.value) { params.set('end', endInput.value); }
    const qs = params.toString();
    return qs ? base + '?' + qs : base;
  }
  function filterDate(created){
    const start = startInput.value;
    const end = endInput.value;
    if(!start && !end) { return true; }
    const dt = new Date(created);
    if(start && dt < new Date(start)) { return false; }
    if(end){
      const endDt = new Date(end);
      endDt.setDate(endDt.getDate()+1);
      if(dt >= endDt) { return false; }
    }
    return true;
  }
  async function load(){
    statusEl.textContent = 'Loading…';
    try {
      const res = await fetch(buildUrl('/api/admin/registrations'), { headers: { 'Accept':'application/json' }});
      const data = await res.json(); if(!res.ok) throw new Error(data.error || 'Error');
      tbody.innerHTML='';
      data.forEach(r => {
        if(filterDate(r.created_at)){
          const tr = document.createElement('tr');
          tr.className='border-b last:border-b-0';
          tr.innerHTML = `<td class='py-1 pr-4 font-mono text-xs'>${r.lesson_slug}</td><td class='py-1 pr-4'>${r.name}</td><td class='py-1 pr-4 email-cell' data-email='${r.email}'>${maskEmail(r.email)}</td><td class='py-1 pr-4'>${new Date(r.created_at).toLocaleString()}</td>`;
          tbody.appendChild(tr);
        }
      });
      statusEl.textContent = `${tbody.children.length} registrations shown.`;
    } catch(e){ statusEl.textContent = e.message; }
  }
  function exportCsv(unique=false){
    const rows = Array.from(document.querySelectorAll('#table tbody tr'));
    if(unique){
      const emails = new Set(); rows.forEach(r => emails.add(r.querySelector('.email-cell').dataset.email));
      const blob = new Blob([Array.from(emails).join('\n')], { type:'text/plain' });
      const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='emails.txt'; a.click();
    } else {
      const lines=['lesson_slug,name,email,created_at'];
      rows.forEach(r=>{ const t=r.querySelectorAll('td'); lines.push([t[0].textContent, t[1].textContent.replace(/,/g,' '), t[2].dataset.email, t[3].textContent].join(',')); });
      const blob=new Blob([lines.join('\n')], { type:'text/csv' }); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='registrations.csv'; a.click();
    }
  }
  function toggleMask(){
    masked=!masked;
    document.querySelectorAll('.email-cell').forEach(td=>{
      td.textContent = masked ? maskEmail(td.dataset.email) : td.dataset.email;
    });
    document.getElementById('toggle-mask').textContent = masked ? 'Unmask' : 'Mask';
  }
  function autoRefreshToggle(){
    if(timer){
      clearInterval(timer);
      timer=null;
    }
    if(autoChk.checked){
      timer=setInterval(load,30000);
    }
  }

  document.getElementById('load').addEventListener('click', load);
  document.getElementById('export').addEventListener('click', ()=>exportCsv(false));
  document.getElementById('export-uniq').addEventListener('click', ()=>exportCsv(true));
  document.getElementById('toggle-mask').addEventListener('click', toggleMask);
  autoChk.addEventListener('change', autoRefreshToggle);
  load();
})();
