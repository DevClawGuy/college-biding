import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import path from 'path';

import { initializeDatabase } from './db/init';
import authRoutes from './routes/auth';
import listingRoutes from './routes/listings';
import bidRoutes, { setBidSocket } from './routes/bids';
import notificationRoutes from './routes/notifications';
import favoriteRoutes from './routes/favorites';

// Prevent crashes from killing the process
process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
});
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection:', reason);
});

const app = express();
const server = createServer(app);

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://houserush.vercel.app',
  'https://college-biding.vercel.app',
  process.env.CLIENT_URL,
].filter(Boolean) as string[];

const corsOptions = {
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

// CORS must be the VERY FIRST middleware
app.use(cors(corsOptions));

app.use(express.json());

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

const io = new SocketServer(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  },
});

setBidSocket(io);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/listings', listingRoutes);
app.use('/api/bids', bidRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/favorites', favoriteRoutes);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Socket.io
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  socket.on('join_listing', (listingId: string) => socket.join(`listing:${listingId}`));
  socket.on('leave_listing', (listingId: string) => socket.leave(`listing:${listingId}`));
  socket.on('join_user', (userId: string) => socket.join(`user:${userId}`));
  socket.on('disconnect', () => console.log('Client disconnected:', socket.id));
});

// Start server FIRST, then try DB init (server must listen even if DB fails)
const PORT = process.env.PORT || 3001;
server.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`HouseRush server running on http://0.0.0.0:${PORT}`);
});

// Initialize DB in background — don't block or crash if it fails
initializeDatabase().catch((err) => {
  console.error('Database initialization failed (server still running):', err);
});
