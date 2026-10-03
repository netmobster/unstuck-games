#!/usr/bin/env python3
# Copyright (c) 2026 Jeremy Wright. All rights reserved. See LICENSE.txt
"""
live.py - keep the Seren Table live for the whole session

    python scripts/live.py LIVE/<campaign>              # watch + re-render
    python scripts/live.py LIVE/<campaign> --serve 8731 # ...and serve it, so
                                                        # the page reloads itself
    python scripts/live.py LIVE/<campaign> --once       # one render, then exit

------------------------------------------------------------------------------
WHY THIS EXISTS

pieces-table.md, 2026-08-28: "LIVE, NOT STATIC - decided (Jay). It was LIVE
during playtest. It stays live." And then nothing made it so. The Table was
rendered by hand, once, whenever somebody remembered.

DM.md S2 already settled what that is worth:

    THE FIRST FIX WAS A LINE IN THIS FILE SAYING *APPEND BEFORE YOU NARRATE*.
    THAT IS AN INSTRUCTION THE SAME MODEL HAS TO REMEMBER, AND AN INSTRUCTION
    IS NOT A CONTROL.

A DM who re-renders the panel after every roll is the same object as a DM who
logs every roll from memory. It works right up until the hour it does not, and
the failure is silent: a panel that is four scenes stale looks exactly like a
panel that is current. THE PLAYER HAS NO WAY TO TELL.

So: this watches the files the panel is a view over, and re-renders when any of
them moves.

------------------------------------------------------------------------------
WHAT IT WATCHES

Everything render_table.py reads, and nothing else:

    state/party.md      HP, slots, uses, conditions, XP
    state/scene.md      where, present, round, initiative, foes
    state/ledger.jsonl  every roll - the trust surface
    state/facts.jsonl   the Codex, after table.py's filter
    builds/*.md         the Sheet

It does NOT watch fronts.md, rulings.md or canon/antagonists/. Those are the
DM's side of the screen and the renderer refuses to open them, so a change
there must not cause a redraw - a panel that flickers when the DM writes a
front clock is a side channel, even if the clock never renders.

------------------------------------------------------------------------------
THE GATE STILL RUNS, EVERY TIME

render_table.py hands each render to table.py check and DELETES the file rather
than leave a dirty one on disk. That is the property that makes an automatic
re-render safe: the leak check is not something this script can forget either.

If a render is refused, this says so loudly and keeps watching. It does not
retry silently and it does not put the old file back - a missing panel is a
visible failure, and a stale one is not.
"""

import functools  # noqa: F401
import http.server
import os
import socketserver
import sys
import threading
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import render_table                      # noqa: E402
import table as table_gate               # noqa: E402

WATCH_FILES = ("state/party.md", "state/scene.md",
               "state/ledger.jsonl", "state/facts.jsonl",
               "state/bonds.md")   # Elsible bonds, 2026-10-02 - words only on the table
WATCH_GLOBS = ("builds",)
POLL = 1.0


def fingerprint(live_dir):
    """(path, mtime, size) for everything the panel is a view over."""
    fp = []
    for rel in WATCH_FILES:
        p = os.path.join(live_dir, rel)
        try:
            st = os.stat(p)
            fp.append((rel, st.st_mtime_ns, st.st_size))
        except OSError:
            fp.append((rel, None, None))
    for sub in WATCH_GLOBS:
        d = os.path.join(live_dir, sub)
        if not os.path.isdir(d):
            continue
        for name in sorted(os.listdir(d)):
            if not name.endswith(".md"):
                continue
            p = os.path.join(d, name)
            try:
                st = os.stat(p)
                fp.append((sub + "/" + name, st.st_mtime_ns, st.st_size))
            except OSError:
                pass
    return tuple(fp)


def changed(old, new):
    """What actually moved. Named, because 'something changed' is not a log."""
    a, b = dict((x[0], x[1:]) for x in old), dict((x[0], x[1:]) for x in new)
    return sorted(k for k in set(a) | set(b) if a.get(k) != b.get(k))


def render(live_dir, why=""):
    out_path = os.path.join(live_dir, "table.html")
    stamp = time.strftime("%H:%M:%S")
    try:
        html = render_table.build(live_dir)
    except Exception as exc:                       # a half-written state file
        print(f"[{stamp}] BUILD FAILED  {type(exc).__name__}: {exc}")
        print("           the panel on disk is now STALE. Fix and save again.")
        return False
    open(out_path, "w", encoding="utf-8").write(html)

    leaks = table_gate.check_render(out_path, live_dir)
    if leaks:
        # ⛔ missing_ok. Found 2026-08-30 by an actual leak.
        #
        # Two saves a second apart produced two renders; the first refused and
        # removed the file, the second refused and removed it AGAIN. The
        # FileNotFoundError was unhandled, THE WATCHER PROCESS DIED, and from
        # that moment the panel stopped updating silently.
        #
        # ⭐ The gate did its job perfectly and the thing built to run it fell
        # over on the success path. A watcher that dies on the one event it
        # exists to handle is worse than no watcher, because the last thing it
        # printed was "rendered clean".
        try:
            os.remove(out_path)
        except FileNotFoundError:
            pass
        print(f"[{stamp}] REFUSED  {len(leaks)} leak(s) - the file was DELETED.")
        for lk in leaks[:6]:
            print(f"           {lk.what!r}  {lk.why}  [{lk.where}]")
        return False

    size = os.path.getsize(out_path) / 1024 / 1024
    print(f"[{stamp}] rendered  {size:.2f} MB  clean" + (f"   <- {why}" if why else ""))
    return True


def serve(live_dir, port):
    root = os.path.abspath(live_dir)

    class Handler(http.server.SimpleHTTPRequestHandler):
        # ⛔ FIXED 2026-10-02. The page carries no <meta charset> and the default
        # handler sends a bare `text/html`, so browsers read the UTF-8 table as
        # Windows-1252: every em-dash, middle dot and arrow came out as mojibake
        # (seen on the Now tab's rounds stat, and on Elsible's bond arrows).
        extensions_map = {**http.server.SimpleHTTPRequestHandler.extensions_map,
                          ".html": "text/html; charset=utf-8"}

        def __init__(self, *a, **kw):
            super().__init__(*a, directory=root, **kw)

        def log_message(self, *a):
            pass                       # the poll is every 4s; do not narrate it

        def end_headers(self):
            # the page polls this file for a new stamp. A cached response makes
            # the whole live loop silently do nothing.
            self.send_header("Cache-Control", "no-store")
            super().end_headers()

    # ⛔ allow_reuse_address IS WRONG HERE, and it cost half an hour on
    # 2026-08-30. On Windows SO_REUSEADDR lets a SECOND process bind a port
    # that is already served, and requests then land on either one at random.
    #
    # The symptom was a page whose stamp went BACKWARDS - a new render served
    # from one process, the previous build served from the other, alternating.
    # ⭐ A live panel that intermittently serves a stale copy is worse than a
    # static one, because the staleness is invisible and it comes and goes.
    #
    # So: look first, and refuse. Two servers is a mistake, not a race.
    import socket
    probe = socket.socket()
    probe.settimeout(0.4)
    already = probe.connect_ex(("127.0.0.1", port)) == 0
    probe.close()
    if already:
        print(f"           ** port {port} is ALREADY SERVED. Not starting a "
              f"second server -\n              stop the other one, or pass a "
              f"different --serve port.")
        return None

    class Quiet(socketserver.ThreadingTCPServer):
        allow_reuse_address = False
        daemon_threads = True

    try:
        httpd = Quiet(("127.0.0.1", port), Handler)
    except OSError as exc:
        print(f"           ** cannot serve on {port}: {exc}")
        return None
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    print(f"           serving  http://127.0.0.1:{port}/table.html")
    print("           the page polls its own stamp and reloads itself on a new render")
    return httpd


def main(argv):
    # Session content is UTF-8 and Windows consoles default to cp1252. table.py
    # carries this same guard for the same reason: the tooling must never fail
    # for a reason unrelated to the job it is doing. This one died on a marker
    # character while reporting a port clash - a correct diagnosis, lost to an
    # encoder.
    for stream in (sys.stdout, sys.stderr):
        try:
            stream.reconfigure(encoding="utf-8")
        except (AttributeError, ValueError):
            pass

    if len(argv) < 2:
        print(__doc__.strip().split("\n\n")[1], file=sys.stderr)
        return 2
    live_dir = argv[1].rstrip("/\\")
    if not os.path.isdir(live_dir):
        print(f"no such campaign: {live_dir}", file=sys.stderr)
        return 2

    ok = render(live_dir, "initial")
    if "--once" in argv:
        return 0 if ok else 1

    if "--serve" in argv:
        i = argv.index("--serve")
        port = int(argv[i + 1]) if len(argv) > i + 1 and argv[i + 1].isdigit() else 8731
        serve(live_dir, port)

    print(f"           watching {len(WATCH_FILES)} state files + builds/  "
          f"(ctrl-c to stop)")
    fp = fingerprint(live_dir)
    try:
        while True:
            time.sleep(POLL)
            new = fingerprint(live_dir)
            if new != fp:
                moved = changed(fp, new)
                fp = new
                time.sleep(0.15)          # let a multi-write settle
                fp = fingerprint(live_dir)
                render(live_dir, ", ".join(moved))
    except KeyboardInterrupt:
        print("\n           stopped. The panel on disk is the last clean render.")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
