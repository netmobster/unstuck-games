/* book.js — turning the pages. No dependencies.
   The book is a stack of .sheet elements inside .book; each sheet is a right-hand page with a front and a back.
   `flipped` = how many sheets have been turned (0..N). Sheet i is turned when i < flipped.
   The board inside a sheet only animates while that sheet is the one showing (still="false"); the rest hold a frame. */
(function () {
  const book = document.querySelector('.book');
  const sheets = [...book.querySelectorAll('.sheet')];
  const N = sheets.length;
  const labels = JSON.parse(book.dataset.labels || '[]');          // one label per spread, N+1 of them
  const prev = document.querySelector('.turn .prev'), next = document.querySelector('.turn .next'), dots = document.querySelector('.turn .dots');
  let flipped = Math.max(0, Math.min(N, +(new URLSearchParams(location.search).get('page') || 0)));
  let auto = true, movingTimer = 0;

  labels.forEach((l, i) => { const b = document.createElement('button'); b.type = 'button'; b.title = l; b.setAttribute('aria-label', l); b.addEventListener('click', () => go(i, true)); dots.appendChild(b); });

  function render(moving) {
    sheets.forEach((s, i) => {
      const isFlipped = i < flipped;
      s.classList.toggle('flipped', isFlipped);
      s.style.zIndex = i === moving ? 50 : (isFlipped ? i + 1 : N - i + 6);
      s.querySelectorAll('lw-board,[data-board]').forEach(b => b.setAttribute('still', flipped === i ? 'false' : 'true'));
    });
    [...dots.children].forEach((d, i) => d.setAttribute('aria-current', String(i === flipped)));
    prev.disabled = flipped === 0; next.disabled = flipped === N;
    prev.textContent = '‹ ' + labels[Math.max(0, flipped - 1)];
    next.textContent = labels[Math.min(N, flipped + 1)] + ' ›';
  }
  function go(to, byUser) {
    to = Math.max(0, Math.min(N, to));
    if (byUser) auto = false;
    if (to === flipped) return render(-1);
    const moving = to > flipped ? flipped : to;   // the sheet that is actually turning sits above everything for the duration
    flipped = to; render(moving);
    clearTimeout(movingTimer); movingTimer = setTimeout(() => render(-1), 1000);
  }
  sheets.forEach((s, i) => s.addEventListener('click', () => go(i < flipped ? i : i + 1, true)));
  prev.addEventListener('click', () => go(flipped - 1, true));
  next.addEventListener('click', () => go(flipped + 1, true));
  document.addEventListener('keydown', e => { if (e.target.matches('input,textarea')) return; if (e.key === 'ArrowRight') go(flipped + 1, true); if (e.key === 'ArrowLeft') go(flipped - 1, true); });
  // it turns itself until someone touches it
  setInterval(() => { if (auto && !document.hidden) go((flipped + 1) % (N + 1), false); }, 7000);
  render(-1);
})();
