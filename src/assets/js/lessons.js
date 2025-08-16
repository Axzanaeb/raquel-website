export function initLessonForms(){
  document.querySelectorAll('[data-lesson-form]')?.forEach(form => {
    const slug = form.dataset.slug;
    const capacity = parseInt(form.dataset.capacity || '0', 10);
    const statusEl = form.querySelector('[data-status]');
    const remainingEl = form.querySelector('[data-remaining]');
    const containerCard = form.closest('.card');

    async function refresh(){
      try {
        const res = await fetch(`/api/lesson-status?slug=${encodeURIComponent(slug)}&capacity=${capacity}`);
        const data = await res.json();
        if(remainingEl) remainingEl.textContent = data.remaining;
        const submitBtn = form.querySelector('button[type="submit"]');
        if(data.remaining <= 0){
          // Auto-hide form if full
            if(submitBtn) submitBtn.disabled = true;
            statusEl.textContent = 'Full';
            form.style.display = 'none';
            const fullNote = document.createElement('p');
            fullNote.className = 'text-sm text-red-600 mt-2';
            fullNote.textContent = 'This lesson is full.';
            if(containerCard && !containerCard.querySelector('.text-red-600')) containerCard.querySelector('.p-5')?.appendChild(fullNote);
        } else {
          statusEl.textContent = 'Open';
          if(submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Join'; }
        }
      } catch(e){ console.error(e); }
    }

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      // Honeypot field check
      if(form.querySelector('input[name="website"]')?.value){
        return; // silently drop bots
      }
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

    // Insert honeypot hidden field
    const hp = document.createElement('div');
    hp.style.position = 'absolute'; hp.style.left='-10000px'; hp.innerHTML = '<label>Leave blank<input name="website" tabindex="-1" autocomplete="off" /></label>';
    form.appendChild(hp);

    refresh();
  });
}

if(typeof window !== 'undefined'){
  window.addEventListener('DOMContentLoaded', initLessonForms);
}
