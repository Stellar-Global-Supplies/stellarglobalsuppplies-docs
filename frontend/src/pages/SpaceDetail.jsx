import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api.js';
import { DocCard } from './Home.jsx';

export default function SpaceDetail() {
  const { id } = useParams();
  const [space, setSpace] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.spaces.get(parseInt(id))
      .then(setSpace)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="empty-state"><div className="spinner" style={{ width: 32, height: 32, margin: '0 auto' }} /></div>;

  if (error || !space) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">⚠️</div>
        <div className="empty-state-title">Space not found</div>
        <Link to="/spaces" className="btn btn-primary">← Back to Spaces</Link>
      </div>
    );
  }

  return (
    <>
      <div className="breadcrumb">
        <Link to="/">Home</Link>
        <span className="breadcrumb-sep">/</span>
        <Link to="/spaces">Spaces</Link>
        <span className="breadcrumb-sep">/</span>
        <span style={{ color: 'var(--text-primary)' }}>{space.name}</span>
      </div>

      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 'var(--radius-lg)',
            background: space.color, display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontSize: 24,
          }}>
            {space.icon}
          </div>
          <div>
            <h1 className="page-title">{space.name}</h1>
            {space.description && <p className="page-subtitle">{space.description}</p>}
          </div>
        </div>
      </div>

      {space.docs && space.docs.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📭</div>
          <div className="empty-state-title">No documents in this space</div>
          <div className="empty-state-desc">
            Add repositories to this space by editing it, or make sure the repos have README files and have been synced.
          </div>
          <Link to="/spaces" className="btn btn-secondary">Manage Spaces</Link>
        </div>
      ) : (
        <div className="content-grid">
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            {space.docs?.length || 0} documents
          </div>
          <div className="content-grid grid-3" style={{ padding: 0 }}>
            {(space.docs || []).map((doc) => (
              <DocCard key={doc.id} doc={doc} />
            ))}
          </div>
        </div>
      )}
    </>
  );
}
