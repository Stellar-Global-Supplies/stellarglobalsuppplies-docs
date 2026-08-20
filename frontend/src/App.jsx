import React, { useState, useEffect, useCallback } from 'react';
import { BrowserRouter, Routes, Route, NavLink, Link, useNavigate, useParams } from 'react-router-dom';
import { api } from './api.js';
import Home from './pages/Home.jsx';
import AllDocs from './pages/AllDocs.jsx';
import DocViewer from './pages/DocViewer.jsx';
import Repos from './pages/Repos.jsx';
import Spaces from './pages/Spaces.jsx';
import SpaceDetail from './pages/SpaceDetail.jsx';
import SearchPage from './pages/SearchPage.jsx';

function Topbar({ onSync, syncing, syncStatus }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [showResults, setShowResults] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    const t = setTimeout(async () => {
      try {
        const data = await api.docs.search(query);
        setResults(data.results || []);
        setShowResults(true);
      } catch {}
    }, 280);
    return () => clearTimeout(t);
  }, [query]);

  const handleSearchKey = (e) => {
    if (e.key === 'Enter' && query.trim()) {
      setShowResults(false);
      navigate(`/search?q=${encodeURIComponent(query)}`);
    }
    if (e.key === 'Escape') { setShowResults(false); setQuery(''); }
  };

  return (
    <header className="topbar">
      <Link to="/" className="topbar-logo">
        <div className="topbar-logo-icon">GD</div>
        GitDocs
      </Link>

      <div className="topbar-search">
        <span className="search-icon">🔍</span>
        <input
          type="text"
          placeholder="Search documentation…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleSearchKey}
          onFocus={() => results.length && setShowResults(true)}
          onBlur={() => setTimeout(() => setShowResults(false), 200)}
        />
        {showResults && results.length > 0 && (
          <div className="search-results">
            {results.map((r) => (
              <Link
                key={r.id}
                to={`/docs/${r.id}`}
                className="search-result-item"
                onClick={() => { setShowResults(false); setQuery(''); }}
              >
                <div className="search-result-title">{r.title}</div>
                <div className="search-result-repo">{r.repo_full_name}</div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="topbar-actions">
        {syncStatus && (
          <span className={`status-badge status-${syncStatus.status}`}>
            {syncStatus.status === 'success' && '✓'}
            {syncStatus.status === 'error' && '✕'}
            {syncStatus.status === 'running' && '⟳'}
            {' '}{syncStatus.status === 'never' ? 'Never synced' : syncStatus.status}
          </span>
        )}
        <button
          className="btn btn-primary"
          onClick={onSync}
          disabled={syncing}
        >
          {syncing ? <span className="spinner" /> : '↻'}
          {syncing ? 'Syncing…' : 'Sync'}
        </button>
      </div>
    </header>
  );
}

function Sidebar() {
  const [spaces, setSpaces] = useState([]);
  const [docCount, setDocCount] = useState(0);
  const [repoCount, setRepoCount] = useState(0);

  useEffect(() => {
    api.spaces.list().then(setSpaces).catch(() => {});
    api.docs.list({ limit: 1 }).then((d) => setDocCount(d.total || 0)).catch(() => {});
    api.repos.list({ limit: 1 }).then((d) => setRepoCount(d.total || 0)).catch(() => {});
  }, []);

  return (
    <nav className="sidebar">
      <div className="sidebar-section">
        <NavLink to="/" end className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}>
          <span className="sidebar-item-icon">🏠</span> Home
        </NavLink>
        <NavLink to="/docs" className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}>
          <span className="sidebar-item-icon">📄</span> All Docs
          {docCount > 0 && <span className="sidebar-item-count">{docCount}</span>}
        </NavLink>
        <NavLink to="/repos" className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}>
          <span className="sidebar-item-icon">📦</span> Repositories
          {repoCount > 0 && <span className="sidebar-item-count">{repoCount}</span>}
        </NavLink>
      </div>

      <div className="sidebar-section">
        <div className="sidebar-label">Spaces</div>
        <NavLink to="/spaces" className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}>
          <span className="sidebar-item-icon">➕</span> Manage Spaces
        </NavLink>
        {spaces.map((space) => (
          <NavLink
            key={space.id}
            to={`/spaces/${space.id}`}
            className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
          >
            <span className="sidebar-item-icon">{space.icon}</span>
            {space.name}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}

function SyncToast({ message, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div className="sync-toast">
      <span>✓</span>
      <span style={{ flex: 1 }}>{message}</span>
      <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
    </div>
  );
}

function AppInner() {
  const [syncing, setSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState(null);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    api.sync.status().then(setSyncStatus).catch(() => {});
  }, []);

  const handleSync = useCallback(async () => {
    setSyncing(true);
    setSyncStatus({ status: 'running' });
    try {
      const result = await api.sync.start();
      const newStatus = await api.sync.status();
      setSyncStatus(newStatus);
      setToast(`Synced ${result.repos_synced} repos${result.repos_failed > 0 ? `, ${result.repos_failed} failed` : ''}`);
    } catch (err) {
      setSyncStatus({ status: 'error' });
      setToast(`Sync failed: ${err.message}`);
    } finally {
      setSyncing(false);
    }
  }, []);

  return (
    <div className="app-shell">
      <Topbar onSync={handleSync} syncing={syncing} syncStatus={syncStatus} />
      <div className="main-body">
        <Sidebar />
        <main className="content-area">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/docs" element={<AllDocs />} />
            <Route path="/docs/:id" element={<DocViewer />} />
            <Route path="/repos" element={<Repos />} />
            <Route path="/spaces" element={<Spaces />} />
            <Route path="/spaces/:id" element={<SpaceDetail />} />
            <Route path="/search" element={<SearchPage />} />
          </Routes>
        </main>
      </div>
      {toast && <SyncToast message={toast} onClose={() => setToast(null)} />}
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppInner />
    </BrowserRouter>
  );
}
