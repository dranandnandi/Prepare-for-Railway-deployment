import React from 'react';
import { QrCode, Smartphone } from 'lucide-react';

interface QRCodeDisplayProps {
  qrCode: string;
}

const QRCodeDisplay: React.FC<QRCodeDisplayProps> = ({ qrCode }) => {
  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="text-center">
        <div className="flex justify-center mb-4">
          <div className="p-3 bg-green-100 rounded-full">
            <QrCode className="h-8 w-8 text-green-600" />
          </div>
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Connect WhatsApp</h2>
        <p className="text-gray-600 mb-6">
          Scan this QR code with your WhatsApp mobile app to connect the LIMS system
        </p>
        
        <div className="bg-white p-4 rounded-lg border-2 border-gray-200 inline-block mb-6">
          <img 
            src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrCode)}`}
            alt="WhatsApp QR Code"
            className="w-48 h-48"
          />
        </div>
        
        <div className="flex items-center justify-center space-x-2 text-sm text-gray-500">
          <Smartphone className="h-4 w-4" />
          <span>Open WhatsApp → Settings → Linked Devices → Link a Device</span>
        </div>
        
        <div className="mt-4 p-4 bg-blue-50 rounded-md">
          <p className="text-sm text-blue-800">
            <strong>Note:</strong> Keep this tab open until WhatsApp is connected. 
            The connection will be remembered for future sessions.
          </p>
        </div>
      </div>
    </div>
  );
};

export default QRCodeDisplay;