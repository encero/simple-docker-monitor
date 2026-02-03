/**
 * Container API routes
 */

import { Router } from 'express';
import { createContainerService } from './container-service.js';

export function createContainerRoutes(docker) {
  const router = Router();
  const containerService = createContainerService(docker);

  // Get all containers (running and stopped)
  router.get('/', async (req, res) => {
    try {
      const containers = await containerService.listContainers();
      res.json(containers);
    } catch (error) {
      console.error('Error fetching containers:', error);
      res.status(500).json({ error: 'Failed to fetch containers', details: error.message });
    }
  });

  // Get single container details
  router.get('/:id', async (req, res) => {
    try {
      const container = await containerService.getContainer(req.params.id);
      res.json(container);
    } catch (error) {
      console.error('Error fetching container:', error);
      res.status(500).json({ error: 'Failed to fetch container', details: error.message });
    }
  });

  // Start a container
  router.post('/:id/start', async (req, res) => {
    try {
      const result = await containerService.startContainer(req.params.id);
      res.json(result);
    } catch (error) {
      console.error('Error starting container:', error);
      res.status(500).json({ error: 'Failed to start container', details: error.message });
    }
  });

  // Stop a container
  router.post('/:id/stop', async (req, res) => {
    try {
      const result = await containerService.stopContainer(req.params.id);
      res.json(result);
    } catch (error) {
      console.error('Error stopping container:', error);
      res.status(500).json({ error: 'Failed to stop container', details: error.message });
    }
  });

  // Restart a container
  router.post('/:id/restart', async (req, res) => {
    try {
      const result = await containerService.restartContainer(req.params.id);
      res.json(result);
    } catch (error) {
      console.error('Error restarting container:', error);
      res.status(500).json({ error: 'Failed to restart container', details: error.message });
    }
  });

  // Pull latest image and recreate container (upgrade)
  router.post('/:id/upgrade', async (req, res) => {
    try {
      const result = await containerService.upgradeContainer(req.params.id);
      res.json(result);
    } catch (error) {
      console.error('Error upgrading container:', error);
      res.status(500).json({ error: 'Failed to upgrade container', details: error.message });
    }
  });

  // Get container logs
  router.get('/:id/logs', async (req, res) => {
    try {
      const result = await containerService.getContainerLogs(req.params.id);
      res.json(result);
    } catch (error) {
      console.error('Error fetching logs:', error);
      res.status(500).json({ error: 'Failed to fetch logs', details: error.message });
    }
  });

  return router;
}
