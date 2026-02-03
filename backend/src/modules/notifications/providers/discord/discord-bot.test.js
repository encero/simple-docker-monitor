import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createDiscordBot } from './discord-bot.js';

// Mock discord.js
vi.mock('discord.js', () => {
  class MockClient {
    constructor() {
      this.user = { tag: 'TestBot#1234', id: '123456789' };
    }
    once = vi.fn();
    on = vi.fn();
    login = vi.fn().mockResolvedValue(undefined);
    destroy = vi.fn().mockResolvedValue(undefined);
  }

  class MockSlashCommandBuilder {
    setName = vi.fn().mockReturnThis();
    setDescription = vi.fn().mockReturnThis();
    toJSON = vi.fn().mockReturnValue({});
  }

  class MockREST {
    setToken = vi.fn().mockReturnThis();
    put = vi.fn().mockResolvedValue(undefined);
  }

  return {
    Client: MockClient,
    GatewayIntentBits: { Guilds: 1 },
    REST: MockREST,
    Routes: {
      applicationGuildCommands: vi.fn(() => '/mock-route'),
      applicationCommands: vi.fn(() => '/mock-route'),
    },
    SlashCommandBuilder: MockSlashCommandBuilder,
  };
});

describe('Discord Bot', () => {
  let bot;
  let mockUpdateChecker;
  let mockNotificationManager;

  beforeEach(() => {
    vi.clearAllMocks();

    mockUpdateChecker = {
      checkForUpdates: vi.fn(),
      checkForNewUpdates: vi.fn(),
    };

    mockNotificationManager = {
      notify: vi.fn(),
    };
  });

  describe('start', () => {
    it('should start bot when token is configured', async () => {
      bot = createDiscordBot(
        {
          discord: {
            botToken: 'test-token',
            guildId: 'test-guild',
          },
        },
        { updateChecker: mockUpdateChecker, notificationManager: mockNotificationManager }
      );

      const started = await bot.start();

      expect(started).toBe(true);
    });

    it('should not start when token is missing', async () => {
      bot = createDiscordBot(
        {
          discord: {},
        },
        { updateChecker: mockUpdateChecker }
      );

      const started = await bot.start();

      expect(started).toBe(false);
    });
  });

  describe('handleCheckUpdates', () => {
    let mockInteraction;

    beforeEach(async () => {
      mockInteraction = {
        deferReply: vi.fn().mockResolvedValue(undefined),
        editReply: vi.fn().mockResolvedValue(undefined),
      };

      bot = createDiscordBot(
        {
          discord: {
            botToken: 'test-token',
          },
        },
        { updateChecker: mockUpdateChecker, notificationManager: mockNotificationManager }
      );
    });

    it('should respond with no updates message', async () => {
      mockUpdateChecker.checkForUpdates.mockResolvedValue([]);

      await bot.handleCheckUpdates(mockInteraction);

      expect(mockInteraction.deferReply).toHaveBeenCalled();
      expect(mockInteraction.editReply).toHaveBeenCalledWith(
        expect.stringContaining('up to date')
      );
    });

    it('should respond with updates list', async () => {
      mockUpdateChecker.checkForUpdates.mockResolvedValue([
        {
          containerId: 'abc123',
          containerName: 'my-app',
          image: 'nginx:latest',
          hasUpdate: true,
        },
        {
          containerId: 'def456',
          containerName: 'my-db',
          image: 'postgres:15',
          hasUpdate: true,
        },
      ]);

      await bot.handleCheckUpdates(mockInteraction);

      expect(mockInteraction.editReply).toHaveBeenCalledWith(
        expect.stringContaining('2 updates available')
      );
      expect(mockInteraction.editReply).toHaveBeenCalledWith(
        expect.stringContaining('my-app')
      );
      expect(mockInteraction.editReply).toHaveBeenCalledWith(
        expect.stringContaining('my-db')
      );
    });

    it('should handle errors gracefully', async () => {
      mockUpdateChecker.checkForUpdates.mockRejectedValue(new Error('Docker not available'));

      await bot.handleCheckUpdates(mockInteraction);

      expect(mockInteraction.editReply).toHaveBeenCalledWith(
        expect.stringContaining('Error checking updates')
      );
    });

    it('should handle missing update checker', async () => {
      const botWithoutChecker = createDiscordBot(
        { discord: { botToken: 'test' } },
        {}
      );

      await botWithoutChecker.handleCheckUpdates(mockInteraction);

      expect(mockInteraction.editReply).toHaveBeenCalledWith(
        expect.stringContaining('not available')
      );
    });
  });

  describe('stop', () => {
    it('should stop the bot gracefully', async () => {
      bot = createDiscordBot(
        {
          discord: {
            botToken: 'test-token',
          },
        },
        {}
      );

      await bot.start();
      await bot.stop();

      expect(bot.isReady()).toBe(false);
    });
  });
});
