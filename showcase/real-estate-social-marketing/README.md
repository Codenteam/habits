# Real Estate Social Marketing

Turn property listing URLs into AI-generated LinkedIn and Twitter posts, then publish immediately or on a schedule.

## Workflows

| Habit | Purpose |
|---|---|
| `add-property` | Extract details + generate posts + save to database |
| `extract-property-details` | Fetch listing page and extract structured data with OpenAI |
| `generate-property-posts` | Generate Twitter/X and LinkedIn posts from property details |
| `list-properties` | List draft properties for the UI |
| `get-property` | Fetch a single property for the process view |
| `delete-property` | Remove a property from the database |
| `set-property-schedule` | Set `scheduledAt` and move property to pending |
| `return-property-to-draft` | Clear schedule and move property back to draft |
| `publish-social-post` | Post to Twitter + LinkedIn (used by cron loop) |
| `publish-property-now` | Publish a single property immediately |
| `get-scheduled-properties` | List pending scheduled properties |
| `check-pending-posts` | Cron every 3 minutes — publishes due items |

## Environment variables

```env
HABITS_OPENAI_API_KEY=sk-...
HABITS_TWITTER_CLIENT_ID=...
HABITS_LINKEDIN_CLIENT_ID=...
HABITS_LINKEDIN_CLIENT_SECRET=...
HABITS_LINKEDIN_ORGANIZATION_ID=...
```
