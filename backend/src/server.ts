import 'dotenv/config';
import { httpServer } from './app';
import { QueueWorker } from './services/queue.service';
import { validateEnvironment } from './config/env.validator';
import { Logger } from './services/logger';
import { DeadLetterService } from './services/dead-letter.service';
import { KnowledgeBaseValidationService } from './services/kb-validation.service';

const logger = new Logger({ stage: 'server' });

// ─── Environment Validation (fail fast) ───

const envErrors = validateEnvironment();
if (envErrors.length > 0) {
  logger.fatal(`Environment validation failed`, new Error(envErrors.join('; ')));
  process.exit(1);
}

const PORT = process.env.PORT || 5000;

httpServer.listen(PORT, async () => {
  logger.info(`NYC Compliance Engine running on port ${PORT}`, {
    stage: 'startup'
  });

  try {
    // Validate corpus files
    await KnowledgeBaseValidationService.validateCorpus();
    
    await DeadLetterService.initialize();
    await QueueWorker.start();
    logger.info('Background queue worker started successfully');
  } catch (err) {
    logger.error('Failed to start background queue worker', err);
  }
});

// ─── Graceful Shutdown ───

async function gracefulShutdown(signal: string) {
  logger.info(`Received ${signal}, initiating graceful shutdown...`, { stage: 'shutdown' });

  try {
    // 1. Stop accepting new connections
    httpServer.close(() => {
      logger.info('HTTP server closed');
    });

    // 2. Drain queue worker (finish current job)
    await QueueWorker.shutdown();

    // 3. Close database connections
    const pool = (await import('./db')).default;
    await pool.end();
    logger.info('Database connections closed');

    logger.info('Graceful shutdown complete', { stage: 'shutdown' });
    process.exit(0);
  } catch (err) {
    logger.error('Error during graceful shutdown', err, { stage: 'shutdown' });
    process.exit(1);
  }
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// ─── Unhandled Rejection / Exception Handlers ───

process.on('unhandledRejection', (reason: any) => {
  logger.error('Unhandled promise rejection', reason instanceof Error ? reason : new Error(String(reason)), {
    stage: 'unhandled-rejection'
  });
});

process.on('uncaughtException', (error: Error) => {
  logger.fatal('Uncaught exception — shutting down', error, { stage: 'uncaught-exception' });
  process.exit(1);
});
