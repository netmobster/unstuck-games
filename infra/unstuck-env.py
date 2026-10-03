#!/usr/bin/env python3
"""Write a service's env file on the box from Parameter Store. Never prints a value.

    sudo python3 /srv/unstuck/infra/unstuck-env.py seren
    sudo python3 /srv/unstuck/infra/unstuck-env.py seren --rotate SEREN_COOKIE_SECRET SEREN_SESSION_SECRET

Each parameter under /unstuck/<service>/ becomes NAME="value" in /etc/<service>.env. It
replaces a line with the same name and leaves every other line alone, so a file carried
over from the old box keeps its settings. A name given to --rotate gets a fresh random
value made here, which means that secret only ever exists on the box (a rotated cookie
secret signs everyone out once, which is the point).

The file is root-only. systemd reads it before it drops to ec2-user. The output lists the
names written and where each came from, never the values.
"""
from __future__ import annotations

import argparse
import os
import re
import secrets
import sys
import tempfile

import boto3

REGION = os.environ.get("AWS_REGION", "us-east-2")
NAME = re.compile(r"^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=")


def quoted(value: str) -> str:
    return '"' + value.replace("\\", "\\\\").replace('"', '\\"') + '"'


def from_store(service: str) -> dict[str, str]:
    ssm = boto3.client("ssm", region_name=REGION)
    out: dict[str, str] = {}
    for page in ssm.get_paginator("get_parameters_by_path").paginate(
            Path=f"/unstuck/{service}/", WithDecryption=True, Recursive=False):
        for p in page["Parameters"]:
            out[p["Name"].rsplit("/", 1)[-1]] = p["Value"]
    return out


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("service")
    ap.add_argument("--rotate", nargs="*", default=[], metavar="NAME")
    args = ap.parse_args()

    path = f"/etc/{args.service}.env"
    lines = open(path, encoding="utf-8").read().splitlines() if os.path.exists(path) else []
    values = {k: ("parameter store", v) for k, v in from_store(args.service).items()}
    for k in args.rotate:
        values[k] = ("made here", secrets.token_hex(32))

    kept, seen = [], set()
    for line in lines:
        m = NAME.match(line)
        if m and m.group(1) in values:
            if m.group(1) not in seen:
                kept.append(f"{m.group(1)}={quoted(values[m.group(1)][1])}")
                seen.add(m.group(1))
            continue
        kept.append(line)
    for k, (_, v) in values.items():
        if k not in seen:
            kept.append(f"{k}={quoted(v)}")

    fd, tmp = tempfile.mkstemp(dir="/etc", prefix=f".{args.service}.env.")
    with os.fdopen(fd, "w", encoding="utf-8") as fh:
        fh.write("\n".join(kept) + "\n")
    os.chmod(tmp, 0o600)
    os.replace(tmp, path)

    kept_names = sorted({m.group(1) for m in map(NAME.match, lines) if m} - set(values))
    print(f"{path}: {len(values)} written, {len(kept_names)} kept as they were")
    for k, (where, _) in sorted(values.items()):
        print(f"  {k:<28} {where}")
    if kept_names:
        print("  kept: " + ", ".join(kept_names))
    return 0


if __name__ == "__main__":
    sys.exit(main())
