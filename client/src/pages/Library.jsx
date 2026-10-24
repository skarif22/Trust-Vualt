import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";
import { useAuth } from "../auth.jsx";

export default function Library() {
  const { user } = useAuth();
  const [documents, setDocuments] = useState([]);
  const [folders, setFolders] = useState([]);
  const [q, setQ] = useState("");
  const [folderId, setFolderId] = useState("");
  const [error, setError] = useState("");
  const [folderName, setFolderName] = useState("");
  const [upload, setUpload] = useState({ title: "", description: "", folderId: "", file: null });

  async function load(search = q, folder = folderId) {
    const params = new URLSearchParams();
    if (search) params.set("q", search);
    if (folder) params.set("folderId", folder);
    const [docs, folds] = await Promise.all([
      api(`/api/documents?${params}`),
      api("/api/documents/folders"),
    ]);
    setDocuments(docs.documents);
    setFolders(folds.folders);
  }

  useEffect(() => {
    load().catch((err) => setError(err.message));
  }, []);

  async function createFolder(e) {
    e.preventDefault();
    await api("/api/documents/folders", {
      method: "POST",
      body: JSON.stringify({ name: folderName }),
    });
    setFolderName("");
    await load();
  }

  async function submitUpload(e) {
    e.preventDefault();
    if (!upload.file) return;
    const body = new FormData();
    body.append("file", upload.file);
    body.append("title", upload.title || upload.file.name);
    body.append("description", upload.description);
    if (upload.folderId) body.append("folderId", upload.folderId);
    await api("/api/documents", { method: "POST", body });
    setUpload({ title: "", description: "", folderId: "", file: null });
    e.target.reset();
    await load();
  }

  const canUpload = user.role === "owner" || user.role === "admin";

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <p className="eyebrow">Library</p>
          <h1>Documents in your custody</h1>
        </div>
        <form
          className="search"
          onSubmit={(e) => {
            e.preventDefault();
            load();
          }}
        >
          <input
            placeholder="Search title, file, description"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <select
            value={folderId}
            onChange={(e) => {
              setFolderId(e.target.value);
              load(q, e.target.value);
            }}
          >
            <option value="">All folders</option>
            {folders.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
          <button className="primary">Search</button>
        </form>
      </header>
      {error && <p className="banner error">{error}</p>}

      {canUpload && (
        <div className="split">
          <form className="panel" onSubmit={submitUpload}>
            <h3>Upload</h3>
            <label>
              Title
              <input
                value={upload.title}
                onChange={(e) => setUpload({ ...upload, title: e.target.value })}
              />
            </label>
            <label>
              Description
              <input
                value={upload.description}
                onChange={(e) => setUpload({ ...upload, description: e.target.value })}
              />
            </label>
            <label>
              Folder
              <select
                value={upload.folderId}
                onChange={(e) => setUpload({ ...upload, folderId: e.target.value })}
              >
                <option value="">Unfiled</option>
                {folders.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              File
              <input
                type="file"
                onChange={(e) => setUpload({ ...upload, file: e.target.files[0] })}
                required
              />
            </label>
            <button className="primary">Store in vault</button>
          </form>
          <form className="panel" onSubmit={createFolder}>
            <h3>New folder</h3>
            <label>
              Name
              <input value={folderName} onChange={(e) => setFolderName(e.target.value)} required />
            </label>
            <button className="primary">Create</button>
            <p className="fine">Folders belong to you. Sharing is per document.</p>
          </form>
        </div>
      )}

      <ul className="doc-grid">
        {documents.map((doc) => (
          <li key={doc.id}>
            <Link to={`/documents/${doc.id}`} className="doc-card">
              <span className="folder-tag">{doc.folder_name || "Unfiled"}</span>
              <h3>{doc.title}</h3>
              <p>{doc.description || "No description"}</p>
              <footer>
                <span>{doc.filename}</span>
                <span>{doc.owner_name}</span>
              </footer>
            </Link>
          </li>
        ))}
        {!documents.length && <li className="empty">No documents in this view.</li>}
      </ul>
    </div>
  );
}
