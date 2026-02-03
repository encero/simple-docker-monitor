/**
 * Simple interval-based job scheduler
 */

/**
 * Create a scheduler instance
 * @returns {Object} Scheduler
 */
export function createScheduler() {
  const jobs = new Map();
  let isShuttingDown = false;

  return {
    /**
     * Schedule a job to run at a fixed interval
     * @param {string} name - Unique job name
     * @param {Function} fn - Async function to execute
     * @param {number} intervalMs - Interval in milliseconds
     * @param {Object} options - Options
     * @param {boolean} options.runImmediately - Run job immediately on schedule
     */
    schedule(name, fn, intervalMs, options = {}) {
      if (jobs.has(name)) {
        throw new Error(`Job "${name}" is already scheduled`);
      }

      const job = {
        name,
        fn,
        intervalMs,
        intervalId: null,
        isRunning: false,
        lastRun: null,
        lastError: null,
        runCount: 0,
      };

      // Wrapper function with error handling
      const runJob = async () => {
        if (isShuttingDown || job.isRunning) {
          return;
        }

        job.isRunning = true;
        try {
          await fn();
          job.lastRun = new Date();
          job.lastError = null;
          job.runCount++;
        } catch (error) {
          job.lastError = error;
          console.error(`Scheduler job "${name}" failed:`, error);
        } finally {
          job.isRunning = false;
        }
      };

      // Start the interval
      job.intervalId = setInterval(runJob, intervalMs);
      jobs.set(name, job);

      console.log(`Scheduled job "${name}" to run every ${intervalMs / 1000}s`);

      // Run immediately if requested
      if (options.runImmediately) {
        runJob();
      }

      return job;
    },

    /**
     * Cancel a scheduled job
     * @param {string} name - Job name
     */
    cancel(name) {
      const job = jobs.get(name);
      if (job) {
        if (job.intervalId) {
          clearInterval(job.intervalId);
        }
        jobs.delete(name);
        console.log(`Cancelled job "${name}"`);
      }
    },

    /**
     * Run a job immediately (outside of schedule)
     * @param {string} name - Job name
     * @returns {Promise<void>}
     */
    async runNow(name) {
      const job = jobs.get(name);
      if (!job) {
        throw new Error(`Job "${name}" not found`);
      }

      if (job.isRunning) {
        throw new Error(`Job "${name}" is already running`);
      }

      job.isRunning = true;
      try {
        await job.fn();
        job.lastRun = new Date();
        job.lastError = null;
        job.runCount++;
      } catch (error) {
        job.lastError = error;
        throw error;
      } finally {
        job.isRunning = false;
      }
    },

    /**
     * Get job status
     * @param {string} name - Job name
     * @returns {Object|null}
     */
    getJobStatus(name) {
      const job = jobs.get(name);
      if (!job) {
        return null;
      }

      return {
        name: job.name,
        intervalMs: job.intervalMs,
        isRunning: job.isRunning,
        lastRun: job.lastRun,
        lastError: job.lastError?.message || null,
        runCount: job.runCount,
      };
    },

    /**
     * Get all job statuses
     * @returns {Array}
     */
    getAllJobStatuses() {
      return Array.from(jobs.keys()).map(name => this.getJobStatus(name));
    },

    /**
     * Shutdown the scheduler (cancel all jobs)
     */
    async shutdown() {
      isShuttingDown = true;
      console.log('Shutting down scheduler...');

      for (const [name, job] of jobs) {
        if (job.intervalId) {
          clearInterval(job.intervalId);
        }
      }

      // Wait for any running jobs to complete
      const runningJobs = Array.from(jobs.values()).filter(j => j.isRunning);
      if (runningJobs.length > 0) {
        console.log(`Waiting for ${runningJobs.length} running job(s) to complete...`);
        // Give jobs a chance to complete (max 5 seconds)
        const maxWait = 5000;
        const start = Date.now();
        while (Date.now() - start < maxWait) {
          const stillRunning = Array.from(jobs.values()).filter(j => j.isRunning);
          if (stillRunning.length === 0) {
            break;
          }
          await new Promise(r => setTimeout(r, 100));
        }
      }

      jobs.clear();
      console.log('Scheduler shut down');
    },
  };
}
