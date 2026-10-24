import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth.jsx";

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
    <div className="gate">
      <section className="gate-copy">
        <p className="eyebrow">Enrollment</p>
        <h1>Take a role. Keep a trail.</h1>
        <p>Administrators cannot self-register. Demo admins are seeded.</p>
      </section>
      <form className="panel auth-panel" onSubmit={submit}>
        <h2>Create account</h2>
        {error && <p className="banner error">{error}</p>}
        <label>
          Name
          <input value={form.name} onChange={(e) => patch("name", e.target.value)} required />
        </label>
        <label>
          Email
          <input
            type="email"
            value={form.email}
            onChange={(e) => patch("email", e.target.value)}
            required
          />
        </label>
        <label>
          Password
          <input
            type="password"
            minLength={8}
            value={form.password}
            onChange={(e) => patch("password", e.target.value)}
            required
          />
        </label>
        <label>
          Role
          <select value={form.role} onChange={(e) => patch("role", e.target.value)}>
            <option value="viewer">Viewer</option>
            <option value="owner">Document owner</option>
          </select>
        </label>
        <button className="primary" disabled={busy}>
          {busy ? "Creating…" : "Register"}
        </button>
        <p className="fine">
          Already enrolled? <Link to="/login">Sign in</Link>
        </p>
      </form>
    </div>
  );
}
