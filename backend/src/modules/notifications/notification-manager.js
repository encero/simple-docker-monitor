/**
 * Notification Manager
 * Coordinates multiple notification providers
 */

/**
 * Create a notification manager
 * @returns {Object} Notification manager
 */
export function createNotificationManager() {
  const providers = new Map();

  return {
    /**
     * Register a notification provider
     * @param {BaseNotificationProvider} provider - Provider instance
     */
    registerProvider(provider) {
      if (providers.has(provider.name)) {
        throw new Error(`Provider "${provider.name}" is already registered`);
      }
      providers.set(provider.name, provider);
    },

    /**
     * Initialize all registered providers
     * @param {Object} config - Configuration
     */
    async initializeProviders(config) {
      for (const [name, provider] of providers) {
        try {
          await provider.init(config);
          console.log(`Notification provider "${name}" initialized (enabled: ${provider.isEnabled()})`);
        } catch (error) {
          console.error(`Failed to initialize provider "${name}":`, error);
        }
      }
    },

    /**
     * Send notification to all enabled providers
     * @param {Array} updates - List of updates to notify about
     */
    async notify(updates) {
      if (!updates || updates.length === 0) {
        return;
      }

      const results = [];
      for (const [name, provider] of providers) {
        if (provider.isEnabled()) {
          try {
            await provider.sendUpdateNotification(updates);
            results.push({ provider: name, success: true });
          } catch (error) {
            console.error(`Provider "${name}" failed to send notification:`, error);
            results.push({ provider: name, success: false, error: error.message });
          }
        }
      }

      return results;
    },

    /**
     * Get a provider by name
     * @param {string} name - Provider name
     * @returns {BaseNotificationProvider|undefined}
     */
    getProvider(name) {
      return providers.get(name);
    },

    /**
     * Get all enabled providers
     * @returns {Array}
     */
    getEnabledProviders() {
      return Array.from(providers.values()).filter(p => p.isEnabled());
    },

    /**
     * Shutdown all providers
     */
    async shutdown() {
      for (const [name, provider] of providers) {
        try {
          await provider.shutdown();
        } catch (error) {
          console.error(`Error shutting down provider "${name}":`, error);
        }
      }
    },
  };
}
