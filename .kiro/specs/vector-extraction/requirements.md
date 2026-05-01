# Requirements Document

## Introduction

This document defines the requirements for extending the vector-db-demo showcase with vector extraction capability using the local-ai-candle bit. The feature enables users to generate vector embeddings from text input using local AI models, which can then be stored in the vector database for similarity search.

## Glossary

- **Vector_Embedding**: A numerical representation of text as an array of floating-point numbers that captures semantic meaning
- **Embedding_Model**: A local BERT-family model that converts text into vector embeddings (e.g., all-MiniLM-L6-v2 produces 384-dimensional vectors)
- **Vector_Store**: The database collection that stores documents with their associated vector embeddings
- **System**: The vector-db-demo showcase application
- **Collection**: A named group of vector documents within the vector store (e.g., "items", "words")
- **Document**: A record in the vector store containing text and its corresponding vector embedding

## Requirements

### Requirement 1: Extract Vector from Text

**User Story:** As a user of the vector-db-demo, I want to generate vector embeddings from text input, so that I can store semantic representations for similarity search.

#### Acceptance Criteria

1. WHEN a user provides text input, THE System SHALL generate a vector embedding using the local-ai-candle bit
2. THE Embedding_Node SHALL support text input as a single string or array of strings
3. THE Embedding_Node SHALL return a vector array with 384 dimensions when using the default all-MiniLM-L6-v2 model
4. THE Embedding_Node SHALL support L2-normalization of output vectors
5. THE Embedding_Node SHALL support mean pooling for sentence-level embeddings

### Requirement 2: Store Extracted Vector

**User Story:** As a user, I want to store the extracted vector along with its source text, so that I can search for similar items later.

#### Acceptance Criteria

1. WHEN a vector embedding is generated, THE System SHALL store the text and vector in the specified collection
2. THE System SHALL support storing additional metadata (tag, category) alongside the text and vector
3. THE System SHALL return the document ID upon successful storage

### Requirement 3: Search Using Extracted Vector

**User Story:** As a user, I want to search for similar documents using a text query that gets converted to a vector, so that I can find semantically related content.

#### Acceptance Criteria

1. WHEN a user provides a search query text, THE System SHALL first extract the vector embedding
2. THE System SHALL then search the vector store for similar documents using the extracted vector
3. THE System SHALL support configurable similarity metrics (l2, cosine)
4. THE System SHALL return ranked results with similarity scores

### Requirement 4: Model Management

**User Story:** As a user, I want to ensure the embedding model is available before generating vectors, so that vector extraction works reliably.

#### Acceptance Criteria

1. THE System SHALL check if the embedding model is installed before attempting extraction
2. IF the model is not installed, THE System SHALL return a descriptive error message
3. THE System SHALL support model selection from available embedding models in the registry

### Requirement 5: Error Handling

**User Story:** As a user, I want clear error messages when vector extraction fails, so that I can troubleshoot issues.

#### Acceptance Criteria

1. WHEN text input is empty or invalid, THE System SHALL return a descriptive error
2. WHEN the local AI backend is not supported on the platform, THE System SHALL return a clear error message
3. IF vector storage fails, THE System SHALL return the error from the database layer

### Requirement 6: Integration with Existing Workflows

**User Story:** As a user, I want the new vector extraction workflow to integrate seamlessly with existing vector-db-demo workflows, so that I can combine operations.

#### Acceptance Criteria

1. THE new vector-extraction workflow SHALL use the same collection naming as existing workflows ("items", "words")
2. THE vector-extraction workflow SHALL be registered in stack.yaml alongside existing workflows
3. THE extracted vectors SHALL be compatible with the existing vector-search workflow for cross-operation queries

## Design Notes

- The default embedding model (all-MiniLM-L6-v2) produces 384-dimensional vectors, which differs from the existing demo's 4D vectors
- A new collection (e.g., "embeddings") should be used for 384D vectors to avoid dimension mismatch with existing 4D data
- The workflow should support both single text input and batch text input for efficiency