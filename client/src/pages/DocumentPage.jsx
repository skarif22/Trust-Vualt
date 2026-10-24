import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api, downloadBlob } from "../api.js";
import { useAuth } from "../auth.jsx";

export default function DocumentPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [events, setEvents] = useState([]);
  const [error, setError] = useState("");
  const [grant, setGrant] = useState({ email: "viewer@trustvault.dev", canRead: true, canEdit: false });
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  async function load() {
    const detail = await api(`/api/documents/${id}`);
    setData(detail);
    setTitle(detail.document.title);
    setDescription(detail.document.description);
    if (detail.access.isOwner || user.role === "admin") {
      const trail = await api(`/api/documents/${id}/audit`);
      setEvents(trail.events);
    } else {
      setEvents([]);
    }
  }

  useEffect(() => {
    load().catch((err) => setError(err.message));
  }, [id]);

  if (error) {
    return (
      <div className="page">
        <p className="banner error">{error}</p>
        <Link to="/">Back to library</Link>
      </div>
    );
  }
  if (!data) return <div className="page">Loading document…</div>;

  const { document: doc, access, permissions } = data;

  async function saveMeta(e) {
    e.preventDefault();
    await api(`/api/documents/${id}`, {
      method: "PUT",
      body: JSON.stringify({ title, description }),
    });
    await load();
  }

  async function download() {
    try {
      const buffer = await api(`/api/documents/${id}/download`);
      downloadBlob(buffer, doc.filename, doc.mime_type);
    } catch (err) {
      setError(err.message);
    }
  }

  async function grantAccess(e) {
    e.preventDefault();
    await api(`/api/documents/${id}/permissions`, {
      method: "POST",
      body: JSON.stringify(grant),
    });
    await load();
  }

  async function revoke(userId) {
    await api(`/api/documents/${id}/permissions/${userId}`, { method: "DELETE" });
    await load();
  }

  async function remove() {
    if (!confirm("Delete this document?")) return;
    await api(`/api/documents/${id}`, { method: "DELETE" });
    navigate("/");
  }

  return (
    <div className="page">
      <Link to="/" className="crumb">
        ← Library
      </Link>
      <header className="page-head">
        <div>
          <p className="eyebrow">{doc.folder_name || "Unfiled"}</p>
          <h1>{doc.title}</h1>
          <p className="lede">
            Owner {doc.owner_name} · {doc.filename} · {(doc.size_bytes / 1024).toFixed(1)} KB
          </p>
        </div>
        <div className="actions">
          {access.canDownload ? (
            <button className="primary" onClick={download}>
              Download
            </button>
          ) : (
            <button className="primary" disabled>
              Download blocked
            </button>
          )}
          {access.isOwner && (
            <button className="danger" onClick={remove}>
              Delete
            </button>
          )}
        </div>
      </header>
      {access.adminMetadataOnly && (
        <p className="banner">
          Admin metadata view: you can inspect the record, not the bytes. Isolation holds.
        </p>
      )}
      {error && <p className="banner error">{error}</p>}

      <div className="split">
        <section className="panel">
          <h3>Details</h3>
          {access.canEdit ? (
            <form onSubmit={saveMeta}>
              <label>
                Title
                <input value={title} onChange={(e) => setTitle(e.target.value)} />
              </label>
              <label>
                Description
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} />
              </label>
              <button className="primary">Save</button>
            </form>
          ) : (
            <p>{doc.description || "No description"}</p>
          )}
        </section>

        {access.isOwner && (
          <section className="panel">
            <h3>Access grants</h3>
            <form onSubmit={grantAccess} className="grant-form">
              <input
                placeholder="colleague@email"
                value={grant.email}
                onChange={(e) => setGrant({ ...grant, email: e.target.value })}
              />
              <label className="check">
                <input
                  type="checkbox"
                  checked={grant.canRead}
                  onChange={(e) => setGrant({ ...grant, canRead: e.target.checked })}
                />
                Read
              </label>
              <label className="check">
                <input
                  type="checkbox"
                  checked={grant.canEdit}
                  onChange={(e) => setGrant({ ...grant, canEdit: e.target.checked })}
                />
                Edit
              </label>
              <button className="primary">Grant</button>
            </form>
            <ul className="grant-list">
              {permissions.map((p) => (
                <li key={p.user_id}>
                  <div>
                    <strong>{p.name}</strong>
                    <small>
                      {p.email} · {p.can_edit ? "edit" : "read"}
                    </small>
                  </div>
                  <button onClick={() => revoke(p.user_id)}>Revoke</button>
                </li>
              ))}
              {!permissions.length && <li className="empty">No grants yet.</li>}
            </ul>
          </section>
        )}
      </div>

      {(access.isOwner || user.role === "admin") && (
        <section className="panel">
          <h3>Document audit chain</h3>
          <table className="ledger">
            <thead>
              <tr>
                <th>When</th>
                <th>Actor</th>
                <th>Action</th>
                <th>Hash</th>
              </tr>
            </thead>
            <tbody>
              {events.map((ev) => (
                <tr key={ev.id} className={ev.success ? "" : "fail"}>
                  <td>{new Date(ev.created_at).toLocaleString()}</td>
                  <td>{ev.actor_email}</td>
                  <td>
                    {ev.action}
                    {!ev.success && " (denied)"}
                  </td>
                  <td className="mono">{ev.entry_hash?.slice(0, 16)}…</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}
