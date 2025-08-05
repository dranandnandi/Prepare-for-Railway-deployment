import React from 'react';
import { CheckCircle, Clock, XCircle, MessageCircle, Users, TrendingUp } from 'lucide-react';

interface WhatsAppStatus {
  isReady: boolean;
  timestamp: string;
  reason?: string;
}

interface Message {
  id: string;
  phoneNumber: string;
  message: string;
  status: 'pending' | 'sent' | 'delivered' | 'failed';
  timestamp: string;
  patientName?: string;
  testName?: string;
  hasAttachment?: boolean;
}

interface DashboardProps {
  whatsappStatus: WhatsAppStatus;
  messages: Message[];
  onGenerateQR: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ whatsappStatus, messages, onGenerateQR }) => {
  const stats = {
    total: messages.length,
    sent: messages.filter(m => m.status === 'sent').length,
    failed: messages.filter(m => m.status === 'failed').length,
    pending: messages.filter(m => m.status === 'pending').length,
  };

  const recentMessages = messages.slice(0, 5);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sent': return 'text-green-600 bg-green-100';
      case 'failed': return 'text-red-600 bg-red-100';
      case 'pending': return 'text-yellow-600 bg-yellow-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="space-y-6">
      {/* Connection Status Card */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-medium text-gray-900">WhatsApp Connection</h2>
            <p className="text-sm text-gray-500 mt-1">
              {whatsappStatus.isReady ? 'Connected and ready to send messages' : 'Waiting for connection'}
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-medium ${
              whatsappStatus.isReady 
                ? 'bg-green-100 text-green-800' 
                : 'bg-yellow-100 text-yellow-800'
            }`}>
              <div className={`w-2 h-2 rounded-full ${
                whatsappStatus.isReady ? 'bg-green-500' : 'bg-yellow-500'
              }`} />
              {whatsappStatus.isReady ? 'Connected' : 'Disconnected'}
            </div>
            {!whatsappStatus.isReady && (
              <button
                onClick={onGenerateQR}
                className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors"
              >
                Connect
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Statistics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <MessageCircle className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Messages</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Sent Successfully</p>
              <p className="text-2xl font-bold text-gray-900">{stats.sent}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Clock className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Pending</p>
              <p className="text-2xl font-bold text-gray-900">{stats.pending}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <XCircle className="h-6 w-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Failed</p>
              <p className="text-2xl font-bold text-gray-900">{stats.failed}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Messages */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Recent Messages</h3>
        </div>
        <div className="divide-y divide-gray-200">
          {recentMessages.length > 0 ? (
            recentMessages.map((message) => (
              <div key={message.id} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-3">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {message.patientName || 'Unknown Patient'}
                      </p>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(message.status)}`}>
                        {message.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      {message.testName && `${message.testName} • `}
                      {message.phoneNumber}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(message.timestamp).toLocaleString()}
                    </p>
                  </div>
                  {message.hasAttachment && (
                    <div className="ml-4">
                      <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800">
                        PDF Attached
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="px-6 py-8 text-center">
              <MessageCircle className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No messages yet</h3>
              <p className="mt-1 text-sm text-gray-500">
                Start sending lab reports to see them here
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;