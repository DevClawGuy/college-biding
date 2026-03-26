import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import path from 'path';

import authRoutes from './routes/auth';
import listingRoutes from './routes/listings';
import bidRoutes, { setBidSocket } from './routes/bids';
import notificationRoutes from './routes/notifications';
import favoriteRoutes from './routes/favorites';

const app = express();
const server = createServer(app);
const io = new SocketServer(server, {
  cors: {
    origin: ['http://localhost:5173', 'http://localhost:3000'],
    methods: ['GET', 'POST'],
  },
});

// Set socket.io instance for bids
setBidSocket(io);

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/listings', listingRoutes);
app.use('/api/bids', bidRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/favorites', favoriteRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('join_listing', (listingId: string) => {
    socket.join(`listing:${listingId}`);
  });

  socket.on('leave_listing', (listingId: string) => {
    socket.leave(`listing:${listingId}`);
  });

  socket.on('join_user', (userId: string) => {
    socket.join(`user:${userId}`);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`DormBid server running on http://localhost:${PORT}`);
});
