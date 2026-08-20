import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';

const ICONS = ['📁', '🚀', '⚡', '🔧', '🎯', '💡', '🌐', '🔬', '📊', '🎨', '🛡️', '🔮'];
const COLORS = ['#0052CC', '#00875A', '#FF5630', '#FFAB00', '#6554C0', '#00B8D9', '#FF991F', '#403294'];

function SpaceModal({ onClose, onSave, repos }) {
  const [form, setForm] = useState({ name: '', description: '', icon: '📁', color: '#0052CC', repo_ids: [] });
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const toggleRepo = (id) => {
    setForm((f) => ({
      ...f,
      repo_ids: f.repo_ids.includes(id) ? f.repo_ids.filter((r) => r !== id) : [...f.repo_ids, id],
    }));
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      await onSave(form);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <h2 className="modal-title">Create Space</h2>

        <div className="form-group">
          <label className="form-label">Name *</label>
          <input className="form-input" placeholder="e.g. Frontend, Backend, Infrastructure…" value={form.name} onChange={(e) => set('name', e.target.value)} />
        </div>

        <div className="form-group">
          <label className="form-label">Description</label>
          <input className="form-input" placeholder="What does this space contain?" value={form.description} onChange={(e) => set('description', e.target.value)} />
        </div>

        <div className="form-group">
          <label className="form-label">Icon</label>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {ICONS.map((icon) => (
              <button key={icon} onClick={() => set('icon', icon)} style={{
                padding: '6px 8px', fontSize: 18, cursor: 'pointer',
                border: `2px solid ${form.icon === icon ? 'var(--brand-blue)' : 'var(--border-default)'}`,
                borderRadius: 'var(--radius-md)', background: form.icon === icon ? 'var(--bg-active)' : 'transparent',
              }}>{icon}</button>
            ))}
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Color</label>
          <div style={{ display: 'flex', gap: 6 }}>
            {COLORS.map((color) => (
              <button key={color} onClick={() => set('color', color)} style={{
                width: 28, height: 28, borderRadius: '50%', background: color, cursor: 'pointer',
                border: form.color === color ? '3px solid var(--text-primary)' : '2px solid transparent',
                outline: form.color === color ? '2px solid white' : 'none', outlineOffset: 1,
              }} />
            ))}
          </div>
        </div>

        {repos.length > 0 && (
          <div className="form-group">
            <label className="form-label">Repositories ({form.repo_ids.length} selected)</label>
            <div style={{ maxHeight: 180, overflowY: 'auto', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', padding: 8 }}>
              {repos.map((repo) => (
                <label key={repo.github_id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 4px', cursor: 'pointer', borderRadius: 4, fontSize: 13 }}>
                  <input
                    type="checkbox"
                    checked={form.repo_ids.includes(repo.github_id)}
                    onChange={() => toggleRepo(repo.github_id)}
                  />
                  {repo.full_name}
                </label>
              ))}
            </div>
          </div>
        )}

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving || !form.name.trim()}>
            {saving ? <span className="spinner" /> : null} Create Space
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Spaces() {
  const [spaces, setSpaces] = useState([]);
  const [repos, setRepos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const load = () => {
    Promise.all([api.spaces.list(), api.repos.list({ limit: 200 })]).then(([s, r]) => {
      setSpaces(s);
      setRepos(r.repos || []);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (form) => {
    await api.spaces.create(form);
    load();
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this space? The repositories will not be affected.')) return;
    await api.spaces.delete(id);
    setSpaces((s) => s.filter((sp) => sp.id !== id));
  };

  if (loading) return <div className="empty-state"><div className="spinner" style={{ width: 32, height: 32, margin: '0 auto' }} /></div>;

  return (
    <>
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h1 className="page-title">Spaces</h1>
          <p className="page-subtitle">Organize your repositories into logical groups</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ New Space</button>
      </div>

      {spaces.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🗂️</div>
          <div className="empty-state-title">No spaces yet</div>
          <div className="empty-state-desc">Create a space to group related repositories together, like "Frontend", "Backend", or "Microservices".</div>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>Create First Space</button>
        </div>
      ) : (
        <div className="content-grid">
          <div className="content-grid grid-3" style={{ padding: 0 }}>
            {spaces.map((space) => {
              let repoIds = [];
              try { repoIds = JSON.parse(space.repo_ids || '[]'); } catch {}
              return (
                <div key={space.id} className="doc-card" style={{ position: 'relative' }}>
                  <Link to={`/spaces/${space.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                      <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-md)', background: space.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
                        {space.icon}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>{space.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{repoIds.length} repositories</div>
                      </div>
                    </div>
                    {space.description && (
                      <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{space.description}</p>
                    )}
                  </Link>
                  <button
                    className="btn btn-ghost btn-sm"
                    style={{ position: 'absolute', top: 12, right: 12, color: 'var(--text-muted)' }}
                    onClick={() => handleDelete(space.id)}
                    title="Delete space"
                  >✕</button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {showModal && (
        <SpaceModal repos={repos} onClose={() => setShowModal(false)} onSave={handleCreate} />
      )}
    </>
  );
}
