/**
 * Discord Bot for slash commands
 * Provides interactive commands like /check-updates
 */

import { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } from 'discord.js';

/**
 * Create a Discord bot instance
 * @param {Object} config - Configuration
 * @param {Object} dependencies - Dependencies (update checker, etc.)
 * @returns {Object} Bot controller
 */
export function createDiscordBot(config, dependencies) {
  const { botToken, guildId } = config.discord || {};
  const { updateChecker, notificationManager } = dependencies;

  let client = null;
  let isReady = false;

  return {
    /**
     * Start the bot
     */
    async start() {
      if (!botToken) {
        console.log('Discord bot token not configured, bot disabled');
        return false;
      }

      client = new Client({
        intents: [GatewayIntentBits.Guilds],
      });

      // Register commands
      await this.registerCommands();

      // Set up event handlers
      client.once('ready', () => {
        console.log(`Discord bot logged in as ${client.user.tag}`);
        isReady = true;
      });

      client.on('interactionCreate', async (interaction) => {
        if (!interaction.isChatInputCommand()) return;

        if (interaction.commandName === 'check-updates') {
          await this.handleCheckUpdates(interaction);
        }
      });

      // Login
      await client.login(botToken);
      return true;
    },

    /**
     * Register slash commands
     */
    async registerCommands() {
      const commands = [
        new SlashCommandBuilder()
          .setName('check-updates')
          .setDescription('Check for Docker image updates now'),
      ].map(cmd => cmd.toJSON());

      const rest = new REST({ version: '10' }).setToken(botToken);

      try {
        if (guildId) {
          // Register for specific guild (faster for development)
          await rest.put(
            Routes.applicationGuildCommands(client?.user?.id || 'placeholder', guildId),
            { body: commands }
          );
          console.log('Registered guild commands');
        } else {
          // Note: We need the client to be ready to get the application ID
          // For global commands, this will be called after login
          console.log('Discord bot will register global commands after login');
        }
      } catch (error) {
        console.error('Failed to register Discord commands:', error);
      }
    },

    /**
     * Handle /check-updates command
     */
    async handleCheckUpdates(interaction) {
      await interaction.deferReply();

      try {
        if (!updateChecker) {
          await interaction.editReply('Update checker is not available.');
          return;
        }

        const updates = await updateChecker.checkForUpdates();

        if (updates.length === 0) {
          await interaction.editReply('✅ All containers are up to date!');
          return;
        }

        // Format the response
        const lines = updates.map(u =>
          `• **${u.containerName}** (\`${u.image}\`): Update available`
        );

        const message = [
          `🔄 **${updates.length} update${updates.length > 1 ? 's' : ''} available:**`,
          '',
          ...lines,
        ].join('\n');

        await interaction.editReply(message);

        // Also send via notification manager if available
        if (notificationManager && updates.length > 0) {
          // Mark these as notified since user explicitly checked
          const newUpdates = await updateChecker.checkForNewUpdates();
          // Don't re-notify since user just saw them
        }
      } catch (error) {
        console.error('Error handling /check-updates:', error);
        await interaction.editReply(`❌ Error checking updates: ${error.message}`);
      }
    },

    /**
     * Check if bot is ready
     */
    isReady() {
      return isReady;
    },

    /**
     * Stop the bot
     */
    async stop() {
      if (client) {
        await client.destroy();
        client = null;
        isReady = false;
        console.log('Discord bot stopped');
      }
    },
  };
}
