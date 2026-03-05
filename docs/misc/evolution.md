# Evolution API Considerations

## Database Token Length

The `Instance.token` column in Evolution API's PostgreSQL database defaults to `VARCHAR(255)`. Meta WhatsApp Business Cloud API access tokens exceed this limit (~312+ characters).


**Error:**
```
S.integrationSession.update
Foreign key constraint violated: `Setting_instanceId_fkey (index)`
```


**Fix:**
```sql
ALTER TABLE "Instance" ALTER COLUMN "token" TYPE VARCHAR(1000);
```




**Fix:**
```sql
ALTER TABLE "Instance" ALTER COLUMN "token" TYPE VARCHAR(1000);
```

## 24-Hour Messaging Window

Meta's Cloud API enforces a 24-hour messaging window for non-template messages with trial tokens:

- **Outbound messages require** the user to message the business number first
- Window opens when user sends a message and closes after 24 hours of inactivity
- Messages sent outside the window return `PENDING` but are never delivered

**Workaround:** Use approved message templates for initiating conversations, or have users message first.
