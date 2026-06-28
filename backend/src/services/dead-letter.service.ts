/**
 * Dead Letter Queue (DLQ) for permanently failed audit jobs.
 * Captures full context of failed jobs for post-mortem analysis and manual retry.
 * Uses a DB table for persistence across restarts.
 */

import pool from '../db';
import { Logger } from './logger';

const logger = new Logger({ stage: 'dead-letter-queue' });

export interface DeadLetterEntry {
  id?: number;
  planId: string;
  errorMessage: string;
  errorStack?: string;
  attemptCount: number;
  lastAttemptAt: Date;
  jobPayload: string; // JSON-serialized original job data
  status: 'pending' | 'retried' | 'discarded';
  createdAt?: Date;
}

export class DeadLetterService {
  private static initialized = false;

  /**
   * Ensures the dead_letter_queue table exists. Called once on startup.
   */
  static async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS dead_letter_queue (
          id INT AUTO_INCREMENT PRIMARY KEY,
          planId VARCHAR(255) NOT NULL,
          errorMessage TEXT NOT NULL,
          errorStack TEXT,
          attemptCount INT NOT NULL DEFAULT 0,
          lastAttemptAt DATETIME NOT NULL,
          jobPayload JSON,
          status ENUM('pending', 'retried', 'discarded') NOT NULL DEFAULT 'pending',
          createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_dlq_status (status),
          INDEX idx_dlq_planId (planId)
        )
      `);
      this.initialized = true;
      logger.info('Dead letter queue table initialized');
    } catch (err) {
      logger.error('Failed to initialize dead letter queue table', err);
    }
  }

  /**
   * Adds a failed job to the dead letter queue.
   */
  static async enqueue(
    planId: string,
    error: Error | any,
    attemptCount: number,
    jobPayload?: Record<string, any>
  ): Promise<void> {
    await this.initialize();

    const entry: Omit<DeadLetterEntry, 'id' | 'createdAt'> = {
      planId,
      errorMessage: error?.message || String(error),
      errorStack: error?.stack,
      attemptCount,
      lastAttemptAt: new Date(),
      jobPayload: JSON.stringify(jobPayload || {}),
      status: 'pending'
    };

    try {
      await pool.query(
        `INSERT INTO dead_letter_queue (planId, errorMessage, errorStack, attemptCount, lastAttemptAt, jobPayload, status)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [entry.planId, entry.errorMessage, entry.errorStack, entry.attemptCount, entry.lastAttemptAt, entry.jobPayload, entry.status]
      );
      logger.warn(`Job ${planId} moved to dead letter queue after ${attemptCount} attempts`, {
        auditId: planId,
        retryCount: attemptCount
      });
    } catch (dbErr) {
      logger.error('Failed to enqueue dead letter entry', dbErr, { auditId: planId });
    }
  }

  /**
   * Lists all pending entries in the DLQ.
   */
  static async listPending(limit = 50): Promise<DeadLetterEntry[]> {
    await this.initialize();
    try {
      const [rows]: any = await pool.query(
        `SELECT * FROM dead_letter_queue WHERE status = 'pending' ORDER BY createdAt DESC LIMIT ?`,
        [limit]
      );
      return rows;
    } catch (err) {
      logger.error('Failed to list DLQ entries', err);
      return [];
    }
  }

  /**
   * Marks a DLQ entry as retried (when an admin manually retries the job).
   */
  static async markRetried(id: number): Promise<void> {
    try {
      await pool.query(`UPDATE dead_letter_queue SET status = 'retried' WHERE id = ?`, [id]);
      logger.info(`DLQ entry ${id} marked as retried`);
    } catch (err) {
      logger.error('Failed to mark DLQ entry as retried', err);
    }
  }

  /**
   * Marks a DLQ entry as discarded (no longer actionable).
   */
  static async markDiscarded(id: number): Promise<void> {
    try {
      await pool.query(`UPDATE dead_letter_queue SET status = 'discarded' WHERE id = ?`, [id]);
      logger.info(`DLQ entry ${id} marked as discarded`);
    } catch (err) {
      logger.error('Failed to mark DLQ entry as discarded', err);
    }
  }

  /**
   * Returns count of pending DLQ entries (for monitoring).
   */
  static async pendingCount(): Promise<number> {
    await this.initialize();
    try {
      const [rows]: any = await pool.query(
        `SELECT COUNT(*) as count FROM dead_letter_queue WHERE status = 'pending'`
      );
      return rows[0]?.count || 0;
    } catch (err) {
      return 0;
    }
  }

  /**
   * Cleans up old DLQ entries older than specified days.
   */
  static async cleanup(olderThanDays = 30): Promise<number> {
    try {
      const [result]: any = await pool.query(
        `DELETE FROM dead_letter_queue WHERE status IN ('retried', 'discarded') AND createdAt < DATE_SUB(NOW(), INTERVAL ? DAY)`,
        [olderThanDays]
      );
      const deleted = result.affectedRows || 0;
      if (deleted > 0) {
        logger.info(`Cleaned up ${deleted} old DLQ entries`);
      }
      return deleted;
    } catch (err) {
      logger.error('Failed to cleanup DLQ', err);
      return 0;
    }
  }
}
