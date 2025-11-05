import React, { useState, useRef, useEffect } from 'react';
import { OliveButton } from '@/components/ui/olive-button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Camera,
  X,
  Save,
  Box,
  RotateCcw,
  Clock,
  Users
} from 'lucide-react';
import { api } from '@/integrations/api/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import QrScanner from 'qr-scanner';

// Set the worker path for QR Scanner
QrScanner.WORKER_PATH = '/qr-scanner-worker.min.js';

interface ScannedTicketData {
  id: string;
  ticketNumber: string;
  clientName: string;
  weightIn: number;
  status: string;
  operationType?: string;
  numberOfBoxes?: number;
}

export function QueuerScannerPage() {
  const { toast } = useToast();
  const { user } = useAuth();

  // Scanner state
  const [isCameraActive, setIsCameraActive] = useState(true);
  const [scannedTicket, setScannedTicket] = useState<ScannedTicketData | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [numberOfBoxes, setNumberOfBoxes] = useState('');

  // Active queuer sessions state
  const [hasPartiallyQueued, setHasPartiallyQueued] = useState(false);
  const [partiallyQueuedInfo, setPartiallyQueuedInfo] = useState<any>(null);

  // Camera refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const qrScannerRef = useRef<QrScanner | null>(null);

  // Helper function to extract payload from API responses
  const getPayload = <T,>(res: any): T => (res && typeof res === 'object' && 'data' in res ? res.data : res);

  // Check queuer session status
  const checkQueuerSession = async (): Promise<any> => {
    try {
      if (!user?.id) {
        console.error('No user ID available');
        return null;
      }
      const res = await api.get<any>(`/pressing-queue/queuer/${user.id}/session`);
      return getPayload<any>(res);
    } catch (error) {
      console.error('Failed to check queuer session:', error);
      return null;
    }
  };

  // Check for active queuer sessions (batches currently being queued) system-wide
  const checkPartiallyQueuedBatches = async () => {
    try {
      const res = await api.get<any>('/pressing-queue/partially-queued');
      const data = getPayload<any>(res);
      
      setHasPartiallyQueued(data.hasPartiallyQueued);
      if (data.hasPartiallyQueued && data.partiallyQueuedBatches.length > 0) {
        setPartiallyQueuedInfo(data.partiallyQueuedBatches[0]); // Show info for the first active queuer session
      } else {
        setPartiallyQueuedInfo(null);
      }
    } catch (error) {
      console.error('Failed to check active queuer sessions:', error);
      setHasPartiallyQueued(false);
      setPartiallyQueuedInfo(null);
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

      // Note: We'll check for active queuer sessions system-wide later in the form display
      // Allow the scan to proceed even if there are active sessions
      // The warning will be shown in the form interface instead of blocking the scan

      const ticket = await fetchTicketByCode(ticketId);
      setScannedTicket(ticket);
      
      // Pre-populate form fields with existing values if they exist
      if (ticket.numberOfBoxes !== undefined && ticket.numberOfBoxes > 0) {
        setNumberOfBoxes(String(ticket.numberOfBoxes));
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

      // Calculate available boxes 
      // We need to check if this batch has an active queuer session
      // If it does, use the session data instead of the batch loading data
      const totalBoxes = data.number_of_boxes || 0;
      let availableBoxes = totalBoxes;
      
      // Check if there's an active queuer session for this batch
      try {
        const sessionRes = await api.get<any>('/pressing-queue/partially-queued');
        const sessionData = getPayload<any>(sessionRes);
        
        if (sessionData.hasPartiallyQueued && sessionData.partiallyQueuedBatches.length > 0) {
          const thisSessionBatch = sessionData.partiallyQueuedBatches.find(
            (batch: any) => batch.id === parseInt(data.id)
          );
          
          if (thisSessionBatch) {
            // This batch has an active session, use remaining boxes from session
            availableBoxes = thisSessionBatch.remainingBoxes;
          } else {
            // This batch doesn't have an active session, but others might
            // Use the normal calculation but subtract committed boxes instead of loaded boxes
            const loadedBoxes = data.boxes_loaded_to_pressing || 0;
            const committedBoxes = data.boxes_committed_to_queue || 0;
            availableBoxes = totalBoxes - Math.max(loadedBoxes - committedBoxes, 0);
          }
        } else {
          // No active sessions, use normal calculation
          const loadedBoxes = data.boxes_loaded_to_pressing || 0;
          const committedBoxes = data.boxes_committed_to_queue || 0;
          availableBoxes = totalBoxes - Math.max(loadedBoxes - committedBoxes, 0);
        }
      } catch (error) {
        console.error('Error checking queuer sessions:', error);
        // Fallback to basic calculation
        const loadedBoxes = data.boxes_loaded_to_pressing || 0;
        availableBoxes = totalBoxes - loadedBoxes;
      }

      return {
        id: String(data.id),
        ticketNumber: data.ticket_number || `#${data.id}`,
        clientName: data.client
          ? `${data.client.firstname || ''} ${data.client.lastname || ''}`.trim()
          : `עميل #${data.clientId}`,
        weightIn: data.weight_in ?? 0,
        status: data.status || 'received',
        operationType: data.operation_type || 'milling',
        numberOfBoxes: availableBoxes > 0 ? availableBoxes : undefined
      };
    } catch (e: any) {
      const errorMessage = e?.response?.status === 404 
        ? 'التذكرة غير موجودة في النظام'
        : e?.message || 'فشل جلب التذكرة';
      
      throw new Error(errorMessage);
    }
  };

  // Add ticket to queue - specific functionality for queuer role
  const handleAddToQueue = async () => {
    if (!scannedTicket) return;

    // Check for conflicting sessions before proceeding
    if (hasPartiallyQueued && partiallyQueuedInfo && partiallyQueuedInfo.id !== parseInt(scannedTicket.id)) {
      // Don't show error toast - the UI already shows the warning and button is disabled
      return;
    }

    const boxes = parseInt(numberOfBoxes || '0', 10);

    if (boxes <= 0) {
      toast({ 
        variant: 'destructive', 
        title: 'خطأ', 
        description: 'يرجى إدخال عدد الصناديق' 
      });
      return;
    }

    // Check if trying to add more boxes than available
    const availableBoxes = scannedTicket.numberOfBoxes || 0;
    if (boxes > availableBoxes) {
      toast({ 
        variant: 'destructive', 
        title: 'خطأ', 
        description: `العدد المطلوب ${boxes} أكبر من المتاح ${availableBoxes}` 
      });
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        batchId: parseInt(scannedTicket.id),
        numberOfBoxes: boxes,
        queuerId: user?.id || 1,
        notes: 'Added to queue by queuer'
      };

      console.log('Sending queue payload:', payload);
      await api.post('/pressing-queue', payload);

      // Check if session is now complete
      const sessionStatus = await checkQueuerSession();
      const isSessionComplete = !sessionStatus?.hasActiveSession;
      
      let successMessage = 'تم إضافة التذكرة إلى قائمة الانتظار بنجاح';
      if (isSessionComplete) {
        successMessage += ' - تم إنهاء معالجة الدفعة بالكامل!';
      } else if (sessionStatus?.session?.remainingBoxes) {
        successMessage += ` - متبقي ${sessionStatus.session.remainingBoxes} صندوق`;
      }
      
      toast({ 
        title: 'نجح', 
        description: successMessage 
      });
      
      // Reset for next scan
      resetScanner();
    } catch (error: any) {
      console.error('Queue addition failed:', error);
      
      // Handle all conflicting session errors - show in UI instead of toast
      const errorData = error?.response?.data;
      const errorText = errorData?.message || errorData?.error || error?.message || '';
      
      // Comprehensive check for conflicting session errors
      const isConflictingSessionError = (
        // Status code checks
        error?.response?.status === 409 ||
        error?.response?.status === 400 ||
        
        // Data property checks
        errorData?.activeSession || 
        errorData?.conflictingSession ||
        errorData?.cannotQueue ||
        errorData?.hasPartiallyQueued ||
        errorData?.partiallyQueuedBatches ||
        
        // English error message patterns
        (errorText && (
          errorText.includes('Cannot queue a new batch') ||
          errorText.includes('Cannot switch to a different batch') ||
          errorText.includes('another batch is being queued') ||
          errorText.includes('while processing another batch') ||
          errorText.includes('partially queued') ||
          errorText.includes('active session') ||
          errorText.includes('finish the batch in progress') ||
          errorText.includes('must finish processing the current batch')
        )) ||
        
        // Arabic error message patterns  
        (errorText && (
          errorText.includes('يجب إنهاء معالجة الدفعة الحالية') ||
          errorText.includes('دفعة أخرى قيد المعالجة') ||
          errorText.includes('لا يمكن بدء دفعة جديدة') ||
          errorText.includes('إنهاء الدفعة الحالية أولاً') ||
          errorText.includes('جلسة نشطة') ||
          errorText.includes('معالجة جارية')
        )) ||
        
        // Generic conflict indicators
        (errorText && (
          errorText.toLowerCase().includes('conflict') ||
          errorText.toLowerCase().includes('session') ||
          errorText.toLowerCase().includes('batch') ||
          errorText.toLowerCase().includes('queue')
        ) && (
          errorText.toLowerCase().includes('active') ||
          errorText.toLowerCase().includes('progress') ||
          errorText.toLowerCase().includes('processing') ||
          errorText.toLowerCase().includes('current')
        ))
      );

      if (isConflictingSessionError) {
        // This is a conflicting session error, refresh the status to show in UI
        console.log('Detected conflicting session error:', {
          status: error?.response?.status,
          errorData,
          errorText,
          fullError: error
        });
        
        // Extract conflict information from the error message if available
        // Backend sends Arabic message like: "يجب إنهاء معالجة الدفعة الحالية قبل البدء في دفعة جديدة: 2025/10/27/001 - rick james (متبقي 740 صندوق) - جاري المعالجة بواسطة: queuer queuer"
        let conflictInfo = null;
        if (errorText && errorText.includes('يجب إنهاء معالجة الدفعة الحالية')) {
          // Parse the Arabic error message to extract batch info
          const ticketMatch = errorText.match(/:\s*([^\s]+)\s*-\s*([^(]+)/);
          const remainingMatch = errorText.match(/متبقي\s+(\d+)\s+صندوق/);
          const queuerMatch = errorText.match(/جاري المعالجة بواسطة:\s*([^)]+)/);
          
          if (ticketMatch) {
            const ticketNumber = ticketMatch[1].trim();
            const clientName = ticketMatch[2].trim();
            const remainingBoxes = remainingMatch ? parseInt(remainingMatch[1]) : 0;
            const queuerName = queuerMatch ? queuerMatch[1].trim() : 'معالج آخر';
            
            conflictInfo = {
              id: 0, // We don't have the actual ID from the message
              ticketNumber,
              clientName,
              totalBoxes: remainingBoxes, // We only know remaining boxes
              remainingBoxes,
              queuedBoxes: 0,
              queuerName
            };
          }
        }
        
        // Try to refresh from server, but don't fail if it's not working
        try {
          await checkPartiallyQueuedBatches();
        } catch (refreshError) {
          console.log('Server refresh failed, using parsed conflict info:', refreshError);
        }
        
        // If we have parsed conflict info and server refresh didn't work, use it
        if (conflictInfo && (!hasPartiallyQueued || !partiallyQueuedInfo)) {
          setHasPartiallyQueued(true);
          setPartiallyQueuedInfo(conflictInfo);
        }
        
        // If there's conflicting session data in the error response, use it immediately
        if (errorData?.activeSession || errorData?.conflictingSession) {
          const conflictingBatch = errorData.activeSession || errorData.conflictingSession;
          if (conflictingBatch && conflictingBatch.id !== parseInt(scannedTicket.id)) {
            setHasPartiallyQueued(true);
            setPartiallyQueuedInfo({
              id: conflictingBatch.id,
              ticketNumber: conflictingBatch.ticketNumber || `#${conflictingBatch.id}`,
              clientName: conflictingBatch.clientName || 'عميل غير محدد',
              totalBoxes: conflictingBatch.totalBoxes || 0,
              remainingBoxes: conflictingBatch.remainingBoxes || 0,
              queuedBoxes: conflictingBatch.queuedBoxes || 0,
              queuerName: conflictingBatch.queuerName || 'معالج آخر'
            });
          }
        }
        
        return;
      }
      
      // Extract error message from different response formats for other errors
      let errorMessage = 'فشل في إضافة التذكرة إلى قائمة الانتظار';
      
      if (error?.response?.data?.message) {
        // Backend sent Arabic message
        errorMessage = error.response.data.message;
      } else if (error?.response?.data?.error) {
        // Backend sent English error
        errorMessage = error.response.data.error;
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      toast({
        variant: 'destructive',
        title: 'خطأ',
        description: errorMessage,
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Reset scanner for new scan
  const resetScanner = () => {
    setScannedTicket(null);
    setNumberOfBoxes('');
    setIsCameraActive(true);
    setTimeout(() => {
      checkPartiallyQueuedBatches(); // Refresh active queuer sessions status
      initializeCamera();
    }, 500);
  };

  // Start camera when component mounts and check for active queuer sessions
  useEffect(() => {
    checkPartiallyQueuedBatches();
    initializeCamera();
    return () => {
      stopCamera();
    };
  }, []);

  // Re-check active queuer sessions when scanner resets
  useEffect(() => {
    if (!scannedTicket) {
      checkPartiallyQueuedBatches();
    }
  }, [scannedTicket]);

  if (scannedTicket) {
    // Show queue form when ticket is scanned
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 p-4">
        <div className="max-w-md mx-auto space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="flex items-center justify-center gap-2">
              <Users className="h-8 w-8 text-purple-600 dark:text-purple-400" />
              <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
                إدارة قائمة الانتظار
              </h1>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              تحديث بيانات التذكرة وإضافتها للقائمة
            </p>
          </div>

          {/* Ticket Info */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg border">
            <h3 className="font-semibold text-purple-800 dark:text-purple-200 mb-4 text-lg flex items-center gap-2">
              <Clock className="h-5 w-5" />
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
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">نوع العملية:</span>
                <span className={`font-medium px-2 py-1 rounded text-xs ${
                  scannedTicket.operationType === 'sale' 
                    ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' 
                    : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                }`}>
                  {scannedTicket.operationType === 'sale' ? '🛒 بيع' : '⚙️ عصر'}
                </span>
              </div>
              {(scannedTicket.numberOfBoxes !== undefined && scannedTicket.numberOfBoxes > 0) && (
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">الصناديق المتاحة:</span>
                  <span className="font-medium text-green-600 dark:text-green-400">{scannedTicket.numberOfBoxes}</span>
                </div>
              )}
              {(scannedTicket.numberOfBoxes !== undefined && scannedTicket.numberOfBoxes <= 0) && (
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">الصناديق المتاحة:</span>
                  <span className="font-medium text-red-600 dark:text-red-400">لا توجد صناديق متاحة</span>
                </div>
              )}

            </div>
          </div>

          {/* Active Session Warning */}
          {hasPartiallyQueued && partiallyQueuedInfo && partiallyQueuedInfo.id !== parseInt(scannedTicket.id) && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <div className="text-center">
                <h3 className="text-red-800 dark:text-red-200 font-bold text-lg mb-3">
                  ⚠️ يجب إنهاء الدفعة الحالية أولاً
                </h3>
                <div className="bg-white dark:bg-red-800/30 border border-red-300 dark:border-red-700 rounded-lg p-3 mb-3">
                  <p className="text-red-900 dark:text-red-100 font-bold text-xl mb-1">
                    {partiallyQueuedInfo.clientName}
                  </p>
                  <p className="text-red-700 dark:text-red-300 text-sm">
                    {partiallyQueuedInfo.ticketNumber}
                  </p>
                </div>
                <p className="text-red-600 dark:text-red-400 text-sm">
                  متبقي: {partiallyQueuedInfo.remainingBoxes} صندوق
                </p>
              </div>
            </div>
          )}

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
                max={scannedTicket.numberOfBoxes || 0}
                value={numberOfBoxes}
                onChange={(e) => setNumberOfBoxes(e.target.value)}
                placeholder={`أدخل عدد الصناديق (الحد الأقصى: ${scannedTicket.numberOfBoxes || 0})`}
                className="text-lg p-3"
                disabled={hasPartiallyQueued && partiallyQueuedInfo && partiallyQueuedInfo.id !== parseInt(scannedTicket.id)}
              />
            </div>



            {/* Queue Info */}
            <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
              <div className="text-center space-y-2">
                <div className="flex items-center justify-center space-x-2">
                  <Users className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                  <span className="text-lg font-semibold text-purple-800 dark:text-purple-200">
                    إضافة إلى قائمة الانتظار
                  </span>
                </div>
                <p className="text-sm text-purple-700 dark:text-purple-300">
                  سيتم إضافة هذه التذكرة إلى قائمة انتظار المعالجة مع الطابع الزمني.
                </p>
              </div>
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
              onClick={handleAddToQueue}
              className="flex-1 text-lg py-3 bg-purple-600 hover:bg-purple-700"
              disabled={isSaving || (hasPartiallyQueued && partiallyQueuedInfo && partiallyQueuedInfo.id !== parseInt(scannedTicket.id))}
            >
              {isSaving ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  جاري الإضافة...
                </>
              ) : (hasPartiallyQueued && partiallyQueuedInfo && partiallyQueuedInfo.id !== parseInt(scannedTicket.id)) ? (
                <>
                  <Clock className="h-5 w-5 mr-2" />
                  انتظار إنهاء {partiallyQueuedInfo.ticketNumber}
                </>
              ) : (
                <>
                  <Users className="h-5 w-5 mr-2" />
                  إضافة للقائمة
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
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
      <div className="flex flex-col h-screen">
        {/* Header */}
        <div className="p-4 text-center bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm">
          <div className="flex items-center justify-center gap-2 mb-1">
            <Users className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
              ماسح قائمة الانتظار
            </h1>
          </div>
          <p className="text-gray-600 dark:text-gray-300 mt-1">
            وجه الكاميرا نحو رمز QR لإضافة التذكرة إلى قائمة الانتظار
          </p>
        </div>

        {/* Partially Queued Warning Banner */}
        {hasPartiallyQueued && partiallyQueuedInfo && (
          <div className="mx-4 mb-4 p-4 bg-yellow-100 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-700 rounded-lg">
            <div className="flex items-start gap-3">
              <Clock className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-1">
                  تحذير: يوجد دفعة غير مكتملة
                </h3>
                <p className="text-sm text-yellow-700 dark:text-yellow-300">
                  يجب إنهاء معالجة الدفعة الحالية قبل البدء في دفعة جديدة:
                </p>
                <div className="mt-2 text-sm font-medium text-yellow-800 dark:text-yellow-200">
                  {partiallyQueuedInfo.ticketNumber} - {partiallyQueuedInfo.clientName}
                  <br />
                  متبقي: {partiallyQueuedInfo.remainingBoxes} صندوق من أصل {partiallyQueuedInfo.totalBoxes}
                  {partiallyQueuedInfo.queuerName && (
                    <>
                      <br />
                      جاري المعالجة بواسطة: {partiallyQueuedInfo.queuerName}
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

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
                    {/* Corner indicators - Purple theme for queuer */}
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
                className="flex-1 text-lg py-3 bg-purple-600 hover:bg-purple-700"
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
