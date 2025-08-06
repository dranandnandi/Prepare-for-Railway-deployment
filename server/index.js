import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { v4 as uuidv4 } from 'uuid';
import WhatsAppService from './services/WhatsAppService.js';
import MessageService from './services/MessageService.js';

console.log('🔥 === NODE.JS STARTUP DIAGNOSTIC LOG ===');
console.log('📦 All imports loaded successfully');
console.log('⏰ Process start time:', new Date().toISOString());
console.log('🔧 Node.js version:', process.version);
console.log('💻 Platform:', process.platform);
console.log('📁 Working directory:', process.cwd());

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const server = createServer(app);

// Environment-based configuration
const isProduction = process.env.NODE_ENV === 'production';
const isRailway = process.env.RAILWAY_ENVIRONMENT === 'production' || process.env.RAILWAY_PROJECT_ID;
const frontendUrl = isProduction ? process.env.RAILWAY_STATIC_URL || 'https://your-app.railway.app' : 'http://localhost:5173';

console.log('🌍 Environment:', {
  NODE_ENV: process.env.NODE_ENV,
  isProduction,
  isRailway,
  PORT: process.env.PORT
});

const io = new Server(server, {
  cors: {
    origin: frontendUrl,
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors({
  origin: frontendUrl,
  credentials: true
}));
app.use(express.json());

// Add request logging middleware
app.use((req, res, next) => {
  console.log(`📥 HTTP Request: ${req.method} ${req.path} from ${req.ip}`);
  console.log(`📋 Headers: ${JSON.stringify(req.headers, null, 2)}`);
  next();
});

// In production, serve the built React app
if (isProduction) {
  app.use(express.static(path.join(__dirname, '../dist')));
} else {
  app.use(express.static(path.join(__dirname, 'public')));
}

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}-${file.originalname}`;
    cb(null, uniqueName);
  }
});

const upload = multer({ 
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf' || file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF and image files are allowed'));
    }
  },
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Initialize services
const whatsappService = new WhatsAppService(io);
const messageService = new MessageService();

// Routes
app.get('/api/status', (req, res) => {
  res.json({
    status: 'online',
    whatsappConnected: whatsappService.isReady(),
    timestamp: new Date().toISOString()
  });
});

app.post('/api/send-message', async (req, res) => {
  try {
    const { phoneNumber, message, patientName, testName, reportDate, doctorName } = req.body;

    if (!phoneNumber || !message) {
      return res.status(400).json({
        success: false,
        error: 'Phone number and message are required'
      });
    }

    // Process message template
    const processedMessage = messageService.processTemplate(message, {
      patientName,
      testName,
      reportDate,
      doctorName,
      labName: 'MedLab Systems'
    });

    const messageId = await whatsappService.sendMessage(phoneNumber, processedMessage);
    
    // Log the message
    messageService.logMessage({
      id: messageId,
      phoneNumber,
      message: processedMessage,
      status: 'sent',
      timestamp: new Date().toISOString(),
      patientName,
      testName
    });

    res.json({
      success: true,
      messageId,
      processedMessage
    });

  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.post('/api/send-report', upload.single('report'), async (req, res) => {
  try {
    const { phoneNumber, message, patientName, testName, reportDate, doctorName } = req.body;
    const reportFile = req.file;

    if (!phoneNumber || !message) {
      return res.status(400).json({
        success: false,
        error: 'Phone number and message are required'
      });
    }

    // Process message template
    const processedMessage = messageService.processTemplate(message, {
      patientName,
      testName,
      reportDate,
      doctorName,
      labName: 'MedLab Systems'
    });

    const messageId = await whatsappService.sendMessageWithAttachment(
      phoneNumber, 
      processedMessage, 
      reportFile ? reportFile.path : null
    );
    
    // Log the message
    messageService.logMessage({
      id: messageId,
      phoneNumber,
      message: processedMessage,
      status: 'sent',
      timestamp: new Date().toISOString(),
      patientName,
      testName,
      hasAttachment: !!reportFile
    });

    res.json({
      success: true,
      messageId,
      processedMessage,
      attachmentSent: !!reportFile
    });

  } catch (error) {
    console.error('Error sending report:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.get('/api/messages', (req, res) => {
  const messages = messageService.getMessages();
  res.json(messages);
});

app.post('/api/generate-qr', async (req, res) => {
  try {
    await whatsappService.generateQR();
    res.json({ success: true, message: 'QR generation initiated' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Health check endpoint for Railway
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    port: process.env.PORT || 3001,
    railway: isRailway
  });
});

// Basic test route
app.get('/', (req, res) => {
  if (isProduction) {
    res.sendFile(path.join(__dirname, '../dist/index.html'));
  } else {
    res.json({ 
      message: 'WhatsApp LIMS Integration Server', 
      status: 'running',
      environment: process.env.NODE_ENV || 'development'
    });
  }
});

// Basic API status endpoint
app.get('/api/status', (req, res) => {
  res.json({
    status: 'ok',
    whatsapp: whatsappService.isReady(),
    timestamp: new Date().toISOString()
  });
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  // Send current WhatsApp status
  socket.emit('whatsapp-status', {
    isReady: whatsappService.isReady(),
    timestamp: new Date().toISOString()
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// In production, catch-all handler to serve React app
if (isProduction) {
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../dist/index.html'));
  });
}

// Initialize WhatsApp service with error handling
let whatsappInitialized = false;
try {
  console.log('🔄 Initializing WhatsApp service...');
  
  // In production, delay WhatsApp initialization to let server start first
  if (isProduction) {
    console.log('🚀 Production mode: Starting server first, WhatsApp will initialize after 10 seconds');
    setTimeout(() => {
      try {
        whatsappService.initialize();
        whatsappInitialized = true;
        console.log('✅ WhatsApp service initialization started (delayed)');
      } catch (error) {
        console.error('❌ WhatsApp service initialization failed (delayed):', error);
      }
    }, 10000); // 10 second delay in production
  } else {
    whatsappService.initialize();
    whatsappInitialized = true;
    console.log('✅ WhatsApp service initialization started');
  }
} catch (error) {
  console.error('❌ WhatsApp service initialization failed:', error);
  console.log('🔄 Server will continue without WhatsApp initially...');
}

// Add production error handling
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  // Don't exit immediately in production, log and continue
  if (process.env.NODE_ENV === 'production') {
    console.error('Server continuing despite uncaught exception...');
  } else {
    process.exit(1);
  }
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit on unhandled rejections in production
});

// Add startup logging
console.log('🚀 Starting LIMS WhatsApp Integration Server...');
console.log('📅 Startup Time:', new Date().toISOString());
console.log('🌍 Environment Check:', {
  NODE_ENV: process.env.NODE_ENV,
  PORT: process.env.PORT,
  HOST: process.env.HOST,
  RAILWAY_PROJECT_ID: process.env.RAILWAY_PROJECT_ID ? '✅ Railway Environment Detected' : '❌ Local Environment'
});

const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || '0.0.0.0';

console.log('🔧 Server Configuration:', {
  PORT,
  HOST,
  NODE_ENV: process.env.NODE_ENV,
  RAILWAY_PROJECT_ID: process.env.RAILWAY_PROJECT_ID ? 'Present' : 'Not Present'
});

console.log('⏳ STEP 1: About to call server.listen()...');
console.log(`⚡ Attempting to bind to ${HOST}:${PORT}`);

server.listen(PORT, HOST, () => {
  console.log('✅ SUCCESS: Server.listen() callback executed!');
  console.log(`🚀 LIMS WhatsApp Integration Server running on ${HOST}:${PORT}`);
  console.log(`📡 Server successfully bound to ${HOST}:${PORT}`);
  console.log('🎯 Node.js HTTP Server Status: ACTIVE & LISTENING');
  console.log('⏰ Server Start Time:', new Date().toISOString());
  
  if (isProduction) {
    console.log(`🌐 Production app should be available via Railway domain`);
    console.log('🔗 Expected URL: https://prepare-for-railway-deployment-production.up.railway.app');
  } else {
    console.log(`📱 Dashboard available at http://localhost:5173`);
  }
  
  console.log('� Available Endpoints:');
  console.log('   💚 Health check: /health');
  console.log('   📊 API status: /api/status');
  console.log('   🏠 Main app: /');
  console.log('   📨 Send message: POST /api/send-message');
  console.log('   📄 Send report: POST /api/send-report');
  console.log('   📱 Generate QR: POST /api/generate-qr');
  
  console.log('🎉 NODE.JS SERVER IS FULLY OPERATIONAL!');
  console.log('🔄 Railway should now be able to route traffic to this server');
  
  // Add heartbeat logging every 30 seconds to confirm server stays alive
  setInterval(() => {
    console.log('💓 HEARTBEAT:', new Date().toISOString(), '- Server is alive and responsive');
  }, 30000);
  
}).on('error', (err) => {
  console.error('❌ CRITICAL: Server.listen() failed!');
  console.error('❌ Server failed to start:', err);
  console.error('❌ Error Code:', err.code);
  console.error('❌ Error Message:', err.message);
  
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use`);
    console.error('💡 This means another process is using this port');
  }
  if (err.code === 'EACCES') {
    console.error(`❌ Permission denied for port ${PORT}`);
    console.error('💡 This usually means port requires elevated privileges');
  }
  
  console.error('💀 Node.js server FAILED to start - exiting process');
  process.exit(1);
});

console.log('⏳ STEP 2: server.listen() call completed, waiting for callback...');