-- Twenty + self-hosted Supabase: create a dedicated database (recommended).
-- Run as a Postgres superuser (e.g. supabase_admin or postgres) connected to the
-- maintenance database, usually named "postgres".
--
-- Example:
--   psql "postgresql://postgres:YOUR_PASSWORD@127.0.0.1:5432/postgres" -v ON_ERROR_STOP=1 -f packages/twenty-docker/supabase/twenty-bootstrap-01-create-database.sql
--
-- If CREATE DATABASE fails with "already exists", skip this file and run only
-- twenty-bootstrap-02-twenty-database.sql against your target database.
--
-- Use port 5432 (direct DB). Do not use Supabase transaction pooler (6543) for
-- Twenty migrations or workspace DDL — see packages/twenty-docker/SUPABASE.md.

CREATE DATABASE twenty;

-- Optional: dedicated login role (uncomment and set a strong password).
-- CREATE ROLE twenty WITH LOGIN PASSWORD 'CHANGE_ME';
-- GRANT ALL PRIVILEGES ON DATABASE twenty TO twenty;
-- GRANT CREATE ON DATABASE twenty TO twenty;
