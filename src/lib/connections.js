// Thin wrappers around the RPCs in migration 0005. Every cross-account
// write in this file goes through a security-definer function that reads
// auth.uid() itself and re-checks the connections table on every call — see
// that migration's header comment for why. Nothing here does its own
// permission logic; that all lives in Postgres, in one place.
import { supabase } from "./supabaseClient";

async function currentUserId() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");
  return user.id;
}

export async function getMyInviteCode() {
  const { data, error } = await supabase.rpc("get_or_create_invite_code");
  if (error) throw error;
  return data;
}

export async function regenerateMyInviteCode() {
  const { data, error } = await supabase.rpc("regenerate_invite_code");
  if (error) throw error;
  return data;
}

export async function redeemInviteCode(code) {
  const { data, error } = await supabase.rpc("redeem_invite_code", { p_code: code.trim().toUpperCase() });
  if (error) throw error;
  return data;
}

export async function acceptConnection(connectionId) {
  const { data, error } = await supabase.rpc("accept_connection", { p_connection_id: connectionId });
  if (error) throw error;
  return data;
}

export async function declineConnection(connectionId) {
  const { data, error } = await supabase.rpc("decline_connection", { p_connection_id: connectionId });
  if (error) throw error;
  return data;
}

export async function revokeConnection(connectionId) {
  const { data, error } = await supabase.rpc("revoke_connection", { p_connection_id: connectionId });
  if (error) throw error;
  return data;
}

export async function setRecordingPermission(connectionId, grant) {
  const { data, error } = await supabase.rpc("set_recording_permission", { p_connection_id: connectionId, p_grant: grant });
  if (error) throw error;
  return data;
}

// Every connection row this user is a party to, in either direction —
// RLS on the connections table already scopes this to just their own rows.
export async function getMyConnections() {
  const userId = await currentUserId();
  const { data, error } = await supabase
    .from("connections")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []).map((row) => ({ ...row, viewerId: userId }));
}

export async function createOrResumeTeammateMatch({ ownerId, opponent, date, competition, season }) {
  const { data, error } = await supabase.rpc("create_or_resume_teammate_match", {
    p_owner_id: ownerId,
    p_opponent: opponent,
    p_date: date,
    p_competition: competition || "",
    p_season: season,
  });
  if (error) throw error;
  return data;
}

export async function patchTeammateMatch(ownerId, matchId, patch) {
  const { data, error } = await supabase.rpc("patch_teammate_match", {
    p_owner_id: ownerId,
    p_match_id: matchId,
    p_patch: patch,
  });
  if (error) throw error;
  return data;
}

export async function deleteTeammateMatch(ownerId, matchId) {
  const { error } = await supabase.rpc("delete_teammate_match", { p_owner_id: ownerId, p_match_id: matchId });
  if (error) throw error;
}

// Derives the two view-relevant lists from a raw connections row set for a
// given viewer: accepted connections where the viewer currently has
// recording rights granted to them, and incoming pending requests.
export function summarizeConnections(rows, viewerId) {
  const accepted = rows.filter((r) => r.status === "accepted");
  const incomingPending = rows.filter((r) => r.status === "pending" && r.recipient_id === viewerId);
  const outgoingPending = rows.filter((r) => r.status === "pending" && r.requester_id === viewerId);
  const canRecordFor = accepted.filter((r) => {
    if (r.requester_id === viewerId) return r.recipient_allows_requester_to_record;
    return r.requester_allows_recipient_to_record;
  });
  return { accepted, incomingPending, outgoingPending, canRecordFor };
}

// The partner's id/email for a connection row, from the viewer's side.
export function partnerOf(row, viewerId) {
  return row.requester_id === viewerId
    ? { id: row.recipient_id, email: row.recipient_email }
    : { id: row.requester_id, email: row.requester_email };
}

// Whether *I* (viewerId) currently grant *my* partner recording rights on
// this connection — the column to flip depends on which side I'm on.
export function myOutgoingGrant(row, viewerId) {
  return row.requester_id === viewerId ? row.requester_allows_recipient_to_record : row.recipient_allows_requester_to_record;
}
