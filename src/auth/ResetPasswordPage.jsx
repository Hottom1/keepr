import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import AuthLayout from "./AuthLayout.jsx";

export default function ResetPasswordPage() {
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Clicking the reset-password email link lands here with a recovery
    // token in the URL; supabase-js exchanges it for a session automatically
    // and fires this event once that's done.
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) {
      setError(error.message);
      return;
    }
    setDone(true);
    setTimeout(() => navigate("/app", { replace: true }), 1200);
  }

  if (done) {
    return (
      <AuthLayout title="Password updated" subtitle="Taking you to Keepr…">
        <p className="text-sm text-gray-700">Your password's been changed.</p>
      </AuthLayout>
    );
  }

  if (!ready) {
    return (
      <AuthLayout title="Reset link" subtitle="Checking your link…">
        <p className="text-xs text-gray-500">
          If this doesn't update in a few seconds, the link may have expired — request a new one from the forgot-password page.
        </p>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Choose a new password" subtitle="Make it something you'll remember.">
      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          className="auth-input"
          type="password"
          placeholder="New password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          minLength={6}
          required
        />
        <input
          className="auth-input"
          type="password"
          placeholder="Confirm new password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          autoComplete="new-password"
          minLength={6}
          required
        />
        <button className="auth-btn" disabled={busy} type="submit">
          {busy ? "Saving…" : "Save new password"}
        </button>
        {error && <p className="text-xs text-red-600">{error}</p>}
      </form>
    </AuthLayout>
  );
}
