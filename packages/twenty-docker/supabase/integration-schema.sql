CREATE SCHEMA IF NOT EXISTS integration;

CREATE TABLE IF NOT EXISTS integration.twenty_pipeline_event (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_name text NOT NULL,
  workspace_id uuid,
  object_name text,
  record_id uuid,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  actor_role text NOT NULL DEFAULT current_user,
  processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS twenty_pipeline_event_unprocessed_idx
  ON integration.twenty_pipeline_event (created_at)
  WHERE processed_at IS NULL;

ALTER TABLE integration.twenty_pipeline_event ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE VIEW integration.pending_twenty_pipeline_event
WITH (security_invoker = true) AS
SELECT
  id,
  event_name,
  workspace_id,
  object_name,
  record_id,
  payload,
  actor_role,
  created_at
FROM integration.twenty_pipeline_event
WHERE processed_at IS NULL;

COMMENT ON SCHEMA integration IS
  'Stable Supabase-facing integration surface for workflows. Do not point external workflow clients at Twenty core or workspace_* schemas directly.';

COMMENT ON TABLE integration.twenty_pipeline_event IS
  'Outbox-style table for workflow events normalized from Twenty. Add explicit RLS policies for each workflow role before exposing this schema through Supabase APIs.';
