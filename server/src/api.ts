import express, { RequestHandler } from 'express';
import { createOAuthUserAuth } from '@octokit/auth-oauth-user';
import { oauthAuthorizationUrl } from '@octokit/oauth-authorization-url';
import { Octokit } from '@octokit/rest';
import { GetRepoResponse, RepoInfo, WorkflowInfo } from 'common';

export function createGithubConfigFromEnv(): GitHubConfig {
  if (!process.env.GITHUB_CLIENT_ID)
    throw new Error('Requires envvar GITHUB_CLIENT_ID to be set');
  if (!process.env.GITHUB_CLIENT_SECRET)
    throw new Error('Requires envvar GITHUB_CLIENT_SECRET to be set');
  return {
    clientId: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    callback: '/api/github/callback',
    domain: process.env.DOMAIN || 'http://localhost:3000',
  };
}

export type GitHubConfig = {
  domain: string;
  callback: string;
  clientId: string;
  clientSecret: string;
};

export function installGithub(config: GitHubConfig) {
  const router = express.Router();

  router.use('/api/github/login', async (req, res) => {
    const { url } = oauthAuthorizationUrl({
      clientType: 'oauth-app',
      clientId: config.clientId,
      redirectUrl: config.domain + config.callback,
      scopes: ['workflow', 'repo'],
    });
    res.redirect(url);
  });

  router.use(config.callback, async (req, res, next) => {
    try {
      const auth = createOAuthUserAuth({
        clientId: config.clientId,
        clientSecret: config.clientSecret,
        code: req.query.code as string,
      });
      const { token } = await auth();
      if (req.session) {
        req.session.token = token;
      }
      res.redirect('/');
    } catch (e) {
      return next(e);
    }
  });

  const isAuthorized: RequestHandler = (req, res, next) => {
    if (!req.session || typeof req.session.token !== 'string') {
      res.status(403).json('unauthorized');
      return;
    }
    next();
  };

  return {
    router,
    isAuthorized,
  };
}

export function createApiRouter() {
  const router = express.Router();

  router.get('/session', async (req, res, next) => {
    try {
      res.json({ authorized: true });
    } catch (e) {
      next(e);
    }
  });

  router.get('/logout', (req, res) => {
    if (req.session) {
      req.session.token = null;
    }
    res.redirect('/');
  });

  router.get('/repos', async (req, res, next) => {
    try {
      const token = req.session?.token!;
      const octokit = new Octokit({
        auth: token,
      });
      const page =
        typeof req.query.page === 'string'
          ? parseInt(req.query.page, 10)
          : undefined;
      const pageSize = 30;
      const data = await octokit.rest.repos.listForAuthenticatedUser({
        page,
        per_page: pageSize,
        direction: 'desc',
      });
      res.status(data.status);
      const repos: RepoInfo[] = data.data.map((repo) => ({
        name: repo.name,
        fullName: repo.full_name,
        description: repo.description || '',
        owner: repo.owner.login,
        url: repo.url,
        defaultBranch: repo.default_branch,
      }));
      const response: GetRepoResponse = {
        data: repos,
        nextPage: repos.length >= pageSize ? (page ?? 0) + 1 : undefined,
      };
      res.json(response);
    } catch (e) {
      next(e);
    }
  });

  router.get('/:owner/:repo/workflows', async (req, res, next) => {
    try {
      const token = req.session?.token!;
      const { repo, owner } = req.params;
      const octokit = new Octokit({
        auth: token,
      });
      const result = await octokit.actions.listRepoWorkflows({ repo, owner });
      res.status(result.status);
      const workflows: WorkflowInfo[] = result.data.workflows
        .filter((w) => w.state === 'active')
        .map((workflow) => ({
          id: workflow.id,
          name: workflow.name,
          path: workflow.path,
        }));
      res.json(workflows);
    } catch (e) {
      next(e);
    }
  });

  router.get(
    '/:owner/:repo/workflow/yaml/:path(.*)',
    async (req, res, next) => {
      try {
        const token = req.session?.token!;
        const { repo, owner, path } = req.params;
        const octokit = new Octokit({
          auth: token,
        });
        const result = await octokit.rest.repos.getContent({
          repo,
          owner,
          path,
        });
        res.status(result.status);

        let content = null;
        if (
          !Array.isArray(result.data) &&
          (result.data as any).encoding === 'base64'
        ) {
          content = (result.data as any).content;
        }
        res.json({ content });
      } catch (e) {
        next(e);
      }
    }
  );

  router.post('/:owner/:repo/workflow/:id/dispatch', async (req, res, next) => {
    try {
      const token = req.session?.token!;
      const { inputs, ref } = req.query;
      if (ref && typeof ref !== 'string') {
        return next(new Error('expected ref to be type of string'));
      }
      const { repo, owner, id } = req.params;
      const octokit = new Octokit({
        auth: token,
      });
      const result = await octokit.actions.createWorkflowDispatch({
        repo,
        owner,
        workflow_id: id,
        ref: ref || 'main',
        inputs: inputs as any,
      });
      res.status(result.status);
      res.json({});
    } catch (e) {
      next(e);
    }
  });

  return router;
}
