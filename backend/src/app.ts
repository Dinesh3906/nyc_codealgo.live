import express from 'express';
import path from 'path';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import authRoutes from './routes/auth.routes';
import planRoutes from './routes/plans.routes';
import billingRoutes from './routes/billing.routes';
import leadsRoutes from './routes/leads.routes';
import feedbackRoutes from './routes/feedback.routes';

const app = express();
const allowedOrigins = [
  'https://nyccodes.codealgo.live',
  'https://www.nyccodes.codealgo.live',
  'http://localhost:3000',
  process.env.CORS_ORIGIN,
  process.env.FRONTEND_URL
].filter(Boolean) as string[];

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(null, true); // Allow for production stability
      }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true
  },
});

app.use(cors({ 
  origin: true, // Allow all origins to resolve production CORS issues permanently
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
}));
app.use('/api/billing/webhook', express.raw({ type: 'application/json' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

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

// Debug Route (Temporary)
app.get('/api/debug-keys', (req, res) => {
  const groq = process.env.GROQ_API_KEY || '';
  const pinecone = process.env.PINECONE_API_KEY || '';
  res.json({
    groq_prefix: groq.substring(0, 7),
    groq_length: groq.length,
    pinecone_prefix: pinecone.substring(0, 7),
    pinecone_length: pinecone.length,
    cors_origin: process.env.CORS_ORIGIN || 'NOT SET'
  });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/plans', planRoutes);
app.use('/api/upload-plan', planRoutes); // Convenience alias
app.use('/api/billing', billingRoutes);
app.use('/api/leads', leadsRoutes);
app.use('/api/feedback', feedbackRoutes);

// Export for server.ts
export { app, httpServer, io };
