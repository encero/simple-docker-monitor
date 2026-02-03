/**
 * Docker image reference parser
 * Parses image references like:
 * - nginx
 * - nginx:latest
 * - library/nginx:1.25
 * - docker.io/library/nginx:latest
 * - ghcr.io/user/repo:tag
 * - registry.example.com:5000/my-image:v1.0
 */

// Default registry and tag
const DEFAULT_REGISTRY = 'registry-1.docker.io';
const DEFAULT_TAG = 'latest';

/**
 * Parse a Docker image reference into its components
 * @param {string} imageRef - Docker image reference
 * @returns {Object} Parsed image reference
 */
export function parseImageReference(imageRef) {
  if (!imageRef || typeof imageRef !== 'string') {
    throw new Error('Invalid image reference');
  }

  let remaining = imageRef.trim();
  let registry = DEFAULT_REGISTRY;
  let repository;
  let tag = DEFAULT_TAG;
  let digest = null;

  // Check for digest (@sha256:...)
  const digestIndex = remaining.indexOf('@');
  if (digestIndex !== -1) {
    digest = remaining.substring(digestIndex + 1);
    remaining = remaining.substring(0, digestIndex);
  }

  // Check for tag (:tag) - only if no digest
  if (!digest) {
    const tagIndex = remaining.lastIndexOf(':');
    // Make sure we're not matching a port number (registry:port/image)
    if (tagIndex !== -1) {
      const afterColon = remaining.substring(tagIndex + 1);
      // If there's a slash after the colon, it's a port number
      if (!afterColon.includes('/')) {
        tag = afterColon;
        remaining = remaining.substring(0, tagIndex);
      }
    }
  }

  // Check for registry (contains . or : before first /)
  const slashIndex = remaining.indexOf('/');
  if (slashIndex !== -1) {
    const potentialRegistry = remaining.substring(0, slashIndex);
    // It's a registry if it contains a dot, colon, or is "localhost"
    if (potentialRegistry.includes('.') || potentialRegistry.includes(':') || potentialRegistry === 'localhost') {
      registry = potentialRegistry;
      remaining = remaining.substring(slashIndex + 1);
    }
  }

  // Handle Docker Hub special cases
  if (registry === DEFAULT_REGISTRY || registry === 'docker.io') {
    registry = DEFAULT_REGISTRY;
    // Add 'library/' prefix for official images (no slash in name)
    if (!remaining.includes('/')) {
      remaining = 'library/' + remaining;
    }
  }

  repository = remaining;

  return {
    registry,
    repository,
    tag,
    digest,
    // Helper to reconstruct the full reference
    toString() {
      let ref = `${registry}/${repository}`;
      if (digest) {
        ref += `@${digest}`;
      } else {
        ref += `:${tag}`;
      }
      return ref;
    },
    // Get the registry API URL
    getRegistryUrl() {
      if (registry === DEFAULT_REGISTRY) {
        return 'https://registry-1.docker.io';
      }
      // For other registries, assume HTTPS
      if (registry.startsWith('http://') || registry.startsWith('https://')) {
        return registry;
      }
      return `https://${registry}`;
    },
    // Check if this is a Docker Hub image
    isDockerHub() {
      return registry === DEFAULT_REGISTRY;
    },
    // Check if this is a GitHub Container Registry image
    isGHCR() {
      return registry === 'ghcr.io';
    },
  };
}

/**
 * Extract image reference from container inspect data
 * @param {Object} inspectData - Container inspect data from Dockerode
 * @returns {string} Image reference
 */
export function getImageRefFromContainer(inspectData) {
  // Prefer Config.Image as it's the original reference used
  return inspectData.Config?.Image || inspectData.Image;
}

/**
 * Extract local digest from container inspect data
 * @param {Object} imageInspect - Image inspect data from Dockerode
 * @returns {string|null} Local digest or null
 */
export function getLocalDigest(imageInspect) {
  // RepoDigests contains the digest in format: registry/repo@sha256:...
  const repoDigests = imageInspect.RepoDigests;
  if (repoDigests && repoDigests.length > 0) {
    const digestRef = repoDigests[0];
    const atIndex = digestRef.indexOf('@');
    if (atIndex !== -1) {
      return digestRef.substring(atIndex + 1);
    }
  }
  // Fallback to image ID (which is also a digest)
  return imageInspect.Id;
}
