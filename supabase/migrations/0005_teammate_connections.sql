-- Teammate connections & live shot attribution (Part 1 of the teammate/coach
-- brief). This is the first feature where an authenticated CLIENT (not just
-- server-side service-role code) legitimately needs to write into another
-- user's user_data row — the strict "auth.uid() = user_id" RLS from
-- migration 0001 has no room for that, so every cross-account touch here
-- goes through a security definer function that:
--   1. never trusts a caller-supplied "who am I" parameter — always reads
--      auth.uid() itself,
--   2. re-checks permission from the connections table on every single
--      call (not just once at match start), so revoking mid-match stops
--      the very next write, and
--   3. still does the jsonb append/merge as one atomic statement, same
--      discipline as migrations 0003/0004.
-- A connected teammate's own post-hoc edits to a match they were recorded
-- into (fixing a mistagged shot, deleting it, whatever) go through their
-- completely normal, existing RLS path — nothing here is needed once the
-- match already lives in their own row.

-- Each keeper's own private, regenerable invite code. No SELECT policy for
-- "any code" lookups — code -> owner resolution only ever happens inside
-- redeem_invite_code below, so this table is never a browsable directory.
create table public.keeper_invite_codes (
  user_id uuid primary key references auth.users(id) on delete cascade,
  code text unique not null,
  created_at timestamptz not null default now()
);
alter table public.keeper_invite_codes enable row level security;

create policy "read own invite code" on public.keeper_invite_codes
  for select using (auth.uid() = user_id);

-- Two independent per-direction recording grants live on the connection
-- itself, not implied by status='accepted' — see DECISIONS.md for why this
-- was proposed and confirmed as a separate, explicit, revocable grant.
create table public.connections (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references auth.users(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  -- Email snapshots at request time, purely for display — the client can't
  -- read auth.users directly, and this avoids needing a lookup RPC just to
  -- label who a connection is with. Not kept live-synced if either side
  -- changes their email later, same tradeoff as Match.recordedByEmail.
  requester_email text not null default '',
  recipient_email text not null default '',
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'revoked')),
  -- true => requester allows recipient to record matches into requester's account
  requester_allows_recipient_to_record boolean not null default false,
  -- true => recipient allows requester to record matches into recipient's account
  recipient_allows_requester_to_record boolean not null default false,
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  revoked_at timestamptz,
  revoked_by uuid,
  constraint no_self_connection check (requester_id <> recipient_id)
);
alter table public.connections enable row level security;

create policy "read own connections" on public.connections
  for select using (auth.uid() = requester_id or auth.uid() = recipient_id);

-- No insert/update policy for authenticated on either table above — every
-- mutation is one of the functions below, so invariants (no self-connect,
-- no accepting someone else's request, permission checked fresh every
-- write) live in exactly one place instead of being re-derived in RLS
-- expressions and in application code.

create or replace function public.get_or_create_invite_code()
returns text
language plpgsql security definer set search_path = public as $$
declare
  v_caller uuid := auth.uid();
  v_code text;
  v_existing text;
begin
  if v_caller is null then raise exception 'Not authenticated'; end if;
  select code into v_existing from public.keeper_invite_codes where user_id = v_caller;
  if v_existing is not null then return v_existing; end if;
  loop
    v_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 7));
    begin
      insert into public.keeper_invite_codes (user_id, code) values (v_caller, v_code);
      return v_code;
    exception when unique_violation then
      -- code collision with another user's code; loop and try a fresh one
    end;
  end loop;
end;
$$;

create or replace function public.regenerate_invite_code()
returns text
language plpgsql security definer set search_path = public as $$
declare
  v_caller uuid := auth.uid();
  v_code text;
begin
  if v_caller is null then raise exception 'Not authenticated'; end if;
  loop
    v_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 7));
    begin
      insert into public.keeper_invite_codes (user_id, code) values (v_caller, v_code)
        on conflict (user_id) do update set code = excluded.code, created_at = now();
      return v_code;
    exception when unique_violation then
      -- code collision with another user's code; loop and try a fresh one
    end;
  end loop;
end;
$$;

create or replace function public.redeem_invite_code(p_code text)
returns public.connections
language plpgsql security definer set search_path = public as $$
declare
  v_caller uuid := auth.uid();
  v_owner uuid;
  v_caller_email text;
  v_owner_email text;
  v_existing public.connections;
  v_row public.connections;
begin
  if v_caller is null then raise exception 'Not authenticated'; end if;

  select user_id into v_owner from public.keeper_invite_codes where code = upper(p_code);
  if v_owner is null then raise exception 'Invite code not found'; end if;
  if v_owner = v_caller then raise exception 'You cannot connect to yourself'; end if;

  select * into v_existing from public.connections
    where (requester_id = v_caller and recipient_id = v_owner)
       or (requester_id = v_owner and recipient_id = v_caller)
    limit 1;

  if v_existing.id is not null then
    if v_existing.status in ('pending', 'accepted') then
      return v_existing;
    end if;
    -- previously declined/revoked: reopen as a fresh request from the
    -- caller, resetting both recording grants back to false rather than
    -- carrying forward trust from a connection that was explicitly ended.
    select email into v_caller_email from auth.users where id = v_caller;
    select email into v_owner_email from auth.users where id = v_owner;
    update public.connections
      set requester_id = v_caller, recipient_id = v_owner, status = 'pending',
          requester_email = coalesce(v_caller_email, ''), recipient_email = coalesce(v_owner_email, ''),
          requester_allows_recipient_to_record = false,
          recipient_allows_requester_to_record = false,
          created_at = now(), responded_at = null, revoked_at = null, revoked_by = null
      where id = v_existing.id
      returning * into v_row;
    return v_row;
  end if;

  select email into v_caller_email from auth.users where id = v_caller;
  select email into v_owner_email from auth.users where id = v_owner;

  insert into public.connections (requester_id, recipient_id, requester_email, recipient_email)
    values (v_caller, v_owner, coalesce(v_caller_email, ''), coalesce(v_owner_email, ''))
    returning * into v_row;
  return v_row;
end;
$$;

create or replace function public.accept_connection(p_connection_id uuid)
returns public.connections
language plpgsql security definer set search_path = public as $$
declare
  v_caller uuid := auth.uid();
  v_row public.connections;
begin
  update public.connections
    set status = 'accepted', responded_at = now()
    where id = p_connection_id and recipient_id = v_caller and status = 'pending'
    returning * into v_row;
  if v_row.id is null then raise exception 'Request not found or not actionable'; end if;
  return v_row;
end;
$$;

create or replace function public.decline_connection(p_connection_id uuid)
returns public.connections
language plpgsql security definer set search_path = public as $$
declare
  v_caller uuid := auth.uid();
  v_row public.connections;
begin
  update public.connections
    set status = 'declined', responded_at = now()
    where id = p_connection_id and recipient_id = v_caller and status = 'pending'
    returning * into v_row;
  if v_row.id is null then raise exception 'Request not found or not actionable'; end if;
  return v_row;
end;
$$;

-- Either party can end an accepted connection, and a requester can cancel
-- their own still-pending outgoing request the same way (one action,
-- "revoked", covers both — declining is the recipient-specific "no thanks"
-- on an incoming request above).
create or replace function public.revoke_connection(p_connection_id uuid)
returns public.connections
language plpgsql security definer set search_path = public as $$
declare
  v_caller uuid := auth.uid();
  v_row public.connections;
begin
  update public.connections
    set status = 'revoked', revoked_at = now(), revoked_by = v_caller
    where id = p_connection_id and (requester_id = v_caller or recipient_id = v_caller) and status in ('pending', 'accepted')
    returning * into v_row;
  if v_row.id is null then raise exception 'Connection not found or not active'; end if;
  return v_row;
end;
$$;

-- Flips only the caller's OWN outgoing grant (the permission they extend to
-- their partner), never the other side's. Independent of status changes
-- above, so turning this off doesn't touch the connection itself.
create or replace function public.set_recording_permission(p_connection_id uuid, p_grant boolean)
returns public.connections
language plpgsql security definer set search_path = public as $$
declare
  v_caller uuid := auth.uid();
  v_row public.connections;
begin
  update public.connections
    set requester_allows_recipient_to_record = case when requester_id = v_caller then p_grant else requester_allows_recipient_to_record end,
        recipient_allows_requester_to_record = case when recipient_id = v_caller then p_grant else recipient_allows_requester_to_record end
    where id = p_connection_id and status = 'accepted' and (requester_id = v_caller or recipient_id = v_caller)
    returning * into v_row;
  if v_row.id is null then raise exception 'Connection not found or not active'; end if;
  return v_row;
end;
$$;

-- Internal helper only (never granted to authenticated) — true iff p_caller
-- currently has an accepted connection with p_owner AND p_owner's side of
-- that connection currently grants p_caller recording rights.
create or replace function public.can_record_for(p_caller uuid, p_owner uuid)
returns boolean
language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from public.connections
    where status = 'accepted'
      and (
        (requester_id = p_caller and recipient_id = p_owner and recipient_allows_requester_to_record)
        or
        (requester_id = p_owner and recipient_id = p_caller and requester_allows_recipient_to_record)
      )
  );
$$;

-- Returns an already-active (recording still in progress) match the caller
-- started for this exact fixture in the owner's account if one exists,
-- otherwise creates one. Mirrors the client's own Match shape
-- ({id, date, opponent, competition, result, season, videoUrl, shots,
-- recording}) plus recordedBy/recordedByEmail so the owner's UI can label
-- it, and so patch/delete below can scope to "matches this caller started."
create or replace function public.create_or_resume_teammate_match(
  p_owner_id uuid, p_opponent text, p_date text, p_competition text, p_season text
)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_caller uuid := auth.uid();
  v_data jsonb;
  v_matches jsonb;
  v_existing jsonb;
  v_new_match jsonb;
  v_caller_email text;
begin
  if v_caller is null then raise exception 'Not authenticated'; end if;
  if not public.can_record_for(v_caller, p_owner_id) then
    raise exception 'Not permitted to record for this account';
  end if;

  select data into v_data from public.user_data where user_id = p_owner_id for update;
  if v_data is null then raise exception 'Account not found'; end if;
  v_matches := coalesce(v_data->'matches', '[]'::jsonb);

  select elem into v_existing
  from jsonb_array_elements(v_matches) elem
  where elem->>'opponent' = p_opponent
    and elem->>'date' = p_date
    and elem->>'recordedBy' = v_caller::text
    and jsonb_typeof(elem->'recording') = 'object'
  limit 1;

  if v_existing is not null then
    return v_existing;
  end if;

  select email into v_caller_email from auth.users where id = v_caller;

  v_new_match := jsonb_build_object(
    'id', gen_random_uuid()::text,
    'date', p_date,
    'opponent', p_opponent,
    'competition', coalesce(p_competition, ''),
    'result', '',
    'season', coalesce(p_season, 'Winter'),
    'videoUrl', '',
    'shots', '[]'::jsonb,
    'recordedBy', v_caller::text,
    'recordedByEmail', coalesce(v_caller_email, ''),
    'recording', jsonb_build_object('startedAt', to_jsonb(now()), 'pausedAt', null, 'totalPausedMs', 0)
  );

  update public.user_data
    set data = jsonb_set(v_data, '{matches}', v_matches || jsonb_build_array(v_new_match)),
        updated_at = now()
    where user_id = p_owner_id;

  return v_new_match;
end;
$$;

-- General-purpose merge patch onto a teammate match this caller started —
-- mirrors the client's existing onUpdatePatch({...}) => saveMatch({...match,
-- ...patch}) pattern used for the caller's own matches, so LiveMatchRecorder
-- can reuse the exact same shot-logging/pause/resume/finish handlers and
-- just point onUpdatePatch at this RPC instead of the local save path when
-- recording for a teammate. Permission is re-checked on every call.
create or replace function public.patch_teammate_match(p_owner_id uuid, p_match_id text, p_patch jsonb)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_caller uuid := auth.uid();
  v_data jsonb;
  v_matches jsonb;
  v_updated jsonb;
begin
  if v_caller is null then raise exception 'Not authenticated'; end if;
  if not public.can_record_for(v_caller, p_owner_id) then
    raise exception 'Not permitted to record for this account';
  end if;

  select data into v_data from public.user_data where user_id = p_owner_id for update;
  if v_data is null then raise exception 'Account not found'; end if;

  select (elem || p_patch) into v_updated
  from jsonb_array_elements(coalesce(v_data->'matches', '[]'::jsonb)) elem
  where elem->>'id' = p_match_id and elem->>'recordedBy' = v_caller::text
  limit 1;
  if v_updated is null then raise exception 'Match not found'; end if;

  select jsonb_agg(
    case when elem->>'id' = p_match_id and elem->>'recordedBy' = v_caller::text
      then elem || p_patch
      else elem
    end
  ) into v_matches
  from jsonb_array_elements(coalesce(v_data->'matches', '[]'::jsonb)) elem;

  update public.user_data
    set data = jsonb_set(v_data, '{matches}', coalesce(v_matches, '[]'::jsonb)), updated_at = now()
    where user_id = p_owner_id;

  return v_updated;
end;
$$;

-- Full removal of a teammate match this caller started (e.g. recording was
-- started against the wrong teammate by mistake, no meaningful shots yet).
-- Once a match has real data in it, the normal expectation is the owner
-- corrects/deletes it themselves through their own completely ordinary,
-- already-existing edit path — this exists for the recorder's own
-- in-the-moment "Delete" button during a live session, not as a general
-- way to remove data from someone else's account after the fact.
create or replace function public.delete_teammate_match(p_owner_id uuid, p_match_id text)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_caller uuid := auth.uid();
  v_data jsonb;
  v_matches jsonb;
begin
  if v_caller is null then raise exception 'Not authenticated'; end if;
  if not public.can_record_for(v_caller, p_owner_id) then
    raise exception 'Not permitted to record for this account';
  end if;

  select data into v_data from public.user_data where user_id = p_owner_id for update;
  if v_data is null then raise exception 'Account not found'; end if;

  select jsonb_agg(elem) into v_matches
  from jsonb_array_elements(coalesce(v_data->'matches', '[]'::jsonb)) elem
  where not (elem->>'id' = p_match_id and elem->>'recordedBy' = v_caller::text);

  update public.user_data
    set data = jsonb_set(v_data, '{matches}', coalesce(v_matches, '[]'::jsonb)), updated_at = now()
    where user_id = p_owner_id;
end;
$$;

revoke all on function public.get_or_create_invite_code() from public;
grant execute on function public.get_or_create_invite_code() to authenticated;

revoke all on function public.regenerate_invite_code() from public;
grant execute on function public.regenerate_invite_code() to authenticated;

revoke all on function public.redeem_invite_code(text) from public;
grant execute on function public.redeem_invite_code(text) to authenticated;

revoke all on function public.accept_connection(uuid) from public;
grant execute on function public.accept_connection(uuid) to authenticated;

revoke all on function public.decline_connection(uuid) from public;
grant execute on function public.decline_connection(uuid) to authenticated;

revoke all on function public.revoke_connection(uuid) from public;
grant execute on function public.revoke_connection(uuid) to authenticated;

revoke all on function public.set_recording_permission(uuid, boolean) from public;
grant execute on function public.set_recording_permission(uuid, boolean) to authenticated;

revoke all on function public.can_record_for(uuid, uuid) from public;
-- intentionally not granted to authenticated or service_role — only called
-- internally by the security definer functions above.

revoke all on function public.create_or_resume_teammate_match(uuid, text, text, text, text) from public;
grant execute on function public.create_or_resume_teammate_match(uuid, text, text, text, text) to authenticated;

revoke all on function public.patch_teammate_match(uuid, text, jsonb) from public;
grant execute on function public.patch_teammate_match(uuid, text, jsonb) to authenticated;

revoke all on function public.delete_teammate_match(uuid, text) from public;
grant execute on function public.delete_teammate_match(uuid, text) to authenticated;
