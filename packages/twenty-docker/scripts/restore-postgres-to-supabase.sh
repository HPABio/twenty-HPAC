#!/bin/bash

set -euo pipefail

if ! command -v pg_restore &>/dev/null; then
  echo "pg_restore is required to restore the Twenty database."
  exit 1
fi

if [ -z "${TARGET_PG_DATABASE_URL:-}" ]; then
  echo "TARGET_PG_DATABASE_URL must point at the target Supabase Postgres database."
  exit 1
fi

dump_path=${1:-twenty-supabase-migration.dump}

if [ ! -f "${dump_path}" ]; then
  echo "Dump file not found: ${dump_path}"
  exit 1
fi

echo "Restoring ${dump_path} into Supabase Postgres"

pg_restore \
  --dbname="${TARGET_PG_DATABASE_URL}" \
  --clean \
  --if-exists \
  --no-owner \
  --no-acl \
  "${dump_path}"

echo "Restore complete."
echo "Next: run Twenty database init/migrate commands against the Supabase PG_DATABASE_URL."
