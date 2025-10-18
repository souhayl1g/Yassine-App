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
      console.log('Creating ticket with operation type:', newTicket.operationType);
      const payload: any = {
        clientId: clientId,
        ticket_number: ticketNumber,
        weight_in: weightIn,
        net_weight: weightIn,
        operation_type: newTicket.operationType,
        notes: newTicket.notes || undefined,
        status: 'received',
      };
      console.log('Ticket payload:', payload);

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
    try {
      setLoadingPressingHistory(true);
      // TODO: Implement API call to get pressing history
      // const history = await api.getPressingHistory(ticketId);
      // setPressingHistory(history);
      setPressingHistory([]); // Placeholder
    } catch (error) {
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
    if (!ticketToPrint) return;
    // TODO: Implement actual printing logic
    console.log('Printing ticket:', ticketToPrint);
    window.print();
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
  };
};
