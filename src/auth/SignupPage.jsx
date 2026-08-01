import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import AuthLayout from "./AuthLayout.jsx";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [checkEmail, setCheckEmail] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    setBusy(true);
    const { data, error } = await supabase.auth.signUp({ email, password });
    setBusy(false);
    if (error) {
      setError(error.message);
      return;
    }
    if (data.session) {
      navigate("/app", { replace: true });
    } else {
      setCheckEmail(true);
    }
  }

  if (checkEmail) {
    return (
      <AuthLayout title="Check your email" subtitle="One more step.">
        <p className="text-sm text-gray-700">
          We've sent a confirmation link to <b>{email}</b>. Click it to activate your account, then come back and log in.
        </p>
        <Link to="/login" className="auth-btn inline-block text-center">Back to log in</Link>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Sign up"
      subtitle="Create your Keepr account."
      footer={
        <>
          Already have an account? <Link to="/login" className="auth-link">Log in</Link>
        </>
      }
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
        <input
          className="auth-input"
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          minLength={6}
          required
        />
        <input
          className="auth-input"
          type="password"
          placeholder="Confirm password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          autoComplete="new-password"
          minLength={6}
          required
        />
        <button className="auth-btn" disabled={busy} type="submit">
          {busy ? "Creating account…" : "Sign up"}
        </button>
        {error && <p className="text-xs text-red-600">{error}</p>}
      </form>
    </AuthLayout>
  );
}
