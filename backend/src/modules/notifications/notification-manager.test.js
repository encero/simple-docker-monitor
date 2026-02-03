import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createNotificationManager } from './notification-manager.js';

describe('Notification Manager', () => {
  let manager;
  let mockProvider1;
  let mockProvider2;

  beforeEach(() => {
    manager = createNotificationManager();

    mockProvider1 = {
      name: 'provider1',
      init: vi.fn().mockResolvedValue(undefined),
      sendUpdateNotification: vi.fn().mockResolvedValue(undefined),
      isEnabled: vi.fn().mockReturnValue(true),
      shutdown: vi.fn().mockResolvedValue(undefined),
    };

    mockProvider2 = {
      name: 'provider2',
      init: vi.fn().mockResolvedValue(undefined),
      sendUpdateNotification: vi.fn().mockResolvedValue(undefined),
      isEnabled: vi.fn().mockReturnValue(true),
      shutdown: vi.fn().mockResolvedValue(undefined),
    };
  });

  describe('registerProvider', () => {
    it('should register a provider', () => {
      manager.registerProvider(mockProvider1);

      expect(manager.getProvider('provider1')).toBe(mockProvider1);
    });

    it('should throw when registering duplicate provider', () => {
      manager.registerProvider(mockProvider1);

      expect(() => manager.registerProvider(mockProvider1))
        .toThrow('Provider "provider1" is already registered');
    });
  });

  describe('initializeProviders', () => {
    it('should initialize all providers', async () => {
      manager.registerProvider(mockProvider1);
      manager.registerProvider(mockProvider2);

      const config = { test: 'config' };
      await manager.initializeProviders(config);

      expect(mockProvider1.init).toHaveBeenCalledWith(config);
      expect(mockProvider2.init).toHaveBeenCalledWith(config);
    });

    it('should handle provider init failures gracefully', async () => {
      mockProvider1.init.mockRejectedValue(new Error('Init failed'));
      manager.registerProvider(mockProvider1);
      manager.registerProvider(mockProvider2);

      // Should not throw
      await manager.initializeProviders({});

      // Second provider should still be initialized
      expect(mockProvider2.init).toHaveBeenCalled();
    });
  });

  describe('notify', () => {
    const updates = [
      {
        containerId: 'abc123',
        containerName: 'my-app',
        image: 'nginx:latest',
        localDigest: 'sha256:old',
        remoteDigest: 'sha256:new',
      },
    ];

    beforeEach(async () => {
      manager.registerProvider(mockProvider1);
      manager.registerProvider(mockProvider2);
      await manager.initializeProviders({});
    });

    it('should send to all enabled providers', async () => {
      const results = await manager.notify(updates);

      expect(mockProvider1.sendUpdateNotification).toHaveBeenCalledWith(updates);
      expect(mockProvider2.sendUpdateNotification).toHaveBeenCalledWith(updates);
      expect(results).toHaveLength(2);
      expect(results.every(r => r.success)).toBe(true);
    });

    it('should skip disabled providers', async () => {
      mockProvider2.isEnabled.mockReturnValue(false);

      await manager.notify(updates);

      expect(mockProvider1.sendUpdateNotification).toHaveBeenCalled();
      expect(mockProvider2.sendUpdateNotification).not.toHaveBeenCalled();
    });

    it('should handle provider failures gracefully', async () => {
      mockProvider1.sendUpdateNotification.mockRejectedValue(new Error('Send failed'));

      const results = await manager.notify(updates);

      // Provider2 should still be called
      expect(mockProvider2.sendUpdateNotification).toHaveBeenCalled();

      expect(results).toContainEqual(
        expect.objectContaining({ provider: 'provider1', success: false })
      );
      expect(results).toContainEqual(
        expect.objectContaining({ provider: 'provider2', success: true })
      );
    });

    it('should skip empty updates', async () => {
      await manager.notify([]);

      expect(mockProvider1.sendUpdateNotification).not.toHaveBeenCalled();
    });

    it('should handle null/undefined updates', async () => {
      await manager.notify(null);
      await manager.notify(undefined);

      expect(mockProvider1.sendUpdateNotification).not.toHaveBeenCalled();
    });
  });

  describe('getEnabledProviders', () => {
    it('should return only enabled providers', async () => {
      mockProvider2.isEnabled.mockReturnValue(false);
      manager.registerProvider(mockProvider1);
      manager.registerProvider(mockProvider2);
      await manager.initializeProviders({});

      const enabled = manager.getEnabledProviders();

      expect(enabled).toHaveLength(1);
      expect(enabled[0].name).toBe('provider1');
    });
  });

  describe('shutdown', () => {
    it('should shutdown all providers', async () => {
      manager.registerProvider(mockProvider1);
      manager.registerProvider(mockProvider2);

      await manager.shutdown();

      expect(mockProvider1.shutdown).toHaveBeenCalled();
      expect(mockProvider2.shutdown).toHaveBeenCalled();
    });

    it('should handle shutdown errors gracefully', async () => {
      mockProvider1.shutdown.mockRejectedValue(new Error('Shutdown failed'));
      manager.registerProvider(mockProvider1);
      manager.registerProvider(mockProvider2);

      // Should not throw
      await manager.shutdown();

      // Second provider should still be shut down
      expect(mockProvider2.shutdown).toHaveBeenCalled();
    });
  });
});
