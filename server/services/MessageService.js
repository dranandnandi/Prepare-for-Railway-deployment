class MessageService {
  constructor() {
    this.messages = [];
    this.messageStats = {
      total: 0,
      sent: 0,
      failed: 0,
      pending: 0,
      queued: 0
    };
    this.templates = {
      standard: `Dear [PatientName], your [TestName] report is now ready.
Date: [ReportDate]
Doctor: [DoctorName]
To view or download your report, please contact our lab.

- [LabName]`,
      
      urgent: `🚨 URGENT: Dear [PatientName], your [TestName] results require immediate attention.
Date: [ReportDate]
Doctor: [DoctorName]
Please contact your doctor immediately.

- [LabName]`,
      
      normal: `Dear [PatientName], your [TestName] results are normal.
Date: [ReportDate]
Doctor: [DoctorName]
No further action required.

- [LabName]`
    };
  }

  processTemplate(template, data) {
    if (!template || typeof template !== 'string') {
      return '';
    }
    
    let processed = template;
    
    // Define template mappings
    const mappings = {
      '[PatientName]': data.patientName || '',
      '[TestName]': data.testName || '',
      '[ReportDate]': data.reportDate || '',
      '[DoctorName]': data.doctorName || '',
      '[LabName]': data.labName || ''
    };
    
    // Replace each mapping safely
    Object.entries(mappings).forEach(([placeholder, value]) => {
      processed = processed.split(placeholder).join(value);
    });
    
    return processed.trim();
  }

  getTemplate(type = 'standard') {
    return this.templates[type] || this.templates.standard;
  }

  logMessage(messageData) {
    const message = {
      ...messageData,
      timestamp: messageData.timestamp || new Date().toISOString(),
      attempts: messageData.attempts || 0,
      lastAttempt: new Date().toISOString()
    };
    
    // Check if message already exists (for updates)
    const existingIndex = this.messages.findIndex(m => m.id === message.id);
    
    if (existingIndex !== -1) {
      // Update existing message
      this.messages[existingIndex] = { ...this.messages[existingIndex], ...message };
      console.log(`📝 Message updated: ${message.id} - ${message.status}`);
    } else {
      // Add new message
      this.messages.unshift(message);
      console.log(`📝 Message logged: ${message.phoneNumber} - ${message.status}`);
    }
    
    // Keep only last 1000 messages
    if (this.messages.length > 1000) {
      this.messages = this.messages.slice(0, 1000);
    }
    
    // Update statistics
    this.updateStats();
  }

  updateStats() {
    this.messageStats = {
      total: this.messages.length,
      sent: this.messages.filter(m => m.status === 'sent' || m.status === 'delivered' || m.status === 'read').length,
      failed: this.messages.filter(m => m.status === 'failed').length,
      pending: this.messages.filter(m => m.status === 'pending').length,
      queued: this.messages.filter(m => m.status === 'queued').length
    };
  }

  getMessages(limit = 50) {
    return this.messages.slice(0, limit);
  }

  updateMessageStatus(messageId, status) {
    const updateData = {
      id: messageId,
      status,
      updatedAt: new Date().toISOString()
    };
    
    // Add error information if status is failed
    if (status === 'failed' && arguments.length > 2) {
      updateData.error = arguments[2];
    }
    
    this.logMessage(updateData);
  }

  updateMessageStatusLegacy(messageId, status) {
    const message = this.messages.find(m => m.id === messageId);
    if (message) {
      message.status = status;
      message.updatedAt = new Date().toISOString();
      this.updateStats();
    }
  }

  getMessageStats() {
    return { ...this.messageStats };
  }

  getFailedMessages(limit = 10) {
    return this.messages
      .filter(m => m.status === 'failed')
      .slice(0, limit)
      .map(m => ({
        id: m.id,
        phoneNumber: m.phoneNumber,
        patientName: m.patientName,
        error: m.error,
        attempts: m.attempts,
        timestamp: m.timestamp
      }));
  }

  getRecentActivity(hours = 24) {
    const cutoff = new Date(Date.now() - (hours * 60 * 60 * 1000));
    return this.messages.filter(m => new Date(m.timestamp) > cutoff);
  }
}

export default MessageService;