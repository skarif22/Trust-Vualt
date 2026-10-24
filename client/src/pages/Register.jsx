import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth.jsx";
import AuthFrame from "../components/AuthFrame.jsx";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "viewer",
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function patch(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await register(form);
      navigate("/", { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthFrame>
      <form className="auth-form" onSubmit={submit}>
        <p className="auth-form-kicker">JOIN SILICAVAULT</p>
        <h3>Create your account</h3>
        <p className="auth-form-subtitle">Set up secure access to your document workspace.</p>
        {error && <p className="banner error">{error}</p>}
        <label>
          FULL NAME
          <input value={form.name} onChange={(e) => patch("name", e.target.value)} required />
        </label>
        <label>
          EMAIL ADDRESS
          <input
            type="email"
            value={form.email}
            onChange={(e) => patch("email", e.target.value)}
            required
          />
        </label>
        <label>
          PASSWORD
          <input
            type="password"
            minLength={8}
            value={form.password}
            onChange={(e) => patch("password", e.target.value)}
            required
          />
        </label>
        <label>
          ACCOUNT TYPE
          <select value={form.role} onChange={(e) => patch("role", e.target.value)}>
            <option value="viewer">Viewer</option>
            <option value="owner">Document owner</option>
          </select>
        </label>
        <button className="primary" disabled={busy}>
          {busy ? "CREATING ACCOUNT…" : "CREATE SECURE ACCOUNT  →"}
        </button>
        <p className="fine">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </form>
    </AuthFrame>
  );
}

