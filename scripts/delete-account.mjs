#!/usr/bin/env node
// Deletes a Keepr account completely: every uploaded file (both storage
// buckets) and then the auth user, whose deletion cascades to user_data,
// connections, invite codes and usage records. Needed because deleting an auth
// user alone does NOT remove storage objects, so physio documents and match
// videos would otherwise be left behind.
//
//   set -a; source .env; set +a
//   node scripts/delete-account.mjs someone@example.com            # dry run (default)
//   node scripts/delete-account.mjs someone@example.com --confirm  # actually delete
//
// Accepts an email address or a user UUID. Uses the service-role key, so run it
// only from a trusted machine. Not part of the deployed app.
import { createClient } from "@supabase/supabase-js";

const BUCKETS = ["niggle-files", "match-videos"];
const [, , target, flag] = process.argv;
const confirm = flag === "--confirm";

if (!target || (flag && flag !== "--confirm")) {
  console.error("Usage: node scripts/delete-account.mjs <email-or-uuid> [--confirm]");
  process.exit(1);
}
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set (source .env first).");
  process.exit(1);
}

const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

async function findUser(t) {
  if (/^[0-9a-f-]{36}$/i.test(t)) {
    const { data, error } = await admin.auth.admin.getUserById(t);
    if (error) throw error;
    return data.user;
  }
  for (let page = 1; ; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const hit = data.users.find((u) => (u.email || "").toLowerCase() === t.toLowerCase());
    if (hit) return hit;
    if (data.users.length < 200) return null;
  }
}

// storage.list only returns one level, so walk the {user_id}/ tree.
async function listAll(bucket, prefix) {
  const files = [];
  const { data, error } = await admin.storage.from(bucket).list(prefix, { limit: 1000 });
  if (error) throw error;
  for (const item of data || []) {
    if (item.id) files.push(`${prefix}/${item.name}`);
    else files.push(...(await listAll(bucket, `${prefix}/${item.name}`)));
  }
  return files;
}

const user = await findUser(target);
if (!user) {
  console.error(`No account found for "${target}".`);
  process.exit(1);
}
console.log(`Account: ${user.email} (${user.id})`);

const toDelete = {};
for (const bucket of BUCKETS) {
  toDelete[bucket] = await listAll(bucket, user.id);
  console.log(`  ${bucket}: ${toDelete[bucket].length} file(s)`);
}

// Matches this user recorded INTO other people's accounts stay there (the Terms
// say so); they carry this user's id and email, so report them.
const { data: rows, error: rowsError } = await admin.from("user_data").select("user_id, data");
if (rowsError) throw rowsError;
const recordedElsewhere = rows.filter((r) => r.user_id !== user.id)
  .reduce((n, r) => n + (r.data?.matches || []).filter((m) => m.recordedBy === user.id).length, 0);
console.log(`  matches this account recorded into other accounts (left in place): ${recordedElsewhere}`);

if (!confirm) {
  console.log("\nDry run only. Re-run with --confirm to delete the files above and the account.");
  process.exit(0);
}

for (const bucket of BUCKETS) {
  for (let i = 0; i < toDelete[bucket].length; i += 100) {
    const { error } = await admin.storage.from(bucket).remove(toDelete[bucket].slice(i, i + 100));
    if (error) throw error;
  }
}
const { error: delError } = await admin.auth.admin.deleteUser(user.id);
if (delError) throw delError;
console.log(`\nDeleted ${user.email}: ${BUCKETS.map((b) => toDelete[b].length).reduce((a, b) => a + b, 0)} file(s) and the account.`);
