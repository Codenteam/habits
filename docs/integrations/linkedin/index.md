---
title: "LinkedIn"
description: "Publish posts to LinkedIn via OAuth developer app credentials"
---

# LinkedIn

Use `@ha-bits/bit-linkedin` to publish posts to personal or organization LinkedIn pages.

**Related bit:** [`@ha-bits/bit-linkedin`](/bits/bit-linkedin)

## Environment Variables

| Variable | Description |
|----------|-------------|
| `HABITS_LINKEDIN_CLIENT_ID` | LinkedIn app Client ID |
| `HABITS_LINKEDIN_CLIENT_SECRET` | LinkedIn app Client Secret |
| `HABITS_LINKEDIN_ORGANIZATION_ID` | Numeric Company Page ID (for org posting) |

## Step 1: Create a LinkedIn Company Page (for organization posting)

Skip if you already have one.

1. Go to [https://www.linkedin.com/company/setup/new/](https://www.linkedin.com/company/setup/new/).
2. Fill in company name, public URL, industry, size, and type.
3. Upload a logo (optional) and click **Create page**.

## Step 2: Create a LinkedIn Developer App

1. Go to [https://www.linkedin.com/developers/](https://www.linkedin.com/developers/).
2. Click **Create App**.
3. Fill in **App name**, associate a **LinkedIn Page**, and upload a logo.
4. Accept the legal agreement and click **Create App**.

## Step 3: Get Client ID and Client Secret

1. Open the **Auth** tab on your app dashboard.
2. Copy the **Client ID**.
3. Click **Generate Client Secret** and copy the secret.

## Step 4: Add Authorized Redirect URL

1. On the **Auth** tab, scroll to **OAuth 2.0 settings**.
2. Under **Authorized redirect URLs**, add:

   ```
   http://localhost:13000/oauth/bit-linkedin/callback
   ```

3. Click **Update**.

## Step 5: Enable Required OAuth Scopes

1. Go to the **Products** tab.
2. Request access to:
   - **Sign In with LinkedIn using OpenID Connect** — enables `openid` and `profile`
   - **Share on LinkedIn** — enables `w_member_social`
   - **Marketing Developer Platform** (for org posting) — enables `w_organization_social` and `r_organization_social`
3. Confirm scopes appear under **OAuth 2.0 scopes** on the **Auth** tab.

## Step 6: Get Your Organization ID

1. Sign in to LinkedIn → click **Me** → under **Manage**, select your company page.
2. The admin dashboard URL looks like:

   ```
   https://www.linkedin.com/company/<ORGANIZATION_ID>/admin/dashboard/
   ```

3. Copy the numeric ID between `/company/` and `/admin/`.

## Example `.env`

```env
HABITS_LINKEDIN_CLIENT_ID=your-client-id
HABITS_LINKEDIN_CLIENT_SECRET=your-client-secret
HABITS_LINKEDIN_ORGANIZATION_ID=12345678
```

## Used in Showcases

- [Social Media Multi-Posting](/showcase/social-media-multi-posting)
- [LinkedIn Posting](https://github.com/codenteam/habits/tree/main/showcase/social-media-linkedin-posting)
- [Real Estate Social Marketing](/showcase/real-estate-social-marketing)
