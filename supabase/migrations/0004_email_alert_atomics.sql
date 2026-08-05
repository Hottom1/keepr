-- Same atomic-write discipline established in migration 0003 for the
-- inbound webhook: the scheduled alerts function (netlify/functions/
-- scheduled-alerts.js) and the unsubscribe endpoint (netlify/functions/
-- unsubscribe.js) both mutate user_data.data from server-side code with no
-- single browser owning the write, so both go through a single atomic SQL
-- statement rather than a fetch-then-write of the whole blob.

-- Appends the fingerprints of alerts just emailed, so the next scheduled
-- run's cooldown check (fingerprint already logged within the cooldown
-- window => skip) doesn't re-send the same still-true condition every day.
create or replace function public.append_email_alert_log(p_user_id uuid, p_entries jsonb)
returns void
language sql
security definer
set search_path = public
as $$
  update public.user_data
  set data = jsonb_set(
        data,
        '{profile,emailAlertLog}',
        coalesce(data->'profile'->'emailAlertLog', '[]'::jsonb) || p_entries
      ),
      updated_at = now()
  where user_id = p_user_id;
$$;

-- Used by the unsubscribe link — sets the same profile.alertsEnabled flag
-- the in-app toggle already writes, so "unsubscribe" and "turn off Kip
-- alerts in Profile" are the same switch, not two independent ones that
-- could drift.
create or replace function public.set_alerts_enabled(p_user_id uuid, p_enabled boolean)
returns void
language sql
security definer
set search_path = public
as $$
  update public.user_data
  set data = jsonb_set(data, '{profile,alertsEnabled}', to_jsonb(p_enabled)),
      updated_at = now()
  where user_id = p_user_id;
$$;

revoke all on function public.append_email_alert_log(uuid, jsonb) from public;
grant execute on function public.append_email_alert_log(uuid, jsonb) to service_role;

revoke all on function public.set_alerts_enabled(uuid, boolean) from public;
grant execute on function public.set_alerts_enabled(uuid, boolean) to service_role;
