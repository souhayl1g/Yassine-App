import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Camera, Upload, List, Scan } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';

interface EnhancedQRScanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (qrCode: string) => void;
  availableTickets?: Array<{ id: string; qrCode: string; clientName: string; }>;
}

export const EnhancedQRScanModal: React.FC<EnhancedQRScanModalProps> = ({
  isOpen,
  onClose,
  onScanSuccess,
  availableTickets = [],
}) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'device' | 'camera' | 'upload' | 'list'>('device');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isScanning, setIsScanning] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Clean up camera stream when modal closes or tab changes
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  useEffect(() => {
    if (isOpen && activeTab === 'camera') {
      startCamera();
    } else {
      stopCamera();
    }
  }, [isOpen, activeTab]);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
      }
    } catch (err) {
      setError(t('scanner.cameraError'));
      console.error('Camera error:', err);
    }
  };

  // Handle device scanner (USB/Bluetooth)
  const handleDeviceScan = () => {
    setIsScanning(true);
    setError('');
    
    // Listen for keyboard input from the scanner device
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.key === 'Enter') {
        // Scanner devices typically send Enter after the barcode
        const scannedCode = (document.activeElement as HTMLInputElement)?.value;
        if (scannedCode) {
          onScanSuccess(scannedCode);
          setIsScanning(false);
          document.removeEventListener('keypress', handleKeyPress);
        }
      }
    };

    document.addEventListener('keypress', handleKeyPress);

    // Cleanup after 30 seconds
    setTimeout(() => {
      setIsScanning(false);
      document.removeEventListener('keypress', handleKeyPress);
    }, 30000);
  };

  // Handle file upload
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
        // Here you would use a QR code reading library to decode the image
        // For now, we'll simulate it
        processQRFromImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const processQRFromImage = async (imageData: string) => {
    try {
      // You would integrate a library like jsQR or qr-scanner here
      // For now, this is a placeholder
      setError(t('scanner.processingImage'));
      // Simulate processing
      setTimeout(() => {
        setError(t('scanner.uploadSuccess'));
      }, 1000);
    } catch (err) {
      setError(t('scanner.qrDecodeError'));
    }
  };

  // Handle camera capture
  const captureFromCamera = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0);
        const imageData = canvas.toDataURL('image/png');
        processQRFromImage(imageData);
      }
    }
  };

  // Handle manual ticket selection
  const handleTicketSelect = (qrCode: string) => {
    onScanSuccess(qrCode);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Scan className="h-5 w-5" />
            {t('scanner.scanQRCode')}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="device" className="flex items-center gap-2">
              <Scan className="h-4 w-4" />
              <span className="hidden sm:inline">{t('scanner.device')}</span>
            </TabsTrigger>
            <TabsTrigger value="camera" className="flex items-center gap-2">
              <Camera className="h-4 w-4" />
              <span className="hidden sm:inline">{t('scanner.camera')}</span>
            </TabsTrigger>
            <TabsTrigger value="upload" className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              <span className="hidden sm:inline">{t('scanner.upload')}</span>
            </TabsTrigger>
            <TabsTrigger value="list" className="flex items-center gap-2">
              <List className="h-4 w-4" />
              <span className="hidden sm:inline">{t('scanner.selectTicket')}</span>
            </TabsTrigger>
          </TabsList>

          {/* Device Scanner Tab */}
          <TabsContent value="device" className="space-y-4 py-4">
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <div className="p-8 border-2 border-dashed border-primary rounded-lg bg-primary/5">
                  <Scan className="h-16 w-16 text-primary mx-auto mb-4" />
                  <p className="text-lg font-medium">{t('scanner.deviceReady')}</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    {t('scanner.scanWithDevice')}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="device-input">{t('scanner.scanHere')}</Label>
                <Input
                  id="device-input"
                  type="text"
                  placeholder={t('scanner.waitingForScan')}
                  className="text-center text-lg font-mono"
                  autoFocus
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      const value = (e.target as HTMLInputElement).value;
                      if (value) {
                        onScanSuccess(value);
                      }
                    }
                  }}
                />
              </div>

              {isScanning && (
                <div className="flex items-center justify-center gap-2 text-primary">
                  <div className="animate-pulse">●</div>
                  <span>{t('scanner.scanning')}</span>
                </div>
              )}

              <p className="text-xs text-muted-foreground">
                {t('scanner.deviceInstructions')}
              </p>
            </div>
          </TabsContent>

          {/* Phone Camera Tab */}
          <TabsContent value="camera" className="space-y-4 py-4">
            <div className="space-y-4">
              <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-64 h-64 border-4 border-primary rounded-lg" />
                </div>
              </div>

              <Button
                onClick={captureFromCamera}
                className="w-full"
                size="lg"
              >
                <Camera className="mr-2 h-5 w-5" />
                {t('scanner.capturePhoto')}
              </Button>

              <p className="text-sm text-muted-foreground text-center">
                {t('scanner.alignQRInFrame')}
              </p>
            </div>
          </TabsContent>

          {/* Upload Image Tab */}
          <TabsContent value="upload" className="space-y-4 py-4">
            <div className="space-y-4">
              <div
                className="border-2 border-dashed border-primary rounded-lg p-8 text-center cursor-pointer hover:bg-primary/5 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                {previewUrl ? (
                  <div className="space-y-4">
                    <img
                      src={previewUrl}
                      alt="Preview"
                      className="max-h-64 mx-auto rounded-lg"
                    />
                    <p className="text-sm text-muted-foreground">
                      {selectedFile?.name}
                    </p>
                  </div>
                ) : (
                  <>
                    <Upload className="h-12 w-12 text-primary mx-auto mb-4" />
                    <p className="text-lg font-medium mb-2">
                      {t('scanner.uploadImage')}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {t('scanner.clickToUpload')}
                    </p>
                  </>
                )}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />

              {selectedFile && (
                <Button
                  onClick={() => processQRFromImage(previewUrl)}
                  className="w-full"
                  size="lg"
                >
                  {t('scanner.processImage')}
                </Button>
              )}
            </div>
          </TabsContent>

          {/* Ticket List Tab */}
          <TabsContent value="list" className="space-y-4 py-4">
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-2">
                {availableTickets.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <List className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>{t('scanner.noTickets')}</p>
                  </div>
                ) : (
                  availableTickets.map((ticket) => (
                    <button
                      key={ticket.id}
                      onClick={() => handleTicketSelect(ticket.qrCode)}
                      className="w-full p-4 text-left border rounded-lg hover:bg-accent hover:border-primary transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{ticket.clientName}</p>
                          <p className="text-sm text-muted-foreground font-mono">
                            {ticket.qrCode}
                          </p>
                        </div>
                        <Scan className="h-5 w-5 text-muted-foreground" />
                      </div>
                    </button>
                  ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>

        {error && (
          <div className="p-3 bg-destructive/10 text-destructive rounded-lg text-sm">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            {t('common.cancel')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
