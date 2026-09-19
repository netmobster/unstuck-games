#!/usr/bin/env node
// Fetch a D&D Beyond character as raw JSON.
//
//   node ddb-fetch.mjs <url-or-id> [--token=<cobalt bearer>] [--out=path]
//
// Public / link-shared characters need no token. Everything else does:
// see SKILL.md "Getting a token" — it comes from the player's own browser
// session, and it is never written to disk or into the repo.

const args = process.argv.slice(2);
const positional = args.filter((a) => !a.startsWith("--"));
const flag = (name) => {
  const hit = args.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : null;
};

const target = positional[0];
if (!target) {
  console.error("usage: ddb-fetch.mjs <dndbeyond character url or id> [--token=...] [--out=file.json]");
  process.exit(64);
}

const id = (target.match(/(\d{6,})/) || [])[1];
if (!id) {
  console.error(`Could not find a character id in "${target}".`);
  process.exit(64);
}

const token = flag("token") || process.env.DDB_TOKEN || null;
const headers = token ? { Authorization: `Bearer ${token}` } : {};
const url = `https://character-service.dndbeyond.com/character/v5/character/${id}`;

let res;
try {
  res = await fetch(url, { headers });
} catch (err) {
  console.error(`Network error reaching D&D Beyond: ${err.message}`);
  process.exit(69);
}

if (res.status === 403 || res.status === 401) {
  console.error(
    [
      `D&D Beyond refused to share character ${id} (HTTP ${res.status}).`,
      "",
      "That means the sheet is not public and no valid token was supplied.",
      "Two ways forward:",
      "  1. Ask whoever owns the sheet to turn on sharing, or",
      "  2. Supply a token from a browser signed in to an account that can",
      "     see it — SKILL.md, 'Getting a token'.",
    ].join("\n"),
  );
  process.exit(77);
}

if (!res.ok) {
  console.error(`D&D Beyond returned HTTP ${res.status} for character ${id}.`);
  process.exit(69);
}

const body = await res.json();
if (!body?.data?.name) {
  console.error("Response did not contain a character. The id may be wrong.");
  process.exit(65);
}

const out = flag("out");
const json = JSON.stringify(body.data, null, 2);
if (out) {
  const { writeFileSync } = await import("node:fs");
  writeFileSync(out, json);
  console.error(`${body.data.name} → ${out}`);
} else {
  process.stdout.write(json);
}
