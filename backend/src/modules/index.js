/**
 * Module registry and loader
 * Discovers and initializes all modules in the modules directory
 */

import { getConfig } from '../lib/config.js';
import { getDockerClient } from '../lib/docker-client.js';

// Module registry
const modules = new Map();

/**
 * Register a module
 * @param {string} name - Module name
 * @param {Object} module - Module definition
 * @param {Function} module.init - Initialization function (receives context)
 * @param {Function} [module.registerRoutes] - Route registration function (receives express app)
 * @param {Function} [module.shutdown] - Cleanup function
 */
export function registerModule(name, module) {
  if (modules.has(name)) {
    throw new Error(`Module "${name}" is already registered`);
  }
  modules.set(name, {
    name,
    ...module,
    initialized: false,
  });
}

/**
 * Get a registered module
 * @param {string} name - Module name
 * @returns {Object|undefined}
 */
export function getModule(name) {
  return modules.get(name);
}

/**
 * Get all registered modules
 * @returns {Map}
 */
export function getAllModules() {
  return modules;
}

/**
 * Create module context with shared dependencies
 * @param {Object} overrides - Override default dependencies
 * @returns {Object}
 */
export function createModuleContext(overrides = {}) {
  return {
    config: overrides.config || getConfig(),
    docker: overrides.docker || getDockerClient(),
    getModule,
    ...overrides,
  };
}

/**
 * Initialize all registered modules
 * @param {Object} context - Module context
 */
export async function initializeModules(context) {
  for (const [name, module] of modules) {
    if (!module.initialized && module.init) {
      try {
        await module.init(context);
        module.initialized = true;
        console.log(`Module "${name}" initialized`);
      } catch (error) {
        console.error(`Failed to initialize module "${name}":`, error);
        throw error;
      }
    }
  }
}

/**
 * Register routes for all modules
 * @param {Object} app - Express app
 * @param {Object} context - Module context
 */
export function registerAllRoutes(app, context) {
  for (const [name, module] of modules) {
    if (module.registerRoutes) {
      try {
        module.registerRoutes(app, context);
        console.log(`Routes registered for module "${name}"`);
      } catch (error) {
        console.error(`Failed to register routes for module "${name}":`, error);
        throw error;
      }
    }
  }
}

/**
 * Shutdown all modules
 */
export async function shutdownModules() {
  for (const [name, module] of modules) {
    if (module.initialized && module.shutdown) {
      try {
        await module.shutdown();
        console.log(`Module "${name}" shut down`);
      } catch (error) {
        console.error(`Error shutting down module "${name}":`, error);
      }
    }
  }
}

/**
 * Clear all modules (for testing)
 */
export function clearModules() {
  modules.clear();
}
