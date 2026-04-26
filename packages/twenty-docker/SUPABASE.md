# Running Twenty With Self-Hosted Supabase

This deployment path connects Twenty to an existing self-hosted Supabase
instance. Supabase replaces the bundled Postgres container and can also provide
Storage, Auth, and workflow-facing data surfaces.

## Database

Twenty needs a PostgreSQL role with broad DDL privileges. The role must be able
to create schemas, create tables and indexes, create functions, and run
migrations. Use a direct or session-pooler connection for `PG_DATABASE_URL`;
do not use a transaction pooler for migrations or workspace metadata changes.

Enable these extensions in the target Supabase database:

- `uuid-ossp`
- `unaccent`
- `pgcrypto`

Run the compatibility check before booting Twenty:

```bash
PG_DATABASE_URL=postgresql://twenty:password@supabase-db.example.com:5432/twenty \
  npx nx run twenty-server:database:check:supabase
```

Initialize an empty Supabase-backed database:

```bash
PG_DATABASE_URL=postgresql://twenty:password@supabase-db.example.com:5432/twenty \
  npx nx run twenty-server:database:init:prod
```

## Docker Compose

Copy the Supabase env template and fill in your real values:

```bash
cp packages/twenty-docker/.env.supabase.example packages/twenty-docker/.env.supabase
```

Render the external-database stack:

```bash
docker compose \
  -f packages/twenty-docker/docker-compose.yml \
  -f packages/twenty-docker/docker-compose.supabase-external.yml \
  --env-file packages/twenty-docker/.env.supabase \
  config
```

Start Twenty with Supabase Postgres and the bundled Redis service:

```bash
docker compose \
  -f packages/twenty-docker/docker-compose.yml \
  -f packages/twenty-docker/docker-compose.supabase-external.yml \
  --env-file packages/twenty-docker/.env.supabase \
  up twenty-server twenty-worker redis
```

For a VPS where Twenty and Supabase run on the same server, attach Twenty to
Supabase's Docker network and keep Twenty bound to localhost behind your reverse
proxy:

```bash
cp packages/twenty-docker/.env.supabase.production.example \
  packages/twenty-docker/.env.supabase.production

docker compose \
  -f packages/twenty-docker/docker-compose.yml \
  -f packages/twenty-docker/docker-compose.supabase-production.yml \
  --env-file packages/twenty-docker/.env.supabase.production \
  up -d twenty-server twenty-worker redis
```

Set `SUPABASE_DOCKER_NETWORK` to the Docker network used by your Supabase
compose project, and point `PG_DATABASE_URL` at the Supabase Postgres service on
that network, for example `postgresql://postgres:password@db:5432/postgres`.

## Migrating Existing Twenty Data

Stop writes to the current Twenty database before exporting.

```bash
SOURCE_PG_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/default \
  packages/twenty-docker/scripts/export-postgres-for-supabase.sh \
  twenty-supabase-migration.dump
```

Restore into Supabase:

```bash
TARGET_PG_DATABASE_URL=postgresql://twenty:password@supabase-db.example.com:5432/twenty \
  packages/twenty-docker/scripts/restore-postgres-to-supabase.sh \
  twenty-supabase-migration.dump
```

After restore, run the database migration command against the Supabase database:

```bash
PG_DATABASE_URL=postgresql://twenty:password@supabase-db.example.com:5432/twenty \
  npx nx run twenty-server:database:migrate:prod
```

## Storage

Use Twenty's existing S3-compatible storage driver when your Supabase deployment
exposes the Storage S3 protocol:

```bash
STORAGE_TYPE=S_3
STORAGE_S3_REGION=local
STORAGE_S3_NAME=twenty
STORAGE_S3_ENDPOINT=https://supabase.example.com/storage/v1/s3
STORAGE_S3_ACCESS_KEY_ID=...
STORAGE_S3_SECRET_ACCESS_KEY=...
```

Only enable `STORAGE_S3_PRESIGNED_URL_ENABLED` after confirming that generated
URLs are reachable from browsers through your public Supabase endpoint.

## Auth

Prefer Twenty's existing OIDC SSO path when Supabase Auth exposes compatible
OIDC discovery metadata for your deployment. Configure the Supabase Auth issuer,
client ID, and client secret through Twenty SSO for each workspace.

Check Supabase Auth discovery metadata before configuring the workspace SSO
provider:

```bash
SUPABASE_AUTH_ISSUER_URL=https://supabase.example.com/auth/v1 \
  npx nx run twenty-server:auth:check:supabase-oidc
```

If OIDC is not available for the target deployment, implement a dedicated
Supabase JWT bridge in the Twenty auth module. Do not authorize from Supabase
`user_metadata`; use `app_metadata` or database-backed membership rows for
authorization facts.

## Workflow Integration

Apply `packages/twenty-docker/supabase/integration-schema.sql` to create a
stable workflow-facing schema. Keep Twenty's `core` and `workspace_*` schemas
private to the Twenty server role unless you have designed explicit RLS policies
for each exposed table or view.
