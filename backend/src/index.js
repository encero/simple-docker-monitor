/**
 * Docker Monitor - Entry Point
 * Slim bootstrap file that loads config, initializes modules, and starts the server
 */

import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

import { loadConfig } from './lib/config.js';
import { createDockerClient, setDockerClient } from './lib/docker-client.js';
import {
  registerModule,
  createModuleContext,
  initializeModules,
  registerAllRoutes,
  shutdownModules,
  clearModules,
} from './modules/index.js';

// Import modules
import containersModule from './modules/containers/index.js';
import systemModule from './modules/system/index.js';
import updateCheckerModule from './modules/update-checker/index.js';
import schedulerModule from './modules/scheduler/index.js';
import notificationsModule from './modules/notifications/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Create and configure the Express app with all modules
 * @param {Object} docker - Docker client (optional, for testing)
 * @returns {Object} Express app
 */
export async function createApp(docker = null) {
  const app = express();

  app.use(cors());
  app.use(express.json());

  // Serve static files from frontend build
  app.use(express.static(path.join(__dirname, '../../frontend/dist')));

  // Load config
  const config = loadConfig();

  // Set up Docker client
  if (docker) {
    setDockerClient(docker);
  } else {
    docker = createDockerClient();
  }

  // Clear any previously registered modules (for testing)
  clearModules();

  // Register all modules
  registerModule('containers', containersModule);
  registerModule('system', systemModule);
  registerModule('scheduler', schedulerModule);
  registerModule('update-checker', updateCheckerModule);
  registerModule('notifications', notificationsModule);

  // Create module context
  const context = createModuleContext({ config, docker });

  // Initialize modules
  await initializeModules(context);

  // Register routes
  registerAllRoutes(app, context);

  // Serve frontend for all other routes
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../../frontend/dist/index.html'));
  });

  // Graceful shutdown
  const shutdown = async () => {
    console.log('Shutting down...');
    await shutdownModules();
    process.exit(0);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);

  return app;
}

// Only start server when running directly (not when imported for testing)
const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  const config = loadConfig();
  const port = config.port;

  createApp().then(app => {
    app.listen(port, () => {
      console.log(`Docker Monitor API running on port ${port}`);
    });
  }).catch(error => {
    console.error('Failed to start server:', error);
    process.exit(1);
  });
}
