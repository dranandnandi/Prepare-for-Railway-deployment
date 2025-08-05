# WhatsApp LIMS Integration System

A comprehensive web application that connects Laboratory Information Management Systems (LIMS) to WhatsApp for automated patient report delivery.

## Features

- **WhatsApp Web Integration**: Persistent session management with QR code authentication
- **Message Templates**: Pre-built templates for different types of lab reports
- **PDF Attachments**: Send lab reports as PDF attachments
- **Real-time Dashboard**: Monitor connection status and message delivery
- **Message History**: Track all sent messages with delivery status
- **LIMS API Integration**: RESTful API endpoints for seamless LIMS integration

## Quick Start

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Start the Application**
   ```bash
   # Start both backend and frontend
   npm run dev:full
   
   # Or start separately
   npm run server  # Backend server
   npm run dev     # Frontend dashboard
   ```

3. **Connect WhatsApp**
   - Open the dashboard at `http://localhost:5173`
   - Click "Connect" to generate a QR code
   - Scan the QR code with your WhatsApp mobile app
   - The connection will persist across server restarts

## API Endpoints

### Send Message
```http
POST /api/send-message
Content-Type: application/json

{
  "phoneNumber": "+1234567890",
  "message": "Your lab report is ready",
  "patientName": "John Doe",
  "testName": "Complete Blood Count",
  "reportDate": "2024-01-15",
  "doctorName": "Dr. Smith"
}
```

### Send Report with PDF
```http
POST /api/send-report
Content-Type: multipart/form-data

Form fields:
- phoneNumber: "+1234567890"
- message: "Your lab report is ready"
- patientName: "John Doe"
- testName: "Complete Blood Count"
- reportDate: "2024-01-15"
- doctorName: "Dr. Smith"
- report: [PDF file]
```

### Get Status
```http
GET /api/status
```

### Get Message History
```http
GET /api/messages
```

## Message Templates

The system supports dynamic message templates with placeholders:

- `[PatientName]` - Patient's name
- `[TestName]` - Name of the lab test
- `[ReportDate]` - Date of the report
- `[DoctorName]` - Ordering physician
- `[LabName]` - Laboratory name

### Example Template
```
Dear [PatientName], your [TestName] report is now ready.
Date: [ReportDate]
Doctor: [DoctorName]
To view or download your report, please contact our lab.

- [LabName]
```

## LIMS Integration

### Integration Methods

1. **API Push**: Your LIMS can POST directly to our endpoints
2. **File Monitoring**: Monitor CSV/JSON exports from your LIMS
3. **Database Polling**: Connect directly to LIMS database (requires custom setup)

### Sample LIMS Integration Script (Python)
```python
import requests

# Send message via API
def send_lab_report(patient_data):
    url = "http://localhost:3001/api/send-message"
    payload = {
        "phoneNumber": patient_data["phone"],
        "message": "Dear [PatientName], your [TestName] report is ready.",
        "patientName": patient_data["name"],
        "testName": patient_data["test_name"],
        "reportDate": patient_data["report_date"],
        "doctorName": patient_data["doctor"]
    }
    
    response = requests.post(url, json=payload)
    return response.json()
```

## Configuration

Create a `.env` file from `.env.example`:

```bash
cp .env.example .env
```

Edit the configuration as needed for your environment.

## Session Management

- WhatsApp sessions are stored in `server/sessions/`
- Sessions persist across server restarts
- To reset the connection, delete the session folder or use the "Generate New QR Code" option

## File Handling

- Uploaded files are stored in `server/uploads/`
- Files are automatically cleaned up after sending
- Supported formats: PDF, JPG, PNG
- Maximum file size: 10MB

## Security Considerations

- WhatsApp Web sessions are stored locally
- API endpoints should be secured in production
- Consider implementing authentication for API access
- Use HTTPS in production environments

## Deployment

### Production Setup

1. **Environment Variables**
   ```bash
   export NODE_ENV=production
   export PORT=3001
   ```

2. **Process Management**
   ```bash
   # Using PM2
   npm install -g pm2
   pm2 start server/index.js --name "whatsapp-lims"
   
   # Using systemd (Linux)
   # Create service file: /etc/systemd/system/whatsapp-lims.service
   ```

3. **Reverse Proxy** (Nginx example)
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;
       
       location / {
           proxy_pass http://localhost:5173;
       }
       
       location /api {
           proxy_pass http://localhost:3001;
       }
   }
   ```

## Troubleshooting

### Common Issues

1. **QR Code Not Generating**
   - Check server logs for puppeteer errors
   - Ensure sufficient memory and disk space
   - Try restarting the server

2. **Messages Not Sending**
   - Verify WhatsApp connection status
   - Check phone number format (+country code)
   - Ensure WhatsApp is active on the connected device

3. **Session Lost**
   - WhatsApp sessions may expire after inactivity
   - Re-scan QR code to reconnect
   - Check `server/sessions/` folder permissions

### Logs

Server logs provide detailed information about:
- WhatsApp connection status
- Message sending attempts
- API requests and responses
- Error messages and stack traces

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For technical support or questions:
- Check the troubleshooting section above
- Review server logs for error messages
- Ensure all dependencies are properly installed
- Verify WhatsApp Web compatibility