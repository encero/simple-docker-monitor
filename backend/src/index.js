import express from 'express';
import cors from 'cors';
import Docker from 'dockerode';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Factory function to create app with injected Docker client
export function createApp(docker) {
  const app = express();

  app.use(cors());
  app.use(express.json());

  // Serve static files from frontend build
  app.use(express.static(path.join(__dirname, '../../frontend/dist')));

  // Get all containers (running and stopped)
  app.get('/api/containers', async (req, res) => {
    try {
      const containers = await docker.listContainers({ all: true });
      const containerDetails = await Promise.all(
        containers.map(async (container) => {
          const containerInstance = docker.getContainer(container.Id);
          const inspect = await containerInstance.inspect();
          return {
            id: container.Id,
            shortId: container.Id.substring(0, 12),
            name: container.Names[0]?.replace(/^\//, '') || 'unknown',
            image: container.Image,
            imageId: container.ImageID,
            state: container.State,
            status: container.Status,
            created: container.Created,
            ports: container.Ports,
            networks: Object.keys(container.NetworkSettings?.Networks || {}),
            restartPolicy: inspect.HostConfig?.RestartPolicy?.Name || 'no',
          };
        })
      );
      res.json(containerDetails);
    } catch (error) {
      console.error('Error fetching containers:', error);
      res.status(500).json({ error: 'Failed to fetch containers', details: error.message });
    }
  });

  // Get single container details
  app.get('/api/containers/:id', async (req, res) => {
    try {
      const container = docker.getContainer(req.params.id);
      const inspect = await container.inspect();
      res.json(inspect);
    } catch (error) {
      console.error('Error fetching container:', error);
      res.status(500).json({ error: 'Failed to fetch container', details: error.message });
    }
  });

  // Start a container
  app.post('/api/containers/:id/start', async (req, res) => {
    try {
      const container = docker.getContainer(req.params.id);
      await container.start();
      res.json({ success: true, message: 'Container started' });
    } catch (error) {
      console.error('Error starting container:', error);
      res.status(500).json({ error: 'Failed to start container', details: error.message });
    }
  });

  // Stop a container
  app.post('/api/containers/:id/stop', async (req, res) => {
    try {
      const container = docker.getContainer(req.params.id);
      await container.stop();
      res.json({ success: true, message: 'Container stopped' });
    } catch (error) {
      console.error('Error stopping container:', error);
      res.status(500).json({ error: 'Failed to stop container', details: error.message });
    }
  });

  // Restart a container
  app.post('/api/containers/:id/restart', async (req, res) => {
    try {
      const container = docker.getContainer(req.params.id);
      await container.restart();
      res.json({ success: true, message: 'Container restarted' });
    } catch (error) {
      console.error('Error restarting container:', error);
      res.status(500).json({ error: 'Failed to restart container', details: error.message });
    }
  });

  // Pull latest image and recreate container (upgrade)
  app.post('/api/containers/:id/upgrade', async (req, res) => {
    try {
      const container = docker.getContainer(req.params.id);
      const inspect = await container.inspect();
      const imageName = inspect.Config.Image;
      const containerName = inspect.Name.replace(/^\//, '');
      const wasRunning = inspect.State.Running;

      // Pull the latest image
      console.log(`Pulling latest image: ${imageName}`);
      await new Promise((resolve, reject) => {
        docker.pull(imageName, (err, stream) => {
          if (err) return reject(err);
          docker.modem.followProgress(stream, (err, output) => {
            if (err) return reject(err);
            resolve(output);
          });
        });
      });

      // Stop and remove the old container
      if (wasRunning) {
        await container.stop();
      }
      await container.remove();

      // Create new container with same config
      const newContainer = await docker.createContainer({
        name: containerName,
        Image: imageName,
        Env: inspect.Config.Env,
        ExposedPorts: inspect.Config.ExposedPorts,
        HostConfig: inspect.HostConfig,
        NetworkingConfig: {
          EndpointsConfig: inspect.NetworkSettings.Networks,
        },
        Labels: inspect.Config.Labels,
        Cmd: inspect.Config.Cmd,
        Entrypoint: inspect.Config.Entrypoint,
        WorkingDir: inspect.Config.WorkingDir,
        User: inspect.Config.User,
      });

      // Start if it was running before
      if (wasRunning) {
        await newContainer.start();
      }

      res.json({
        success: true,
        message: 'Container upgraded successfully',
        newContainerId: newContainer.id
      });
    } catch (error) {
      console.error('Error upgrading container:', error);
      res.status(500).json({ error: 'Failed to upgrade container', details: error.message });
    }
  });

  // Get container logs
  app.get('/api/containers/:id/logs', async (req, res) => {
    try {
      const container = docker.getContainer(req.params.id);
      const logs = await container.logs({
        stdout: true,
        stderr: true,
        tail: 100,
        timestamps: true,
      });
      res.json({ logs: logs.toString('utf-8') });
    } catch (error) {
      console.error('Error fetching logs:', error);
      res.status(500).json({ error: 'Failed to fetch logs', details: error.message });
    }
  });

  // Get Docker system info
  app.get('/api/system/info', async (req, res) => {
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
      res.status(500).json({ error: 'Failed to fetch system info', details: error.message });
    }
  });

  // Serve frontend for all other routes
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../../frontend/dist/index.html'));
  });

  return app;
}

// Only start server when running directly (not when imported for testing)
const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  const port = process.env.PORT || 3001;
  const docker = new Docker({ socketPath: '/var/run/docker.sock' });
  const app = createApp(docker);

  app.listen(port, () => {
    console.log(`Docker Monitor API running on port ${port}`);
  });
}
