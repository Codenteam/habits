```bash
# Restart the Admin Docker container (build image then restart compose)
cd packages/manage/admin && npm run build && docker build -t habits-admin:latest . && docker compose up -d --force-recreate
```
