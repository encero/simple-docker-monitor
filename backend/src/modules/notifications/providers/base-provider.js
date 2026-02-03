/**
 * Base notification provider interface
 * All notification providers should implement this interface
 */

/**
 * @typedef {Object} UpdateInfo
 * @property {string} containerId - Container ID
 * @property {string} containerName - Container name
 * @property {string} image - Image reference
 * @property {string} localDigest - Current local digest
 * @property {string} remoteDigest - Available remote digest
 */

/**
 * Base class for notification providers
 * Providers should extend this class and implement the required methods
 */
export class BaseNotificationProvider {
  /**
   * @param {string} name - Provider name
   */
  constructor(name) {
    this.name = name;
    this.enabled = false;
  }

  /**
   * Initialize the provider
   * @param {Object} config - Provider configuration
   * @returns {Promise<void>}
   */
  async init(config) {
    throw new Error('init() must be implemented');
  }

  /**
   * Send a notification about available updates
   * @param {UpdateInfo[]} updates - List of available updates
   * @returns {Promise<void>}
   */
  async sendUpdateNotification(updates) {
    throw new Error('sendUpdateNotification() must be implemented');
  }

  /**
   * Check if the provider is enabled and configured
   * @returns {boolean}
   */
  isEnabled() {
    return this.enabled;
  }

  /**
   * Shutdown the provider (cleanup resources)
   * @returns {Promise<void>}
   */
  async shutdown() {
    // Default implementation does nothing
  }
}
