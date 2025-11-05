import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { OliveButton } from '@/components/ui/olive-button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Camera,
  X,
  Save,
  Box,
  Layers,
  RotateCcw,
  Package
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
  const navigate = useNavigate();

  // Scanner state
  const [isCameraActive, setIsCameraActive] = useState(true);
  const [scannedRoom, setScannedRoom] = useState<ScannedRoomData | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Flow state
  const [currentStep, setCurrentStep] = useState<'scanner' | 'room-info' | 'complete-session' | 'oil-weight-input'>('scanner');
  
  // Form state
  const [numberOfBidons, setNumberOfBidons] = useState('1');
  const [selectedContainer, setSelectedContainer] = useState<string>('');
  const [oilWeight, setOilWeight] = useState<string>('');
  const [containers, setContainers] = useState<any[]>([]);
  const [isLoadingContainers, setIsLoadingContainers] = useState(false);

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

  // Fetch containers from API
  const fetchContainers = async () => {
    setIsLoadingContainers(true);
    try {
      const response = await api.get('/employee/containers');
      const containersData = getPayload<any[]>(response);
      setContainers(containersData);
    } catch (error: any) {
      console.error('Error fetching containers:', error);
      toast({
        variant: 'destructive',
        title: 'خطأ',
        description: 'فشل في تحميل قائمة الحاويات',
      });
      // Fallback to empty array
      setContainers([]);
    } finally {
      setIsLoadingContainers(false);
    }
  };

  // Process next item from queue automatically
  const processNextQueueItem = async (roomId: number) => {
    try {
      // Get the queue items
      const queueResponse = await api.get('/employee/pressing-queue');
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
      const sessionResponse = await api.post('/employee/pressing-session', sessionPayload);
      const newSession = getPayload<any>(sessionResponse);

      // Update the batch status to in_process and assign to room
      await api.put(`/employee/batch/${nextQueueItem.batch_id}`, {
        status: 'in_process',
        pressing_room_id: roomId,
        session_start_time: new Date().toISOString()
      });

      // Remove the item from the queue
      await api.delete(`/employee/queue/${nextQueueItem.id}`);

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

      const batchId = qrData.id || qrData.ticketId;
      if (!batchId) {
        throw new Error('لم يتم العثور على معرف التذكرة في رمز QR');
      }

      // First fetch the batch to get its information
      const batch = await fetchBatchById(batchId);
      
      // Then find the room where this batch is currently being processed
      const room = await findRoomByBatch(batch);
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

  // Fetch batch by ID from API (similar to OperatorScannerPage)
  const fetchBatchById = async (batchId: string | number) => {
    let idOrCode: string;
    
    if (typeof batchId === 'number') {
      idOrCode = String(batchId);
    } else if (typeof batchId === 'string') {
      const num = parseInt(batchId.replace(/\D+/g, ''), 10);
      idOrCode = isNaN(num) ? batchId : String(num);
    } else {
      throw new Error('معرف التذكرة غير صالح');
    }

    try {
      const res = await api.get<any>(`/employee/batch/${idOrCode}/details`);
      const data = getPayload<any>(res);

      if (!data || !data.id) {
        throw new Error('التذكرة غير موجودة في النظام');
      }

      return {
        id: String(data.id),
        ticketNumber: data.ticket_number || `#${data.id}`,
        clientName: data.client
          ? `${data.client.firstname || ''} ${data.client.lastname || ''}`.trim()
          : `Client #${data.clientId}`,
        weightIn: data.weight_in ?? 0,
        status: data.status || 'received',
        numberOfBoxes: data.number_of_boxes || undefined,
        numberOfBidons: data.number_of_bidons || undefined,
        operationType: data.operation_type || 'milling'
      };
    } catch (e: any) {
      const errorMessage = e?.response?.status === 404 
        ? 'التذكرة غير موجودة في النظام'
        : e?.message || 'فشل جلب بيانات التذكرة';
      
      throw new Error(errorMessage);
    }
  };

  // Find room where this batch is currently being processed
  const findRoomByBatch = async (batch: any): Promise<ScannedRoomData> => {
    try {
      const res = await api.get<any>(`/employee/rooms/display-data`);
      const rooms = getPayload<any[]>(res);
      
      // Find the room that has this batch currently active
      const room = rooms.find((r: any) => 
        r.currentBatch && 
        (r.currentBatch.batchId === parseInt(batch.id) || 
         r.currentBatch.id === batch.ticketNumber ||
         r.currentBatch.id === batch.id)
      );

      if (!room) {
        throw new Error('هذه التذكرة غير موجودة في أي غرفة عصر حالياً');
      }

      console.log('Found room for batch:', room); // Debug log
      console.log('Current batch data:', room.currentBatch); // Debug current batch structure

      // Transform the room data to match our interface
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
          operationType: room.currentBatch.operationType || batch.operationType, // Use from API or batch
          batch: {
            id: room.currentBatch.batchId || parseInt(batch.id), // Use the actual batch database ID
            clientName: room.currentBatch.clientName || batch.clientName,
            weightIn: room.currentBatch.weightIn || batch.weightIn || 0,
            ticketNumber: room.currentBatch.id || batch.ticketNumber // Keep the ticket ID for display
          }
        } : null
      };
    } catch (e: any) {
      const errorMessage = e?.response?.status === 404 
        ? 'غرف العصر غير متاحة حالياً'
        : e?.message || 'فشل العثور على غرفة العصر للتذكرة';
      
      throw new Error(errorMessage);
    }
  };

  // Handle proceeding to complete session
  const handleProceedToCompleteSession = () => {
    // For sale operations, load containers first, then go to oil weight input
    if (scannedRoom?.currentSession?.operationType === 'sale') {
      fetchContainers();
      setCurrentStep('oil-weight-input');
    } else {
      // For milling operations, go directly to complete session
      setCurrentStep('complete-session');
    }
  };

  // Handle proceeding from oil weight input to complete session
  const handleProceedFromOilWeight = () => {
    if (!oilWeight || parseFloat(oilWeight) <= 0) {
      toast({ 
        variant: 'destructive', 
        title: 'خطأ', 
        description: 'يرجى إدخال وزن صحيح للزيت' 
      });
      return;
    }
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

    // For sale operations, validate oil weight and container selection
    // For milling operations, validate bidons input
    if (scannedRoom.currentSession.operationType === 'sale') {
      if (!oilWeight || parseFloat(oilWeight) <= 0) {
        toast({ 
          variant: 'destructive', 
          title: 'خطأ', 
          description: 'يرجى إدخال وزن صحيح للزيت' 
        });
        return;
      }
      if (!selectedContainer) {
        toast({ 
          variant: 'destructive', 
          title: 'خطأ', 
          description: 'يرجى اختيار الحاوية لتخزين الزيتون' 
        });
        return;
      }
    }

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

      await api.put(`/employee/pressing-session/${scannedRoom.currentSession.id}/complete`, sessionPayload);

      // Update batch status to completed
      await api.put(`/employee/batch/${scannedRoom.currentSession.batch.id}`, {
        status: 'completed',
        number_of_bidons: bidonsCount
      });

      // For sale operations, create an oil batch record with container assignment
      if (scannedRoom.currentSession.operationType === 'sale' && oilWeight && selectedContainer) {
        try {
          const oilBatchPayload = {
            weight: parseInt(parseFloat(oilWeight).toString()), // Convert to integer as expected by backend
            batchId: scannedRoom.currentSession.batch.id,
            pressing_sessionId: scannedRoom.currentSession.id,
            containerId: parseInt(selectedContainer) // Use the container ID from selection
          };

          console.log('Creating oil batch with container:', oilBatchPayload);
          const oilBatchResponse = await api.post('/employee/oil-batch/with-container', oilBatchPayload);
          console.log('Oil batch created and assigned to container successfully:', getPayload(oilBatchResponse));
        } catch (oilBatchError) {
          console.error('Failed to create oil batch with container:', oilBatchError);
          // Don't fail the entire operation if oil batch creation fails
          toast({
            variant: 'destructive',
            title: 'تحذير',
            description: 'تم إكمال العملية ولكن فشل في إنشاء سجل دفعة الزيت وتخزينها في الحاوية',
          });
        }
      }

      // Try to automatically start the next session from the queue
      try {
        await processNextQueueItem(scannedRoom.id);
        const containerLabel = selectedContainer ? containers.find(c => c.id.toString() === selectedContainer)?.label : '';
        const successMessage = scannedRoom.currentSession.operationType === 'sale' 
          ? `تم إكمال عملية البيع بنجاح من ${scannedRoom.name}. وزن الزيت: ${oilWeight} كيلو. تم تخزين الزيت في ${containerLabel}. تم تحميل العميل التالي من الطابور.`
          : `تم إنهاء جلسة العصر بنجاح. تم إنتاج ${bidonsCount} بدونة زيت من ${scannedRoom.name}. تم تحميل العميل التالي من الطابور.`;
        
        toast({ 
          title: 'نجح', 
          description: successMessage 
        });
      } catch (queueError) {
        console.log('No queue items to process or error processing queue:', queueError);
        const containerLabel = selectedContainer ? containers.find(c => c.id.toString() === selectedContainer)?.label : '';
        const successMessage = scannedRoom.currentSession.operationType === 'sale' 
          ? `تم إكمال عملية البيع بنجاح من ${scannedRoom.name}. وزن الزيت: ${oilWeight} كيلو. تم تخزين الزيت في ${containerLabel}`
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
    setSelectedContainer('');
    setOilWeight('');
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
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 dark:from-gray-900 dark:to-gray-800 p-2 sm:p-4">
        <div className="max-w-md mx-auto space-y-4 sm:space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-white">
              ماسح التذاكر (المشغل)
            </h1>
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300">معلومات الغرفة والجلسة</p>
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
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 sm:p-6 shadow-lg border">
            <h3 className="font-semibold text-purple-800 dark:text-purple-200 mb-3 sm:mb-4 text-base sm:text-lg">
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
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 sm:p-6 shadow-lg border border-green-200 dark:border-green-800">
              <h3 className="font-semibold text-green-800 dark:text-green-200 mb-3 sm:mb-4 text-base sm:text-lg">
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
            <div className="bg-gray-50 dark:bg-gray-900/20 rounded-lg p-4 sm:p-6 shadow-lg border border-gray-200 dark:border-gray-800">
              <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-3 sm:mb-4 text-base sm:text-lg text-center">
                الغرفة متاحة
              </h3>
              <p className="text-gray-600 dark:text-gray-400 text-center">
                لا توجد جلسة عصر نشطة في هذه الغرفة
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <OliveButton
              variant="outline"
              onClick={resetScanner}
              className="flex-1 text-base sm:text-lg py-2 sm:py-3"
            >
              <RotateCcw className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
              مسح جديد
            </OliveButton>
            {scannedRoom.currentSession && (
              <OliveButton
                onClick={handleProceedToCompleteSession}
                className="flex-1 text-base sm:text-lg py-2 sm:py-3"
              >
                إنهاء الجلسة
              </OliveButton>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Oil Weight Input Step - Only for sale operations
  if (currentStep === 'oil-weight-input' && scannedRoom?.currentSession?.operationType === 'sale') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 dark:from-gray-900 dark:to-gray-800 p-2 sm:p-4">
        <div className="max-w-md mx-auto space-y-4 sm:space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-white">
              وزن الزيت المباع
            </h1>
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300">
              غرفة العصر: {scannedRoom.name}
            </p>
          </div>

          {/* Sale Operation Info */}
          <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-6">
            <div className="text-center space-y-3">
              <div className="flex items-center justify-center space-x-2">
                <Box className="h-8 w-8 text-orange-600 dark:text-orange-400" />
                <span className="text-xl font-bold text-orange-800 dark:text-orange-200">
                  عملية بيع زيت
                </span>
              </div>
              <p className="text-sm text-orange-700 dark:text-orange-300">
                يرجى إدخال وزن الزيت الذي تم بيعه للعميل
              </p>
            </div>
          </div>

          {/* Session Summary */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg border">
            <h3 className="font-semibold text-purple-800 dark:text-purple-200 mb-4 text-lg">
              معلومات العملية
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
                <span className="font-medium px-2 py-1 rounded text-xs bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">
                  🛒 بيع زيت
                </span>
              </div>
            </div>
          </div>

          {/* Oil Weight Input */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg border space-y-4">
            <div className="space-y-2">
              <Label htmlFor="oilWeight" className="flex items-center gap-2 text-base sm:text-lg">
                <Package className="h-4 w-4 sm:h-5 sm:w-5" />
                وزن الزيت المباع (كيلو)
              </Label>
              <Input
                id="oilWeight"
                type="number"
                min="0.1"
                max="9999"
                step="0.1"
                value={oilWeight}
                onChange={(e) => setOilWeight(e.target.value)}
                placeholder="أدخل وزن الزيت بالكيلو"
                className="text-base sm:text-lg p-2 sm:p-3"
              />
              <div className="space-y-1">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  ⚖️ أدخل الوزن الدقيق للزيت الذي تم بيعه
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500">
                  يمكن إدخال الأرقام العشرية (مثال: 15.5)
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <OliveButton
              variant="outline"
              onClick={() => setCurrentStep('room-info')}
              className="flex-1 text-base sm:text-lg py-2 sm:py-3"
            >
              <RotateCcw className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
              العودة للمعلومات
            </OliveButton>
            <OliveButton
              onClick={handleProceedFromOilWeight}
              className="flex-1 text-base sm:text-lg py-2 sm:py-3"
              disabled={!oilWeight || parseFloat(oilWeight) <= 0}
            >
              متابعة لاختيار الحاوية
            </OliveButton>
          </div>
        </div>
      </div>
    );
  }

  // Complete Session Step
  if (currentStep === 'complete-session' && scannedRoom?.currentSession) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 dark:from-gray-900 dark:to-gray-800 p-2 sm:p-4">
        <div className="max-w-md mx-auto space-y-4 sm:space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-white">
              عدد بدونات الزيت المنتجة
            </h1>
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300">
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
                  scannedRoom.currentSession.operationType === 'sale' 
                    ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' 
                    : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                }`}>
                  {scannedRoom.currentSession.operationType === 'sale' ? '🛒 بيع' : '⚙️ عصر'}
                </span>
              </div>
              {/* Show oil weight for sale operations */}
              {scannedRoom.currentSession.operationType === 'sale' && oilWeight && (
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">وزن الزيت المباع:</span>
                  <span className="font-medium text-orange-600 dark:text-orange-400">
                    {oilWeight} كيلو
                  </span>
                </div>
              )}
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
                <Label htmlFor="bidonsProduced" className="flex items-center gap-2 text-base sm:text-lg">
                  <Layers className="h-4 w-4 sm:h-5 sm:w-5" />
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
                  className="text-base sm:text-lg p-2 sm:p-3"
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

          {/* Container Selection - Only show for sale operations */}
          {scannedRoom.currentSession.operationType === 'sale' && (
            <div className="space-y-4">
              {/* Header */}
              <div className="text-center space-y-2">
                <h3 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-white flex items-center justify-center gap-2">
                  <Package className="h-5 w-5 sm:h-6 sm:w-6" />
                  اختيار الحاوية
                </h3>
                <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300">
                  اختر الحاوية لتخزين الزيت
                </p>
              </div>

              {/* Loading State */}
              {isLoadingContainers && (
                <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg border">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">جاري تحميل الحاويات...</p>
                  </div>
                </div>
              )}

              {/* Container Options */}
              {!isLoadingContainers && containers.length > 0 && (
                <div className="space-y-3">
                  {containers.map((container) => (
                    <div
                      key={container.id}
                      className={`bg-white dark:bg-gray-800 rounded-lg p-3 sm:p-4 shadow-lg border cursor-pointer transition-all ${
                        selectedContainer === container.id.toString()
                          ? 'border-green-500 bg-green-50 dark:bg-green-900/20 shadow-green-200 dark:shadow-green-800'
                          : 'border-gray-300 dark:border-gray-600 hover:shadow-xl hover:border-blue-300 dark:hover:border-blue-600'
                      }`}
                      onClick={() => setSelectedContainer(container.id.toString())}
                    >
                      <div className="flex justify-between items-center">
                        <div className="flex items-center space-x-2 sm:space-x-3">
                          <Package className={`h-5 w-5 sm:h-6 sm:w-6 ${
                            selectedContainer === container.id.toString()
                              ? 'text-green-600 dark:text-green-400'
                              : 'text-gray-600 dark:text-gray-400'
                          }`} />
                          <div>
                            <h4 className={`font-semibold text-base sm:text-lg ${
                              selectedContainer === container.id.toString()
                                ? 'text-green-800 dark:text-green-200'
                                : 'text-gray-800 dark:text-gray-200'
                            }`}>
                              {container.label}
                            </h4>
                            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                              <span>السعة: {container.capacity} كيلو</span>
                              <span>•</span>
                              <span>المحتوى الحالي: {container.currentWeight} كيلو</span>
                            </div>
                          </div>
                        </div>
                        <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                          selectedContainer === container.id.toString()
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                        }`}>
                          {selectedContainer === container.id.toString() ? '✓ محدد' : 'متاح'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* No Containers Message */}
              {!isLoadingContainers && containers.length === 0 && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                  <p className="text-sm text-yellow-700 dark:text-yellow-300 text-center">
                    ⚠️ لا توجد حاويات متاحة في النظام
                  </p>
                </div>
              )}

              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <p className="text-sm text-blue-700 dark:text-blue-300 text-center">
                  📦 يجب تحديد الحاوية قبل إكمال عملية البيع
                </p>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <OliveButton
              variant="outline"
              onClick={() => scannedRoom?.currentSession?.operationType === 'sale' ? setCurrentStep('oil-weight-input') : setCurrentStep('room-info')}
              className="flex-1 text-base sm:text-lg py-2 sm:py-3"
              disabled={isSaving}
            >
              <RotateCcw className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
              <span className="truncate">
                {scannedRoom?.currentSession?.operationType === 'sale' ? 'العودة لوزن الزيت' : 'العودة للمعلومات'}
              </span>
            </OliveButton>
            <OliveButton
              onClick={handleCompletePressingSession}
              className="flex-1 text-base sm:text-lg py-2 sm:py-3"
              disabled={isSaving || (scannedRoom.currentSession.operationType === 'sale' && !selectedContainer)}
            >
              {isSaving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 sm:h-5 sm:w-5 border-b-2 border-white mr-2"></div>
                  <span className="truncate">جاري الإنهاء...</span>
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                  <span className="truncate">
                    {scannedRoom.currentSession.operationType === 'sale' ? 'إكمال عملية البيع' : 'إنهاء جلسة العصر'}
                  </span>
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
        <div className="p-3 sm:p-4 text-center bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-white">
            ماسح التذاكر (المشغل)
          </h1>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 mt-1">
            وجه الكاميرا نحو رمز QR الخاص بالتذكرة
          </p>
        </div>

        {/* Camera View */}
        <div className="flex-1 flex flex-col items-center justify-center p-2 sm:p-4 bg-gray-100 dark:bg-gray-900 space-y-4">
          <div className="relative w-full max-w-xs sm:max-w-sm aspect-square bg-black rounded-lg overflow-hidden shadow-2xl">
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
                  <div className="w-40 h-40 sm:w-48 sm:h-48 border-2 border-white/70 rounded-lg relative">
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
                      ضع رمز QR الخاص بالتذكرة داخل الإطار
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Navigation Buttons - Below Camera */}
          <div className="flex gap-2 w-full max-w-xs sm:max-w-sm">
            <OliveButton
              variant="outline"
              onClick={() => navigate('/employee-scanner')}
              className="flex-1 text-sm sm:text-base py-2"
            >
              📷 ماسح الغرف
            </OliveButton>
            <OliveButton
              variant="outline"
              onClick={() => navigate('/operator-scanner')}
              className="flex-1 text-sm sm:text-base py-2"
            >
              🎯 ماسح المشغل
            </OliveButton>
          </div>
        </div>

        {/* Control Buttons */}
        <div className="p-3 sm:p-4 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm">
          <div className="flex gap-3 max-w-md mx-auto">
            {!isCameraActive ? (
              <OliveButton
                onClick={initializeCamera}
                className="flex-1 text-base sm:text-lg py-2 sm:py-3"
              >
                <Camera className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                تشغيل الكاميرا
              </OliveButton>
            ) : (
              <OliveButton
                variant="outline"
                onClick={stopCamera}
                className="flex-1 text-base sm:text-lg py-2 sm:py-3"
              >
                <X className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                إيقاف الكاميرا
              </OliveButton>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
