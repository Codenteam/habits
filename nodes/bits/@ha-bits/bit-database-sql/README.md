# @ha-bits/bit-database-sql

SQL database storage bit using **Drizzle ORM** with **SQLite** support.

This bit replaces `@ha-bits/bit-database` with SQL persistence, providing a type-safe and efficient way to store data using SQLite.

## Features

- **SQLite storage** - Persistent local database using better-sqlite3
- **Drizzle ORM** - Type-safe SQL operations
- **Key-Value store** - Simple store/get/delete operations
- **Document store** - Insert/update/query documents with auto-generated IDs
- **TTL support** - Automatic expiration of stored values
- **Raw SQL** - Execute custom SQL queries when needed
- **Browser/Tauri ready** - Stubs for `window.__TAURI__.sql`

## Environment Support

| Environment | Backend |
|------------|---------|
| Node.js | better-sqlite3 |
| Browser/Tauri | window.__TAURI__.sql (via stubs) |

## Actions

### Key-Value Operations

| Action | Description |
|--------|-------------|
| `store` | Store a value with a key |
| `get` | Retrieve a value by key |
| `delete` | Delete a value by key |
| `list` | List all keys in a collection |
| `increment` | Atomically increment a numeric value |

### Document Operations

| Action | Description |
|--------|-------------|
| `insert` | Insert a document with auto-generated ID |
| `update` | Update a document matching a filter |
| `query` | Query documents with simple filters |

### Raw SQL Operations

| Action | Description |
|--------|-------------|
| `rawQuery` | Execute a SELECT query |
| `rawExecute` | Execute INSERT/UPDATE/DELETE statements |

## Usage Example

```yaml
# Insert a user document
- id: insert-user
  type: bits
  data:
    module: "@ha-bits/bit-database-sql"
    operation: insert
    params:
      collection: "users"
      document:
        name: "John Doe"
        email: "john@example.com"
        status: "pending"

# Update the user
- id: update-user
  type: bits
  data:
    module: "@ha-bits/bit-database-sql"
    operation: update
    params:
      collection: "users"
      filter:
        _id: "{{insert-user.id}}"
      update:
        status: "active"

# Query users
- id: find-users
  type: bits
  data:
    module: "@ha-bits/bit-database-sql"
    operation: query
    params:
      collection: "users"
      filter:
        status: "active"
      limit: 10
```

## Database Location

- **Node.js**: `/tmp/habits-sql/{database}.db`
- **Browser**: In-memory (or Tauri SQL plugin)

## Related Bits

- `@ha-bits/bit-database` - In-memory storage (parent bit)
- `@ha-bits/bit-pouch` - PouchDB/IndexedDB storage
