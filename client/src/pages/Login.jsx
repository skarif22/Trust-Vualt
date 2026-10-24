import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth.jsx";

const DEMOS = [
  { email: "admin@trustvault.dev", password: "Admin123!", label: "Administrator" },
  { email: "owner@trustvault.dev", password: "Owner123!", label: "Document owner" },
  { email: "viewer@trustvault.dev", password: "Viewer123!", label: "Viewer" },
];

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("owner@trustvault.dev");
  const [password, setPassword] = useState("Owner123!");
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
    <div className="gate">
      <section className="gate-copy">
        <p className="eyebrow">Secure document sharing</p>
        <h1>SilicaVault</h1>
        <p>
          SilicaVault keeps files behind per-document grants and writes a SHA-256 chained
          audit trail no role can silently rewrite.
        </p>
      </section>
      <form className="panel auth-panel" onSubmit={submit}>
        <h2>Open the vault</h2>
        {error && <p className="banner error">{error}</p>}
        <label>
          Email
          <input value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" />
        </label>
        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </label>
        <button className="primary" disabled={busy}>
          {busy ? "Checking…" : "Sign in"}
        </button>
        <p className="fine">
          New here? <Link to="/register">Create a viewer or owner account</Link>
        </p>
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
    </div>
  );
}
