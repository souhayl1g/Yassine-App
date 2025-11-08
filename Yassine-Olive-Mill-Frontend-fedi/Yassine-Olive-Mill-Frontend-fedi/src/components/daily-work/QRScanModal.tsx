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
  // Ticket list for quitting
  recentTickets?: any[];
  onTicketSelect?: (ticket: any) => void;
  isFinishingOperation?: boolean;
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
  recentTickets = [],
  onTicketSelect,
  isFinishingOperation = false,
}: QRScanModalProps) {
  // Default to 'tickets' tab when finishing operation, otherwise 'device'
  const [activeTab, setActiveTab] = useState<'tickets' | 'device' | 'camera' | 'upload'>(isFinishingOperation ? 'tickets' : 'device');
  
  // Reset to tickets tab when finishing operation changes
  React.useEffect(() => {
    if (isFinishingOperation && isOpen) {
      setActiveTab('tickets');
    }
  }, [isFinishingOperation, isOpen]);

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
            <TabsList className={`grid w-full ${isFinishingOperation ? 'grid-cols-4' : 'grid-cols-3'}`}>
              {isFinishingOperation && (
                <TabsTrigger value="tickets">اختر التذكرة</TabsTrigger>
              )}
              <TabsTrigger value="device">ماسح الجهاز</TabsTrigger>
              <TabsTrigger value="camera">الكاميرا</TabsTrigger>
              <TabsTrigger value="upload">رفع ملف</TabsTrigger>
            </TabsList>

            {isFinishingOperation && (
              <TabsContent value="tickets" className="mt-4">
                <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4 max-h-[400px] overflow-y-auto">
                  {recentTickets && recentTickets.length > 0 ? (
                    <div className="space-y-2">
                      {recentTickets.map((ticket) => (
                        <div
                          key={ticket.id}
                          onClick={() => {
                            if (onTicketSelect) {
                              onTicketSelect(ticket);
                              onOpenChange(false);
                            }
                          }}
                          className="p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-semibold">{ticket.clientName}</div>
                              <div className="text-sm text-muted-foreground">
                                رقم التذكرة: {ticket.ticketNumber || `#${ticket.id}`}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                الوزن الداخل: {ticket.weightIn} كيلو
                              </div>
                            </div>
                            <div className="text-right">
                              <div className={`text-xs px-2 py-1 rounded ${
                                ticket.status === 'completed' ? 'bg-green-100 text-green-700' :
                                ticket.status === 'in_process' ? 'bg-blue-100 text-blue-700' :
                                'bg-yellow-100 text-yellow-700'
                              }`}>
                                {ticket.status === 'completed' ? 'مكتملة' :
                                 ticket.status === 'in_process' ? 'قيد المعالجة' :
                                 'مستلمة'}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <QrCode className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>لا توجد تذاكر متاحة</p>
                    </div>
                  )}
                </div>
              </TabsContent>
            )}

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
