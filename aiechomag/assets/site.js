// The AI Echo, Edition 1 — shared page behaviour. Plain JavaScript, no dependencies, no build step.
(function () {
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var store = { get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };

  // Reading progress: the gold line under the nav
  var progress = $('#progress'), ticking = false;
  if (progress) window.addEventListener('scroll', function () {
    if (ticking) return; ticking = true;
    requestAnimationFrame(function () { var h = document.documentElement, max = h.scrollHeight - h.clientHeight; progress.style.width = (max > 0 ? h.scrollTop / max * 100 : 0).toFixed(2) + '%'; ticking = false; });
  }, { passive: true });

  // Dark mode, remembered across pages
  var root = $('#root');
  function setTheme(dark) { if (!root) return; root.setAttribute('data-theme', dark ? 'dark' : 'light'); var l = $('#themeLabel'); if (l) l.textContent = dark ? 'Light' : 'Dark'; store.set('ai-echo-theme', dark ? 'dark' : 'light'); }
  if (store.get('ai-echo-theme') === 'dark') setTheme(true);

  // The section panel: open or closed, remembered across pages; the current page scrolled into view
  var ribbon = $('#ribbon');
  function setRibbon(open) { if (!ribbon) return; ribbon.style.display = open ? 'block' : 'none'; if (open && typeof centreCurrent === 'function') setTimeout(centreCurrent, 0); var l = $('#ribbonLabel'); if (l) l.textContent = open ? 'Hide sections' : 'Sections'; var b = $('[data-action="toggleRibbon"]'); if (b) b.setAttribute('aria-expanded', open ? 'true' : 'false'); store.set('ai-echo-ribbon', open ? 'open' : 'closed'); }
  if (store.get('ai-echo-ribbon') === 'closed') setRibbon(false);
  function centreCurrent() {
    var strip = $('[data-ribbon]'), current = strip && $('[aria-current="page"]', strip);
    if (!strip || !current || strip.offsetParent === null) return;
    var a = current.getBoundingClientRect(), b = strip.getBoundingClientRect();
    if (a.left < b.left + 24 || a.right > b.right - 24) strip.scrollLeft = Math.max(0, strip.scrollLeft + (a.left - b.left) - (b.width - a.width) / 2);
  }
  centreCurrent();
  window.addEventListener('load', centreCurrent);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(centreCurrent);

  // The chart (07): flip between price per million output tokens and cost per task
  var rows = {"price":[{"w":"20%","v":"$10","note":"$2 in / $10 out"},{"w":"100%","v":"$50","note":"$10 in / $50 out"},{"w":"40%","v":"$20","note":"$4 in / $20 out"}],"cost":[{"w":"50%","v":"$1.99","note":"62,000 tokens a task"},{"w":"82%","v":"$3.26","note":"27,000 tokens a task"},{"w":"100%","v":"$3.98","note":"62,000 tokens a task"}]};
  function showPanel(panel) {
    $$('[data-action="showPrice"],[data-action="showCost"]').forEach(function (btn) { var on = (btn.getAttribute('data-action') === 'showPrice') === (panel === 'price'); btn.style.background = on ? 'var(--ej-steel-tint)' : 'transparent'; });
    $$('[data-row]').forEach(function (row, i) { var d = rows[panel][i]; if (!d) return; $('[data-bar]', row).style.width = d.w; $('[data-val]', row).textContent = d.v; $('[data-note]', row).textContent = d.note; });
  }

  // The Pattern (08): lanes draw when the diagram scrolls into view; hover or tap a step to read it
  var steps = window.AI_ECHO_STEPS || [];
  function showStep(i) {
    var s = steps[i]; if (!s) return;
    [['#activeLane', s.lane], ['#activeDate', s.date], ['#activeTitle', s.title], ['#activeText', s.text]].forEach(function (p) { var el = $(p[0]); if (el) el.textContent = p[1]; });
    $$('[data-action^="steps."]:not(.ae-stepchip)').forEach(function (b) { var on = b.getAttribute('data-action') === 'steps.' + i + '.pick'; b.style.background = on ? 'var(--ej-gold)' : 'var(--ej-steel-bright)'; var lab = $('[data-step-label]', b); if (lab) lab.style.color = on ? 'var(--ej-gold-text)' : 'var(--ej-fg-muted)'; });
  }
  $$('[data-action^="steps."]:not(.ae-stepchip)').forEach(function (b) { var i = Number(b.getAttribute('data-action').split('.')[1]); b.addEventListener('mouseenter', function () { if ((window.AI_ECHO_HOVER_LOCK || 0) > Date.now()) return; showStep(i); }); b.addEventListener('focus', function () { showStep(i); }); });
  var diagram = $('#the-pattern [style*="aspect-ratio"]') || $('[data-lane-solid]');
  function reveal() { $$('[data-lane-solid]').forEach(function (l) { l.style.width = l.getAttribute('data-lane-solid'); }); $$('[data-reveal]').forEach(function (el) { el.style.opacity = '1'; }); $$('[data-action^="steps."]:not(.ae-stepchip)').forEach(function (b) { b.style.opacity = '1'; }); }
  if (diagram) { if ('IntersectionObserver' in window) { var io = new IntersectionObserver(function (es) { if (es.some(function (e) { return e.isIntersecting; })) { reveal(); io.disconnect(); } }, { threshold: 0.2 }); io.observe(diagram); } else reveal(); }

  // Share a claim (03): copies the text and saves a 1200 x 630 card
  var shifts = window.AI_ECHO_SHIFTS || [];
  function wrapText(ctx, str, x, y, max, lh) { var line = ''; str.split(' ').forEach(function (w) { var t = line ? line + ' ' + w : w; if (ctx.measureText(t).width > max && line) { ctx.fillText(line, x, y); y += lh; line = w; } else line = t; }); ctx.fillText(line, x, y); return y + lh; }
  function share(i, btn) {
    var s = shifts[i]; if (!s) return; var url = location.href.split('#')[0];
    try { navigator.clipboard && navigator.clipboard.writeText('\u201c' + s.claim + '\u201d \u2014 ' + s.text + ' The AI Echo, Edition 1 \u00b7 ' + url); } catch (e) {}
    var c = document.createElement('canvas'); c.width = 1200; c.height = 630; var ctx = c.getContext('2d');
    ctx.fillStyle = '#eef2f6'; ctx.fillRect(0, 0, 1200, 630);
    ctx.fillStyle = '#0f1720'; ctx.font = "700 44px 'Barlow Condensed', 'Arial Narrow', sans-serif"; ctx.fillText('THE AI ECHO', 72, 96);
    ctx.fillStyle = '#2b5276'; ctx.font = "16px 'Share Tech Mono', monospace"; ctx.fillText('EDITION 1 \u00b7 OCTOBER 2026 // 03 THE MONTH // GRADE: ' + String(s.grade || '').toUpperCase(), 72, 130);
    ctx.fillStyle = '#0f1720'; ctx.font = "600 64px 'Barlow Condensed', 'Arial Narrow', sans-serif"; var y = wrapText(ctx, s.claim, 72, 230, 1056, 68);
    ctx.fillStyle = '#4f6076'; ctx.font = "24px 'Source Sans 3', system-ui, sans-serif"; wrapText(ctx, s.text, 72, y + 12, 1000, 34);
    ctx.fillStyle = '#c9a227'; ctx.beginPath(); ctx.moveTo(72, 548); ctx.lineTo(300, 548); ctx.lineTo(310, 576); ctx.lineTo(72, 576); ctx.fill();
    ctx.fillStyle = '#1a1300'; ctx.font = "14px 'Share Tech Mono', monospace"; ctx.fillText('PROVE US WRONG // REPLY TO THE EMAIL', 84, 567);
    var a = document.createElement('a'); a.download = 'the-ai-echo-claim-' + (i + 1) + '.png'; a.href = c.toDataURL('image/png'); a.click();
    if (btn) { var old = btn.innerHTML; btn.textContent = 'Copied \u00b7 card saved'; setTimeout(function () { btn.innerHTML = old; }, 2200); }
  }

  // One click handler for every [data-action] button
  document.addEventListener('click', function (e) {
    var btn = e.target.closest && e.target.closest('[data-action]'); if (!btn) return;
    var act = btn.getAttribute('data-action');
    if (act === 'toggleTheme') setTheme(root.getAttribute('data-theme') !== 'dark');
    else if (act === 'toggleRibbon') setRibbon(ribbon.style.display === 'none');
    else if (act === 'showPrice') showPanel('price');
    else if (act === 'showCost') showPanel('cost');
    else if (/^steps\.\d+\.pick$/.test(act)) showStep(Number(act.split('.')[1]));
    else if (/^shifts\.\d+\.share$/.test(act)) share(Number(act.split('.')[1]), btn);
  });
})();
