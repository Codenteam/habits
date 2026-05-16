```bash
# Build the Admin image directly on a remote Docker context, then restart the running habits-admin container with the new image
docker --context {{context}} build -t habits-admin:latest packages/manage/admin && docker --context {{context}} restart habits-admin
```
