/* kit.js — the letter box. Posts straight to the studio's Kit form, the same way kit-waitlist.js does at the repo root
   (form 9916999; no Kit script, no popup; Kit sends its own double opt-in). Copy the root file in instead if it has moved on. */
(function () {
  const KIT_FORM = 'https://app.kit.com/forms/9916999/subscriptions';
  const form = document.getElementById('kit-form'), note = document.getElementById('kit-note');
  if (!form) return;
  const visitor = () => { const k = 'unstuck:kit-visitor'; try { let id = localStorage.getItem(k); if (!id) { id = crypto.randomUUID(); localStorage.setItem(k, id); } return id; } catch { return crypto.randomUUID(); } };
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const email = form.email.value.trim(); if (!email) return;
    const btn = form.querySelector('button'); btn.disabled = true; note.textContent = 'Sending…';
    const body = new FormData();
    body.append('email_address', email); body.append('token', ''); body.append('referrer', document.referrer); body.append('host', location.href);
    body.append('search', location.search); body.append('user', visitor()); body.append('ckjs_version', '6');
    try {
      const res = await fetch(KIT_FORM, { method: 'POST', body, headers: { Accept: 'application/json', 'X-CKJS-Version': '6' } });
      const j = res.ok ? await res.json() : null;
      if (j && j.status === 'success') { note.textContent = 'Written down. Kit will send a confirm link; click it and you are in the book.'; form.reset(); }
      else if (j && j.status === 'quarantined' && j.url) { note.innerHTML = 'Kit wants a human check first: <a href="' + j.url + '">do it here</a>.'; btn.disabled = false; }
      else { note.textContent = (j && j.errors && j.errors.messages && j.errors.messages.join(' ')) || 'Kit said no and didn’t say why. Nothing was saved.'; btn.disabled = false; }
    } catch { note.textContent = 'Couldn’t reach Kit. Nothing was sent. Try again in a minute.'; btn.disabled = false; }
  });
})();
