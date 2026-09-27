require('dotenv').config();

const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { MongoClient } = require('mongodb');

const app = express();

// ── MongoDB Connection ────────────────────────────────────────────────────────
const mongoClient = new MongoClient(process.env.MONGO_URI || 'mongodb://localhost:27017', {
  serverSelectionTimeoutMS: 5000,
  maxIdleTimeMS: 60000,
});

let connected = false;

async function connectDb() {
  if (connected) return;

  try {
    await mongoClient.connect();
    connected = true;
    console.log('🍃 MongoDB connected');
  } catch (err) {
    console.error('❌ MongoDB connection failed:', err.message);
    throw err;
  }
}

async function db() {
  if (!connected) {
    await connectDb();
  }
  return mongoClient.db('analyticsDb');
}

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors({
  origin: [
    'https://frutasdelcampo.com',
    'https://littleanimeshop.com',
    'https://frutalesdelcarmelo.com',
    'http://localhost:4200',  // Angular dev
    'http://localhost:3000',  // React dev
    'http://localhost:3001',  // Local testing
  ],
  methods: ['GET', 'POST', 'PATCH'],
  allowedHeaders: ['Content-Type', 'X-API-Key', 'X-Master-Key'],
}));

app.use(express.json());
app.use(express.static('public'));

// Rate limiting - 60 requests per minute
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later' }
});

app.use(limiter);

// ── Health Check ──────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    mongodb: connected ? 'connected' : 'disconnected'
  });
});

// ── Routes ────────────────────────────────────────────────────────────────────
const createTrackRouter = require('./routes/track');
const createAdminRouter = require('./routes/admin');

app.use('/', createTrackRouter(db));
app.use('/admin', createAdminRouter(db));

// ── Start Server ──────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3002;
const HOST = process.env.HOST || '0.0.0.0';

app.listen(PORT, HOST, async () => {
  console.log(`📊 Analytics Server running on ${HOST}:${PORT}`);
  console.log(`📡 Environment: ${process.env.NODE_ENV || 'development'}`);

  // Connect to MongoDB in background
  try {
    await connectDb();
  } catch (err) {
    console.warn('⚠️  MongoDB connection failed on startup, will retry on first request');
  }
});

// ── Shutdown Handlers ─────────────────────────────────────────────────────────
async function shutdown(signal) {
  console.log(`\n${signal} received, shutting down gracefully...`);

  try {
    await mongoClient.close();
    console.log('🍃 MongoDB connection closed');
  } catch (err) {
    console.error('Error closing MongoDB:', err);
  }

  process.exit(0);
}

process.once('SIGTERM', () => shutdown('SIGTERM'));
process.once('SIGINT', () => shutdown('SIGINT'));
