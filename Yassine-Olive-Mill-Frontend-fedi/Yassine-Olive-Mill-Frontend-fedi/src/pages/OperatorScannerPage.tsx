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

// Set the worker path for QR Scanner
QrScanner.WORKER_PATH = '/qr-scanner-worker.min.js';

interface ScannedTicketData {
  id: string;
  ticketNumber: string;
  clientName: string;
  weightIn: number;
  status: string;
  numberOfBoxes?: number;
  numberOfBidons?: number;
}

interface PressingRoom {
  id: number;
  name: string;
  capacity: number;
  status: 'active' | 'inactive';
}

export function OperatorScannerPage() {
  const { toast } = useToast();

  // Scanner state
  const [isCameraActive, setIsCameraActive] = useState(true);
  const [scannedTicket, setScannedTicket] = useState<ScannedTicketData | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Flow state
  const [currentStep, setCurrentStep] = useState<'scanner' | 'ticket-info' | 'room-selection' | 'boxes-input'>('scanner');
  
  // Pressing room state
  const [pressingRooms, setPressingRooms] = useState<PressingRoom[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<PressingRoom | null>(null);
  const [isLoadingRooms, setIsLoadingRooms] = useState(false);
  
  // Form state
  const [numberOfBoxesToProcess, setNumberOfBoxesToProcess] = useState('1');

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

    if (videoRef.current && (videoRef.current as any).srcObject) {
      const stream = (videoRef.current as any).srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      (videoRef.current as any).srcObject = null;
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
      
      // Stop scanning after successful scan
      stopCamera();
      
      // Move to ticket info step
      setCurrentStep('ticket-info');
      
      toast({ title: 'نجح', description: 'تم مسح رمز QR بنجاح' });
    } catch (error: any) {
      console.error('QR scan error:', error);
      toast({ variant: 'destructive', title: 'خطأ', description: error.message || 'فشل قراءة رمز QR' });
    }
  };

  // Fetch pressing rooms with their status
  const fetchPressingRooms = async (): Promise<PressingRoom[]> => {
    try {
      setIsLoadingRooms(true);
      const res = await api.get<PressingRoom[]>('/pressing-rooms');
      const rooms = getPayload<PressingRoom[]>(res);
      setPressingRooms(rooms);
      return rooms;
    } catch (error: any) {
      console.error('Failed to fetch pressing rooms:', error);
      toast({
        variant: 'destructive',
        title: 'خطأ',
        description: 'فشل في جلب غرف العصر',
      });
      return [];
    } finally {
      setIsLoadingRooms(false);
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

  // Handle proceeding to room selection
  const handleProceedToRoomSelection = async () => {
    await fetchPressingRooms();
    setCurrentStep('room-selection');
  };

  // Handle room selection
  const handleRoomSelection = (room: PressingRoom) => {
    if (room.status === 'active') {
      toast({
        variant: 'destructive',
        title: 'خطأ',
        description: 'هذه الغرفة مشغولة حالياً',
      });
      return;
    }
    setSelectedRoom(room);
    setCurrentStep('boxes-input');
  };

  // Create pressing session
  const handleCreatePressingSession = async () => {
    if (!scannedTicket || !selectedRoom) return;

    const boxesToProcess = parseInt(numberOfBoxesToProcess || '1', 10);

    if (boxesToProcess <= 0) {
      toast({ 
        variant: 'destructive', 
        title: 'خطأ', 
        description: 'يرجى إدخال عدد صحيح من الصناديق' 
      });
      return;
    }

    if (scannedTicket.numberOfBoxes && boxesToProcess > scannedTicket.numberOfBoxes) {
      toast({ 
        variant: 'destructive', 
        title: 'خطأ', 
        description: `لا يمكن معالجة أكثر من ${scannedTicket.numberOfBoxes} صندوق` 
      });
      return;
    }

    setIsSaving(true);
    try {
      // Create pressing session
      const sessionPayload = {
        pressing_roomID: selectedRoom.id,
        number_of_boxes: boxesToProcess,
        status: 'active'
      };

      await api.post('/pressing-sessions', sessionPayload);

      toast({ 
        title: 'نجح', 
        description: `تم إنشاء جلسة عصر في ${selectedRoom.name} بنجاح` 
      });
      
      // Reset for next scan
      resetScanner();
    } catch (error: any) {
      console.error('Create pressing session failed:', error);
      toast({
        variant: 'destructive',
        title: 'خطأ',
        description: error?.message || 'فشل في إنشاء جلسة العصر',
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Reset scanner for new scan
  const resetScanner = () => {
    setScannedTicket(null);
    setSelectedRoom(null);
    setPressingRooms([]);
    setNumberOfBoxesToProcess('1');
    setCurrentStep('scanner');
    setIsCameraActive(true);
    setTimeout(() => {
      initializeCamera();
    }, 500);
  };

  // Start camera when component mounts
  useEffect(() => {
    if (currentStep === 'scanner') {
      initializeCamera();
    }
    return () => {
      stopCamera();
    };
  }, [currentStep]);

  // Ticket Info Step
  if (currentStep === 'ticket-info' && scannedTicket) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 dark:from-gray-900 dark:to-gray-800 p-4">
        <div className="max-w-md mx-auto space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
              ماسح التذاكر (المشغل)
            </h1>
            <p className="text-gray-600 dark:text-gray-300">معلومات التذكرة</p>
          </div>

          {/* Ticket Info */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg border">
            <h3 className="font-semibold text-blue-800 dark:text-blue-200 mb-4 text-lg">
              بيانات العميل (للقراءة فقط)
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
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">عدد الصناديق المتبقية:</span>
                <span className="font-medium text-blue-600 dark:text-blue-400">
                  {scannedTicket.numberOfBoxes || 0}
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <OliveButton
              variant="outline"
              onClick={resetScanner}
              className="flex-1 text-lg py-3"
            >
              <RotateCcw className="h-5 w-5 mr-2" />
              مسح جديد
            </OliveButton>
            <OliveButton
              onClick={handleProceedToRoomSelection}
              className="flex-1 text-lg py-3"
            >
              متابعة لاختيار الغرفة
            </OliveButton>
          </div>
        </div>
      </div>
    );
  }

  // Room Selection Step
  if (currentStep === 'room-selection') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 dark:from-gray-900 dark:to-gray-800 p-4">
        <div className="max-w-md mx-auto space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
              اختيار غرفة العصر
            </h1>
            <p className="text-gray-600 dark:text-gray-300">اختر غرفة عصر متاحة</p>
          </div>

          {/* Rooms List */}
          <div className="space-y-3">
            {isLoadingRooms ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                <p className="text-gray-600 dark:text-gray-300">جاري تحميل الغرف...</p>
              </div>
            ) : pressingRooms.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-600 dark:text-gray-300">لا توجد غرف متاحة</p>
              </div>
            ) : (
              pressingRooms.map((room) => (
                <div
                  key={room.id}
                  className={`bg-white dark:bg-gray-800 rounded-lg p-4 shadow-lg border cursor-pointer transition-all ${
                    room.status === 'active' 
                      ? 'border-red-300 bg-red-50 dark:bg-red-900/20 cursor-not-allowed opacity-60' 
                      : 'border-green-300 bg-green-50 dark:bg-green-900/20 hover:shadow-xl'
                  }`}
                  onClick={() => handleRoomSelection(room)}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-semibold text-lg">{room.name}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        السعة: {room.capacity || 'غير محدد'}
                      </p>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                      room.status === 'active' 
                        ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' 
                        : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                    }`}>
                      {room.status === 'active' ? 'مشغولة' : 'متاحة'}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Back Button */}
          <OliveButton
            variant="outline"
            onClick={() => setCurrentStep('ticket-info')}
            className="w-full text-lg py-3"
          >
            <RotateCcw className="h-5 w-5 mr-2" />
            العودة لمعلومات التذكرة
          </OliveButton>
        </div>
      </div>
    );
  }

  // Boxes Input Step
  if (currentStep === 'boxes-input' && selectedRoom) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 dark:from-gray-900 dark:to-gray-800 p-4">
        <div className="max-w-md mx-auto space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
              عدد الصناديق للمعالجة
            </h1>
            <p className="text-gray-600 dark:text-gray-300">غرفة العصر: {selectedRoom.name}</p>
          </div>

          {/* Selected Room Info */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg border">
            <h3 className="font-semibold text-green-800 dark:text-green-200 mb-4 text-lg">
              معلومات الغرفة المختارة
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">اسم الغرفة:</span>
                <span className="font-medium">{selectedRoom.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">الحالة:</span>
                <span className="font-medium text-green-600 dark:text-green-400">متاحة</span>
              </div>
            </div>
          </div>

          {/* Boxes Input */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg border space-y-4">
            <div className="space-y-2">
              <Label htmlFor="boxesToProcess" className="flex items-center gap-2 text-lg">
                <Box className="h-5 w-5" />
                عدد الصناديق للمعالجة
              </Label>
              <Input
                id="boxesToProcess"
                type="number"
                min="1"
                max={scannedTicket?.numberOfBoxes || 999}
                value={numberOfBoxesToProcess}
                onChange={(e) => setNumberOfBoxesToProcess(e.target.value)}
                placeholder="أدخل عدد الصناديق"
                className="text-lg p-3"
              />
              {scannedTicket?.numberOfBoxes && (
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  الحد الأقصى: {scannedTicket.numberOfBoxes} صندوق
                </p>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <OliveButton
              variant="outline"
              onClick={() => setCurrentStep('room-selection')}
              className="flex-1 text-lg py-3"
              disabled={isSaving}
            >
              <RotateCcw className="h-5 w-5 mr-2" />
              العودة للغرف
            </OliveButton>
            <OliveButton
              onClick={handleCreatePressingSession}
              className="flex-1 text-lg py-3"
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  جاري الإنشاء...
                </>
              ) : (
                <>
                  <Save className="h-5 w-5 mr-2" />
                  إنشاء جلسة العصر
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
            ماسح التذاكر (المشغل)
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
