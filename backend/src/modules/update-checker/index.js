/**
 * Update Checker module
 * Detects when container images have updates available
 */

import { createUpdateChecker } from './update-checker.js';

let updateChecker = null;

export default {
  name: 'update-checker',

  init(context) {
    if (!context.config.updateChecker.enabled) {
      console.log('Update checker is disabled');
      updateChecker = null;
      return;
    }

    updateChecker = createUpdateChecker(context.docker, context.config);
    console.log('Update checker initialized');
  },

  getChecker() {
    return updateChecker;
  },
};

// Re-export for direct usage
export { createUpdateChecker } from './update-checker.js';
export { parseImageReference, getLocalDigest } from './image-parser.js';
export { createRegistryClient } from './registry-client.js';
