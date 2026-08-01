import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import AuthLayout from "./AuthLayout.jsx";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  async function handleSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) {
      setError(error.message);
      return;
    }
    navigate(location.state?.from?.pathname || "/app", { replace: true });
  }

  return (
    <AuthLayout
      title="Log in"
      subtitle="Welcome back — pick up where you left off."
      footer={
        <>
          Don't have an account? <Link to="/signup" className="auth-link">Sign up</Link>
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
          autoComplete="current-password"
          required
        />
        <div className="text-right -mt-1">
          <Link to="/forgot-password" className="auth-link">Forgot password?</Link>
        </div>
        <button className="auth-btn" disabled={busy} type="submit">
          {busy ? "Signing in…" : "Log in"}
        </button>
        {error && <p className="text-xs text-red-600">{error}</p>}
      </form>
    </AuthLayout>
  );
}
