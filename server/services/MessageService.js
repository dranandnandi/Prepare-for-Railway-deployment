class MessageService {
  constructor() {
    this.messages = [];
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
      timestamp: messageData.timestamp || new Date().toISOString()
    };
    
    this.messages.unshift(message);
    
    // Keep only last 1000 messages
    if (this.messages.length > 1000) {
      this.messages = this.messages.slice(0, 1000);
    }
    
    console.log(`📝 Message logged: ${message.phoneNumber} - ${message.status}`);
  }

  getMessages(limit = 50) {
    return this.messages.slice(0, limit);
  }

  updateMessageStatus(messageId, status) {
    const message = this.messages.find(m => m.id === messageId);
    if (message) {
      message.status = status;
      message.updatedAt = new Date().toISOString();
    }
  }

  getMessageStats() {
    const total = this.messages.length;
    const sent = this.messages.filter(m => m.status === 'sent').length;
    const failed = this.messages.filter(m => m.status === 'failed').length;
    const pending = this.messages.filter(m => m.status === 'pending').length;
    
    return { total, sent, failed, pending };
  }
}

export default MessageService;