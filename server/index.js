require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const path = require('path');

const { router: authRouter } = require('./routes/auth');
const trialsRouter = require('./routes/trials');
const safetyRouter = require('./routes/safety');
const deviationsRouter = require('./routes/deviations');
const dashboardRouter = require('./routes/dashboard');
const auditRouter = require('./routes/audit');
const exportRouter = require('./routes/export');
const usersRouter = require('./routes/users');
const notificationsRouter = require('./routes/notifications');
const alertsRouter = require('./routes/alerts');
const consentRouter = require('./routes/consent');
const abdmRouter = require('./routes/abdm');
const complianceRouter = require('./routes/compliance');
const { setIO, runScheduledChecks, seedDemoNotifications } = require('./notifications');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'aiia_ctms_super_secret_jwt_key_sih2026_sih26046';

// ── HTTP server + Socket.io ────────────────────────────────────
const httpServer = http.createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Expose io to notification helpers
setIO(io);

// ── Socket.io auth middleware ──────────────────────────────────
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error('Authentication required'));
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    socket.userId = decoded.id;
    next();
  } catch {
    next(new Error('Invalid token'));
  }
});

io.on('connection', (socket) => {
  // Join a personal room so we can target this user
  socket.join(`user:${socket.userId}`);
  console.log(`[Socket.io] User ${socket.userId} connected`);

  socket.on('disconnect', () => {
    console.log(`[Socket.io] User ${socket.userId} disconnected`);
  });
});

// ── Express middleware ─────────────────────────────────────────
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logger
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// ── Health check ───────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    service: 'AIIA Clinical Trials Dashboard CTMS API',
    institution: 'All India Institute of Ayurveda',
    socketio: 'enabled',
    timestamp: new Date().toISOString()
  });
});

// ── API Routes ────────────────────────────────────────────────
app.use('/api/auth', authRouter);
app.use('/api/trials', trialsRouter);
app.use('/api/safety', safetyRouter);
app.use('/api/deviations', deviationsRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/audit', auditRouter);
app.use('/api/export', exportRouter);
app.use('/api/users', usersRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/alerts', alertsRouter);
app.use('/api/consent', consentRouter);
app.use('/api/abdm', abdmRouter);
app.use('/api/compliance', complianceRouter);

// ── Serve Frontend SPA in Production / AWS ────────────────────
const clientDistPath = path.join(__dirname, '../client/dist');
app.use(express.static(clientDistPath));

app.use((req, res, next) => {
  if (req.method !== 'GET' || req.path.startsWith('/api') || req.path.startsWith('/socket.io')) {
    return next();
  }
  const indexPath = path.join(clientDistPath, 'index.html');
  res.sendFile(indexPath, (err) => {
    if (err) {
      res.status(200).send('🌿 AIIA CTMS API Server is running. Client build ready for AWS.');
    }
  });
});

// ── Global Error Handler ──────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error occurred.'
  });
});

// ── Boot ──────────────────────────────────────────────────────
httpServer.listen(PORT, () => {
  console.log(`=====================================================`);
  console.log(`🌿 AIIA CTMS Server is running on http://localhost:${PORT}`);
  console.log(`🏥 All India Institute of Ayurveda - CTMS`);
  console.log(`🔔 Socket.io real-time notifications: enabled`);
  console.log(`=====================================================`);

  // Seed demo notifications once on first run
  setTimeout(() => {
    seedDemoNotifications();
    // Run deadline checks immediately on boot, then every 6 hours
    runScheduledChecks();
    setInterval(runScheduledChecks, 6 * 60 * 60 * 1000);
  }, 1500); // slight delay so DB is fully ready
});
