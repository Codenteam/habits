### Start Admin Server

```bash
# Start the Admin server on port 3099
node packages/manage/admin/dist/server/index.js
```

### Watch Admin (Docker Dev)

```bash
# Build admin, start a volume-mounted Docker container (habits-admin-dev) on port 3099, then watch src and hot-reload on every save
npx tsx packages/manage/forge/src/scripts/admin-watch-docker.ts
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
# Build the Admin image directly on a remote Docker context, then restart the running habits-admin container with the new image
docker --context {{context}} build -t habits-admin:latest packages/manage/admin && docker --context {{context}} restart habits-admin
```

### Update Admin on Remote Context (no rebuild)

```bash
# Build admin dist locally, copy files into the remote running container via docker cp, then restart it, no image rebuild needed
cd packages/manage/admin && npm run build && docker --context {{context}} cp dist/. habits-admin:/app/dist && docker --context {{context}} restart habits-admin
```
