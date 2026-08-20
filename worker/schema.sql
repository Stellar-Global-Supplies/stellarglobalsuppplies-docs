-- GitHub Docs Schema

CREATE TABLE IF NOT EXISTS repositories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  github_id INTEGER UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  name TEXT NOT NULL,
  owner TEXT NOT NULL,
  description TEXT,
  html_url TEXT,
  default_branch TEXT DEFAULT 'main',
  stars INTEGER DEFAULT 0,
  language TEXT,
  is_private INTEGER DEFAULT 0,
  last_synced_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS documents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  repo_id INTEGER NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
  repo_full_name TEXT NOT NULL,
  title TEXT NOT NULL,
  content_markdown TEXT,
  content_html TEXT,
  toc_json TEXT,
  sha TEXT,
  path TEXT DEFAULT 'README.md',
  word_count INTEGER DEFAULT 0,
  read_time_minutes INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sync_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  status TEXT NOT NULL CHECK(status IN ('running','success','error')),
  repos_synced INTEGER DEFAULT 0,
  repos_failed INTEGER DEFAULT 0,
  message TEXT,
  started_at TEXT DEFAULT (datetime('now')),
  finished_at TEXT
);

CREATE TABLE IF NOT EXISTS spaces (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  icon TEXT DEFAULT '📁',
  color TEXT DEFAULT '#0052CC',
  repo_ids TEXT DEFAULT '[]',
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_documents_repo_id ON documents(repo_id);
CREATE INDEX IF NOT EXISTS idx_repositories_owner ON repositories(owner);
