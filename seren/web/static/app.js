/* The table, client side.

   It knows nothing about rules or dice. It sends what you did, and renders the beats the
   server sends back: narration, rolls with their arithmetic showing, and the occasional
   note from the machinery. The world panel is whatever the server says you are allowed to
   know — the fog is enforced there, never here. */

const $ = (id) => document.getElementById(id);
const thread = $("thread"), story = $("story"), say = $("say"), send = $("send");

let busy = false;

const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

function atBottom() {
  return story.scrollHeight - story.scrollTop - story.clientHeight < 120;
}

function add(el) {
  const stick = atBottom();
  thread.appendChild(el);
  if (stick) story.scrollTop = story.scrollHeight;
  return el;
}

function beat(kind, html) {
  const d = document.createElement("div");
  d.className = `beat ${kind}`;
  d.innerHTML = html;
  return add(d);
}

/** A roll, with the numbers it actually used. The honesty is the arithmetic. */
function rollBeat(r) {
  const d = document.createElement("div");
  d.className = "roll";
  const parts = (r.parts || []).map((p) => `<span class="num">${esc(p)}</span>`).join(" ");
  const verdict = r.pass === undefined ? "" :
    `<span class="${r.pass ? "pass" : "fail"}">${r.pass ? "PASS" : "FAIL"}</span>`;
  d.innerHTML = `<span class="what">${esc(r.what || "roll")}</span>${parts}` +
    (r.total !== undefined ? `<span class="num">= ${esc(r.total)}</span>` : "") +
    (r.dc !== undefined ? `<span>vs ${esc(r.dc)}</span>` : "") + verdict;
  return add(d);
}

function render(beats = []) {
  for (const b of beats) {
    if (b.kind === "roll") rollBeat(b);
    else if (b.kind === "you") beat("you", `<b>YOU</b>${esc(b.text)}`);
    else if (b.kind === "note") beat("note", esc(b.text));
    else beat("dm", esc(b.text));
  }
}

function panels(s) {
  if (!s) return;
  if (s.place) $("place").textContent = s.place;
  if (s.when) $("when").textContent = s.when;

  const party = $("party");
  party.innerHTML = (s.party || []).length
    ? s.party.map((p) => `<div><span>${esc(p.name)}</span><span class="hp">${esc(p.state || "")}</span></div>`).join("")
    : '<span class="empty">nobody yet</span>';

  const facts = $("facts");
  facts.innerHTML = (s.facts || []).length
    ? s.facts.map((f) => `<span>${esc(f)}</span>`).join("")
    : '<span class="empty">nothing established</span>';

  const meta = $("meta");
  const bits = [];
  if (s.session) bits.push(`session ${esc(s.session)}`);
  if (s.turns !== undefined) bits.push(`${esc(s.turns)} turns`);
  if (s.spent !== undefined) bits.push(`${esc(s.spent)} spent of ${esc(s.cap ?? "—")}`);
  meta.innerHTML = bits.length ? bits.map((b) => `<span>${b}</span>`).join("") : '<span class="empty">not started</span>';
}

function waiting(on) {
  busy = on;
  send.disabled = on;
  send.textContent = on ? "…" : "DO IT";
  const old = document.getElementById("waiting");
  if (old) old.remove();
  if (on) {
    const d = document.createElement("div");
    d.id = "waiting";
    d.className = "waiting";
    d.innerHTML = "<i></i><i></i><i></i> THE TABLE IS THINKING";
    add(d);
  }
}

async function api(path, body) {
  const res = await fetch(path, {
    method: body ? "POST" : "GET",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 401) { location.href = "/gate"; throw new Error("gate"); }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

async function open() {
  try {
    const s = await api("/api/session", {});
    panels(s);
    render(s.beats);
  } catch (e) {
    beat("note", `THE TABLE IS NOT SET: ${esc(e.message)}`);
  }
}

async function act() {
  const text = say.value.trim();
  if (!text || busy) return;
  say.value = "";
  say.style.height = "auto";
  beat("you", `<b>YOU</b>${esc(text)}`);
  waiting(true);
  try {
    const s = await api("/api/turn", { text });
    waiting(false);
    render(s.beats);
    panels(s);
  } catch (e) {
    waiting(false);
    beat("note", `THE DM STOPPED: ${esc(e.message)}`);
  }
}

send.addEventListener("click", act);
say.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); act(); }
});
say.addEventListener("input", () => {
  say.style.height = "auto";
  say.style.height = Math.min(200, say.scrollHeight) + "px";
});
$("worldbtn")?.addEventListener("click", () => $("aside").classList.toggle("open"));

open();
