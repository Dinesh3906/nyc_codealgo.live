import pool from '../db';
import { CompliancePipeline } from './compliance.service';
import { io } from '../app';

export class QueueWorker {
  private static isRunning = false;
  private static intervalId: NodeJS.Timeout | null = null;

  /**
   * Starts the background queue worker.
   * Scans the database periodically for jobs with status = 'queued'
   * and runs them sequentially.
   */
  static async start() {
    console.log('📡 Starting Database-Backed Background Queue Worker...');

    // Restore any interrupted/crashed jobs on startup back to 'queued' state
    try {
      console.log("[QUEUE] Recovering interrupted/crashed jobs...");
      const [result]: any = await pool.query(
        "UPDATE `plan` SET status = 'queued' WHERE status = 'processing'"
      );
      if (result.affectedRows > 0) {
        console.log(`[QUEUE] Recovered ${result.affectedRows} jobs back to queue.`);
      }
    } catch (err) {
      console.error("[QUEUE] Error recovering crashed jobs on startup:", err);
    }

    // Run queue check loop every 3 seconds
    this.intervalId = setInterval(() => this.processNextJob(), 3000);
  }

  /**
   * Stops the background queue worker loop.
   */
  static stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    console.log('🛑 Queue Worker stopped.');
  }

  /**
   * Claims and processes the next queued job.
   */
  private static async processNextJob() {
    if (this.isRunning) return; // Prevent overlapping runs
    this.isRunning = true;

    try {
      // 1. Fetch next queued job
      const [rows]: any = await pool.query(
        "SELECT id, fileUrl, mimetype, selectedSteps FROM `plan` WHERE status = 'queued' ORDER BY createdAt ASC LIMIT 1"
      );

      if (rows.length === 0) {
        this.isRunning = false;
        return;
      }

      const job = rows[0];

      // 2. Atomic Lock: Attempt to claim the job by setting status to 'processing'
      // This is safe across multiple server instances/processes
      const [updateResult]: any = await pool.query(
        "UPDATE `plan` SET status = 'processing' WHERE id = ? AND status = 'queued'",
        [job.id]
      );

      if (updateResult.affectedRows === 0) {
        // Another worker instance picked it up first
        this.isRunning = false;
        return;
      }

      console.log(`[QUEUE] Processing claimed job: ${job.id}`);

      // 3. Parse selected compliance steps
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

      // 4. Run the compliance engine analysis
      try {
        await CompliancePipeline.run(
          job.id, 
          job.fileUrl, 
          job.mimetype || 'application/pdf', 
          selectedSteps
        );
        console.log(`[QUEUE] Job ${job.id} processed successfully.`);
      } catch (err) {
        console.error(`[QUEUE] Engine run failed for job ${job.id}:`, err);
        await pool.query('UPDATE `plan` SET status = ? WHERE id = ?', ['failed', job.id]);
        io.emit('analysis-status', { 
          planId: job.id, 
          status: 'FAILED', 
          error: "Scan processing failed." 
        });
      }

    } catch (dbErr) {
      console.error("[QUEUE] Error in worker processing loop:", dbErr);
    } finally {
      this.isRunning = false;
    }
  }
}
