import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import { httpServer } from './app';
import { QueueWorker } from './services/queue.service';
import { validateEnvironment } from './config/env.validator';
import { Logger } from './services/logger';
import { DeadLetterService } from './services/dead-letter.service';
import { KnowledgeBaseValidationService } from './services/kb-validation.service';

const logger = new Logger({ stage: 'server' });

async function runStartupValidation() {
  logger.info("Executing strict startup validation...");

  // 1. Environment Variables Check
  const envErrors = validateEnvironment();
  if (envErrors.length > 0) {
    logger.fatal(`Environment validation failed`, new Error(envErrors.join('; ')));
    process.exit(1);
  }
  logger.info("Startup check: Environment variables OK");

  // 2. Database Connection Check
  try {
    const pool = (await import('./db')).default;
    await pool.query('SELECT 1');
    logger.info("Startup check: Database connectivity OK");
  } catch (err: any) {
    logger.fatal(`Database connectivity failed: ${err.message}`, err);
    process.exit(1);
  }

  // 3. Pinecone Connection Check
  try {
    const { Pinecone } = await import('@pinecone-database/pinecone');
    const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY as string });
    const index = pc.Index(process.env.PINECONE_INDEX as string);
    await index.describeIndexStats();
    logger.info("Startup check: Pinecone connectivity OK");
  } catch (err: any) {
    logger.fatal(`Pinecone connectivity failed: ${err.message}`, err);
    process.exit(1);
  }

  // 4. Corpus Directories Check
  try {
    await KnowledgeBaseValidationService.validateCorpus();
    logger.info("Startup check: Corpus directories OK");
  } catch (err: any) {
    logger.fatal(`Corpus directory validation failed: ${err.message}`, err);
    process.exit(1);
  }

  // 5. Frontend Build Check
  const frontendBuildIdPath = path.resolve(__dirname, '../../frontend/.next/BUILD_ID');
  if (!fs.existsSync(frontendBuildIdPath)) {
    logger.fatal(`Frontend build check failed: Could not find build ID at ${frontendBuildIdPath}. Ensure frontend is built before starting backend.`);
    process.exit(1);
  }
  logger.info("Startup check: Frontend production build OK");

  // 6. Writable Storage Check
  const dirsToTest = [
    path.resolve(__dirname, '../uploads'),
    path.resolve(__dirname, '../scratch')
  ];
  for (const dir of dirsToTest) {
    try {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const testFile = path.join(dir, `.write-test-${Date.now()}`);
      fs.writeFileSync(testFile, 'test');
      fs.unlinkSync(testFile);
    } catch (err: any) {
      logger.fatal(`Writable storage check failed for directory ${dir}: ${err.message}`, err);
      process.exit(1);
    }
  }
  logger.info("Startup check: Writable storage folders OK");

  logger.info("Strict startup validation passed successfully!");
}

async function startServer() {
  await runStartupValidation();

  const PORT = process.env.PORT || 5000;
  httpServer.listen(PORT, async () => {
    logger.info(`NYC Compliance Engine running on port ${PORT}`, {
      stage: 'startup'
    });

    try {
      await DeadLetterService.initialize();
      await QueueWorker.start();
      logger.info('Background queue worker started successfully');
    } catch (err) {
      logger.error('Failed to start background queue worker', err);
    }
  });
}

startServer().catch((err) => {
  logger.fatal('Fatal error during server initialization', err);
  process.exit(1);
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
