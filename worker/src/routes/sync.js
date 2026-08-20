import { fetchAllRepos, fetchReadme } from '../github.js';
import { parseMarkdown, extractTitle, countWords, readTimeMinutes } from '../markdown.js';

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function handleSync(request, env, path) {
  // POST /api/sync/start — trigger full sync
  if (request.method === 'POST' && path === '/api/sync/start') {
    return startSync(env);
  }

  // GET /api/sync/status — last sync log
  if (request.method === 'GET' && path === '/api/sync/status') {
    return getSyncStatus(env);
  }

  // GET /api/sync/logs — recent sync logs
  if (request.method === 'GET' && path === '/api/sync/logs') {
    return getSyncLogs(env);
  }

  return json({ error: 'Not found' }, 404);
}

async function startSync(env) {
  // Create a sync log entry
  const logResult = await env.DB.prepare(
    `INSERT INTO sync_logs (status, message, started_at) VALUES ('running', 'Sync started', datetime('now'))
     RETURNING id`
  ).first();
  const logId = logResult.id;

  let reposSynced = 0;
  let reposFailed = 0;
  const errors = [];

  try {
    // Fetch all repos from GitHub
    const repos = await fetchAllRepos(env);

    for (const repo of repos) {
      try {
        // Upsert repository record
        await env.DB.prepare(`
          INSERT INTO repositories (github_id, full_name, name, owner, description, html_url, default_branch, stars, language, is_private, last_synced_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
          ON CONFLICT(github_id) DO UPDATE SET
            full_name = excluded.full_name,
            name = excluded.name,
            description = excluded.description,
            html_url = excluded.html_url,
            default_branch = excluded.default_branch,
            stars = excluded.stars,
            language = excluded.language,
            is_private = excluded.is_private,
            last_synced_at = datetime('now'),
            updated_at = datetime('now')
        `).bind(
          repo.id,
          repo.full_name,
          repo.name,
          repo.owner.login,
          repo.description || null,
          repo.html_url,
          repo.default_branch || 'main',
          repo.stargazers_count || 0,
          repo.language || null,
          repo.private ? 1 : 0
        ).run();

        // Get the repo's DB id
        const dbRepo = await env.DB.prepare(
          'SELECT id FROM repositories WHERE github_id = ?'
        ).bind(repo.id).first();

        if (!dbRepo) continue;

        // Fetch README
        const readme = await fetchReadme(env, repo.owner.login, repo.name);

        if (readme) {
          const { html, toc } = parseMarkdown(readme.content);
          const title = extractTitle(readme.content) || repo.name;
          const words = countWords(readme.content);
          const readTime = readTimeMinutes(words);

          // Check if document exists and sha matches (skip if unchanged)
          const existing = await env.DB.prepare(
            'SELECT id, sha FROM documents WHERE repo_id = ?'
          ).bind(dbRepo.id).first();

          if (existing && existing.sha === readme.sha) {
            // No change, skip
            reposSynced++;
            continue;
          }

          if (existing) {
            // Update
            await env.DB.prepare(`
              UPDATE documents SET
                title = ?, content_markdown = ?, content_html = ?,
                toc_json = ?, sha = ?, path = ?,
                word_count = ?, read_time_minutes = ?,
                repo_full_name = ?, updated_at = datetime('now')
              WHERE repo_id = ?
            `).bind(
              title,
              readme.content,
              html,
              JSON.stringify(toc),
              readme.sha,
              readme.path,
              words,
              readTime,
              repo.full_name,
              dbRepo.id
            ).run();
          } else {
            // Insert
            await env.DB.prepare(`
              INSERT INTO documents (repo_id, repo_full_name, title, content_markdown, content_html, toc_json, sha, path, word_count, read_time_minutes)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).bind(
              dbRepo.id,
              repo.full_name,
              title,
              readme.content,
              html,
              JSON.stringify(toc),
              readme.sha,
              readme.path,
              words,
              readTime
            ).run();
          }
        }

        reposSynced++;
      } catch (err) {
        reposFailed++;
        errors.push(`${repo.full_name}: ${err.message}`);
        console.error(`Failed to sync ${repo.full_name}:`, err);
      }
    }

    // Update sync log
    await env.DB.prepare(`
      UPDATE sync_logs SET
        status = 'success',
        repos_synced = ?,
        repos_failed = ?,
        message = ?,
        finished_at = datetime('now')
      WHERE id = ?
    `).bind(
      reposSynced,
      reposFailed,
      errors.length > 0
        ? `Completed with ${reposFailed} errors: ${errors.slice(0, 3).join('; ')}`
        : `Successfully synced ${reposSynced} repositories`,
      logId
    ).run();

    return json({
      success: true,
      repos_synced: reposSynced,
      repos_failed: reposFailed,
      errors: errors.slice(0, 10),
    });
  } catch (err) {
    await env.DB.prepare(`
      UPDATE sync_logs SET status = 'error', message = ?, finished_at = datetime('now')
      WHERE id = ?
    `).bind(err.message, logId).run();

    return json({ error: err.message }, 500);
  }
}

async function getSyncStatus(env) {
  const log = await env.DB.prepare(
    `SELECT * FROM sync_logs ORDER BY id DESC LIMIT 1`
  ).first();

  return json(log || { status: 'never', message: 'No sync has run yet' });
}

async function getSyncLogs(env) {
  const { results } = await env.DB.prepare(
    `SELECT * FROM sync_logs ORDER BY id DESC LIMIT 20`
  ).all();

  return json(results);
}
