// lib/github/file-ops.ts
import { Octokit } from '@octokit/rest';

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

const OWNER = 'iamhollywoodpro';
const REPO = 'Holly-AI';

export async function readFile(path: string): Promise<string> {
  const { data } = await octokit.repos.getContent({
    owner: OWNER,
    repo: REPO,
    path,
  });
  if ('content' in data && data.encoding === 'base64') {
    return Buffer.from(data.content, 'base64').toString('utf8');
  }
  throw new Error(`File ${path} not found or not readable`);
}

export async function writeFile(
  path: string,
  content: string,
  message: string,
  branch?: string
): Promise<{ sha: string; url: string }> {
  let sha: string | undefined;
  try {
    const current = await octokit.repos.getContent({
      owner: OWNER,
      repo: REPO,
      path,
      ref: branch,
    });
    if ('sha' in current.data) sha = current.data.sha;
  } catch (e) {
    // File doesn't exist — that's fine
  }

  const result = await octokit.repos.createOrUpdateFileContents({
    owner: OWNER,
    repo: REPO,
    path,
    message,
    content: Buffer.from(content).toString('base64'),
    sha,
    branch: branch || 'main',
  });

  return { sha: result.data.commit.sha!, url: result.data.content?.html_url || '' };
}

export async function createPR(
  title: string,
  head: string,
  body: string
) {
  const pr = await octokit.pulls.create({
    owner: OWNER,
    repo: REPO,
    title,
    head,
    base: 'main',
    body,
  });
  return pr.data.html_url;
}
