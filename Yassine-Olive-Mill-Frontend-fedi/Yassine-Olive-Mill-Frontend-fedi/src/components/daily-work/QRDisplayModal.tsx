import React from 'react';
import { X, Download } from 'lucide-react';
import { OliveButton } from '@/components/ui/olive-button';

interface QRDisplayModalProps {
  isOpen: boolean;
  qrCodeImage: string;
  onClose: () => void;
}

export function QRDisplayModal({
  isOpen,
  qrCodeImage,
  onClose,
}: QRDisplayModalProps) {
  if (!isOpen) return null;

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = qrCodeImage;
    link.download = 'qr-code.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-sm shadow-lg relative">
        <button 
          className="absolute top-2 right-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300" 
          onClick={onClose}
        >
          <X className="h-5 w-5" />
        </button>

        <h2 className="text-2xl font-bold mb-4 text-primary text-center">رمز QR للتذكرة</h2>
        
        <div className="text-center space-y-4">
          <div className="border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg p-4 inline-block">
            <img src={qrCodeImage} alt="QR Code" className="w-48 h-48" />
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">استخدم هذا الرمز للمسح الضوئي عند إكمال المعالجة</p>
          
          <OliveButton
            variant="outline"
            onClick={handleDownload}
            className="mx-auto"
          >
            <Download className="h-4 w-4 ml-2" />
            تحميل الرمز
          </OliveButton>
        </div>

        <div className="flex gap-2 mt-4">
          <OliveButton 
            variant="outline" 
            onClick={onClose}
            className="flex-1"
          >
            إغلاق
          </OliveButton>
        </div>
      </div>
    </div>
  );
}
