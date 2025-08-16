export function initLessonForms(){
  document.querySelectorAll('[data-lesson-form]')?.forEach(form => {
    const slug = form.dataset.slug;
    const capacity = parseInt(form.dataset.capacity || '0', 10);
    const statusEl = form.querySelector('[data-status]');
    const remainingEl = form.querySelector('[data-remaining]');

    async function refresh(){
      try {
        const res = await fetch(`/api/lesson-status?slug=${encodeURIComponent(slug)}&capacity=${capacity}`);
        const data = await res.json();
        if(remainingEl) remainingEl.textContent = data.remaining;
        if(data.remaining <= 0){
          form.querySelector('button[type="submit"]').disabled = true;
          statusEl.textContent = 'Full';
        } else {
          statusEl.textContent = 'Open';
        }
      } catch(e){ console.error(e); }
    }

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      const payload = {
        slug,
        name: fd.get('name'),
        email: fd.get('email'),
        capacity
      };
      const btn = form.querySelector('button[type="submit"]');
      btn.disabled = true;
      btn.textContent = 'Submitting…';
      try {
        const res = await fetch('/api/register-lesson', {
          method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if(!res.ok) throw new Error(data.error || 'Error');
        form.reset();
        await refresh();
        btn.textContent = 'Registered';
      } catch(err){
        alert(err.message);
        btn.textContent = 'Try again';
        btn.disabled = false;
      }
    });

    refresh();
  });
}

if(typeof window !== 'undefined'){
  window.addEventListener('DOMContentLoaded', initLessonForms);
}
