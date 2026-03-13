const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');

// Load environment variables
dotenv.config();

// Import routes
const sessionRoutes = require('./routes/sessionRoutes');
const scoreRoutes = require('./routes/scoreRoutes');
const reportRoutes = require('./routes/reportRoutes');
const authRoutes = require('./routes/authRoutes');
const userDataRoutes = require('./routes/userDataRoutes');

const app = express();

// --------------- Middleware ---------------
// Allow frontend + Chrome extension (extension works even when frontend tab is closed)
app.use(cors({
  origin: (origin, callback) => {
    const allowed =
      !origin ||
      origin === 'http://localhost:5173' ||
      (typeof origin === 'string' && origin.startsWith('chrome-extension://')) ||
      (process.env.NODE_ENV === 'production' && origin === 'https://your-production-domain.com');
    callback(null, allowed);
  },
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));

// --------------- Routes ---------------
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'VoxPath API is running' });
});

app.use('/api/sessions', sessionRoutes);
app.use('/api/score', scoreRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/user-data', userDataRoutes);

// --------------- Error Handling ---------------
app.use(errorHandler);

// --------------- Start Server ---------------
const PORT = process.env.PORT || 5001;

const startServer = async () => {
  try {
    await connectDB();
  } catch (error) {
    console.error('❌ Failed to connect to database:', error.message);
    console.log('⚠️  Proceeding to start server without database...');
  }

  const server = app.listen(PORT, () => {
    console.log(`✅ VoxPath server running on port ${PORT}`);
    console.log(`📍 Health check: http://localhost:${PORT}/api/health`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`❌ Port ${PORT} is already in use. Please stop other processes or change the PORT in .env.`);
      process.exit(1);
    } else {
      console.error('❌ Server error:', err.message);
    }
  });
};

startServer();
