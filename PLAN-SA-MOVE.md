# Unstuck Games moves into SA's AWS account

16 Nov 2026 (CC-139). Jay picked **Full move** over borrowing SA's Bedrock from UG's own account.
**Approved 16 Nov:** "YES JAY APPROVES of plan", and "YES BRAD APPROVES", relayed by Jay after his
call with Brad (P0 done). Every `-Live` is still Jay's to run.

## Running P2 (Jay, PowerShell, from this repo after the PR merges)

Sign in to both accounts first: `aws login` (old) and `aws sso login --profile selfactual` (SA).
Run each line dry first, then again with `-Live`.

```
.\infra\sa-account.ps1 -AlertEmail <your email>     # builds UG's corner of SA's account, launches the box
.\infra\box.ps1 copy-params                         # /unstuck/* settings, old account -> SA, never printed
.\infra\box.ps1 carry-out                           # the old box packs its state into the old bucket
.\infra\box.ps1 carry-copy                          # old bucket -> SA bucket, through this computer
.\infra\box.ps1 carry-in                            # the SA box unpacks it
.\infra\box.ps1 check -Box sa                       # Nova must answer "ready"
.\infra\box.ps1 units -Box sa
.\infra\box.ps1 nginx -Box sa
.\infra\box.ps1 seren-start -Box sa
.\infra\box.ps1 elsewhere-start -Box sa
.\infra\box.ps1 bunny-start -Box sa
```

After `sa-account.ps1 -Live`, wait about 5 minutes for the first boot (bootstrap.sh) before
`check`. The env files and certificate are carried over, so nobody is signed out, Bunny's links
keep working, and DNS can flip with no certificate gap. Then P3: CC fills in IONOS in Chrome,
and Jay saves.

## Why

SEREN and Elsewhere already call Bedrock (Nova Micro, Lite and Pro through `us.` inference profiles,
in `seren/web/llm.py` and `elsewhere/web/ai.py`). They broke only because UG's account `968053968391`
has every Bedrock quota at 0 (AWS case 179104816100756). `ai-status.json` has been `"ok": false`
since.

SA's account `962000089613` has real quota in **us-east-2, UG's own region** (read 16 Nov):

| Model (cross-region) | Tokens per minute |
|---|---|
| Nova Micro | 8M |
| Nova Lite | 8M |
| Nova Pro | 2M (plus 1M on demand) |
| Claude Haiku 4.5 | 5M |
| Claude Sonnet 4.6 | 6M |

So the games need **no AI code change**: the same model ids work as soon as they run in SA's account.

**Not a new AWS account.** A new account under SA's org starts with Bedrock quota at 0, which is
the trap that broke UG in the first place.

## Isolated inside SA's account

| | UG | SA |
|---|---|---|
| Region | us-east-2 | us-west-2 (prod) |
| Instance | its own t4g.small, tagged `Project=unstuck` | untouched |
| IAM role | `unstuck-web` (see below) | untouched |
| Parameter Store | `/unstuck/*` only | `/prod/*`, `/staging/*` |
| Bucket | `unstuck-box-962000089613` | untouched |
| Security group | `unstuck-web`: 80 and 443 only, no SSH | untouched |
| Budget | "Unstuck monthly", $25, filtered to `Project=unstuck` | untouched |

`unstuck-web` can only do these things:
- SSM: run commands on the box (`AmazonSSMManagedInstanceCore`)
- Bedrock: `InvokeModel` and `Converse` on Nova and Claude models and their `us.` inference profiles
- SES: send from `unstuck-games.com`
- Parameter Store: read `/unstuck/*`
- S3: use its own bucket

No other IAM, no SA parameters, no SA buckets.

**Shared, and worth saying out loud:** Bedrock quota is per account and per region. UG draws from
the same us-east-2 pool as any SA us-east-2 traffic, though SA prod calls from us-west-2. The
quotas above are far above what UG uses: one Elsewhere session is about 1.5¢, with a $0.20 cap per
session enforced on the server.

## Cost to SA (honest number)

| Item | Per month |
|---|---|
| t4g.small | about $12 |
| Elastic IP | about $3.60 |
| 8 GB gp3 disk | about $0.70 |
| Bucket | pennies |
| Bedrock | 1.5¢ per Elsewhere session, SEREN similar |
| **Total, before AI play** | **about $17** |

That's more than the "$5/month" said earlier. AWS credits cover it while SA has them.
**Aurora is not recreated**: nothing uses it.

## Phases

Each phase ends in a live switch, then Slack and Team Docs (the phased plan protocol).

### P0. Brad's OK (Jay)

It's SA's shared account and Brad is the billing contact, so this goes through #ai-rooms or a DM
before anything is created in it. The draft says: what moves, the isolation table, ~$17/month, and
that nothing touches us-west-2.

### P1. Prepare (code only, one PR to `netmobster/unstuck-games`)

1. `infra/box.ps1`: add an `sa` box to the box table (profile `selfactual`, account
   `962000089613`, bucket `unstuck-box-962000089613`) and a `-Box sa|old` switch. The default stays
   `old` until P3.
2. New `infra/sa-account.ps1`, **dry by default**, `-Live` to run, refuses any account but
   `962000089613`. It creates: the bucket, the `unstuck-web` role and instance profile with the
   policy above, the security group in the default VPC, an Elastic IP, and the budget. Everything is
   tagged `Project=unstuck`. It is idempotent: a second run changes nothing.
3. New step `box.ps1 copy-params`: copies every `/unstuck/*` parameter from the old account to SA's
   as SecureStrings, value to value, **never printed**.
4. New steps `box.ps1 carry-out` (old box) and `carry-in` (new box). They move the runtime state
   through the two buckets:
   - `/srv/seren`
   - `/srv/contact`
   - `/srv/bunny`
   - Elsewhere's untracked world state under `/srv/unstuck/elsewhere`
   - `/srv/cache`
   - `/etc/letsencrypt`, so the certificate carries over and DNS can flip with no gap
5. `INFRA.md`: the new account, the isolation table, the money.

Jay merges. Nothing is created yet.

### P2. Build the new box (live switch 1, nothing public changes)

1. `sa-account.ps1` (dry, then `-Live`), as Jay with the `selfactual` profile.
2. Launch the instance with `bootstrap.sh` as user data, then attach the Elastic IP. The step is
   printed by `sa-account.ps1`; Jay runs it.
3. `copy-params`, then `carry-out` on the old box and `carry-in` on the new one.
4. `seren-env`, `elsewhere-env`, `seren-start`, `elsewhere-start`, `units`, `nginx`, `feed`.
5. `box.ps1 check -Box sa`: services, the certificate, and **Nova answers "ready"**. Then each
   game address is checked against the new IP with `curl --resolve`, before DNS moves.

### P3. Flip DNS (live switch 2)

1. A final `carry-out` and `carry-in`, so the saves and contact messages are current.
2. At IONOS, point the 10 A records at the new Elastic IP. CC fills them in Chrome; Jay saves.
   The TTLs are already 1 to 5 minutes.
3. SES in SA's account: the `unstuck-games.com` domain identity plus three new DKIM CNAMEs at IONOS,
   and verify `wearecleardigital@gmail.com`. The sandbox is fine, because the contact form only
   ever sends to that address.
4. `ai-status.json` → `"ok": true`, then `pull`. SEREN and Elsewhere narrate again.
5. `box.ps1`'s default box becomes `sa`.

The old box stays up, untouched, as the rollback: point DNS back.

### P4. Retire the old account (live switch 3, about a week later)

Stop the old instance, release its Elastic IP, delete `unstuck-db`, and empty and delete the old
bucket. That ends UG's own AWS bill.

## Approvals

- **P1** is additive: a PR, nothing deployed. Jay's approval only.
- **P2–P4** create and change resources in SA's shared account and move a public site, so **both
  approvals** are needed (YES JAY APPROVES + YES BRAD APPROVES), each phase on its own.
- Every `-Live` is Jay's to run. CC never runs anything on either box.

## Not in this plan

- Moving the games to Claude (Haiku 4.5 or Sonnet 4.6) instead of Nova. SA's quota allows it, and
  it's an env change per game (`SEREN_MODEL_*`, `ELSEWHERE_*_MODEL`). It's a separate decision,
  after P3.
- Other games: only SEREN and Elsewhere call an AI. The rest are static.
