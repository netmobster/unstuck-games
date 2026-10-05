# Where everything runs

Rewritten 2026-10-05, after the move to the new box. The version before it described the
old box in account 970376923067, which is out of reach (see [the old account](#the-old-account)).

**One box, one repo, one config.** Everything at unstuck-games.com is served from a single
EC2 instance that holds a checkout of this repo. Deploying is `git pull` on the box. The
files needed to rebuild the box from nothing are in [`infra/`](infra/), and every command
on the box goes through [`infra/box.ps1`](infra/box.ps1), which a person runs.

## Addresses

| Address | What | Served as |
|---|---|---|
| `unstuck-games.com` (and `www.`) | Studio site: home, updates, about, contact, teardowns | files from the repo root |
| `orbis.unstuck-games.com` | Orbis | files from `orbis/` |
| `badmonkeys.unstuck-games.com` | Bad Monkeys | files from `bad-monkeys/` |
| `ferretbowling.unstuck-games.com` | Ferret Bowling page; the game at `/play/` | files from `ferret-bowling/` |
| `elsewhere.unstuck-games.com` | Elsewhere page; the world at `/play` behind a password | files from `elsewhere/`, plus the Elsewhere service |
| `deadline.unstuck-games.com` | Deadline Dungeon (game #4): holding page, design docs | files from `deadline-dungeon/` |
| `last-warren.unstuck-games.com` | The Last Warren (game #5): the diary, and the game at `/play/` | files from `the-last-warren/`; `/play/` is a single-file build of `games/the-last-warren/` |
| `elsible.unstuck-games.com` | Elsible (in design): a holding page, and the deal prototype (deck v4) at `/play/` | files from `elsible/site/`. `/play/` is built by `python elsible/prototype/build.py --publish` |
| `seren.unstuck-games.com` | SEREN, the AI-DM table, behind a door: Google sign-in for the guest list, or the password | the SEREN service; content from `/srv/seren`, never the repo |

**Old links still work.** `unstuck-games.com/orbis/…`, `/bad-monkeys/…`, `/ferret-bowling/…`
`/elsewhere/…` and `/the-last-warren/…` permanently redirect to the same path on the game's own address.

**Shared files.** `switcher.js` (the studio picker), `kit-waitlist.js` and `favicon.svg`
live at the repo root and nginx serves them on every game address. So do `ai-notice.js` and
`ai-status.json` on SEREN and Elsewhere (see [the AI notice](#the-ai-notice)).

## The box

| | |
|---|---|
| Account | `968053968391`, us-east-2 (Ohio). Console sign-in `https://968053968391.signin.aws.amazon.com/console`, IAM user `jay` |
| Instance | EC2 t4g.small `i-071b14e3c340dca70`, Amazon Linux 2023, arm64 |
| Public IP | Elastic IP `18.225.22.191` |
| DNS | IONOS: **one A record per name** (apex, `www`, `orbis`, `badmonkeys`, `ferretbowling`, `elsewhere`, `deadline`, `seren`, `last-warren`, `elsible`), all to the Elastic IP, with TTLs of 1 to 5 minutes from the move. **There is no wildcard**, so a new game needs its own record before its certificate. The three `_domainkey` CNAMEs are SES's (see [Mail](#mail)) |
| Firewall | Security group `sg-01399df85b8ad952a`: 80 and 443 only. **No SSH**: every remote command goes through SSM, by `box.ps1` |
| Identity | Instance role `unstuck-web`: SSM, Nova on Bedrock, SES send, `/unstuck/*` in Parameter Store, its bucket. No keys on disk |
| TLS | One Let's Encrypt certificate, `--cert-name unstuck-games.com`, for all ten names. Renews on its own timer (`certbot-renew-unstuck.timer`); every host serves `/.well-known/acme-challenge/` from `/srv/unstuck` so renewal keeps working |
| Python | 3.11 for every service (`/usr/bin/python3.11`). The distro's 3.9 stays for the system's own tools and certbot |
| Bucket | `unstuck-box-968053968391`: private, versioned. Files carried onto the box go in `transfer/` |
| Database | Aurora Postgres 17 `unstuck-db`, serverless v2. It pauses to zero when idle, is private, only the box can reach it, and nothing uses it yet |

## Services

| Service | Port | What it does | Unit |
|---|---|---|---|
| nginx | 80, 443 | Everything public. Canonical config: [`infra/nginx/unstuck.conf`](infra/nginx/unstuck.conf) → `/etc/nginx/conf.d/unstuck.conf` | system package |
| `seren` | 8790 | SEREN: the door, Google sign-in, the table, Bedrock calls | [`infra/systemd/seren.service`](infra/systemd/seren.service) |
| `elsewhere` | 8765 | The Elsewhere world: password gate, sessions, Bedrock calls | [`infra/systemd/elsewhere.service`](infra/systemd/elsewhere.service) |
| `unstuck-contact` | 8770 | Contact form: stores every message to `/srv/contact`, then sends it through SES. Also takes "ask for a key" from the Elsewhere door | [`infra/systemd/unstuck-contact.service`](infra/systemd/unstuck-contact.service) |
| `unstuck-feed.timer` | — | Daily: caches the Substack feed to `/srv/cache/feed.json` for the updates page | [`.service`](infra/systemd/unstuck-feed.service), [`.timer`](infra/systemd/unstuck-feed.timer) |

**When SEREN or Elsewhere isn't answering** (a restart, a crash), nginx serves a "moving
house" page with a 503 instead of a bare error: [`infra/holding/moving.html`](infra/holding/moving.html).

## Settings and secrets

**They live in Parameter Store, under `/unstuck/<service>/*`, and nowhere in the repo.**
`box.ps1 seren-env` and `elsewhere-env` run [`infra/unstuck-env.py`](infra/unstuck-env.py)
on the box, which writes them to `/etc/<service>.env` and never prints a value. The names
are in [`infra/seren.env.example`](infra/seren.env.example) and
[`infra/elsewhere.env.example`](infra/elsewhere.env.example).

- **Passwords** (`SEREN_PASSWORD`, `ELSEWHERE_PASSWORD`) are put in Parameter Store by a
  person, as SecureStrings. Changing one means running that service's `-env` and `-start`
  steps again.
- **Cookie and session secrets** are made on the box the first time (`--ensure`) and then
  kept, so a restart doesn't sign anyone out. Changing one does.
- **SEREN's Google sign-in:** the OAuth client "SEREN web" is in Google Cloud project
  `seren-509216`. Its client ID and secret are `SEREN_GOOGLE_CLIENT_ID` and
  `SEREN_GOOGLE_CLIENT_SECRET`. **Two lists decide who gets in**: `SEREN_ALLOW` (a comma
  list of emails; anyone else is turned away at the door), and, while the app's publishing
  status is "Testing", its test users under Audience. An address needs to be on both.

## The AI notice

`ai-status.json` at the repo root is one switch for every game that needs the narrator.
While it says `"ok": false`, [`ai-notice.js`](ai-notice.js) shows its message once per visit
on SEREN's table and Loom and on Elsewhere's world. **Today it is off because the account's
Bedrock quotas are all 0** (AWS case 179104816100756). When Amazon raises them, set `"ok"`
to `true` and pull.

## Mail

- **SES**, us-east-2, still in the sandbox: 200 messages a day, and only to verified
  addresses.
- **Identities:** the domain `unstuck-games.com`, signed with Easy DKIM through three
  `_domainkey` CNAMEs at IONOS, and `wearecleardigital@gmail.com`.
- **The contact form** sends from `hello@unstuck-games.com` to
  `wearecleardigital@gmail.com`, with Reply-To set to the visitor. Mail from the domain
  itself is what keeps Gmail from flagging it as unverified. Nothing receives mail at
  `hello@`; replies go to the visitor.

## Deploying

Every step below is `.\infra\box.ps1 <step>` (a dry run, which prints what it would send),
then the same with `-Live`. It needs `aws login` done first.

- **Static pages and games:** `pull`. HTML, JS and JSON are served `no-cache`, so a deploy
  shows up on the next reload.
- **Games with a build step** (Ferret Bowling): build locally first
  (`bun run build` in `games/lucy-proto`, output goes to `ferret-bowling/play/`) and commit
  the output.
- **The Last Warren:** `node scripts/bundle.mjs ../../the-last-warren/play/index.html --full`
  in `games/the-last-warren`, then commit `the-last-warren/play/index.html`. One file, no
  build tools, everything inlined.
- **SEREN or Elsewhere server code:** `pull`, then `seren-start` or `elsewhere-start`.
  SEREN's content (corpus, `library/srd-5.2`) lives in `/srv/seren`: it is private, never
  enters the repo, and is carried there by `seren-content` from the bucket.
- **nginx config:** edit `infra/nginx/unstuck.conf`, `pull`, then `nginx`. It tests the
  config and puts the old one back if the test fails. The file in the repo is the source
  of truth; never hand-edit the one on the box.
- **systemd units:** edit `infra/systemd/*`, `pull`, then `units`. It restarts only what
  changed, and puts every changed unit back if one of them won't stay up.
- **Read-only:** `check` (services, certificate, Nova through the box's role) and
  `contact-log`.

## Rebuilding the box from nothing

1. Launch an arm64 Amazon Linux 2023 instance with role `unstuck-web`, the security group,
   and [`infra/bootstrap.sh`](infra/bootstrap.sh) as its user data, then move the Elastic
   IP to it. The bootstrap installs everything, checks out the repo to `/srv/unstuck`,
   puts the units in place and starts nginx on port 80 alone.
2. `box.ps1 cert`: the certificate for every name whose DNS already points at the box,
   then the full nginx config.
3. `seren-content`, `seren-env`, `seren-start`, then `elsewhere-env` and `elsewhere-start`.
4. `feed`, then `check`.

## Money

- **Credits:** $179.65 left on 5 Oct 2026, from the new-account credit activities
  (Bedrock playground, Lambda, RDS and a budget done; EC2 still in progress).
- **Budget:** "Unstuck monthly", $25.
- Elsewhere narrates on Amazon Nova Pro and interprets on Nova Micro, with a hard spend cap
  of **$0.20 per session** enforced on the server. A measured full session costs about
  1.5¢.
- Local AWS credentials come from `aws login` and expire. When a command says the session
  expired, run `aws login` again and approve in the browser.

## The old account

**`970376923067` ("Just Ship It") is out of reach since the laptop compromise**, so nothing
on the old box (`i-0da082b463daa7314`, `3.23.50.161`) could be copied. SEREN's player
saves, Elsewhere's world and the contact archive stayed there; contact mail had also gone
to Gmail. The old box can't be switched off from our side: it stops when that account is
recovered or closed. **Every secret that lived on it counts as exposed**, and none of them
is used on the new box.

## Not done yet

- **Bedrock quotas**: waiting on AWS case 179104816100756. Then flip `ai-status.json`.
- **Mail forwarding** for anything@unstuck-games.com (SES receiving plus a forwarder). It
  changes MX records, so it gets its own slot.
