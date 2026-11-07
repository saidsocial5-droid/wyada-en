#!/usr/bin/env bash
# Runs migrations + seed + tests on a throwaway local Postgres (needs postgresql-16 binaries).
set -euo pipefail
cd "$(dirname "$0")/.."
B=${PG_BIN:-/usr/lib/postgresql/16/bin}
D=$(mktemp -d); chmod 777 "$D"
run() { if [ "$(id -u)" = 0 ]; then su postgres -c "$*"; else bash -c "$*"; fi; }
run "$B/initdb -D $D/data -A trust >/dev/null && $B/pg_ctl -D $D/data -o '-p 5498 -k $D' -l $D/log start >/dev/null"
trap 'run "$B/pg_ctl -D $D/data stop >/dev/null"; rm -rf "$D"' EXIT
P="psql -h $D -p 5498 -U postgres -v ON_ERROR_STOP=1 -q"
$P -f tests/auth_stub.sql
for f in migrations/*.sql; do grep -v 'extension if not exists pg_cron' "$f" | $P; done
$P -f tests/supabase_grants.sql
$P -f seed.sql
$P -f seed.sql   # re-seeding must be safe
$P -At -f tests/m1_test.sql
