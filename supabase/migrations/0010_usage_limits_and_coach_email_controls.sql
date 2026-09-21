-- Security audit E1 + E2: server-owned state for rate limits and email opt-outs.
-- Run in the Supabase dashboard SQL Editor. Safe to re-run.
--
-- Why a new table instead of a field on the user's profile: everything inside
-- user_data.data is writable by its owner (the client saves the whole blob),
-- so a counter or cooldown stored there is one edit away from being reset.
-- These tables are reachable only by the service-role key used in the Netlify
-- functions. Every table has RLS on with no policies AND table privileges
-- revoked from anon/authenticated; every function is revoked from
-- public/anon/authenticated by name and granted only to service_role
-- (see 0008 for why "revoke ... from public" alone is not enough).

-- ---------------------------------------------------------------- Kip budget
create table if not exists public.kip_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null,
  calls integer not null default 0,
  text_chars bigint not null default 0,
  primary key (user_id, day)
);
alter table public.kip_usage enable row level security;
revoke all on table public.kip_usage from anon, authenticated;

-- Atomically counts one kip-chat call against the user's UTC-day budget.
-- Returns true if it was within both limits (and was counted), false if not
-- (and nothing was counted). One INSERT ... ON CONFLICT statement, so two
-- simultaneous requests can't both slip under the limit.
create or replace function public.consume_kip_quota(
  p_user_id uuid, p_text_chars bigint, p_max_calls integer, p_max_chars bigint
)
returns boolean
language plpgsql security definer set search_path = public as $$
declare
  v_ok boolean;
begin
  insert into public.kip_usage as u (user_id, day, calls, text_chars)
  values (p_user_id, (now() at time zone 'utc')::date, 1, greatest(p_text_chars, 0))
  on conflict (user_id, day) do update
    set calls = u.calls + 1,
        text_chars = u.text_chars + excluded.text_chars
    where u.calls < p_max_calls
      and u.text_chars + excluded.text_chars <= p_max_chars
  returning true into v_ok;
  return coalesce(v_ok, false);
end;
$$;

revoke execute on function public.consume_kip_quota(uuid, bigint, integer, bigint) from public, anon, authenticated;
grant execute on function public.consume_kip_quota(uuid, bigint, integer, bigint) to service_role;

-- ------------------------------------------------- Coach digest email controls
-- Addresses that have asked (via the link in every digest) to stop receiving
-- Keepr coach emails. Stored lowercased. Checked before every send.
create table if not exists public.coach_email_suppressions (
  email text primary key,
  created_at timestamptz not null default now()
);
alter table public.coach_email_suppressions enable row level security;
revoke all on table public.coach_email_suppressions from anon, authenticated;

-- One row per digest actually attempted, so send limits are counted by the
-- server rather than trusted from profile.lastCoachDigestSentAt.
create table if not exists public.coach_digest_sends (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  coach_email text not null,
  sent_at timestamptz not null default now()
);
create index if not exists coach_digest_sends_user_recent on public.coach_digest_sends (user_id, sent_at desc);
alter table public.coach_digest_sends enable row level security;
revoke all on table public.coach_digest_sends from anon, authenticated;

-- Decides whether a digest may go out and, if so, records it, in one
-- serialised step per user. Returns 'ok', 'suppressed', 'too_soon' or
-- 'daily_limit'. Limits are per ACCOUNT, not per address, so pointing one
-- account at many addresses doesn't multiply what it can send.
--   p_min_gap:      minimum time since this account's previous digest
--   p_max_per_day:  most digests this account may send in any 24 hours
create or replace function public.reserve_coach_digest_send(
  p_user_id uuid, p_coach_email text, p_min_gap interval, p_max_per_day integer
)
returns text
language plpgsql security definer set search_path = public as $$
declare
  v_email text := lower(trim(p_coach_email));
  v_last timestamptz;
  v_day_count integer;
begin
  perform pg_advisory_xact_lock(hashtext('coach_digest:' || p_user_id::text));

  if exists (select 1 from public.coach_email_suppressions where email = v_email) then
    return 'suppressed';
  end if;

  select max(sent_at) into v_last from public.coach_digest_sends where user_id = p_user_id;
  if v_last is not null and v_last > now() - p_min_gap then
    return 'too_soon';
  end if;

  select count(*) into v_day_count from public.coach_digest_sends
    where user_id = p_user_id and sent_at > now() - interval '24 hours';
  if v_day_count >= p_max_per_day then
    return 'daily_limit';
  end if;

  insert into public.coach_digest_sends (user_id, coach_email) values (p_user_id, v_email);
  return 'ok';
end;
$$;

create or replace function public.suppress_coach_email(p_email text)
returns void
language sql security definer set search_path = public as $$
  insert into public.coach_email_suppressions (email) values (lower(trim(p_email)))
  on conflict (email) do nothing;
$$;

revoke execute on function public.reserve_coach_digest_send(uuid, text, interval, integer) from public, anon, authenticated;
grant execute on function public.reserve_coach_digest_send(uuid, text, interval, integer) to service_role;
revoke execute on function public.suppress_coach_email(text) from public, anon, authenticated;
grant execute on function public.suppress_coach_email(text) to service_role;
