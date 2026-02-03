/**
 * Environment-based configuration loader
 * All configuration is centralized here and validated on startup
 */

function parseBoolean(value, defaultValue = false) {
  if (value === undefined || value === null || value === '') {
    return defaultValue;
  }
  return value === 'true' || value === '1';
}

function parseNumber(value, defaultValue) {
  if (value === undefined || value === null || value === '') {
    return defaultValue;
  }
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

function parseList(value, defaultValue = []) {
  if (value === undefined || value === null || value === '') {
    return defaultValue;
  }
  if (value === '*') {
    return '*';
  }
  return value.split(',').map(s => s.trim()).filter(Boolean);
}

export function loadConfig() {
  const config = {
    // Server
    port: parseNumber(process.env.PORT, 3001),
    nodeEnv: process.env.NODE_ENV || 'development',

    // Docker
    dockerSocketPath: process.env.DOCKER_SOCKET_PATH || '/var/run/docker.sock',

    // Update Checker
    updateChecker: {
      enabled: parseBoolean(process.env.UPDATE_CHECKER_ENABLED, false),
      intervalMinutes: parseNumber(process.env.UPDATE_CHECKER_INTERVAL_MINUTES, 60),
      containers: parseList(process.env.UPDATE_CHECKER_CONTAINERS, '*'),
      excludeContainers: parseList(process.env.UPDATE_CHECKER_EXCLUDE_CONTAINERS, []),
    },

    // Discord
    discord: {
      enabled: parseBoolean(process.env.DISCORD_ENABLED, false),
      webhookUrl: process.env.DISCORD_WEBHOOK_URL || '',
      botToken: process.env.DISCORD_BOT_TOKEN || '',
      guildId: process.env.DISCORD_GUILD_ID || '',
    },

    // Registry Auth (for private images)
    registryAuth: {
      ghcrToken: process.env.GHCR_TOKEN || '',
    },
  };

  // Validation
  if (config.updateChecker.enabled && config.updateChecker.intervalMinutes < 5) {
    console.warn('UPDATE_CHECKER_INTERVAL_MINUTES cannot be less than 5, setting to 5');
    config.updateChecker.intervalMinutes = 5;
  }

  if (config.discord.enabled && !config.discord.webhookUrl && !config.discord.botToken) {
    console.warn('Discord is enabled but neither DISCORD_WEBHOOK_URL nor DISCORD_BOT_TOKEN is set');
  }

  return config;
}

// Singleton instance
let configInstance = null;

export function getConfig() {
  if (!configInstance) {
    configInstance = loadConfig();
  }
  return configInstance;
}

// For testing - allows resetting the config
export function resetConfig() {
  configInstance = null;
}
