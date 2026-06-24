## <Icon name="rocket" /> First Project Checklist

### Prepare Base Directory
- [ ] Create a new directory: `mkdir my-habits && cd my-habits`
- [ ] Run Base (auto-creates `.env` and `modules.json` on first run): `npx habits@latest base`
- [ ] Modify `.env` as needed (add API keys, etc.)
- [ ] Modify `modules.json` as needed

### Run Habits
- [ ] Open browser at `http://localhost:3000/habits/base/`
- [ ] Create your first habit from the UI

### Troubleshooting: Port Already in Use Error
- [ ] Run with different port: `--port 8080`
- [ ] Or kill process: `lsof -ti:3000 | xargs kill`
- [ ] Base can also help you kill a port
