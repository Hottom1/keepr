-- Same atomic-write discipline as migrations 0003/0004: the coach-digest
-- scheduled function (netlify/functions/coach-digest.js) and its on-demand
-- "Send now" counterpart both mutate user_data.data from server-side code
-- with no single browser owning the write, so both go through a single
-- atomic SQL statement rather than a fetch-then-write of the whole blob.
-- Service-role only, same reasoning as 0003/0004: both take an arbitrary
-- user_id, which would let one user touch another's row if ever exposed to
-- authenticated/anon.

-- Appends one sent report ({id, createdAt, season, data, narrative,
-- sentToCoach: true, coachEmail}) to the keeper's own reports array, so a
-- coach digest is visible in-app the same way a self-generated report is —
-- "what did my coach actually see" rather than a black box.
create or replace function public.append_report(p_user_id uuid, p_report jsonb)
returns void
language sql
security definer
set search_path = public
as $$
  update public.user_data
  set data = jsonb_set(
        data,
        '{reports}',
        coalesce(data->'reports', '[]'::jsonb) || jsonb_build_array(p_report)
      ),
      updated_at = now()
  where user_id = p_user_id;
$$;

-- Drives the cadence-gating check in coach-digest.js (weekly vs monthly,
-- keeper's choice) — same profile.* convention as alertsEnabled/emailAlertLog.
create or replace function public.set_last_coach_digest_sent(p_user_id uuid, p_sent_at timestamptz)
returns void
language sql
security definer
set search_path = public
as $$
  update public.user_data
  set data = jsonb_set(data, '{profile,lastCoachDigestSentAt}', to_jsonb(p_sent_at)),
      updated_at = now()
  where user_id = p_user_id;
$$;

revoke all on function public.append_report(uuid, jsonb) from public;
grant execute on function public.append_report(uuid, jsonb) to service_role;

revoke all on function public.set_last_coach_digest_sent(uuid, timestamptz) from public;
grant execute on function public.set_last_coach_digest_sent(uuid, timestamptz) to service_role;
