import { describe, it, expect } from 'vitest';
import { parseImageReference, getImageRefFromContainer, getLocalDigest } from './image-parser.js';

describe('Image Parser', () => {
  describe('parseImageReference', () => {
    it('should parse simple image name', () => {
      const result = parseImageReference('nginx');
      expect(result.registry).toBe('registry-1.docker.io');
      expect(result.repository).toBe('library/nginx');
      expect(result.tag).toBe('latest');
      expect(result.digest).toBeNull();
      expect(result.isDockerHub()).toBe(true);
    });

    it('should parse image with tag', () => {
      const result = parseImageReference('nginx:1.25');
      expect(result.registry).toBe('registry-1.docker.io');
      expect(result.repository).toBe('library/nginx');
      expect(result.tag).toBe('1.25');
    });

    it('should parse image with user/repo', () => {
      const result = parseImageReference('myuser/myapp:v1.0');
      expect(result.registry).toBe('registry-1.docker.io');
      expect(result.repository).toBe('myuser/myapp');
      expect(result.tag).toBe('v1.0');
    });

    it('should parse docker.io registry', () => {
      const result = parseImageReference('docker.io/library/nginx:latest');
      expect(result.registry).toBe('registry-1.docker.io');
      expect(result.repository).toBe('library/nginx');
      expect(result.tag).toBe('latest');
    });

    it('should parse GHCR images', () => {
      const result = parseImageReference('ghcr.io/username/repo:tag');
      expect(result.registry).toBe('ghcr.io');
      expect(result.repository).toBe('username/repo');
      expect(result.tag).toBe('tag');
      expect(result.isGHCR()).toBe(true);
      expect(result.isDockerHub()).toBe(false);
    });

    it('should parse custom registry with port', () => {
      const result = parseImageReference('registry.example.com:5000/my-image:v1');
      expect(result.registry).toBe('registry.example.com:5000');
      expect(result.repository).toBe('my-image');
      expect(result.tag).toBe('v1');
    });

    it('should parse image with digest', () => {
      const result = parseImageReference('nginx@sha256:abc123');
      expect(result.registry).toBe('registry-1.docker.io');
      expect(result.repository).toBe('library/nginx');
      expect(result.digest).toBe('sha256:abc123');
      expect(result.tag).toBe('latest'); // Tag is ignored when digest is present
    });

    it('should parse localhost registry', () => {
      const result = parseImageReference('localhost/myapp:dev');
      expect(result.registry).toBe('localhost');
      expect(result.repository).toBe('myapp');
      expect(result.tag).toBe('dev');
    });

    it('should handle nested repository paths', () => {
      const result = parseImageReference('ghcr.io/org/project/app:latest');
      expect(result.registry).toBe('ghcr.io');
      expect(result.repository).toBe('org/project/app');
      expect(result.tag).toBe('latest');
    });

    it('should throw on invalid input', () => {
      expect(() => parseImageReference('')).toThrow('Invalid image reference');
      expect(() => parseImageReference(null)).toThrow('Invalid image reference');
      expect(() => parseImageReference(undefined)).toThrow('Invalid image reference');
    });

    it('should generate correct registry URLs', () => {
      const dockerHub = parseImageReference('nginx');
      expect(dockerHub.getRegistryUrl()).toBe('https://registry-1.docker.io');

      const ghcr = parseImageReference('ghcr.io/user/repo');
      expect(ghcr.getRegistryUrl()).toBe('https://ghcr.io');

      const custom = parseImageReference('my-registry.com/image');
      expect(custom.getRegistryUrl()).toBe('https://my-registry.com');
    });

    it('should convert back to string', () => {
      const withTag = parseImageReference('ghcr.io/user/repo:v1.0');
      expect(withTag.toString()).toBe('ghcr.io/user/repo:v1.0');

      const withDigest = parseImageReference('nginx@sha256:abc123');
      expect(withDigest.toString()).toBe('registry-1.docker.io/library/nginx@sha256:abc123');
    });
  });

  describe('getImageRefFromContainer', () => {
    it('should extract image from Config.Image', () => {
      const inspectData = {
        Config: { Image: 'nginx:latest' },
        Image: 'sha256:abc123',
      };
      expect(getImageRefFromContainer(inspectData)).toBe('nginx:latest');
    });

    it('should fallback to Image field', () => {
      const inspectData = {
        Image: 'sha256:abc123',
      };
      expect(getImageRefFromContainer(inspectData)).toBe('sha256:abc123');
    });
  });

  describe('getLocalDigest', () => {
    it('should extract digest from RepoDigests', () => {
      const imageInspect = {
        RepoDigests: ['nginx@sha256:abc123def456'],
        Id: 'sha256:localid',
      };
      expect(getLocalDigest(imageInspect)).toBe('sha256:abc123def456');
    });

    it('should fallback to image Id', () => {
      const imageInspect = {
        RepoDigests: [],
        Id: 'sha256:localid',
      };
      expect(getLocalDigest(imageInspect)).toBe('sha256:localid');
    });

    it('should handle missing RepoDigests', () => {
      const imageInspect = {
        Id: 'sha256:localid',
      };
      expect(getLocalDigest(imageInspect)).toBe('sha256:localid');
    });
  });
});
