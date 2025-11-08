import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/integrations/api/client';
import { useTicketManagement } from './useTicketManagement';
import { useQRScanner } from './useQRScanner';
import { 
  MinimizedTicket, 
  Ticket, 
  Client, 
  ScannedTicket 
} from '@/types/daily-work';
import { generateDailyTicketNumber, generateQRCode, getPayload } from './utils';
import { ticketPaymentService, TicketPayment } from '@/services/ticketPaymentService';

export const useDailyWork = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  
  // Use ticket management hook
  const ticketManagement = useTicketManagement();
  // Global toggle for silent auto-refresh of ticket list
  const AUTO_REFRESH_ENABLED = true;
  const AUTO_REFRESH_INTERVAL_MS = 5000;
  // Keep track of latest current page to avoid stale closures in intervals
  const currentPageRef = useRef<number>(1);
  const autoRefreshInFlightRef = useRef(false);
  const interactionLockRef = useRef(false);
  useEffect(() => {
    currentPageRef.current = ticketManagement.currentPage || 1;
  }, [ticketManagement.currentPage]);
  
  // Modal states
  const [isAddTicketOpen, setIsAddTicketOpen] = useState(false);
  const [isQrScanOpen, setIsQrScanOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [isQrDisplayOpen, setIsQrDisplayOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isCameraScanOpen, setIsCameraScanOpen] = useState(false);
  const [isFinishingOperation, setIsFinishingOperation] = useState(false);

  // Oil batch weights cache for sale calculations
  const [oilBatchWeights, setOilBatchWeights] = useState<{ [batchId: string]: number }>({});

  // Payment management state
  const [ticketPayments, setTicketPayments] = useState<{ [ticketId: string]: TicketPayment[] }>({});
  const [loadingPayments, setLoadingPayments] = useState(false);

  // Oil quantity modal state
  const [oilQuantityTicket, setOilQuantityTicket] = useState<Ticket | null>(null);
  const [isOilQuantityModalOpen, setIsOilQuantityModalOpen] = useState(false);

  // Additional states
  const [ticketToPrint, setTicketToPrint] = useState<Ticket | null>(null);
  const [qrCodeImage, setQrCodeImage] = useState<string>('');
  const [minimizedTickets, setMinimizedTickets] = useState<MinimizedTicket[]>([]);
  const [pressingHistory, setPressingHistory] = useState<any[]>([]);
  const [loadingPressingHistory, setLoadingPressingHistory] = useState(false);

  // QR Scanner hook
  const qrScanner = useQRScanner(
    minimizedTickets,
    setMinimizedTickets,
    ticketManagement.setScannedTicket,
    ticketManagement.setEditForm,
    setIsEditModalOpen,
    setIsCameraScanOpen,
    ticketManagement.fetchTicketByCode,
    setIsFinishingOperation
  );

  // Handle add ticket
  const handleAddTicket = async () => {
    const { newTicket, selectedClient } = ticketManagement;
    
    if (!newTicket.firstname || !newTicket.lastname) {
      toast({ variant: 'destructive', title: t('common.error'), description: 'يرجى إدخال اسم العميل' });
      return;
    }
    if (!newTicket.weightIn) {
      toast({ variant: 'destructive', title: t('common.error'), description: 'يرجى إدخال الوزن الداخل' });
      return;
    }

    const weightIn = parseFloat(newTicket.weightIn);

    if (isNaN(weightIn) || weightIn <= 0) {
      toast({ variant: 'destructive', title: t('common.error'), description: 'يرجى إدخال وزن صحيح للوزن الداخل' });
      return;
    }

    try {
      let clientId: number;

      if (selectedClient) {
        clientId = parseInt(selectedClient.id, 10);
      } else {
        const clientData = {
          firstname: newTicket.firstname.trim(),
          lastname: newTicket.lastname.trim(),
        };

        const res = await api.post('/clients', clientData);
        const payload = getPayload<any>(res);
        const createdClient: Client = payload?.client || payload;
        
        if (!createdClient?.id) {
          throw new Error('فشل في إنشاء العميل');
        }
        
        clientId = parseInt(createdClient.id, 10);
        await ticketManagement.loadClients();
      }

      const ticketNumber = await generateDailyTicketNumber();
      const payload: any = {
        clientId: clientId,
        ticket_number: ticketNumber,
        weight_in: weightIn,
        net_weight: weightIn,
        operation_type: 'milling', // Always default to milling for arrival
        status: 'received',
      };

      const response = await api.post('/batches', payload);
      const createdTicket = getPayload<any>(response);

      // Generate QR code for the new ticket
      const qrCode = await generateQRCode({
        id: createdTicket.id,
        ticketNumber: ticketNumber,
        clientName: `${newTicket.firstname} ${newTicket.lastname}`,
        weightIn: weightIn,
        dateReceived: new Date().toISOString()
      });

      // Create the new ticket object
      const newTicketWithQR: Ticket = {
        id: String(createdTicket.id),
        ticketNumber: ticketNumber,
        clientId: String(clientId),
        clientName: `${newTicket.firstname} ${newTicket.lastname}`,
        weightIn: weightIn,
        netWeight: weightIn,
        numberOfBoxes: 0,
        dateReceived: new Date().toISOString(),
        status: 'received',
        operationType: newTicket.operationType as 'milling' | 'sale',
        qrCode: qrCode
      };

      // Add to minimized tickets
      setMinimizedTickets(prev => [...prev, {
        id: String(createdTicket.id),
        ticketNumber: ticketNumber,
        clientName: `${newTicket.firstname} ${newTicket.lastname}`,
        weightIn: weightIn,
        isMaximized: false
      }]);

      // Show the print modal for the new ticket
      setTicketToPrint(newTicketWithQR);
      setIsPrintModalOpen(true);

      // Reset form
      ticketManagement.setNewTicket({ 
        firstname: '', 
        lastname: '', 
        weightIn: '', 
        operationType: 'milling',
      });
      ticketManagement.setSelectedClient(null);
      setIsAddTicketOpen(false);

  toast({ title: t('common.success'), description: 'تم إنشاء التذكرة بنجاح' });
      
  // Refresh tickets silently without disrupting page state
  await ticketManagement.loadRecentTickets(ticketManagement.currentPage, true);
    } catch (e: any) {
      console.error('Error creating ticket:', e);
      toast({ variant: 'destructive', title: t('common.error'), description: e?.message || 'فشل في إنشاء التذكرة' });
    }
  };

  // Handle cancel add ticket
  const handleCancelAddTicket = () => {
    setIsAddTicketOpen(false);
    ticketManagement.setNewTicket({
      firstname: '',
      lastname: '',
      weightIn: '',
      operationType: 'milling',
    });
    ticketManagement.setSelectedClient(null);
  };

  // Track when user is interacting with modals to pause background refresh
  useEffect(() => {
    interactionLockRef.current = Boolean(
      isEditModalOpen ||
      isAddTicketOpen ||
      isFinishingOperation ||
      isQrScanOpen ||
      isPrintModalOpen ||
      isDetailsModalOpen ||
      isQrDisplayOpen ||
      isCameraScanOpen
    );
  }, [
    isEditModalOpen,
    isAddTicketOpen,
    isFinishingOperation,
    isQrScanOpen,
    isPrintModalOpen,
    isDetailsModalOpen,
    isQrDisplayOpen,
    isCameraScanOpen
  ]);

  // Handle ticket click to edit
  const handleTicketClick = async (ticket: Ticket) => {
    try {
      // Always fetch the latest ticket data from server to ensure we have up-to-date weightOut values
      console.log('🔄 TICKET DEBUG: Fetching latest ticket data for ID:', ticket.id);
      const latestTicket = await ticketManagement.fetchTicketByCode(ticket.id);
      
      console.log('📋 TICKET DEBUG: Latest ticket data:', {
        id: latestTicket.id,
        ticketNumber: latestTicket.ticketNumber,
        weightOut: latestTicket.weightOut,
        numberOfBoxes: latestTicket.numberOfBoxes,
      });
      
      ticketManagement.setScannedTicket(latestTicket);

      ticketManagement.setEditForm({
        weightOut: latestTicket.weightOut !== undefined ? String(latestTicket.weightOut) : '',
        numberOfBoxes: latestTicket.numberOfBoxes ? String(latestTicket.numberOfBoxes) : '',
        taux: '', // Reset taux for each ticket
        // Payment fields
        isPaid: latestTicket.isPaid || false,
        paymentAmount: latestTicket.totalAmount ? String(latestTicket.totalAmount) : '',
      });

      // If this is a sale operation, load oil batch weights
      if (latestTicket.operationType === 'sale') {
        console.log('🎫 TICKET DEBUG: Sale operation detected, pre-loading oil batches');
        console.log('📋 TICKET DEBUG: Ticket details:', {
          id: latestTicket.id,
          ticketNumber: latestTicket.ticketNumber,
          clientName: latestTicket.clientName,
          operationType: latestTicket.operationType,
          weightIn: latestTicket.weightIn
        });
        await loadOilBatchWeights(latestTicket.id);
      } else {
        console.log('🎫 TICKET DEBUG: Non-sale operation, skipping oil batch loading');
      }

      // Load existing payments for this ticket
      console.log('💳 TICKET DEBUG: Loading existing payments for ticket');
      const existingPayments = await loadTicketPayments(latestTicket.id);
      
      // Update form with payment information
      if (existingPayments.length > 0) {
        const payment = existingPayments[0]; // Get the first payment
        console.log('💰 TICKET DEBUG: Found existing payment:', payment);
        ticketManagement.setEditForm(prev => ({
          ...prev,
          isPaid: true,
          paymentAmount: payment.amount.toString()
        }));
      } else {
        console.log('💰 TICKET DEBUG: No existing payments found');
        ticketManagement.setEditForm(prev => ({
          ...prev,
          isPaid: false,
          paymentAmount: ''
        }));
      }

      setIsFinishingOperation(true);
      setIsEditModalOpen(true);
    } catch (error: any) {
      console.error('Error opening ticket:', error);
      toast({ variant: 'destructive', title: t('common.error'), description: 'فشل في فتح التذكرة' });
    }
  };

  // Handle print ticket
  const handlePrintTicket = (ticket: Ticket) => {
    setTicketToPrint(ticket);
    setIsPrintModalOpen(true);
  };

  // Handle open quit window (without scanner constraint)
  const handleOpenQuitWindow = async (ticket: Ticket) => {
    try {
      // Load the ticket data to edit
      await handleTicketClick(ticket);
      // Set finishing operation flag so EditTicketModal knows it's for quitting
      setIsFinishingOperation(true);
    } catch (error: any) {
      console.error('Error opening quit window:', error);
      toast({ variant: 'destructive', title: t('common.error'), description: 'فشل في فتح نافذة الخروج' });
    }
  };

  // Handle show QR code
  const handleShowQrCode = (ticket: Ticket) => {
    if (ticket.qrCode) {
      setQrCodeImage(ticket.qrCode);
      setIsQrDisplayOpen(true);
    }
  };

  // Minimize a ticket
  const minimizeTicket = (ticket: Ticket) => {
    setMinimizedTickets(prev => {
      const existing = prev.find(t => t.id === ticket.id);
      if (existing) {
        return prev.map(t => 
          t.id === ticket.id ? { ...t, isMaximized: false } : t
        );
      } else {
        return [...prev, {
          id: ticket.id,
          ticketNumber: ticket.ticketNumber,
          clientName: ticket.clientName,
          weightIn: ticket.weightIn,
          isMaximized: false
        }];
      }
    });
    setIsEditModalOpen(false);
    setIsFinishingOperation(false);
    setIsPrintModalOpen(false);
  };

  // Maximize a ticket
  const maximizeTicket = async (ticketId: string) => {
    setMinimizedTickets(prev => 
      prev.map(t => 
        t.id === ticketId ? { ...t, isMaximized: true } : t
      )
    );
    
    // Find ticket data - try recent tickets first, then minimized tickets as fallback
    let ticket = ticketManagement.recentTickets.find(t => t.id === ticketId);
    if (!ticket) {
      const minimized = minimizedTickets.find(t => t.id === ticketId);
      if (minimized) {
        // Create a basic ticket object from minimized data
        ticket = {
          id: minimized.id,
          ticketNumber: minimized.ticketNumber,
          clientId: '', // Will be filled by fetchTicketByCode
          clientName: minimized.clientName,
          weightIn: minimized.weightIn,
          numberOfBoxes: 0,
          dateReceived: new Date().toISOString(),
          status: 'received' as const,
          operationType: 'milling' as const
        } as Ticket;
      }
    }
    
    if (ticket) {
      await handleTicketClick(ticket);
    }
  };

  // Remove from minimized
  const removeFromMinimized = (ticketId: string) => {
    setMinimizedTickets(prev => prev.filter(t => t.id !== ticketId));
  };

  // Handle save changes from edit modal
  const handleSaveChanges = async () => {
    if (!ticketManagement.scannedTicket) return;
    
    try {
      ticketManagement.setIsSaving(true);
      
      // Separate ticket data from payment data
      const isPaidNow = !!ticketManagement.editForm.isPaid;
      const weightOutStr = ticketManagement.editForm.weightOut?.trim() || '';
      const weightOut = weightOutStr ? parseFloat(weightOutStr) : undefined;
      const hasWeightOut = weightOutStr !== '' && !isNaN(weightOut) && weightOut !== undefined && weightOut >= 0;
      
      const ticketPayload: any = {
        ...(hasWeightOut && { weightOut: weightOut }),
        numberOfBoxes: parseInt(ticketManagement.editForm.numberOfBoxes) || 0,
        ...(ticketManagement.scannedTicket.operationType === 'sale' && ticketManagement.editForm.taux && {
          taux: parseFloat(ticketManagement.editForm.taux)
        }),
        // ALWAYS set status to 'completed' when weightOut is entered
        ...(hasWeightOut && { status: 'completed' }),
        // Persist paid status to batch
        is_paid: isPaidNow,
        ...(isPaidNow
          ? { payment_method: 'cash' }
          : { payment_method: null, payment_reference: null, date_paid: null }
        )
      };

      console.log('💾 TICKET DEBUG: Ticket payload being sent:', JSON.stringify(ticketPayload, null, 2));

      // Update the ticket first
      const response = await ticketManagement.updateBatch(ticketManagement.scannedTicket.id, ticketPayload);
      console.log('📡 TICKET DEBUG: Server response:', response);

      // Consider HTTP 2xx or presence of payload as success, not only { success: true }
      const responsePayload = getPayload<any>(response);
      const httpStatus = (response as any)?.status;
      const isSuccess = (response as any)?.success === true || !!responsePayload || (httpStatus >= 200 && httpStatus < 300);
      
      if (isSuccess) {
        // Handle payment separately if marked as paid
        if (ticketManagement.editForm.isPaid && ticketManagement.editForm.paymentAmount) {
          const paymentAmount = parseFloat(ticketManagement.editForm.paymentAmount);
          if (paymentAmount > 0) {
            console.log('💰 PAYMENT DEBUG: Saving payment:', {
              ticketId: ticketManagement.scannedTicket.id,
              operationType: ticketManagement.scannedTicket.operationType,
              amount: paymentAmount
            });
            
            try {
              // Normalize operation type for backend contract: 'milling' => 'pressing'
              const normalizedOperationType = (ticketManagement.scannedTicket.operationType === 'milling'
                ? 'pressing'
                : ticketManagement.scannedTicket.operationType) as 'sale' | 'pressing';

              await saveTicketPayment(
                ticketManagement.scannedTicket.id,
                normalizedOperationType,
                paymentAmount
              );
              console.log('✅ PAYMENT DEBUG: Payment saved successfully');
            } catch (paymentError) {
              console.error('❌ PAYMENT DEBUG: Error saving payment:', paymentError);
              // Don't fail the entire operation if payment fails
              toast({
                variant: 'destructive',
                title: 'تحذير',
                description: 'تم حفظ بيانات التذكرة ولكن حدث خطأ في حفظ معلومات الدفع'
              });
            }
          }
        } else {
          // If not paid, make sure to delete any existing payments for this ticket
          const currentPayments = ticketPayments[ticketManagement.scannedTicket.id] || [];
          if (currentPayments.length > 0) {
            console.log('🗑️ PAYMENT DEBUG: Ticket marked as unpaid, deleting existing payments');
            try {
              for (const payment of currentPayments) {
                if (payment.id) {
                  await deleteTicketPayment(payment.id, ticketManagement.scannedTicket.id);
                }
              }
              console.log('✅ PAYMENT DEBUG: Existing payments deleted');
            } catch (paymentError) {
              console.error('❌ PAYMENT DEBUG: Error deleting payments:', paymentError);
            }
          }
        }
        
  // Refresh the tickets list silently and keep current page
  ticketManagement.loadRecentTickets(ticketManagement.currentPage, true);
        
        // Show print modal for tickets that have been updated (in_process or completed)
        // in_process = box labels after arrival
        // completed = exit receipt after final processing
        if (response.data?.status === 'in_process' || response.data?.status === 'completed') {
          // Normalize backend payload to Ticket shape so print modal has correct fields
          const d = response.data as any;
          const normalizedTicket = {
            id: String(d.id),
            ticketNumber: d.ticket_number || String(d.id),
            clientId: String(d.clientId ?? (d.client?.id ?? '')),
            clientName: d.client ? `${d.client.firstname || ''} ${d.client.lastname || ''}`.trim() : `عميل #${d.clientId}`,
            weightIn: d.weight_in ?? 0,
            weightOut: d.weight_out ?? undefined,
            netWeight: d.net_weight ?? undefined,
            numberOfBoxes: d.number_of_boxes ?? 0,
            // numberOfBidons = brought bidons (base), NOT produced
            numberOfBidons: d.bidons_brought ?? 0,
            // numberOfBidonsProduced = actual produced count from backend
            numberOfBidonsProduced: d.number_of_bidons ?? undefined,
            taux: d.taux ?? undefined,
            unitPrice: d.unit_price ?? 0,
            totalAmount: d.total_amount ?? undefined,
            isPaid: d.is_paid ?? false,
            paymentMethod: d.payment_method ?? undefined,
            paymentReference: d.payment_reference ?? undefined,
            datePaid: d.date_paid ?? undefined,
            dateReceived: d.date_received || d.createdAt || new Date().toISOString(),
            status: d.status || 'received',
            operationType: d.operation_type || 'milling',
            notes: d.notes || '',
            qrCode: undefined
          // If the ticket is being completed (quitting), the print modal for exit receipt will open automatically after updateBatch.
          } as Ticket;
          
          // If finishing operation and status is completed, show exit receipt print
          if (isFinishingOperation && response.data?.status === 'completed') {
            // Close edit modal first
            setIsEditModalOpen(false);
            setIsFinishingOperation(false);
            // Show print modal for exit receipt
            setTicketToPrint(normalizedTicket);
            setIsPrintModalOpen(true);
          } else {
            // For other cases, close edit modal
            setIsEditModalOpen(false);
            setIsFinishingOperation(false);
          }
        } else {
          // If status didn't change to completed/in_process, just close the modal
          setIsEditModalOpen(false);
          setIsFinishingOperation(false);
        }
      }
    } catch (error) {
      console.error('Error saving changes:', error);
      toast({
        variant: 'destructive',
        title: 'خطأ',
        description: 'حدث خطأ في حفظ التغييرات'
      });
    } finally {
      ticketManagement.setIsSaving(false);
    }
  };

  // Load pressing history for details modal
  const loadPressingHistory = async (ticketId: string) => {
    setLoadingPressingHistory(true);
    try {
      // Get the batch details with all related data
      const batchResponse = await api.get(`/batches/${ticketId}`);
      const batch = getPayload<any>(batchResponse) || {};
      
      // Ensure we have the correct batch ID for filtering
      const batchId = batch.id || ticketId;
      
      // Get pressing sessions for this specific batch only
      let sessionsList = [];
      try {
        const sessions = await api.get(`/pressing-sessions?batchId=${batchId}`);
        const sessionsPayload = getPayload<any>(sessions);
        // Handle different response formats
        if (Array.isArray(sessionsPayload)) {
          // Filter to ensure only sessions for this specific batch
          sessionsList = sessionsPayload.filter(session => 
            String(session.batch_id) === String(batchId) || 
            String(session.batchId) === String(batchId)
          );
        } else if (sessionsPayload && Array.isArray(sessionsPayload.sessions)) {
          // Filter to ensure only sessions for this specific batch
          sessionsList = sessionsPayload.sessions.filter(session => 
            String(session.batch_id) === String(batchId) || 
            String(session.batchId) === String(batchId)
          );
        } else if (batch.pressingSessions && Array.isArray(batch.pressingSessions)) {
          // Use pressing sessions from the batch response if available (already filtered)
          sessionsList = batch.pressingSessions;
        }
      } catch (error) {
        console.warn('Failed to load pressing sessions:', error);
        // Try to get sessions from the batch response if the separate call fails
        if (batch.pressingSessions && Array.isArray(batch.pressingSessions)) {
          sessionsList = batch.pressingSessions;
        }
      }
      
      // Get batch loading history for this specific batch only
      let batchLoadings;
      let loadingsList = [];
      
      try {
        batchLoadings = await api.get(`/batch-loadings?batchId=${batchId}`);
        const loadingsPayload = getPayload<any>(batchLoadings);
        // Handle different response formats
        if (Array.isArray(loadingsPayload)) {
          // Filter to ensure only loadings for this specific batch
          loadingsList = loadingsPayload.filter(loading => 
            String(loading.batch_id) === String(batchId) || 
            String(loading.batchId) === String(batchId)
          );
        } else if (loadingsPayload && Array.isArray(loadingsPayload.batchLoadings)) {
          // Filter to ensure only loadings for this specific batch
          loadingsList = loadingsPayload.batchLoadings.filter(loading => 
            String(loading.batch_id) === String(batchId) || 
            String(loading.batchId) === String(batchId)
          );
        } else if (batch.batchLoadings && Array.isArray(batch.batchLoadings)) {
          // Use batch loadings from the batch response if available (already filtered)
          loadingsList = batch.batchLoadings;
        }
      } catch (error) {
        console.warn('Failed to load batch loadings:', error);
        // Try to get loadings from the batch response if the separate call fails
        if (batch.batchLoadings && Array.isArray(batch.batchLoadings)) {
          loadingsList = batch.batchLoadings;
        }
      }
      
      // Build comprehensive history tracking the batch loading workflow
      const history = [];
      
      // 1. Batch creation/receipt
      if (batch.createdAt || batch.date_received) {
        history.push({
          id: `batch-${batch.id}`,
          type: 'batch_created',
          timestamp: batch.date_received || batch.createdAt,
          title: 'استلام التذكرة',
          description: `تم استلام ${batch.number_of_boxes || 0} صندوق بوزن ${batch.weight_in || 0} كيلو`,
          status: 'completed',
          details: {
            totalBoxes: batch.number_of_boxes || 0,
            weightIn: batch.weight_in || 0,
            operationType: batch.operation_type || 'milling',
            bidonsBrought: batch.bidons_brought || 0
          }
        });
      }
      
      // 2. Room assignment (if applicable)
      if (batch.pressing_room_id && batch.session_start_time) {
        history.push({
          id: `assign-${batch.id}`,
          type: 'room_assignment',
          timestamp: batch.session_start_time,
          title: 'تخصيص غرفة العصر',
          description: `تم تخصيص ${batch.pressingRoom?.name || `غرفة #${batch.pressing_room_id}`}`,
          status: 'completed',
          details: {
            roomId: batch.pressing_room_id,
            roomName: batch.pressingRoom?.name || `غرفة #${batch.pressing_room_id}`,
            estimatedTime: batch.estimated_time || 60
          }
        });
      }
      
      // 3. Pressing sessions - track the actual processing for this specific batch
      if (Array.isArray(sessionsList) && sessionsList.length > 0) {
        sessionsList.forEach((session: any) => {
          // Double-check that this session belongs to our batch
          const sessionBatchId = String(session.batch_id || session.batchId || '');
          if (sessionBatchId !== String(batchId)) {
            console.warn(`Session ${session.id} batch ID mismatch: ${sessionBatchId} vs ${batchId}`);
            return; // Skip sessions that don't belong to this batch
          }
          
          // Session start
          history.push({
            id: `session-start-${session.id}`,
            type: 'session_start',
            timestamp: session.start,
            title: 'بداية جلسة العصر',
            description: `بدء معالجة ${session.number_of_boxes} صندوق في ${session.pressingRoom?.name || `غرفة #${session.pressing_roomID}`}`,
            status: 'completed',
            details: {
              sessionId: session.id,
              roomId: session.pressing_roomID,
              roomName: session.pressingRoom?.name || `غرفة #${session.pressing_roomID}`,
              boxesProcessed: session.number_of_boxes,
              batchId: session.batch_id || session.batchId
            }
          });
          
          // Session end (if completed)
          if (session.finish) {
            const duration = Math.round((new Date(session.finish).getTime() - new Date(session.start).getTime()) / (1000 * 60));
            history.push({
              id: `session-end-${session.id}`,
              type: 'session_end',
              timestamp: session.finish,
              title: 'انتهاء جلسة العصر',
              description: `تم الانتهاء من معالجة ${session.number_of_boxes} صندوق (${duration} دقيقة)`,
              status: 'completed',
              details: {
                sessionId: session.id,
                roomId: session.pressing_roomID,
                roomName: session.pressingRoom?.name || `غرفة #${session.pressing_roomID}`,
                duration: duration,
                oilProduced: session.oil_bidons_produced || 0,
                batchId: session.batch_id || session.batchId
              }
            });
          } else {
            // Active session
            history.push({
              id: `session-active-${session.id}`,
              type: 'session_active',
              timestamp: new Date().toISOString(),
              title: 'جلسة عصر نشطة',
              description: `جلسة العصر قيد التشغيل في ${session.pressingRoom?.name || `غرفة #${session.pressing_roomID}`}`,
              status: 'active',
              details: {
                sessionId: session.id,
                roomId: session.pressing_roomID,
                roomName: session.pressingRoom?.name || `غرفة #${session.pressing_roomID}`,
                startTime: session.start,
                boxesProcessed: session.number_of_boxes,
                batchId: session.batch_id || session.batchId
              }
            });
          }
        });
      }
      
      // 4. Final completion (if batch is completed)
      if (batch.status === 'completed' && batch.weight_out !== null) {
        history.push({
          id: `completion-${batch.id}`,
          type: 'batch_completed',
          timestamp: batch.updatedAt || new Date().toISOString(),
          title: 'اكتمال معالجة التذكرة',
          description: `تم الانتهاء من معالجة التذكرة - الوزن الصافي: ${batch.net_weight || 0} كيلو`,
          status: 'completed',
          details: {
            weightOut: batch.weight_out,
            netWeight: batch.net_weight,
            totalAmount: batch.total_amount,
            boxesLoaded: batch.boxes_loaded_to_pressing || 0,
            totalBoxes: batch.number_of_boxes || 0
          }
        });
      }
      
      // Sort chronologically (oldest first for better workflow understanding)
      history.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      
      setPressingHistory(history);
    } catch (error: any) {
      console.error('Error loading pressing history:', error);
      setPressingHistory([]);
    } finally {
      setLoadingPressingHistory(false);
    }
  };

  // Calculate edit net weight
  const calculateEditNetWeight = () => {
    if (!ticketManagement.scannedTicket) return 0;
    // Don't calculate if weightOut is empty
    if (!ticketManagement.editForm.weightOut || ticketManagement.editForm.weightOut.trim() === '') return 0;
    const weightOut = parseFloat(ticketManagement.editForm.weightOut);
    return Math.max(0, ticketManagement.scannedTicket.weightIn - weightOut);
  };

  // Load oil batch weights for a specific batch ID
  const loadOilBatchWeights = async (batchId: string) => {
    console.log('🛢️ OIL BATCH DEBUG: Starting to load oil batches for batch ID:', batchId);
    
    try {
      const apiUrl = `/oil-batches?batchId=${batchId}`;
      console.log('📡 OIL BATCH DEBUG: API URL:', apiUrl);
      
      const oilBatchesResponse = await api.get(apiUrl);
      console.log('📨 OIL BATCH DEBUG: Raw API response:', oilBatchesResponse);
      
      const oilBatches = getPayload<any>(oilBatchesResponse);
      console.log('📦 OIL BATCH DEBUG: Parsed payload:', oilBatches);
      console.log('🔍 OIL BATCH DEBUG: First oil batch sample:', oilBatches?.[0] || oilBatches?.oilBatches?.[0] || 'No batches found');
      
      let totalOilWeight = 0;
      let matchingBatches = [];
      
      if (Array.isArray(oilBatches)) {
        console.log('📝 OIL BATCH DEBUG: Processing array format, total items:', oilBatches.length);
        
        // Filter oil batches for this specific batch and sum their weights
        matchingBatches = oilBatches.filter(batch => {
          const matchesSnakeCase = String(batch.batch_id) === String(batchId);
          const matchesCamelCase = String(batch.batchId) === String(batchId);
          const matches = matchesSnakeCase || matchesCamelCase;
          console.log(`🔍 OIL BATCH DEBUG: Batch ${batch.id} - batch_id: ${batch.batch_id}, batchId: ${batch.batchId}, matches: ${matches}`);
          return matches;
        });
        
        console.log('✅ OIL BATCH DEBUG: Matching batches found:', matchingBatches.length);
        matchingBatches.forEach((batch, index) => {
          const weight = parseFloat(batch.weight) || 0;
          console.log(`⚖️ OIL BATCH DEBUG: Batch ${index + 1} - ID: ${batch.id}, Weight: ${weight}kg`);
          totalOilWeight += weight;
        });
        
      } else if (oilBatches && Array.isArray(oilBatches.oilBatches)) {
        console.log('📝 OIL BATCH DEBUG: Processing nested format, total items:', oilBatches.oilBatches.length);
        
        // Handle different response format
        matchingBatches = oilBatches.oilBatches.filter(batch => {
          const matchesSnakeCase = String(batch.batch_id) === String(batchId);
          const matchesCamelCase = String(batch.batchId) === String(batchId);
          const matches = matchesSnakeCase || matchesCamelCase;
          console.log(`🔍 OIL BATCH DEBUG: Batch ${batch.id} - batch_id: ${batch.batch_id}, batchId: ${batch.batchId}, matches: ${matches}`);
          return matches;
        });
        
        console.log('✅ OIL BATCH DEBUG: Matching batches found:', matchingBatches.length);
        matchingBatches.forEach((batch, index) => {
          const weight = parseFloat(batch.weight) || 0;
          console.log(`⚖️ OIL BATCH DEBUG: Batch ${index + 1} - ID: ${batch.id}, Weight: ${weight}kg`);
          totalOilWeight += weight;
        });
      } else {
        console.log('❌ OIL BATCH DEBUG: Unexpected response format:', typeof oilBatches);
      }
      
      console.log('🧮 OIL BATCH DEBUG: CALCULATION SUMMARY:');
      console.log('  - Target batch ID:', batchId);
      console.log('  - Matching oil batches:', matchingBatches.length);
      console.log('  - Total oil weight:', totalOilWeight, 'kg');
      
      setOilBatchWeights(prev => ({ ...prev, [batchId]: totalOilWeight }));
      console.log('💾 OIL BATCH DEBUG: Cached weight for future use');
      
      return totalOilWeight;
    } catch (error) {
      console.error('❌ OIL BATCH DEBUG: Error fetching oil batches:', error);
      return 0;
    }
  };

  // Load payments for a specific ticket
  const loadTicketPayments = async (ticketId: string) => {
    console.log('💳 PAYMENT DEBUG: Loading payments for ticket ID:', ticketId);
    
    try {
      setLoadingPayments(true);
      const response = await ticketPaymentService.getPaymentsByTicketId(parseInt(ticketId));
      console.log('📨 PAYMENT DEBUG: Raw payment response:', response);
      
      const payments = getPayload<TicketPayment[]>(response) || [];
      console.log('📦 PAYMENT DEBUG: Parsed payments:', payments);
      
      setTicketPayments(prev => ({ ...prev, [ticketId]: payments }));
      console.log('💾 PAYMENT DEBUG: Cached payments for ticket:', ticketId);
      
      return payments;
    } catch (error) {
      console.error('❌ PAYMENT DEBUG: Error loading payments:', error);
      return [];
    } finally {
      setLoadingPayments(false);
    }
  };

  // Create or update ticket payment
  const saveTicketPayment = async (ticketId: string, operationType: 'sale' | 'pressing', amount: number, paymentDate?: string) => {
    console.log('💳 PAYMENT DEBUG: Saving payment for ticket:', ticketId);
    console.log('💰 PAYMENT DEBUG: Payment details:', { operationType, amount, paymentDate });
    
    try {
      // Always check server for latest payments to avoid duplicate creates
      const latestPaymentsResponse = await ticketPaymentService.getPaymentsByTicketId(parseInt(ticketId));
      const latestPayments = getPayload<TicketPayment[]>(latestPaymentsResponse) || [];
      const existingPayment = latestPayments[0]; // Assuming one payment per ticket for now
      
      const paymentData = {
        ticketId: parseInt(ticketId),
        amount,
        payment_date: paymentDate || new Date().toISOString().split('T')[0],
        payment_method: 'cash',
        payment_type: operationType === 'sale' ? 'outgoing' as const : 'incoming' as const,
        operation_type: operationType
      };
      
      let response;
      if (existingPayment) {
        console.log('📝 PAYMENT DEBUG: Updating existing payment:', existingPayment.id);
        try {
          response = await ticketPaymentService.updateTicketPayment(existingPayment.id!, {
            amount,
            payment_date: paymentData.payment_date
          });
        } catch (e) {
          console.warn('⚠️ PAYMENT DEBUG: Update failed, attempting create as fallback', e);
          response = await ticketPaymentService.createTicketPayment(paymentData);
        }
      } else {
        console.log('➕ PAYMENT DEBUG: Creating new payment');
        response = await ticketPaymentService.createTicketPayment(paymentData);
      }
      
      console.log('✅ PAYMENT DEBUG: Payment saved successfully:', response);
      
      // Refresh payments for this ticket
      await loadTicketPayments(ticketId);
      
      return response;
    } catch (error) {
      console.error('❌ PAYMENT DEBUG: Error saving payment:', error);
      throw error;
    }
  };

  // Delete ticket payment
  const deleteTicketPayment = async (paymentId: number, ticketId: string) => {
    console.log('🗑️ PAYMENT DEBUG: Deleting payment:', paymentId);
    
    try {
      const response = await ticketPaymentService.deleteTicketPayment(paymentId);
      console.log('✅ PAYMENT DEBUG: Payment deleted successfully');
      
      // Refresh payments for this ticket
      await loadTicketPayments(ticketId);
      
      return response;
    } catch (error) {
      console.error('❌ PAYMENT DEBUG: Error deleting payment:', error);
      throw error;
    }
  };

  // Get payment status for a ticket
  const getTicketPaymentStatus = (ticketId: string) => {
    const payments = ticketPayments[ticketId] || [];
    const totalPaid = payments.reduce((sum, payment) => sum + parseFloat(payment.amount.toString()), 0);
    const isPaid = payments.length > 0;
    
    return {
      isPaid,
      totalPaid,
      payments,
      paymentCount: payments.length
    };
  };

  // Calculate minimum price based on 200 kg * unit price (only applies to non-sale operations)
  const calculateMinimumPrice = (unitPrice: number, operationType?: string) => {
    // For sale operations, no minimum price is applied
    if (operationType === 'sale') {
      return 0;
    }
    return 200 * unitPrice;
  };

  // Calculate edit total amount with details
  const calculateEditTotalAmountWithDetails = async (operationType?: string) => {
    if (!ticketManagement.currentPrices || !ticketManagement.scannedTicket) {
      return { amount: 0, calculationMethod: 'milling' as const };
    }
    
    const netWeight = calculateEditNetWeight();
    if (netWeight <= 0) {
      return { amount: 0, calculationMethod: 'milling' as const };
    }

    let unitPrice = 0;
    let calculationMethod: 'taux' | 'container' | 'milling' = 'milling';
    let containerWeight: number | undefined = undefined;
    
    if (operationType === 'sale') {
      // For sale operations, use olive buying price per kg (no minimum price applied)
      unitPrice = ticketManagement.currentPrices.olive_buying_price_per_kg;
      
      // Check if taux is provided in the edit form
      const tauxValue = parseFloat(ticketManagement.editForm.taux) || 0;
      let effectiveWeight = netWeight;
      
      if (tauxValue > 0) {
        // If taux is provided, calculate oil amount from net weight
        effectiveWeight = (netWeight * tauxValue) / 100;
        calculationMethod = 'taux';
        
        console.log('💰 SALE DEBUG: Using taux-based calculation:');
        console.log('  - Net weight:', netWeight, 'kg');
        console.log('  - Taux rate:', tauxValue, '%');
        console.log('  - Calculated oil amount:', effectiveWeight, 'kg');
        console.log('  - Olive buying price:', unitPrice, 'dinars/kg');
        console.log('  - Total amount:', effectiveWeight * unitPrice, 'dinars');
        console.log('  - No minimum price applied for sale operations');
      } else {
        console.log('💰 SALE DEBUG: Using direct net weight calculation:');
        console.log('  - Net weight:', netWeight, 'kg');
        console.log('  - Olive buying price:', unitPrice, 'dinars/kg');
        console.log('  - Total amount:', effectiveWeight * unitPrice, 'dinars');
        console.log('  - No minimum price applied for sale operations');
      }
      
      const totalAmount = effectiveWeight * unitPrice;
      const minimumPrice = calculateMinimumPrice(unitPrice, operationType);
      return { 
        amount: Math.max(totalAmount, minimumPrice), 
        calculationMethod,
        containerWeight: tauxValue > 0 ? effectiveWeight : undefined
      };
    } else {
      // For milling operations, use milling price
      unitPrice = ticketManagement.currentPrices.milling_price_per_kg;
    }
    
    const totalAmount = netWeight * unitPrice;
    const minimumPrice = calculateMinimumPrice(unitPrice, operationType);
    return { 
      amount: Math.max(totalAmount, minimumPrice), 
      calculationMethod 
    };
  };

  // Calculate edit total amount (simplified version for backward compatibility)
  const calculateEditTotalAmount = async (operationType?: string) => {
    const details = await calculateEditTotalAmountWithDetails(operationType);
    return details.amount;
  };

  // Check if minimum price is applied
  const isMinimumPriceApplied = async (operationType?: string) => {
    if (!ticketManagement.currentPrices || !ticketManagement.scannedTicket) {
      return false;
    }
    
    const netWeight = calculateEditNetWeight();
    if (netWeight <= 0) {
      return false;
    }

    let unitPrice = 0;
    let baseAmount = 0;
    
    if (operationType === 'sale') {
      // For sale operations, use olive buying price per kg (no minimum price applied)
      unitPrice = ticketManagement.currentPrices.olive_buying_price_per_kg;
      
      // Check if taux is provided in the edit form
      const tauxValue = parseFloat(ticketManagement.editForm.taux) || 0;
      let effectiveWeight = netWeight;
      
      if (tauxValue > 0) {
        // If taux is provided, calculate oil amount from net weight
        effectiveWeight = (netWeight * tauxValue) / 100;
      }
      
      baseAmount = effectiveWeight * unitPrice;
    } else {
      // For milling operations, use milling price
      unitPrice = ticketManagement.currentPrices.milling_price_per_kg;
      baseAmount = netWeight * unitPrice;
    }
    
    const minimumPrice = calculateMinimumPrice(unitPrice, operationType);
    return baseAmount < minimumPrice;
  };

  // Print ticket function
  const printTicket = () => {
    // Guard: Only print if we have a valid ticket
    if (!ticketToPrint) {
      console.warn('printTicket called but no ticket to print');
      return;
    }

    // Store print window reference to manage it properly
    if ((window as any).__olivePrintWindow) {
      try {
        const existingWindow = (window as any).__olivePrintWindow;
        if (existingWindow && !existingWindow.closed) {
          existingWindow.close();
        }
      } catch (e) {
        // Ignore errors
      }
      (window as any).__olivePrintWindow = null;
    }

    const printWindow = window.open('', '_blank', 'noopener,noreferrer');
    if (printWindow && ticketToPrint) {
      // Store reference to manage this window
      (window as any).__olivePrintWindow = printWindow;
      
      // Add a flag to prevent multiple prints
      let hasPrinted = false;
      
      printWindow.document.write(`
        <html>
          <head>
            <title>تذكرة معصرة الزيتون - ${ticketToPrint.ticketNumber}</title>
            <style>
              body { 
                font-family: Arial, sans-serif; 
                margin: 20px; 
                direction: rtl; 
                text-align: center; 
                background: white; 
                color: black;
              }
              .ticket { 
                border: 2px solid #000; 
                padding: 20px; 
                max-width: 400px; 
                margin: 0 auto; 
                background: white;
                color: black;
              }
              .header { 
                font-size: 24px; 
                font-weight: bold; 
                margin-bottom: 20px; 
                color: #000;
              }
              .ticket-number { 
                font-size: 18px; 
                margin-bottom: 10px; 
                color: #000;
              }
              .client-info { 
                margin-bottom: 15px; 
                color: #000;
              }
              .weights { 
                display: grid; 
                grid-template-columns: 1fr 1fr; 
                gap: 10px; 
                margin-bottom: 15px; 
              }
              .weight-item { 
                border: 1px solid #ccc; 
                padding: 10px; 
                background: white;
                color: #000;
                text-align: center;
              }
              .weight-item strong {
                color: #000;
                font-size: 1.1em;
                display: block;
                margin-bottom: 5px;
              }
              .qr-code { 
                margin: 15px 0; 
              }
              .footer { 
                margin-top: 20px; 
                font-size: 12px; 
                color: #666; 
              }
              @page {
                size: 80mm auto;
                margin: 0;
              }
              @media print { 
                * {
                  -webkit-print-color-adjust: exact !important;
                  print-color-adjust: exact !important;
                }
                html, body { 
                  margin: 0; 
                  padding: 0;
                  background: white;
                  color: black;
                  width: 80mm;
                  height: auto;
                }
                .ticket { 
                  width: 80mm;
                  border: none; 
                  padding: 5mm; 
                  background: white;
                  color: black;
                  page-break-before: auto;
                  page-break-after: auto;
                  page-break-inside: avoid;
                  box-sizing: border-box;
                }
              }
              @media (prefers-color-scheme: dark) {
                body { background: white; color: black; }
                .ticket { background: white; color: black; }
                .header { color: #000; }
                .ticket-number { color: #000; }
                .client-info { color: #000; }
                .weight-item { background: white; color: #000; }
              }
            </style>
          </head>
          <body>
            <div class="ticket">
              <div class="header">معصرة الزيتون</div>
              <div class="ticket-number">تذكرة رقم: ${ticketToPrint.ticketNumber}</div>
              
              <div class="client-info">
                <div><strong>اسم العميل:</strong> ${ticketToPrint.clientName}</div>
                <div><strong>تاريخ الاستلام:</strong> ${new Date(ticketToPrint.dateReceived).toLocaleDateString('ar-TN')}</div>
              </div>
              
              <div class="weights">
                <div class="weight-item">
                  <strong>الوزن الداخل</strong><br>
                  ${ticketToPrint.weightIn} كيلو
                </div>
                <div class="weight-item">
                  <strong>الوزن الخارج</strong><br>
                  ${ticketToPrint.weightOut || 'لم يتم الوزن'} كيلو
                </div>
                <div class="weight-item" style="grid-column: span 2">
                  <strong>صافي الوزن</strong><br>
                  ${ticketToPrint.netWeight || ticketToPrint.weightIn} كيلو
                </div>
              </div>
              
              ${ticketToPrint.qrCode ? `
                <div class="qr-code">
                  <img src="${ticketToPrint.qrCode}" alt="QR Code" style="width: 100px; height: 100px;">
                </div>
                <div class="footer" style="margin-top: 30px; font-size: 16px; color: #008000; font-weight: bold;">
                  شكراً لاختياركم معصرة الزيتون. نتمنى لكم يوماً سعيداً!
                </div>
              ` : ''}
              
              <div class="footer">
                شكراً لتعاملكم معنا<br>
                تاريخ الطباعة: ${new Date().toLocaleDateString('ar-TN')}
              </div>
            </div>
            
            <script>
              (function() {
                var hasPrinted = false;
                var printTriggered = false;
                var windowClosed = false;
                var printDialogOpen = false;
                var closeCheckInterval = null;
                
                function closeWindow() {
                  if (!windowClosed && window && !window.closed) {
                    windowClosed = true;
                    if (closeCheckInterval) {
                      clearInterval(closeCheckInterval);
                      closeCheckInterval = null;
                    }
                    setTimeout(function() {
                      try {
                        if (window && !window.closed) {
                          window.close();
                        }
                      } catch (e) {
                        // Ignore errors
                      }
                    }, 50);
                  }
                }
                
                // Method 1: onafterprint event (most browsers)
                window.onafterprint = function() {
                  printDialogOpen = false;
                  closeWindow();
                };
                
                // Method 2: beforeprint/afterprint events (better support)
                window.onbeforeprint = function() {
                  printDialogOpen = true;
                };
                
                window.addEventListener('afterprint', function() {
                  printDialogOpen = false;
                  closeWindow();
                });
                
                // Method 3: matchMedia for print (Chrome, Edge, Safari)
                if (window.matchMedia) {
                  var mediaQueryList = window.matchMedia('print');
                  var handleMediaChange = function(mql) {
                    if (!mql.matches) {
                      // Print dialog closed
                      printDialogOpen = false;
                      closeWindow();
                    } else {
                      printDialogOpen = true;
                    }
                  };
                  mediaQueryList.addEventListener('change', handleMediaChange);
                  
                  // Check initial state
                  if (!mediaQueryList.matches) {
                    printDialogOpen = false;
                  }
                }
                
                // Method 4: Focus-based detection (fallback)
                var wasFocused = false;
                window.addEventListener('focus', function() {
                  if (printDialogOpen && wasFocused) {
                    // Print dialog likely closed if we regain focus
                    setTimeout(function() {
                      if (!printDialogOpen) {
                        closeWindow();
                      }
                    }, 200);
                  }
                  wasFocused = true;
                });
                
                // Method 5: Polling fallback (most reliable, especially for PDF printing)
                var pollCount = 0;
                var lastFocusTime = Date.now();
                var lastBlurTime = 0;
                
                closeCheckInterval = setInterval(function() {
                  pollCount++;
                  
                  // After 0.5 seconds, start checking if print dialog is still open
                  if (pollCount > 5) {
                    // Check if window has focus (print dialog closed)
                    var hasFocus = document.hasFocus && document.hasFocus();
                    
                    if (hasFocus) {
                      lastFocusTime = Date.now();
                      
                      // If we have focus and dialog was open, check if it's been closed
                      if (printDialogOpen) {
                        // Wait a bit to ensure dialog is really closed (PDF save dialog might appear)
                        if (pollCount > 15) {
                          // Dialog was open but window has focus now - it closed
                          printDialogOpen = false;
                          closeWindow();
                        }
                      }
                    } else {
                      lastBlurTime = Date.now();
                    }
                    
                    // For PDF printing: If window regained focus after being blurred for > 1 second, close it
                    // This handles the case where PDF save dialog appears and then closes
                    if (hasFocus && lastBlurTime > 0 && (Date.now() - lastBlurTime) > 1000) {
                      if (pollCount > 20) {
                        closeWindow();
                      }
                    }
                    
                    // Force close after 2 seconds if still open (user definitely canceled or saved PDF)
                    // Reduced from 3 seconds for faster response
                    if (pollCount > 20 && !windowClosed) {
                      closeWindow();
                    }
                  }
                }, 100);
                
                // Clean up interval on window close
                window.addEventListener('beforeunload', function() {
                  if (closeCheckInterval) {
                    clearInterval(closeCheckInterval);
                  }
                });
                
                window.onload = function() {
                  // Only print once
                  if (!printTriggered && !hasPrinted) {
                    printTriggered = true;
                    hasPrinted = true;
                    
                    // Small delay to ensure content is fully rendered
                    setTimeout(function() {
                      try {
                        printDialogOpen = true;
                        window.print();
                        wasFocused = true;
                      } catch (e) {
                        console.error('Print error:', e);
                        // Close window if print fails
                        closeWindow();
                      }
                    }, 100);
                  }
                };
                
                // Also handle case where onload might have already fired
                if (document.readyState === 'complete') {
                  window.onload();
                } else {
                  document.addEventListener('DOMContentLoaded', window.onload);
                }
              })();
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
      
      // Fallback: Ensure window closes after a reasonable time if events don't fire
      setTimeout(() => {
        try {
          if (printWindow && !printWindow.closed) {
            printWindow.close();
            (window as any).__olivePrintWindow = null;
          }
        } catch (e) {
          // Ignore errors
        }
      }, 10000); // Fallback: Close after 10 seconds if still open (should be closed by events)
      
      // Also close on beforeunload to prevent orphaned windows
      printWindow.addEventListener('beforeunload', () => {
        (window as any).__olivePrintWindow = null;
      });
    } else {
      console.warn('Failed to open print window');
    }
  };

  // Handle delete ticket
  const handleDeleteTicket = async (ticketId: string) => {
    try {
      await ticketManagement.deleteTicket(ticketId);
    } catch (error) {
      console.error('Error deleting ticket:', error);
    }
  };

  // Initialize data on mount
  useEffect(() => {
    ticketManagement.initializeData();
  }, []);

  // Auto-refresh tickets silently every 5 seconds when user is not interacting with modals
  useEffect(() => {
    if (!AUTO_REFRESH_ENABLED) return;

    const performRefresh = async () => {
      if (autoRefreshInFlightRef.current) return;
      if (interactionLockRef.current) return;

      if (typeof document !== 'undefined' && document.hidden) return;

      if (!ticketManagement.loadRecentTickets) return;

      autoRefreshInFlightRef.current = true;
      const pageToRefresh = currentPageRef.current || 1;

      try {
        await ticketManagement.loadRecentTickets(pageToRefresh, true);
      } catch (error) {
        // Swallow errors silently during background refresh
        console.warn('Auto refresh failed:', error);
      } finally {
        autoRefreshInFlightRef.current = false;
      }
    };

    const handleVisibilityChange = () => {
      if (typeof document === 'undefined' || document.hidden) return;
      void performRefresh();
    };

    const intervalId = window.setInterval(() => {
      void performRefresh();
    }, AUTO_REFRESH_INTERVAL_MS);

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibilityChange);
    }

    void performRefresh();

    return () => {
      clearInterval(intervalId);
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Prefetch payments for visible recent tickets to ensure correct UI totals before opening modal
  useEffect(() => {
    if (!Array.isArray(ticketManagement.recentTickets) || ticketManagement.recentTickets.length === 0) return;
    const ticketsToPrefetch = ticketManagement.recentTickets.slice(0, 50); // cap for performance
    (async () => {
      for (const t of ticketsToPrefetch) {
        const id = String(t.id);
        if (!ticketPayments[id]) {
          try {
            await loadTicketPayments(id);
          } catch (e) {
            // ignore prefetch errors silently
          }
        }
      }
    })();
  }, [ticketManagement.recentTickets]);

  // Load oil batch weights when taux changes for sale operations
  useEffect(() => {
    if (ticketManagement.scannedTicket?.operationType === 'sale' && 
        ticketManagement.editForm.taux === '' && 
        !oilBatchWeights[ticketManagement.scannedTicket.id]) {
      
      console.log('🔄 USEEFFECT DEBUG: Taux changed, checking if oil batch loading needed');
      console.log('📝 USEEFFECT DEBUG: Current taux value:', ticketManagement.editForm.taux);
      console.log('📋 USEEFFECT DEBUG: Current batch ID:', ticketManagement.scannedTicket.id);
      console.log('💾 USEEFFECT DEBUG: Cached weights:', oilBatchWeights);
      console.log('🚀 USEEFFECT DEBUG: Triggering oil batch loading...');
      
      // Only load if taux is empty/0 and we don't have cached weights
      loadOilBatchWeights(ticketManagement.scannedTicket.id);
    } else {
      console.log('⏭️ USEEFFECT DEBUG: Skipping oil batch loading - conditions not met');
      console.log('  - Operation type:', ticketManagement.scannedTicket?.operationType);
      console.log('  - Taux value:', `"${ticketManagement.editForm.taux}"`);
      console.log('  - Has cached weight:', !!oilBatchWeights[ticketManagement.scannedTicket?.id || '']);
    }
  }, [ticketManagement.editForm.taux, ticketManagement.scannedTicket?.id]);

  // Dummy implementation for handleScanOilQuantity to fix the error
  const handleScanOilQuantity = () => {
    // TODO: Implement functionality as needed
    console.log('handleScanOilQuantity called');
  };

  return {
    // Ticket Management State
    ...ticketManagement,
    
    // Modal States
    isAddTicketOpen,
    setIsAddTicketOpen,
    isQrScanOpen,
    setIsQrScanOpen,
    isEditModalOpen,
    setIsEditModalOpen,
    isPrintModalOpen,
    setIsPrintModalOpen,
    isQrDisplayOpen,
    setIsQrDisplayOpen,
    isDetailsModalOpen,
    setIsDetailsModalOpen,
    isCameraScanOpen,
    setIsCameraScanOpen,
    isFinishingOperation,
    setIsFinishingOperation,

    // Additional States
    ticketToPrint,
    setTicketToPrint,
    qrCodeImage,
    setQrCodeImage,
    minimizedTickets,
    setMinimizedTickets,
    pressingHistory,
    setPressingHistory,
    loadingPressingHistory,
    setLoadingPressingHistory,

    // QR Scanner
    ...qrScanner,

    // Handlers
    handleAddTicket,
    handleCancelAddTicket,
    handleTicketClick,
    handlePrintTicket,
    handleOpenQuitWindow,
    handleScanOilQuantity,
    handleShowQrCode,
    minimizeTicket,
    maximizeTicket,
    removeFromMinimized,
    handleSaveChanges,
    loadPressingHistory,
    loadOilBatchWeights,
    calculateEditNetWeight,
    calculateEditTotalAmount,
    calculateEditTotalAmountWithDetails,
    isMinimumPriceApplied,
    printTicket,
    handleDeleteTicket,
    
    // Oil Quantity Modal
    oilQuantityTicket,
    setOilQuantityTicket,
    isOilQuantityModalOpen,
    setIsOilQuantityModalOpen,

    // Payment Management
    ticketPayments,
    loadingPayments,
    loadTicketPayments,
    saveTicketPayment,
    deleteTicketPayment,
    getTicketPaymentStatus,
  };
};
