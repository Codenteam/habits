# Implementation Plan: Vector Extraction Feature

## Overview

Simplified implementation: Add the local-ai-candle bit to the existing insert and search habits for vector extraction.

## Tasks

- [x] 1. Update insert.yaml to add vector extraction
  - Add local-ai-candle bit node to generate embeddings from text input
  - Store the extracted vector along with text in the database

- [x] 2. Update search.yaml to add vector extraction
  - Add local-ai-candle bit node to convert search query to vector
  - Use the extracted vector for similarity search

## Notes

- Keep existing 4D vector functionality working
- Add 384D embedding extraction as an option
- Use the same collection structure as existing workflows