// Unstuck waitlist: posts straight to Kit form 9916999. No Kit script, no popup, no visit tracking.
// Kit accepts cross-origin POSTs (access-control-allow-origin: *) and sends its own double opt-in email.
// Response shape (read from Kit's ck.5.js): { status: "success" | "quarantined", url?, errors?: { messages: [] } }
const KIT_FORM = "https://app.kit.com/forms/9916999/subscriptions";

async function kitSubscribe(email, firstName) {
  const body = new FormData();
  body.append("email_address", email);
  if (firstName) body.append("fields[first_name]", firstName);
  try {
    const res = await fetch(KIT_FORM, { method: "POST", body, headers: { Accept: "application/json" } });
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
