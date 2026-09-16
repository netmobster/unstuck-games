# Where the games actually run

Short version: everything except Elsewhere-web is static files on GitHub Pages, free forever.
Elsewhere-web is the one exception, and it currently runs on Jay's desktop.

## Now

| Thing | Where it runs | Address | Costs |
|---|---|---|---|
| Unstuck Games site, Orbis, Bad Monkeys, Ferret Bowling | GitHub Pages, from `main` in this repo | netmobster.github.io/unstuck-games | nothing, ever |
| Elsewhere (Claude Code version) | the player's own machine | `/elsewhere` in Claude Code | nothing |
| **Elsewhere (browser version)** | **Jay's desktop**, Python server on port 8765 | a temporary Cloudflare quick tunnel | inference only |

**What the tunnel is.** `cloudflared tunnel --url http://localhost:8765` opens an outbound
connection from the desktop to Cloudflare's edge. Cloudflare then answers a random
`*.trycloudflare.com` hostname on our behalf and passes traffic down that connection. So:

- No port is opened on the router, and **the home IP is never published** — visitors see
  Cloudflare, not the house.
- HTTPS is free and automatic, which is why the shared password isn't crossing the
  internet in the clear.
- **The hostname changes every restart**, and everything stops when the desktop sleeps or
  either window closes. Fine for playtesters. Not a launch.

**Starting it** (two terminals, region matters — the account's Bedrock lives in Ohio):

```
$env:AWS_REGION="us-east-2"; $env:ELSEWHERE_PASSWORD="..."; python web/server.py
cloudflared tunnel --url http://localhost:8765
```

The password gate is server-side, so the API is behind it too and nobody can skip the door
and spend Bedrock money (`web/gate.py`).

## Money

- AWS account "Just Ship It" (970376923067) holds **$100 of Free Tier credit, expiring
  8 August 2027**, and Bedrock is on the covered-services list.
- Credentials come from `aws login` — short-lived, tied to the console session, no access
  key stored on disk. They expire; re-run it when Bedrock calls start failing.
- Measured, not estimated: one interpret call cost **$0.00009**. A full 30-minute session
  should land near a cent or two against a $0.20 cap. The credit is thousands of sessions.

## Friday: a real domain

Filed 2026-09-15. The job, in order:

1. **Buy the domain** (Jay picks it). Register it, or move its DNS, to **Cloudflare** —
   that's what makes step 3 possible and it's free at the plan we need.
2. **Point the Unstuck site at it.** GitHub Pages takes a custom domain: a `CNAME` file in
   this repo plus DNS records. Nothing about how the site is built changes.
3. **Give Elsewhere a fixed address** — a *named* Cloudflare tunnel instead of the random
   one, e.g. `elsewhere.<domain>`. Same free tunnel, but the address stops changing and can
   be shared in advance.
4. **Keep the password gate.** A stable address means strangers can find it.

Not needed for any of this: a server we pay for, a static IP, or opening anything on the
home router.

Later, if Elsewhere-web outgrows the desktop: a small always-on box (EC2 in the same
account, an IAM role instead of credentials on disk) is the obvious next step — and the
$100 credit covers that too. No reason to spend it yet.
