// The deal: hover turns a card over (CSS). A click pins it face up; click again to put it down.
document.querySelectorAll('.card').forEach(card => {
  card.addEventListener('click', () => {
    const up = card.classList.toggle('is-pinned');
    card.setAttribute('aria-pressed', String(up));
  });
});

// Text size: A− / A+ scale every font on the page (--fs), remembered in this browser.
(function () {
  var root = document.documentElement, KEY = 'echo-x-fs', steps = [0.9, 1, 1.12, 1.25, 1.4], i = 1;
  try { var s = Number(localStorage.getItem(KEY)); if (steps.indexOf(s) >= 0) i = steps.indexOf(s); } catch (e) {}
  function set(n) {
    i = Math.max(0, Math.min(steps.length - 1, n));
    root.style.setProperty('--fs', String(steps[i]));
    try { localStorage.setItem(KEY, String(steps[i])); } catch (e) {}
  }
  set(i);
  var down = document.getElementById('fs-down'), up = document.getElementById('fs-up');
  if (down) down.addEventListener('click', function () { set(i - 1); });
  if (up) up.addEventListener('click', function () { set(i + 1); });
})();

// Plugin tabs: one plugin at a time. Without this script every plugin shows, one after another.
(function () {
  var list = document.querySelector('.tabs');
  if (!list) return;
  var tabs = Array.prototype.slice.call(list.querySelectorAll('[role=tab]')), KEY = 'echo-x-tab';
  function show(tab, focus) {
    tabs.forEach(function (t) {
      var on = t === tab;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      var panel = document.getElementById(t.getAttribute('aria-controls'));
      if (panel) panel.hidden = !on;
    });
    if (focus) tab.focus();
    try { localStorage.setItem(KEY, tab.id); } catch (e) {}
  }
  list.hidden = false;
  list.parentNode.classList.add('has-tabs');
  var start = tabs[0];
  try { var saved = document.getElementById(localStorage.getItem(KEY) || ''); if (tabs.indexOf(saved) >= 0) start = saved; } catch (e) {}
  var linked = document.getElementById('tab-' + location.hash.replace(/^#(plug-)?/, ''));
  if (tabs.indexOf(linked) >= 0) start = linked;
  show(start, false);
  tabs.forEach(function (t, k) {
    t.addEventListener('click', function () { show(t, false); });
    t.addEventListener('keydown', function (e) {
      var n = e.key === 'ArrowRight' ? k + 1 : e.key === 'ArrowLeft' ? k - 1 : e.key === 'Home' ? 0 : e.key === 'End' ? tabs.length - 1 : null;
      if (n === null) return;
      e.preventDefault();
      show(tabs[(n + tabs.length) % tabs.length], true);
    });
  });
})();
