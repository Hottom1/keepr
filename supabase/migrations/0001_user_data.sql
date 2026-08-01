-- Phase 2: single JSON blob per user, RLS-scoped.
-- Run this in the Supabase dashboard's SQL Editor (Project -> SQL Editor -> New query).
-- Safe to re-run: drops and rebuilds public.user_data from scratch. Nothing
-- real has been stored in it yet, so a clean slate is fine.

drop table if exists public.user_data cascade;

create table public.user_data (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.user_data enable row level security;

create policy "read own data" on public.user_data
  for select using (auth.uid() = user_id);

create policy "insert own data" on public.user_data
  for insert with check (auth.uid() = user_id);

create policy "update own data" on public.user_data
  for update using (auth.uid() = user_id);
