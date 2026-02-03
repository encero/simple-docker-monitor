/**
 * Docker client factory
 * Creates a configured Dockerode instance
 */

import Docker from 'dockerode';
import { getConfig } from './config.js';

let dockerInstance = null;

export function createDockerClient(options = {}) {
  const config = getConfig();
  return new Docker({
    socketPath: options.socketPath || config.dockerSocketPath,
    ...options,
  });
}

export function getDockerClient() {
  if (!dockerInstance) {
    dockerInstance = createDockerClient();
  }
  return dockerInstance;
}

// For testing - allows injecting a mock client
export function setDockerClient(client) {
  dockerInstance = client;
}

// For testing - allows resetting the client
export function resetDockerClient() {
  dockerInstance = null;
}
