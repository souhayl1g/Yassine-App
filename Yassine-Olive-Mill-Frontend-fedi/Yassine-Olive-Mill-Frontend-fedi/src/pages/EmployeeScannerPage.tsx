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

interface ScannedRoomData {
  id: number;
  name: string;
  capacity?: number;
  status: 'active' | 'inactive';
  currentSession?: {
    id: number;
    startTime: string;
    numberOfBoxes: number;
    status: string;
    operationType?: string; // Add operation type to session
    batch: {
      id: number; // Changed from string to number - this is the actual batch database ID
      clientName: string;
      weightIn: number;
      ticketNumber: string; // This remains string - it's the display ticket number
    };
  } | null;
}

export function EmployeeScannerPage() {
  const { toast } = useToast();

  // Scanner state
  const [isCameraActive, setIsCameraActive] = useState(true);
  const [scannedRoom, setScannedRoom] = useState<ScannedRoomData | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Flow state
  const [currentStep, setCurrentStep] = useState<'scanner' | 'room-info' | 'complete-session'>('scanner');
  
  // Form state
  const [numberOfBidons, setNumberOfBidons] = useState('1');

  // Camera refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const qrScannerRef = useRef<QrScanner | null>(null);

  // Helper function to extract payload from API responses
  const getPayload = <T,>(res: any): T => (res && typeof res === 'object' && 'data' in res ? res.data : res);

  // Helper function to calculate duration from start time
  const calculateDuration = (startTime: string): string => {
    const start = new Date(startTime);
    const now = new Date();
    const diffMs = now.getTime() - start.getTime();
    
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours} ساعة و ${minutes} دقيقة`;
    } else {
      return `${minutes} دقيقة`;
    }
  };

  // Process next item from queue automatically
  const processNextQueueItem = async (roomId: number) => {
    try {
      // Get the queue items
      const queueResponse = await api.get('/pressing-queue');
      const queueItems = getPayload<any[]>(queueResponse);
      
      if (!queueItems || queueItems.length === 0) {
        throw new Error('No items in queue');
      }

      // Get the first item in queue (highest priority, oldest first)
      const nextQueueItem = queueItems
        .sort((a, b) => {
          // Sort by priority descending, then by created_at ascending
          if (a.priority !== b.priority) {
            return b.priority - a.priority;
          }
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        })[0];

      if (!nextQueueItem) {
        throw new Error('No valid queue item found');
      }

      // Create a new pressing session for this batch
      const sessionPayload = {
        batch_id: nextQueueItem.batch_id,
        pressing_roomID: roomId,
        number_of_boxes: nextQueueItem.number_of_boxes,
        operator_id: nextQueueItem.operator_id,
        start: new Date().toISOString(),
        status: 'active'
      };

      console.log('Creating new pressing session:', sessionPayload);
      const sessionResponse = await api.post('/pressing-sessions', sessionPayload);
      const newSession = getPayload<any>(sessionResponse);

      // Update the batch status to in_process and assign to room
      await api.put(`/batches/${nextQueueItem.batch_id}`, {
        status: 'in_process',
        pressing_room_id: roomId,
        session_start_time: new Date().toISOString()
      });

      // Remove the item from the queue
      await api.delete(`/pressing-queue/${nextQueueItem.id}`);

      console.log('Successfully processed next queue item:', newSession);
      return newSession;
    } catch (error: any) {
      console.error('Error processing next queue item:', error);
      throw error;
    }
  };

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

      const roomId = qrData.id || qrData.roomId;
      if (!roomId) {
        throw new Error('لم يتم العثور على معرف الغرفة في رمز QR');
      }

      const room = await fetchRoomById(roomId);
      setScannedRoom(room);
      
      // Stop scanning after successful scan
      stopCamera();
      
      // Move to room info step
      setCurrentStep('room-info');
      
      toast({ title: 'نجح', description: 'تم مسح رمز QR بنجاح' });
    } catch (error: any) {
      console.error('QR scan error:', error);
      toast({ variant: 'destructive', title: 'خطأ', description: error.message || 'فشل قراءة رمز QR' });
    }
  };

  // Fetch room by ID from API
  const fetchRoomById = async (roomId: string | number): Promise<ScannedRoomData> => {
    try {
      const res = await api.get<any>(`/pressing-rooms/display-data`);
      const rooms = getPayload<any[]>(res);
      
      const room = rooms.find((r: any) => r.id === Number(roomId));
      if (!room) {
        throw new Error('الغرفة غير موجودة في النظام');
      }

      console.log('Room data from API:', room); // Debug log
      console.log('Current batch data:', room.currentBatch); // Debug current batch structure

      // Transform the room data to match our interface
      // Check if room has an active session (busy status or currentBatch exists)
      const hasActiveSession = room.status === 'busy' || room.currentBatch;
      
      return {
        id: room.id,
        name: room.name,
        capacity: room.capacity,
        status: hasActiveSession ? 'active' : 'inactive',
        currentSession: room.currentBatch ? {
          id: room.currentBatch.sessionId, // Use the actual session ID from backend
          startTime: room.currentBatch.sessionStartTime,
          numberOfBoxes: room.currentBatch.numberOfBatches || 0,
          status: 'active',
          operationType: room.currentBatch.operationType, // Add operation type from API
          batch: {
            id: room.currentBatch.batchId, // Use the actual batch database ID
            clientName: room.currentBatch.clientName,
            weightIn: room.currentBatch.weightIn || 0,
            ticketNumber: room.currentBatch.id // Keep the ticket ID for display
          }
        } : null
      };
    } catch (e: any) {
      const errorMessage = e?.response?.status === 404 
        ? 'الغرفة غير موجودة في النظام'
        : e?.message || 'فشل جلب بيانات الغرفة';
      
      throw new Error(errorMessage);
    }
  };

  // Handle proceeding to complete session
  const handleProceedToCompleteSession = () => {
    setCurrentStep('complete-session');
  };

  // Complete pressing session with bidons count
  const handleCompletePressingSession = async () => {
    if (!scannedRoom?.currentSession) {
      toast({ 
        variant: 'destructive', 
        title: 'خطأ', 
        description: 'لا توجد جلسة نشطة لإنهائها' 
      });
      return;
    }

    // Validate session ID
    if (!scannedRoom.currentSession.id || typeof scannedRoom.currentSession.id !== 'number') {
      toast({ 
        variant: 'destructive', 
        title: 'خطأ', 
        description: 'معرف الجلسة غير صالح. يرجى إعادة مسح رمز QR' 
      });
      return;
    }

    // Validate batch ID
    if (!scannedRoom.currentSession.batch.id || typeof scannedRoom.currentSession.batch.id !== 'number') {
      toast({ 
        variant: 'destructive', 
        title: 'خطأ', 
        description: 'معرف الدفعة غير صالح. يرجى إعادة مسح رمز QR' 
      });
      return;
    }

    // For sale operations, bidons count is 0 (no oil production)
    // For milling operations, validate bidons input
    const bidonsCount = scannedRoom.currentSession.operationType === 'sale' ? 0 : parseInt(numberOfBidons || '1', 10);

    if (scannedRoom.currentSession.operationType !== 'sale' && bidonsCount <= 0) {
      toast({ 
        variant: 'destructive', 
        title: 'خطأ', 
        description: 'يرجى إدخال عدد صحيح من البدونات' 
      });
      return;
    }

    setIsSaving(true);
    try {
      // Complete the pressing session
      const sessionPayload = {
        finish: new Date().toISOString(),
        status: 'done',
        oil_bidons_produced: bidonsCount
      };

      await api.put(`/pressing-sessions/${scannedRoom.currentSession.id}`, sessionPayload);

      // Update batch status to completed
      await api.put(`/batches/${scannedRoom.currentSession.batch.id}`, {
        status: 'completed',
        number_of_bidons: bidonsCount
      });

      // Try to automatically start the next session from the queue
      try {
        await processNextQueueItem(scannedRoom.id);
        const successMessage = scannedRoom.currentSession.operationType === 'sale' 
          ? `تم إكمال عملية البيع بنجاح من ${scannedRoom.name}. تم تحميل العميل التالي من الطابور.`
          : `تم إنهاء جلسة العصر بنجاح. تم إنتاج ${bidonsCount} بدونة زيت من ${scannedRoom.name}. تم تحميل العميل التالي من الطابور.`;
        
        toast({ 
          title: 'نجح', 
          description: successMessage 
        });
      } catch (queueError) {
        console.log('No queue items to process or error processing queue:', queueError);
        const successMessage = scannedRoom.currentSession.operationType === 'sale' 
          ? `تم إكمال عملية البيع بنجاح من ${scannedRoom.name}`
          : `تم إنهاء جلسة العصر بنجاح. تم إنتاج ${bidonsCount} بدونة زيت من ${scannedRoom.name}`;
        
        toast({ 
          title: 'نجح', 
          description: successMessage 
        });
      }
      
      // Reset for next scan
      resetScanner();
    } catch (error: any) {
      console.error('Complete pressing session failed:', error);
      toast({
        variant: 'destructive',
        title: 'خطأ',
        description: error?.response?.data?.error || error?.message || 'فشل في إنهاء جلسة العصر',
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Reset scanner for new scan
  const resetScanner = () => {
    setScannedRoom(null);
    setNumberOfBidons('1');
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

  // Room Info Step
  if (currentStep === 'room-info' && scannedRoom) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 dark:from-gray-900 dark:to-gray-800 p-4">
        <div className="max-w-md mx-auto space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
              ماسح الغرف (الموظف)
            </h1>
            <p className="text-gray-600 dark:text-gray-300">معلومات الغرفة</p>
          </div>

          {/* Operation Type Badge - Show prominently if there's an active session */}
          {scannedRoom.currentSession && (
            <div className="bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 rounded-lg p-4 shadow-lg border-2 border-purple-200 dark:border-purple-800">
              <div className="text-center">
                <h3 className="text-lg font-bold text-purple-900 dark:text-purple-100 mb-2">
                  نوع العملية المطلوبة
                </h3>
                <div className={`inline-flex items-center px-4 py-2 rounded-full text-lg font-bold ${
                  scannedRoom.currentSession.operationType === 'sale' 
                    ? 'bg-orange-500 text-white shadow-orange-200 dark:shadow-orange-800' 
                    : 'bg-blue-500 text-white shadow-blue-200 dark:shadow-blue-800'
                } shadow-lg`}>
                  {scannedRoom.currentSession.operationType === 'sale' ? '🛒 بيع الزيتون' : '⚙️ عصر الزيتون'}
                </div>
              </div>
            </div>
          )}

          {/* Room Info */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg border">
            <h3 className="font-semibold text-purple-800 dark:text-purple-200 mb-4 text-lg">
              بيانات الغرفة
            </h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">اسم الغرفة:</span>
                <span className="font-medium">{scannedRoom.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">السعة:</span>
                <span className="font-medium">{scannedRoom.capacity || 'غير محدد'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">الحالة:</span>
                <span className={`font-medium px-2 py-1 rounded text-xs ${
                  scannedRoom.status === 'active' 
                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                    : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                }`}>
                  {scannedRoom.status === 'active' ? 'نشط' : 'متاح'}
                </span>
              </div>
            </div>
          </div>

          {/* Current Session Info */}
          {scannedRoom.currentSession ? (
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-6 shadow-lg border border-green-200 dark:border-green-800">
              <h3 className="font-semibold text-green-800 dark:text-green-200 mb-4 text-lg">
                الجلسة النشطة
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">العميل:</span>
                  <span className="font-medium text-green-700 dark:text-green-300">
                    {scannedRoom.currentSession.batch.clientName}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">رقم التذكرة:</span>
                  <span className="font-medium text-blue-600 dark:text-blue-400">
                    {scannedRoom.currentSession.batch.ticketNumber}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">نوع العملية:</span>
                  <span className={`font-medium px-2 py-1 rounded text-xs ${
                    scannedRoom.currentSession.operationType === 'sale' 
                      ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' 
                      : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                  }`}>
                    {scannedRoom.currentSession.operationType === 'sale' ? '🛒 بيع' : '⚙️ عصر'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">الوزن:</span>
                  <span className="font-medium">{scannedRoom.currentSession.batch.weightIn} كيلو</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">عدد الصناديق:</span>
                  <span className="font-medium text-purple-600 dark:text-purple-400">
                    {scannedRoom.currentSession.numberOfBoxes}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">وقت البداية:</span>
                  <span className="font-medium text-blue-600 dark:text-blue-400">
                    {new Date(scannedRoom.currentSession.startTime).toLocaleTimeString('en-US', { hour12: false })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">مدة العصر:</span>
                  <span className="font-medium text-orange-600 dark:text-orange-400">
                    {calculateDuration(scannedRoom.currentSession.startTime)}
                  </span>
                </div>
                <div className="bg-yellow-100 dark:bg-yellow-900/30 p-3 rounded-lg mt-4">
                  <p className="text-yellow-800 dark:text-yellow-200 text-center font-medium">
                    🎯 جاهز لإنهاء الجلسة وإدخال عدد البدونات
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-gray-50 dark:bg-gray-900/20 rounded-lg p-6 shadow-lg border border-gray-200 dark:border-gray-800">
              <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-4 text-lg text-center">
                الغرفة متاحة
              </h3>
              <p className="text-gray-600 dark:text-gray-400 text-center">
                لا توجد جلسة عصر نشطة في هذه الغرفة
              </p>
            </div>
          )}

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
            {scannedRoom.currentSession && (
              <OliveButton
                onClick={handleProceedToCompleteSession}
                className="flex-1 text-lg py-3"
              >
                إنهاء الجلسة
              </OliveButton>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Complete Session Step
  if (currentStep === 'complete-session' && scannedRoom?.currentSession) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 dark:from-gray-900 dark:to-gray-800 p-4">
        <div className="max-w-md mx-auto space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
              عدد بدونات الزيت المنتجة
            </h1>
            <p className="text-gray-600 dark:text-gray-300">
              غرفة العصر: {scannedRoom.name}
            </p>
          </div>

          {/* Session Summary */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg border">
            <h3 className="font-semibold text-purple-800 dark:text-purple-200 mb-4 text-lg">
              ملخص الجلسة المكتملة
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">العميل:</span>
                <span className="font-medium">{scannedRoom.currentSession.batch.clientName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">رقم التذكرة:</span>
                <span className="font-medium">{scannedRoom.currentSession.batch.ticketNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">نوع العملية:</span>
                <span className={`font-medium px-2 py-1 rounded text-xs ${
                  scannedRoom.currentSession.operationType === 'selling' 
                    ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' 
                    : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                }`}>
                  {scannedRoom.currentSession.operationType === 'selling' ? '🛒 بيع' : '⚙️ عصر'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">الوزن الداخل:</span>
                <span className="font-medium">{scannedRoom.currentSession.batch.weightIn} كيلو</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">الصناديق المعصورة:</span>
                <span className="font-medium text-purple-600 dark:text-purple-400">
                  {scannedRoom.currentSession.numberOfBoxes}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">مدة العصر:</span>
                <span className="font-medium text-orange-600 dark:text-orange-400">
                  {calculateDuration(scannedRoom.currentSession.startTime)}
                </span>
              </div>
            </div>
          </div>

          {/* Bidons Input - Only show for milling operations */}
          {scannedRoom.currentSession.operationType !== 'sale' && (
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg border space-y-4">
              <div className="space-y-2">
                <Label htmlFor="bidonsProduced" className="flex items-center gap-2 text-lg">
                  <Layers className="h-5 w-5" />
                  عدد بدونات الزيت المنتجة
                </Label>
                <Input
                  id="bidonsProduced"
                  type="number"
                  min="1"
                  max="999"
                  value={numberOfBidons}
                  onChange={(e) => setNumberOfBidons(e.target.value)}
                  placeholder="أدخل عدد البدونات المنتجة"
                  className="text-lg p-3"
                />
                <div className="space-y-1">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    💡 أدخل العدد الإجمالي لبدونات الزيت التي تم إنتاجها من هذه الدفعة
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-500">
                    سيتم حفظ هذه المعلومات وإنهاء جلسة العصر
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Sale Operation Info */}
          {scannedRoom.currentSession.operationType === 'sale' && (
            <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-6">
              <div className="text-center space-y-3">
                <div className="flex items-center justify-center space-x-2">
                  <Box className="h-8 w-8 text-orange-600 dark:text-orange-400" />
                  <span className="text-xl font-bold text-orange-800 dark:text-orange-200">
                    عملية بيع مكتملة
                  </span>
                </div>
                <p className="text-sm text-orange-700 dark:text-orange-300">
                  هذه عملية بيع زيتون وليست عملية عصر. لا يوجد إنتاج زيت أو بدونات في عمليات البيع.
                </p>
                <p className="text-xs text-orange-600 dark:text-orange-400 font-medium">
                  سيتم إنهاء العملية مباشرة دون إدخال عدد البدونات
                </p>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <OliveButton
              variant="outline"
              onClick={() => setCurrentStep('room-info')}
              className="flex-1 text-lg py-3"
              disabled={isSaving}
            >
              <RotateCcw className="h-5 w-5 mr-2" />
              العودة للمعلومات
            </OliveButton>
            <OliveButton
              onClick={handleCompletePressingSession}
              className="flex-1 text-lg py-3"
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  جاري الإنهاء...
                </>
              ) : (
                <>
                  <Save className="h-5 w-5 mr-2" />
                  {scannedRoom.currentSession.operationType === 'sale' ? 'إكمال عملية البيع' : 'إنهاء جلسة العصر'}
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
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 dark:from-gray-900 dark:to-gray-800">
      <div className="flex flex-col h-screen">
        {/* Header */}
        <div className="p-4 text-center bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
            ماسح الغرف (الموظف)
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mt-1">
            وجه الكاميرا نحو رمز QR الخاص بالغرفة
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
                    <div className="absolute -top-1 -left-1 w-6 h-6 border-t-3 border-l-3 border-purple-400 rounded-tl-lg"></div>
                    <div className="absolute -top-1 -right-1 w-6 h-6 border-t-3 border-r-3 border-purple-400 rounded-tr-lg"></div>
                    <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-3 border-l-3 border-purple-400 rounded-bl-lg"></div>
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-3 border-r-3 border-purple-400 rounded-br-lg"></div>
                    
                    {/* Scanning line */}
                    <div className="absolute top-1/2 left-2 right-2 h-0.5 bg-purple-400 animate-pulse"></div>
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
