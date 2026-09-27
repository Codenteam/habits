# RAG Memory Query

Small UI to test vector search against the `rag_memory` collection.

> **Note:** To try the full flow end-to-end, run **both** showcases — [rag-memory-pipeline] (ingest) and **rag-memory-query** (search). Start the pipeline first, drop one or more PDFs or documents with real content into the watched folder (`HABITS_RAG_BASE_DIR` + `HABITS_RAG_FOLDER_PATH`), and confirm they appear in the pipeline UI at `http://localhost:13000`. Once ingestion finishes, start this showcase and ask questions at `http://localhost:13003` about the data you added. Use the same `HABITS_RAG_COLLECTION` in both `.env` files so queries hit the vectors you ingested.

## Prerequisites

1. Ingest documents with [rag-memory-pipeline](../rag-memory-pipeline/) first.
2. Set `HABITS_OPENAI_API_KEY` and `HABITS_RAG_COLLECTION` in `.env` (must match the ingest showcase).

## Run

```bash
cp .env.example .env
# edit HABITS_OPENAI_API_KEY

npx nx dev @ha-bits/cortex --config showcase/rag-memory-query/stack.yaml --env showcase/rag-memory-query/.env
```

Open **http://localhost:13003**, enter a question, click **Send**.

## Flow

```
User question → embed-text → vectorSearch → OpenAI combines chunks into one answer
```

Both showcases share the default DB: `/tmp/habits-sql/habits-cortex.db`.
