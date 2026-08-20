import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';

export default function Home() {
  const [stats, setStats] = useState({ docs: 0, repos: 0 });
  const [recent, setRecent] = useState([]);
  const [syncStatus, setSyncStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.docs.list({ limit: 6 }),
      api.sync.status(),
    ]).then(([docsData, status]) => {
      setStats({ docs: docsData.total, repos: docsData.total });
      setRecent(docsData.docs || []);
      setSyncStatus(status);
    }).catch(() => {}).finally(() => setLoading(false));

    api.repos.list({ limit: 1 }).then((d) => {
      setStats((s) => ({ ...s, repos: d.total || 0 }));
    }).catch(() => {});
  }, []);

  if (loading) {
    return (
      <div className="empty-state">
        <div className="spinner" style={{ width: 32, height: 32, margin: '0 auto 16px' }} />
        <div>Loading…</div>
      </div>
    );
  }

  const neverSynced = !syncStatus || syncStatus.status === 'never';

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Welcome to Stellar Docs</h1>
        <p className="page-subtitle">
          Auto-generated documentation from your GitHub repositories
        </p>
      </div>

      {neverSynced && (
        <div style={{
          margin: '24px 40px',
          padding: '20px 24px',
          background: 'var(--bg-active)',
          border: '1px solid var(--brand-blue)',
          borderRadius: 'var(--radius-lg)',
          display: 'flex',
          alignItems: 'center',
          gap: 16,
        }}>
          <span style={{ fontSize: 28 }}>🚀</span>
          <div>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>Get started — sync your repositories</div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              Click the <strong>Sync</strong> button in the top-right to scan all your GitHub repos and generate documentation from their README files.
            </div>
          </div>
        </div>
      )}

      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-value">{stats.docs}</div>
          <div className="stat-label">Documents</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.repos}</div>
          <div className="stat-label">Repositories</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">
            {syncStatus?.status === 'success' ? (
              <span style={{ color: 'var(--brand-green)', fontSize: 20 }}>✓ Synced</span>
            ) : syncStatus?.status === 'running' ? (
              <span style={{ color: 'var(--brand-blue)', fontSize: 20 }}>⟳ Running</span>
            ) : syncStatus?.status === 'error' ? (
              <span style={{ color: 'var(--brand-red)', fontSize: 20 }}>✕ Error</span>
            ) : (
              <span style={{ color: 'var(--text-muted)', fontSize: 20 }}>—</span>
            )}
          </div>
          <div className="stat-label">Sync Status</div>
        </div>
        {syncStatus?.finished_at && (
          <div className="stat-card">
            <div className="stat-value" style={{ fontSize: 14, fontWeight: 500 }}>
              {new Date(syncStatus.finished_at).toLocaleString()}
            </div>
            <div className="stat-label">Last Synced</div>
          </div>
        )}
      </div>

      {recent.length > 0 && (
        <div className="content-grid">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h2 style={{ fontSize: 16, fontWeight: 600 }}>Recently Updated</h2>
            <Link to="/docs" className="btn btn-ghost btn-sm">View all →</Link>
          </div>
          <div className="content-grid grid-2" style={{ padding: 0 }}>
            {recent.map((doc) => (
              <DocCard key={doc.id} doc={doc} />
            ))}
          </div>
        </div>
      )}

      {!neverSynced && recent.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-icon">📭</div>
          <div className="empty-state-title">No documentation yet</div>
          <div className="empty-state-desc">
            Your repositories may not have README files, or none have been synced yet.
          </div>
        </div>
      )}
    </>
  );
}

function DocCard({ doc }) {
  const lang = doc.language;
  const langColors = {
    JavaScript: '#f1e05a', TypeScript: '#2b7489', Python: '#3572A5',
    Go: '#00ADD8', Rust: '#dea584', Java: '#b07219', Ruby: '#701516',
    PHP: '#4F5D95', 'C#': '#178600', 'C++': '#f34b7d', Swift: '#ffac45',
    Kotlin: '#F18E33', Shell: '#89e051',
  };

  return (
    <Link to={`/docs/${doc.id}`} className="doc-card">
      <div className="doc-card-header">
        <div className="doc-card-icon">📄</div>
        <div>
          <div className="doc-card-title">{doc.title}</div>
          <div className="doc-card-repo">{doc.repo_full_name}</div>
        </div>
      </div>
      {doc.description && (
        <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8, lineHeight: 1.5 }}>
          {doc.description.slice(0, 120)}{doc.description.length > 120 ? '…' : ''}
        </p>
      )}
      <div className="doc-card-meta">
        {lang && (
          <span className="doc-card-meta-item">
            <span style={{
              width: 10, height: 10, borderRadius: '50%',
              background: langColors[lang] || 'var(--text-muted)',
              display: 'inline-block',
            }} />
            {lang}
          </span>
        )}
        {doc.read_time_minutes && (
          <span className="doc-card-meta-item">⏱ {doc.read_time_minutes} min read</span>
        )}
        {doc.word_count && (
          <span className="doc-card-meta-item">📝 {doc.word_count.toLocaleString()} words</span>
        )}
        {doc.stars > 0 && (
          <span className="doc-card-meta-item">⭐ {doc.stars}</span>
        )}
      </div>
    </Link>
  );
}

export { DocCard };
