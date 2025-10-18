import { useState, useEffect } from 'react';
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

export const useDailyWork = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  
  // Use ticket management hook
  const ticketManagement = useTicketManagement();
  
  // Modal states
  const [isAddTicketOpen, setIsAddTicketOpen] = useState(false);
  const [isQrScanOpen, setIsQrScanOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [isQrDisplayOpen, setIsQrDisplayOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isCameraScanOpen, setIsCameraScanOpen] = useState(false);

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
    ticketManagement.fetchTicketByCode
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

      const ticketNumber = generateDailyTicketNumber(ticketManagement.dailyTicketCount);
      const payload: any = {
        clientId: clientId,
        ticket_number: ticketNumber,
        weight_in: weightIn,
        net_weight: weightIn,
        operation_type: newTicket.operationType,
        notes: newTicket.notes || undefined,
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
        notes: newTicket.notes,
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
        notes: '' 
      });
      ticketManagement.setSelectedClient(null);
      setIsAddTicketOpen(false);

      toast({ title: t('common.success'), description: 'تم إنشاء التذكرة بنجاح' });
      
      await ticketManagement.loadRecentTickets(ticketManagement.currentPage);
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
      notes: '',
    });
    ticketManagement.setSelectedClient(null);
  };

  // Handle ticket click to edit
  const handleTicketClick = async (ticket: Ticket) => {
    try {
      ticketManagement.setScannedTicket(ticket);

      ticketManagement.setEditForm({
        weightOut: ticket.weightOut !== undefined ? String(ticket.weightOut) : '',
        numberOfBoxes: ticket.numberOfBoxes ? String(ticket.numberOfBoxes) : '',
        notes: ticket.notes || '',
        taux: '', // Reset taux for each ticket
      });

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
    setIsPrintModalOpen(false);
  };

  // Maximize a ticket
  const maximizeTicket = (ticketId: string) => {
    setMinimizedTickets(prev => 
      prev.map(t => 
        t.id === ticketId ? { ...t, isMaximized: true } : t
      )
    );
    
    // Find and open the ticket
    const ticket = ticketManagement.recentTickets.find(t => t.id === ticketId) || minimizedTickets.find(t => t.id === ticketId);
    if (ticket) {
      handleTicketClick(ticket as Ticket);
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
      
      const payload = {
        weightOut: parseFloat(ticketManagement.editForm.weightOut),
        numberOfBoxes: parseInt(ticketManagement.editForm.numberOfBoxes) || 0,
        notes: ticketManagement.editForm.notes,
        ...(ticketManagement.scannedTicket.operationType === 'sale' && ticketManagement.editForm.taux && {
          taux: parseFloat(ticketManagement.editForm.taux)
        })
      };

      const response = await ticketManagement.updateBatch(ticketManagement.scannedTicket.id, payload);
      
      if (response.success) {
        setIsEditModalOpen(false);
        ticketManagement.loadRecentTickets(); // Refresh the tickets list
        
        // Show print modal for completed ticket
        if (response.data?.status === 'completed') {
          setTicketToPrint(response.data);
          setIsPrintModalOpen(true);
        }
      }
    } catch (error) {
      console.error('Error saving changes:', error);
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
    if (!ticketManagement.scannedTicket || !ticketManagement.editForm.weightOut) return 0;
    const weightOut = parseFloat(ticketManagement.editForm.weightOut) || 0;
    const numberOfBoxes = parseInt(ticketManagement.editForm.numberOfBoxes) || 0;
    return Math.max(0, ticketManagement.scannedTicket.weightIn - weightOut - numberOfBoxes);
  };

  // Calculate edit total amount
  const calculateEditTotalAmount = (operationType?: string) => {
    if (!ticketManagement.currentPrices || !ticketManagement.scannedTicket) return 0;
    
    const netWeight = calculateEditNetWeight();
    if (netWeight <= 0) return 0;

    let unitPrice = 0;
    
    if (operationType === 'sale') {
      // For sale operations, use oil selling price
      if (ticketManagement.editForm.taux) {
        // If taux is provided, calculate oil amount and use oil selling price
        const oilAmount = (netWeight * parseFloat(ticketManagement.editForm.taux)) / 100;
        unitPrice = ticketManagement.currentPrices.oil_client_selling_price_per_kg;
        const totalAmount = oilAmount * unitPrice;
        return Math.max(totalAmount, 40); // Minimum 40 dinars
      } else {
        // Use milling price if no taux provided
        unitPrice = ticketManagement.currentPrices.milling_price_per_kg;
      }
    } else {
      // For milling operations, use milling price
      unitPrice = ticketManagement.currentPrices.milling_price_per_kg;
    }
    
    const totalAmount = netWeight * unitPrice;
    return Math.max(totalAmount, 40); // Minimum 40 dinars
  };

  // Check if minimum price is applied
  const isMinimumPriceApplied = (operationType?: string) => {
    if (!ticketManagement.currentPrices || !ticketManagement.scannedTicket) return false;
    
    const netWeight = calculateEditNetWeight();
    if (netWeight <= 0) return false;

    let unitPrice = 0;
    
    if (operationType === 'sale') {
      if (ticketManagement.editForm.taux) {
        const oilAmount = (netWeight * parseFloat(ticketManagement.editForm.taux)) / 100;
        unitPrice = ticketManagement.currentPrices.oil_client_selling_price_per_kg;
        const calculatedAmount = oilAmount * unitPrice;
        return calculatedAmount < 40;
      } else {
        unitPrice = ticketManagement.currentPrices.milling_price_per_kg;
      }
    } else {
      unitPrice = ticketManagement.currentPrices.milling_price_per_kg;
    }
    
    const calculatedAmount = netWeight * unitPrice;
    return calculatedAmount < 40;
  };

  // Print ticket function
  const printTicket = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow && ticketToPrint) {
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
              @media print { 
                body { 
                  margin: 0; 
                  background: white;
                  color: black;
                }
                .ticket { 
                  border: none; 
                  padding: 10px; 
                  background: white;
                  color: black;
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
              ` : ''}
              
              <div class="footer">
                شكراً لتعاملكم معنا<br>
                تاريخ الطباعة: ${new Date().toLocaleDateString('ar-TN')}
              </div>
            </div>
            
            <script>
              window.onload = function() {
                window.print();
                setTimeout(() => window.close(), 1000);
              }
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
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
    handleShowQrCode,
    minimizeTicket,
    maximizeTicket,
    removeFromMinimized,
    handleSaveChanges,
    loadPressingHistory,
    calculateEditNetWeight,
    calculateEditTotalAmount,
    isMinimumPriceApplied,
    printTicket,
    handleDeleteTicket,
  };
};
