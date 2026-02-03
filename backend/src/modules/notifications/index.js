/**
 * Notifications module
 * Manages notification providers for sending alerts
 */

import { createNotificationManager } from './notification-manager.js';
import { createDiscordWebhookProvider } from './providers/discord/discord-webhook.js';
import { createDiscordBot } from './providers/discord/discord-bot.js';

let notificationManager = null;
let discordBot = null;

export default {
  name: 'notifications',

  async init(context) {
    const { config, getModule } = context;

    // Create notification manager
    notificationManager = createNotificationManager();

    // Register Discord webhook provider
    const discordWebhook = createDiscordWebhookProvider();
    notificationManager.registerProvider(discordWebhook);

    // Initialize all providers
    await notificationManager.initializeProviders(config);

    // Start Discord bot if configured
    if (config.discord?.botToken) {
      const updateCheckerModule = getModule('update-checker');
      const updateChecker = updateCheckerModule?.getChecker?.();

      discordBot = createDiscordBot(config, {
        updateChecker,
        notificationManager,
      });

      try {
        await discordBot.start();
      } catch (error) {
        console.error('Failed to start Discord bot:', error);
      }
    }

    // Set up scheduled update checks if enabled
    if (config.updateChecker?.enabled) {
      const schedulerModule = getModule('scheduler');
      const scheduler = schedulerModule?.getScheduler?.();
      const updateCheckerModule = getModule('update-checker');
      const updateChecker = updateCheckerModule?.getChecker?.();

      if (scheduler && updateChecker) {
        const intervalMs = config.updateChecker.intervalMinutes * 60 * 1000;

        scheduler.schedule(
          'check-updates',
          async () => {
            console.log('Running scheduled update check...');
            const newUpdates = await updateChecker.checkForNewUpdates();
            if (newUpdates.length > 0) {
              console.log(`Found ${newUpdates.length} new update(s), sending notifications...`);
              await notificationManager.notify(newUpdates);
            } else {
              console.log('No new updates found');
            }
          },
          intervalMs,
          { runImmediately: true }
        );

        console.log(`Scheduled update checks every ${config.updateChecker.intervalMinutes} minutes`);
      }
    }

    console.log('Notifications module initialized');
  },

  async shutdown() {
    if (discordBot) {
      await discordBot.stop();
    }
    if (notificationManager) {
      await notificationManager.shutdown();
    }
  },

  getNotificationManager() {
    return notificationManager;
  },

  getDiscordBot() {
    return discordBot;
  },
};

// Re-export for direct usage
export { createNotificationManager } from './notification-manager.js';
export { createDiscordWebhookProvider } from './providers/discord/discord-webhook.js';
export { createDiscordBot } from './providers/discord/discord-bot.js';
export { BaseNotificationProvider } from './providers/base-provider.js';
