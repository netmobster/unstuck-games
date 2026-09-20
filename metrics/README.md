# metrics

GitHub serves the last 14 days of traffic and then deletes it. The `traffic`
workflow runs daily and keeps it here instead.

- **`traffic.csv`** — one row per day: views, unique views, clones, unique
  clones, and the running star and fork counts.
- **`referrers.csv`** — where the views came from that day. This is how you tell
  whether a post did anything.

**Clones are the closest thing to an install count.**
`/plugin marketplace add netmobster/unstuck-games` is a git clone, so a bump in
clones without a matching bump in views is usually someone installing the
plugin rather than reading the repo. Your own CI and checkouts land in the same
number, so read the trend, not the total.

Backfill isn't possible. Anything older than the first row is gone.

## The one manual step

The traffic endpoints need push access, which the token Actions provides by
default does not have. Without a token the job still records stars and forks,
and says so in the log.

To get views and clones: create a fine-grained personal access token scoped to
this repository with **Administration: read**, and add it as the repository
secret **`TRAFFIC_TOKEN`**.
