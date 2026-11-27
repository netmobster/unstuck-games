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
  // her card: dealt face down, then the fortune teller turns it over; tap to turn it again
  document.querySelectorAll('.flipc').forEach(function(c){
    c.addEventListener('click', function(){ c.classList.toggle('turned'); });
    var h = c.closest('[data-deal]');
    once(h || c, function(){ setTimeout(function(){ c.classList.add('turned'); }, quiet ? 0 : 1900); }, .4);
  });

  // the loom: five dials you can move; it says when you've left her settings
  document.querySelectorAll('[data-loom]').forEach(function(l){
    var ins = l.querySelectorAll('input[type=range]'), note = l.querySelector('.lm-note');
    var home = note ? note.innerHTML : '';
    function paint(i){
      var p = (i.value - i.min) / (i.max - i.min) * 100;
      i.style.setProperty('--p', p + '%');
      var lab = i.closest('label'); lab.querySelector('output').textContent = i.value;
      lab.classList.toggle('moved', i.value !== i.dataset.d);
    }
    function sum(){
      var moved = [].filter.call(ins, function(i){ return i.value !== i.dataset.d; }).length;
      if (!note) return;
      if (!moved){ note.innerHTML = home; return; }
      note.innerHTML = 'Not Serenista’s book any more: ' + (moved === 1 ? 'one dial' : moved + ' dials') +
        ' moved, and the same hand would be written as a different story. <button type="button">Put them back</button>';
      note.querySelector('button').addEventListener('click', function(){
        ins.forEach(function(i){ i.value = i.dataset.d; paint(i); }); sum();
      });
    }
    ins.forEach(function(i){ paint(i); i.addEventListener('input', function(){ paint(i); sum(); }); });
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

  // Watch one get made: eight beats of a real run. Plays only while it's on screen; tap or arrows step it;
  // reduced motion gets the stills and the words with nothing moving (Jay, 27 Nov).
  document.querySelectorAll('[data-mk]').forEach(function(mk){
    var slides = [].slice.call(mk.querySelectorAll('.mk-s')), steps = [];
    try { steps = JSON.parse(mk.parentNode.querySelector('[data-mk-steps]').textContent); } catch(e){}
    var dots = mk.querySelector('[data-mk-dots]'), kEl = mk.querySelector('[data-mk-k]'), pEl = mk.querySelector('[data-mk-p]');
    var play = mk.querySelector('[data-mk-play]'), at = 0, timer = null, typing = [], inView = false, paused = quiet;
    slides.forEach(function(s, i){
      if (s.dataset.z) s.style.setProperty('--z', s.dataset.z);
      if (s.dataset.o) s.style.setProperty('--o', s.dataset.o);
      var b = document.createElement('button'); b.type = 'button'; b.setAttribute('aria-label', 'Step ' + (i + 1) + ': ' + ((steps[i] || [])[0] || ''));
      b.onclick = function(){ go(i, true); }; dots.appendChild(b);
    });
    function hold(i){ return +(slides[i].dataset.hold || 5200); }
    function stopTyping(){ typing.forEach(clearTimeout); typing = []; }
    function teller(s){
      var box = s.querySelector('.mk-lines'), clock = s.querySelector('.mk-clock b'); if (!box) return;
      var lines = [1, 2, 3, 4].map(function(n){ return box.getAttribute('data-l' + n); }).filter(Boolean);
      box.innerHTML = '';
      if (quiet){ box.innerHTML = '<i>' + lines[0] + '</i>'; if (clock) clock.textContent = '1:12'; return; }
      var per = Math.floor(hold(at) / lines.length), secs = [8, 41, 79, 112];
      lines.forEach(function(line, n){
        typing.push(setTimeout(function(){
          [].forEach.call(box.children, function(c){ c.classList.add('old'); });
          while (box.children.length > 1) box.removeChild(box.firstChild);
          var el = document.createElement('i'); box.appendChild(el);
          if (clock) clock.textContent = Math.floor(secs[n] / 60) + ':' + ('0' + secs[n] % 60).slice(-2);
          var c = 0; (function type(){ el.textContent = line.slice(0, ++c); if (c < line.length) typing.push(setTimeout(type, 16)); })();
        }, n * per));
      });
    }
    function go(i, byHand){
      at = (i + slides.length) % slides.length; stopTyping();
      slides.forEach(function(s, n){ s.classList.toggle('on', n === at); });
      [].forEach.call(dots.children, function(d, n){
        d.classList.toggle('done', n < at); d.classList.remove('on'); void d.offsetWidth;
        if (n === at){ d.classList.add('on'); d.style.setProperty('--d', hold(n) + 'ms'); }
      });
      var st = steps[at] || ['', '']; kEl.textContent = st[0]; pEl.textContent = st[1];
      if (slides[at].classList.contains('mk-teller')) teller(slides[at]);
      if (byHand && !quiet) { paused = false; }
      schedule();
    }
    function schedule(){
      clearTimeout(timer); mk.classList.toggle('paused', paused || !inView);
      play.textContent = paused ? '▶' : '❚❚'; play.setAttribute('aria-label', paused ? 'Play' : 'Pause');
      if (!paused && inView && !document.hidden) timer = setTimeout(function(){ go(at + 1); }, hold(at));
    }
    mk.querySelector('[data-mk-next]').onclick = function(){ go(at + 1, true); };
    mk.querySelector('[data-mk-prev]').onclick = function(){ go(at - 1, true); };
    mk.querySelector('[data-mk-stage]').onclick = function(){ go(at + 1, true); };
    play.onclick = function(){ paused = !paused; if (!paused) go(at); else { stopTyping(); schedule(); } };
    mk.addEventListener('keydown', function(e){
      if (e.key === 'ArrowRight'){ e.preventDefault(); go(at + 1, true); }
      if (e.key === 'ArrowLeft'){ e.preventDefault(); go(at - 1, true); }
    });
    document.addEventListener('visibilitychange', schedule);
    // Lazy images on stacked, hidden slides may never load in time; once it's near, ask for all eight.
    function eager(){ slides.forEach(function(s){ var im = s.querySelector('img'); if (im) im.loading = 'eager'; }); }
    if (io){
      new IntersectionObserver(function(es, o){ if (es[0].isIntersecting){ eager(); o.disconnect(); } }, { rootMargin: '600px 0px' }).observe(mk);
      new IntersectionObserver(function(es){ inView = es[0].isIntersecting; schedule(); }, { threshold: .35 }).observe(mk);
    } else { inView = true; eager(); }
    go(0);
  });

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
