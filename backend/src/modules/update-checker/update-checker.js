/**
 * Update Checker
 * Compares local image digests with remote registry digests
 */

import { parseImageReference, getImageRefFromContainer, getLocalDigest } from './image-parser.js';
import { createRegistryClient } from './registry-client.js';

/**
 * Create an update checker instance
 * @param {Object} docker - Dockerode instance
 * @param {Object} config - Configuration
 * @returns {Object} Update checker
 */
export function createUpdateChecker(docker, config) {
  // Track last notified digest per container to avoid duplicate notifications
  const lastNotifiedDigests = new Map();

  return {
    /**
     * Check all containers for updates
     * @returns {Promise<Array>} List of containers with available updates
     */
    async checkForUpdates() {
      const containers = await docker.listContainers({ all: true });
      const updates = [];

      for (const container of containers) {
        const containerName = container.Names[0]?.replace(/^\//, '') || 'unknown';

        // Check if container is included/excluded
        if (!shouldCheckContainer(containerName, config)) {
          continue;
        }

        try {
          const updateInfo = await this.checkContainerForUpdate(container);
          if (updateInfo && updateInfo.hasUpdate) {
            updates.push(updateInfo);
          }
        } catch (error) {
          console.error(`Error checking updates for container ${containerName}:`, error.message);
        }
      }

      return updates;
    },

    /**
     * Check a single container for updates
     * @param {Object} container - Container from listContainers
     * @returns {Promise<Object|null>} Update info or null
     */
    async checkContainerForUpdate(container) {
      const containerId = container.Id;
      const containerName = container.Names[0]?.replace(/^\//, '') || 'unknown';
      const imageRef = container.Image;

      // Skip images that are digests (no tag to check)
      if (imageRef.startsWith('sha256:')) {
        return null;
      }

      try {
        // Parse the image reference
        const parsed = parseImageReference(imageRef);

        // Skip if image has a digest instead of tag
        if (parsed.digest) {
          return null;
        }

        // Get local image digest
        const imageInspect = await docker.getImage(container.ImageID).inspect();
        const localDigest = getLocalDigest(imageInspect);

        // Get remote digest
        const registryClient = createRegistryClient(parsed, {
          ghcrToken: config.registryAuth?.ghcrToken,
        });
        const remoteDigest = await registryClient.getRemoteDigest();

        // Compare digests
        const hasUpdate = localDigest !== remoteDigest;

        return {
          containerId,
          containerName,
          image: imageRef,
          localDigest,
          remoteDigest,
          hasUpdate,
        };
      } catch (error) {
        // Re-throw with more context
        throw new Error(`Failed to check ${containerName} (${imageRef}): ${error.message}`);
      }
    },

    /**
     * Check for updates and return only new updates (not previously notified)
     * @returns {Promise<Array>} List of new updates to notify about
     */
    async checkForNewUpdates() {
      const allUpdates = await this.checkForUpdates();
      const newUpdates = [];

      for (const update of allUpdates) {
        const lastDigest = lastNotifiedDigests.get(update.containerId);

        // Only notify if this is a new update
        if (lastDigest !== update.remoteDigest) {
          newUpdates.push(update);
          lastNotifiedDigests.set(update.containerId, update.remoteDigest);
        }
      }

      return newUpdates;
    },

    /**
     * Clear notification history (for testing)
     */
    clearNotificationHistory() {
      lastNotifiedDigests.clear();
    },

    /**
     * Get notification history (for testing)
     */
    getNotificationHistory() {
      return new Map(lastNotifiedDigests);
    },
  };
}

/**
 * Check if a container should be checked based on config
 * @param {string} containerName - Container name
 * @param {Object} config - Configuration
 * @returns {boolean}
 */
function shouldCheckContainer(containerName, config) {
  const { containers, excludeContainers } = config.updateChecker || {};

  // Check exclusion list first
  if (Array.isArray(excludeContainers) && excludeContainers.includes(containerName)) {
    return false;
  }

  // If containers is '*' or not set, check all
  if (containers === '*' || !containers) {
    return true;
  }

  // Otherwise, check if container is in the list
  if (Array.isArray(containers)) {
    return containers.includes(containerName);
  }

  return true;
}
