-- Twenty schema bootstrap inside the Twenty database (default name: twenty).
-- Run after twenty-bootstrap-01-create-database.sql (or when using an existing DB).
--
-- Example:
--   psql "postgresql://postgres:YOUR_PASSWORD@127.0.0.1:5432/twenty" -v ON_ERROR_STOP=1 -f packages/twenty-docker/supabase/twenty-bootstrap-02-twenty-database.sql
--
-- Mirrors packages/twenty-server/src/database/scripts/setup-db.ts (non-FDW path).
-- Then start Twenty once so instance migrations run, or run:
--   npx nx run twenty-server:database:init:prod

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "unaccent";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE SCHEMA IF NOT EXISTS "public";
CREATE SCHEMA IF NOT EXISTS "core";

CREATE OR REPLACE FUNCTION public.unaccent_immutable(input text)
  RETURNS text
  LANGUAGE sql
  IMMUTABLE
AS $$
  SELECT public.unaccent('public.unaccent'::regdictionary, input)
$$;

-- Optional: workflow / Edge surface — apply separately if needed:
--   psql ... -f packages/twenty-docker/supabase/integration-schema.sql
