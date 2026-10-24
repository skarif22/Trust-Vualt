import { useState } from "react";

const features = [
  { icon: "◈", title: "Role-based access", copy: <>Right people.<br />Right permissions.</>, tone: "violet" },
  { icon: "⌁", title: "A verifiable trail", copy: <>Every action linked<br />by a secure hash.</>, tone: "blue" },
  { icon: "✓", title: "Your files, controlled", copy: <>Grant access.<br />Revoke it instantly.</>, tone: "green" },
];

function Shield() {
  return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 3 19 6v5.2c0 4.6-2.9 7.8-7 9.8-4.1-2-7-5.2-7-9.8V6l7-3Z" stroke="currentColor" strokeWidth="1.8"/><path d="m9 12 2 2 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}

export default function AuthFrame({ children }) {
  const [dark, setDark] = useState(() => localStorage.getItem("silicavault-theme") === "dark");
  function toggleTheme() {
    const next = !dark;
    setDark(next);
    localStorage.setItem("silicavault-theme", next ? "dark" : "light");
  }

  return (
    <main className={`auth-page${dark ? " auth-dark" : ""}`}>
      <button className="theme-toggle" type="button" onClick={toggleTheme} aria-label={`Switch to ${dark ? "light" : "dark"} mode`} title={`Switch to ${dark ? "light" : "dark"} mode`}>{dark ? "☼" : "☾"}</button>
      <section className="auth-intro">
        <a className="auth-brand" href="/login" aria-label="SilicaVault home">
          <span className="auth-mark"><Shield /></span>
          <span><strong>SilicaVault</strong><small><i /> SECURE DOCUMENT SHARING</small></span>
        </a>
        <p className="auth-eyebrow">PRIVATE BY DESIGN <span /></p>
        <h1>Your documents.<br /><em>Always in your control.</em></h1>
        <p className="auth-description">Share sensitive files with precise permissions, and keep a tamper-evident record of every important action.</p>
        <div className="auth-features">
          {features.map((feature) => <article className="auth-feature" key={feature.title}>
            <span className={`feature-icon ${feature.tone}`}>{feature.icon}</span>
            <strong>{feature.title}</strong><p>{feature.copy}</p>
          </article>)}
        </div>
        <p className="auth-proof"><span>✓</span> Permission-aware sharing <b>·</b> SHA-256 linked audit trail</p>
      </section>
      <section className="auth-card-wrap">
        <div className="auth-card-brand"><span className="auth-mark small"><Shield /></span><h2>SilicaVault Portal</h2><p>Secure access to your document workspace</p></div>
        {children}
        <p className="auth-footnote"><span>♧</span> Your session is protected with encrypted authentication</p>
      </section>
      <footer className="auth-footer">© {new Date().getFullYear()} SilicaVault <span>·</span> Every handoff is hashed. Every denial is remembered.</footer>
    </main>
  );
}

