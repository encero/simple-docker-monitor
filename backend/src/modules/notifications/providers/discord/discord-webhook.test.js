import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DiscordWebhookProvider } from './discord-webhook.js';

describe('Discord Webhook Provider', () => {
  let provider;
  let originalFetch;

  beforeEach(() => {
    provider = new DiscordWebhookProvider();
    originalFetch = global.fetch;
    global.fetch = vi.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe('init', () => {
    it('should enable provider when webhook URL is configured', async () => {
      await provider.init({
        discord: {
          webhookUrl: 'https://discord.com/api/webhooks/123/abc',
        },
      });

      expect(provider.isEnabled()).toBe(true);
    });

    it('should disable provider when webhook URL is missing', async () => {
      await provider.init({
        discord: {},
      });

      expect(provider.isEnabled()).toBe(false);
    });

    it('should handle missing discord config', async () => {
      await provider.init({});

      expect(provider.isEnabled()).toBe(false);
    });
  });

  describe('sendUpdateNotification', () => {
    const updates = [
      {
        containerId: 'abc123',
        containerName: 'my-app',
        image: 'nginx:latest',
        localDigest: 'sha256:olddigest123456789',
        remoteDigest: 'sha256:newdigest987654321',
      },
    ];

    beforeEach(async () => {
      await provider.init({
        discord: {
          webhookUrl: 'https://discord.com/api/webhooks/123/abc',
        },
      });
    });

    it('should send notification with embed', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
      });

      await provider.sendUpdateNotification(updates);

      expect(global.fetch).toHaveBeenCalledWith(
        'https://discord.com/api/webhooks/123/abc',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        })
      );

      // Check the body
      const call = global.fetch.mock.calls[0];
      const body = JSON.parse(call[1].body);

      expect(body.embeds).toHaveLength(1);
      expect(body.embeds[0].title).toContain('Updates Available');
      expect(body.embeds[0].fields).toHaveLength(1);
      expect(body.embeds[0].fields[0].name).toContain('my-app');
    });

    it('should not send when disabled', async () => {
      provider.enabled = false;

      await provider.sendUpdateNotification(updates);

      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should not send for empty updates', async () => {
      await provider.sendUpdateNotification([]);

      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should handle webhook errors', async () => {
      global.fetch.mockResolvedValue({
        ok: false,
        status: 400,
        text: () => Promise.resolve('Bad request'),
      });

      await expect(provider.sendUpdateNotification(updates))
        .rejects.toThrow('Discord webhook failed: 400');
    });

    it('should batch multiple updates into single message', async () => {
      global.fetch.mockResolvedValue({ ok: true });

      const multipleUpdates = [
        { ...updates[0], containerName: 'app-1' },
        { ...updates[0], containerName: 'app-2' },
        { ...updates[0], containerName: 'app-3' },
      ];

      await provider.sendUpdateNotification(multipleUpdates);

      expect(global.fetch).toHaveBeenCalledTimes(1);

      const call = global.fetch.mock.calls[0];
      const body = JSON.parse(call[1].body);

      expect(body.embeds[0].fields).toHaveLength(3);
      expect(body.embeds[0].description).toContain('3 containers have');
    });
  });

  describe('shortenDigest', () => {
    it('should shorten sha256 digests', () => {
      const digest = 'sha256:abc123def456ghi789jkl012mno345pqr678stu901vwx234yz';
      const shortened = provider.shortenDigest(digest);

      expect(shortened).toBe('sha256:abc123def456...');
    });

    it('should handle unknown digests', () => {
      expect(provider.shortenDigest(null)).toBe('unknown');
      expect(provider.shortenDigest(undefined)).toBe('unknown');
    });

    it('should handle non-sha256 digests', () => {
      const digest = 'abc123def456ghi789';
      const shortened = provider.shortenDigest(digest);

      expect(shortened).toBe('abc123def456...');
    });
  });
});
