import React from 'react';
import { Wifi, WifiOff, Clock } from 'lucide-react';

interface WhatsAppStatus {
  isReady: boolean;
  timestamp: string;
  reason?: string;
}

interface StatusBarProps {
  status: WhatsAppStatus;
}

const StatusBar: React.FC<StatusBarProps> = ({ status }) => {
  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  return (
    <div className="flex items-center space-x-4">
      <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-medium ${
        status.isReady 
          ? 'bg-green-100 text-green-800' 
          : 'bg-red-100 text-red-800'
      }`}>
        {status.isReady ? (
          <Wifi className="h-4 w-4" />
        ) : (
          <WifiOff className="h-4 w-4" />
        )}
        <span>{status.isReady ? 'WhatsApp Connected' : 'WhatsApp Disconnected'}</span>
      </div>
      
      <div className="flex items-center space-x-1 text-xs text-gray-500">
        <Clock className="h-3 w-3" />
        <span>Last update: {formatTimestamp(status.timestamp)}</span>
      </div>
    </div>
  );
};

export default StatusBar;