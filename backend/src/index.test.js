import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from './index.js';

// Mock Docker client factory
function createMockDocker() {
  const mockContainer = {
    inspect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
    restart: vi.fn(),
    remove: vi.fn(),
    logs: vi.fn(),
  };

  return {
    listContainers: vi.fn(),
    getContainer: vi.fn(() => mockContainer),
    info: vi.fn(),
    pull: vi.fn(),
    createContainer: vi.fn(),
    modem: {
      followProgress: vi.fn(),
    },
    _mockContainer: mockContainer,
  };
}

describe('Docker Monitor API', () => {
  let app;
  let mockDocker;

  beforeEach(() => {
    mockDocker = createMockDocker();
    app = createApp(mockDocker);
  });

  describe('GET /api/containers', () => {
    it('should return list of containers', async () => {
      const mockContainers = [
        {
          Id: 'abc123def456',
          Names: ['/test-container'],
          Image: 'nginx:latest',
          ImageID: 'sha256:abc123',
          State: 'running',
          Status: 'Up 2 hours',
          Created: 1704067200,
          Ports: [{ PublicPort: 80, PrivatePort: 80, Type: 'tcp' }],
          NetworkSettings: { Networks: { bridge: {} } },
        },
      ];

      mockDocker.listContainers.mockResolvedValue(mockContainers);
      mockDocker._mockContainer.inspect.mockResolvedValue({
        HostConfig: { RestartPolicy: { Name: 'always' } },
      });

      const response = await request(app).get('/api/containers');

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0]).toMatchObject({
        id: 'abc123def456',
        shortId: 'abc123def456',
        name: 'test-container',
        image: 'nginx:latest',
        state: 'running',
        restartPolicy: 'always',
      });
    });

    it('should handle errors gracefully', async () => {
      mockDocker.listContainers.mockRejectedValue(new Error('Docker connection failed'));

      const response = await request(app).get('/api/containers');

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error', 'Failed to fetch containers');
    });
  });

  describe('GET /api/containers/:id', () => {
    it('should return single container details', async () => {
      const mockInspect = {
        Id: 'abc123def456',
        Name: '/test-container',
        Config: { Image: 'nginx:latest' },
        State: { Running: true },
      };

      mockDocker._mockContainer.inspect.mockResolvedValue(mockInspect);

      const response = await request(app).get('/api/containers/abc123def456');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockInspect);
    });

    it('should handle non-existent container', async () => {
      mockDocker._mockContainer.inspect.mockRejectedValue(new Error('Container not found'));

      const response = await request(app).get('/api/containers/nonexistent');

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error', 'Failed to fetch container');
    });
  });

  describe('POST /api/containers/:id/start', () => {
    it('should start a container', async () => {
      mockDocker._mockContainer.start.mockResolvedValue();

      const response = await request(app).post('/api/containers/abc123/start');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ success: true, message: 'Container started' });
      expect(mockDocker._mockContainer.start).toHaveBeenCalled();
    });

    it('should handle start errors', async () => {
      mockDocker._mockContainer.start.mockRejectedValue(new Error('Container already running'));

      const response = await request(app).post('/api/containers/abc123/start');

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error', 'Failed to start container');
    });
  });

  describe('POST /api/containers/:id/stop', () => {
    it('should stop a container', async () => {
      mockDocker._mockContainer.stop.mockResolvedValue();

      const response = await request(app).post('/api/containers/abc123/stop');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ success: true, message: 'Container stopped' });
      expect(mockDocker._mockContainer.stop).toHaveBeenCalled();
    });

    it('should handle stop errors', async () => {
      mockDocker._mockContainer.stop.mockRejectedValue(new Error('Container not running'));

      const response = await request(app).post('/api/containers/abc123/stop');

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error', 'Failed to stop container');
    });
  });

  describe('POST /api/containers/:id/restart', () => {
    it('should restart a container', async () => {
      mockDocker._mockContainer.restart.mockResolvedValue();

      const response = await request(app).post('/api/containers/abc123/restart');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ success: true, message: 'Container restarted' });
      expect(mockDocker._mockContainer.restart).toHaveBeenCalled();
    });

    it('should handle restart errors', async () => {
      mockDocker._mockContainer.restart.mockRejectedValue(new Error('Restart failed'));

      const response = await request(app).post('/api/containers/abc123/restart');

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error', 'Failed to restart container');
    });
  });

  describe('GET /api/containers/:id/logs', () => {
    it('should return container logs', async () => {
      mockDocker._mockContainer.logs.mockResolvedValue(Buffer.from('test logs output'));

      const response = await request(app).get('/api/containers/abc123/logs');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ logs: 'test logs output' });
    });

    it('should handle logs errors', async () => {
      mockDocker._mockContainer.logs.mockRejectedValue(new Error('Failed to get logs'));

      const response = await request(app).get('/api/containers/abc123/logs');

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error', 'Failed to fetch logs');
    });
  });

  describe('GET /api/system/info', () => {
    it('should return system info', async () => {
      const mockInfo = {
        Containers: 5,
        ContainersRunning: 3,
        ContainersPaused: 0,
        ContainersStopped: 2,
        Images: 10,
        ServerVersion: '24.0.0',
        OperatingSystem: 'Linux',
        Architecture: 'x86_64',
        NCPU: 4,
        MemTotal: 8589934592,
      };

      mockDocker.info.mockResolvedValue(mockInfo);

      const response = await request(app).get('/api/system/info');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        containers: 5,
        containersRunning: 3,
        containersPaused: 0,
        containersStopped: 2,
        images: 10,
        serverVersion: '24.0.0',
        operatingSystem: 'Linux',
        architecture: 'x86_64',
        cpus: 4,
        memory: 8589934592,
      });
    });

    it('should handle system info errors', async () => {
      mockDocker.info.mockRejectedValue(new Error('Docker daemon not running'));

      const response = await request(app).get('/api/system/info');

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error', 'Failed to fetch system info');
    });
  });

  describe('POST /api/containers/:id/upgrade', () => {
    it('should upgrade a running container', async () => {
      const mockInspect = {
        Name: '/test-container',
        Config: {
          Image: 'nginx:latest',
          Env: ['NODE_ENV=production'],
          ExposedPorts: { '80/tcp': {} },
          Labels: {},
          Cmd: null,
          Entrypoint: null,
          WorkingDir: '',
          User: '',
        },
        State: { Running: true },
        HostConfig: {},
        NetworkSettings: { Networks: { bridge: {} } },
      };

      const mockNewContainer = {
        id: 'newcontainer123',
        start: vi.fn().mockResolvedValue(),
      };

      mockDocker._mockContainer.inspect.mockResolvedValue(mockInspect);
      mockDocker._mockContainer.stop.mockResolvedValue();
      mockDocker._mockContainer.remove.mockResolvedValue();
      mockDocker.createContainer.mockResolvedValue(mockNewContainer);
      mockDocker.pull.mockImplementation((imageName, callback) => {
        const stream = {};
        callback(null, stream);
        mockDocker.modem.followProgress(stream, (err, output) => {});
      });
      mockDocker.modem.followProgress.mockImplementation((stream, callback) => {
        callback(null, []);
      });

      const response = await request(app).post('/api/containers/abc123/upgrade');

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        success: true,
        message: 'Container upgraded successfully',
        newContainerId: 'newcontainer123',
      });
    });

    it('should handle upgrade errors', async () => {
      mockDocker._mockContainer.inspect.mockRejectedValue(new Error('Container not found'));

      const response = await request(app).post('/api/containers/abc123/upgrade');

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error', 'Failed to upgrade container');
    });
  });
});
