#!/bin/bash

set -euo pipefail

if ! command -v pg_dump &>/dev/null; then
  echo "pg_dump is required to export the Twenty database."
  exit 1
fi

if [ -z "${SOURCE_PG_DATABASE_URL:-}" ]; then
  echo "SOURCE_PG_DATABASE_URL must point at the current stock Twenty Postgres database."
  exit 1
fi

output_path=${1:-twenty-supabase-migration.dump}

echo "Exporting Twenty schemas to ${output_path}"

pg_dump "${SOURCE_PG_DATABASE_URL}" \
  --format=custom \
  --no-owner \
  --no-acl \
  --schema=core \
  --schema='workspace_*' \
  --file="${output_path}"

echo "Export complete: ${output_path}"
