/**
 * Discord Webhook notification provider
 * Sends update notifications via Discord webhooks
 */

import { BaseNotificationProvider } from '../base-provider.js';

// Rate limiting: minimum time between webhook calls
const MIN_INTERVAL_MS = 5000;

// Discord webhook URL pattern
const DISCORD_WEBHOOK_PATTERN = /^https:\/\/discord\.com\/api\/webhooks\/\d+\/[\w-]+$/;

/**
 * Validate Discord webhook URL format
 * @param {string} url - URL to validate
 * @returns {boolean} True if valid
 */
function isValidWebhookUrl(url) {
  if (!url || typeof url !== 'string') {
    return false;
  }
  return DISCORD_WEBHOOK_PATTERN.test(url);
}

export class DiscordWebhookProvider extends BaseNotificationProvider {
  constructor() {
    super('discord-webhook');
    this.webhookUrl = null;
    this.lastSentTime = 0;
  }

  async init(config) {
    if (!config.discord?.webhookUrl) {
      console.log('Discord webhook URL not configured, provider disabled');
      this.enabled = false;
      return;
    }

    if (!isValidWebhookUrl(config.discord.webhookUrl)) {
      console.warn('Invalid Discord webhook URL format, provider disabled. Expected: https://discord.com/api/webhooks/<id>/<token>');
      this.enabled = false;
      return;
    }

    this.webhookUrl = config.discord.webhookUrl;
    this.enabled = true;
    console.log('Discord webhook provider initialized');
  }

  async sendUpdateNotification(updates) {
    if (!this.enabled || !this.webhookUrl) {
      return;
    }

    if (updates.length === 0) {
      return;
    }

    // Rate limiting
    const now = Date.now();
    const timeSinceLastSend = now - this.lastSentTime;
    if (timeSinceLastSend < MIN_INTERVAL_MS) {
      await new Promise(r => setTimeout(r, MIN_INTERVAL_MS - timeSinceLastSend));
    }

    const embed = this.createEmbed(updates);

    try {
      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          embeds: [embed],
        }),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Discord webhook failed: ${response.status} - ${text}`);
      }

      this.lastSentTime = Date.now();
      console.log(`Discord notification sent for ${updates.length} update(s)`);
    } catch (error) {
      console.error('Failed to send Discord webhook:', error);
      throw error;
    }
  }

  createEmbed(updates) {
    const fields = updates.map(update => ({
      name: `📦 ${update.containerName}`,
      value: [
        `**Image:** \`${update.image}\``,
        `**Current:** \`${this.shortenDigest(update.localDigest)}\``,
        `**Available:** \`${this.shortenDigest(update.remoteDigest)}\``,
      ].join('\n'),
      inline: false,
    }));

    return {
      title: '🔄 Docker Image Updates Available',
      description: `${updates.length} container${updates.length > 1 ? 's have' : ' has'} updates available.`,
      color: 0x5865f2, // Discord blurple
      fields: fields.slice(0, 25), // Discord limit
      timestamp: new Date().toISOString(),
      footer: {
        text: 'Docker Monitor',
      },
    };
  }

  shortenDigest(digest) {
    if (!digest) return 'unknown';
    // sha256:abc123... -> sha256:abc123
    if (digest.startsWith('sha256:')) {
      return digest.substring(0, 19) + '...';
    }
    return digest.substring(0, 12) + '...';
  }
}

// Factory function
export function createDiscordWebhookProvider() {
  return new DiscordWebhookProvider();
}
