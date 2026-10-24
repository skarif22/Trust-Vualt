import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useAuth } from "./auth.jsx";
import Shell from "./components/Shell.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import Library from "./pages/Library.jsx";
import DocumentPage from "./pages/DocumentPage.jsx";
import Admin from "./pages/Admin.jsx";

function Guard({ children, role }) {
  const { user, ready } = useAuth();
  const location = useLocation();
  if (!ready) return <div className="boot">Opening vault…</div>;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (role && user.role !== role) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  const { user, ready } = useAuth();
  if (!ready) return <div className="boot">Opening vault…</div>;

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/register" element={user ? <Navigate to="/" replace /> : <Register />} />
      <Route
        element={
          <Guard>
            <Shell />
          </Guard>
        }
      >
        <Route path="/" element={<Library />} />
        <Route path="/documents/:id" element={<DocumentPage />} />
        <Route
          path="/admin"
          element={
            <Guard role="admin">
              <Admin />
            </Guard>
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
