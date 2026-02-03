import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createUpdateChecker } from './update-checker.js';

// Mock the registry client module
vi.mock('./registry-client.js', () => ({
  createRegistryClient: vi.fn(),
}));

import { createRegistryClient } from './registry-client.js';

function createMockDocker() {
  return {
    listContainers: vi.fn(),
    getImage: vi.fn(),
  };
}

describe('Update Checker', () => {
  let mockDocker;
  let config;

  beforeEach(() => {
    mockDocker = createMockDocker();
    config = {
      updateChecker: {
        enabled: true,
        containers: '*',
        excludeContainers: [],
      },
      registryAuth: {
        ghcrToken: '',
      },
    };
    vi.clearAllMocks();
  });

  describe('checkForUpdates', () => {
    it('should detect when update is available', async () => {
      const checker = createUpdateChecker(mockDocker, config);

      mockDocker.listContainers.mockResolvedValue([
        {
          Id: 'container123',
          Names: ['/my-app'],
          Image: 'nginx:latest',
          ImageID: 'sha256:localimage',
        },
      ]);

      mockDocker.getImage.mockReturnValue({
        inspect: vi.fn().mockResolvedValue({
          RepoDigests: ['nginx@sha256:localdigest123'],
          Id: 'sha256:localimage',
        }),
      });

      createRegistryClient.mockReturnValue({
        getRemoteDigest: vi.fn().mockResolvedValue('sha256:remotedigest456'),
      });

      const updates = await checker.checkForUpdates();

      expect(updates).toHaveLength(1);
      expect(updates[0]).toMatchObject({
        containerId: 'container123',
        containerName: 'my-app',
        image: 'nginx:latest',
        localDigest: 'sha256:localdigest123',
        remoteDigest: 'sha256:remotedigest456',
        hasUpdate: true,
      });
    });

    it('should not report update when digests match', async () => {
      const checker = createUpdateChecker(mockDocker, config);

      mockDocker.listContainers.mockResolvedValue([
        {
          Id: 'container123',
          Names: ['/my-app'],
          Image: 'nginx:latest',
          ImageID: 'sha256:localimage',
        },
      ]);

      mockDocker.getImage.mockReturnValue({
        inspect: vi.fn().mockResolvedValue({
          RepoDigests: ['nginx@sha256:samedigest'],
          Id: 'sha256:localimage',
        }),
      });

      createRegistryClient.mockReturnValue({
        getRemoteDigest: vi.fn().mockResolvedValue('sha256:samedigest'),
      });

      const updates = await checker.checkForUpdates();

      expect(updates).toHaveLength(0);
    });

    it('should skip containers based on exclusion list', async () => {
      config.updateChecker.excludeContainers = ['excluded-app'];
      const checker = createUpdateChecker(mockDocker, config);

      mockDocker.listContainers.mockResolvedValue([
        {
          Id: 'container1',
          Names: ['/excluded-app'],
          Image: 'nginx:latest',
          ImageID: 'sha256:img1',
        },
        {
          Id: 'container2',
          Names: ['/included-app'],
          Image: 'nginx:latest',
          ImageID: 'sha256:img2',
        },
      ]);

      mockDocker.getImage.mockReturnValue({
        inspect: vi.fn().mockResolvedValue({
          RepoDigests: ['nginx@sha256:local'],
          Id: 'sha256:local',
        }),
      });

      createRegistryClient.mockReturnValue({
        getRemoteDigest: vi.fn().mockResolvedValue('sha256:remote'),
      });

      const updates = await checker.checkForUpdates();

      // Should only check included-app
      expect(updates).toHaveLength(1);
      expect(updates[0].containerName).toBe('included-app');
    });

    it('should only check specified containers', async () => {
      config.updateChecker.containers = ['specific-app'];
      const checker = createUpdateChecker(mockDocker, config);

      mockDocker.listContainers.mockResolvedValue([
        {
          Id: 'container1',
          Names: ['/specific-app'],
          Image: 'nginx:latest',
          ImageID: 'sha256:img1',
        },
        {
          Id: 'container2',
          Names: ['/other-app'],
          Image: 'nginx:latest',
          ImageID: 'sha256:img2',
        },
      ]);

      mockDocker.getImage.mockReturnValue({
        inspect: vi.fn().mockResolvedValue({
          RepoDigests: ['nginx@sha256:local'],
          Id: 'sha256:local',
        }),
      });

      createRegistryClient.mockReturnValue({
        getRemoteDigest: vi.fn().mockResolvedValue('sha256:remote'),
      });

      const updates = await checker.checkForUpdates();

      expect(updates).toHaveLength(1);
      expect(updates[0].containerName).toBe('specific-app');
    });

    it('should skip images referenced by digest', async () => {
      const checker = createUpdateChecker(mockDocker, config);

      mockDocker.listContainers.mockResolvedValue([
        {
          Id: 'container1',
          Names: ['/digest-app'],
          Image: 'sha256:abc123def456',
          ImageID: 'sha256:abc123def456',
        },
      ]);

      const updates = await checker.checkForUpdates();

      expect(updates).toHaveLength(0);
      expect(mockDocker.getImage).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      const checker = createUpdateChecker(mockDocker, config);

      mockDocker.listContainers.mockResolvedValue([
        {
          Id: 'container1',
          Names: ['/failing-app'],
          Image: 'nginx:latest',
          ImageID: 'sha256:img1',
        },
        {
          Id: 'container2',
          Names: ['/working-app'],
          Image: 'nginx:latest',
          ImageID: 'sha256:img2',
        },
      ]);

      // First container fails, second succeeds
      mockDocker.getImage
        .mockReturnValueOnce({
          inspect: vi.fn().mockRejectedValue(new Error('Image not found')),
        })
        .mockReturnValueOnce({
          inspect: vi.fn().mockResolvedValue({
            RepoDigests: ['nginx@sha256:local'],
            Id: 'sha256:local',
          }),
        });

      createRegistryClient.mockReturnValue({
        getRemoteDigest: vi.fn().mockResolvedValue('sha256:remote'),
      });

      const updates = await checker.checkForUpdates();

      // Should still return the working container's update
      expect(updates).toHaveLength(1);
      expect(updates[0].containerName).toBe('working-app');
    });
  });

  describe('checkForNewUpdates', () => {
    it('should deduplicate notifications', async () => {
      const checker = createUpdateChecker(mockDocker, config);

      mockDocker.listContainers.mockResolvedValue([
        {
          Id: 'container123',
          Names: ['/my-app'],
          Image: 'nginx:latest',
          ImageID: 'sha256:localimage',
        },
      ]);

      mockDocker.getImage.mockReturnValue({
        inspect: vi.fn().mockResolvedValue({
          RepoDigests: ['nginx@sha256:local'],
          Id: 'sha256:local',
        }),
      });

      createRegistryClient.mockReturnValue({
        getRemoteDigest: vi.fn().mockResolvedValue('sha256:remote'),
      });

      // First check should return the update
      const firstCheck = await checker.checkForNewUpdates();
      expect(firstCheck).toHaveLength(1);

      // Second check should return empty (already notified)
      const secondCheck = await checker.checkForNewUpdates();
      expect(secondCheck).toHaveLength(0);
    });

    it('should notify again when new update is available', async () => {
      const checker = createUpdateChecker(mockDocker, config);

      mockDocker.listContainers.mockResolvedValue([
        {
          Id: 'container123',
          Names: ['/my-app'],
          Image: 'nginx:latest',
          ImageID: 'sha256:localimage',
        },
      ]);

      mockDocker.getImage.mockReturnValue({
        inspect: vi.fn().mockResolvedValue({
          RepoDigests: ['nginx@sha256:local'],
          Id: 'sha256:local',
        }),
      });

      const mockGetRemoteDigest = vi.fn();
      createRegistryClient.mockReturnValue({
        getRemoteDigest: mockGetRemoteDigest,
      });

      // First update
      mockGetRemoteDigest.mockResolvedValueOnce('sha256:remote1');
      const firstCheck = await checker.checkForNewUpdates();
      expect(firstCheck).toHaveLength(1);
      expect(firstCheck[0].remoteDigest).toBe('sha256:remote1');

      // New update available
      mockGetRemoteDigest.mockResolvedValueOnce('sha256:remote2');
      const secondCheck = await checker.checkForNewUpdates();
      expect(secondCheck).toHaveLength(1);
      expect(secondCheck[0].remoteDigest).toBe('sha256:remote2');
    });

    it('should clear notification history', async () => {
      const checker = createUpdateChecker(mockDocker, config);

      mockDocker.listContainers.mockResolvedValue([
        {
          Id: 'container123',
          Names: ['/my-app'],
          Image: 'nginx:latest',
          ImageID: 'sha256:localimage',
        },
      ]);

      mockDocker.getImage.mockReturnValue({
        inspect: vi.fn().mockResolvedValue({
          RepoDigests: ['nginx@sha256:local'],
          Id: 'sha256:local',
        }),
      });

      createRegistryClient.mockReturnValue({
        getRemoteDigest: vi.fn().mockResolvedValue('sha256:remote'),
      });

      await checker.checkForNewUpdates();
      expect(checker.getNotificationHistory().size).toBe(1);

      checker.clearNotificationHistory();
      expect(checker.getNotificationHistory().size).toBe(0);

      // Should notify again after clearing
      const afterClear = await checker.checkForNewUpdates();
      expect(afterClear).toHaveLength(1);
    });
  });
});
