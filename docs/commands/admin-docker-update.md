```bash
# Build admin dist, copy files into the running container, then restart it (no image rebuild), this is much more prefered to be used with local dev
cd packages/manage/admin && npm run build && docker cp dist/. habits-admin:/app/dist && docker restart habits-admin
```
