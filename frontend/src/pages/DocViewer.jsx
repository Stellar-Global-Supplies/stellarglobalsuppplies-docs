import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api.js';

export default function DocViewer() {
  const { id } = useParams();
  const [doc, setDoc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeHeading, setActiveHeading] = useState('');
  const contentRef = useRef(null);

  useEffect(() => {
    setLoading(true);
    api.docs.get(parseInt(id))
      .then(setDoc)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  // Active heading tracking
  useEffect(() => {
    if (!doc || !contentRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length > 0) {
          setActiveHeading(visible[0].target.id);
        }
      },
      { rootMargin: '-10% 0px -60% 0px', threshold: 0 }
    );

    const headings = contentRef.current.querySelectorAll('h1, h2, h3, h4');
    headings.forEach((h) => observer.observe(h));
    return () => observer.disconnect();
  }, [doc]);

  if (loading) {
    return (
      <div className="empty-state">
        <div className="spinner" style={{ width: 32, height: 32, margin: '0 auto 16px' }} />
        <div>Loading document…</div>
      </div>
    );
  }

  if (error || !doc) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">⚠️</div>
        <div className="empty-state-title">Document not found</div>
        <div className="empty-state-desc">{error || 'This document does not exist.'}</div>
        <Link to="/docs" className="btn btn-primary">← Back to Docs</Link>
      </div>
    );
  }

  const toc = doc.toc || [];

  return (
    <>
      {/* Breadcrumb */}
      <div className="breadcrumb">
        <Link to="/">Home</Link>
        <span className="breadcrumb-sep">/</span>
        <Link to="/docs">Docs</Link>
        <span className="breadcrumb-sep">/</span>
        <span style={{ color: 'var(--text-primary)' }}>{doc.title}</span>
      </div>

      {/* Meta bar */}
      <div className="doc-meta-bar">
        <span className="doc-meta-item">
          📦{' '}
          <a
            href={doc.html_url}
            target="_blank"
            rel="noopener noreferrer"
            className="doc-meta-link"
          >
            {doc.repo_full_name}
          </a>
        </span>
        {doc.language && (
          <span className="doc-meta-item">🔤 {doc.language}</span>
        )}
        {doc.stars > 0 && (
          <span className="doc-meta-item">⭐ {doc.stars}</span>
        )}
        {doc.read_time_minutes && (
          <span className="doc-meta-item">⏱ {doc.read_time_minutes} min read</span>
        )}
        {doc.word_count && (
          <span className="doc-meta-item">📝 {doc.word_count.toLocaleString()} words</span>
        )}
        {doc.updated_at && (
          <span className="doc-meta-item" style={{ marginLeft: 'auto' }}>
            Updated {new Date(doc.updated_at).toLocaleDateString()}
          </span>
        )}
        <a
          href={`${doc.html_url}/blob/${doc.default_branch || 'main'}/${doc.path || 'README.md'}`}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-secondary btn-sm"
        >
          View on GitHub ↗
        </a>
      </div>

      <div className="doc-viewer">
        {/* Main content */}
        <article className="doc-main">
          <div
            ref={contentRef}
            className="doc-content"
            dangerouslySetInnerHTML={{ __html: doc.content_html || '<p>No content available.</p>' }}
          />
        </article>

        {/* Table of contents */}
        {toc.length > 0 && (
          <aside className="doc-toc-panel">
            <div className="doc-toc-title">On This Page</div>
            {toc.map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                className={`toc-item level-${item.level} ${activeHeading === item.id ? 'active' : ''}`}
                onClick={(e) => {
                  e.preventDefault();
                  document.getElementById(item.id)?.scrollIntoView({ behavior: 'smooth' });
                  setActiveHeading(item.id);
                }}
              >
                {item.text}
              </a>
            ))}
          </aside>
        )}
      </div>
    </>
  );
}
