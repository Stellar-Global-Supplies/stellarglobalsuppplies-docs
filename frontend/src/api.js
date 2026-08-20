const BASE_URL = import.meta.env.VITE_API_URL || 'https://github-docs-worker.YOUR_SUBDOMAIN.workers.dev';

async function apiFetch(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export const api = {
  // Repos
  repos: {
    list: (params = {}) => {
      const q = new URLSearchParams(params).toString();
      return apiFetch(`/api/repos${q ? `?${q}` : ''}`);
    },
    get: (owner, name) => apiFetch(`/api/repos/${owner}/${name}`),
  },

  // Docs
  docs: {
    list: (params = {}) => {
      const q = new URLSearchParams(params).toString();
      return apiFetch(`/api/docs${q ? `?${q}` : ''}`);
    },
    get: (id) => apiFetch(`/api/docs/${id}`),
    getByRepo: (owner, name) => apiFetch(`/api/docs/repo/${owner}/${name}`),
    search: (q) => apiFetch(`/api/docs/search?q=${encodeURIComponent(q)}`),
  },

  // Sync
  sync: {
    start: () => apiFetch('/api/sync/start', { method: 'POST' }),
    status: () => apiFetch('/api/sync/status'),
    logs: () => apiFetch('/api/sync/logs'),
  },

  // Spaces
  spaces: {
    list: () => apiFetch('/api/spaces'),
    get: (id) => apiFetch(`/api/spaces/${id}`),
    create: (data) => apiFetch('/api/spaces', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => apiFetch(`/api/spaces/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id) => apiFetch(`/api/spaces/${id}`, { method: 'DELETE' }),
  },
};
