import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { createSystemRoutes } from './routes.js';

function createMockDocker() {
  return {
    info: vi.fn(),
  };
}

function createTestApp(docker) {
  const app = express();
  app.use(express.json());
  app.use('/api/system', createSystemRoutes(docker));
  return app;
}

describe('System Routes', () => {
  let app;
  let mockDocker;

  beforeEach(() => {
    mockDocker = createMockDocker();
    app = createTestApp(mockDocker);
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
});
