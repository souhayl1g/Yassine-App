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
  Scan,
  X,
  CheckCircle,
  AlertCircle 
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import QrScanner from 'qr-scanner';
import { Html5Qrcode } from 'html5-qrcode';

interface EnhancedQRScanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onQRCodeScanned: (data: string) => void;
}

export function EnhancedQRScanModal({
  isOpen,
  onClose,
  onQRCodeScanned,
}: EnhancedQRScanModalProps) {
  const [activeTab, setActiveTab] = useState('device');
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isDeviceScannerActive, setIsDeviceScannerActive] = useState(false);
  const [scannedData, setScannedData] = useState('');
  const [scanStatus, setScanStatus] = useState<'idle' | 'scanning' | 'success' | 'error'>('idle');
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const deviceInputRef = useRef<HTMLInputElement>(null);
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const { toast } = useToast();
  const hasAutoStarted = useRef(false);

  // Auto-start scanning when modal opens
  useEffect(() => {
    if (isOpen && !hasAutoStarted.current) {
      hasAutoStarted.current = true;
      // Start with device scanner tab as default
      setActiveTab('device');
      // Small delay to ensure DOM is ready
      const initTimeout = setTimeout(() => {
        startDeviceScanner(); // Start device scanner first
        // Camera will auto-start when user switches to camera tab
      }, 100);
      
      return () => clearTimeout(initTimeout);
    } else if (!isOpen) {
      hasAutoStarted.current = false;
      // Clean up when modal closes
      stopCamera();
      stopDeviceScanner();
    }
  }, [isOpen]);

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

  // Auto-start camera when switching to camera tab
  useEffect(() => {
    if (isOpen && activeTab === 'camera' && !isCameraActive) {
      // Small delay to ensure DOM is ready
      const timer = setTimeout(() => {
        startCamera();
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [activeTab, isOpen, isCameraActive]);

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
    // Prevent multiple starts
    if (isCameraActive) {
      return;
    }

    try {
      // Stop any existing scanner first
      if (html5QrCodeRef.current) {
        try {
          await html5QrCodeRef.current.stop();
          html5QrCodeRef.current.clear();
        } catch (e) {
          // Ignore errors during cleanup
        }
      }

      // Create new scanner instance
      html5QrCodeRef.current = new Html5Qrcode('qr-reader');

      await html5QrCodeRef.current.start(
        { facingMode: 'environment' },
        {
          fps: 30, // Increased from 10 to 30 for faster detection
          qrbox: function(viewfinderWidth, viewfinderHeight) {
            // Use 70% of the minimum dimension for better coverage
            const minEdgeSize = Math.min(viewfinderWidth, viewfinderHeight);
            const qrboxSize = Math.floor(minEdgeSize * 0.7);
            return {
              width: qrboxSize,
              height: qrboxSize
            };
          },
          aspectRatio: 1.0, // Square aspect ratio for QR codes
          disableFlip: false, // Allow flipping for better detection
        },
        (decodedText) => {
          // QR code successfully scanned
          processScannedData(decodedText);
          stopCamera();
        },
        (errorMessage) => {
          // QR code scan error - ignore these as they happen continuously during scanning
        }
      );

      setIsCameraActive(true);
      setScanStatus('scanning');
      
      toast({
        title: 'الكاميرا نشطة',
        description: 'وجه الكاميرا نحو رمز QR',
      });
    } catch (error) {
      console.error('Error accessing camera:', error);
      setIsCameraActive(false);
      toast({
        variant: 'destructive',
        title: 'خطأ في الكاميرا',
        description: 'تعذر الوصول إلى الكاميرا. تحقق من الأذونات.',
      });
    }
  };

  const stopCamera = async () => {
    try {
      if (html5QrCodeRef.current) {
        const state = await html5QrCodeRef.current.getState();
        if (state === 2) { // Scanning state
          await html5QrCodeRef.current.stop();
        }
        html5QrCodeRef.current.clear();
        html5QrCodeRef.current = null;
      }
    } catch (error) {
      console.error('Error stopping camera:', error);
    }
    setIsCameraActive(false);
    setScanStatus('idle');
  };

  // Handle file upload
  const handleFileUpload = async (file: File) => {
    try {
      toast({
        title: 'جاري معالجة الصورة',
        description: 'يتم فك تشفير رمز QR...',
      });
      
      // Use QrScanner to decode QR from image
      const result = await QrScanner.scanImage(file);
      
      if (result) {
        processScannedData(result);
      } else {
        toast({
          variant: 'destructive',
          title: 'خطأ',
          description: 'لم يتم العثور على رمز QR في الصورة',
        });
        setScanStatus('error');
      }
    } catch (error) {
      console.error('QR scan from image error:', error);
      toast({
        variant: 'destructive',
        title: 'خطأ',
        description: 'فشل قراءة رمز QR من الصورة',
      });
      setScanStatus('error');
    }
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
          <TabsList className="grid w-full grid-cols-3 mb-4">
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
              <div className="relative mb-4">
                <div id="qr-reader" className="w-full"></div>
                {!isCameraActive && (
                  <div className="flex flex-col items-center justify-center text-muted-foreground py-12">
                    <Camera className="h-16 w-16 mb-2 opacity-50" />
                    <p className="text-sm">الكاميرا غير نشطة</p>
                  </div>
                )}
              </div>

              {isCameraActive && (
                <p className="text-center text-sm text-primary font-medium mb-4 flex items-center justify-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  وجه الكاميرا نحو رمز QR للمسح الضوئي
                </p>
              )}
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
