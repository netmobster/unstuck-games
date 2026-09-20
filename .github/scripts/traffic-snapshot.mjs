#!/usr/bin/env node
// Keep GitHub's traffic numbers past the fortnight.
//
// GitHub only serves the last 14 days of views and clones, then deletes them.
// This runs daily, upserts each day's row into metrics/traffic.csv, and keeps
// the top referrers in metrics/referrers.csv. Clones are the closest thing to
// an install count: `/plugin marketplace add` is a git clone.
//
//   GH_TOKEN=... node .github/scripts/traffic-snapshot.mjs
//
// The traffic endpoints need push access, which the default Actions token does
// not have. Set a TRAFFIC_TOKEN secret (fine-grained PAT, Administration:
// read) or the run records stars and forks only and says so.

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";

const repo = process.env.GITHUB_REPOSITORY || "netmobster/unstuck-games";
const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
if (!token) {
  console.error("No token. Set GH_TOKEN.");
  process.exit(78);
}

const api = async (path) => {
  const res = await fetch(`https://api.github.com/repos/${repo}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "unstuck-traffic-snapshot",
    },
  });
  if (res.status === 403 || res.status === 404) return { denied: res.status };
  if (!res.ok) throw new Error(`${path} → HTTP ${res.status}`);
  return res.json();
};

const day = (iso) => iso.slice(0, 10);
const today = day(new Date().toISOString());

const [meta, views, clones, referrers] = await Promise.all([
  api(""),
  api("/traffic/views?per=day"),
  api("/traffic/clones?per=day"),
  api("/traffic/popular/referrers"),
]);

const denied = views.denied || clones.denied;
if (denied) {
  console.error(
    `Traffic endpoints returned ${denied}: the token cannot read traffic. ` +
      "Recording stars and forks only. See the comment at the top of this file.",
  );
}

// ---- traffic.csv: one row per day, upserted ------------------------------
mkdirSync("metrics", { recursive: true });
const FILE = "metrics/traffic.csv";
const HEAD = "date,views,unique_views,clones,unique_clones,stars,forks,captured_at";

const rows = new Map();
if (existsSync(FILE)) {
  for (const line of readFileSync(FILE, "utf8").trim().split("\n").slice(1)) {
    if (line.trim()) rows.set(line.split(",")[0], line);
  }
}

const byDay = new Map();
for (const v of views.views || []) {
  byDay.set(day(v.timestamp), { views: v.count, unique_views: v.uniques });
}
for (const c of clones.clones || []) {
  const row = byDay.get(day(c.timestamp)) || {};
  row.clones = c.count;
  row.unique_clones = c.uniques;
  byDay.set(day(c.timestamp), row);
}
// Stars and forks are a running total, so they only belong on today's row.
byDay.set(today, { ...(byDay.get(today) || {}), stars: meta.stargazers_count, forks: meta.forks_count });

for (const [date, r] of byDay) {
  rows.set(
    date,
    [date, r.views ?? "", r.unique_views ?? "", r.clones ?? "", r.unique_clones ?? "",
     r.stars ?? "", r.forks ?? "", new Date().toISOString()].join(","),
  );
}

const sorted = [...rows.keys()].sort();
writeFileSync(FILE, [HEAD, ...sorted.map((d) => rows.get(d))].join("\n") + "\n");

// ---- referrers.csv: append today's top sources ----------------------------
if (!referrers.denied && Array.isArray(referrers)) {
  const RFILE = "metrics/referrers.csv";
  const RHEAD = "date,source,views,unique_views";
  const existing = existsSync(RFILE)
    ? readFileSync(RFILE, "utf8").trim().split("\n").slice(1).filter((l) => l && !l.startsWith(`${today},`))
    : [];
  const todays = referrers.map((r) => [today, r.referrer, r.count, r.uniques].join(","));
  writeFileSync(RFILE, [RHEAD, ...existing, ...todays].join("\n") + "\n");
}

const t = rows.get(today)?.split(",") || [];
console.log(
  `${today}: ${t[1] || "?"} views, ${t[3] || "?"} clones, ${meta.stargazers_count} stars, ${meta.forks_count} forks`,
);
