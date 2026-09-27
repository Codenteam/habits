# RAG Memory Pipeline

Automatically ingest documents from a watched folder into a vector RAG memory store.

## What it does

1. **Watch a folder** — Polls `HABITS_RAG_FOLDER_PATH` every minute for new or modified files.
2. **Extract chunks** — Sends each new file to OpenAI to extract self-contained RAG text chunks.
3. **Embed & store** — Embeds each chunk with OpenAI and saves it in SQLite via `vectorInsert`.

Already-seen files are skipped using the polling store (dedup key: `path|size|mtime`).

## Setup

1. Copy `.env.example` to `.env` and set your OpenAI key, base directory, folder path, and vector collection name (`HABITS_RAG_COLLECTION`, default `rag_memory`).
2. Create the watch directory (resolved as `HABITS_RAG_BASE_DIR` + `HABITS_RAG_FOLDER_PATH`):

   ```bash
   mkdir -p /dirPath/rag-data
   ```

   Example `.env` for that path:

   ```bash
   HABITS_RAG_BASE_DIR=/dirPath
   HABITS_RAG_FOLDER_PATH=rag-data
   ```

3. Start the showcase:

   ```bash
   npx nx dev @ha-bits/cortex --config showcase/rag-memory-pipeline/stack.yaml
   ```

4. Open the UI at `http://localhost:13000` to see ingested files (refreshes every 30 seconds).
5. Drop a document into the folder — processing starts within one minute.

## Workflows

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| `rag-ingest-folder` | Folder polling (every 1 min) | Detect new files, extract chunks, loop ingest, save file metadata |
| `rag-ingest-chunk` | Called by loop | Embed one chunk and `vectorInsert` |
| `rag-list-files` | UI poll (every 30 sec) | List saved file metadata from `rag_files` collection |

## Supported file types

PDF, TXT, Markdown, CSV, JSON, images (PNG/JPG), and Word documents. MIME type is inferred from the file extension.
