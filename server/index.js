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

// Environment-based configuration
const isProduction = process.env.NODE_ENV === 'production';
const frontendUrl = isProduction ? process.env.RAILWAY_STATIC_URL || 'https://your-app.railway.app' : 'http://localhost:5173';

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

// Initialize WhatsApp service
whatsappService.initialize();

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🚀 LIMS WhatsApp Integration Server running on port ${PORT}`);
  if (isProduction) {
    console.log(`🌐 Production app available at ${frontendUrl}`);
  } else {
    console.log(`📱 Dashboard available at http://localhost:5173`);
  }
  console.log(`🔌 API endpoint: http://localhost:${PORT}/api`);
});