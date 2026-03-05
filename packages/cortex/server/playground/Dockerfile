# Mount points will be used with docker run -v flag
# Example usage:
# cd packages/cortex/server/playground
# docker build -t cortex-server .
# docker run -v $(pwd)/../examples:/app/examples -v $(pwd)/dist:/app/dist -v $(pwd)/packages/cortex:/app/packages/cortex cortex-server
# npx /app/dist/ server --config /app/playground/config.json

FROM node:18-alpine

WORKDIR /app
RUN apk add --no-cache git

# Expose port if needed
EXPOSE 13000

CMD ["sleep", "infinity"]