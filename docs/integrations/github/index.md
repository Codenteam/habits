---
title: "GitHub"
description: "Monitor GitHub Actions failures, manage issues, and automate repository workflows with @ha-bits/bit-github"
---

# GitHub

Use `@ha-bits/bit-github` to poll failed GitHub Actions runs, create labelled issues, and integrate repository automation into Habits workflows.

**Related bit:** [`@ha-bits/bit-github`](/bits/bit-github)

## Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `HABITS_GITHUB_TOKEN` | Fine-grained PAT with access to the monitored repo | `github_pat_...` |
| `HABITS_GITHUB_OWNER` | Repository owner (user or organization) | `your-org` |
| `HABITS_GITHUB_REPO` | Repository name to monitor | `your-repo` |
| `HABITS_GITHUB_ISSUE_LABELS` | Comma-separated allowed issue labels (must already exist in the repo) | `bug,ci-failure,devops,enhancement` |

## Setup

### 1. Owner and repo

From your repository URL:

```text
https://github.com/OWNER/REPO
```

Example:

```text
https://github.com/your-org/your-repo
```

Add to `.env`:

```env
HABITS_GITHUB_OWNER=your-org
HABITS_GITHUB_REPO=your-repo
```

- **Owner** — user or organization name (first path segment)
- **Repo** — repository name only (second segment, no `.git`)

Works for **public and private** repos as long as your token has access.

### 2. Create a fine-grained Personal Access Token

1. GitHub → **Settings** → **Developer settings** → **Personal access tokens** → **Fine-grained tokens**
2. Click **Generate new token**
3. Configure the token:
   - **Repository access**: **Only select repositories** — choose **only the repository you monitor** (the same repo as `HABITS_GITHUB_REPO`)
   - **Repository permissions**:

     | Permission | Access |
     |------------|--------|
     | **Metadata** | Read |
     | **Actions** | Read |
     | **Issues** | Read and write |

   - **Account permissions**: leave all **No access** (not needed)
4. Generate the token and copy it into `.env`:

```env
HABITS_GITHUB_TOKEN=github_pat_xxxxxxxxxxxx
```

> Keep your token secret. Never commit `.env` files to version control.

### 3. Create issue labels (if using AI triage)

**Labels** are tags on GitHub Issues used to categorize work — for example `bug`, `ci-failure`, `devops`, `enhancement`.

Habits does **not** create labels automatically. Create them on your repo first:

1. Open the repo on GitHub → **Issues** → **Labels**
2. Create each label listed in `HABITS_GITHUB_ISSUE_LABELS`

```env
HABITS_GITHUB_ISSUE_LABELS=bug,ci-failure,devops,enhancement
```

If a label name does not exist on GitHub, GitHub may silently ignore it when creating an issue.

### 4. Verify token access (optional)

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Accept: application/vnd.github+json" \
  "https://api.github.com/repos/OWNER/REPO/actions/runs?status=failure&per_page=1"
```

Replace `YOUR_TOKEN`, `OWNER`, and `REPO` with your values. A `200` response means owner, repo, and token are correct.

## Example `.env`

```env
HABITS_GITHUB_TOKEN=github_pat_xxxxxxxxxxxx
HABITS_GITHUB_OWNER=your-org
HABITS_GITHUB_REPO=your-repo
HABITS_GITHUB_ISSUE_LABELS=bug,ci-failure,devops,enhancement
```

<IntegrationShowcases integration="github" />
