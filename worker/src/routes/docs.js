function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function handleDocs(request, env, path) {
  // GET /api/docs — list all docs
  if (request.method === 'GET' && path === '/api/docs') {
    return listDocs(env, new URL(request.url));
  }

  // GET /api/docs/search?q=... — search docs
  if (request.method === 'GET' && path === '/api/docs/search') {
    return searchDocs(env, new URL(request.url));
  }

  // GET /api/docs/:id — single doc
  const idMatch = path.match(/^\/api\/docs\/(\d+)$/);
  if (request.method === 'GET' && idMatch) {
    return getDoc(env, parseInt(idMatch[1]));
  }

  // GET /api/docs/repo/:owner/:name — doc by repo full name
  const repoMatch = path.match(/^\/api\/docs\/repo\/([^/]+)\/([^/]+)$/);
  if (request.method === 'GET' && repoMatch) {
    return getDocByRepo(env, repoMatch[1], repoMatch[2]);
  }

  return json({ error: 'Not found' }, 404);
}

async function listDocs(env, url) {
  const page = parseInt(url.searchParams.get('page') || '1');
  const limit = parseInt(url.searchParams.get('limit') || '50');
  const offset = (page - 1) * limit;

  const { results } = await env.DB.prepare(`
    SELECT d.id, d.repo_full_name, d.title, d.word_count, d.read_time_minutes,
           d.updated_at, r.description, r.language, r.stars, r.html_url, r.owner, r.name as repo_name,
           r.is_private
    FROM documents d
    JOIN repositories r ON r.id = d.repo_id
    ORDER BY d.updated_at DESC
    LIMIT ? OFFSET ?
  `).bind(limit, offset).all();

  const countResult = await env.DB.prepare('SELECT COUNT(*) as total FROM documents').first();

  return json({
    docs: results,
    total: countResult?.total || 0,
    page,
    limit,
  });
}

async function getDoc(env, id) {
  const doc = await env.DB.prepare(`
    SELECT d.*, r.description, r.language, r.stars, r.html_url, r.owner,
           r.name as repo_name, r.default_branch, r.is_private
    FROM documents d
    JOIN repositories r ON r.id = d.repo_id
    WHERE d.id = ?
  `).bind(id).first();

  if (!doc) return json({ error: 'Document not found' }, 404);

  // Parse toc_json
  try {
    doc.toc = JSON.parse(doc.toc_json || '[]');
  } catch {
    doc.toc = [];
  }

  return json(doc);
}

async function getDocByRepo(env, owner, name) {
  const doc = await env.DB.prepare(`
    SELECT d.*, r.description, r.language, r.stars, r.html_url,
           r.owner, r.name as repo_name, r.default_branch, r.is_private
    FROM documents d
    JOIN repositories r ON r.id = d.repo_id
    WHERE r.owner = ? AND r.name = ?
  `).bind(owner, name).first();

  if (!doc) return json({ error: 'Document not found' }, 404);

  try {
    doc.toc = JSON.parse(doc.toc_json || '[]');
  } catch {
    doc.toc = [];
  }

  return json(doc);
}

async function searchDocs(env, url) {
  const q = url.searchParams.get('q') || '';
  if (!q.trim()) return json({ results: [] });

  const like = `%${q}%`;

  const { results } = await env.DB.prepare(`
    SELECT d.id, d.repo_full_name, d.title, d.word_count, d.read_time_minutes, d.updated_at,
           r.language, r.stars, r.owner, r.name as repo_name,
           SUBSTR(d.content_markdown, 1, 300) as excerpt
    FROM documents d
    JOIN repositories r ON r.id = d.repo_id
    WHERE d.title LIKE ? OR d.content_markdown LIKE ? OR d.repo_full_name LIKE ?
    ORDER BY
      CASE WHEN d.title LIKE ? THEN 0 ELSE 1 END,
      d.updated_at DESC
    LIMIT 20
  `).bind(like, like, like, like).all();

  return json({ results, query: q });
}
