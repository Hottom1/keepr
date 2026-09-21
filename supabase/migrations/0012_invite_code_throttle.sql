-- Security audit W2. Run in the Supabase dashboard SQL Editor: click into the
-- editor, press Cmd+A to select everything, paste over it, check the first line
-- reads "-- Security audit W2", then Run. Safe to re-run.
--
-- redeem_invite_code had no attempt limit, so invite codes (7 hex characters)
-- could be guessed in bulk. Failed guesses are now recorded and a user is
-- blocked after 10 failures in an hour or 30 in a day. A wrong code now RETURNS
-- NULL instead of raising, because a raised exception rolls back the very row
-- that records the failure; the client treats null as "not found", so the
-- user-facing behaviour is unchanged. Privileges are restated explicitly (see
-- 0008 for why).

create table if not exists public.invite_redeem_failures (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  at timestamptz not null default now()
);
create index if not exists invite_redeem_failures_recent on public.invite_redeem_failures (user_id, at desc);
alter table public.invite_redeem_failures enable row level security;
revoke all on table public.invite_redeem_failures from anon, authenticated;

create or replace function public.redeem_invite_code(p_code text)
returns public.connections
language plpgsql security definer set search_path = public as $$
declare
  v_caller uuid := auth.uid();
  v_owner uuid;
  v_code text := upper(trim(coalesce(p_code, '')));
  v_caller_email text;
  v_owner_email text;
  v_existing public.connections;
  v_row public.connections;
begin
  if v_caller is null then raise exception 'Not authenticated'; end if;

  -- Throttle guessing: block after 10 wrong codes in an hour or 30 in a day.
  -- (Old rows are pruned here rather than by a scheduled job.)
  delete from public.invite_redeem_failures where user_id = v_caller and at < now() - interval '2 days';
  if (select count(*) from public.invite_redeem_failures where user_id = v_caller and at > now() - interval '1 hour') >= 10
     or (select count(*) from public.invite_redeem_failures where user_id = v_caller and at > now() - interval '24 hours') >= 30 then
    raise exception 'Too many attempts. Please wait a while before trying again.';
  end if;

  if length(v_code) > 0 and length(v_code) <= 32 then
    select user_id into v_owner from public.keeper_invite_codes where code = v_code;
  end if;
  if v_owner is null then
    -- Return NULL rather than raising: a raised exception would roll back
    -- this insert and the failure would never be counted.
    insert into public.invite_redeem_failures (user_id) values (v_caller);
    return null;
  end if;
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

revoke execute on function public.redeem_invite_code(text) from public, anon;
grant execute on function public.redeem_invite_code(text) to authenticated;
