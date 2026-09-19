# Where everything runs

Rewritten 2026-09-16. The old version described GitHub Pages and a Cloudflare tunnel on
Jay's desktop; none of that is true any more.

**One box, one repo, one config.** Everything at unstuck-games.com is served from a single
EC2 instance that holds a checkout of this repo. Deploying is `git pull` on the box. The
files needed to rebuild the box from nothing are in [`infra/`](infra/).

## Addresses

| Address | What | Served as |
|---|---|---|
| `unstuck-games.com` (and `www.`) | Studio site: home, updates, about, contact, teardowns | files from the repo root |
| `orbis.unstuck-games.com` | Orbis | files from `orbis/` |
| `badmonkeys.unstuck-games.com` | Bad Monkeys | files from `bad-monkeys/` |
| `ferretbowling.unstuck-games.com` | Ferret Bowling page; the game at `/play/` | files from `ferret-bowling/` |
| `elsewhere.unstuck-games.com` | Elsewhere page; the world at `/play` behind a password | files from `elsewhere/`, plus the Elsewhere service |
| `deadline.unstuck-games.com` | Deadline Dungeon (game #4): holding page, design docs | files from `deadline-dungeon/` |
| `seren.unstuck-games.com` | SEREN, the AI-DM table, behind a password | the SEREN service; content from `/srv/seren`, never the repo |

**Old links still work.** `unstuck-games.com/orbis/…`, `/bad-monkeys/…`, `/ferret-bowling/…`
and `/elsewhere/…` permanently redirect to the same path on the game's own address.

**Shared files.** `switcher.js` (the studio picker), `kit-waitlist.js` and `favicon.svg`
live at the repo root and nginx serves them on every game address.

## The box

| | |
|---|---|
| Instance | EC2 t4g.small `i-0da082b463daa7314`, **us-east-2** (Ohio) |
| Public IP | Elastic IP `3.23.50.161` |
| DNS | IONOS: **one A record per name** (apex, `www`, `orbis`, `badmonkeys`, `ferretbowling`, `elsewhere`, `deadline`), all to the Elastic IP. **There is no wildcard**, so a new game needs its own record before its certificate. |
| Firewall | Security group allows 80 and 443 only. **No SSH** — every remote command goes through SSM `send-command`. |
| Identity | Instance role `unstuck-web`: SSM, `bedrock:InvokeModel`, `ses:SendEmail`. No keys on disk. |
| TLS | One Let's Encrypt certificate for all eight names, `certbot certonly --webroot -w /srv/unstuck`. Renews on its own timer; every host serves `/.well-known/acme-challenge/` from the same folder so renewal keeps working. |

## Services

| Service | Port | What it does | Unit |
|---|---|---|---|
| nginx | 80, 443 | Everything public. Canonical config: [`infra/nginx/unstuck.conf`](infra/nginx/unstuck.conf) → `/etc/nginx/conf.d/unstuck.conf` | system package |
| `elsewhere` | 8765 | The Elsewhere world: password gate, sessions, Bedrock calls | [`infra/systemd/elsewhere.service`](infra/systemd/elsewhere.service) |
| `unstuck-contact` | 8770 | Contact form: stores every message to `/srv/contact`, then sends via SES. Also takes "ask for a key" from the Elsewhere door. | [`infra/systemd/unstuck-contact.service`](infra/systemd/unstuck-contact.service) |
| `unstuck-feed.timer` | — | Daily: caches the Substack feed to `/srv/cache/feed.json` for the updates page | [`.service`](infra/systemd/unstuck-feed.service), [`.timer`](infra/systemd/unstuck-feed.timer) |

**Secrets** live in `/etc/elsewhere.env` on the box and nowhere else. The names are in
[`infra/elsewhere.env.example`](infra/elsewhere.env.example). `ELSEWHERE_COOKIE_SECRET` is
pinned so a restart does not sign everyone out; changing it, or the password, does.

## Deploying

From a machine with `aws login` done:

```bash
aws ssm send-command --region us-east-2 --instance-ids i-0da082b463daa7314 \
  --document-name AWS-RunShellScript \
  --parameters 'commands=["cd /srv/unstuck && git pull --ff-only"]'
```

- **Static pages and games:** that's it. HTML, JS and JSON are served `no-cache`, so a
  deploy shows up on the next reload.
- **Games with a build step** (Ferret Bowling): build locally first
  (`bun run build` in `games/lucy-proto`, output goes to `ferret-bowling/play/`) and commit
  the output.
- **Elsewhere server code** (`elsewhere/web/*.py`, including the password page): also
  `systemctl restart elsewhere`.
- **SEREN server code** (`seren/web/*`): also `systemctl restart seren`. Its content
  (corpus, campaign, `library/srd-5.2`) lives in `/srv/seren` and is copied there by hand;
  it is private and never enters the repo.
- **nginx config:** edit `infra/nginx/unstuck.conf`, copy it to the box, then
  `nginx -t && systemctl reload nginx`. The file in the repo is the source of truth; never
  hand-edit the one on the box.

## Rebuilding the box from nothing

1. Launch an arm64 Amazon Linux instance with role `unstuck-web`, a security group for 80
   and 443, and move the Elastic IP to it.
2. Install nginx, git, python3, certbot and boto3.
3. `git clone` this repo to `/srv/unstuck`, then
   `git config --system --add safe.directory /srv/unstuck`.
4. Copy `infra/nginx/unstuck.conf` into `/etc/nginx/conf.d/`, and `infra/systemd/*` into
   `/etc/systemd/system/`. Create `/etc/elsewhere.env` from the example with real values.
   Create `/srv/cache` and `/srv/contact`, owned by `ec2-user`.
5. Issue the certificate:
   `certbot certonly --webroot -w /srv/unstuck --cert-name unstuck-games.com -d unstuck-games.com -d www.unstuck-games.com -d orbis.unstuck-games.com -d badmonkeys.unstuck-games.com -d ferretbowling.unstuck-games.com -d elsewhere.unstuck-games.com -d deadline.unstuck-games.com -d seren.unstuck-games.com`
   (nginx must be running for this, so start it with the TLS server blocks commented out,
   then restore them.)
6. `systemctl enable --now elsewhere unstuck-contact unstuck-feed.timer`, then
   `systemctl reload nginx`.

## Money

- AWS account "Just Ship It" (970376923067) holds **$100 of Free Tier credit to
  8 August 2027**, covering both EC2 and Bedrock.
- Elsewhere narrates on Amazon Nova Pro and interprets on Nova Micro, with a hard spend cap
  of **$0.20 per session** enforced on the server. A measured full session costs about
  1.5¢.
- Local AWS credentials come from `aws login` and expire. When a command says the session
  expired, run it again and approve in the browser; keep the terminal open until it
  confirms.

## Not done yet

- **Mail forwarding** for anything@unstuck-games.com (SES receiving plus a forwarder). It
  changes MX records, so it gets its own slot.
