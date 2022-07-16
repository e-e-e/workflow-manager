import express, { RequestHandler } from 'express';
import { createOAuthUserAuth } from '@octokit/auth-oauth-user';
import { oauthAuthorizationUrl } from '@octokit/oauth-authorization-url';
import { Octokit } from '@octokit/rest';
import { RepoInfo, WorkflowInfo } from 'common';

const AUTH_DOMAIN = `${process.env.DOMAIN || 'http://localhost:3000'}`;
const AUTH_CALLBACK = '/api/github/callback';

const { url } = oauthAuthorizationUrl({
  clientType: 'oauth-app',
  clientId: process.env.GITHUB_CLIENT_ID!,
  redirectUrl: AUTH_DOMAIN + AUTH_CALLBACK,
  scopes: ['workflow', 'repo'],
  state: 'secret123',
});

export function installGithub() {
  const router = express.Router();

  router.use('/api/github/login', async (req, res) => {
    res.redirect(url);
  });

  router.use(AUTH_CALLBACK, async (req, res, next) => {
    try {
      const auth = createOAuthUserAuth({
        clientId: process.env.GITHUB_CLIENT_ID!,
        clientSecret: process.env.GITHUB_CLIENT_SECRET!,
        code: req.query.code as string,
        state: req.query.state as string,
      });
      const { token } = await auth();
      if (req.session) {
        req.session.token = token;
      }
      res.redirect('/')
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

  router.get('/repos/:page?', async (req, res, next) => {
    try {
      const token = req.session?.token!;
      const octokit = new Octokit({
        auth: token,
      });
      const page = req.params.page ? parseInt(req.params.page, 10) : undefined;
      const data = await octokit.rest.repos.listForAuthenticatedUser({
        page,
        per_page: 40,
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
      res.json(repos);
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
