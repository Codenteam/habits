```bash
# Switch to a remote Docker context, build the Admin image, restart the container, then revert back to default
docker build --context {{context}} -t habits-admin:latest packages/manage/admin && docker --context {{context}} compose -f packages/manage/admin/compose.yaml up -d --force-recreate
```
