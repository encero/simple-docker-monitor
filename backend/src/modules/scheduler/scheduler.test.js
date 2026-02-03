import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createScheduler } from './scheduler.js';

describe('Scheduler', () => {
  let scheduler;

  beforeEach(() => {
    vi.useFakeTimers();
    scheduler = createScheduler();
  });

  afterEach(async () => {
    await scheduler.shutdown();
    vi.useRealTimers();
  });

  describe('schedule', () => {
    it('should schedule and run a job at intervals', async () => {
      const mockFn = vi.fn().mockResolvedValue(undefined);

      scheduler.schedule('test-job', mockFn, 1000);

      expect(mockFn).not.toHaveBeenCalled();

      // Advance time
      await vi.advanceTimersByTimeAsync(1000);
      expect(mockFn).toHaveBeenCalledTimes(1);

      await vi.advanceTimersByTimeAsync(1000);
      expect(mockFn).toHaveBeenCalledTimes(2);
    });

    it('should run immediately when runImmediately is true', async () => {
      const mockFn = vi.fn().mockResolvedValue(undefined);

      scheduler.schedule('test-job', mockFn, 1000, { runImmediately: true });

      // Should run immediately
      await vi.advanceTimersByTimeAsync(0);
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should throw when scheduling duplicate job name', () => {
      const mockFn = vi.fn();

      scheduler.schedule('test-job', mockFn, 1000);

      expect(() => scheduler.schedule('test-job', mockFn, 1000))
        .toThrow('Job "test-job" is already scheduled');
    });

    it('should handle job errors gracefully', async () => {
      const error = new Error('Job failed');
      const mockFn = vi.fn().mockRejectedValue(error);

      scheduler.schedule('failing-job', mockFn, 1000);

      await vi.advanceTimersByTimeAsync(1000);

      const status = scheduler.getJobStatus('failing-job');
      expect(status.lastError).toBe('Job failed');
      expect(status.runCount).toBe(0);
    });
  });

  describe('cancel', () => {
    it('should cancel a scheduled job', async () => {
      const mockFn = vi.fn().mockResolvedValue(undefined);

      scheduler.schedule('test-job', mockFn, 1000);
      scheduler.cancel('test-job');

      await vi.advanceTimersByTimeAsync(2000);
      expect(mockFn).not.toHaveBeenCalled();
    });

    it('should handle cancelling non-existent job', () => {
      expect(() => scheduler.cancel('non-existent')).not.toThrow();
    });
  });

  describe('runNow', () => {
    it('should run a job immediately', async () => {
      const mockFn = vi.fn().mockResolvedValue(undefined);

      scheduler.schedule('test-job', mockFn, 10000);

      await scheduler.runNow('test-job');
      expect(mockFn).toHaveBeenCalledTimes(1);

      const status = scheduler.getJobStatus('test-job');
      expect(status.runCount).toBe(1);
      expect(status.lastRun).toBeTruthy();
    });

    it('should throw when job not found', async () => {
      await expect(scheduler.runNow('non-existent'))
        .rejects.toThrow('Job "non-existent" not found');
    });

    it('should throw when job is already running', async () => {
      let resolveJob;
      const slowJob = new Promise(r => { resolveJob = r; });
      const mockFn = vi.fn().mockReturnValue(slowJob);

      scheduler.schedule('slow-job', mockFn, 10000);

      // Start the job
      const runPromise = scheduler.runNow('slow-job');

      // Try to run again while still running
      await expect(scheduler.runNow('slow-job'))
        .rejects.toThrow('Job "slow-job" is already running');

      // Complete the job
      resolveJob();
      await runPromise;
    });

    it('should propagate errors when runNow fails', async () => {
      const error = new Error('Job exploded');
      const mockFn = vi.fn().mockRejectedValue(error);

      scheduler.schedule('failing-job', mockFn, 10000);

      await expect(scheduler.runNow('failing-job'))
        .rejects.toThrow('Job exploded');

      const status = scheduler.getJobStatus('failing-job');
      expect(status.lastError).toBe('Job exploded');
    });
  });

  describe('getJobStatus', () => {
    it('should return job status', async () => {
      const mockFn = vi.fn().mockResolvedValue(undefined);

      scheduler.schedule('test-job', mockFn, 5000);
      await vi.advanceTimersByTimeAsync(5000);

      const status = scheduler.getJobStatus('test-job');

      expect(status).toMatchObject({
        name: 'test-job',
        intervalMs: 5000,
        isRunning: false,
        runCount: 1,
      });
      expect(status.lastRun).toBeInstanceOf(Date);
    });

    it('should return null for non-existent job', () => {
      expect(scheduler.getJobStatus('non-existent')).toBeNull();
    });
  });

  describe('getAllJobStatuses', () => {
    it('should return all job statuses', () => {
      scheduler.schedule('job1', vi.fn(), 1000);
      scheduler.schedule('job2', vi.fn(), 2000);

      const statuses = scheduler.getAllJobStatuses();

      expect(statuses).toHaveLength(2);
      expect(statuses.map(s => s.name)).toContain('job1');
      expect(statuses.map(s => s.name)).toContain('job2');
    });
  });

  describe('shutdown', () => {
    it('should cancel all jobs on shutdown', async () => {
      const mockFn1 = vi.fn().mockResolvedValue(undefined);
      const mockFn2 = vi.fn().mockResolvedValue(undefined);

      scheduler.schedule('job1', mockFn1, 1000);
      scheduler.schedule('job2', mockFn2, 1000);

      await scheduler.shutdown();

      await vi.advanceTimersByTimeAsync(2000);
      expect(mockFn1).not.toHaveBeenCalled();
      expect(mockFn2).not.toHaveBeenCalled();
    });
  });
});
