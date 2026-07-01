import express from 'express';
import path from 'path';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { apiLimiter, authLimiter } from './middleware/rateLimit.middleware';
import { requestIdMiddleware, requestLoggingMiddleware, abuseDetectionMiddleware } from './middleware/security.middleware';
import { sanitizeRequestBody } from './middleware/input-validation.middleware';
import { metrics, updateSystemMetrics } from './services/metrics.service';
import { geminiCircuitBreaker, pineconeCircuitBreaker } from './services/circuit-breaker';
import { Logger } from './services/logger';
import { JwtService } from './services/jwt.service';
import { csrfProtection } from './middleware/csrf.middleware';
import pool from './db';
import authRoutes from './routes/auth.routes';
import planRoutes from './routes/plans.routes';
import billingRoutes from './routes/billing.routes';
import leadsRoutes from './routes/leads.routes';
import feedbackRoutes from './routes/feedback.routes';
import adminRoutes from './routes/admin.routes';
import notificationRoutes from './routes/notification.routes';

const logger = new Logger({ stage: 'app' });
const app = express();

const IS_PRODUCTION = process.env.NODE_ENV === 'production';

app.set('trust proxy', process.env.TRUST_PROXY || (IS_PRODUCTION ? 1 : false));

// ─── Security Headers with Helmet ───

app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://checkout.razorpay.com"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      fontSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://api-permitiq.codealgo.live", "wss://api-permitiq.codealgo.live", "https://checkout.razorpay.com"],
      frameSrc: ["'self'", "https://api.razorpay.com", "https://checkout.razorpay.com"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
  frameguard: { action: 'deny' },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  crossOriginOpenerPolicy: { policy: 'same-origin' },
}));

// ─── CORS: Exact production allowlist ───

const allowedOrigins = new Set<string>([
  'https://permitiq.codealgo.live',
  'https://www.permitiq.codealgo.live',
]);

const addAllowedOrigins = (value: string | undefined) => {
  if (!value) return;
  for (const rawOrigin of value.split(',')) {
    const trimmed = rawOrigin.trim();
    if (!trimmed) continue;
    try {
      const parsed = new URL(trimmed);
      if (parsed.protocol === 'https:' || (!IS_PRODUCTION && parsed.protocol === 'http:')) {
        allowedOrigins.add(parsed.origin);
      }
    } catch {
      logger.warn('Ignoring malformed CORS origin configuration');
    }
  }
};

addAllowedOrigins(process.env.CORS_ORIGIN);
addAllowedOrigins(process.env.FRONTEND_URL);
addAllowedOrigins(process.env.CORS_ALLOWED_ORIGINS);

// Allow localhost only in non-production
if (!IS_PRODUCTION) {
  allowedOrigins.add('http://localhost:3000');
  allowedOrigins.add('http://127.0.0.1:3000');
}

const isOriginAllowed = (origin: string | undefined): boolean => {
  if (!origin) {
    return true; // Allow direct navigation, local health checks (curl), same-origin
  }
  
  return allowedOrigins.has(origin);
};

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      if (isOriginAllowed(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`Not allowed by CORS (Socket.IO): ${origin}`));
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
      callback(new Error(`Not allowed by CORS (Express): ${origin}`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'X-CSRF-Token', 'x-csrf-token', 'X-Request-ID']
}));

// ─── Production middleware stack ───

// Cookie parser (before auth routes)
app.use(cookieParser());

// Request ID generation (before everything else)
app.use(requestIdMiddleware);

// Body parsing — webhook route needs raw body for signature verification
app.use('/api/billing/webhook', express.raw({ type: 'application/json' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Input sanitization
app.use(sanitizeRequestBody);

// Structured request logging
app.use(requestLoggingMiddleware);

// Abuse detection
app.use(abuseDetectionMiddleware);

// CSRF Protection
app.use(csrfProtection);

// Rate limiting
app.use('/api', apiLimiter);

// ─── Health & Readiness Endpoints ───

// Minimal public liveness probe
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

// Minimal public readiness probe (checks DB only)
app.get('/ready', async (req, res) => {
  try {
    const pool = (await import('./db')).default;
    await pool.query('SELECT 1');
    res.status(200).json({ status: 'ready' });
  } catch (err) {
    res.status(503).json({ status: 'not_ready' });
  }
});

// Protected detailed health checks — require admin auth
app.get('/health/ai', requireAdminForHealth, async (req, res) => {
  try {
    const { breakersRegistry } = await import('./services/circuit-breaker');
    const { GeminiClient } = await import('./services/gemini.client');
    const { AiProviderService } = await import('./services/provider.service');

    const breakersStats: Record<string, any> = {};
    for (const [name, breaker] of Object.entries(breakersRegistry)) {
      breakersStats[name] = breaker.getStats();
    }

    const providerStats = AiProviderService.getStats();
    const priorityList = AiProviderService.getPriorityList();
    
    let fallbackProvider = 'none';
    for (const p of priorityList) {
      if (p !== 'gemini' && !AiProviderService.isCoolingDown(p)) {
        fallbackProvider = p;
        break;
      }
    }

    const isProjectQuotaExhausted = GeminiClient.isProjectQuotaExhausted();
    const projectCooldownRemainingMs = GeminiClient.getProjectCoolDownRemainingMs();

    let isAiAvailable = false;
    for (const p of priorityList) {
      if (!AiProviderService.isCoolingDown(p)) {
        isAiAvailable = true;
        break;
      }
    }

    res.status(200).json({
      status: 'healthy',
      connectivity: isAiAvailable ? 'connected' : 'degraded',
      breakers: breakersStats,
      aiAvailable: isAiAvailable,
      providers: providerStats,
      priorityList,
      projectQuota: {
        exhausted: isProjectQuotaExhausted,
        cooldownRemainingMs: projectCooldownRemainingMs,
      },
      fallbackProvider,
    });
  } catch (err: any) {
    res.status(500).json({ status: 'error' });
  }
});

app.get('/health/backend', requireAdminForHealth, async (req, res) => {
  try {
    const pool = (await import('./db')).default;
    await pool.query('SELECT 1');
    
    const { QueueWorker } = await import('./services/queue.service');
    const queueRunning = QueueWorker.isWorkerRunning();
    
    res.status(200).json({
      status: 'healthy',
      checks: {
        database: 'ok',
        queueWorker: queueRunning ? 'active' : 'inactive'
      }
    });
  } catch (err: any) {
    res.status(500).json({ status: 'unhealthy' });
  }
});

app.get('/health/kb', requireAdminForHealth, async (req, res) => {
  try {
    const { KnowledgeBaseValidationService } = await import('./services/kb-validation.service');
    const missingBooks = KnowledgeBaseValidationService.getMissingBooks();
    
    res.status(200).json({
      status: missingBooks.length === 0 ? 'healthy' : 'degraded',
      missingBooks
    });
  } catch (err: any) {
    res.status(500).json({ status: 'error' });
  }
});

app.get('/metrics', requireAdminForHealth, (req, res) => {
  updateSystemMetrics();

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

// Helper: protect health/metrics with admin token or API key
async function requireAdminForHealth(req: any, res: any, next: any) {
  // Allow via metrics API key
  const metricsKey = process.env.METRICS_API_KEY;
  if (metricsKey && req.headers['x-metrics-key'] === metricsKey) {
    return next();
  }

  // Allow via HttpOnly admin session cookie after validating DB role.
  const adminToken = req.cookies?.admin_session as string | undefined;
  if (adminToken) {
    try {
      const decoded = JwtService.verifyAdminToken(adminToken);
      const [rows]: any = await pool.query(
        'SELECT id, email, role FROM `user` WHERE id = ? AND role = ?',
        [decoded.id, 'admin']
      );
      if (rows.length > 0 && rows[0].email === decoded.email) {
        return next();
      }
    } catch (e) {
      // Fall through
    }
  }

  const token = req.cookies?.access_token || req.headers.authorization?.replace('Bearer ', '');
  if (token) {
    try {
      const decoded = JwtService.verifyUserToken(token);
      const [rows]: any = await pool.query(
        'SELECT id, role, tokenVersion FROM `user` WHERE id = ?',
        [decoded.id]
      );
      if (rows.length > 0 && rows[0].role === 'admin' && rows[0].tokenVersion === decoded.tokenVersion) {
        return next();
      }
    } catch (e) {
      // Fall through
    }
  }

  // In non-production, allow unauthenticated access for development
  if (!IS_PRODUCTION) {
    return next();
  }

  return res.status(403).json({ message: 'Access denied.' });
}

// ─── Socket.IO with Authentication ───

io.use((socket, next) => {
  try {
    // Try auth token from handshake
    const token = socket.handshake.auth?.token || 
                  socket.handshake.headers?.cookie?.split('access_token=')[1]?.split(';')[0];
    
    if (!token) {
      return next(new Error('Authentication required'));
    }

    const decoded = JwtService.verifyUserToken(token);
    (socket as any).userId = decoded.id;
    (socket as any).userEmail = decoded.email;
    next();
  } catch (error) {
    next(new Error('Authentication failed'));
  }
});

io.on('connection', (socket) => {
  const userId = (socket as any).userId;
  if (userId) {
    socket.join(`user:${userId}`);
    logger.debug('Authenticated user connected to socket', { userId, requestId: socket.id });
  }

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
