/**
 * Scheduler module
 * Provides interval-based job scheduling
 */

import { createScheduler } from './scheduler.js';

let scheduler = null;

export default {
  name: 'scheduler',

  init(context) {
    scheduler = createScheduler();

    // Register for graceful shutdown
    process.on('SIGTERM', async () => {
      if (scheduler) {
        await scheduler.shutdown();
      }
    });

    process.on('SIGINT', async () => {
      if (scheduler) {
        await scheduler.shutdown();
      }
    });
  },

  shutdown() {
    if (scheduler) {
      return scheduler.shutdown();
    }
  },

  getScheduler() {
    return scheduler;
  },
};

// Re-export for direct usage
export { createScheduler } from './scheduler.js';
