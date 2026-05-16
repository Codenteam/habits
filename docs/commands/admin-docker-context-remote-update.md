```bash
# Build admin dist locally, copy files into the remote running container via docker cp, then restart it, no image rebuild needed
cd packages/manage/admin && npm run build && docker --context {{context}} cp dist/. habits-admin:/app/dist && docker --context {{context}} restart habits-admin
```
