### Start Admin Server

```bash
# Start the Admin server on port 3099
node packages/manage/admin/dist/server/index.js
```

### Build Admin

```bash
# Build the Admin app (TypeScript + Tailwind CSS)
cd packages/manage/admin && npm run build
```

### Build Admin Docker Image

```bash
# Build Admin dist then rebuild the Docker image (habits-admin:latest)
cd packages/manage/admin && npm run build && docker build -t habits-admin:latest .
```

### Restart Admin Docker

```bash
# Restart the Admin Docker container (build image then restart compose)
cd packages/manage/admin && npm run build && docker build -t habits-admin:latest . && docker compose up -d --force-recreate
```

### Update Admin in Docker

```bash
# Build admin dist, copy files into the running container, then restart it (no image rebuild), this is much more prefered to be used with local dev
cd packages/manage/admin && npm run build && docker cp dist/. habits-admin:/app/dist && docker restart habits-admin
```

### Deploy Admin to Docker Context

```bash
# Switch to a remote Docker context, build the Admin image, restart the container, then revert back to default
docker build --context {{context}} -t habits-admin:latest packages/manage/admin && docker --context {{context}} compose -f packages/manage/admin/compose.yaml up -d --force-recreate
```
