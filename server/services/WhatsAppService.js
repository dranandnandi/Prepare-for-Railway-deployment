import pkg from 'whatsapp-web.js';
const { Client, LocalAuth, MessageMedia } = pkg;
import qrcode from 'qrcode-terminal';
import fs from 'fs';
import path from 'path';

class WhatsAppService {
  constructor(io) {
    this.io = io;
    this.client = null;
    this.isClientReady = false;
    this.qrCodeData = null;
    this.messageQueue = [];
    this.isProcessingQueue = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 30000; // 30 seconds
    this.messageDelay = 2000; // 2 seconds between messages
    this.isShuttingDown = false;
  }

  async initialize() {
    console.log('🔄 Initializing WhatsApp client...');
    
    try {
      // Ensure sessions directory exists
      const sessionsDir = path.join(process.cwd(), 'server', 'sessions');
      if (!fs.existsSync(sessionsDir)) {
        fs.mkdirSync(sessionsDir, { recursive: true });
        console.log('📁 Created sessions directory:', sessionsDir);
      }

      this.client = new Client({
        authStrategy: new LocalAuth({
          clientId: 'lims-whatsapp-bot',
          dataPath: sessionsDir
        }),
        puppeteer: {
          headless: true,
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--single-process',
            '--disable-gpu',
            '--disable-software-rasterizer',
            '--disable-background-timer-throttling',
            '--disable-backgrounding-occluded-windows',
            '--disable-renderer-backgrounding',
            '--disable-features=TranslateUI',
            '--disable-ipc-flooding-protection'
          ],
          executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined
        }
      });

      this.setupEventHandlers();
      await this.client.initialize();
    } catch (error) {
      console.error('❌ Failed to initialize WhatsApp client:', error);
      this.handleInitializationError(error);
      throw error;
    }
  }

  setupEventHandlers() {
    this.client.on('qr', (qr) => {
      console.log('📱 QR Code received, scan with WhatsApp');
      qrcode.generate(qr, { small: true });
      
      this.qrCodeData = qr;
      this.reconnectAttempts = 0; // Reset reconnect attempts on new QR
      this.io.emit('qr-code', { qr });
    });

    this.client.on('ready', () => {
      console.log('✅ WhatsApp client is ready!');
      this.isClientReady = true;
      this.reconnectAttempts = 0;
      this.qrCodeData = null;
      
      this.io.emit('whatsapp-status', {
        isReady: true,
        timestamp: new Date().toISOString()
      });

      // Start processing message queue
      this.startQueueProcessor();
    });

    this.client.on('authenticated', () => {
      console.log('🔐 WhatsApp client authenticated');
      this.io.emit('whatsapp-authenticated', {
        timestamp: new Date().toISOString()
      });
    });

    this.client.on('auth_failure', (msg) => {
      console.error('❌ Authentication failed:', msg);
      this.isClientReady = false;
      this.io.emit('whatsapp-auth-failure', { 
        error: msg,
        timestamp: new Date().toISOString()
      });
      
      // Attempt to reinitialize after auth failure
      this.scheduleReconnect('Authentication failed');
    });

    this.client.on('disconnected', (reason) => {
      console.log('🔌 WhatsApp client disconnected:', reason);
      this.isClientReady = false;
      this.io.emit('whatsapp-status', {
        isReady: false,
        reason,
        timestamp: new Date().toISOString()
      });

      // Only attempt reconnect if not shutting down
      if (!this.isShuttingDown) {
        this.scheduleReconnect(reason);
      }
    });

    this.client.on('message_create', (message) => {
      if (message.fromMe) {
        console.log('📤 Message sent confirmation:', message.id._serialized);
        this.io.emit('message-sent', {
          id: message.id._serialized,
          to: message.to,
          body: message.body,
          timestamp: new Date(message.timestamp * 1000).toISOString()
        });
      }
    });

    this.client.on('message_ack', (message, ack) => {
      const ackStatus = this.getAckStatus(ack);
      console.log(`📋 Message ${message.id._serialized} status: ${ackStatus}`);
      
      this.io.emit('message-update', {
        id: message.id._serialized,
        status: ackStatus,
        timestamp: new Date().toISOString()
      });
    });
  }

  getAckStatus(ack) {
    switch (ack) {
      case 1: return 'sent';
      case 2: return 'received';
      case 3: return 'read';
      default: return 'pending';
    }
  }

  async scheduleReconnect(reason) {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error(`❌ Max reconnection attempts (${this.maxReconnectAttempts}) reached. Manual intervention required.`);
      this.io.emit('whatsapp-error', {
        error: 'Max reconnection attempts reached',
        reason,
        timestamp: new Date().toISOString()
      });
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * this.reconnectAttempts; // Exponential backoff
    
    console.log(`🔄 Scheduling reconnection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay/1000} seconds...`);
    
    setTimeout(async () => {
      try {
        console.log(`🔄 Reconnection attempt ${this.reconnectAttempts}...`);
        await this.destroy();
        await this.initialize();
      } catch (error) {
        console.error('❌ Reconnection failed:', error);
        this.scheduleReconnect('Reconnection failed');
      }
    }, delay);
  }

  handleInitializationError(error) {
    this.io.emit('whatsapp-error', { 
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }

  // Message Queue Management
  addToQueue(messageData) {
    const queueItem = {
      id: Date.now() + Math.random(),
      ...messageData,
      timestamp: new Date().toISOString(),
      attempts: 0,
      maxAttempts: 3
    };
    
    this.messageQueue.push(queueItem);
    console.log(`📝 Added message to queue. Queue length: ${this.messageQueue.length}`);
    
    if (!this.isProcessingQueue && this.isClientReady) {
      this.startQueueProcessor();
    }
    
    return queueItem.id;
  }

  async startQueueProcessor() {
    if (this.isProcessingQueue || !this.isClientReady) {
      return;
    }

    this.isProcessingQueue = true;
    console.log('🚀 Starting message queue processor...');

    while (this.messageQueue.length > 0 && this.isClientReady && !this.isShuttingDown) {
      const messageData = this.messageQueue.shift();
      
      try {
        await this.processQueueItem(messageData);
        
        // Delay between messages to avoid rate limiting
        if (this.messageQueue.length > 0) {
          await this.delay(this.messageDelay);
        }
      } catch (error) {
        console.error('❌ Error processing queue item:', error);
        await this.handleQueueItemError(messageData, error);
      }
    }

    this.isProcessingQueue = false;
    console.log('⏸️ Message queue processor stopped');
  }

  async processQueueItem(messageData) {
    console.log(`📤 Processing message: ${messageData.phoneNumber}`);
    
    const formattedNumber = this.formatPhoneNumber(messageData.phoneNumber);
    const chatId = `${formattedNumber}@c.us`;
    
    let sentMessage;
    
    if (messageData.filePath && fs.existsSync(messageData.filePath)) {
      const media = MessageMedia.fromFilePath(messageData.filePath);
      sentMessage = await this.client.sendMessage(chatId, media, {
        caption: messageData.message
      });
      
      // Clean up file after sending
      setTimeout(() => {
        if (fs.existsSync(messageData.filePath)) {
          fs.unlinkSync(messageData.filePath);
          console.log('🗑️ Cleaned up uploaded file:', messageData.filePath);
        }
      }, 5000);
    } else {
      sentMessage = await this.client.sendMessage(chatId, messageData.message);
    }
    
    console.log(`✅ Message sent successfully: ${sentMessage.id._serialized}`);
    
    this.io.emit('message-update', {
      id: messageData.originalId || sentMessage.id._serialized,
      status: 'sent',
      timestamp: new Date().toISOString()
    });
    
    return sentMessage.id._serialized;
  }

  async handleQueueItemError(messageData, error) {
    messageData.attempts++;
    
    if (messageData.attempts < messageData.maxAttempts) {
      console.log(`🔄 Retrying message (attempt ${messageData.attempts}/${messageData.maxAttempts}): ${messageData.phoneNumber}`);
      this.messageQueue.unshift(messageData); // Add back to front of queue
    } else {
      console.error(`❌ Message failed after ${messageData.maxAttempts} attempts: ${messageData.phoneNumber}`);
      
      this.io.emit('message-update', {
        id: messageData.originalId,
        status: 'failed',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  async sendMessage(phoneNumber, message) {
    if (!this.isClientReady) {
      throw new Error('WhatsApp client is not ready');
    }

    const messageId = this.addToQueue({
      phoneNumber,
      message,
      originalId: Date.now().toString()
    });

    return messageId;
  }

  async sendMessageWithAttachment(phoneNumber, message, filePath) {
    if (!this.isClientReady) {
      throw new Error('WhatsApp client is not ready');
    }

    const messageId = this.addToQueue({
      phoneNumber,
      message,
      filePath,
      originalId: Date.now().toString()
    });

    return messageId;
  }

  formatPhoneNumber(phoneNumber) {
    // Remove all non-numeric characters
    let cleaned = phoneNumber.replace(/\D/g, '');
    
    // Add country code if missing (assuming US/international format)
    if (!cleaned.startsWith('1') && cleaned.length === 10) {
      cleaned = '1' + cleaned;
    }
    
    return cleaned;
  }

  async generateQR() {
    if (this.isClientReady) {
      throw new Error('WhatsApp is already connected');
    }
    
    console.log('🔄 Generating new QR code...');
    
    // Destroy current client and reinitialize
    await this.destroy();
    await this.initialize();
  }

  async destroy() {
    console.log('🔄 Destroying WhatsApp client...');
    
    if (this.client) {
      try {
        await this.client.destroy();
      } catch (error) {
        console.error('❌ Error destroying client:', error);
      }
    }
    
    this.client = null;
    this.isClientReady = false;
    this.qrCodeData = null;
  }

  async gracefulShutdown() {
    console.log('🛑 Initiating graceful shutdown...');
    this.isShuttingDown = true;
    
    // Wait for queue to finish processing
    while (this.isProcessingQueue && this.messageQueue.length > 0) {
      console.log(`⏳ Waiting for ${this.messageQueue.length} messages to finish processing...`);
      await this.delay(1000);
    }
    
    await this.destroy();
    console.log('✅ Graceful shutdown completed');
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  isReady() {
    return this.isClientReady;
  }

  getQRCode() {
    return this.qrCodeData;
  }

  getQueueStatus() {
    return {
      queueLength: this.messageQueue.length,
      isProcessing: this.isProcessingQueue,
      reconnectAttempts: this.reconnectAttempts,
      maxReconnectAttempts: this.maxReconnectAttempts
    };
  }
}

export default WhatsAppService;