import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import AuthLayout from "./AuthLayout.jsx";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setBusy(false);
    if (error) {
      setError(error.message);
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <AuthLayout title="Check your email" subtitle="Almost there.">
        <p className="text-sm text-gray-700">
          If an account exists for <b>{email}</b>, we've sent a link to reset your password.
        </p>
        <Link to="/login" className="auth-btn inline-block text-center">Back to log in</Link>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Forgot password"
      subtitle="We'll email you a link to reset it."
      footer={<Link to="/login" className="auth-link">Back to log in</Link>}
    >
      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          className="auth-input"
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          required
        />
        <button className="auth-btn" disabled={busy} type="submit">
          {busy ? "Sending…" : "Send reset link"}
        </button>
        {error && <p className="text-xs text-red-600">{error}</p>}
      </form>
    </AuthLayout>
  );
}
