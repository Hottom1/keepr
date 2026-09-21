-- Security audit W1. Run in the Supabase dashboard SQL Editor: click into the
-- editor, press Cmd+A to select everything, paste over it, check the first line
-- reads "-- Security audit W1", then Run. Safe to re-run.
--
-- W1: migration 0005 correctly gated WHO may write into another user's account
-- (accepted connection + the owner's grant, re-checked every call) and confined
-- a recorder to matches they started, but placed almost no limit on WHAT they
-- could write or for HOW LONG. Verified before this migration: a recorder could
-- set any key on a match (300KB junk, spoofed recordedByEmail, arbitrary
-- videoUrl, identity fields), create unlimited matches in the owner's account,
-- and keep patching a finished match indefinitely.
--
-- The app only ever sends three kinds of change to a teammate match, and this
-- now permits exactly those:
--   { shots: [...] }                        while recording, and in the review step
--   { recording: null, competition?, result? }   when the recorder finishes
-- Everything else is refused. Shots are checked for shape and size. A match stays
-- writable by its recorder only while the recording is active (started in the
-- last 24 hours) or for 6 hours after it ends, which covers the mandatory review
-- step; after that only the owner can change it, through their normal path. The
-- server stamps the end time itself (recordingEndedAt); the client can't supply
-- it. recordedBy / recordedByEmail can no longer be altered by a patch.
--
-- Function privileges are restated explicitly (see 0008 for why).

-- ------------------------------------------------------------- shared helpers
-- Internal only: called from the SECURITY DEFINER functions below, never
-- directly by clients.
create or replace function public.teammate_shots_valid(p_shots jsonb)
returns boolean
language plpgsql immutable set search_path = public as $$
declare
  v_shot jsonb;
  v_key text;
  v_val jsonb;
  v_allowed_keys text[] := array['id','zone','outcome','shotType','videoTimestamp','shooterNumber','position'];
begin
  if jsonb_typeof(p_shots) is distinct from 'array' then return false; end if;
  if jsonb_array_length(p_shots) > 400 then return false; end if;
  for v_shot in select * from jsonb_array_elements(p_shots) loop
    if jsonb_typeof(v_shot) is distinct from 'object' then return false; end if;
    if length(v_shot::text) > 600 then return false; end if;
    if jsonb_typeof(v_shot->'id') is distinct from 'string' then return false; end if;
    if jsonb_typeof(v_shot->'zone') is distinct from 'string'
       or (v_shot->>'zone') not in ('TL','TM','TR','ML','MM','MR','BL','BM','BR') then return false; end if;
    if (v_shot->>'outcome') is distinct from 'Save' and (v_shot->>'outcome') is distinct from 'Goal' then return false; end if;
    for v_key, v_val in select * from jsonb_each(v_shot) loop
      if not (v_key = any (v_allowed_keys)) then return false; end if;
      if jsonb_typeof(v_val) in ('object', 'array') then return false; end if;
      if jsonb_typeof(v_val) = 'string' and length(v_val #>> '{}') > 64 then return false; end if;
    end loop;
  end loop;
  return true;
end;
$$;

-- Is this teammate-recorded match still open to its recorder? Active recording
-- started within 24h, or ended (server-stamped) within the last 6h.
create or replace function public.teammate_match_is_open(p_match jsonb)
returns boolean
language plpgsql stable set search_path = public as $$
declare
  v_ts timestamptz;
begin
  if jsonb_typeof(p_match->'recording') = 'object' then
    if jsonb_typeof(p_match->'recording'->'startedAt') is distinct from 'string' then return false; end if;
    begin
      v_ts := (p_match->'recording'->>'startedAt')::timestamptz;
    exception when others then
      return false;
    end;
    return coalesce(v_ts > now() - interval '24 hours', false);
  end if;
  if jsonb_typeof(p_match->'recordingEndedAt') = 'string' then
    begin
      v_ts := (p_match->>'recordingEndedAt')::timestamptz;
    exception when others then
      return false;
    end;
    return coalesce(v_ts > now() - interval '6 hours', false);
  end if;
  return false;
end;
$$;

revoke execute on function public.teammate_shots_valid(jsonb) from public, anon, authenticated;
revoke execute on function public.teammate_match_is_open(jsonb) from public, anon, authenticated;

-- --------------------------------------------- create_or_resume_teammate_match
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
  v_total integer;
  v_active integer;
begin
  if v_caller is null then raise exception 'Not authenticated'; end if;
  if not public.can_record_for(v_caller, p_owner_id) then
    raise exception 'Not permitted to record for this account';
  end if;

  if p_opponent is null or length(trim(p_opponent)) = 0 or length(p_opponent) > 120 then
    raise exception 'Invalid opponent name';
  end if;
  if p_date is null or p_date !~ '^\d{4}-\d{2}-\d{2}$' then raise exception 'Invalid date'; end if;
  if length(coalesce(p_competition, '')) > 120 then raise exception 'Invalid competition'; end if;
  if coalesce(p_season, 'Winter') not in ('Winter', 'Summer') then raise exception 'Invalid season'; end if;

  select data into v_data from public.user_data where user_id = p_owner_id for update;
  if v_data is null then raise exception 'Account not found'; end if;
  v_matches := coalesce(v_data->'matches', '[]'::jsonb);

  -- Resume this recorder's still-open recording for the same fixture, if any.
  select elem into v_existing
  from jsonb_array_elements(v_matches) elem
  where elem->>'opponent' = p_opponent
    and elem->>'date' = p_date
    and elem->>'recordedBy' = v_caller::text
    and jsonb_typeof(elem->'recording') = 'object'
    and public.teammate_match_is_open(elem)
  limit 1;

  if v_existing is not null then
    return v_existing;
  end if;

  -- Bounds on how much one recorder can put into someone else's account.
  select count(*) filter (where elem->>'recordedBy' = v_caller::text),
         count(*) filter (where elem->>'recordedBy' = v_caller::text
                            and jsonb_typeof(elem->'recording') = 'object'
                            and public.teammate_match_is_open(elem))
    into v_total, v_active
  from jsonb_array_elements(v_matches) elem;
  if v_active >= 3 then raise exception 'Too many recordings in progress for this account'; end if;
  if v_total >= 150 then raise exception 'The maximum number of recorded matches for this account has been reached'; end if;

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

-- ---------------------------------------------------------- patch_teammate_match
create or replace function public.patch_teammate_match(p_owner_id uuid, p_match_id text, p_patch jsonb)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_caller uuid := auth.uid();
  v_data jsonb;
  v_matches jsonb;
  v_match jsonb;
  v_updated jsonb;
  v_key text;
  v_val jsonb;
begin
  if v_caller is null then raise exception 'Not authenticated'; end if;
  if not public.can_record_for(v_caller, p_owner_id) then
    raise exception 'Not permitted to record for this account';
  end if;

  if p_patch is null or jsonb_typeof(p_patch) is distinct from 'object' then raise exception 'Invalid change'; end if;
  if length(p_patch::text) > 300000 then raise exception 'That change is too large'; end if;

  for v_key, v_val in select * from jsonb_each(p_patch) loop
    if v_key = 'shots' then
      if not public.teammate_shots_valid(v_val) then raise exception 'Invalid shots'; end if;
    elsif v_key = 'recording' then
      if jsonb_typeof(v_val) is distinct from 'null' then raise exception 'A recording can only be ended, not changed'; end if;
    elsif v_key = 'competition' then
      if jsonb_typeof(v_val) is distinct from 'string' or length(v_val #>> '{}') > 120 then raise exception 'Invalid competition'; end if;
    elsif v_key = 'result' then
      if jsonb_typeof(v_val) is distinct from 'string' or length(v_val #>> '{}') > 60 then raise exception 'Invalid result'; end if;
    else
      raise exception 'That field cannot be changed on a teammate''s match';
    end if;
  end loop;

  select data into v_data from public.user_data where user_id = p_owner_id for update;
  if v_data is null then raise exception 'Account not found'; end if;

  select elem into v_match
  from jsonb_array_elements(coalesce(v_data->'matches', '[]'::jsonb)) elem
  where elem->>'id' = p_match_id and elem->>'recordedBy' = v_caller::text
  limit 1;
  if v_match is null then raise exception 'Match not found'; end if;
  if not public.teammate_match_is_open(v_match) then raise exception 'This match is no longer open for changes'; end if;

  v_updated := v_match || p_patch;
  -- The server, not the client, records when the recording ended.
  if p_patch ? 'recording' and jsonb_typeof(v_match->'recording') = 'object' then
    v_updated := v_updated || jsonb_build_object('recordingEndedAt', to_jsonb(now()));
  end if;

  select jsonb_agg(
    case when elem->>'id' = p_match_id and elem->>'recordedBy' = v_caller::text then v_updated else elem end
  ) into v_matches
  from jsonb_array_elements(coalesce(v_data->'matches', '[]'::jsonb)) elem;

  update public.user_data
    set data = jsonb_set(v_data, '{matches}', coalesce(v_matches, '[]'::jsonb)), updated_at = now()
    where user_id = p_owner_id;

  return v_updated;
end;
$$;

-- --------------------------------------------------------- delete_teammate_match
create or replace function public.delete_teammate_match(p_owner_id uuid, p_match_id text)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_caller uuid := auth.uid();
  v_data jsonb;
  v_matches jsonb;
  v_match jsonb;
begin
  if v_caller is null then raise exception 'Not authenticated'; end if;
  if not public.can_record_for(v_caller, p_owner_id) then
    raise exception 'Not permitted to record for this account';
  end if;

  select data into v_data from public.user_data where user_id = p_owner_id for update;
  if v_data is null then raise exception 'Account not found'; end if;

  select elem into v_match
  from jsonb_array_elements(coalesce(v_data->'matches', '[]'::jsonb)) elem
  where elem->>'id' = p_match_id and elem->>'recordedBy' = v_caller::text
  limit 1;
  -- Same behaviour as before for a match that doesn't exist (no-op), but a
  -- recorder can no longer delete a match once it's closed to them.
  if v_match is not null and not public.teammate_match_is_open(v_match) then
    raise exception 'This match is no longer open for changes';
  end if;

  select jsonb_agg(elem) into v_matches
  from jsonb_array_elements(coalesce(v_data->'matches', '[]'::jsonb)) elem
  -- coalesce matters: the owner's own matches have no recordedBy, so the
  -- comparison is NULL for them, and "NOT NULL" is NULL, which would drop
  -- (delete) the row. Only ever remove a match this caller recorded.
  where not coalesce(elem->>'id' = p_match_id and elem->>'recordedBy' = v_caller::text, false);

  update public.user_data
    set data = jsonb_set(v_data, '{matches}', coalesce(v_matches, '[]'::jsonb)), updated_at = now()
    where user_id = p_owner_id;
end;
$$;

revoke execute on function public.create_or_resume_teammate_match(uuid, text, text, text, text) from public, anon;
grant execute on function public.create_or_resume_teammate_match(uuid, text, text, text, text) to authenticated;
revoke execute on function public.patch_teammate_match(uuid, text, jsonb) from public, anon;
grant execute on function public.patch_teammate_match(uuid, text, jsonb) to authenticated;
revoke execute on function public.delete_teammate_match(uuid, text) from public, anon;
grant execute on function public.delete_teammate_match(uuid, text) to authenticated;
