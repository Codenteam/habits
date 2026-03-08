/**
 * @ha-bits/bit-github
 *
 * GitHub integration bit for managing pull requests, issues, and repositories.
 * Uses GitHub REST API v3 (https://docs.github.com/en/rest).
 */

const GITHUB_API = 'https://api.github.com';

interface GitHubContext {
  auth?: {
    token?: string;
  };
  propsValue: Record<string, any>;
}

/**
 * Trigger context — mirrors BitsTriggerContext from cortex framework.
 * Keeping a local interface so the bit has no runtime dependency on cortex.
 */
interface GitHubTriggerContext {
  auth?: any;
  propsValue: Record<string, any>;
  payload: unknown;
  webhookUrl?: string;
  store: {
    get: <T>(key: string) => Promise<T | null>;
    put: <T>(key: string, value: T) => Promise<void>;
    delete: (key: string) => Promise<void>;
  };
  app: {
    createListeners: (listener: { events: string[]; identifierValue: string; identifierKey: string }) => void;
  };
  setSchedule: (options: { cronExpression: string; timezone?: string }) => void;
}

/**
 * Normalise a pull request object from the GitHub API into a compact shape.
 */
function normalisePR(pr: any) {
  return {
    id: pr.id,
    number: pr.number,
    title: pr.title,
    body: pr.body ?? null,
    state: pr.state,
    url: pr.html_url,
    user: pr.user?.login,
    createdAt: pr.created_at,
    updatedAt: pr.updated_at,
    head: pr.head?.ref,
    base: pr.base?.ref,
    draft: pr.draft ?? false,
    labels: pr.labels?.map((l: any) => l.name) ?? [],
    merged: pr.merged ?? false,
    action: (pr as any)._action ?? undefined,
  };
}

/**
 * Make an authenticated request to the GitHub API.
 */
async function githubRequest(
  path: string,
  token: string,
  options: RequestInit = {}
): Promise<any> {
  const url = path.startsWith('http') ? path : `${GITHUB_API}${path}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> ?? {}),
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`GitHub API error (${response.status}): ${error}`);
  }

  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

const githubBit = {
  displayName: 'GitHub',
  description: 'Manage pull requests, issues, and repositories via the GitHub API',
  logoUrl: 'lucide:Github',

  auth: {
    type: 'SECRET_TEXT',
    displayName: 'Personal Access Token',
    description: 'GitHub personal access token (classic or fine-grained)',
    required: true,
  },

  actions: {
    // ──────────────────────────────────────────
    //  Pull Requests
    // ──────────────────────────────────────────

    /**
     * List pull requests for a repository.
     */
    listPullRequests: {
      name: 'listPullRequests',
      displayName: 'List Pull Requests',
      description: 'List pull requests for a repository',
      props: {
        token: {
          type: 'SECRET_TEXT',
          displayName: 'Token',
          description: 'GitHub personal access token (overrides bit-level auth)',
          required: false,
        },
        owner: {
          type: 'SHORT_TEXT',
          displayName: 'Owner',
          description: 'Repository owner (user or org)',
          required: true,
        },
        repo: {
          type: 'SHORT_TEXT',
          displayName: 'Repository',
          description: 'Repository name',
          required: true,
        },
        state: {
          type: 'STATIC_DROPDOWN',
          displayName: 'State',
          description: 'Filter by PR state',
          required: false,
          defaultValue: 'open',
          options: {
            options: [
              { label: 'Open', value: 'open' },
              { label: 'Closed', value: 'closed' },
              { label: 'All', value: 'all' },
            ],
          },
        },
        perPage: {
          type: 'NUMBER',
          displayName: 'Per Page',
          description: 'Results per page (max 100)',
          required: false,
          defaultValue: 30,
        },
      },
      async run(context: GitHubContext): Promise<any> {
        const { owner, repo, state = 'open', perPage = 30, token } = context.propsValue;
        const authToken = token || context.auth?.token;
        if (!authToken) throw new Error('GitHub token is required');

        const params = new URLSearchParams({
          state,
          per_page: String(perPage),
        });

        const pullRequests = await githubRequest(
          `/repos/${owner}/${repo}/pulls?${params}`,
          authToken
        );

        return {
          pullRequests: pullRequests.map((pr: any) => ({
            id: pr.id,
            number: pr.number,
            title: pr.title,
            state: pr.state,
            url: pr.html_url,
            user: pr.user?.login,
            createdAt: pr.created_at,
            updatedAt: pr.updated_at,
            head: pr.head?.ref,
            base: pr.base?.ref,
            draft: pr.draft,
            labels: pr.labels?.map((l: any) => l.name),
          })),
          count: pullRequests.length,
        };
      },
    },

    /**
     * Get details of a single pull request.
     */
    getPullRequest: {
      name: 'getPullRequest',
      displayName: 'Get Pull Request',
      description: 'Get details of a specific pull request',
      props: {
        token: {
          type: 'SECRET_TEXT',
          displayName: 'Token',
          description: 'GitHub personal access token',
          required: false,
        },
        owner: {
          type: 'SHORT_TEXT',
          displayName: 'Owner',
          description: 'Repository owner',
          required: true,
        },
        repo: {
          type: 'SHORT_TEXT',
          displayName: 'Repository',
          description: 'Repository name',
          required: true,
        },
        pullNumber: {
          type: 'NUMBER',
          displayName: 'Pull Request Number',
          description: 'The PR number',
          required: true,
        },
      },
      async run(context: GitHubContext): Promise<any> {
        const { owner, repo, pullNumber, token } = context.propsValue;
        const authToken = token || context.auth?.token;
        if (!authToken) throw new Error('GitHub token is required');

        const pr = await githubRequest(
          `/repos/${owner}/${repo}/pulls/${pullNumber}`,
          authToken
        );

        return {
          id: pr.id,
          number: pr.number,
          title: pr.title,
          body: pr.body,
          state: pr.state,
          url: pr.html_url,
          user: pr.user?.login,
          createdAt: pr.created_at,
          updatedAt: pr.updated_at,
          mergedAt: pr.merged_at,
          merged: pr.merged,
          mergeable: pr.mergeable,
          head: pr.head?.ref,
          base: pr.base?.ref,
          draft: pr.draft,
          additions: pr.additions,
          deletions: pr.deletions,
          changedFiles: pr.changed_files,
          labels: pr.labels?.map((l: any) => l.name),
          reviewers: pr.requested_reviewers?.map((r: any) => r.login),
        };
      },
    },

    /**
     * Create a new pull request.
     */
    createPullRequest: {
      name: 'createPullRequest',
      displayName: 'Create Pull Request',
      description: 'Create a new pull request in a repository',
      props: {
        token: {
          type: 'SECRET_TEXT',
          displayName: 'Token',
          description: 'GitHub personal access token',
          required: false,
        },
        owner: {
          type: 'SHORT_TEXT',
          displayName: 'Owner',
          description: 'Repository owner',
          required: true,
        },
        repo: {
          type: 'SHORT_TEXT',
          displayName: 'Repository',
          description: 'Repository name',
          required: true,
        },
        title: {
          type: 'SHORT_TEXT',
          displayName: 'Title',
          description: 'Pull request title',
          required: true,
        },
        body: {
          type: 'LONG_TEXT',
          displayName: 'Body',
          description: 'Pull request description (Markdown supported)',
          required: false,
        },
        head: {
          type: 'SHORT_TEXT',
          displayName: 'Head Branch',
          description: 'The branch that contains the changes',
          required: true,
        },
        base: {
          type: 'SHORT_TEXT',
          displayName: 'Base Branch',
          description: 'The branch to merge into (e.g., main)',
          required: true,
        },
        draft: {
          type: 'CHECKBOX',
          displayName: 'Draft',
          description: 'Create as draft pull request',
          required: false,
          defaultValue: false,
        },
      },
      async run(context: GitHubContext): Promise<any> {
        const { owner, repo, title, body, head, base, draft = false, token } = context.propsValue;
        const authToken = token || context.auth?.token;
        if (!authToken) throw new Error('GitHub token is required');

        const pr = await githubRequest(
          `/repos/${owner}/${repo}/pulls`,
          authToken,
          {
            method: 'POST',
            body: JSON.stringify({ title, body, head, base, draft }),
          }
        );

        return {
          id: pr.id,
          number: pr.number,
          title: pr.title,
          url: pr.html_url,
          state: pr.state,
          draft: pr.draft,
          head: pr.head?.ref,
          base: pr.base?.ref,
          createdAt: pr.created_at,
        };
      },
    },

    // ──────────────────────────────────────────
    //  Issues
    // ──────────────────────────────────────────

    /**
     * List issues for a repository.
     */
    listIssues: {
      name: 'listIssues',
      displayName: 'List Issues',
      description: 'List issues for a repository',
      props: {
        token: {
          type: 'SECRET_TEXT',
          displayName: 'Token',
          description: 'GitHub personal access token',
          required: false,
        },
        owner: {
          type: 'SHORT_TEXT',
          displayName: 'Owner',
          description: 'Repository owner',
          required: true,
        },
        repo: {
          type: 'SHORT_TEXT',
          displayName: 'Repository',
          description: 'Repository name',
          required: true,
        },
        state: {
          type: 'STATIC_DROPDOWN',
          displayName: 'State',
          description: 'Filter by issue state',
          required: false,
          defaultValue: 'open',
          options: {
            options: [
              { label: 'Open', value: 'open' },
              { label: 'Closed', value: 'closed' },
              { label: 'All', value: 'all' },
            ],
          },
        },
        labels: {
          type: 'SHORT_TEXT',
          displayName: 'Labels',
          description: 'Comma-separated list of label names to filter by',
          required: false,
        },
        perPage: {
          type: 'NUMBER',
          displayName: 'Per Page',
          description: 'Results per page (max 100)',
          required: false,
          defaultValue: 30,
        },
      },
      async run(context: GitHubContext): Promise<any> {
        const { owner, repo, state = 'open', labels, perPage = 30, token } = context.propsValue;
        const authToken = token || context.auth?.token;
        if (!authToken) throw new Error('GitHub token is required');

        const params = new URLSearchParams({
          state,
          per_page: String(perPage),
        });
        if (labels) params.set('labels', labels);

        const issues = await githubRequest(
          `/repos/${owner}/${repo}/issues?${params}`,
          authToken
        );

        // Filter out pull requests (GitHub API includes PRs in issues)
        const onlyIssues = issues.filter((i: any) => !i.pull_request);

        return {
          issues: onlyIssues.map((issue: any) => ({
            id: issue.id,
            number: issue.number,
            title: issue.title,
            state: issue.state,
            url: issue.html_url,
            user: issue.user?.login,
            createdAt: issue.created_at,
            updatedAt: issue.updated_at,
            labels: issue.labels?.map((l: any) => l.name),
            assignees: issue.assignees?.map((a: any) => a.login),
            comments: issue.comments,
          })),
          count: onlyIssues.length,
        };
      },
    },

    /**
     * Create a new issue.
     */
    createIssue: {
      name: 'createIssue',
      displayName: 'Create Issue',
      description: 'Create a new issue in a repository',
      props: {
        token: {
          type: 'SECRET_TEXT',
          displayName: 'Token',
          description: 'GitHub personal access token',
          required: false,
        },
        owner: {
          type: 'SHORT_TEXT',
          displayName: 'Owner',
          description: 'Repository owner',
          required: true,
        },
        repo: {
          type: 'SHORT_TEXT',
          displayName: 'Repository',
          description: 'Repository name',
          required: true,
        },
        title: {
          type: 'SHORT_TEXT',
          displayName: 'Title',
          description: 'Issue title',
          required: true,
        },
        body: {
          type: 'LONG_TEXT',
          displayName: 'Body',
          description: 'Issue body (Markdown supported)',
          required: false,
        },
        labels: {
          type: 'SHORT_TEXT',
          displayName: 'Labels',
          description: 'Comma-separated list of label names',
          required: false,
        },
        assignees: {
          type: 'SHORT_TEXT',
          displayName: 'Assignees',
          description: 'Comma-separated list of usernames to assign',
          required: false,
        },
      },
      async run(context: GitHubContext): Promise<any> {
        const { owner, repo, title, body, labels, assignees, token } = context.propsValue;
        const authToken = token || context.auth?.token;
        if (!authToken) throw new Error('GitHub token is required');

        const payload: Record<string, any> = { title };
        if (body) payload.body = body;
        if (labels) payload.labels = labels.split(',').map((l: string) => l.trim());
        if (assignees) payload.assignees = assignees.split(',').map((a: string) => a.trim());

        const issue = await githubRequest(
          `/repos/${owner}/${repo}/issues`,
          authToken,
          {
            method: 'POST',
            body: JSON.stringify(payload),
          }
        );

        return {
          id: issue.id,
          number: issue.number,
          title: issue.title,
          url: issue.html_url,
          state: issue.state,
          createdAt: issue.created_at,
          labels: issue.labels?.map((l: any) => l.name),
          assignees: issue.assignees?.map((a: any) => a.login),
        };
      },
    },

    /**
     * Add a comment to an issue or pull request.
     */
    createComment: {
      name: 'createComment',
      displayName: 'Create Comment',
      description: 'Add a comment to an issue or pull request',
      props: {
        token: {
          type: 'SECRET_TEXT',
          displayName: 'Token',
          description: 'GitHub personal access token',
          required: false,
        },
        owner: {
          type: 'SHORT_TEXT',
          displayName: 'Owner',
          description: 'Repository owner',
          required: true,
        },
        repo: {
          type: 'SHORT_TEXT',
          displayName: 'Repository',
          description: 'Repository name',
          required: true,
        },
        issueNumber: {
          type: 'NUMBER',
          displayName: 'Issue / PR Number',
          description: 'The issue or pull request number',
          required: true,
        },
        body: {
          type: 'LONG_TEXT',
          displayName: 'Comment Body',
          description: 'Comment text (Markdown supported)',
          required: true,
        },
      },
      async run(context: GitHubContext): Promise<any> {
        const { owner, repo, issueNumber, body, token } = context.propsValue;
        const authToken = token || context.auth?.token;
        if (!authToken) throw new Error('GitHub token is required');

        const comment = await githubRequest(
          `/repos/${owner}/${repo}/issues/${issueNumber}/comments`,
          authToken,
          {
            method: 'POST',
            body: JSON.stringify({ body }),
          }
        );

        return {
          id: comment.id,
          url: comment.html_url,
          body: comment.body,
          user: comment.user?.login,
          createdAt: comment.created_at,
        };
      },
    },

    // ──────────────────────────────────────────
    //  Repository
    // ──────────────────────────────────────────

    /**
     * Get repository information.
     */
    getRepo: {
      name: 'getRepo',
      displayName: 'Get Repository',
      description: 'Get information about a repository',
      props: {
        token: {
          type: 'SECRET_TEXT',
          displayName: 'Token',
          description: 'GitHub personal access token',
          required: false,
        },
        owner: {
          type: 'SHORT_TEXT',
          displayName: 'Owner',
          description: 'Repository owner',
          required: true,
        },
        repo: {
          type: 'SHORT_TEXT',
          displayName: 'Repository',
          description: 'Repository name',
          required: true,
        },
      },
      async run(context: GitHubContext): Promise<any> {
        const { owner, repo, token } = context.propsValue;
        const authToken = token || context.auth?.token;
        if (!authToken) throw new Error('GitHub token is required');

        const repository = await githubRequest(
          `/repos/${owner}/${repo}`,
          authToken
        );

        return {
          id: repository.id,
          name: repository.name,
          fullName: repository.full_name,
          description: repository.description,
          url: repository.html_url,
          private: repository.private,
          defaultBranch: repository.default_branch,
          language: repository.language,
          stars: repository.stargazers_count,
          forks: repository.forks_count,
          openIssues: repository.open_issues_count,
          createdAt: repository.created_at,
          updatedAt: repository.updated_at,
          topics: repository.topics,
        };
      },
    },

    /**
     * List repository events (activity feed).
     */
    listEvents: {
      name: 'listEvents',
      displayName: 'List Repository Events',
      description: 'List recent events/activity for a repository',
      props: {
        token: {
          type: 'SECRET_TEXT',
          displayName: 'Token',
          description: 'GitHub personal access token',
          required: false,
        },
        owner: {
          type: 'SHORT_TEXT',
          displayName: 'Owner',
          description: 'Repository owner',
          required: true,
        },
        repo: {
          type: 'SHORT_TEXT',
          displayName: 'Repository',
          description: 'Repository name',
          required: true,
        },
        perPage: {
          type: 'NUMBER',
          displayName: 'Per Page',
          description: 'Results per page (max 100)',
          required: false,
          defaultValue: 30,
        },
      },
      async run(context: GitHubContext): Promise<any> {
        const { owner, repo, perPage = 30, token } = context.propsValue;
        const authToken = token || context.auth?.token;
        if (!authToken) throw new Error('GitHub token is required');

        const events = await githubRequest(
          `/repos/${owner}/${repo}/events?per_page=${perPage}`,
          authToken
        );

        return {
          events: events.map((e: any) => ({
            id: e.id,
            type: e.type,
            actor: e.actor?.login,
            createdAt: e.created_at,
            payload: e.payload,
          })),
          count: events.length,
        };
      },
    },

    // ──────────────────────────────────────────
    //  Trigger-as-action (for isTrigger: true)
    // ──────────────────────────────────────────

    /**
     * Action version of the new-pull-request trigger.
     * Polls the GitHub API once for recently opened pull requests.
     * Designed to be the entry-point node with `isTrigger: true`.
     */
    newPullRequest: {
      name: 'newPullRequest',
      displayName: 'New Pull Request (poll)',
      description: 'Fetch recently-opened pull requests from a repository (action version of trigger)',
      props: {
        token: {
          type: 'SECRET_TEXT',
          displayName: 'Token',
          description: 'GitHub personal access token',
          required: false,
        },
        owner: {
          type: 'SHORT_TEXT',
          displayName: 'Owner',
          description: 'Repository owner (user or org)',
          required: true,
        },
        repo: {
          type: 'SHORT_TEXT',
          displayName: 'Repository',
          description: 'Repository name',
          required: true,
        },
        perPage: {
          type: 'NUMBER',
          displayName: 'Per Page',
          description: 'Max PRs to return (default 10)',
          required: false,
          defaultValue: 10,
        },
      },
      async run(context: GitHubContext): Promise<any> {
        const { owner, repo, perPage = 10, token } = context.propsValue;
        const authToken = token || context.auth?.token;
        if (!authToken) throw new Error('GitHub token is required');

        const params = new URLSearchParams({
          state: 'open',
          sort: 'created',
          direction: 'desc',
          per_page: String(perPage),
        });

        const pullRequests = await githubRequest(
          `/repos/${owner}/${repo}/pulls?${params}`,
          authToken
        );

        return {
          pullRequests: pullRequests.map((pr: any) => normalisePR(pr)),
          count: pullRequests.length,
          repository: `${owner}/${repo}`,
          timestamp: new Date().toISOString(),
        };
      },
    },
  },

  // ════════════════════════════════════════════
  //  Triggers
  // ════════════════════════════════════════════

  triggers: {
    /**
     * Webhook trigger — receives GitHub webhook `pull_request` events.
     *
     * To use this trigger, configure a GitHub repository webhook:
     *   Payload URL  →  <your-server>/webhook/<workflowId>/<nodeId>
     *   Content type →  application/json
     *   Events       →  Pull requests
     *
     * The trigger normalises the webhook payload and returns an array
     * with a single PR item so downstream nodes get a consistent shape.
     */
    newPullRequest: {
      name: 'newPullRequest',
      displayName: 'New Pull Request (webhook)',
      description: 'Fires when a pull request is opened, reopened, or synchronised via GitHub webhook',
      type: 'WEBHOOK',

      props: {
        events: {
          type: 'SHORT_TEXT',
          displayName: 'Events',
          description: 'Comma-separated webhook actions to listen for (default: opened,reopened)',
          required: false,
          defaultValue: 'opened,reopened',
        },
      },

      /**
       * onEnable — nothing to register server-side; the user points
       * the GitHub webhook at the generated URL manually.
       */
      async onEnable(_context: GitHubTriggerContext): Promise<void> {
        // No-op — webhook URL is provided by the cortex server.
      },

      async onDisable(_context: GitHubTriggerContext): Promise<void> {
        // No-op.
      },

      /**
       * run — called when the webhook fires.
       * `context.payload` is the raw GitHub webhook JSON body.
       */
      async run(context: GitHubTriggerContext): Promise<any[]> {
        const payload = context.payload as any;
        if (!payload || !payload.pull_request) {
          return [];
        }

        const allowedActions = (context.propsValue.events || 'opened,reopened')
          .split(',')
          .map((s: string) => s.trim().toLowerCase());

        const action: string = (payload.action || '').toLowerCase();
        if (allowedActions.length > 0 && !allowedActions.includes(action)) {
          return [];
        }

        const pr = payload.pull_request;
        return [{
          ...normalisePR(pr),
          action,
          repository: payload.repository?.full_name,
          sender: payload.sender?.login,
        }];
      },

      /**
       * test — returns sample data so the UI can display the schema.
       */
      async test(_context: GitHubTriggerContext): Promise<any[]> {
        return [{
          id: 1,
          number: 42,
          title: 'Sample Pull Request',
          body: 'This is sample trigger data',
          state: 'open',
          url: 'https://github.com/owner/repo/pull/42',
          user: 'octocat',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          head: 'feature-branch',
          base: 'main',
          draft: false,
          labels: [],
          merged: false,
          action: 'opened',
          repository: 'owner/repo',
          sender: 'octocat',
        }];
      },

      sampleData: {
        id: 1,
        number: 42,
        title: 'Sample Pull Request',
        state: 'open',
        url: 'https://github.com/owner/repo/pull/42',
        user: 'octocat',
        action: 'opened',
      },
    },

    /**
     * Polling trigger — periodically checks for new pull requests.
     *
     * Uses the in-memory store to remember the most-recent PR number
     * so that only genuinely new PRs are returned on each poll cycle.
     */
    pollNewPullRequests: {
      name: 'pollNewPullRequests',
      displayName: 'New Pull Request (polling)',
      description: 'Polls the GitHub API for new pull requests on a schedule',
      type: 'POLLING',

      props: {
        token: {
          type: 'SECRET_TEXT',
          displayName: 'Token',
          description: 'GitHub personal access token',
          required: true,
        },
        owner: {
          type: 'SHORT_TEXT',
          displayName: 'Owner',
          description: 'Repository owner (user or org)',
          required: true,
        },
        repo: {
          type: 'SHORT_TEXT',
          displayName: 'Repository',
          description: 'Repository name',
          required: true,
        },
        cronExpression: {
          type: 'SHORT_TEXT',
          displayName: 'Cron Expression',
          description: 'How often to poll (default: every 5 minutes)',
          required: false,
          defaultValue: '*/5 * * * *',
        },
      },

      async onEnable(context: GitHubTriggerContext): Promise<void> {
        const cron = context.propsValue.cronExpression || '*/5 * * * *';
        context.setSchedule({ cronExpression: cron, timezone: 'UTC' });
      },

      async onDisable(_context: GitHubTriggerContext): Promise<void> {
        // No cleanup needed.
      },

      async run(context: GitHubTriggerContext): Promise<any[]> {
        const { token, owner, repo } = context.propsValue;
        if (!token || !owner || !repo) {
          throw new Error('token, owner, and repo are required for polling trigger');
        }

        const params = new URLSearchParams({
          state: 'open',
          sort: 'created',
          direction: 'desc',
          per_page: '25',
        });

        const pullRequests = await githubRequest(
          `/repos/${owner}/${repo}/pulls?${params}`,
          token
        );

        // Determine which PRs are new since last poll.
        const lastSeen = await context.store.get<number>('lastSeenPR');
        const newPRs = lastSeen
          ? pullRequests.filter((pr: any) => pr.number > lastSeen)
          : pullRequests;

        if (pullRequests.length > 0) {
          const maxNumber = Math.max(...pullRequests.map((pr: any) => pr.number));
          await context.store.put('lastSeenPR', maxNumber);
        }

        return newPRs.map((pr: any) => ({
          ...normalisePR(pr),
          repository: `${owner}/${repo}`,
        }));
      },

      async test(context: GitHubTriggerContext): Promise<any[]> {
        const { token, owner, repo } = context.propsValue;
        if (!token || !owner || !repo) {
          return [{
            id: 1, number: 42, title: 'Sample PR', state: 'open',
            url: 'https://github.com/owner/repo/pull/42', user: 'octocat',
            head: 'feature', base: 'main', draft: false, labels: [],
            repository: `${owner || 'owner'}/${repo || 'repo'}`,
          }];
        }

        const pullRequests = await githubRequest(
          `/repos/${owner}/${repo}/pulls?state=open&per_page=5&sort=created&direction=desc`,
          token
        );

        return pullRequests.map((pr: any) => ({
          ...normalisePR(pr),
          repository: `${owner}/${repo}`,
        }));
      },

      sampleData: {
        id: 1,
        number: 42,
        title: 'Sample Pull Request',
        state: 'open',
        url: 'https://github.com/owner/repo/pull/42',
        user: 'octocat',
        repository: 'owner/repo',
      },
    },
  },
};

export default githubBit;
