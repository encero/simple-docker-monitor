/**
 * Docker Registry v2 API client
 * Supports Docker Hub, GHCR, and generic v2 registries
 */

/**
 * Create a registry client for the given parsed image reference
 * @param {Object} imageRef - Parsed image reference from image-parser
 * @param {Object} options - Options including auth tokens
 * @returns {Object} Registry client
 */
export function createRegistryClient(imageRef, options = {}) {
  const { ghcrToken } = options;

  return {
    /**
     * Get the manifest digest for the image tag
     * @returns {Promise<string>} Digest string (sha256:...)
     */
    async getRemoteDigest() {
      if (imageRef.isDockerHub()) {
        return await getDockerHubDigest(imageRef);
      } else if (imageRef.isGHCR()) {
        return await getGHCRDigest(imageRef, ghcrToken);
      } else {
        return await getGenericRegistryDigest(imageRef);
      }
    },
  };
}

/**
 * Get Docker Hub auth token for pulling manifests
 */
async function getDockerHubToken(repository) {
  const tokenUrl = `https://auth.docker.io/token?service=registry.docker.io&scope=repository:${repository}:pull`;
  const response = await fetch(tokenUrl);

  if (!response.ok) {
    throw new Error(`Failed to get Docker Hub token: ${response.status}`);
  }

  const data = await response.json();
  return data.token;
}

/**
 * Get manifest digest from Docker Hub
 */
async function getDockerHubDigest(imageRef) {
  const token = await getDockerHubToken(imageRef.repository);
  const manifestUrl = `https://registry-1.docker.io/v2/${imageRef.repository}/manifests/${imageRef.tag}`;

  const response = await fetch(manifestUrl, {
    headers: {
      'Authorization': `Bearer ${token}`,
      // Request manifest list or OCI index to get the correct digest
      'Accept': [
        'application/vnd.docker.distribution.manifest.list.v2+json',
        'application/vnd.oci.image.index.v1+json',
        'application/vnd.docker.distribution.manifest.v2+json',
        'application/vnd.oci.image.manifest.v1+json',
      ].join(', '),
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to get Docker Hub manifest: ${response.status}`);
  }

  // The digest is returned in the Docker-Content-Digest header
  const digest = response.headers.get('docker-content-digest');
  if (!digest) {
    throw new Error('No digest returned from Docker Hub');
  }

  return digest;
}

/**
 * Get manifest digest from GitHub Container Registry
 */
async function getGHCRDigest(imageRef, token) {
  const manifestUrl = `https://ghcr.io/v2/${imageRef.repository}/manifests/${imageRef.tag}`;

  const headers = {
    'Accept': [
      'application/vnd.docker.distribution.manifest.list.v2+json',
      'application/vnd.oci.image.index.v1+json',
      'application/vnd.docker.distribution.manifest.v2+json',
      'application/vnd.oci.image.manifest.v1+json',
    ].join(', '),
  };

  // GHCR requires authentication even for public images in some cases
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(manifestUrl, { headers });

  if (response.status === 401 && !token) {
    throw new Error('GHCR requires authentication. Set GHCR_TOKEN environment variable.');
  }

  if (!response.ok) {
    throw new Error(`Failed to get GHCR manifest: ${response.status}`);
  }

  const digest = response.headers.get('docker-content-digest');
  if (!digest) {
    throw new Error('No digest returned from GHCR');
  }

  return digest;
}

/**
 * Get manifest digest from a generic v2 registry
 */
async function getGenericRegistryDigest(imageRef) {
  const registryUrl = imageRef.getRegistryUrl();
  const manifestUrl = `${registryUrl}/v2/${imageRef.repository}/manifests/${imageRef.tag}`;

  const response = await fetch(manifestUrl, {
    headers: {
      'Accept': [
        'application/vnd.docker.distribution.manifest.list.v2+json',
        'application/vnd.oci.image.index.v1+json',
        'application/vnd.docker.distribution.manifest.v2+json',
        'application/vnd.oci.image.manifest.v1+json',
      ].join(', '),
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to get manifest from ${registryUrl}: ${response.status}`);
  }

  const digest = response.headers.get('docker-content-digest');
  if (!digest) {
    throw new Error(`No digest returned from ${registryUrl}`);
  }

  return digest;
}
