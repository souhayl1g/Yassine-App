import React, { useState, useRef, useEffect } from 'react';
import { OliveButton } from '@/components/ui/olive-button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Camera,
  X,
  Save,
  Box,
  Layers,
  RotateCcw
} from 'lucide-react';
import { api } from '@/integrations/api/client';
import { useToast } from '@/hooks/use-toast';
import QrScanner from 'qr-scanner';

interface ScannedTicketData {
  id: string;
  ticketNumber: string;
  clientName: string;
  weightIn: number;
  status: string;
  numberOfBoxes?: number;
  numberOfBidons?: number;
}

export function ScannerPage() {
  const { toast } = useToast();

  // Scanner state
  const [isCameraActive, setIsCameraActive] = useState(true);
  const [scannedTicket, setScannedTicket] = useState<ScannedTicketData | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [numberOfBoxes, setNumberOfBoxes] = useState('');
  const [numberOfBidons, setNumberOfBidons] = useState('');

  // Camera refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const qrScannerRef = useRef<QrScanner | null>(null);

  // Helper function to extract payload from API responses
  const getPayload = <T,>(res: any): T => (res && typeof res === 'object' && 'data' in res ? res.data : res);

  // Initialize camera for QR scanning
  const initializeCamera = async () => {
    if (!videoRef.current) return;

    // Check if we're on HTTPS or localhost
    if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
      toast({
        variant: 'destructive',
        title: 'خطأ في الأمان',
        description: 'الكاميرا تتطلب HTTPS للعمل. يرجى استخدام https:// أو localhost',
      });
      setIsCameraActive(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        } 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      qrScannerRef.current = new QrScanner(
        videoRef.current,
        (result) => {
          handleQRResult(result.data);
        },
        {
          highlightScanRegion: true,
          highlightCodeOutline: true,
          preferredCamera: 'environment',
          maxScansPerSecond: 5,
        }
      );

      await qrScannerRef.current.start();
      setIsCameraActive(true);
    } catch (error: any) {
      console.error('Error accessing camera:', error);
      
      let errorMessage = 'لا يمكن الوصول إلى الكاميرا. يرجى التحقق من الأذونات.';
      
      if (error.name === 'NotAllowedError') {
        errorMessage = 'تم رفض إذن الوصول إلى الكاميرا. يرجى السماح بالوصول إلى الكاميرا في إعدادات المتصفح.';
      } else if (error.name === 'NotFoundError') {
        errorMessage = 'لم يتم العثور على كاميرا. يرجى التأكد من وجود كاميرا متصلة.';
      } else if (error.name === 'SecurityError' || error.message.includes('https')) {
        errorMessage = 'الكاميرا تتطلب HTTPS للعمل. يرجى استخدام https://localhost:5173';
      }
      
      toast({
        variant: 'destructive',
        title: 'خطأ في الكاميرا',
        description: errorMessage,
      });
      setIsCameraActive(false);
    }
  };

  // Stop camera
  const stopCamera = () => {
    if (qrScannerRef.current) {
      qrScannerRef.current.stop();
      qrScannerRef.current.destroy();
      qrScannerRef.current = null;
    }

    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }

    setIsCameraActive(false);
  };

  // Handle QR scan result
  const handleQRResult = async (result: string) => {
    try {
      let qrData;
      try {
        qrData = JSON.parse(result);
      } catch {
        const directId = parseInt(result, 10);
        qrData = { id: isNaN(directId) ? result : directId };
      }

      const ticketId = qrData.id || qrData.ticketId;
      if (!ticketId) {
        throw new Error('لم يتم العثور على معرف التذكرة في رمز QR');
      }

      const ticket = await fetchTicketByCode(ticketId);
      setScannedTicket(ticket);
      
      // Pre-populate form fields with existing values if they exist
      if (ticket.numberOfBoxes !== undefined && ticket.numberOfBoxes > 0) {
        setNumberOfBoxes(String(ticket.numberOfBoxes));
      }
      if (ticket.numberOfBidons !== undefined && ticket.numberOfBidons > 0) {
        setNumberOfBidons(String(ticket.numberOfBidons));
      }
      
      // Stop scanning after successful scan
      stopCamera();
      
      toast({ title: 'نجح', description: 'تم مسح رمز QR بنجاح' });
    } catch (error: any) {
      console.error('QR scan error:', error);
      toast({ variant: 'destructive', title: 'خطأ', description: error.message || 'فشل قراءة رمز QR' });
    }
  };

  // Fetch ticket by code from API
  const fetchTicketByCode = async (code: string | number): Promise<ScannedTicketData> => {
    let idOrCode: string;
    
    if (typeof code === 'number') {
      idOrCode = String(code);
    } else if (typeof code === 'string') {
      const num = parseInt(code.replace(/\D+/g, ''), 10);
      idOrCode = isNaN(num) ? code : String(num);
    } else {
      throw new Error('معرف التذكرة غير صالح');
    }

    try {
      const res = await api.get<any>(`/batches/${idOrCode}`);
      const data = getPayload<any>(res);

      if (!data || !data.id) {
        throw new Error('التذكرة غير موجودة');
      }

      return {
        id: String(data.id),
        ticketNumber: data.ticket_number || `#${data.id}`,
        clientName: data.client
          ? `${data.client.firstname || ''} ${data.client.lastname || ''}`.trim()
          : `عميل #${data.clientId}`,
        weightIn: data.weight_in ?? 0,
        status: data.status || 'received',
        numberOfBoxes: data.number_of_boxes || undefined,
        numberOfBidons: data.number_of_bidons || undefined
      };
    } catch (e: any) {
      const errorMessage = e?.response?.status === 404 
        ? 'التذكرة غير موجودة في النظام'
        : e?.message || 'فشل جلب التذكرة';
      
      throw new Error(errorMessage);
    }
  };

  // Update batch with scanner data
  const handleSaveUpdate = async () => {
    if (!scannedTicket) return;

    const boxes = parseInt(numberOfBoxes || '0', 10);
    const bidons = parseInt(numberOfBidons || '0', 10);

    if (boxes <= 0 && bidons <= 0) {
      toast({ 
        variant: 'destructive', 
        title: 'خطأ', 
        description: 'يرجى إدخال عدد الصناديق أو عدد البيدونات' 
      });
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        numberOfBoxes: boxes,
        numberOfBidons: bidons,
        status: 'in_process'
      };

      await api.put(`/batches/${scannedTicket.id}`, payload);

      toast({ 
        title: 'نجح', 
        description: 'تم تحديث التذكرة بنجاح' 
      });
      
      // Reset for next scan
      resetScanner();
    } catch (error: any) {
      console.error('Update failed:', error);
      toast({
        variant: 'destructive',
        title: 'خطأ',
        description: error?.message || 'فشل في تحديث التذكرة',
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Reset scanner for new scan
  const resetScanner = () => {
    setScannedTicket(null);
    setNumberOfBoxes('');
    setNumberOfBidons('');
    setIsCameraActive(true);
    setTimeout(() => {
      initializeCamera();
    }, 500);
  };

  // Start camera when component mounts
  useEffect(() => {
    initializeCamera();
    return () => {
      stopCamera();
    };
  }, []);

  if (scannedTicket) {
    // Show update form when ticket is scanned
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 dark:from-gray-900 dark:to-gray-800 p-4">
        <div className="max-w-md mx-auto space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
              تحديث التذكرة
            </h1>
          </div>

          {/* Ticket Info */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg border">
            <h3 className="font-semibold text-blue-800 dark:text-blue-200 mb-4 text-lg">
              بيانات التذكرة
            </h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">رقم التذكرة:</span>
                <span className="font-medium">{scannedTicket.ticketNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">اسم العميل:</span>
                <span className="font-medium">{scannedTicket.clientName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">الوزن الداخل:</span>
                <span className="font-medium">{scannedTicket.weightIn} كيلو</span>
              </div>
              {(scannedTicket.numberOfBoxes !== undefined && scannedTicket.numberOfBoxes > 0) && (
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">عدد الصناديق الحالي:</span>
                  <span className="font-medium text-blue-600 dark:text-blue-400">{scannedTicket.numberOfBoxes}</span>
                </div>
              )}
              {(scannedTicket.numberOfBidons !== undefined && scannedTicket.numberOfBidons > 0) && (
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">عدد البيدونات الحالي:</span>
                  <span className="font-medium text-blue-600 dark:text-blue-400">{scannedTicket.numberOfBidons}</span>
                </div>
              )}
            </div>
          </div>

          {/* Input Form */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg border space-y-4">
            <div className="space-y-2">
              <Label htmlFor="boxes" className="flex items-center gap-2 text-lg">
                <Box className="h-5 w-5" />
                عدد الصناديق
              </Label>
              <Input
                id="boxes"
                type="number"
                min="0"
                value={numberOfBoxes}
                onChange={(e) => setNumberOfBoxes(e.target.value)}
                placeholder="أدخل عدد الصناديق"
                className="text-lg p-3"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bidons" className="flex items-center gap-2 text-lg">
                <Layers className="h-5 w-5" />
                عدد البيدونات
              </Label>
              <Input
                id="bidons"
                type="number"
                min="0"
                value={numberOfBidons}
                onChange={(e) => setNumberOfBidons(e.target.value)}
                placeholder="أدخل عدد البيدونات"
                className="text-lg p-3"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <OliveButton
              variant="outline"
              onClick={resetScanner}
              className="flex-1 text-lg py-3"
              disabled={isSaving}
            >
              <RotateCcw className="h-5 w-5 mr-2" />
              مسح جديد
            </OliveButton>
            <OliveButton
              onClick={handleSaveUpdate}
              className="flex-1 text-lg py-3"
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  جاري الحفظ...
                </>
              ) : (
                <>
                  <Save className="h-5 w-5 mr-2" />
                  حفظ التحديث
                </>
              )}
            </OliveButton>
          </div>
        </div>
      </div>
    );
  }

  // Show camera scanner
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 dark:from-gray-900 dark:to-gray-800">
      <div className="flex flex-col h-screen">
        {/* Header */}
        <div className="p-4 text-center bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
            ماسح التذاكر
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mt-1">
            وجه الكاميرا نحو رمز QR
          </p>
        </div>

        {/* Camera View */}
        <div className="flex-1 flex items-center justify-center p-4 bg-gray-100 dark:bg-gray-900">
          <div className="relative w-full max-w-sm aspect-square bg-black rounded-lg overflow-hidden shadow-2xl">
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              autoPlay
              playsInline
              muted
            />
            
            {/* Scanning Overlay */}
            {isCameraActive && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="relative">
                  {/* Scanning frame */}
                  <div className="w-48 h-48 border-2 border-white/70 rounded-lg relative">
                    {/* Corner indicators */}
                    <div className="absolute -top-1 -left-1 w-6 h-6 border-t-3 border-l-3 border-green-400 rounded-tl-lg"></div>
                    <div className="absolute -top-1 -right-1 w-6 h-6 border-t-3 border-r-3 border-green-400 rounded-tr-lg"></div>
                    <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-3 border-l-3 border-green-400 rounded-bl-lg"></div>
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-3 border-r-3 border-green-400 rounded-br-lg"></div>
                    
                    {/* Scanning line */}
                    <div className="absolute top-1/2 left-2 right-2 h-0.5 bg-green-400 animate-pulse"></div>
                  </div>
                  
                  {/* Instructions */}
                  <div className="absolute -bottom-12 left-0 right-0 text-center">
                    <p className="text-white text-sm font-medium bg-black/70 px-3 py-1 rounded-lg">
                      ضع رمز QR داخل الإطار
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Control Buttons */}
        <div className="p-4 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm">
          <div className="flex gap-3 max-w-md mx-auto">
            {!isCameraActive ? (
              <OliveButton
                onClick={initializeCamera}
                className="flex-1 text-lg py-3"
              >
                <Camera className="h-5 w-5 mr-2" />
                تشغيل الكاميرا
              </OliveButton>
            ) : (
              <OliveButton
                variant="outline"
                onClick={stopCamera}
                className="flex-1 text-lg py-3"
              >
                <X className="h-5 w-5 mr-2" />
                إيقاف الكاميرا
              </OliveButton>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}