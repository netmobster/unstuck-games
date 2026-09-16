/* The studio switcher. Every game lives on its own subdomain now, so the UNSTUCK
   badge in a game's header is the only way back — and "back" should mean the whole
   catalogue, not just the front door. Clicking it opens a panel: the studio on a
   card, then one row per game with its status.

   One file, served from the root of every subdomain (see the nginx config), so
   adding a game means editing GAMES below and nothing else. No dependencies, no
   build step, and it styles itself so it sits on a riso page or a grimy one. */
(function () {
  var HOME = "https://unstuck-games.com/";
  var GAMES = [
    { id: "orbis", name: "Orbis", note: "an ant farm you cannot help", status: "PLAY NOW",
      href: "https://orbis.unstuck-games.com/", ink: "#0f5c57", icon: "◎" },
    { id: "elsewhere", name: "Elsewhere", note: "the world moves while you are gone", status: "EARLY ACCESS",
      href: "https://elsewhere.unstuck-games.com/", ink: "#8a5a2b", icon: "◷" },
    { id: "badmonkeys", name: "Bad Monkeys", note: "she sheds every part when you leave", status: "ALPHA",
      href: "https://badmonkeys.unstuck-games.com/", ink: "#b4573f", icon: "✱" },
    { id: "ferretbowling", name: "Ferret Bowling", note: "aim is a suggestion", status: "ALPHA",
      href: "https://ferretbowling.unstuck-games.com/", ink: "#d8352a", icon: "⌁" },
  ];

  // Which game we are on. The subdomain says so; the path is the fallback that keeps
  // this honest on a local dev server and on the old URLs before they redirect.
  var here = location.hostname.split(".")[0];
  if (here === "unstuck-games" || here === "www" || here === "localhost" || here.indexOf("127.") === 0) {
    here = location.pathname.split("/")[1] || "";
  }
  here = here.replace("bad-monkeys", "badmonkeys").replace("ferret-bowling", "ferretbowling");

  var css = document.createElement("style");
  css.textContent = [
    ".ug-sw{position:fixed;inset:0;z-index:9999;display:none;place-items:center;padding:20px;",
    "background:rgba(20,18,15,.55);font-family:system-ui,-apple-system,'Segoe UI',sans-serif}",
    ".ug-sw[data-open]{display:grid}",
    ".ug-card{width:min(420px,100%);background:#f2ead3;color:#2b241d;border:3px solid #1b1a17;",
    "border-radius:10px 7px 12px 8px;box-shadow:7px 8px 0 rgba(27,26,23,.55);overflow:hidden}",
    ".ug-home{display:flex;align-items:center;gap:12px;padding:15px 17px;background:#1b1a17;color:#ffd23f;text-decoration:none}",
    ".ug-home div{flex:1;min-width:0}",
    ".ug-home .ug-go{flex:none;background:#ffd23f;color:#1b1a17;padding:9px 15px;",
    "border:2px solid #1b1a17;border-radius:4px;font:700 13px/1 system-ui,-apple-system,sans-serif;",
    "letter-spacing:.14em;white-space:nowrap}",
    ".ug-home:hover .ug-go{background:#fff}",
    ".ug-home b{display:block;font-size:19px;letter-spacing:.02em}",
    ".ug-home div span{display:block;font-size:12px;opacity:.75;margin-top:2px;color:#f2ead3}",
    ".ug-row{display:flex;align-items:center;gap:11px;padding:11px 16px;text-decoration:none;color:inherit;",
    "border-top:1.5px solid rgba(27,26,23,.18)}",
    ".ug-row:hover{background:#e9e1cb}",
    ".ug-row[aria-current]{background:#ffd23f}",
    ".ug-ic{width:26px;height:26px;display:grid;place-items:center;border-radius:6px 4px 7px 4px;",
    "color:#f2ead3;font-size:14px;flex:none}",
    ".ug-t{flex:1;min-width:0}",
    ".ug-t b{display:block;font-size:15px}",
    ".ug-t span{display:block;font-size:12px;color:#5b5346;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}",
    ".ug-st{font-size:9.5px;letter-spacing:.14em;font-weight:700;padding:3px 7px;border:1.5px solid #1b1a17;border-radius:3px;white-space:nowrap}",
    ".ug-foot{display:flex;align-items:stretch;border-top:1.5px solid rgba(27,26,23,.18);background:#e9e1cb}",
    ".ug-foot a{flex:none;display:grid;place-items:center;padding:10px 16px;text-decoration:none;",
    "font:700 12px/1 system-ui,sans-serif;letter-spacing:.12em;color:#5b5346;border-right:1.5px solid rgba(27,26,23,.18)}",
    ".ug-foot a:hover{color:#1b1a17;background:#ffd23f}",
    ".ug-shut{flex:1;padding:10px;background:transparent;border:0;",
    "font:inherit;font-size:12px;letter-spacing:.12em;cursor:pointer;color:#5b5346}",
    "@media (prefers-reduced-motion:no-preference){.ug-sw[data-open] .ug-card{animation:ug-in .16s ease-out}",
    "@keyframes ug-in{from{transform:translateY(7px);opacity:0}to{transform:none;opacity:1}}}",
  ].join("");
  document.head.appendChild(css);

  var wrap = document.createElement("div");
  wrap.className = "ug-sw";
  wrap.innerHTML =
    '<div class="ug-card" role="dialog" aria-modal="true" aria-label="Unstuck Games">' +
      '<a class="ug-home" href="' + HOME + '"><div><b>UNSTUCK GAMES</b>' +
      "<span>Good games get stuck. We unstick them.</span></div>" +
      '<span class="ug-go">ALL GAMES</span></a>' +
      GAMES.map(function (g) {
        return '<a class="ug-row" href="' + g.href + '"' + (g.id === here ? ' aria-current="page"' : "") + ">" +
          '<span class="ug-ic" style="background:' + g.ink + '">' + g.icon + "</span>" +
          '<span class="ug-t"><b>' + g.name + "</b><span>" + g.note + "</span></span>" +
          '<span class="ug-st" style="color:' + g.ink + '">' + g.status + "</span></a>";
      }).join("") +
      '<div class="ug-foot"><a href="' + HOME + 'updates/">UPDATES</a>' +
      '<button class="ug-shut" type="button">CLOSE</button></div>' +
    "</div>";
  document.addEventListener("DOMContentLoaded", function () { document.body.appendChild(wrap); });

  function open() { wrap.setAttribute("data-open", ""); }
  function shut() { wrap.removeAttribute("data-open"); }
  wrap.addEventListener("click", function (e) {
    if (e.target === wrap || e.target.classList.contains("ug-shut")) shut();
  });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") shut(); });

  // Any link home becomes the picker instead — the game pages already have one
  // in their header, and this way nothing in their markup has to change.
  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest("a");
    if (!a || !a.href) return;
    if (wrap.contains(a)) return; // links inside the picker are real links, including the studio card
    var u = a.href.replace(/\/$/, "");
    if (u === HOME.replace(/\/$/, "") || u === "https://www.unstuck-games.com") {
      e.preventDefault();
      open();
    }
  });
  // Some pages (Orbis, the Elsewhere world) have no link home for the picker to
  // hang off. Give those a small badge of their own, bottom-left, out of the way.
  document.addEventListener("DOMContentLoaded", function () {
    var hasHome = [].slice.call(document.querySelectorAll("a")).some(function (a) {
      var u = (a.href || "").replace(/\/$/, "");
      return u === HOME.replace(/\/$/, "") && !wrap.contains(a);
    });
    if (hasHome) return;
    var b = document.createElement("button");
    b.type = "button";
    b.textContent = "UNSTUCK";
    b.setAttribute("aria-label", "Unstuck Games — all games");
    b.style.cssText = "position:fixed;left:14px;bottom:14px;z-index:9998;background:#1b1a17;color:#ffd23f;" +
      "border:2px solid #ffd23f;border-radius:999px;padding:7px 14px;font:700 11px/1 system-ui,sans-serif;" +
      "letter-spacing:.16em;cursor:pointer;box-shadow:3px 4px 0 rgba(27,26,23,.45)";
    b.addEventListener("click", open);
    document.body.appendChild(b);
  });

  window.unstuckSwitcher = { open: open, close: shut };
})();
