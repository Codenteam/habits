## <Icon name="cloud" /> Run Serverless

For serverless or containerized deployments, we recommend using Docker:

```bash
# Using Docker (recommended for serverless)
docker run -p 3000:3000 -v $(pwd)/your-app.habit:/app/habit.habit \
  node:20-alpine npx @ha-bits/cortex --config /app/habit.habit --host 0.0.0.0
```

Or create a `Dockerfile`:

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY your-app.habit ./
COPY .env ./ # Optional: include environment variables
RUN npm install -g @ha-bits/cortex
EXPOSE 3000
CMD ["cortex", "--config", "./your-app.habit", "--host", "0.0.0.0"]
```

- [ ] Create a Dockerfile or use the Docker run command above
- [ ] Deploy to your preferred cloud provider (AWS, GCP, Azure, etc.)
- [ ] Configure environment variables via your cloud provider's secrets management
- [ ] Set up health checks at `/habits/base/api` endpoint
