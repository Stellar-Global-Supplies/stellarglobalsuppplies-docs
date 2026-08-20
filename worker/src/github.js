export async function getGithubToken(env) {
  // Try Secrets Store binding first
  try {
    const token = await env.GITHUB_TOKEN.get();
    if (token) return token;
  } catch {}

  // Fallback: direct Worker secret (plain string via `wrangler secret put`)
  if (env.GITHUB_TOKEN && typeof env.GITHUB_TOKEN === 'string') {
    return env.GITHUB_TOKEN;
  }

  throw new Error('GITHUB_TOKEN not found');
}

export async function githubFetch(env, endpoint, options = {}) {
  const token = await getGithubToken(env);
  const url = endpoint.startsWith('https://')
    ? endpoint
    : `https://api.github.com${endpoint}`;

  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'GitHubDocs-Worker/1.0',
      ...options.headers,
    },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`GitHub API ${res.status}: ${body}`);
  }

  return res.json();
}

export async function fetchAllRepos(env) {
  const token = await getGithubToken(env);
  let page = 1;
  const all = [];

  while (true) {
    const repos = await githubFetch(
      env,
      `/user/repos?per_page=100&page=${page}&sort=updated&type=all`
    );
    all.push(...repos);
    if (repos.length < 100) break;
    page++;
  }

  return all;
}

export async function fetchReadme(env, owner, repo, branch = 'HEAD') {
  try {
    // Try to get the raw README content
    const data = await githubFetch(env, `/repos/${owner}/${repo}/readme`);
    const content = atob(data.content.replace(/\n/g, ''));
    return { content, sha: data.sha, path: data.path };
  } catch (err) {
    return null;
  }
}

export async function fetchOrgRepos(env, org) {
  return githubFetch(env, `/orgs/${org}/repos?per_page=100&sort=updated`);
}
