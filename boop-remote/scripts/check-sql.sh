#!/usr/bin/env bash
# Load supabase/schema.sql and supabase/seed.sql into a scratch Postgres database, twice (so the
# upsert path is exercised), and print row counts. Needs psql and a server you can create a
# database on. Usage: bash boop-remote/scripts/check-sql.sh [DATABASE_URL]
set -euo pipefail
cd "$(dirname "$0")/.."
HERE="$(pwd)"
COUNTS="$(mktemp)"
cat > "$COUNTS" <<'SQL'
select 'opportunities=' || (select count(*) from public.opportunities)
    || ' sources=' || (select count(*) from public.sources)
    || ' live=' || (select count(*) from public.opportunities_live)
    || ' safety=' || (select count(*) from public.safety_sources);
SQL
chmod 644 "$COUNTS"
DBURL="${1:-}"
if [ -z "$DBURL" ]; then
  # Local cluster: run as the postgres superuser against a scratch database.
  su postgres -c "dropdb --if-exists oe_check && createdb oe_check"
fi
# Arguments are plain psql flags and paths without spaces.
run() {
  if [ -n "$DBURL" ]; then psql -q -v ON_ERROR_STOP=1 "$DBURL" "$@"
  else su postgres -c "psql -q -v ON_ERROR_STOP=1 -d oe_check $*"
  fi
}
run -f "$HERE/supabase/schema.sql"
run -f "$HERE/supabase/seed.sql"
run -f "$HERE/supabase/seed.sql"
run -tA -f "$COUNTS"
rm -f "$COUNTS"
