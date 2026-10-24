import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth.jsx";
import AuthFrame from "../components/AuthFrame.jsx";

const DEMOS = [
  { email: "admin@trustvault.dev", password: "Admin123!", label: "Administrator" },
  { email: "owner@trustvault.dev", password: "Owner123!", label: "Document owner" },
  { email: "viewer@trustvault.dev", password: "Viewer123!", label: "Viewer" },
];

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await login(email, password);
      navigate(location.state?.from || "/", { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthFrame>
      <form className="auth-form" onSubmit={submit}>
        <p className="auth-form-kicker">WELCOME BACK</p>
        <h3>Open your vault</h3>
        <p className="auth-form-subtitle">Sign in to continue to your secure workspace.</p>
        {error && <p className="banner error">{error}</p>}
        <label>
          EMAIL ADDRESS
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" placeholder="you@company.com" required />
        </label>
        <label>
          PASSWORD
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            placeholder="Enter your password"
            required
          />
        </label>
        <button className="primary" disabled={busy}>
          {busy ? "SECURELY SIGNING IN…" : "SIGN IN TO SILICAVAULT  →"}
        </button>
        <p className="fine">
          New to SilicaVault? <Link to="/register">Create an account</Link>
        </p>
        <div className="demo-heading"><span>DEMO ACCESS</span><i /></div>
        <p className="demo-hint">Choose a role to fill in its demo credentials.</p>
        <div className="demo-row">
          {DEMOS.map((d) => (
            <button
              type="button"
              key={d.email}
              onClick={() => {
                setEmail(d.email);
                setPassword(d.password);
              }}
            >
              {d.label}
            </button>
          ))}
        </div>
      </form>
    </AuthFrame>
  );
}

