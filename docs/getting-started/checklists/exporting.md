## Exporting for Production

### Export as `.habit` (recommended)

- [ ] Stack tested locally and working
- [ ] Export via Base UI → Export → **Generate .habit File**
- [ ] Or CLI: `npx habits pack --config ./stack.yaml --format habit`
- [ ] Import into **Habits Cortex** (App Store, Google Play, or desktop download)
- [ ] Test workflow execution on target device

### Server-side hosting (alternative)

- [ ] Stack tested locally and working
- [ ] Run `npx habits cortex --config ./stack.yaml`
- [ ] Or deploy with Cortex Docker images for production hosting

### Troubleshooting

- [ ] Verify `stack.yaml` references valid habit YAML paths
- [ ] If frontend is used, ensure `index.yaml` or `index.html` exists under `server.frontend`
- [ ] Check pack output for bundle generation errors (missing bits, invalid workflow)
