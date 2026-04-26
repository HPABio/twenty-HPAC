#!/bin/bash

set -euo pipefail

env_file=${1:-packages/twenty-docker/.env.supabase}

if [ ! -f "${env_file}" ]; then
  echo "Env file not found: ${env_file}"
  echo "Create it from packages/twenty-docker/.env.supabase.example first."
  exit 1
fi

set -a
source "${env_file}"
set +a

if [ -z "${PG_DATABASE_URL:-}" ]; then
  echo "PG_DATABASE_URL must be set in ${env_file}."
  exit 1
fi

npx nx run twenty-server:database:check:supabase
npx nx run twenty-server:database:init:prod

docker compose \
  -f packages/twenty-docker/docker-compose.yml \
  -f packages/twenty-docker/docker-compose.supabase-external.yml \
  --env-file "${env_file}" \
  up server worker redis
