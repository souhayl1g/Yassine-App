import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { OliveButton } from '@/components/ui/olive-button';
import { QrCode, Camera, X } from 'lucide-react';
import { DeviceQRScanner } from '@/components/scanner/DeviceQRScanner';
import { useQRScannerMode } from '@/hooks/useQRScannerMode';

interface QRScanModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onFileUpload: (file: File) => void;
  onOpenCamera: () => void;
  onDeviceScan?: (qrData: string) => void;
}

export function QRScanModal({
  isOpen,
  onOpenChange,
  onFileUpload,
  onOpenCamera,
  onDeviceScan,
}: QRScanModalProps) {
  const { isDeviceMode } = useQRScannerMode();
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>مسح رمز QR لإكمال التذكرة</DialogTitle>
          <DialogDescription>
            ارفع صورة رمز QR أو اسحب الملف هنا لإكمال معالجة التذكرة
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {isDeviceMode && onDeviceScan ? (
            <DeviceQRScanner
              onScan={(qrData) => {
                onDeviceScan(qrData);
                onOpenChange(false);
              }}
              isActive={isOpen}
              placeholder="امسح رمز QR باستخدام الماسح الضوئي لإكمال التذكرة..."
            />
          ) : (
            <>
              <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
                <QrCode className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-sm text-muted-foreground mb-4">
                  اختر ملف صورة QR أو اسحبه هنا
                </p>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      onFileUpload(file);
                    }
                  }}
                  className="w-full"
                />
              </div>

              <div className="flex gap-2">
                <OliveButton
                  onClick={() => {
                    onOpenChange(false);
                    onOpenCamera();
                  }}
                  className="flex-1"
                >
                  <Camera className="h-4 w-4 mr-2" />
                  فتح الكاميرا
                </OliveButton>
                <OliveButton
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  className="flex-1"
                >
                  إغلاق
                </OliveButton>
              </div>
            </>
          )}

          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>ملاحظة:</strong> رمز QR يجب أن يحتوي على معرف التذكرة والوزن
              الخارج وعدد الصناديق لإكمال المعالجة.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface CameraScanModalProps {
  isOpen: boolean;
  onClose: () => void;
  isCameraActive: boolean;
  videoRef: React.RefObject<HTMLVideoElement>;
  onStartCamera: () => void;
  onStopCamera: () => void;
}

export function CameraScanModal({
  isOpen,
  onClose,
  isCameraActive,
  videoRef,
  onStartCamera,
  onStopCamera,
}: CameraScanModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-lg relative">
        <button
          className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
          onClick={onClose}
        >
          <X className="h-5 w-5" />
        </button>

        <h2 className="text-2xl font-bold mb-4 text-primary text-center">
          مسح QR بالكاميرا
        </h2>

        <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 mb-4">
          <div className="relative aspect-video bg-black rounded overflow-hidden">
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              playsInline
            />
            {!isCameraActive && (
              <div className="absolute inset-0 flex items-center justify-center">
                <Camera className="h-12 w-12 text-white opacity-50" />
              </div>
            )}
          </div>

          <div className="text-center mt-4">
            <p className="text-sm text-gray-600">
              وجه الكاميرا نحو رمز QR للمسح الضوئي
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          {!isCameraActive ? (
            <OliveButton onClick={onStartCamera} className="flex-1">
              <Camera className="h-4 w-4 mr-2" />
              تشغيل الكاميرا
            </OliveButton>
          ) : (
            <OliveButton
              onClick={onStopCamera}
              variant="outline"
              className="flex-1"
            >
              إيقاف الكاميرا
            </OliveButton>
          )}
          <OliveButton variant="outline" onClick={onClose} className="flex-1">
            إغلاق
          </OliveButton>
        </div>
      </div>
    </div>
  );
}
