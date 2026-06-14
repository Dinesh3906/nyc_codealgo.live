import express from 'express';
import path from 'path';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { apiLimiter, authLimiter } from './middleware/rateLimit.middleware';
import authRoutes from './routes/auth.routes';
import planRoutes from './routes/plans.routes';
import billingRoutes from './routes/billing.routes';
import leadsRoutes from './routes/leads.routes';
import feedbackRoutes from './routes/feedback.routes';
import adminRoutes from './routes/admin.routes';
import notificationRoutes from './routes/notification.routes';

const app = express();

// Secure HTTP Headers with Helmet
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// Compress all responses to prevent ERR_CONTENT_LENGTH_MISMATCH through Nginx
app.use(compression());

const allowedOrigins = [
  'https://nyccodes.codealgo.live',
  'https://www.nyccodes.codealgo.live',
  'http://localhost:3000',
  process.env.CORS_ORIGIN,
  process.env.FRONTEND_URL
].filter(Boolean) as string[];

const isOriginAllowed = (origin: string | undefined): boolean => {
  console.log(`[CORS Check] Request Origin: "${origin}" | Allowed Origins List:`, allowedOrigins);
  if (!origin) return true; // Allow mobile apps or server-to-server calls
  const isAllowed = allowedOrigins.includes(origin) || 
                    origin.includes('codealgo.live') || 
                    origin.includes('localhost') || 
                    origin.includes('127.0.0.1');
  console.log(`[CORS Result] Origin "${origin}" allowed:`, isAllowed);
  return isAllowed;
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
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'X-Admin-Token', 'x-admin-token']
}));

app.use('/api/billing/webhook', express.raw({ type: 'application/json' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Apply rate limiting to all API requests
app.use('/api', apiLimiter);

// Request Logging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Socket.io for real-time scan progress
io.on('connection', (socket) => {
  console.log('User connected to socket:', socket.id);
  
  socket.on('disconnect', () => {
    console.log('User disconnected from socket');
  });
});

// Routes - auth gets its own stricter rate limiter
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/plans', planRoutes);
app.use('/api/upload-plan', planRoutes); // Convenience alias
app.use('/api/billing', billingRoutes);
app.use('/api/leads', leadsRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notifications', notificationRoutes);

// Export for server.ts
export { app, httpServer, io };
