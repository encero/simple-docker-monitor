import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRegistryClient } from './registry-client.js';
import { parseImageReference } from './image-parser.js';

describe('Registry Client', () => {
  let originalFetch;

  beforeEach(() => {
    originalFetch = global.fetch;
    global.fetch = vi.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe('Docker Hub', () => {
    it('should get digest from Docker Hub', async () => {
      const imageRef = parseImageReference('nginx:latest');
      const client = createRegistryClient(imageRef);

      // Mock token request
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ token: 'test-token' }),
      });

      // Mock manifest request
      global.fetch.mockResolvedValueOnce({
        ok: true,
        headers: new Map([['docker-content-digest', 'sha256:abc123']]),
      });

      const digest = await client.getRemoteDigest();

      expect(digest).toBe('sha256:abc123');
      expect(global.fetch).toHaveBeenCalledTimes(2);

      // Check token request
      expect(global.fetch).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining('auth.docker.io/token')
      );

      // Check manifest request
      expect(global.fetch).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('registry-1.docker.io/v2/library/nginx/manifests/latest'),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-token',
          }),
        })
      );
    });

    it('should handle Docker Hub token failure', async () => {
      const imageRef = parseImageReference('nginx:latest');
      const client = createRegistryClient(imageRef);

      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
      });

      await expect(client.getRemoteDigest()).rejects.toThrow('Failed to get Docker Hub token: 403');
    });

    it('should handle Docker Hub manifest failure', async () => {
      const imageRef = parseImageReference('nginx:latest');
      const client = createRegistryClient(imageRef);

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ token: 'test-token' }),
      });

      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      await expect(client.getRemoteDigest()).rejects.toThrow('Failed to get Docker Hub manifest: 404');
    });
  });

  describe('GHCR', () => {
    it('should get digest from GHCR with token', async () => {
      const imageRef = parseImageReference('ghcr.io/user/repo:v1.0');
      const client = createRegistryClient(imageRef, { ghcrToken: 'ghp_token123' });

      global.fetch.mockResolvedValueOnce({
        ok: true,
        headers: new Map([['docker-content-digest', 'sha256:ghcr123']]),
      });

      const digest = await client.getRemoteDigest();

      expect(digest).toBe('sha256:ghcr123');
      expect(global.fetch).toHaveBeenCalledWith(
        'https://ghcr.io/v2/user/repo/manifests/v1.0',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer ghp_token123',
          }),
        })
      );
    });

    it('should handle GHCR auth requirement', async () => {
      const imageRef = parseImageReference('ghcr.io/user/private-repo:latest');
      const client = createRegistryClient(imageRef);

      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
      });

      await expect(client.getRemoteDigest()).rejects.toThrow('GHCR requires authentication');
    });
  });

  describe('Generic Registry', () => {
    it('should get digest from generic registry', async () => {
      const imageRef = parseImageReference('my-registry.com/my-image:v1');
      const client = createRegistryClient(imageRef);

      global.fetch.mockResolvedValueOnce({
        ok: true,
        headers: new Map([['docker-content-digest', 'sha256:custom123']]),
      });

      const digest = await client.getRemoteDigest();

      expect(digest).toBe('sha256:custom123');
      expect(global.fetch).toHaveBeenCalledWith(
        'https://my-registry.com/v2/my-image/manifests/v1',
        expect.any(Object)
      );
    });

    it('should handle missing digest header', async () => {
      const imageRef = parseImageReference('my-registry.com/my-image:v1');
      const client = createRegistryClient(imageRef);

      global.fetch.mockResolvedValueOnce({
        ok: true,
        headers: new Map(),
      });

      await expect(client.getRemoteDigest()).rejects.toThrow('No digest returned');
    });
  });
});
