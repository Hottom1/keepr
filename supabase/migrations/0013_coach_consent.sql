-- Security audit E2, remaining half: a coach must confirm before their FIRST
-- email. Run in the Supabase dashboard SQL Editor: click into the editor, press
-- Cmd+A, paste over it, check the first line reads "-- Security audit E2",
-- then Run. Safe to re-run. (Split into pieces in chat if a long paste misbehaves.)
--
-- Until now the keeper could type any address and Keepr would email it (with
-- opt-out and rate limits from 0010, but still one unsolicited email per
-- account). Now the keeper "invites" the address: the coach gets a message whose
-- link opens a confirmation page, and nothing else is ever sent unless they
-- press its button. The confirmation lives here, server-side, keyed by
-- (keeper, coach address); it can't be set from the keeper's own profile.
-- Everything is service-role-only, with privileges revoked by name (see 0008).

create table if not exists public.coach_confirmations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  coach_email text not null,
  token_hash text not null,
  status text not null default 'pending' check (status in ('pending', 'confirmed')),
  created_at timestamptz not null default now(),
  confirmed_at timestamptz,
  unique (user_id, coach_email)
);
alter table public.coach_confirmations enable row level security;
revoke all on table public.coach_confirmations from anon, authenticated;

create table if not exists public.coach_invite_log (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  coach_email text not null,
  sent_at timestamptz not null default now()
);
create index if not exists coach_invite_log_recent on public.coach_invite_log (user_id, sent_at desc);
alter table public.coach_invite_log enable row level security;
revoke all on table public.coach_invite_log from anon, authenticated;

-- Decides whether an invite may go out and, if so, records it and stores a
-- fresh token hash, in one serialised step per keeper. Returns
-- {"result": "sent" | "confirmed" | "stopped" | "too_soon" | "daily_limit", "id": <confirmation id or null>}.
-- Limits: one invite per (keeper, address) per 10 minutes, five invites per
-- keeper per 24 hours across all addresses.
create or replace function public.request_coach_invite(p_user_id uuid, p_coach_email text, p_token_hash text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_email text := lower(trim(p_coach_email));
  v_existing public.coach_confirmations;
  v_id uuid;
begin
  perform pg_advisory_xact_lock(hashtext('coach_invite:' || p_user_id::text));

  if exists (select 1 from public.coach_email_suppressions where email = v_email) then
    return jsonb_build_object('result', 'stopped', 'id', null);
  end if;

  select * into v_existing from public.coach_confirmations where user_id = p_user_id and coach_email = v_email;
  if v_existing.id is not null and v_existing.status = 'confirmed' then
    return jsonb_build_object('result', 'confirmed', 'id', v_existing.id);
  end if;

  if exists (select 1 from public.coach_invite_log where user_id = p_user_id and coach_email = v_email and sent_at > now() - interval '10 minutes') then
    return jsonb_build_object('result', 'too_soon', 'id', null);
  end if;
  if (select count(*) from public.coach_invite_log where user_id = p_user_id and sent_at > now() - interval '24 hours') >= 5 then
    return jsonb_build_object('result', 'daily_limit', 'id', null);
  end if;

  insert into public.coach_confirmations (user_id, coach_email, token_hash, status)
    values (p_user_id, v_email, p_token_hash, 'pending')
  on conflict (user_id, coach_email) do update
    set token_hash = excluded.token_hash, status = 'pending', created_at = now(), confirmed_at = null
  returning id into v_id;

  insert into public.coach_invite_log (user_id, coach_email) values (p_user_id, v_email);
  return jsonb_build_object('result', 'sent', 'id', v_id);
end;
$$;

-- Marks an invite confirmed if the id and token hash match and the address
-- hasn't opted out. Returns true on success (idempotent for a repeat click).
create or replace function public.confirm_coach_invite(p_id uuid, p_token_hash text)
returns boolean
language plpgsql security definer set search_path = public as $$
declare
  v_row public.coach_confirmations;
begin
  select * into v_row from public.coach_confirmations where id = p_id and token_hash = p_token_hash;
  if v_row.id is null then return false; end if;
  if exists (select 1 from public.coach_email_suppressions where email = v_row.coach_email) then return false; end if;
  update public.coach_confirmations
    set status = 'confirmed', confirmed_at = coalesce(confirmed_at, now())
    where id = v_row.id;
  return true;
end;
$$;

-- 'stopped' (opted out), 'confirmed', 'pending', or 'none'.
create or replace function public.get_coach_consent_status(p_user_id uuid, p_coach_email text)
returns text
language plpgsql security definer stable set search_path = public as $$
declare
  v_email text := lower(trim(p_coach_email));
  v_status text;
begin
  if exists (select 1 from public.coach_email_suppressions where email = v_email) then return 'stopped'; end if;
  select status into v_status from public.coach_confirmations where user_id = p_user_id and coach_email = v_email;
  return coalesce(v_status, 'none');
end;
$$;

revoke execute on function public.request_coach_invite(uuid, text, text) from public, anon, authenticated;
grant execute on function public.request_coach_invite(uuid, text, text) to service_role;
revoke execute on function public.confirm_coach_invite(uuid, text) from public, anon, authenticated;
grant execute on function public.confirm_coach_invite(uuid, text) to service_role;
revoke execute on function public.get_coach_consent_status(uuid, text) from public, anon, authenticated;
grant execute on function public.get_coach_consent_status(uuid, text) to service_role;
