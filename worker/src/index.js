import { handleRepos } from './routes/repos.js';
import { handleDocs } from './routes/docs.js';
import { handleSync } from './routes/sync.js';
import { handleSpaces } from './routes/spaces.js';
import { handleWebhook } from './routes/webhook.js';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function cors(response) {
  const r = new Response(response.body, response);
  Object.entries(CORS_HEADERS).forEach(([k, v]) => r.headers.set(k, v));
  return r;
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    try {
      if (path === '/api/health') {
        return json({ status: 'ok', timestamp: new Date().toISOString() });
      }

      if (path === '/webhook/github' && request.method === 'POST') {
        return handleWebhook(request, env);
      }

      if (path.startsWith('/api/repos')) {
        return cors(await handleRepos(request, env, path));
      }

      if (path.startsWith('/api/docs')) {
        return cors(await handleDocs(request, env, path));
      }

      if (path.startsWith('/api/sync')) {
        return cors(await handleSync(request, env, path));
      }

      if (path.startsWith('/api/spaces')) {
        return cors(await handleSpaces(request, env, path));
      }

      return json({ error: 'Not Found' }, 404);
    } catch (err) {
      console.error('Worker error:', err);
      return json({ error: err.message || 'Internal Server Error' }, 500);
    }
  },
};