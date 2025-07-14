require('dotenv').config({ debug: false });
const express = require('express');
const mongoose = require('mongoose');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const morgan = require('morgan');
const cors = require('cors');
const colors = require('colors');
const connectDB = require('./config/db');
const errorHandler = require('./middleware/error');

// Initialize Express app
const app = express();

// ==================================================
// 1. Middleware Stack
// ==================================================
app.use(helmet());
app.use(mongoSanitize());
app.use(cors());
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    status: 'error',
    message: 'Too many requests from this IP, please try again later'
  },
  headers: true
});
app.use(limiter);

// ==================================================
// 2. Server Startup Sequence
// ==================================================
const startServer = async () => {
  try {
    // Database Connection
    const conn = await connectDB();
    
    // Development logging
    if (process.env.NODE_ENV === 'development') {
      app.use(morgan('dev'));
      console.log('🟢 Development middleware loaded'.yellow);
    }

    // ==================================================
    // 3. API Routes
    // ==================================================
    app.use('/api/auth', require('./routes/authRoutes'));
    app.use('/api/products', require('./routes/productRoutes'));
    app.use('/api/cart', require('./routes/cartRoutes'));
    app.use('/api/orders', require('./routes/orderRoutes'));

    // ==================================================
    // 4. Health Check Endpoint
    // ==================================================
    app.get('/api/health', (req, res) => {
      res.status(200).json({
        status: 'healthy',
        uptime: process.uptime(),
        database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV
      });
    });

    // ==================================================
    // 5. Error Handling
    // ==================================================
    app.use(errorHandler);

    // ==================================================
    // 6. Start Server
    // ==================================================
    const PORT = process.env.PORT || 5000;
    const server = app.listen(PORT, () => {
      console.log('\n' + '='.repeat(60).blue);
      console.log(`🟢 Server Status:`.bold + ` Running in ${process.env.NODE_ENV || 'development'} mode`.green);
      console.log(`🟢 Port:`.bold + ` ${PORT}`.green);
      console.log(`🟢 MongoDB:`.bold + ` ${conn.connection.host}/${conn.connection.name}`.green);
      console.log(`🟢 PID:`.bold + ` ${process.pid}`.green);
      console.log('='.repeat(60).blue + '\n');
    });

    // ==================================================
    // 7. Graceful Shutdown Handlers
    // ==================================================
    process.on('SIGTERM', () => {
      console.log('\n' + '='.repeat(60).yellow);
      console.log('🟡 SIGTERM received. Shutting down gracefully...'.yellow.bold);
      console.log('='.repeat(60).yellow);
      
      server.close(() => {
        mongoose.connection.close(false, () => {
          console.log('\n' + '='.repeat(60).red);
          console.log('🔴 Server terminated'.red.bold);
          console.log('='.repeat(60).red + '\n');
          process.exit(0);
        });
      });
    });

    process.on('unhandledRejection', (err) => {
      console.error('\n' + '='.repeat(60).red);
      console.error(`🔴 Unhandled Rejection: ${err.message}`.red.bold);
      console.error('='.repeat(60).red);
      server.close(() => process.exit(1));
    });

    process.on('uncaughtException', (err) => {
      console.error('\n' + '='.repeat(60).red);
      console.error(`🔴 Uncaught Exception: ${err.message}`.red.bold);
      console.error('='.repeat(60).red);
      server.close(() => process.exit(1));
    });

  } catch (error) {
    console.error('\n' + '='.repeat(60).red);
    console.error(`🔴 Critical startup error: ${error.message}`.red.bold);
    console.error('='.repeat(60).red);
    process.exit(1);
  }
};

// Start the server
startServer();
