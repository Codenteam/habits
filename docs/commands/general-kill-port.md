```bash
# Kill Port 3000
lsof -ti:{{port}} | xargs kill -9 2>/dev/null || echo "No process"
```
