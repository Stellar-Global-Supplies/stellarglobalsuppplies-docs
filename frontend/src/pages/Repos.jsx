import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';

const LANG_COLORS = {
  JavaScript: '#f1e05a', TypeScript: '#2b7489', Python: '#3572A5',
  Go: '#00ADD8', Rust: '#dea584', Java: '#b07219', Ruby: '#701516',
  PHP: '#4F5D95', 'C#': '#178600', 'C++': '#f34b7d', Swift: '#ffac45',
  Kotlin: '#F18E33', Shell: '#89e051',
};

export default function Repos() {
  const [data, setData] = useState({ repos: [], total: 0, languages: [] });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [language, setLanguage] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    const t = setTimeout(() => {
      setLoading(true);
      const params = { page, limit: 30 };
      if (search) params.search = search;
      if (language) params.language = language;
      api.repos.list(params)
        .then(setData)
        .catch(() => {})
        .finally(() => setLoading(false));
    }, 200);
    return () => clearTimeout(t);
  }, [page, search, language]);

  const totalPages = Math.ceil(data.total / 30);

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Repositories</h1>
        <p className="page-subtitle">{data.total} repositories synced from GitHub</p>
      </div>

      <div className="filter-bar">
        <input
          type="text"
          className="form-input"
          style={{ maxWidth: 300 }}
          placeholder="Search repositories…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        />
        <select
          className="filter-select"
          value={language}
          onChange={(e) => { setLanguage(e.target.value); setPage(1); }}
        >
          <option value="">All Languages</option>
          {(data.languages || []).map((l) => (
            <option key={l} value={l}>{l}</option>
          ))}
        </select>
        {(search || language) && (
          <button className="btn btn-ghost btn-sm" onClick={() => { setSearch(''); setLanguage(''); setPage(1); }}>
            Clear
          </button>
        )}
      </div>

      {loading ? (
        <div className="empty-state">
          <div className="spinner" style={{ width: 32, height: 32, margin: '0 auto 16px' }} />
          <div>Loading…</div>
        </div>
      ) : data.repos.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📭</div>
          <div className="empty-state-title">No repositories found</div>
          <div className="empty-state-desc">Sync your GitHub repositories to see them here.</div>
        </div>
      ) : (
        <div className="content-grid">
          <table style={{ width: '100%', borderCollapse: 'collapse', background: 'var(--bg-primary)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', border: '1px solid var(--border-default)' }}>
            <thead>
              <tr style={{ background: 'var(--bg-secondary)' }}>
                {['Repository', 'Language', 'Stars', 'Documentation', 'Last Synced'].map((h) => (
                  <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid var(--border-default)' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.repos.map((repo) => (
                <tr key={repo.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>
                      {repo.is_private ? '🔒 ' : ''}{repo.full_name}
                    </div>
                    {repo.description && (
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>
                        {repo.description.slice(0, 80)}{repo.description.length > 80 ? '…' : ''}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    {repo.language && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12 }}>
                        <span style={{ width: 10, height: 10, borderRadius: '50%', background: LANG_COLORS[repo.language] || 'var(--text-muted)', display: 'inline-block' }} />
                        {repo.language}
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 13 }}>
                    {repo.stars > 0 ? `⭐ ${repo.stars}` : '—'}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    {repo.doc_id ? (
                      <Link to={`/docs/${repo.doc_id}`} className="btn btn-ghost btn-sm">
                        📄 View Docs
                      </Link>
                    ) : (
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>No README</span>
                    )}
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--text-muted)' }}>
                    {repo.last_synced_at ? new Date(repo.last_synced_at).toLocaleDateString() : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {totalPages > 1 && (
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', paddingTop: 8 }}>
              <button className="btn btn-secondary btn-sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>← Previous</button>
              <span style={{ padding: '4px 12px', fontSize: 13, color: 'var(--text-muted)' }}>{page} / {totalPages}</span>
              <button className="btn btn-secondary btn-sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next →</button>
            </div>
          )}
        </div>
      )}
    </>
  );
}
