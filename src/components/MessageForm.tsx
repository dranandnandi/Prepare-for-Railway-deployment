import React, { useState } from 'react';
import { Send, FileText, User, Phone, Calendar, UserCheck } from 'lucide-react';

interface MessageFormProps {
  onSendMessage: (data: any) => Promise<any>;
  onSendReport: (formData: FormData) => Promise<any>;
  whatsappReady: boolean;
}

const MessageForm: React.FC<MessageFormProps> = ({ onSendMessage, onSendReport, whatsappReady }) => {
  const [formData, setFormData] = useState({
    phoneNumber: '',
    patientName: '',
    testName: '',
    reportDate: '',
    doctorName: '',
    message: `Dear [PatientName], your [TestName] report is now ready.
Date: [ReportDate]
Doctor: [DoctorName]
To view or download your report, please contact our lab.

- MedLab Systems`
  });
  const [file, setFile] = useState<File | null>(null);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0] || null;
    setFile(selectedFile);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setResult(null);

    try {
      let response;
      
      if (file) {
        // Send with attachment
        const formDataWithFile = new FormData();
        Object.keys(formData).forEach(key => {
          formDataWithFile.append(key, formData[key as keyof typeof formData]);
        });
        formDataWithFile.append('report', file);
        
        response = await onSendReport(formDataWithFile);
      } else {
        // Send text message only
        response = await onSendMessage(formData);
      }
      
      setResult(response);
      
      if (response.success) {
        // Reset form on success
        setFormData({
          phoneNumber: '',
          patientName: '',
          testName: '',
          reportDate: '',
          doctorName: '',
          message: `Dear [PatientName], your [TestName] report is now ready.
Date: [ReportDate]
Doctor: [DoctorName]
To view or download your report, please contact our lab.

- MedLab Systems`
        });
        setFile(null);
      }
    } catch (error) {
      setResult({ success: false, error: 'Failed to send message' });
    } finally {
      setSending(false);
    }
  };

  const templates = [
    {
      name: 'Standard Report',
      template: `Dear [PatientName], your [TestName] report is now ready.
Date: [ReportDate]
Doctor: [DoctorName]
To view or download your report, please contact our lab.

- MedLab Systems`
    },
    {
      name: 'Urgent Results',
      template: `🚨 URGENT: Dear [PatientName], your [TestName] results require immediate attention.
Date: [ReportDate]
Doctor: [DoctorName]
Please contact your doctor immediately.

- MedLab Systems`
    },
    {
      name: 'Normal Results',
      template: `Dear [PatientName], your [TestName] results are normal.
Date: [ReportDate]
Doctor: [DoctorName]
No further action required.

- MedLab Systems`
    }
  ];

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Send Lab Report Message</h2>
          <p className="text-sm text-gray-500 mt-1">
            Send automated messages to patients with lab results
          </p>
        </div>

        {!whatsappReady && (
          <div className="px-6 py-4 bg-yellow-50 border-b border-yellow-200">
            <p className="text-sm text-yellow-800">
              ⚠️ WhatsApp is not connected. Please scan the QR code first.
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Phone className="inline h-4 w-4 mr-1" />
                Patient Phone Number *
              </label>
              <input
                type="tel"
                name="phoneNumber"
                value={formData.phoneNumber}
                onChange={handleInputChange}
                placeholder="+1234567890"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <User className="inline h-4 w-4 mr-1" />
                Patient Name
              </label>
              <input
                type="text"
                name="patientName"
                value={formData.patientName}
                onChange={handleInputChange}
                placeholder="John Doe"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <FileText className="inline h-4 w-4 mr-1" />
                Test Name
              </label>
              <input
                type="text"
                name="testName"
                value={formData.testName}
                onChange={handleInputChange}
                placeholder="Complete Blood Count (CBC)"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar className="inline h-4 w-4 mr-1" />
                Report Date
              </label>
              <input
                type="date"
                name="reportDate"
                value={formData.reportDate}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <UserCheck className="inline h-4 w-4 mr-1" />
                Doctor Name
              </label>
              <input
                type="text"
                name="doctorName"
                value={formData.doctorName}
                onChange={handleInputChange}
                placeholder="Dr. Smith"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Message Template
            </label>
            <div className="mb-3 flex flex-wrap gap-2">
              {templates.map((template, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => setFormData({ ...formData, message: template.template })}
                  className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
                >
                  {template.name}
                </button>
              ))}
            </div>
            <textarea
              name="message"
              value={formData.message}
              onChange={handleInputChange}
              rows={8}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter your message..."
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Use placeholders: [PatientName], [TestName], [ReportDate], [DoctorName], [LabName]
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              PDF Report (Optional)
            </label>
            <input
              type="file"
              accept=".pdf"
              onChange={handleFileChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {file && (
              <p className="text-sm text-green-600 mt-1">
                Selected: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
              </p>
            )}
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={!whatsappReady || sending}
              className="flex items-center space-x-2 px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="h-4 w-4" />
              <span>{sending ? 'Sending...' : 'Send Message'}</span>
            </button>
          </div>
        </form>

        {result && (
          <div className={`mx-6 mb-6 p-4 rounded-md ${
            result.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
          }`}>
            <p className={`text-sm ${result.success ? 'text-green-800' : 'text-red-800'}`}>
              {result.success ? '✅ Message sent successfully!' : `❌ Error: ${result.error}`}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MessageForm;