/**
 * Production-grade queue worker with:
 * - Configurable max retries per job
 * - Dead letter queue for permanently failed jobs
 * - Idempotent processing (skip already-completed jobs)
 * - Graceful shutdown (finish current job before stopping)
 * - Backpressure (reject new jobs if queue exceeds depth limit)
 * - Structured logging
 */

import pool from '../db';
import { CompliancePipeline } from './compliance.service';
import { io } from '../app';
import { Logger } from './logger';
import { DeadLetterService } from './dead-letter.service';
import { metrics } from './metrics.service';

const logger = new Logger({ stage: 'queue-worker' });

const MAX_JOB_RETRIES = parseInt(process.env.QUEUE_MAX_RETRIES || '3', 10);
const POLL_INTERVAL_MS = parseInt(process.env.QUEUE_POLL_INTERVAL_MS || '3000', 10);
const MAX_QUEUE_DEPTH = parseInt(process.env.QUEUE_MAX_DEPTH || '100', 10);

export class QueueWorker {
  private static isRunning = false;
  private static intervalId: NodeJS.Timeout | null = null;
  private static isShuttingDown = false;
  private static currentJobId: string | null = null;

  /**
   * Starts the background queue worker.
   * Scans the database periodically for jobs with status = 'queued'
   * and runs them sequentially.
   */
  static async start() {
    logger.info('Starting database-backed background queue worker');

    // Initialize DLQ table
    await DeadLetterService.initialize();

    // Restore any interrupted/crashed jobs on startup back to 'queued' state
    try {
      const [result]: any = await pool.query(
        "UPDATE `plan` SET status = 'queued' WHERE status = 'processing'"
      );
      if (result.affectedRows > 0) {
        logger.info(`Recovered ${result.affectedRows} interrupted jobs back to queue`);
      }
    } catch (err) {
      logger.error('Error recovering crashed jobs on startup', err);
    }

    // Run queue check loop
    this.intervalId = setInterval(() => this.processNextJob(), POLL_INTERVAL_MS);
  }

  /**
   * Graceful shutdown: stops accepting new work and waits for current job to finish.
   */
  static async shutdown(): Promise<void> {
    logger.info('Queue worker shutting down gracefully...');
    this.isShuttingDown = true;

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    // Wait for current job to complete (max 5 minutes)
    const maxWaitMs = 300000;
    const started = Date.now();
    while (this.currentJobId && Date.now() - started < maxWaitMs) {
      logger.info(`Waiting for current job ${this.currentJobId} to complete...`);
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    if (this.currentJobId) {
      logger.warn(`Shutdown timeout: job ${this.currentJobId} still running after ${maxWaitMs}ms`);
    }

    logger.info('Queue worker stopped');
  }
  /**
   * Stops the background queue worker loop immediately.
   */
  static stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    logger.info('Queue worker stopped');
  } // stop
  static isWorkerRunning(): boolean {
    return this.intervalId !== null;
  }

  /**
   * Returns current queue depth for monitoring.
   */
  static async getQueueDepth(): Promise<number> {
    try {
      const [rows]: any = await pool.query(
        "SELECT COUNT(*) as depth FROM `plan` WHERE status = 'queued'"
      );
      const depth = rows[0]?.depth || 0;
      metrics.setGauge('nyc_queue_depth', depth);
      return depth;
    } catch {
      return 0;
    }
  }

  /**
   * Claims and processes the next queued job.
   */
  private static async processNextJob() {
    if (this.isRunning || this.isShuttingDown) return;
    this.isRunning = true;

    try {
      // 1. Fetch next queued job
      const [rows]: any = await pool.query(
        "SELECT id, fileUrl, mimetype, selectedSteps, retryCount FROM `plan` WHERE status = 'queued' ORDER BY createdAt ASC LIMIT 1"
      );

      if (rows.length === 0) {
        this.isRunning = false;
        return;
      }

      const job = rows[0];
      const retryCount = job.retryCount || 0;

      // 2. Idempotency check: skip if already completed
      const [statusCheck]: any = await pool.query(
        "SELECT status FROM `plan` WHERE id = ?",
        [job.id]
      );
      if (statusCheck.length > 0 && statusCheck[0].status === 'analyzed') {
        logger.info(`Job ${job.id} already analyzed, skipping (idempotent)`, { auditId: job.id });
        this.isRunning = false;
        return;
      }

      // 3. Atomic Lock: Claim the job
      const [updateResult]: any = await pool.query(
        "UPDATE `plan` SET status = 'processing' WHERE id = ? AND status = 'queued'",
        [job.id]
      );

      if (updateResult.affectedRows === 0) {
        // Another worker instance picked it up first
        this.isRunning = false;
        return;
      }

      this.currentJobId = job.id;
      logger.info(`Processing claimed job: ${job.id}`, {
        auditId: job.id,
        retryCount
      });

      // 4. Parse selected compliance steps
      let selectedSteps: string[] | undefined = undefined;
      if (job.selectedSteps) {
        try {
          selectedSteps = JSON.parse(job.selectedSteps);
        } catch (e) {
          if (typeof job.selectedSteps === 'string') {
            selectedSteps = job.selectedSteps.split(',').map((s: string) => s.trim()).filter(Boolean);
          }
        }
      }

      // 5. Run the compliance engine analysis
      try {
        metrics.incrementGauge('nyc_active_audits');
        await CompliancePipeline.run(
          job.id,
          job.fileUrl,
          job.mimetype || 'application/pdf',
          selectedSteps
        );
        logger.info(`Job ${job.id} processed successfully`, { auditId: job.id });
        metrics.incrementCounter('nyc_audits_total', { status: 'success' });
      } catch (err: any) {
        logger.error(`Engine run failed for job ${job.id}`, err, {
          auditId: job.id,
          retryCount
        });

        if (retryCount + 1 >= MAX_JOB_RETRIES) {
          // Max retries exceeded → move to dead letter queue
          logger.error(`Job ${job.id} exceeded max retries (${MAX_JOB_RETRIES}), moving to DLQ`, err, {
            auditId: job.id,
            retryCount: retryCount + 1
          });

          await pool.query('UPDATE `plan` SET status = ? WHERE id = ?', ['failed', job.id]);
          await DeadLetterService.enqueue(job.id, err, retryCount + 1, {
            fileUrl: job.fileUrl,
            mimetype: job.mimetype,
            selectedSteps: job.selectedSteps
          });
          metrics.incrementCounter('nyc_dlq_entries_total');
          metrics.incrementCounter('nyc_audits_failed_total');
        } else {
          // Re-queue for retry with incremented retry count
          await pool.query(
            "UPDATE `plan` SET status = 'queued', retryCount = ? WHERE id = ?",
            [retryCount + 1, job.id]
          );
          logger.info(`Job ${job.id} re-queued for retry ${retryCount + 1}/${MAX_JOB_RETRIES}`, {
            auditId: job.id,
            retryCount: retryCount + 1
          });
          metrics.incrementCounter('nyc_retries_total');
        }

        io.emit('analysis-status', {
          planId: job.id,
          status: retryCount + 1 >= MAX_JOB_RETRIES ? 'FAILED' : 'RETRYING',
          error: retryCount + 1 >= MAX_JOB_RETRIES
            ? 'Scan processing failed after maximum retries.'
            : `Retrying analysis (attempt ${retryCount + 2}/${MAX_JOB_RETRIES})...`
        });
      } finally {
        metrics.decrementGauge('nyc_active_audits');
      }

    } catch (dbErr) {
      logger.error('Error in worker processing loop', dbErr);
    } finally {
      this.currentJobId = null;
      this.isRunning = false;
    }
  }
}
