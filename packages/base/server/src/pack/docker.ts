/**
 * Docker Pack Handler
 * 
 * Generates a Docker Compose package that runs the habits stack
 * using node:24-alpine with npx @ha-bits/cortex server
 */

import { LoggerFactory } from '@ha-bits/core';
import JSZip from 'jszip';
import { sanitizeStackName, createTmpWorkDir, createCleanupHandler, addDirectoryToZip } from './utils';

const logger = LoggerFactory.getRoot();

/**
 * Web API Docker Pack Options
 */
export interface WebDockerPackOptions {
  habits: any[];
  serverConfig: any;
  envContent: string;
  frontendHtml?: string;
  stackYaml: string;
  habitFiles: Array<{ filename: string; content: string }>;
  stackName?: string;
}

/**
 * Web API Docker Pack Result
 */
export interface WebDockerPackResult {
  success: boolean;
  error?: string;
  zipBuffer?: Buffer;
  zipFilename?: string;
}

/**
 * Generate docker-compose.yml content
 */
function generateDockerCompose(port: number = 3000): string {
  return `version: '3.8'

services:
  habits:
    image: node:24-alpine
    working_dir: /app
    command: npx @ha-bits/cortex@latest server --config stack.yaml
    ports:
      - "${port}:${port}"
    volumes:
      # Mount all files to the container
      - ./stack.yaml:/app/stack.yaml
      - ./habits:/app/habits
      - ./.env:/app/.env
      - ./frontend:/app/frontend
    environment:
      - NODE_ENV=production
    restart: unless-stopped
    # Uncomment to see logs
    # logging:
    #   driver: "json-file"
    #   options:
    #     max-size: "10m"
    #     max-file: "3"

# Optional: Add networks for multi-service setups
# networks:
#   habits-network:
#     driver: bridge
`;
}

/**
 * Generate README.md content
 */
function generateReadme(port: number = 3000): string {
  return `# Habits Docker Compose Package

This package contains everything needed to run your habits stack with Docker Compose.

## Quick Start

\`\`\`bash
# Start the container
docker-compose up -d

# View logs
docker-compose logs -f

# Stop the container
docker-compose down
\`\`\`

Your habits app will be available at: http://localhost:${port}

### First Run Note

On first run, the container will install dependencies using npx, which may take 30-60 seconds. Subsequent starts will be faster.

## Package Contents

- **docker-compose.yml** - Compose file using node:20-alpine with \`npx @ha-bits/cortex server --config stack.yaml\`
- **stack.yaml** - Your habits workflow configuration
- **habits/** - Your habit definition files
- **.env** - Environment variables (API keys, secrets, etc.)
- **frontend/** - Your frontend HTML (if configured)

## Configuration

### Ports

The default port is ${port}. To change it:

1. Update the port in \`stack.yaml\` (server.port)
2. Update the port mapping in \`docker-compose.yml\`

### Environment Variables

All environment variables are loaded from the \`.env\` file. You can:

- Edit \`.env\` directly
- Pass environment variables via docker-compose:
  \`\`\`yaml
  environment:
    - API_KEY=your-key
    - CUSTOM_VAR=value
  \`\`\`
- Pass via docker run:
  \`\`\`bash
  docker run -e API_KEY=your-key -p ${port}:${port} habits-app
  \`\`\`

### Volume Mounts

The docker-compose.yml includes volume mounts for:
- \`stack.yaml\` - Main configuration
- \`habits/\` - Habit definitions
- \`.env\` - Environment variables
- \`frontend/\` - Frontend files

This allows you to modify these files without rebuilding the container.

## Production Deployment

For production:

1. **Remove development volume mounts** - Comment out the volumes section in docker-compose.yml
2. **Set NODE_ENV=production** - Already configured
3. **Use secrets management** - Don't commit .env to git, use Docker secrets or env vars
4. **Configure health checks** - Add health check endpoint to your habits
5. **Set up logging** - Uncomment the logging section in docker-compose.yml

## Troubleshooting

### Container won't start

\`\`\`bash
# Check logs
docker-compose logs

# Or for docker run
docker logs habits
\`\`\`

### Port already in use

\`\`\`bash
# Change the host port in docker-compose.yml
ports:
  - "3001:${port}"  # Maps container port ${port} to host port 3001
\`\`\`

### Permission issues

\`\`\`bash
# Ensure files have correct permissions
chmod -R 755 .
\`\`\`

## Advanced Usage

### Multi-stage builds

For smaller images, create a multi-stage Dockerfile:

\`\`\`dockerfile
FROM node:20-alpine AS base
WORKDIR /app
COPY . .
CMD ["npx", "habits@latest", "cortex", "--config", "stack.yaml"]
\`\`\`

### Custom network

Uncomment the networks section in docker-compose.yml to isolate your habits service.

### Scaling

\`\`\`bash
# Run multiple instances
docker-compose up -d --scale habits=3
\`\`\`

## Support

For more information, visit: https://github.com/habits/habits
`;
}

/**
 * Pack habits stack for Docker deployment
 */
export async function packDockerForWeb(options: WebDockerPackOptions): Promise<WebDockerPackResult> {
  const { habits, serverConfig, envContent, frontendHtml, stackYaml, habitFiles, stackName } = options;

  logger.info('🐳 Generating Docker package for Web API');

  try {
    // Extract port from server config
    const port = serverConfig?.port || 3000;

    // Sanitize stack name for filename
    const sanitizedStackName = sanitizeStackName(stackName);

    // Create ZIP with all necessary files
    const zip = new JSZip();

    // Add docker-compose.yml
    zip.file('docker-compose.yml', generateDockerCompose(port));

    // Add README.md
    zip.file('README.md', generateReadme(port));

    // Add stack.yaml
    zip.file('stack.yaml', stackYaml);

    // Add habit files
    for (const habit of habitFiles) {
      zip.file(habit.filename, habit.content);
    }

    // Add .env
    zip.file('.env', envContent);

    // Add frontend if exists
    if (frontendHtml) {
      zip.file('frontend/index.html', frontendHtml);
    }

    // Generate ZIP buffer
    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });

    logger.info('✅ Docker package generated successfully');

    return {
      success: true,
      zipBuffer,
      zipFilename: `${sanitizedStackName}.docker.zip`,
    };
  } catch (error: any) {
    logger.error('Failed to generate Docker package:', error);
    return {
      success: false,
      error: `Docker pack failed: ${error.message}`,
    };
  }
}
