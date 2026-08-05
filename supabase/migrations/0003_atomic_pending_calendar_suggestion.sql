-- Fixes a real data-loss bug found while live-testing the ImprovMX inbound
-- webhook: email-inbound.js was doing a read-then-write of the entire
-- user_data.data blob (fetch full JSONB, spread it client-side, write the
-- whole thing back) to append one item to pendingCalendarSuggestions. Two
-- overlapping webhook invocations for the same user — plausible any time a
-- keeper forwards more than one email close together, and reliably
-- reproduced here by firing several test requests in quick succession —
-- race on that read-modify-write: whichever write lands second silently
-- reverts whatever the other one changed, including fields the second
-- invocation never touched or knew about (profile.inboundAlias,
-- profile.alertsEnabled, and profile.emailAlertCategories were all lost
-- this way in a real account during testing). Same class of bug as the
-- addReportAndNotify fix earlier in this build, one level lower: that one
-- was a same-process stale-closure race, this one is a genuine
-- cross-invocation database race that JS-level fixes can't solve — it
-- needs the append to happen as a single atomic SQL statement.
create or replace function public.append_pending_calendar_suggestion(p_user_id uuid, p_suggestion jsonb)
returns void
language sql
security definer
set search_path = public
as $$
  update public.user_data
  set data = jsonb_set(
        data,
        '{pendingCalendarSuggestions}',
        coalesce(data->'pendingCalendarSuggestions', '[]'::jsonb) || jsonb_build_array(p_suggestion)
      ),
      updated_at = now()
  where user_id = p_user_id;
$$;

-- Only the server-side service-role client (email-inbound.js) ever calls
-- this — never exposed to anon/authenticated, since it takes an arbitrary
-- user_id and would let one user write into another's row otherwise.
revoke all on function public.append_pending_calendar_suggestion(uuid, jsonb) from public;
grant execute on function public.append_pending_calendar_suggestion(uuid, jsonb) to service_role;
