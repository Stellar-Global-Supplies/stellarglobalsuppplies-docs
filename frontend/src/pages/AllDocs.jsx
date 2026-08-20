import React, { useState, useEffect } from 'react';
import { api } from '../api.js';
import { DocCard } from './Home.jsx';

export default function AllDocs() {
  const [data, setData] = useState({ docs: [], total: 0, languages: [] });
  const [loading, setLoading] = useState(true);
  const [language, setLanguage] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    setLoading(true);
    const params = { page, limit: 24 };
    if (language) params.language = language;

    // Fetch docs + get languages from repos
    Promise.all([
      api.docs.list(params),
      api.repos.list({ limit: 1 }),
    ]).then(([docsData, reposData]) => {
      setData({
        docs: docsData.docs || [],
        total: docsData.total || 0,
        languages: reposData.languages || [],
      });
    }).catch(() => {}).finally(() => setLoading(false));
  }, [page, language]);

  const totalPages = Math.ceil(data.total / 24);

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">All Documentation</h1>
        <p className="page-subtitle">{data.total} documents across all repositories</p>
      </div>

      <div className="filter-bar">
        <span style={{ fontSize: 13, color: 'var(--text-muted)', marginRight: 4 }}>Filter:</span>
        <select
          className="filter-select"
          value={language}
          onChange={(e) => { setLanguage(e.target.value); setPage(1); }}
        >
          <option value="">All Languages</option>
          {data.languages.map((l) => (
            <option key={l} value={l}>{l}</option>
          ))}
        </select>
        {language && (
          <button className="btn btn-ghost btn-sm" onClick={() => { setLanguage(''); setPage(1); }}>
            Clear filters
          </button>
        )}
      </div>

      {loading ? (
        <div className="empty-state">
          <div className="spinner" style={{ width: 32, height: 32, margin: '0 auto 16px' }} />
          <div>Loading…</div>
        </div>
      ) : data.docs.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📭</div>
          <div className="empty-state-title">No documents found</div>
          <div className="empty-state-desc">
            Try syncing your repositories first using the Sync button above.
          </div>
        </div>
      ) : (
        <div className="content-grid">
          <div className="content-grid grid-3" style={{ padding: 0 }}>
            {data.docs.map((doc) => (
              <DocCard key={doc.id} doc={doc} />
            ))}
          </div>

          {totalPages > 1 && (
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', paddingTop: 16 }}>
              <button
                className="btn btn-secondary btn-sm"
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
              >
                ← Previous
              </button>
              <span style={{ padding: '4px 12px', fontSize: 13, color: 'var(--text-muted)' }}>
                {page} / {totalPages}
              </span>
              <button
                className="btn btn-secondary btn-sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next →
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
}
