"""Time passes while you are gone. Free time is time spent playing.

    python web/test_time.py

Rewinds session clocks instead of sleeping, so it runs in about a second.
No server, no network, no AWS.
"""

import os
import sys
from datetime import datetime, timedelta
from pathlib import Path

os.environ["ELSEWHERE_AI"] = "off"
os.environ["ELSEWHERE_OWNER_TOKEN"] = "test-owner-token"
os.environ["ELSEWHERE_SESSION_MINUTES"] = "30"   # the clock tests below need one; 0 is tested at the end
ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from web import game  # noqa: E402

FAILS = []


def check(name, cond, detail=""):
    print(("  PASS  " if cond else "  FAIL  ") + name + (f"  ({detail})" if not cond and detail != "" else ""))
    if not cond:
        FAILS.append(name)


def rewind(sess, hours):
    """Pretend the world was last looked at `hours` ago."""
    s = sess["state"]
    for key in ("last_tick", "created"):
        s[key] = (datetime.fromisoformat(s[key]) - timedelta(hours=hours)).isoformat()


print("the world runs while you are away")
sess = game.new_session(seed=4242)
t0 = sess["state"]["tick"]
rewind(sess, 16)                       # away for sixteen hours
out = game.catch_up(sess)
check("16h away resolves 2 ticks on return", sess["state"]["tick"] - t0 == 2, sess["state"]["tick"] - t0)
check("catch-up reports the ticks it ran", out.get("ticks") == 2, out)
again = game.catch_up(sess)
check("reopening immediately runs nothing more", not again.get("ticks"), again)

print("skip then real time does not double count")
sess = game.new_session(seed=4243)
game.advance(sess, 24)
after_skip = sess["state"]["tick"]
check("skipping 24h runs 3 ticks", after_skip == 3, after_skip)
game.catch_up(sess)                    # real clock is behind the skip
check("real time behind a skip runs nothing", sess["state"]["tick"] == after_skip, sess["state"]["tick"])
check("skip is capped at 72h", (game.advance(game.new_session(seed=1), 9999) or {}).get("ticks", 0) <= 9)

print("free time is play time, not wall clock")
sess = game.new_session(seed=4244)
full = game.remaining(sess)
check("a new world has the full allowance", abs(full - game.SESSION_MINUTES * 60) < 1, full)
sess["last_seen"] = (datetime.fromisoformat(sess["last_seen"]) - timedelta(seconds=30)).isoformat()
game.touch(sess)
check("30s between requests counts as play", 29 <= sess["play_seconds"] <= 31, sess["play_seconds"])
sess["last_seen"] = (datetime.fromisoformat(sess["last_seen"]) - timedelta(hours=9)).isoformat()
before = sess["play_seconds"]
game.touch(sess)
check("nine hours away does not count as play", sess["play_seconds"] == before, sess["play_seconds"])
rewind(sess, 24 * 3)
game.catch_up(sess)
check("a world three days old is still alive", not game.expired(sess))

print("spent free time stops orders, not the world")
sess = game.new_session(seed=4245)
sess["play_seconds"] = game.SESSION_MINUTES * 60
check("thirty minutes of play expires the free tier", game.expired(sess))
t_before = sess["state"]["tick"]
rewind(sess, 24)
game.catch_up(sess)
check("an expired world keeps ticking in real time", sess["state"]["tick"] > t_before, sess["state"]["tick"])
check("an expired world is still viewable", "view" in game.public(sess))

print("owner")
owner = game.new_session(seed=4246, owner_token="test-owner-token")
owner["play_seconds"] = 10 ** 7
check("owner token grants unlimited play", owner["unlimited"] and not game.expired(owner))
check("owner public payload has no countdown", game.public(owner)["minutes_left"] is None)
stranger = game.new_session(seed=4247, owner_token="wrong")
check("a wrong token grants nothing", not stranger["unlimited"])
check("no token grants nothing", not game.new_session(seed=4248)["unlimited"])

print("no clock (ELSEWHERE_SESSION_MINUTES=0, the default)")
game.SESSION_MINUTES = 0
sess = game.new_session(seed=4249)
sess["play_seconds"] = 10 * 3600         # ten hours with the tab open
check("with no clock, play time never expires a world", not game.expired(sess))
pub = game.public(sess)
check("with no clock, there is no countdown", pub["minutes_left"] is None, pub["minutes_left"])
check("with no clock, a stranger is still not unlimited", pub["unlimited"] is False, pub["unlimited"])
check("the payload says how many briefings a world gets", pub["max_calls"]["narrate"] == game.MAX_CALLS["narrate"])
sess["calls"]["narrate"] = game.MAX_CALLS["narrate"]
check("a stranger past the narrator cap gets plain reports", not game.spend_ok(sess, "narrate"))
owner = game.new_session(seed=4250, owner_token="test-owner-token")
owner["calls"]["narrate"] = 99
owner["spend_usd"] = 5.0
check("the owner skips the call and spend caps", game.spend_ok(owner, "narrate"))
game.SESSION_MINUTES = 30

# tidy the sessions this wrote
for p in game.SESS.glob("*.json"):
    try:
        if game.load_session(p.stem)["state"]["seed"] in {4242, 4243, 4244, 4245, 4246, 4247, 4248, 4249, 4250, 1}:
            p.unlink()
    except Exception:
        pass

print()
if FAILS:
    print(f"  ===> FAIL  ({len(FAILS)} failing)")
    sys.exit(1)
print("  ===> PASS")
