// The deal: hover turns a card over (CSS). A click pins it face up; click again to put it down.
document.querySelectorAll('.card').forEach(card => {
  card.addEventListener('click', () => {
    const up = card.classList.toggle('is-pinned');
    card.setAttribute('aria-pressed', String(up));
  });
});
