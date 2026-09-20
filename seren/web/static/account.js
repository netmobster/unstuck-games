/* The account chip.
 *
 * One script tag, no markup, no stylesheet: a page includes it and gets a way in, a way
 * back to the shelf, and a way out. It exists because the homepage was the only page that
 * knew who you were — so once you were past the password door there was no sign-in
 * affordance anywhere, and Jay could not sign in to his own game (2026-09-20).
 *
 * It injects its own styles under one prefix and reads nothing from the host page, because
 * the table, the loom and the shelf are three different designs and this has to sit on all
 * of them without being restyled by any of them.
 */
(function () {
  if (window.__serenAccount) return;          // a page may include it twice; only one chip
  window.__serenAccount = true;

  // z-index 30: above page content, BELOW every modal on every page (the loom's house
  // rules sit at 50 and 60, the shelf's confirm at 60). A chip floating over a dialog is
  // a chip that has to be dismissed before the dialog can be read.
  var CSS = [
    '.sa-chip{position:fixed;top:14px;right:14px;z-index:30;font-family:"Space Mono",ui-monospace,monospace}',
    '.sa-btn{display:flex;align-items:center;gap:8px;background:rgba(20,18,16,.92);',
    '  border:1px solid #3b352c;border-radius:2px;color:#9a9182;font:inherit;font-size:10.5px;',
    '  letter-spacing:.14em;text-transform:uppercase;padding:7px 10px;cursor:pointer;line-height:1;',
    '  backdrop-filter:blur(6px)}',
    '.sa-btn:hover{border-color:#9a9182;color:#e8e2d4}',
    '.sa-pip{width:19px;height:19px;border-radius:50%;background:#c2481a;color:#160b05;',
    '  display:grid;place-items:center;font-size:9.5px;font-weight:700;letter-spacing:0;',
    '  flex:none;overflow:hidden}',
    '.sa-pip img{width:100%;height:100%;object-fit:cover}',
    '.sa-bars{display:inline-flex;flex-direction:column;gap:2.5px;width:12px}',
    '.sa-bars i{display:block;height:1.5px;background:currentColor;border-radius:1px}',
    '.sa-menu{position:absolute;right:0;top:calc(100% + 8px);width:230px;background:#141210;',
    '  border:1px solid #3b352c;border-radius:3px;padding:6px;display:none;',
    '  box-shadow:0 18px 44px rgba(0,0,0,.66)}',
    '.sa-menu.open{display:block}',
    '.sa-head{padding:8px 9px 10px;border-bottom:1px solid #2a2622;margin-bottom:5px}',
    '.sa-head b{display:block;font-family:Spectral,Georgia,serif;font-weight:400;font-size:14px;color:#e8e2d4}',
    '.sa-head span{display:block;font-size:9.5px;letter-spacing:.06em;color:#6b6558;margin-top:3px;',
    '  word-break:break-all;text-transform:none}',
    '.sa-menu a{display:block;color:#9a9182;text-decoration:none;font-size:10.5px;letter-spacing:.12em;',
    '  text-transform:uppercase;padding:8px 9px;border-radius:2px;line-height:1.4}',
    '.sa-menu a:hover{background:#1b1815;color:#e8e2d4}',
    '.sa-menu hr{border:0;border-top:1px solid #2a2622;margin:5px 0}',
    '.sa-menu a.sa-out{color:#a8574b}',
    '@media (max-width:640px){.sa-chip{top:8px;right:8px}.sa-menu{width:min(230px,calc(100vw - 24px))}}'
  ].join('');

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function mount(me) {
    var style = document.createElement('style');
    style.textContent = CSS;
    document.head.appendChild(style);

    var chip = document.createElement('div');
    chip.className = 'sa-chip';

    if (!me.signed_in) {
      if (!me.google) return;                 // no way in to offer; say nothing
      chip.innerHTML = '<a class="sa-btn" href="/auth/google" style="text-decoration:none">Sign in</a>';
      document.body.appendChild(chip);
      return;
    }

    var who = me.name || me.account;
    var pip = me.picture
      ? '<img alt="" src="' + esc(me.picture) + '" referrerpolicy="no-referrer">'
      : esc((who || '?').trim().charAt(0).toUpperCase());

    // "Play now" is pointless on the table itself; "back to the table" is pointless on it too.
    var here = location.pathname.replace(/\/$/, '');
    var onTable = here === '/table' || here === '/play';
    var first = onTable
      ? '<a href="/loom">Deal a new hand</a>'
      : '<a href="/table">Back to the table</a><a href="/loom">Deal a new hand</a>';

    chip.innerHTML =
      '<button class="sa-btn" id="sa-btn" aria-haspopup="true" aria-expanded="false">' +
        '<span class="sa-pip">' + pip + '</span>' +
        '<span class="sa-bars" aria-hidden="true"><i></i><i></i><i></i></span>' +
      '</button>' +
      '<div class="sa-menu" id="sa-menu" role="menu">' +
        '<div class="sa-head"><b>' + esc(who) + '</b><span>' + esc(me.email) + '</span></div>' +
        '<a href="/shelf">Your campaigns</a>' +
        first +
        '<hr>' +
        '<a href="/">The house</a>' +
        '<hr>' +
        '<a class="sa-out" href="/auth/logout">Sign out</a>' +
      '</div>';
    document.body.appendChild(chip);

    var btn = document.getElementById('sa-btn');
    var menu = document.getElementById('sa-menu');
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      var open = menu.classList.toggle('open');
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    document.addEventListener('click', function (e) {
      if (!chip.contains(e.target)) { menu.classList.remove('open'); btn.setAttribute('aria-expanded', 'false'); }
    });
    // Escape belongs to the host page's own modals first; only close ours if ours is open.
    window.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && menu.classList.contains('open')) {
        e.stopPropagation();
        menu.classList.remove('open');
        btn.setAttribute('aria-expanded', 'false');
      }
    }, true);
  }

  function go() {
    fetch('/api/me')
      .then(function (r) { return r.json(); })
      .then(mount)
      .catch(function () { /* a chip that cannot load is not worth an error on the table */ });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go);
  else go();
})();
