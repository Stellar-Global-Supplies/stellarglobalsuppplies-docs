import { fetchReadme } from '../github.js';
import { parseMarkdown, extractTitle, countWords, readTimeMinutes } from '../markdown.js';

async function verifySignature(request, secret, body) {
  const sigHeader = request.headers.get('x-hub-signature-256');
  if (!sigHeader) return false;

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(body));
  const expected = 'sha256=' + Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  if (expected.length !== sigHeader.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ sigHeader.charCodeAt(i);
  }
  return diff === 0;
}

export async function handleWebhook(request, env) {
  const body = await request.text();

  const webhookSecret = env.DOCS_WEBHOOK_TOKEN;

  if (webhookSecret) {
    const valid = await verifySignature(request, webhookSecret, body);
    if (!valid) {
      return respond(401, { error: 'Invalid signature' });
    }
  }

  const event = request.headers.get('x-github-event');
  let payload;
  try {
    payload = JSON.parse(body);
  } catch {
    return respond(400, { error: 'Invalid JSON' });
  }

  if (event === 'ping') {
    return respond(200, { message: 'pong — webhook connected!' });
  }

  if (event !== 'push') {
    return respond(200, { message: `Event "${event}" ignored` });
  }

  const changedFiles = [
    ...(payload.commits || []).flatMap((c) => [...(c.added || []), ...(c.modified || [])]),
  ];

  const readmeChanged = changedFiles.some((f) =>
    /^readme\.md$/i.test(f) || /^docs\/readme\.md$/i.test(f)
  );

  if (!readmeChanged) {
    return respond(200, { message: 'No README changes detected, skipping sync' });
  }

  const repo = payload.repository;
  if (!repo) return respond(400, { error: 'No repository in payload' });

  try {
    await syncSingleRepo(env, repo);
    return respond(200, { message: `Synced ${repo.full_name}`, repo: repo.full_name });
  } catch (err) {
    console.error('Webhook sync error:', err);
    return respond(500, { error: err.message });
  }
}

async function syncSingleRepo(env, repoData) {
  await env.DB.prepare(`
    INSERT INTO repositories (github_id, full_name, name, owner, description, html_url, default_branch, stars, language, is_private, last_synced_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    ON CONFLICT(github_id) DO UPDATE SET
      full_name = excluded.full_name,
      description = excluded.description,
      default_branch = excluded.default_branch,
      stars = excluded.stars,
      language = excluded.language,
      last_synced_at = datetime('now'),
      updated_at = datetime('now')
  `).bind(
    repoData.id,
    repoData.full_name,
    repoData.name,
    repoData.owner?.login || repoData.full_name.split('/')[0],
    repoData.description || null,
    repoData.html_url,
    repoData.default_branch || 'main',
    repoData.stargazers_count || 0,
    repoData.language || null,
    repoData.private ? 1 : 0
  ).run();

  const dbRepo = await env.DB.prepare(
    'SELECT id FROM repositories WHERE github_id = ?'
  ).bind(repoData.id).first();

  if (!dbRepo) throw new Error('Failed to upsert repository');

  const owner = repoData.owner?.login || repoData.full_name.split('/')[0];
  const readme = await fetchReadme(env, owner, repoData.name);

  if (!readme) return;

  const existing = await env.DB.prepare(
    'SELECT id, sha FROM documents WHERE repo_id = ?'
  ).bind(dbRepo.id).first();

  if (existing?.sha === readme.sha) return;

  const { html, toc } = parseMarkdown(readme.content);
  const title = extractTitle(readme.content) || repoData.name;
  const words = countWords(readme.content);
  const readTime = readTimeMinutes(words);

  if (existing) {
    await env.DB.prepare(`
      UPDATE documents SET
        title = ?, content_markdown = ?, content_html = ?,
        toc_json = ?, sha = ?, path = ?,
        word_count = ?, read_time_minutes = ?,
        repo_full_name = ?, updated_at = datetime('now')
      WHERE repo_id = ?
    `).bind(
      title, readme.content, html,
      JSON.stringify(toc), readme.sha, readme.path,
      words, readTime, repoData.full_name, dbRepo.id
    ).run();
  } else {
    await env.DB.prepare(`
      INSERT INTO documents (repo_id, repo_full_name, title, content_markdown, content_html, toc_json, sha, path, word_count, read_time_minutes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      dbRepo.id, repoData.full_name, title,
      readme.content, html, JSON.stringify(toc),
      readme.sha, readme.path, words, readTime
    ).run();
  }
}

function respond(status, data) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}