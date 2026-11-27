/* Seren /next — the lanterns, the veils, and the things that arrive as you reach them. */
(function(){
  var root = document.documentElement;
  root.classList.add('js');
  var quiet = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var io = 'IntersectionObserver' in window;

  function once(el, fn, threshold){
    if (!el) return;
    if (!io || quiet){ fn(el); return; }
    new IntersectionObserver(function(es, o){
      es.forEach(function(e){ if (e.isIntersecting){ o.unobserve(e.target); fn(e.target); } });
    }, { threshold: threshold == null ? .2 : threshold, rootMargin: '0px 0px -8% 0px' }).observe(el);
  }

  // deal a [data-deal] block of cards in
  function deal(t){
    if (quiet){ t.classList.add('dealt'); return; }
    t.classList.remove('dealing'); void t.offsetWidth; t.classList.add('dealing');
  }

  // the veils: any [data-open] opens its dialog; Esc, the ×, or a click outside closes it
  function openVeil(id){
    var d = document.getElementById(id); if (!d || d.open) return;
    d.showModal(); document.body.classList.add('veiled'); d.scrollTop = 0;
    d.querySelectorAll('[data-deal]').forEach(deal);
  }
  document.querySelectorAll('[data-open]').forEach(function(b){
    b.addEventListener('click', function(){ openVeil(b.getAttribute('data-open')); });
  });
  document.querySelectorAll('dialog').forEach(function(d){
    d.addEventListener('close', function(){ document.body.classList.remove('veiled'); });
    d.addEventListener('click', function(e){ if (e.target === d) d.close(); });
    var x = d.querySelector('[data-close]'); if (x) x.addEventListener('click', function(){ d.close(); });
  });
  // a lantern can be linked to: /next/#v6 opens that window
  if (location.hash && /^#[a-z0-9-]+$/i.test(location.hash)){
    var h = document.getElementById(location.hash.slice(1));
    if (h && h.tagName === 'DIALOG') setTimeout(function(){ openVeil(h.id); }, 400);
  }

  // things arrive as you reach them
  // (threshold 0: a tall block, like the chronicle, may never be 12% on a phone's screen)
  document.querySelectorAll('.rv').forEach(function(el){ once(el, function(e){ e.classList.add('on'); }, 0); });
  // cards on the page deal in the first time they're on screen
  document.querySelectorAll('[data-deal]').forEach(function(t){ if (!t.closest('dialog')) once(t, deal, .25); });
  document.querySelectorAll('[data-redeal]').forEach(function(b){
    b.addEventListener('click', function(){ var t = document.getElementById(b.getAttribute('data-redeal')); if (t) deal(t); });
  });
  // the director's log writes itself, a line at a time
  document.querySelectorAll('.panel.log').forEach(function(p){
    p.querySelectorAll('.row').forEach(function(r, i){ r.style.transitionDelay = (i * 140) + 'ms'; });
    once(p, function(e){ e.classList.add('on'); }, .3);
  });

  // the sums count up, then the punchline
  var sm = document.getElementById('sums');
  once(sm, function(){
    var pu = document.querySelector('.punch');
    if (quiet){ if (pu) pu.classList.add('on'); return; }
    if (pu) setTimeout(function(){ pu.classList.add('on'); }, 2600);
    sm.querySelectorAll('[data-n]').forEach(function(b, i){
      var n = +b.dataset.n, t0 = null, dur = 1400 + i * 500;
      function step(t){ if (!t0) t0 = t; var k = Math.min(1, (t - t0) / dur); k = 1 - Math.pow(1 - k, 3);
        b.textContent = Math.round(n * k).toLocaleString('en-US'); if (k < 1) requestAnimationFrame(step); }
      requestAnimationFrame(step);
    });
  }, .45);

  // a will-o'-wisp crosses the mischief, and motes rise where she's been
  document.querySelectorAll('.mischief').forEach(function(m){
    var w = m.querySelector('.willo');
    if (w && !quiet) once(m, function(){ w.classList.add('go'); }, .3);
    var motes = m.querySelector('.motes');
    if (motes && !quiet){
      var s = '';
      for (var i = 0; i < 26; i++){
        s += '<i style="left:' + (Math.random() * 100).toFixed(1) + '%;top:' + (30 + Math.random() * 70).toFixed(1) +
          '%;--d:' + (7 + Math.random() * 9).toFixed(1) + 's;--dl:-' + (Math.random() * 12).toFixed(1) +
          's;--dx:' + (Math.random() * 60 - 30).toFixed(0) + 'px"></i>';
      }
      motes.innerHTML = s;
    }
  });
})();
