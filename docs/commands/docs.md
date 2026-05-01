### Deploy Docs

```bash
# Deploy documentation
npx env-cmd -f .secrets -- npx tsx scripts/deploy-docs.ts
```

### Start Docs Server

```bash
# Start the VitePress docs server on port 5173
pnpm dev
```
