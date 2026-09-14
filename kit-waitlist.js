// Unstuck waitlist: posts straight to Kit form 9916999. No Kit script, no popup.
// Kit accepts cross-origin POSTs and sends its own double opt-in email.
// Kit answers "success" even to posts it later discards, so we send exactly what Kit's own ck.5.js sends
// (read from ck.5.js v6): token (empty: recaptcha is off), referrer, host, search, a stable visitor id,
// ckjs_version, and the X-CKJS-Version header.
// Response shape: { status: "success" | "quarantined", url?, errors?: { messages: [] } }
const KIT_FORM = "https://app.kit.com/forms/9916999/subscriptions";

function kitVisitor() {
  const k = "unstuck:kit-visitor";
  try {
    let id = localStorage.getItem(k);
    if (!id) { id = crypto.randomUUID(); localStorage.setItem(k, id); }
    return id;
  } catch { return crypto.randomUUID(); }
}

async function kitSubscribe(email, firstName) {
  const body = new FormData();
  body.append("email_address", email);
  if (firstName) body.append("fields[first_name]", firstName);
  body.append("token", "");
  body.append("referrer", document.referrer);
  body.append("host", document.location.href);
  body.append("search", document.location.search);
  body.append("user", kitVisitor());
  body.append("ckjs_version", "6");
  try {
    const res = await fetch(KIT_FORM, { method: "POST", body, headers: { Accept: "application/json", "X-CKJS-Version": "6" } });
    if (!res.ok) return { ok: false, message: `Kit said ${res.status}${res.statusText ? ` (${res.statusText})` : ""}. Nothing was saved.` };
    const j = await res.json();
    if (j.status === "success") return { ok: true };
    // Kit wants a human check before it accepts this one; it hands us the page to do it on
    if (j.status === "quarantined" && j.url) return { ok: false, check: j.url };
    const msgs = (j.errors && j.errors.messages) || [];
    return { ok: false, message: msgs.join(" ") || "Kit said no and didn't say why. Nothing was saved." };
  } catch {
    return { ok: false, message: "Couldn't reach Kit. Nothing was sent. Try again in a minute." };
  }
}
