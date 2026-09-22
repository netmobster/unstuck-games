#!/bin/bash
# seren-mcp on the box: a separate directory, a separate venv, nothing shared that can break.
#
# Run through SSM (INFRA.md: no SSH). Needs the branch pushed first: it checks out
# `seren/mcp-phase0` as a git WORKTREE of /srv/unstuck, so the live checkout's working tree
# is never touched and a `git pull` there can't change what this runs.
#
# ⛔ What this does NOT do:
#   - touch /srv/seren (live player data). It plays against its own staged fixture.
#   - touch the `seren` service, or nginx. Nothing is reachable from outside the box.
#   - start anything. The unit is installed disabled; starting it is a human step.
set -euo pipefail

BRANCH="seren/mcp-phase0"
DIR=/srv/seren-mcp
PY=python3.12

echo "== python"
if ! command -v $PY >/dev/null; then
  dnf install -y python3.12 python3.12-pip   # additive; the system python3 (3.9) is unchanged
fi
$PY --version

echo "== worktree"
cd /srv/unstuck
git fetch origin "$BRANCH"
if [ -d "$DIR" ]; then
  git -C "$DIR" fetch origin "$BRANCH" && git -C "$DIR" checkout --detach "origin/$BRANCH"
else
  git worktree add --detach "$DIR" "origin/$BRANCH"
fi
git -C "$DIR" log --oneline -1

echo "== venv"
$PY -m venv "$DIR/seren/mcp/.venv"
"$DIR/seren/mcp/.venv/bin/pip" install -q "mcp>=2.2" pyyaml

echo "== checks (own staged fixture, never /srv/seren)"
cd "$DIR/seren/mcp"
# The worktree carries the fixture and DM.md; the SRD library lives in /srv/seren, read-only.
export SEREN_SRC_CONTENT=/srv/seren
.venv/bin/python check.py | tail -3
.venv/bin/python wire.py | tail -1

echo "== unit (installed, NOT enabled, NOT started)"
cp "$DIR/seren/mcp/box/seren-mcp.service" /etc/systemd/system/seren-mcp.service
systemctl daemon-reload
systemctl is-enabled seren-mcp || true
echo "done. To start (human step): systemctl start seren-mcp"
