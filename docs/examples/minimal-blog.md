# Minimal Blog Example

A simple blog/CMS backend powered by Habits with database bits. It's just a demonstration of how bits-database work, it's not a production-ready CMS.

<div id="minimal-blog-screenshot">

![Simple CMS built with Habits](/images/blog-clone.webp)
*Simple CMS - Blog backend built with Habits*

</div>

<DownloadExample examplePath="minimal-blog" />

## What It Does

Provides REST API endpoints for a blog:
- `GET /api/get-posts` → List all posts
- `GET /api/get-post` → Single post by ID
- `POST /api/create-post` → Create post
- `DELETE /api/delete-post` → Remove post
- `POST /api/send-contact` → Contact form

## Why It's Included

Demonstrates Habits as a backend-for-frontend (BFF) layer—replaces traditional CMS backends with declarative workflows.

## Quick Start

<ExampleRunner examplePath="minimal-blog" />

::: code-group
```bash [Test Posts]
curl http://localhost:13000/api/get-posts
```

```bash [Create Post]
curl -X POST http://localhost:13000/api/create-post \
  -H "Content-Type: application/json" \
  -d '{"input": {"title": "Hello World", "content": "My first post"}}'
```
:::

## Key Files

::: code-group

<<< @/../examples/minimal-blog/.env.example [.env.example]

<<< @/../examples/minimal-blog/stack.yaml [stack.yaml]

<<< @/../examples/minimal-blog/habits/get-posts.yaml [get-posts.yaml]

<<< @/../examples/minimal-blog/habits/create-post.yaml [create-post.yaml]

:::

## Frontend

Includes a cyberpunk-styled blog frontend at `http://localhost:13000/`.
