-- Nortiq verification — multiple documents per project
-- Run this in the Supabase SQL editor (Project → SQL Editor → New query).
-- Deploy the matching app code at the same time: after this runs, the old
-- single "document" column is gone and the app reads/writes "documents".

-- 1. New jsonb array column holding every uploaded document.
alter table public.projects
  add column if not exists documents jsonb not null default '[]'::jsonb;

-- 2. Backfill: wrap each project's existing single document into the array,
--    stamping the id/uploadedAt fields the new ClientDocument shape expects.
--    Safe to re-run — only touches rows that still have an empty array.
update public.projects
set documents = jsonb_build_array(
  document || jsonb_build_object(
    'id', gen_random_uuid()::text,
    'uploadedAt', created_at
  )
)
where document is not null
  and documents = '[]'::jsonb;

-- 3. Drop the old single-document column.
alter table public.projects
  drop column if exists document;
