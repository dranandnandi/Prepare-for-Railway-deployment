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

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:4173",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors({
  origin: "http://localhost:4173"
}));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

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

// Graceful shutdown handling
const gracefulShutdown = async (signal) => {
  console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);
  
  try {
    // Stop accepting new connections
    server.close(() => {
      console.log('🔌 HTTP server closed');
    });
    
    // Gracefully shutdown WhatsApp service
    await whatsappService.gracefulShutdown();
    
    console.log('✅ Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during graceful shutdown:', error);
    process.exit(1);
  }
};

// Register shutdown handlers
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('unhandledRejection');
});

// Routes
app.get('/api/status', (req, res) => {
  const queueStatus = whatsappService.getQueueStatus();
  const messageStats = messageService.getMessageStats();
  
  res.json({
    status: 'online',
    whatsappConnected: whatsappService.isReady(),
    timestamp: new Date().toISOString(),
    queue: queueStatus,
    messageStats,
    uptime: process.uptime(),
    memory: process.memoryUsage()
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
      status: 'queued',
      timestamp: new Date().toISOString(),
      patientName,
      testName,
      type: 'text'
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
      status: 'queued',
      timestamp: new Date().toISOString(),
      patientName,
      testName,
      hasAttachment: !!reportFile,
      type: 'attachment'
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
  const stats = messageService.getMessageStats();
  
  res.json(messages);
});

app.get('/api/messages/stats', (req, res) => {
  const stats = messageService.getMessageStats();
  const failedMessages = messageService.getFailedMessages();
  const recentActivity = messageService.getRecentActivity();
  
  res.json({
    stats,
    failedMessages,
    recentActivity: recentActivity.length
  });
});

app.get('/api/messages/failed', (req, res) => {
  const limit = parseInt(req.query.limit) || 10;
  const failedMessages = messageService.getFailedMessages(limit);
  res.json(failedMessages);
});

app.post('/api/generate-qr', async (req, res) => {
  try {
    await whatsappService.generateQR();
    res.json({ success: true, message: 'QR generation initiated' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  // Send current WhatsApp status
  const queueStatus = whatsappService.getQueueStatus();
  const messageStats = messageService.getMessageStats();
  
  socket.emit('whatsapp-status', {
    isReady: whatsappService.isReady(),
    timestamp: new Date().toISOString(),
    queue: queueStatus,
    stats: messageStats
  });

  // Send periodic status updates
  const statusInterval = setInterval(() => {
    if (socket.connected) {
      const currentQueueStatus = whatsappService.getQueueStatus();
      const currentMessageStats = messageService.getMessageStats();
      
      socket.emit('status-update', {
        queue: currentQueueStatus,
        stats: currentMessageStats,
        timestamp: new Date().toISOString()
      });
    }
  }, 10000); // Every 10 seconds

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    clearInterval(statusInterval);
  });
});

// Initialize WhatsApp service
whatsappService.initialize();

const PORT = process.env.PORT || 3001;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 LIMS WhatsApp Integration Server running on port ${PORT}`);
  
  // Dynamic dashboard URL based on environment
  console.log(`📱 Backend API available at http://localhost:${PORT}`);
  console.log(`📱 Frontend Dashboard: Configure FRONTEND_URL environment variable`);
  console.log(`🔌 API endpoint: http://localhost:${PORT}/api`);
});