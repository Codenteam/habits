## 📋 Habits Stack Preparation Checklist
Do this before exporting your stack

### Basic Stack Requirements
- [ ] Stack has a `name` field in `stack.yaml`
- [ ] Each habit has a unique `name` field
- [ ] Each habit has at least one node
- [ ] All API keys stored in `.env` file (not in habit files)
- [ ] `.env` is in `.gitignore` if you have a version control
- [ ] `.env.example` exists with required variable names

### If using Server-Side or Full-Stack Logic
- [ ] All habits have clear `inputs` defined
- [ ] All habits have clear `outputs` defined
- [ ] UI points to correct backend endpoints
- [ ] CORS configured if frontend/backend on different origins

### Troubleshooting: Cannot Find stack.yaml Error
- [ ] Verify `stack.yaml` exists in current directory
- [ ] Or provide full path: `--config /path/to/stack.yaml`


### Troubleshooting: Missing Environment Variable Error
- [ ] Verify `.env` file exists
- [ ] Check variable names match references in habits (e.g., `${OPENAI_API_KEY}`)
- [ ] Ensure `.env` is in same directory as `stack.yaml`
