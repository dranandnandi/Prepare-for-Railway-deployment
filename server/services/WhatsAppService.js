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
  }

  async initialize() {
    console.log('🔄 Initializing WhatsApp client...');
    
    try {
      this.client = new Client({
        authStrategy: new LocalAuth({
          clientId: 'lims-whatsapp-bot',
          dataPath: './server/sessions'
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
            '--disable-gpu'
          ]
        }
      });

      this.setupEventHandlers();
      await this.client.initialize();
    } catch (error) {
      console.error('❌ Failed to initialize WhatsApp client:', error);
      this.io.emit('whatsapp-error', { 
        error: error.message,
        timestamp: new Date().toISOString()
      });
      throw error;
    }
  }

  setupEventHandlers() {
    this.client.on('qr', (qr) => {
      console.log('📱 QR Code received, scan with WhatsApp');
      qrcode.generate(qr, { small: true });
      
      this.qrCodeData = qr;
      this.io.emit('qr-code', { qr });
    });

    this.client.on('ready', () => {
      console.log('✅ WhatsApp client is ready!');
      this.isClientReady = true;
      this.io.emit('whatsapp-status', {
        isReady: true,
        timestamp: new Date().toISOString()
      });
    });

    this.client.on('authenticated', () => {
      console.log('🔐 WhatsApp client authenticated');
      this.io.emit('whatsapp-authenticated', {
        timestamp: new Date().toISOString()
      });
    });

    this.client.on('auth_failure', (msg) => {
      console.error('❌ Authentication failed:', msg);
      this.io.emit('whatsapp-auth-failure', { error: msg });
    });

    this.client.on('disconnected', (reason) => {
      console.log('🔌 WhatsApp client disconnected:', reason);
      this.isClientReady = false;
      this.io.emit('whatsapp-status', {
        isReady: false,
        reason,
        timestamp: new Date().toISOString()
      });
    });

    this.client.on('message_create', (message) => {
      if (message.fromMe) {
        this.io.emit('message-sent', {
          id: message.id._serialized,
          to: message.to,
          body: message.body,
          timestamp: new Date(message.timestamp * 1000).toISOString()
        });
      }
    });
  }

  async sendMessage(phoneNumber, message) {
    if (!this.isClientReady) {
      throw new Error('WhatsApp client is not ready');
    }

    try {
      // Format phone number (ensure it includes country code)
      const formattedNumber = this.formatPhoneNumber(phoneNumber);
      const chatId = `${formattedNumber}@c.us`;
      
      const sentMessage = await this.client.sendMessage(chatId, message);
      
      console.log(`📤 Message sent to ${phoneNumber}: ${message.substring(0, 50)}...`);
      
      this.io.emit('message-update', {
        id: sentMessage.id._serialized,
        status: 'sent',
        timestamp: new Date().toISOString()
      });

      return sentMessage.id._serialized;
    } catch (error) {
      console.error('Error sending message:', error);
      throw new Error(`Failed to send message: ${error.message}`);
    }
  }

  async sendMessageWithAttachment(phoneNumber, message, filePath) {
    if (!this.isClientReady) {
      throw new Error('WhatsApp client is not ready');
    }

    try {
      const formattedNumber = this.formatPhoneNumber(phoneNumber);
      const chatId = `${formattedNumber}@c.us`;
      
      let sentMessage;
      
      if (filePath && fs.existsSync(filePath)) {
        const media = MessageMedia.fromFilePath(filePath);
        sentMessage = await this.client.sendMessage(chatId, media, {
          caption: message
        });
        
        // Clean up uploaded file after sending
        setTimeout(() => {
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        }, 5000);
      } else {
        sentMessage = await this.client.sendMessage(chatId, message);
      }
      
      console.log(`📤 Message with attachment sent to ${phoneNumber}`);
      
      this.io.emit('message-update', {
        id: sentMessage.id._serialized,
        status: 'sent',
        timestamp: new Date().toISOString()
      });

      return sentMessage.id._serialized;
    } catch (error) {
      console.error('Error sending message with attachment:', error);
      throw new Error(`Failed to send message with attachment: ${error.message}`);
    }
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
    
    // Restart the client to generate a new QR code
    if (this.client) {
      await this.client.destroy();
    }
    
    await this.initialize();
  }

  isReady() {
    return this.isClientReady;
  }

  getQRCode() {
    return this.qrCodeData;
  }
}

export default WhatsAppService;