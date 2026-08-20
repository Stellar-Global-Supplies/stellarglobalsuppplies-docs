import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api.js';

export default function SearchPage() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!query) return;
    setLoading(true);
    api.docs.search(query)
      .then((d) => setResults(d.results || []))
      .catch(() => setResults([]))
      .finally(() => setLoading(false));
  }, [query]);

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Search Results</h1>
        <p className="page-subtitle">
          {loading ? 'Searching…' : `${results.length} results for "${query}"`}
        </p>
      </div>

      {loading ? (
        <div className="empty-state">
          <div className="spinner" style={{ width: 32, height: 32, margin: '0 auto 16px' }} />
          <div>Searching…</div>
        </div>
      ) : results.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🔍</div>
          <div className="empty-state-title">No results for "{query}"</div>
          <div className="empty-state-desc">Try different keywords or make sure your repos are synced.</div>
        </div>
      ) : (
        <div className="content-grid">
          {results.map((r) => (
            <Link key={r.id} to={`/docs/${r.id}`} style={{ textDecoration: 'none' }}>
              <div className="doc-card">
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <div className="doc-card-icon">📄</div>
                  <div style={{ flex: 1 }}>
                    <div className="doc-card-title">{highlight(r.title, query)}</div>
                    <div className="doc-card-repo">{r.repo_full_name}</div>
                    {r.excerpt && (
                      <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 8, lineHeight: 1.5 }}>
                        {r.excerpt.slice(0, 200)}…
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}

function highlight(text, query) {
  if (!query) return text;
  const parts = text.split(new RegExp(`(${query})`, 'gi'));
  return parts.map((p, i) =>
    p.toLowerCase() === query.toLowerCase()
      ? <mark key={i} style={{ background: '#FFF3CD', color: 'inherit', borderRadius: 2, padding: '0 1px' }}>{p}</mark>
      : p
  );
}
