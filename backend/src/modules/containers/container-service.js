/**
 * Container operations service
 * Business logic for Docker container management
 */

export function createContainerService(docker) {
  return {
    /**
     * List all containers with detailed information
     */
    async listContainers() {
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
      return containerDetails;
    },

    /**
     * Get detailed information about a single container
     */
    async getContainer(containerId) {
      const container = docker.getContainer(containerId);
      return await container.inspect();
    },

    /**
     * Start a container
     */
    async startContainer(containerId) {
      const container = docker.getContainer(containerId);
      await container.start();
      return { success: true, message: 'Container started' };
    },

    /**
     * Stop a container
     */
    async stopContainer(containerId) {
      const container = docker.getContainer(containerId);
      await container.stop();
      return { success: true, message: 'Container stopped' };
    },

    /**
     * Restart a container
     */
    async restartContainer(containerId) {
      const container = docker.getContainer(containerId);
      await container.restart();
      return { success: true, message: 'Container restarted' };
    },

    /**
     * Pull latest image and recreate container (upgrade)
     */
    async upgradeContainer(containerId) {
      const container = docker.getContainer(containerId);
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

      return {
        success: true,
        message: 'Container upgraded successfully',
        newContainerId: newContainer.id,
      };
    },

    /**
     * Get container logs
     */
    async getContainerLogs(containerId) {
      const container = docker.getContainer(containerId);
      const logs = await container.logs({
        stdout: true,
        stderr: true,
        tail: 100,
        timestamps: true,
      });
      return { logs: logs.toString('utf-8') };
    },
  };
}
