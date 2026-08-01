import { supabase } from "./supabaseClient";

export async function loadUserData() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("user_data")
    .select("data")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) throw error;
  return data ? data.data : null;
}

export async function saveUserData(next) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");

  const { error } = await supabase
    .from("user_data")
    .upsert({ user_id: user.id, data: next, updated_at: new Date().toISOString() });

  if (error) throw error;
  return true;
}
