require('dotenv').config();
const express      = require('express');
const cors         = require('cors');
const helmet       = require('helmet');
const { createServer } = require('http');
const { Server }   = require('socket.io');
const rateLimit    = require('express-rate-limit');

const authRoutes   = require('./routes/auth');
const cycleRoutes  = require('./routes/cycle');
const logRoutes    = require('./routes/logs');
const communityRoutes = require('./routes/community');
const messageRoutes   = require('./routes/messages');
const aiRoutes        = require('./routes/ai');
const userRoutes      = require('./routes/users');

const { authenticateSocket } = require('./middleware/auth');

const app    = express();
const server = createServer(app);
const io     = new Server(server, {
  cors: { origin: process.env.CLIENT_URL || 'http://localhost:3000', credentials: true }
});

// ── Middleware ────────────────────────────────────────────────
app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:3000', credentials: true }));
app.use(express.json());

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 200, standardHeaders: true });
app.use(limiter);

// ── Routes ────────────────────────────────────────────────────
app.use('/api/auth',      authRoutes);
app.use('/api/users',     userRoutes);
app.use('/api/cycles',    cycleRoutes);
app.use('/api/logs',      logRoutes);
app.use('/api/community', communityRoutes);
app.use('/api/messages',  messageRoutes);
app.use('/api/ai',        aiRoutes);

app.get('/api/health', (_req, res) => res.json({ status: 'ok', ts: new Date() }));

// ── Socket.IO — Real-time DMs ─────────────────────────────────
io.use(authenticateSocket);

const onlineUsers = new Map(); // userId → socketId

io.on('connection', (socket) => {
  const userId = socket.user.id;
  onlineUsers.set(userId, socket.id);
  socket.broadcast.emit('user:online', { userId });

  socket.on('join:conversation', (conversationId) => {
    socket.join(`conv:${conversationId}`);
  });

  socket.on('send:message', async (data) => {
    // data: { conversationId, body }
    try {
      const db = require('./db');
      // Verify user is a member
      const check = await db.query(
        'SELECT 1 FROM conversation_members WHERE conversation_id=$1 AND user_id=$2',
        [data.conversationId, userId]
      );
      if (check.rowCount === 0) return;

      const result = await db.query(
        `INSERT INTO messages (conversation_id, sender_id, body)
         VALUES ($1,$2,$3) RETURNING *`,
        [data.conversationId, userId, data.body]
      );
      const msg = result.rows[0];
      io.to(`conv:${data.conversationId}`).emit('new:message', msg);
    } catch (err) {
      console.error('Socket message error:', err);
    }
  });

  socket.on('message:read', async ({ conversationId }) => {
    await require('./db').query(
      `UPDATE messages SET is_read=TRUE
       WHERE conversation_id=$1 AND sender_id!=$2 AND is_read=FALSE`,
      [conversationId, userId]
    );
    socket.to(`conv:${conversationId}`).emit('messages:read', { conversationId, by: userId });
  });

  socket.on('disconnect', () => {
    onlineUsers.delete(userId);
    socket.broadcast.emit('user:offline', { userId });
  });
});

// ── Start ─────────────────────────────────────────────────────
const PORT = process.env.PORT || 4000;
server.listen(PORT, () => console.log(`🌸 BloomCycle API running on port ${PORT}`));

module.exports = { app, io };
