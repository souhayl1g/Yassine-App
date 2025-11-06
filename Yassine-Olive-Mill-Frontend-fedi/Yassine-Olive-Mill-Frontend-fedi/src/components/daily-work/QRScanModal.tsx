import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { OliveButton } from '@/components/ui/olive-button';
import { QrCode, Camera } from 'lucide-react';
import { DeviceQRScanner } from '@/components/scanner/DeviceQRScanner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface QRScanModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onFileUpload: (file: File) => void;
  // Device scanner
  onDeviceScan?: (qrData: string) => void;
  // Camera scanner wiring (reuse dailyWork hook so scanning happens here)
  isCameraActive?: boolean;
  videoRef?: React.RefObject<HTMLVideoElement>;
  onStartCamera?: () => void;
  onStopCamera?: () => void;
}

export function QRScanModal({
  isOpen,
  onOpenChange,
  onFileUpload,
  onDeviceScan,
  isCameraActive,
  videoRef,
  onStartCamera,
  onStopCamera,
}: QRScanModalProps) {
  const [activeTab, setActiveTab] = useState<'device' | 'camera' | 'upload'>('device');

  // Auto start/stop camera when switching tabs or opening/closing modal
  useEffect(() => {
    if (!isOpen) {
      // Ensure camera is stopped when modal closes
      onStopCamera && onStopCamera();
      return;
    }
    // Start camera immediately whenever the modal opens (even if device tab is active)
    if (onStartCamera && !isCameraActive) onStartCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>مسح رمز QR لإكمال التذكرة</DialogTitle>
          <DialogDescription>
            اختر طريقة المسح: ماسح الجهاز، الكاميرا، أو رفع ملف من الحاسوب لإكمال معالجة التذكرة
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
            <TabsList className="grid grid-cols-3 w-full">
              <TabsTrigger value="device">ماسح الجهاز</TabsTrigger>
              <TabsTrigger value="camera">الكاميرا</TabsTrigger>
              <TabsTrigger value="upload">رفع ملف</TabsTrigger>
            </TabsList>

            <TabsContent value="device" className="mt-4">
              {onDeviceScan ? (
                <DeviceQRScanner
                  onScan={(qrData) => {
                    onDeviceScan(qrData);
                    onOpenChange(false);
                  }}
                  isActive={isOpen} 
                  placeholder="امسح رمز QR باستخدام الماسح الضوئي لإكمال التذكرة..."
                />
              ) : (
                <div className="p-4 text-sm text-muted-foreground">لا يوجد ماسح جهاز متصل</div>
              )}
            </TabsContent>

            <TabsContent value="camera" className="mt-4">
              <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4">
                <div className="relative aspect-video bg-black rounded overflow-hidden">
                  <video ref={videoRef} className="w-full h-full object-cover" playsInline />
                  {!isCameraActive && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Camera className="h-12 w-12 text-white opacity-50" />
                    </div>
                  )}
                </div>
                <div className="flex gap-2 mt-3">
                  {!isCameraActive ? (
                    <OliveButton onClick={onStartCamera} className="flex-1">
                      <Camera className="h-4 w-4 mr-2" />
                      تشغيل الكاميرا
                    </OliveButton>
                  ) : (
                    <OliveButton onClick={onStopCamera} variant="outline" className="flex-1">
                      إيقاف الكاميرا
                    </OliveButton>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="upload" className="mt-4">
              <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
                <QrCode className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-sm text-muted-foreground mb-4">اختر ملف صورة QR أو اسحبه هنا</p>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) onFileUpload(file);
                  }}
                  className="w-full"
                />
              </div>
            </TabsContent>
          </Tabs>

          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>ملاحظة:</strong> رمز QR يجب أن يحتوي على معرف التذكرة والوزن الخارج وعدد الصناديق لإكمال المعالجة.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
// Camera-only modal removed in favor of tabs inside QRScanModal
