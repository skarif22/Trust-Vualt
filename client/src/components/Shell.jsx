import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../auth.jsx";

export default function Shell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="app-shell">
      <aside className="rail">
        <div className="brand">
          <span className="crest" aria-hidden>
            ⌬
          </span>
          <div>
            <strong>TrustVault</strong>
            <em>Hash-chained custody</em>
          </div>
        </div>
        <nav>
          <NavLink to="/" end>
            Library
          </NavLink>
          {user.role === "admin" && <NavLink to="/admin">Admin ledger</NavLink>}
        </nav>
        <div className="rail-user">
          <span className={`role-pill role-${user.role}`}>{user.role}</span>
          <p>{user.name}</p>
          <small>{user.email}</small>
          <button
            className="ghost"
            onClick={() => {
              logout();
              navigate("/login");
            }}
          >
            Sign out
          </button>
        </div>
      </aside>
      <main className="stage">
        <Outlet />
      </main>
    </div>
  );
}
