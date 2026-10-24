import { useEffect, useState } from "react";
import { api } from "../api.js";

export default function Admin() {
  const [overview, setOverview] = useState(null);
  const [events, setEvents] = useState([]);
  const [verify, setVerify] = useState(null);
  const [q, setQ] = useState("");
  const [success, setSuccess] = useState("");

  async function loadLogs(search = q, ok = success) {
    const params = new URLSearchParams();
    if (search) params.set("q", search);
    if (ok) params.set("success", ok);
    const data = await api(`/api/admin/audit?${params}`);
    setEvents(data.events);
  }

  useEffect(() => {
    (async () => {
      const [over, v] = await Promise.all([
        api("/api/admin/overview"),
        api("/api/admin/audit/verify"),
      ]);
      setOverview(over);
      setVerify(v);
      await loadLogs();
    })();
  }, []);

  if (!overview) return <div className="page">Loading ledger…</div>;

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <p className="eyebrow">Administrator</p>
          <h1>Activity ledger</h1>
        </div>
        <div className={`seal ${verify?.intact ? "ok" : "bad"}`}>
          {verify?.intact ? "Chain intact" : "Chain broken"}
          <small>
            {verify?.count} events · tip {verify?.tipHash?.slice(0, 12)}…
          </small>
        </div>
      </header>

      <div className="stats">
        <article>
          <strong>{overview.stats.users}</strong>
          <span>Users</span>
        </article>
        <article>
          <strong>{overview.stats.documents}</strong>
          <span>Documents</span>
        </article>
        <article>
          <strong>{overview.stats.grants}</strong>
          <span>Grants</span>
        </article>
        <article>
          <strong>{overview.stats.failedEvents}</strong>
          <span>Failed attempts</span>
        </article>
      </div>

      <form
        className="search"
        onSubmit={(e) => {
          e.preventDefault();
          loadLogs();
        }}
      >
        <input
          placeholder="Filter actor, action, resource"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select value={success} onChange={(e) => setSuccess(e.target.value)}>
          <option value="">All outcomes</option>
          <option value="true">Succeeded</option>
          <option value="false">Denied / failed</option>
        </select>
        <button className="primary">Filter</button>
      </form>

      <section className="panel">
        <table className="ledger">
          <thead>
            <tr>
              <th>ID</th>
              <th>When</th>
              <th>Actor</th>
              <th>Action</th>
              <th>Resource</th>
              <th>Prev</th>
              <th>Hash</th>
            </tr>
          </thead>
          <tbody>
            {events.map((ev) => (
              <tr key={ev.id} className={ev.success ? "" : "fail"}>
                <td>{ev.id}</td>
                <td>{new Date(ev.created_at).toLocaleString()}</td>
                <td>{ev.actor_email || "—"}</td>
                <td>{ev.action}</td>
                <td className="mono">{ev.resource_id ? ev.resource_id.slice(0, 8) : "—"}</td>
                <td className="mono">{ev.prev_hash?.slice(0, 10)}…</td>
                <td className="mono">{ev.entry_hash?.slice(0, 10)}…</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
