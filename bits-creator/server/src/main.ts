import express from "express";
import { setupBitsCreatorRoutes, ServerConfig } from "./serve.js";

/**
 * Bits Creator Server
 * 
 * A simple Express server for creating habits via AI.
 * 
 * Environment variables:
 * - PORT: Server port (default: 3100)
 * - MOCK_MODE: Enable mock mode (default: false)
 */

const PORT = parseInt(process.env.PORT || "3100", 10);
const MOCK_MODE = process.env.MOCK_MODE === "true";

async function main() {
  const app = express();
  
  // Middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Server configuration
  const config: ServerConfig = {
    mockMode: true,
  };

  // Setup routes
  setupBitsCreatorRoutes(app, config);

  // Root endpoint
  app.get("/", (_req, res) => {
    res.json({
      name: "@bits/creator-server",
      version: "1.0.0",
      description: "Bits Creator Server - API for creating habits from AI",
      mockMode: config.mockMode,
      endpoints: {
        health: "/habits/bits-creator/health",
        createHabit: "POST /habits/bits-creator/create-habit",
        helloWorldExample: "/habits/bits-creator/examples/hello-world",
      },
    });
  });

  // Start server
  app.listen(PORT, () => {
    console.log(`[bits-creator-server] Server started`);
    console.log(`  Port: ${PORT}`);
    console.log(`  Mock Mode: ${config.mockMode}`);
    console.log(`  URL: http://localhost:${PORT}`);
    console.log(`  Base Path: http://localhost:${PORT}/habits/bits-creator`);
  });
}

main().catch((error) => {
  console.error("[bits-creator-server] Fatal error:", error);
  process.exit(1);
});
