// Admin function logs externalized
(async function(){
  const bodyEl = document.getElementById('logBody');
  const statusMsg = document.getElementById('statusMsg');
  async function authHeaders(){
    if(!window.netlifyIdentity) { return {}; }
    const user = window.netlifyIdentity.currentUser();
    if(!user) { return {}; }
    const token = await user.jwt();
    return { Authorization: `Bearer ${token}` };
  }
  async function load(){
    const fn = document.getElementById('fnFilter').value.trim();
    const limit = document.getElementById('limitInput').value || '200';
    const qs = new URLSearchParams();
    if(fn) { qs.set('fn', fn); }
    qs.set('limit', limit);
    bodyEl.innerHTML='';
    const res = await fetch('/api/admin/function-logs?'+qs.toString(), { headers: await authHeaders() });
    if(!res.ok){
      bodyEl.innerHTML = `<tr><td colspan=6 class='px-3 py-2 text-red-600'>${res.status} ${res.statusText}</td></tr>`;
      return;
    }
    const data = await res.json();
    data.forEach(r => { const tr=document.createElement('tr'); tr.innerHTML = `<td class='px-3 py-1'>${r.id}</td><td class='px-3 py-1 whitespace-nowrap'>${new Date(r.created_at).toLocaleString()}</td><td class='px-3 py-1'>${r.fn}</td><td class='px-3 py-1'>${r.slug||''}</td><td class='px-3 py-1 opacity-60'>${r.ip||''}</td><td class='px-3 py-1'>${r.ok ? '✔️' : '❌'}</td>`; bodyEl.appendChild(tr); });
    statusMsg.textContent = `${data.length} rows`;
  }
  function exportCsv(){
    const rows = Array.from(document.querySelectorAll('#logBody tr')).map(tr => Array.from(tr.children).map(td => '"'+td.textContent.replace(/"/g,'')+'"').join(','));
    const csv=['id,time,function,slug,ip,ok',...rows].join('\n');
    const blob=new Blob([csv], { type:'text/csv' }); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='function-logs.csv'; a.click();
  }
  document.getElementById('reloadBtn').addEventListener('click', load);
  document.getElementById('exportBtn').addEventListener('click', exportCsv);
  if(window.netlifyIdentity){
    window.netlifyIdentity.on('init', load);
    window.netlifyIdentity.on('login', load);
  }
  load();
})();
