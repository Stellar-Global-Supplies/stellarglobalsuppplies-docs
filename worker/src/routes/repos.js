function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function handleRepos(request, env, path) {
  // GET /api/repos — list all repos with doc status
  if (request.method === 'GET' && path === '/api/repos') {
    return listRepos(env, new URL(request.url));
  }

  // GET /api/repos/:owner/:repo — single repo details
  const match = path.match(/^\/api\/repos\/([^/]+)\/([^/]+)$/);
  if (request.method === 'GET' && match) {
    return getRepo(env, match[1], match[2]);
  }

  return json({ error: 'Not found' }, 404);
}

async function listRepos(env, url) {
  const search = url.searchParams.get('search') || '';
  const language = url.searchParams.get('language') || '';
  const page = parseInt(url.searchParams.get('page') || '1');
  const limit = parseInt(url.searchParams.get('limit') || '50');
  const offset = (page - 1) * limit;

  let query = `
    SELECT r.*,
      d.id as doc_id,
      d.title as doc_title,
      d.word_count,
      d.read_time_minutes,
      d.updated_at as doc_updated_at
    FROM repositories r
    LEFT JOIN documents d ON d.repo_id = r.id
    WHERE 1=1
  `;
  const params = [];

  if (search) {
    query += ` AND (r.name LIKE ? OR r.description LIKE ? OR r.full_name LIKE ?)`;
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  if (language) {
    query += ` AND r.language = ?`;
    params.push(language);
  }

  query += ` ORDER BY r.updated_at DESC LIMIT ? OFFSET ?`;
  params.push(limit, offset);

  const { results } = await env.DB.prepare(query).bind(...params).all();

  // Count total
  let countQuery = `SELECT COUNT(*) as total FROM repositories r WHERE 1=1`;
  const countParams = [];
  if (search) {
    countQuery += ` AND (r.name LIKE ? OR r.description LIKE ? OR r.full_name LIKE ?)`;
    countParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }
  if (language) {
    countQuery += ` AND r.language = ?`;
    countParams.push(language);
  }

  const countResult = await env.DB.prepare(countQuery).bind(...countParams).first();

  // Get language list for filter
  const { results: languages } = await env.DB.prepare(
    `SELECT DISTINCT language FROM repositories WHERE language IS NOT NULL ORDER BY language`
  ).all();

  return json({
    repos: results,
    total: countResult?.total || 0,
    page,
    limit,
    languages: languages.map((l) => l.language),
  });
}

async function getRepo(env, owner, name) {
  const repo = await env.DB.prepare(
    `SELECT r.*, d.id as doc_id, d.title as doc_title, d.word_count, d.read_time_minutes
     FROM repositories r
     LEFT JOIN documents d ON d.repo_id = r.id
     WHERE r.owner = ? AND r.name = ?`
  ).bind(owner, name).first();

  if (!repo) return json({ error: 'Repository not found' }, 404);
  return json(repo);
}
