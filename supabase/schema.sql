-- Nortiq verification — Supabase schema
-- Run this in the Supabase SQL editor (Project → SQL Editor → New query).

-- gen_random_uuid() + crypt()/gen_salt() for password hashing live here.
create extension if not exists pgcrypto;

-- Internal team members. Passwords are stored as bcrypt hashes ("login keys").
create table if not exists public.users (
  id            uuid primary key default gen_random_uuid(),
  email         text not null unique,
  name          text not null,
  password_hash text not null,
  created_at    timestamptz not null default now()
);

-- Verification projects. Nested data (document, checklist, runs, AI analysis)
-- is stored as JSONB to mirror the application's Project shape.
create table if not exists public.projects (
  id           uuid primary key default gen_random_uuid(),
  owner_id     uuid not null references public.users(id) on delete cascade,
  name         text not null,
  client_name  text not null default '',
  website_url  text not null,
  repo_url     text not null default '',
  document     jsonb,
  checklist    jsonb not null default '[]'::jsonb,
  ai_analysis  jsonb,
  runs         jsonb not null default '[]'::jsonb,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists projects_owner_id_idx on public.projects (owner_id);
create index if not exists projects_updated_at_idx on public.projects (updated_at desc);

-- Lock the tables down. The Next.js server connects with the service-role key,
-- which bypasses RLS; no other (anon/public) role can read or write.
alter table public.users enable row level security;
alter table public.projects enable row level security;

-- Seed an internal user. Change the email, name, and password before running.
-- The email MUST be lowercase (the app looks users up by lowercased email).
insert into public.users (email, name, password_hash)
values (
  'admin@nortiq.com',
  'Nortiq Admin',
  crypt('change-this-password', gen_salt('bf'))
)
on conflict (email) do nothing;

-- To add more users later, repeat the insert with a fresh email/password:
-- insert into public.users (email, name, password_hash)
-- values ('teammate@nortiq.com', 'Team Mate', crypt('their-password', gen_salt('bf')));
