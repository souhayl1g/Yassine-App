import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { OliveButton } from '@/components/ui/olive-button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Scan,
  CheckCircle,
  ArrowRight,
  Users,
  Package,
  Settings,
  AlertCircle,
  RefreshCw,
  MapPin,
  Timer,
  Clock,
  Calendar,
  Eye,
  Hash,
  RotateCcw,
  Home,
  Info,
  Box,
  Layers,
  Save,
  Camera,
  X
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
  numberOfBoxes?: number;
  numberOfBidons?: number;
  boxesLoadedToPressing?: number;
  pressingRooms?: Room[]; // Rooms where this ticket is currently being processed
}

interface Room {
  id: number;
  name: string;
  status: string;
  capacity?: number;
  currentSession?: {
    id: number;
    startTime: string;
    numberOfBoxes: number;
    status: string;
    occupantName: string;
    batchId?: number;
  } | null;
}

export function OperatorScannerPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // Scanner state
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [scannedData, setScannedData] = useState('');
  const [scanningActive, setScanningActive] = useState(false);
  const [scannedTicket, setScannedTicket] = useState<ScannedTicketData | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  
  // Multi-step flow state
  const [currentStep, setCurrentStep] = useState<'scanner' | 'active-room-selection' | 'ticket-info' | 'room-selection' | 'boxes-input' | 'queue-confirm' | 'bidons-input'>('scanner');
  
  // Active room selection state
  const [activeRoomsForTicket, setActiveRoomsForTicket] = useState<Room[]>([]);
  const [selectedActiveRoom, setSelectedActiveRoom] = useState<Room | null>(null);
  
  // Room selection state
  const [rooms, setRooms] = useState<Room[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [isLoadingRooms, setIsLoadingRooms] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Form state
  const [numberOfBoxesToProcess, setNumberOfBoxesToProcess] = useState('1');
  const [numberOfBidons, setNumberOfBidons] = useState('1');
  
  // Queue session state
  const [hasPartiallyQueued, setHasPartiallyQueued] = useState(false);
  const [partiallyQueuedInfo, setPartiallyQueuedInfo] = useState<any>(null);
  const [currentTicketQueueInfo, setCurrentTicketQueueInfo] = useState<any>(null);  // Camera refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const qrScannerRef = useRef<QrScanner | null>(null);

  // Helper function to extract payload from API responses
  const getPayload = <T,>(res: any): T => (res && typeof res === 'object' && 'data' in res ? res.data : res);

  // Check for active queuer sessions (batches currently being queued) system-wide
  const checkPartiallyQueuedBatches = async () => {
    try {
      const res = await api.get<any>('/operator/queue/partially-queued');
      const data = getPayload<any>(res);
      
      setHasPartiallyQueued(data.hasPartiallyQueued);
      if (data.hasPartiallyQueued && data.partiallyQueuedBatches.length > 0) {
        setPartiallyQueuedInfo(data.partiallyQueuedBatches[0]); // Show info for the first active queuer session
      } else {
        setPartiallyQueuedInfo(null);
      }
    } catch (error: any) {
      console.error('Failed to check active queuer sessions:', error);
      
      // Check if this is the known database error - check multiple possible error message locations
      const errorMessage = error?.message || error?.response?.data?.error || error?.response?.data?.message || String(error);
      const isBackendError = error?.response?.status === 500 || 
                            errorMessage.includes('column QueuerSession.updated_at does not exist') ||
                            errorMessage.includes('column QueuerSession.updatedAt does not exist') ||
                            errorMessage.includes('QueuerSession.updated_at') ||
                            errorMessage.includes('QueuerSession.updatedAt') ||
                            errorMessage.includes('does not exist') ||
                            errorMessage.includes('column') && errorMessage.includes('QueuerSession') ||
                            (error?.response?.status === 500 && errorMessage.includes('/operator/queue/partially-queued'));
      
      if (isBackendError) {
        console.log('Backend database error detected, assuming no active sessions');
        // When backend is broken, assume no active sessions to avoid blocking the operator
        setHasPartiallyQueued(false);
        setPartiallyQueuedInfo(null);
      } else {
        // For other errors, also default to no active sessions to not block workflow
        setHasPartiallyQueued(false);
        setPartiallyQueuedInfo(null);
      }
    }
  };

  // Helper function to check if room selection should be disabled
  const shouldDisableRoomSelection = (): boolean => {
    // Only rely on the current ticket's queue status
    if (!currentTicketQueueInfo) return true; // unknown -> disable
    if (!currentTicketQueueInfo.inQueue) return true; // not in queue -> disable
    // Allow only when fully queued
    return !(Number(currentTicketQueueInfo.totalBoxes) === Number(currentTicketQueueInfo.boxesQueued));
  };

  // Get the appropriate button text and icon based on current state
  const getRoomSelectionButtonContent = () => {
    // Current ticket not in queue at all
    if (currentTicketQueueInfo && !currentTicketQueueInfo.inQueue) {
      return {
        icon: <Layers className="h-5 w-5 mr-2" />,
        text: 'يجب إضافة التذكرة للطابور أولاً'
      };
    }
    
    // Current ticket in queue but not fully queued
    if (currentTicketQueueInfo && currentTicketQueueInfo.inQueue && currentTicketQueueInfo.totalBoxes !== currentTicketQueueInfo.boxesQueued) {
      return {
        icon: <Clock className="h-5 w-5 mr-2" />,
        text: `انتظار إنهاء التحميل للطابور (متبقي ${currentTicketQueueInfo.remainingBoxes})`
      };
    }
    
    // Default state
    return {
      icon: <ArrowRight className="h-5 w-5 mr-2" />,
      text: 'متابعة لاختيار الغرفة'
    };
  };

  // Check if a specific ticket can proceed to room selection
  // Returns true ONLY if ticket is in queue AND all boxes are queued
  const checkTicketQueueStatus = async (ticketId: string): Promise<{ canProceed: boolean, queueInfo?: any }> => {
    try {
      // Primary source: queuer sessions via combined-display-data endpoint
      const res = await api.get<any>('/operator/rooms/display-data');
      const payload = getPayload<any>(res);
      const queueItems = Array.isArray(payload?.queueItems) ? payload.queueItems : [];

      // Find queue item for this batch (support batchId or currentBatchId keys)
      const item = queueItems.find((q: any) => {
        const bid = q?.batchId ?? q?.currentBatchId;
        return String(bid) === String(ticketId);
      });

      if (!item) {
        // Fallback to batch-status endpoint if not found in display-data
        try {
          const res2 = await api.get<any>(`/operator/batch/${ticketId}/queue-status`);
          const data = getPayload<any>(res2);
          // Consider "in queue" if a session exists (i.e., any totalBoxes/boxesQueued info available),
          // regardless of backend boolean flag
          const totalBoxesFb = Number(data?.totalBoxes || 0);
          const boxesQueuedFb = Number(data?.boxesQueued || 0);
          const existsInQueue = Number.isFinite(totalBoxesFb) || Number.isFinite(boxesQueuedFb);
          const inQueueComputed = existsInQueue && (totalBoxesFb > 0 || boxesQueuedFb >= 0);
          const canProceedFb = inQueueComputed && totalBoxesFb > 0 && totalBoxesFb === boxesQueuedFb;
          return {
            canProceed: canProceedFb,
            queueInfo: {
              inQueue: inQueueComputed,
              totalBoxes: totalBoxesFb,
              boxesQueued: boxesQueuedFb,
              remainingBoxes: Math.max(0, totalBoxesFb - boxesQueuedFb),
              clientName: data.clientName,
              ticketNumber: data.ticketNumber,
            }
          };
        } catch (e) {
          // If fallback fails, assume cannot proceed to be safe
          return { canProceed: false, queueInfo: { inQueue: false, totalBoxes: 0, boxesQueued: 0, remainingBoxes: 0 } };
        }
      }

      const totalBoxes = parseInt((item.totalBoxes ?? item?.total_boxes ?? 0) as any, 10);
      const boxesQueued = parseInt((item.boxesQueued ?? item?.queuedBoxes ?? item?.boxes_queued ?? 0) as any, 10);
      const canProceed = totalBoxes > 0 && totalBoxes === boxesQueued;

      return {
        canProceed,
        queueInfo: {
          inQueue: true,
          totalBoxes,
          boxesQueued,
          remainingBoxes: Math.max(0, totalBoxes - boxesQueued),
          clientName: item.clientName || item?.client?.name || `${item?.client?.firstname || ''} ${item?.client?.lastname || ''}`.trim(),
          ticketNumber: item.ticketNumber,
          queueSessionId: item.id,
        }
      };
    } catch (error: any) {
      console.error('Failed to check ticket queue status:', error);
      // On failure, be safe and disallow proceeding (to enforce full queue rule)
      return { canProceed: false, queueInfo: { inQueue: false, totalBoxes: 0, boxesQueued: 0, remainingBoxes: 0 } };
    }
  };

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

  // Initialize camera for QR scanning
  const initializeCamera = async () => {
    if (!videoRef.current) return;

    // Check if we're on HTTPS or localhost
    if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
      toast({
        variant: 'destructive',
        title: 'Security Error',
        description: 'Camera requires HTTPS to work. Please use https:// or localhost',
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
      
      let errorMessage = 'Cannot access camera. Please check permissions.';
      
      if (error.name === 'NotAllowedError') {
        errorMessage = 'Camera access denied. Please allow camera access in browser settings.';
      } else if (error.name === 'NotFoundError') {
        errorMessage = 'No camera found. Please make sure a camera is connected.';
      } else if (error.name === 'SecurityError' || error.message.includes('https')) {
        errorMessage = 'Camera requires HTTPS to work. Please use https://localhost:5173';
      }
      
      toast({
        variant: 'destructive',
        title: 'Camera Error',
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
        throw new Error('Ticket ID not found in QR code');
      }

      const ticket = await fetchTicketByCode(ticketId);
      setScannedTicket(ticket);
      
      // Check queue status for this ticket
      try {
        const { queueInfo } = await checkTicketQueueStatus(String(ticketId));
        setCurrentTicketQueueInfo(queueInfo);
      } catch (error) {
        console.log('Failed to get queue status, continuing without it');
        setCurrentTicketQueueInfo(null);
      }
      
      // Stop scanning after successful scan
      stopCamera();
      
      // Check if all boxes are already loaded to pressing rooms
      const totalBoxes = ticket.numberOfBoxes || 0;
      const loadedBoxes = ticket.boxesLoadedToPressing || 0;
      const isFullyLoaded = totalBoxes > 0 && loadedBoxes >= totalBoxes;

      if (isFullyLoaded) {
        // All boxes are already loaded - show appropriate message
        if (ticket.pressingRooms && ticket.pressingRooms.length > 0) {
          // Active in rooms - show completion options
          if (ticket.pressingRooms.length > 1) {
            setActiveRoomsForTicket(ticket.pressingRooms);
            setCurrentStep('active-room-selection');
            toast({ 
              title: 'تم التحميل كاملاً', 
              description: `جميع الصناديق محملة في ${ticket.pressingRooms.length} غرف. يمكنك إنهاء الجلسات.` 
            });
          } else {
            setSelectedActiveRoom(ticket.pressingRooms[0]);
            setCurrentStep('ticket-info');
            toast({ 
              title: 'تم التحميل كاملاً', 
              description: 'جميع الصناديق محملة. يمكنك إنهاء الجلسة في الغرفة النشطة.' 
            });
          }
        } else {
          // Fully loaded but no active rooms - probably completed
          setCurrentStep('ticket-info');
          toast({ 
            title: 'مكتملة', 
            description: 'جميع صناديق هذه التذكرة تم تحميلها ومعالجتها بالكامل.' 
          });
        }
      } else {
        // Not fully loaded - proceed with normal flow
        if (ticket.pressingRooms && ticket.pressingRooms.length > 1) {
          // Multiple active rooms - show room selection
          setActiveRoomsForTicket(ticket.pressingRooms);
          setCurrentStep('active-room-selection');
          toast({ 
            title: 'Success', 
            description: `QR code scanned successfully. This ticket is active in ${ticket.pressingRooms.length} rooms.` 
          });
        } else if (ticket.pressingRooms && ticket.pressingRooms.length === 1) {
          // Single active room - proceed normally but set the selected room
          setSelectedActiveRoom(ticket.pressingRooms[0]);
          setCurrentStep('ticket-info');
          toast({ title: 'Success', description: 'QR code scanned successfully' });
        } else {
          // No active rooms - proceed normally
          setSelectedActiveRoom(null);
          setCurrentStep('ticket-info');
          toast({ title: 'Success', description: 'QR code scanned successfully' });
        }
      }
    } catch (error: any) {
      console.error('QR scan error:', error);
      toast({ variant: 'destructive', title: 'Error', description: error.message || 'Failed to read QR code' });
    }
  };

  // Fetch pressing rooms with their status
  const fetchPressingRooms = async (): Promise<Room[]> => {
    try {
      setIsLoadingRooms(true);
      const res = await api.get<Room[]>('/operator/rooms');
      const rooms = getPayload<Room[]>(res);
      setRooms(rooms);
      return rooms;
    } catch (error: any) {
      console.error('Failed to fetch pressing rooms:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to fetch pressing rooms',
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
      throw new Error('Invalid ticket ID');
    }

    try {
      const res = await api.get<any>(`/operator/batch/${idOrCode}/details`);
      const data = getPayload<any>(res);

      if (!data || !data.id) {
        throw new Error('Ticket not found');
      }

      // Also fetch pressing rooms to see where this batch is currently active
      const pressingRooms = await findActiveRoomsForBatch(data.id);

      return {
        id: String(data.id),
        ticketNumber: data.ticketNumber || data.ticket_number || `#${data.id}`,
        clientName: data.clientName || (data.client
          ? `${data.client.firstname || ''} ${data.client.lastname || ''}`.trim()
          : data.clientId 
          ? `Client #${data.clientId}`
          : `Batch #${data.id}`),
        weightIn: data.weightIn ?? data.weight_in ?? 0,
        status: data.status || 'received',
        numberOfBoxes: data.numberOfBoxes ?? data.number_of_boxes ?? 0,
        numberOfBidons: data.numberOfBidons ?? data.number_of_bidons ?? 0,
        boxesLoadedToPressing: data.boxesLoadedToPressing ?? data.boxes_loaded_to_pressing ?? 0,
        pressingRooms: pressingRooms
      };
    } catch (e: any) {
      const errorMessage = e?.response?.status === 404 
        ? 'Ticket not found in system'
        : e?.message || 'Failed to fetch ticket';
      
      throw new Error(errorMessage);
    }
  };

  // Find active pressing rooms for a specific batch
  const findActiveRoomsForBatch = async (batchId: number): Promise<Room[]> => {
    try {
      const res = await api.get<any>('/operator/rooms/display-data');
      const payload = getPayload<any>(res);
      const rooms = Array.isArray(payload?.rooms) ? payload.rooms : [];
      
      // Find rooms that have this batch currently active
      const activeRooms = rooms.filter((room: any) => 
        room.currentBatch && 
        (room.currentBatch.batchId === batchId || 
         room.currentBatch.id === batchId)
      );

      // Transform to Room interface
      return activeRooms.map((room: any) => ({
        id: room.id,
        name: room.name,
        status: room.status || 'active',
        capacity: room.capacity,
        currentSession: room.currentBatch ? {
          id: room.currentBatch.sessionId,
          startTime: room.currentBatch.sessionStartTime,
          numberOfBoxes: room.currentBatch.numberOfBatches || 0,
          status: 'active',
          occupantName: room.currentBatch.clientName,
          batchId: room.currentBatch.batchId
        } : null
      }));
    } catch (error: any) {
      console.error('Failed to fetch active rooms for batch:', error);
      return []; // Return empty array if fetch fails
    }
  };

  // Handle proceeding to room selection
  const handleProceedToRoomSelection = async () => {
    if (!scannedTicket) return;

    // Check if this specific ticket can proceed to room selection
    try {
      const { canProceed, queueInfo } = await checkTicketQueueStatus(scannedTicket.id);
      
      if (!canProceed && queueInfo) {
        if (!queueInfo.inQueue) {
          toast({
            variant: 'destructive',
            title: 'خطأ',
            description: 'يجب إضافة التذكرة للطابور أولاً قبل اختيار غرفة العصر',
          });
        } else {
          toast({
            variant: 'destructive',
            title: 'خطأ',
            description: `يجب إنهاء تحميل جميع الصناديق للطابور قبل اختيار غرفة العصر. متبقي: ${queueInfo.remainingBoxes} صندوق من أصل ${queueInfo.totalBoxes}`,
          });
        }
        return;
      }

      // Also check for other active queuer sessions that might prevent processing
      await checkPartiallyQueuedBatches();
      
      // If there's a different partially queued batch, block the operation
      if (hasPartiallyQueued && partiallyQueuedInfo && partiallyQueuedInfo.id !== parseInt(scannedTicket.id)) {
        toast({
          variant: 'destructive',
          title: 'خطأ',
          description: `يجب إنهاء معالجة الدفعة الحالية (${partiallyQueuedInfo.clientName}) أولاً`,
        });
        return;
      }
    } catch (error: any) {
      console.log('Queue status check failed, proceeding anyway:', error);
      // If check fails, proceed anyway to not block the operator
    }

    await fetchPressingRooms();
    setCurrentStep('room-selection');
  };

  // Handle room selection
  const handleRoomSelection = (room: Room) => {
    if (room.status === 'active') {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'This room is currently busy',
      });
      return;
    }
    setSelectedRoom(room);
    setCurrentStep('boxes-input');
  };

  // Add to pressing queue
  const handleAddToQueue = async () => {
    if (!scannedTicket) return;

    const boxesToProcess = parseInt(numberOfBoxesToProcess || '1', 10);

    if (boxesToProcess <= 0) {
      toast({ 
        variant: 'destructive', 
        title: 'Error', 
        description: 'Please enter a valid number of boxes' 
      });
      return;
    }

    const totalBoxes = scannedTicket.numberOfBoxes || 0;
    const alreadyLoaded = scannedTicket.boxesLoadedToPressing || 0;
    const availableBoxes = totalBoxes - alreadyLoaded;

    if (boxesToProcess > availableBoxes) {
      toast({ 
        variant: 'destructive', 
        title: 'Error', 
        description: `Cannot load more than ${availableBoxes} boxes. Available: ${availableBoxes} out of ${totalBoxes}` 
      });
      return;
    }

    setIsSaving(true);
    try {
      const queuePayload = {
        batch_id: parseInt(scannedTicket.id),
        number_of_boxes: boxesToProcess,
        operator_id: user?.id || 1,
        notes: `Queued ${boxesToProcess} boxes for pressing by ${user?.firstname || 'Unknown'} ${user?.lastname || 'Operator'}`
      };

      const response = await api.post('/operator/queue', queuePayload);
      const queueData = getPayload<any>(response);

      toast({ 
        title: 'Success', 
        description: `Successfully added to queue. Position: ${queueData.position || 'N/A'}` 
      });
      
      // Reset for next scan
      resetScanner();
    } catch (error: any) {
      console.error('Add to queue failed:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error?.response?.data?.error || error?.message || 'Failed to add to queue',
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Create pressing session
  const handleCreatePressingSession = async () => {
    if (!scannedTicket || !selectedRoom) return;

    const boxesToProcess = parseInt(numberOfBoxesToProcess || '1', 10);

    if (boxesToProcess <= 0) {
      toast({ 
        variant: 'destructive', 
        title: 'Error', 
        description: 'Please enter a valid number of boxes' 
      });
      return;
    }

    const totalBoxes = scannedTicket.numberOfBoxes || 0;
    const alreadyLoaded = scannedTicket.boxesLoadedToPressing || 0;
    const availableBoxes = totalBoxes - alreadyLoaded;

    if (boxesToProcess > availableBoxes) {
      toast({ 
        variant: 'destructive', 
        title: 'Error', 
        description: `Cannot load more than ${availableBoxes} boxes. Available: ${availableBoxes} out of ${totalBoxes}` 
      });
      return;
    }

    setIsSaving(true);
    try {
      // First create pressing session
      const sessionPayload = {
        pressing_roomID: selectedRoom.id,
        number_of_boxes: boxesToProcess,
        batch_id: parseInt(scannedTicket.id),
        operator_id: user?.id || 1,
        status: 'active'
      };

      const sessionResponse = await api.post('/operator/pressing-session', sessionPayload);
      const sessionId = (sessionResponse as any).id;

      // Then load boxes to pressing with history tracking
      await api.put(`/operator/batch/${scannedTicket.id}/load-boxes`, {
        boxesToLoad: boxesToProcess,
        pressingSessionId: sessionId,
        pressingRoomId: selectedRoom.id,
        operatorId: user?.id || 1, // Use current user ID or fallback to 1
        notes: `Loaded ${boxesToProcess} boxes to ${selectedRoom.name}`
      });

      // Note: Backend will automatically remove batch from queuer_sessions 
      // if all boxes have been loaded to pressing rooms

      toast({ 
        title: 'Success', 
        description: `Successfully loaded ${boxesToProcess} boxes in ${selectedRoom.name} and created pressing session` 
      });
      
      // Reset for next scan
      resetScanner();
    } catch (error: any) {
      console.error('Create pressing session failed:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error?.response?.data?.error || error?.message || 'Failed to create pressing session',
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Handle selecting an active room for the ticket
  const handleActiveRoomSelection = (room: Room) => {
    setSelectedActiveRoom(room);
    // Go to bidons input step before completing the session
    setCurrentStep('bidons-input');
  };

  // Handle completing an active session in a room
  const handleCompleteActiveSession = async () => {
    if (!scannedTicket || !selectedActiveRoom?.currentSession) {
      toast({
        variant: 'destructive',
        title: 'خطأ',
        description: 'لا توجد جلسة نشطة في هذه الغرفة لإنهائها',
      });
      return;
    }

    const bidonsCount = parseInt(numberOfBidons || '1', 10);

    if (bidonsCount <= 0) {
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

      await api.put(`/operator/pressing-session/${selectedActiveRoom.currentSession.id}/complete`, sessionPayload);

      // Update batch status to completed
      await api.put(`/operator/batch/${scannedTicket.id}`, {
        status: 'completed',
        number_of_bidons: bidonsCount
      });

      toast({ 
        title: 'نجح', 
        description: `تم إنهاء جلسة العصر بنجاح في ${selectedActiveRoom.name}. تم إنتاج ${bidonsCount} بدونة زيت` 
      });
      
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
    setScannedTicket(null);
    setSelectedRoom(null);
    setSelectedActiveRoom(null);
    setActiveRoomsForTicket([]);
    setRooms([]);
    setNumberOfBoxesToProcess('1');
    setNumberOfBidons('1');
    setCurrentTicketQueueInfo(null);
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

  // Check for partially queued batches when ticket-info step loads
  useEffect(() => {
    if (currentStep === 'ticket-info' && scannedTicket) {
      checkPartiallyQueuedBatches();
    }
  }, [currentStep, scannedTicket]);

  // Active Room Selection Step - When ticket is active in multiple rooms
  if (currentStep === 'active-room-selection' && scannedTicket && activeRoomsForTicket.length > 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 p-4">
        <div className="max-w-md mx-auto space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
              اختيار الغرفة النشطة
            </h1>
            <p className="text-gray-600 dark:text-gray-300">
              هذه التذكرة نشطة في عدة غرف. اختر الغرفة التي تريد إنهاء جلستها.
            </p>
          </div>

          {/* Ticket Summary */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg border">
            <h3 className="font-semibold text-purple-800 dark:text-purple-200 mb-4 text-lg">
              معلومات التذكرة
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
                <span className="text-gray-600 dark:text-gray-400">الغرف النشطة:</span>
                <span className="font-medium text-purple-600 dark:text-purple-400">
                  {activeRoomsForTicket.length} غرفة
                </span>
              </div>
            </div>
          </div>

          {/* Active Rooms List */}
          <div className="space-y-3">
            <h3 className="font-semibold text-gray-800 dark:text-white text-lg">
              الغرف النشطة:
            </h3>
            {activeRoomsForTicket.map((room) => (
              <div
                key={room.id}
                className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-lg border border-purple-200 dark:border-purple-800 cursor-pointer transition-all hover:shadow-xl hover:border-purple-400 dark:hover:border-purple-600"
                onClick={() => handleActiveRoomSelection(room)}
              >
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="font-semibold text-lg text-purple-800 dark:text-purple-200">
                        {room.name}
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        السعة: {room.capacity || 'N/A'}
                      </p>
                    </div>
                    <div className="px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                      نشطة
                    </div>
                  </div>
                  
                  {/* Show current session information */}
                  {room.currentSession && (
                    <div className="border-t pt-3 mt-3">
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">مدة التشغيل:</span>
                          <span className="font-medium text-orange-600 dark:text-orange-400">
                            {calculateDuration(room.currentSession.startTime)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">عدد الصناديق:</span>
                          <span className="font-medium text-blue-600 dark:text-blue-400">
                            {room.currentSession.numberOfBoxes}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">حالة الجلسة:</span>
                          <span className="font-medium text-green-600 dark:text-green-400">
                            {room.currentSession.status === 'active' ? 'نشطة' : room.currentSession.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Action hint */}
                  <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3 mt-3">
                    <p className="text-green-700 dark:text-green-300 text-sm text-center font-medium">
                      انقر لإدخال عدد البدونات وإنهاء الجلسة
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Back Button */}
          <OliveButton
            variant="outline"
            onClick={resetScanner}
            className="w-full text-lg py-3"
          >
            <RotateCcw className="h-5 w-5 mr-2" />
            مسح جديد
          </OliveButton>
        </div>
      </div>
    );
  }

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

          {/* Selected Active Room Info */}
          {selectedActiveRoom && (
            <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-6">
              <h3 className="font-semibold text-purple-800 dark:text-purple-200 mb-4 text-lg">
                الغرفة المختارة (نشطة)
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">اسم الغرفة:</span>
                  <span className="font-medium text-purple-600 dark:text-purple-400">{selectedActiveRoom.name}</span>
                </div>
                {selectedActiveRoom.currentSession && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">مدة التشغيل:</span>
                      <span className="font-medium text-orange-600 dark:text-orange-400">
                        {calculateDuration(selectedActiveRoom.currentSession.startTime)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">صناديق الجلسة:</span>
                      <span className="font-medium text-blue-600 dark:text-blue-400">
                        {selectedActiveRoom.currentSession.numberOfBoxes}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Fully Loaded Warning */}
          {scannedTicket && (scannedTicket.numberOfBoxes || 0) > 0 && (scannedTicket.boxesLoadedToPressing || 0) >= (scannedTicket.numberOfBoxes || 0) && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-6">
              <div className="text-center">
                <h3 className="text-green-800 dark:text-green-200 font-bold text-lg mb-3">
                  ✅ تم التحميل كاملاً
                </h3>
                <div className="bg-white dark:bg-green-800/30 border border-green-300 dark:border-green-700 rounded-lg p-3 mb-3">
                  <p className="text-green-900 dark:text-green-100 font-bold text-xl mb-1">
                    جميع الصناديق محملة
                  </p>
                  <p className="text-green-700 dark:text-green-300 text-sm">
                    {scannedTicket.boxesLoadedToPressing} من أصل {scannedTicket.numberOfBoxes} صندوق
                  </p>
                </div>
                <p className="text-green-600 dark:text-green-400 text-sm">
                  {scannedTicket.pressingRooms && scannedTicket.pressingRooms.length > 0 
                    ? 'يمكنك الآن إنهاء الجلسات النشطة' 
                    : 'جميع العمليات مكتملة لهذه التذكرة'
                  }
                </p>
              </div>
            </div>
          )}

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
                <span className="text-gray-600 dark:text-gray-400">إجمالي الصناديق:</span>
                <span className="font-medium text-blue-600 dark:text-blue-400">
                  {scannedTicket.numberOfBoxes || 0}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">المحملة للعصر:</span>
                <span className="font-medium text-orange-600 dark:text-orange-400">
                  {scannedTicket.boxesLoadedToPressing || 0}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">المتبقية للتحميل:</span>
                <span className={`font-medium ${
                  (scannedTicket.numberOfBoxes || 0) - (scannedTicket.boxesLoadedToPressing || 0) === 0
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-orange-600 dark:text-orange-400'
                }`}>
                  {(scannedTicket.numberOfBoxes || 0) - (scannedTicket.boxesLoadedToPressing || 0)}
                  {(scannedTicket.numberOfBoxes || 0) - (scannedTicket.boxesLoadedToPressing || 0) === 0 ? ' (مكتمل)' : ''}
                </span>
              </div>
              {scannedTicket.pressingRooms && scannedTicket.pressingRooms.length > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">الغرف النشطة:</span>
                  <span className="font-medium text-purple-600 dark:text-purple-400">
                    {scannedTicket.pressingRooms.length} غرفة
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Queue Status Info */}
          {currentTicketQueueInfo && (
            <div className={`rounded-lg p-6 shadow-lg border ${
              !currentTicketQueueInfo.inQueue
                ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                : currentTicketQueueInfo.totalBoxes === currentTicketQueueInfo.boxesQueued
                ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                : 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
            }`}>
              <h3 className={`font-semibold mb-4 text-lg ${
                !currentTicketQueueInfo.inQueue
                  ? 'text-red-800 dark:text-red-200'
                  : currentTicketQueueInfo.totalBoxes === currentTicketQueueInfo.boxesQueued
                  ? 'text-green-800 dark:text-green-200'
                  : 'text-yellow-800 dark:text-yellow-200'
              }`}>
                حالة الطابور
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">في الطابور:</span>
                  <span className={`font-medium ${
                    currentTicketQueueInfo.inQueue 
                      ? 'text-blue-600 dark:text-blue-400' 
                      : 'text-red-600 dark:text-red-400'
                  }`}>
                    {currentTicketQueueInfo.inQueue ? 'نعم' : 'لا'}
                  </span>
                </div>
                {currentTicketQueueInfo.inQueue ? (
                  <>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">الصناديق في الطابور:</span>
                      <span className="font-medium text-orange-600 dark:text-orange-400">
                        {currentTicketQueueInfo.boxesQueued} من أصل {currentTicketQueueInfo.totalBoxes}
                      </span>
                    </div>
                    {currentTicketQueueInfo.remainingBoxes > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">المتبقية للطابور:</span>
                        <span className="font-medium text-red-600 dark:text-red-400">
                          {currentTicketQueueInfo.remainingBoxes} صندوق
                        </span>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">إجمالي الصناديق:</span>
                    <span className="font-medium text-blue-600 dark:text-blue-400">
                      {currentTicketQueueInfo.totalBoxes} صندوق
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">الحالة:</span>
                  <span className={`font-medium ${
                    !currentTicketQueueInfo.inQueue
                      ? 'text-red-600 dark:text-red-400'
                      : currentTicketQueueInfo.totalBoxes === currentTicketQueueInfo.boxesQueued
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-yellow-600 dark:text-yellow-400'
                  }`}>
                    {!currentTicketQueueInfo.inQueue
                      ? 'يجب إضافة للطابور أولاً'
                      : currentTicketQueueInfo.totalBoxes === currentTicketQueueInfo.boxesQueued 
                      ? 'مكتمل - يمكن اختيار الغرفة' 
                      : 'غير مكتمل - يجب إنهاء التحميل للطابور'}
                  </span>
                </div>
              </div>
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
            
            {/* Show different button based on whether we have multiple active rooms */}
            {scannedTicket.pressingRooms && scannedTicket.pressingRooms.length > 1 && !selectedActiveRoom ? (
              <OliveButton
                onClick={() => {
                  setActiveRoomsForTicket(scannedTicket.pressingRooms || []);
                  setCurrentStep('active-room-selection');
                }}
                className="flex-1 text-lg py-3"
              >
                <Settings className="h-5 w-5 mr-2" />
                اختيار الغرفة النشطة
              </OliveButton>
            ) : selectedActiveRoom && scannedTicket.pressingRooms && scannedTicket.pressingRooms.length > 1 ? (
              <div className="flex gap-2 flex-1">
                <OliveButton
                  variant="outline"
                  onClick={() => {
                    setActiveRoomsForTicket(scannedTicket.pressingRooms || []);
                    setCurrentStep('active-room-selection');
                  }}
                  className="text-sm py-3"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  تغيير الغرفة
                </OliveButton>
                <OliveButton
                  onClick={() => {
                    // For active rooms, we might want to show different options
                    // For now, we'll proceed to room selection to show other available rooms
                    handleProceedToRoomSelection();
                  }}
                  className="flex-1 text-lg py-3"
                  disabled={shouldDisableRoomSelection()}
                >
                  {(() => {
                    const { icon, text } = getRoomSelectionButtonContent();
                    return (
                      <>
                        {icon}
                        {shouldDisableRoomSelection() ? text : 'إدارة الغرفة النشطة'}
                      </>
                    );
                  })()}
                </OliveButton>
              </div>
            ) : selectedActiveRoom ? (
              <OliveButton
                onClick={() => {
                  // For active rooms, we might want to show different options
                  // For now, we'll proceed to room selection to show other available rooms
                  handleProceedToRoomSelection();
                }}
                className="flex-1 text-lg py-3"
                disabled={shouldDisableRoomSelection()}
              >
                {(() => {
                  const { icon, text } = getRoomSelectionButtonContent();
                  return (
                    <>
                      {icon}
                      {shouldDisableRoomSelection() ? text : 'إدارة الغرفة النشطة'}
                    </>
                  );
                })()}
              </OliveButton>
            ) : (
              <>
                {/* Check if fully loaded */}
                {scannedTicket && (scannedTicket.numberOfBoxes || 0) > 0 && (scannedTicket.boxesLoadedToPressing || 0) >= (scannedTicket.numberOfBoxes || 0) ? (
                  <OliveButton
                    variant="outline"
                    className="flex-1 text-lg py-3 cursor-not-allowed opacity-60"
                    disabled={true}
                  >
                    <span className="text-green-600">✅ جميع الصناديق محملة</span>
                  </OliveButton>
                ) : currentTicketQueueInfo && !currentTicketQueueInfo.inQueue ? (
                  <OliveButton
                    onClick={() => setCurrentStep('queue-confirm')}
                    className="flex-1 text-lg py-3 bg-orange-600 hover:bg-orange-700 text-white"
                  >
                    <Layers className="h-5 w-5 mr-2" />
                    إضافة للطابور أولاً
                  </OliveButton>
                ) : (
                  <OliveButton
                    onClick={handleProceedToRoomSelection}
                    className="flex-1 text-lg py-3" 
                    disabled={shouldDisableRoomSelection()}
                  >
                    {(() => {
                      const { icon, text } = getRoomSelectionButtonContent();
                      return (
                        <>
                          {icon}
                          {text}
                        </>
                      );
                    })()}
                  </OliveButton>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Room Selection Step
  if (currentStep === 'room-selection') {
    const availableRooms = rooms.filter(room => room.status !== 'active');
    const allRoomsFull = rooms.length > 0 && availableRooms.length === 0;
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 dark:from-gray-900 dark:to-gray-800 p-4">
        <div className="max-w-md mx-auto space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
              اختيار غرفة العصر
            </h1>
            <p className="text-gray-600 dark:text-gray-300">
              {allRoomsFull ? 'جميع الغرف مشغولة - يمكنك إضافة العملية للطابور' : 'اختر غرفة عصر متاحة'}
            </p>
          </div>

          {/* Queue Option removed: operator cannot add to queue */}

          {/* Rooms List */}
          <div className="space-y-3">
            {isLoadingRooms ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                <p className="text-gray-600 dark:text-gray-300">جاري تحميل الغرف...</p>
              </div>
            ) : rooms.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-600 dark:text-gray-300">لا توجد غرف في النظام</p>
              </div>
            ) : (
              rooms.map((room) => (
                <div
                  key={room.id}
                  className={`bg-white dark:bg-gray-800 rounded-lg p-4 shadow-lg border cursor-pointer transition-all ${
                    room.status === 'active' 
                      ? 'border-red-300 bg-red-50 dark:bg-red-900/20 cursor-not-allowed opacity-60' 
                      : 'border-green-300 bg-green-50 dark:bg-green-900/20 hover:shadow-xl'
                  }`}
                  onClick={() => handleRoomSelection(room)}
                >
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="font-semibold text-lg">{room.name}</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          السعة: {room.capacity || 'N/A'}
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
                    
                    {/* Show occupant information if room is active */}
                    {room.status === 'active' && room.currentSession && (
                      <div className="border-t pt-3 mt-3">
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-400">صاحب الدفعة:</span>
                            <span className="font-medium text-red-700 dark:text-red-300">
                              {room.currentSession.occupantName}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-400">مدة الاستخدام:</span>
                            <span className="font-medium text-orange-600 dark:text-orange-400">
                              {calculateDuration(room.currentSession.startTime)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-400">عدد الصناديق:</span>
                            <span className="font-medium text-blue-600 dark:text-blue-400">
                              {room.currentSession.numberOfBoxes}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
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
                max={scannedTicket ? (scannedTicket.numberOfBoxes || 0) - (scannedTicket.boxesLoadedToPressing || 0) : 999}
                value={numberOfBoxesToProcess}
                onChange={(e) => setNumberOfBoxesToProcess(e.target.value)}
                placeholder="أدخل عدد الصناديق"
                className="text-lg p-3"
              />
              {scannedTicket && (
                <div className="space-y-1">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    المتاح للتحميل: {(scannedTicket.numberOfBoxes || 0) - (scannedTicket.boxesLoadedToPressing || 0)} صندوق
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-500">
                    المحمل سابقاً: {scannedTicket.boxesLoadedToPressing || 0} من أصل {scannedTicket.numberOfBoxes || 0}
                  </p>
                </div>
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

  // Bidons Input Step - For completing active sessions
  if (currentStep === 'bidons-input' && scannedTicket && selectedActiveRoom) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 p-4">
        <div className="max-w-md mx-auto space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
              عدد بدونات الزيت المنتجة
            </h1>
            <p className="text-gray-600 dark:text-gray-300">
              غرفة العصر: {selectedActiveRoom.name}
            </p>
          </div>

          {/* Session Summary */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg border">
            <h3 className="font-semibold text-purple-800 dark:text-purple-200 mb-4 text-lg">
              ملخص الجلسة المكتملة
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
                <span className="text-gray-600 dark:text-gray-400">اسم الغرفة:</span>
                <span className="font-medium text-purple-600 dark:text-purple-400">{selectedActiveRoom.name}</span>
              </div>
              {selectedActiveRoom.currentSession && (
                <>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">مدة التشغيل:</span>
                    <span className="font-medium text-orange-600 dark:text-orange-400">
                      {calculateDuration(selectedActiveRoom.currentSession.startTime)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">عدد الصناديق:</span>
                    <span className="font-medium text-blue-600 dark:text-blue-400">
                      {selectedActiveRoom.currentSession.numberOfBoxes}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Bidons Input */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg border space-y-4">
            <div className="space-y-2">
              <Label htmlFor="bidonsProduced" className="flex items-center gap-2 text-lg">
                <Package className="h-5 w-5" />
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
              <p className="text-sm text-gray-600 dark:text-gray-400">
                أدخل عدد بدونات الزيت التي تم إنتاجها من هذه الجلسة
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <OliveButton
              variant="outline"
              onClick={() => setCurrentStep('active-room-selection')}
              className="flex-1 text-lg py-3"
              disabled={isSaving}
            >
              <RotateCcw className="h-5 w-5 mr-2" />
              العودة للغرف
            </OliveButton>
            <OliveButton
              onClick={handleCompleteActiveSession}
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
                  إنهاء الجلسة
                </>
              )}
            </OliveButton>
          </div>
        </div>
      </div>
    );
  }

  // Queue Confirmation Step removed for operator: operator cannot add to queue

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
        <div className="flex-1 flex flex-col items-center justify-center p-4 bg-gray-100 dark:bg-gray-900 space-y-4">
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

          {/* Navigation Buttons - Below Camera */}
          <div className="flex gap-2 w-full max-w-sm">
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
