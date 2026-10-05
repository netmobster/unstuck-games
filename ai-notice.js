/* ai-notice.js: when the narrator can't run, the games that need it say so as you come in.

   One switch for every game: /ai-status.json at the studio root. {"ok": true} and this script
   does nothing. {"ok": false, ...} and the page opens a small notice with the message, once per
   visit (sessionStorage), so it informs without nagging. Today it's off because the new AWS
   account's Bedrock quota is still zero; when Amazon switches it on, set "ok" to true.

   Used by SEREN's table and Loom and by Elsewhere's world. Nothing here talks to a model. */
(function () {
  fetch('/ai-status.json', { cache: 'no-store' })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (s) {
      if (!s || s.ok) return;
      var key = 'ug.ai-notice.' + (s.since || 'now');
      try { if (sessionStorage.getItem(key)) return; } catch (e) {}
      var d = document.createElement('dialog');
      d.setAttribute('aria-labelledby', 'ug-ai-t');
      d.style.cssText = 'max-width:440px;width:calc(100% - 32px);padding:22px 24px;border:2px solid #16163a;border-radius:14px;' +
        'background:#faf8f2;color:#16163a;font:400 15px/1.55 system-ui,-apple-system,"Segoe UI",sans-serif;box-shadow:6px 6px 0 #16163a';
      d.innerHTML =
        '<div style="font-weight:800;font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:#2b34d6">Unstuck Games</div>' +
        '<h2 id="ug-ai-t" style="font-size:21px;line-height:1.2;margin:8px 0 10px">' + (s.title || 'The narrator isn’t switched on yet') + '</h2>' +
        '<p style="margin:0 0 16px"></p>' +
        '<button type="button" style="font:700 13px system-ui,sans-serif;letter-spacing:.06em;padding:9px 16px;border:2px solid #16163a;' +
        'border-radius:999px;background:#e9f257;color:#16163a;cursor:pointer">Got it</button>';
      d.querySelector('p').textContent = s.message || '';
      d.querySelector('button').addEventListener('click', function () { d.close(); });
      d.addEventListener('close', function () { try { sessionStorage.setItem(key, '1'); } catch (e) {} d.remove(); });
      document.body.appendChild(d);
      d.showModal();
    })
    .catch(function () {});
})();
