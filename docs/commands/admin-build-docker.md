```bash
# Build Admin dist then rebuild the Docker image (habits-admin:latest)
cd packages/manage/admin && npm run build && docker build -t habits-admin:latest .
```
