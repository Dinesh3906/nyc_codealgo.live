import express from 'express';
import path from 'path';
import cors from 'cors';
import helmet from 'helmet';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { apiLimiter, authLimiter } from './middleware/rateLimit.middleware';
import { requestIdMiddleware, requestLoggingMiddleware, abuseDetectionMiddleware } from './middleware/security.middleware';
import { sanitizeRequestBody } from './middleware/input-validation.middleware';
import { metrics, updateSystemMetrics } from './services/metrics.service';
import { geminiCircuitBreaker, pineconeCircuitBreaker } from './services/circuit-breaker';
import { Logger } from './services/logger';
import authRoutes from './routes/auth.routes';
import planRoutes from './routes/plans.routes';
import billingRoutes from './routes/billing.routes';
import leadsRoutes from './routes/leads.routes';
import feedbackRoutes from './routes/feedback.routes';
import adminRoutes from './routes/admin.routes';
import notificationRoutes from './routes/notification.routes';

const logger = new Logger({ stage: 'app' });
const app = express();

// Secure HTTP Headers with Helmet
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

const allowedOrigins = [
  'https://nyccodes.codealgo.live',
  'https://www.nyccodes.codealgo.live',
  'http://localhost:3000',
  process.env.CORS_ORIGIN,
  process.env.FRONTEND_URL
].filter(Boolean) as string[];

const isOriginAllowed = (origin: string | undefined): boolean => {
  if (!origin || origin === 'undefined' || origin === 'null') return true; // Allow mobile apps, server-to-server, or missing headers
  return allowedOrigins.includes(origin) ||
    origin.includes('codealgo.live') ||
    origin.includes('localhost') ||
    origin.includes('127.0.0.1');
};

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      if (isOriginAllowed(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true
  },
});

app.use(cors({
  origin: (origin, callback) => {
    if (isOriginAllowed(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'X-Admin-Token', 'x-admin-token', 'X-Request-ID']
}));

// ─── Production middleware stack ───

// Request ID generation (before everything else)
app.use(requestIdMiddleware);

// Body parsing
app.use('/api/billing/webhook', express.raw({ type: 'application/json' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Input sanitization
app.use(sanitizeRequestBody);

// Structured request logging (replaces console.log)
app.use(requestLoggingMiddleware);

// Abuse detection
app.use(abuseDetectionMiddleware);

// Rate limiting
app.use('/api', apiLimiter);

// ─── Health, Readiness & Metrics Endpoints ───

app.get('/health', async (req, res) => {
  const { KnowledgeBaseValidationService } = await import('./services/kb-validation.service');
  const missingBooks = KnowledgeBaseValidationService.getMissingBooks();
  
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.APP_VERSION || '1.0.0',
    warnings: missingBooks.length > 0 ? `Missing required code books: ${missingBooks.join(', ')}` : undefined
  });
});

app.get('/health/ai', async (req, res) => {
  try {
    const { breakersRegistry } = await import('./services/circuit-breaker');
    const { GeminiClient } = await import('./services/gemini.client');

    const breakersStats: Record<string, any> = {};
    for (const [name, breaker] of Object.entries(breakersRegistry)) {
      breakersStats[name] = breaker.getStats();
    }

    const keysMetadata = GeminiClient.getKeysMetadata().map(km => ({
      keyPrefix: km.key ? `${km.key.substring(0, 8)}...` : 'N/A',
      rpmCount: km.rpmTimestamps.length,
      tpmCount: km.tpmUsage.reduce((sum, u) => sum + u.tokens, 0),
      dailyRequests: km.dailyRequests,
      dailyTokens: km.dailyTokens,
      coolDownRemainingMs: Math.max(0, km.coolDownUntil - Date.now()),
      status: km.coolDownUntil > Date.now() ? 'COOLDOWN' : 'ACTIVE'
    }));

    const hasActiveKey = keysMetadata.some(k => k.status === 'ACTIVE');

    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      connectivity: hasActiveKey ? 'connected' : 'degraded',
      breakers: breakersStats,
      apiKeys: keysMetadata
    });
  } catch (err: any) {
    res.status(500).json({
      status: 'error',
      message: err.message || err
    });
  }
});

app.get('/ready', async (req, res) => {
  try {
    const { KnowledgeBaseValidationService } = await import('./services/kb-validation.service');
    
    // Check database connectivity
    const pool = (await import('./db')).default;
    await pool.query('SELECT 1');

    // Check circuit breaker states
    const geminiState = geminiCircuitBreaker.getState();
    const pineconeState = pineconeCircuitBreaker.getState();

    const kbStatus = KnowledgeBaseValidationService.getValidationStatus();

    res.status(200).json({
      status: 'ready',
      checks: {
        database: 'ok',
        gemini_circuit: geminiState,
        pinecone_circuit: pineconeState
      },
      knowledgeBase: kbStatus
    });
  } catch (err) {
    res.status(503).json({
      status: 'not_ready',
      error: 'Dependency check failed'
    });
  }
});

app.get('/metrics', (req, res) => {
  updateSystemMetrics();

  // Update circuit breaker gauges
  const cbStateMap = { 'CLOSED': 0, 'HALF_OPEN': 1, 'OPEN': 2 };
  metrics.setGauge('nyc_circuit_breaker_state',
    cbStateMap[geminiCircuitBreaker.getState()] ?? 0,
    { service: 'gemini' }
  );
  metrics.setGauge('nyc_circuit_breaker_state',
    cbStateMap[pineconeCircuitBreaker.getState()] ?? 0,
    { service: 'pinecone' }
  );

  res.setHeader('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
  res.send(metrics.serialize());
});

// ─── Socket.io ───

io.on('connection', (socket) => {
  logger.debug('User connected to socket', { requestId: socket.id });

  socket.on('disconnect', () => {
    logger.debug('User disconnected from socket', { requestId: socket.id });
  });
});

// ─── API Routes ───

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/plans', planRoutes);
app.use('/api/upload-plan', planRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/leads', leadsRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notifications', notificationRoutes);

// Export for server.ts
export { app, httpServer, io };
