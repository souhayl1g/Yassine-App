import React, { useState, useRef, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { OliveButton } from '@/components/ui/olive-button';
import { 
  QrCode, 
  Camera, 
  Upload, 
  List, 
  Scan,
  X,
  CheckCircle,
  AlertCircle 
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';

interface EnhancedQRScanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onQRCodeScanned: (data: string) => void;
  recentTickets?: Array<{
    id: string;
    clientName: string;
    ticketNumber: string;
    date: string;
    status: string;
  }>;
}

export function EnhancedQRScanModal({
  isOpen,
  onClose,
  onQRCodeScanned,
  recentTickets = [],
}: EnhancedQRScanModalProps) {
  const [activeTab, setActiveTab] = useState('device');
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isDeviceScannerActive, setIsDeviceScannerActive] = useState(false);
  const [scannedData, setScannedData] = useState('');
  const [scanStatus, setScanStatus] = useState<'idle' | 'scanning' | 'success' | 'error'>('idle');
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const deviceInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
      stopDeviceScanner();
    };
  }, []);

  // Handle device scanner input
  useEffect(() => {
    if (isDeviceScannerActive && deviceInputRef.current) {
      deviceInputRef.current.focus();
    }
  }, [isDeviceScannerActive]);

  // Start device scanner listening
  const startDeviceScanner = () => {
    setIsDeviceScannerActive(true);
    setScanStatus('scanning');
    setScannedData('');
    toast({
      title: 'ماسح الباركود جاهز',
      description: 'امسح رمز QR باستخدام الجهاز',
    });
  };

  const stopDeviceScanner = () => {
    setIsDeviceScannerActive(false);
    setScanStatus('idle');
  };

  // Handle device scanner input
  const handleDeviceScannerInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && scannedData.trim()) {
      processScannedData(scannedData.trim());
    }
  };

  // Start phone camera
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setIsCameraActive(true);
        setScanStatus('scanning');
        
        toast({
          title: 'الكاميرا نشطة',
          description: 'وجه الكاميرا نحو رمز QR',
        });
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      toast({
        variant: 'destructive',
        title: 'خطأ في الكاميرا',
        description: 'تعذر الوصول إلى الكاميرا. تحقق من الأذونات.',
      });
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
    setScanStatus('idle');
  };

  // Handle file upload
  const handleFileUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      // Here you would use a QR code decoder library
      // For now, we'll simulate it
      toast({
        title: 'جاري معالجة الصورة',
        description: 'يتم فك تشفير رمز QR...',
      });
      
      // Simulate QR decode
      setTimeout(() => {
        processScannedData('SIMULATED-QR-DATA-FROM-IMAGE');
      }, 1000);
    };
    reader.readAsDataURL(file);
  };

  // Process scanned data
  const processScannedData = (data: string) => {
    setScanStatus('success');
    toast({
      title: 'تم المسح بنجاح!',
      description: 'تم قراءة رمز QR',
    });
    
    // Call parent callback
    onQRCodeScanned(data);
    
    // Close modal after short delay
    setTimeout(() => {
      handleClose();
    }, 1500);
  };

  // Handle manual ticket selection
  const handleTicketSelect = (ticketId: string) => {
    processScannedData(ticketId);
  };

  // Handle modal close
  const handleClose = () => {
    stopCamera();
    stopDeviceScanner();
    setScannedData('');
    setScanStatus('idle');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <QrCode className="h-6 w-6" />
            مسح رمز QR لإكمال التذكرة
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-4">
            <TabsTrigger value="device" className="flex items-center gap-2">
              <Scan className="h-4 w-4" />
              <span className="hidden sm:inline">جهاز المسح</span>
            </TabsTrigger>
            <TabsTrigger value="camera" className="flex items-center gap-2">
              <Camera className="h-4 w-4" />
              <span className="hidden sm:inline">الكاميرا</span>
            </TabsTrigger>
            <TabsTrigger value="upload" className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              <span className="hidden sm:inline">رفع صورة</span>
            </TabsTrigger>
            <TabsTrigger value="manual" className="flex items-center gap-2">
              <List className="h-4 w-4" />
              <span className="hidden sm:inline">اختيار يدوي</span>
            </TabsTrigger>
          </TabsList>

          {/* Device Scanner Tab */}
          <TabsContent value="device" className="space-y-4">
            <div className="border-2 border-dashed border-primary/30 rounded-lg p-8 text-center bg-primary/5">
              <Scan className={`h-16 w-16 mx-auto mb-4 ${isDeviceScannerActive ? 'text-primary animate-pulse' : 'text-muted-foreground'}`} />
              
              {scanStatus === 'scanning' && (
                <div className="mb-4">
                  <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full">
                    <div className="w-2 h-2 bg-primary rounded-full animate-ping"></div>
                    <span className="text-sm font-medium">في انتظار المسح...</span>
                  </div>
                </div>
              )}

              {scanStatus === 'success' && (
                <div className="mb-4">
                  <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-2" />
                  <p className="text-green-600 font-medium">تم المسح بنجاح!</p>
                </div>
              )}

              <h3 className="text-lg font-semibold mb-2">
                ماسح الباركود (HENEX)
              </h3>
              <p className="text-sm text-muted-foreground mb-6">
                استخدم جهاز المسح الضوئي لقراءة رمز QR من التذكرة
              </p>

              {/* Hidden input for device scanner */}
              <Input
                ref={deviceInputRef}
                type="text"
                value={scannedData}
                onChange={(e) => setScannedData(e.target.value)}
                onKeyDown={handleDeviceScannerInput}
                placeholder="امسح رمز QR بالجهاز..."
                className={`mb-4 text-center text-lg font-mono ${isDeviceScannerActive ? 'border-primary ring-2 ring-primary/20' : ''}`}
                disabled={!isDeviceScannerActive}
              />

              <div className="flex gap-2 justify-center">
                {!isDeviceScannerActive ? (
                  <OliveButton
                    onClick={startDeviceScanner}
                    size="lg"
                    className="min-w-[200px]"
                  >
                    <Scan className="h-5 w-5 mr-2" />
                    تنشيط المسح الضوئي
                  </OliveButton>
                ) : (
                  <OliveButton
                    onClick={stopDeviceScanner}
                    variant="outline"
                    size="lg"
                    className="min-w-[200px]"
                  >
                    <X className="h-5 w-5 mr-2" />
                    إيقاف المسح
                  </OliveButton>
                )}
              </div>

              <div className="mt-6 p-3 bg-blue-50 border border-blue-200 rounded-lg text-right">
                <p className="text-sm text-blue-800">
                  <strong>تعليمات:</strong> انقر على "تنشيط المسح الضوئي" ثم امسح رمز QR باستخدام جهاز HENEX. سيتم التعرف على الرمز تلقائياً.
                </p>
              </div>
            </div>
          </TabsContent>

          {/* Phone Camera Tab */}
          <TabsContent value="camera" className="space-y-4">
            <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6">
              <div className="relative aspect-video bg-black rounded overflow-hidden mb-4">
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  playsInline
                  autoPlay
                />
                {!isCameraActive && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
                    <Camera className="h-16 w-16 mb-2 opacity-50" />
                    <p className="text-sm">الكاميرا غير نشطة</p>
                  </div>
                )}
                {isCameraActive && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-48 h-48 border-4 border-primary rounded-lg"></div>
                  </div>
                )}
              </div>

              <p className="text-center text-sm text-muted-foreground mb-4">
                وجه الكاميرا نحو رمز QR للمسح الضوئي
              </p>

              <div className="flex gap-2">
                {!isCameraActive ? (
                  <OliveButton onClick={startCamera} className="flex-1">
                    <Camera className="h-4 w-4 mr-2" />
                    تشغيل الكاميرا
                  </OliveButton>
                ) : (
                  <OliveButton onClick={stopCamera} variant="outline" className="flex-1">
                    <X className="h-4 w-4 mr-2" />
                    إيقاف الكاميرا
                  </OliveButton>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Upload Image Tab */}
          <TabsContent value="upload" className="space-y-4">
            <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
              <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">
                رفع صورة رمز QR
              </h3>
              <p className="text-sm text-muted-foreground mb-6">
                اختر صورة تحتوي على رمز QR من جهازك
              </p>
              
              <Label htmlFor="qr-upload" className="cursor-pointer">
                <div className="border-2 border-primary/30 rounded-lg p-6 hover:bg-primary/5 transition-colors">
                  <QrCode className="h-8 w-8 mx-auto mb-2 text-primary" />
                  <span className="text-sm font-medium text-primary">انقر لاختيار صورة</span>
                </div>
              </Label>
              <Input
                id="qr-upload"
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    handleFileUpload(file);
                  }
                }}
                className="hidden"
              />

              <div className="mt-6 text-xs text-muted-foreground">
                الصيغ المدعومة: JPG, PNG, WEBP
              </div>
            </div>
          </TabsContent>

          {/* Manual Selection Tab */}
          <TabsContent value="manual" className="space-y-4">
            <div className="border rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <List className="h-5 w-5" />
                اختر تذكرة من القائمة
              </h3>
              
              <ScrollArea className="h-[400px]">
                {recentTickets.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <AlertCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>لا توجد تذاكر متاحة</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {recentTickets
                      .filter(ticket => ticket.status === 'pending' || ticket.status === 'in-progress')
                      .map((ticket) => (
                      <div
                        key={ticket.id}
                        onClick={() => handleTicketSelect(ticket.id)}
                        className="p-4 border rounded-lg hover:bg-primary/5 hover:border-primary cursor-pointer transition-all"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h4 className="font-semibold text-lg">{ticket.clientName}</h4>
                            <p className="text-sm text-muted-foreground">
                              رقم التذكرة: {ticket.ticketNumber}
                            </p>
                          </div>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            ticket.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            ticket.status === 'in-progress' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {ticket.status === 'pending' ? 'قيد الانتظار' :
                             ticket.status === 'in-progress' ? 'قيد المعالجة' :
                             ticket.status}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">{ticket.date}</p>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <OliveButton variant="outline" onClick={handleClose}>
            إلغاء
          </OliveButton>
        </div>
      </DialogContent>
    </Dialog>
  );
}
