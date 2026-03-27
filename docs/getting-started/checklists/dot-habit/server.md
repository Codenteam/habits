## <Icon name="server" /> Run on Server

Run your `.habit` file as a server using the Cortex CLI:

```bash
# Install and run in one command
npx @ha-bits/cortex --config ./your-app.habit
```

- [ ] Make sure Node.js 20+ is installed
- [ ] Run the command above with your `.habit` file path
- [ ] Server will start on the specified port (default: 3000)
- [ ] Access the app at `http://localhost:3000`
- [ ] Optional: Place a `.env` file next to your `.habit` file - it will automatically override any embedded environment variables
