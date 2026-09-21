-- Security fix (audit finding U1). Run in the Supabase dashboard SQL Editor.
-- Safe to re-run.
--
-- Migrations 0003/0004/0006 created five SECURITY DEFINER functions that take
-- an arbitrary p_user_id and write into that user's row, each ending with
-- "revoke all ... from public; grant execute ... to service_role;" on the
-- assumption that this left only service_role able to call them. It didn't:
-- Supabase's default privileges grant EXECUTE on new public-schema functions
-- to the anon and authenticated roles *explicitly*, and REVOKE ... FROM PUBLIC
-- does not touch explicit role grants. Verified live before this migration:
-- the public anon key (no login) could call all five and write into any
-- user's blob. can_record_for had the same problem despite its comment.
--
-- After this, the five write functions are executable by service_role only
-- (the Netlify functions, which use the service-role key). can_record_for is
-- executable by nothing directly; it is only called from inside the
-- SECURITY DEFINER teammate functions, which run as their owner.

revoke execute on function public.append_pending_calendar_suggestion(uuid, jsonb) from public, anon, authenticated;
revoke execute on function public.append_email_alert_log(uuid, jsonb)            from public, anon, authenticated;
revoke execute on function public.set_alerts_enabled(uuid, boolean)              from public, anon, authenticated;
revoke execute on function public.append_report(uuid, jsonb)                     from public, anon, authenticated;
revoke execute on function public.set_last_coach_digest_sent(uuid, timestamptz)  from public, anon, authenticated;
revoke execute on function public.can_record_for(uuid, uuid)                     from public, anon, authenticated;

grant execute on function public.append_pending_calendar_suggestion(uuid, jsonb) to service_role;
grant execute on function public.append_email_alert_log(uuid, jsonb)            to service_role;
grant execute on function public.set_alerts_enabled(uuid, boolean)              to service_role;
grant execute on function public.append_report(uuid, jsonb)                     to service_role;
grant execute on function public.set_last_coach_digest_sent(uuid, timestamptz)  to service_role;

-- Defence in depth: the teammate/invite functions from 0005 are meant for
-- signed-in users only. They already refuse anonymous callers ("Not
-- authenticated"), but there's no reason for anon to be able to execute them
-- at all.
revoke execute on function public.get_or_create_invite_code()                                  from anon;
revoke execute on function public.regenerate_invite_code()                                     from anon;
revoke execute on function public.redeem_invite_code(text)                                     from anon;
revoke execute on function public.accept_connection(uuid)                                      from anon;
revoke execute on function public.decline_connection(uuid)                                     from anon;
revoke execute on function public.revoke_connection(uuid)                                      from anon;
revoke execute on function public.set_recording_permission(uuid, boolean)                      from anon;
revoke execute on function public.create_or_resume_teammate_match(uuid, text, text, text, text) from anon;
revoke execute on function public.patch_teammate_match(uuid, text, jsonb)                      from anon;
revoke execute on function public.delete_teammate_match(uuid, text)                            from anon;

-- Stop this recurring: functions created from now on in public don't
-- automatically become callable by anon/authenticated. Any future function
-- that should be client-callable must say so explicitly with its own
-- "grant execute ... to authenticated", as the 0005 functions already do.
alter default privileges in schema public revoke execute on functions from anon, authenticated, public;
