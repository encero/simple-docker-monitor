/**
 * System API routes
 */

import { Router } from 'express';

export function createSystemRoutes(docker) {
  const router = Router();

  // Get Docker system info
  router.get('/info', async (req, res) => {
    try {
      const info = await docker.info();
      res.json({
        containers: info.Containers,
        containersRunning: info.ContainersRunning,
        containersPaused: info.ContainersPaused,
        containersStopped: info.ContainersStopped,
        images: info.Images,
        serverVersion: info.ServerVersion,
        operatingSystem: info.OperatingSystem,
        architecture: info.Architecture,
        cpus: info.NCPU,
        memory: info.MemTotal,
      });
    } catch (error) {
      console.error('Error fetching system info:', error);
      const payload = { error: 'Failed to fetch system info' };
      if (process.env.NODE_ENV !== 'production') {
        payload.details = error.message;
      }
      res.status(500).json(payload);
    }
  });

  return router;
}
