function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function handleSpaces(request, env, path) {
  if (request.method === 'GET' && path === '/api/spaces') {
    return listSpaces(env);
  }

  if (request.method === 'POST' && path === '/api/spaces') {
    return createSpace(request, env);
  }

  const idMatch = path.match(/^\/api\/spaces\/(\d+)$/);
  if (idMatch) {
    const id = parseInt(idMatch[1]);
    if (request.method === 'GET') return getSpace(env, id);
    if (request.method === 'PUT') return updateSpace(request, env, id);
    if (request.method === 'DELETE') return deleteSpace(env, id);
  }

  return json({ error: 'Not found' }, 404);
}

async function listSpaces(env) {
  const { results } = await env.DB.prepare(
    `SELECT * FROM spaces ORDER BY name ASC`
  ).all();

  return json(results);
}

async function createSpace(request, env) {
  const body = await request.json();
  const { name, description, icon, color, repo_ids } = body;

  if (!name) return json({ error: 'name is required' }, 400);

  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  const result = await env.DB.prepare(`
    INSERT INTO spaces (name, slug, description, icon, color, repo_ids)
    VALUES (?, ?, ?, ?, ?, ?)
    RETURNING *
  `).bind(
    name,
    slug,
    description || null,
    icon || '📁',
    color || '#0052CC',
    JSON.stringify(repo_ids || [])
  ).first();

  return json(result, 201);
}

async function getSpace(env, id) {
  const space = await env.DB.prepare(`SELECT * FROM spaces WHERE id = ?`).bind(id).first();
  if (!space) return json({ error: 'Space not found' }, 404);

  let repoIds = [];
  try { repoIds = JSON.parse(space.repo_ids || '[]'); } catch {}

  let docs = [];
  if (repoIds.length > 0) {
    const placeholders = repoIds.map(() => '?').join(',');
    const { results } = await env.DB.prepare(`
      SELECT d.id, d.repo_full_name, d.title, d.word_count, d.read_time_minutes, d.updated_at,
             r.language, r.stars, r.owner, r.name as repo_name
      FROM documents d
      JOIN repositories r ON r.id = d.repo_id
      WHERE r.github_id IN (${placeholders})
      ORDER BY d.updated_at DESC
    `).bind(...repoIds).all();
    docs = results;
  }

  return json({ ...space, docs });
}

async function updateSpace(request, env, id) {
  const body = await request.json();
  const { name, description, icon, color, repo_ids } = body;

  const existing = await env.DB.prepare(`SELECT * FROM spaces WHERE id = ?`).bind(id).first();
  if (!existing) return json({ error: 'Space not found' }, 404);

  const slug = (name || existing.name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  const result = await env.DB.prepare(`
    UPDATE spaces SET
      name = ?, slug = ?, description = ?, icon = ?, color = ?, repo_ids = ?
    WHERE id = ?
    RETURNING *
  `).bind(
    name || existing.name,
    slug,
    description ?? existing.description,
    icon || existing.icon,
    color || existing.color,
    JSON.stringify(repo_ids || JSON.parse(existing.repo_ids || '[]')),
    id
  ).first();

  return json(result);
}

async function deleteSpace(env, id) {
  await env.DB.prepare(`DELETE FROM spaces WHERE id = ?`).bind(id).run();
  return json({ deleted: true });
}
