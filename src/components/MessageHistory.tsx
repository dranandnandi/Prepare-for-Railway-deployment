import React, { useState } from 'react';
import { RefreshCw, Search, Filter, Download, MessageCircle } from 'lucide-react';

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

interface MessageHistoryProps {
  messages: Message[];
  onRefresh: () => void;
}

const MessageHistory: React.FC<MessageHistoryProps> = ({ messages, onRefresh }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filteredMessages = messages.filter(message => {
    const matchesSearch = 
      message.patientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      message.phoneNumber.includes(searchTerm) ||
      message.testName?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || message.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sent': return 'text-green-600 bg-green-100';
      case 'delivered': return 'text-blue-600 bg-blue-100';
      case 'failed': return 'text-red-600 bg-red-100';
      case 'pending': return 'text-yellow-600 bg-yellow-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent': return '✓';
      case 'delivered': return '✓✓';
      case 'failed': return '✗';
      case 'pending': return '○';
      default: return '○';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-medium text-gray-900">Message History</h2>
            <p className="text-sm text-gray-500 mt-1">
              View all sent messages and their delivery status
            </p>
          </div>
          <button
            onClick={onRefresh}
            className="flex items-center space-x-2 px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
        <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by patient name, phone, or test..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="sm:w-48">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="sent">Sent</option>
              <option value="delivered">Delivered</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
            </select>
          </div>
        </div>
      </div>

      {/* Messages List */}
      <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
        {filteredMessages.length > 0 ? (
          filteredMessages.map((message) => (
            <div key={message.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="text-sm font-medium text-gray-900">
                      {message.patientName || 'Unknown Patient'}
                    </h3>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(message.status)}`}>
                      <span className="mr-1">{getStatusIcon(message.status)}</span>
                      {message.status}
                    </span>
                    {message.hasAttachment && (
                      <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800">
                        PDF
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-4 text-sm text-gray-500 mb-2">
                    <span>{message.phoneNumber}</span>
                    {message.testName && (
                      <>
                        <span>•</span>
                        <span>{message.testName}</span>
                      </>
                    )}
                    <span>•</span>
                    <span>{new Date(message.timestamp).toLocaleString()}</span>
                  </div>
                  
                  <div className="bg-gray-50 rounded p-3 mt-2">
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">
                      {message.message.length > 200 
                        ? `${message.message.substring(0, 200)}...` 
                        : message.message
                      }
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="px-6 py-12 text-center">
            <MessageCircle className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No messages found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm || statusFilter !== 'all' 
                ? 'Try adjusting your search or filter criteria'
                : 'Start sending messages to see them here'
              }
            </p>
          </div>
        )}
      </div>

      {filteredMessages.length > 0 && (
        <div className="px-6 py-3 border-t border-gray-200 bg-gray-50">
          <p className="text-sm text-gray-500">
            Showing {filteredMessages.length} of {messages.length} messages
          </p>
        </div>
      )}
    </div>
  );
};

export default MessageHistory;