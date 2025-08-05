import React, { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import Dashboard from './components/Dashboard';
import QRCodeDisplay from './components/QRCodeDisplay';
import MessageForm from './components/MessageForm';
import MessageHistory from './components/MessageHistory';
import StatusBar from './components/StatusBar';
import { Activity, MessageCircle, FileText, Settings } from 'lucide-react';
import { API_URL, SOCKET_URL } from './config/api';

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

function App() {
    const [socket, setSocket] = useState<Socket | null>(null);
    const [whatsappStatus, setWhatsappStatus] = useState<WhatsAppStatus>({
      isReady: false,
      timestamp: new Date().toISOString()
    });
    const [qrCode, setQrCode] = useState<string | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [activeTab, setActiveTab] = useState<'dashboard' | 'send' | 'history' | 'settings'>('dashboard');

    useEffect(() => {
      const newSocket = io(SOCKET_URL);
      setSocket(newSocket);

      newSocket.on('connect', () => {
        console.log('Connected to server');
      });

      newSocket.on('whatsapp-status', (status: WhatsAppStatus) => {
        setWhatsappStatus(status);
        if (status.isReady) {
          setQrCode(null);
        }
      });

      newSocket.on('qr-code', ({ qr }: { qr: string }) => {
        setQrCode(qr);
      });

      newSocket.on('whatsapp-authenticated', () => {
        setQrCode(null);
        fetchMessages();
      });

      newSocket.on('message-update', (update: Partial<Message>) => {
        setMessages(prev => prev.map(msg => 
          msg.id === update.id ? { ...msg, ...update } : msg
        ));
      });

      fetchMessages();

      return () => {
        newSocket.disconnect();
      };
    }, []);

    const fetchMessages = async () => {
      try {
        const response = await fetch(`${API_URL}/api/messages`);
        const data = await response.json();
        setMessages(data);
      } catch (error) {
        console.error('Error fetching messages:', error);
      }
    };

    const handleSendMessage = async (messageData: any) => {
      try {
        const response = await fetch(`${API_URL}/api/send-message`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(messageData),
        });

        const result = await response.json();
        
        if (result.success) {
          fetchMessages();
        }
        
        return result;
      } catch (error) {
        console.error('Error sending message:', error);
        return { success: false, error: 'Network error' };
      }
    };

    const handleSendReport = async (formData: FormData) => {
      try {
        const response = await fetch(`${API_URL}/api/send-report`, {
          method: 'POST',
          body: formData,
        });

        const result = await response.json();
        
        if (result.success) {
          fetchMessages();
        }
        
        return result;
      } catch (error) {
        console.error('Error sending report:', error);
        return { success: false, error: 'Network error' };
      }
    };

    const generateQR = async () => {
      try {
        await fetch(`${API_URL}/api/generate-qr`, {
          method: 'POST',
        });
      } catch (error) {
        console.error('Error generating QR:', error);
      }
    };

    const navItems = [
      { id: 'dashboard', label: 'Dashboard', icon: Activity },
      { id: 'send', label: 'Send Message', icon: MessageCircle },
      { id: 'history', label: 'Message History', icon: FileText },
      { id: 'settings', label: 'Settings', icon: Settings },
    ];

    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <div className="flex items-center space-x-3">
                <div className="bg-blue-600 p-2 rounded-lg">
                  <MessageCircle className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">LIMS WhatsApp Integration</h1>
                  <p className="text-sm text-gray-500">Laboratory Report Messaging System</p>
                </div>
              </div>
              <StatusBar status={whatsappStatus} />
            </div>
            
            <nav className="flex space-x-8">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id as any)}
                    className={`flex items-center space-x-2 py-4 px-1 border-b-2 text-sm font-medium transition-colors ${
                      activeTab === item.id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {!whatsappStatus.isReady && qrCode && (
            <div className="mb-8">
              <QRCodeDisplay qrCode={qrCode} />
            </div>
          )}

          {activeTab === 'dashboard' && (
            <Dashboard 
              whatsappStatus={whatsappStatus} 
              messages={messages}
              onGenerateQR={generateQR}
            />
          )}

          {activeTab === 'send' && (
            <MessageForm 
              onSendMessage={handleSendMessage}
              onSendReport={handleSendReport}
              whatsappReady={whatsappStatus.isReady}
            />
          )}

          {activeTab === 'history' && (
            <MessageHistory messages={messages} onRefresh={fetchMessages} />
          )}

          {activeTab === 'settings' && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Settings</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    WhatsApp Session
                  </label>
                  <button
                    onClick={generateQR}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  >
                    Generate New QR Code
                  </button>
                  <p className="text-sm text-gray-500 mt-1">
                    Use this to reset the WhatsApp connection and generate a new QR code
                  </p>
                </div>
              </div>
            </div>
        )}
      </div>
    </div>
  );
}

export default App;