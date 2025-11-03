import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/integrations/api/client';
import { 
  Client, 
  Ticket, 
  ScannedTicket, 
  NewTicketForm, 
  EditTicketForm, 
  MinimizedTicket 
} from '@/types/daily-work';
import { 
  getPayload, 
  generateQRCode, 
  generateDailyTicketNumber, 
  loadDailyTicketCount,
  updateBatch,
  deleteBatch
} from './utils';

export const useTicketManagement = () => {
  const { toast } = useToast();
  const ticketsPerPage = 5;

  // State for ticket creation
  const [clients, setClients] = useState<Client[]>([]);
  const [loadingClients, setLoadingClients] = useState(false);
  const [searchResults, setSearchResults] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  // State for recent tickets
  const [recentTickets, setRecentTickets] = useState<Ticket[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalTickets, setTotalTickets] = useState(0);

  // State for prices
  const [currentPrices, setCurrentPrices] = useState<any>(null);
  const [loadingPrices, setLoadingPrices] = useState(false);

  // QR Scan state
  const [scannedTicket, setScannedTicket] = useState<ScannedTicket | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Daily ticket counter
  const [dailyTicketCount, setDailyTicketCount] = useState(0);

  // Forms
  const [editForm, setEditForm] = useState<EditTicketForm>({
    weightOut: '',
    numberOfBoxes: '',
    notes: '',
    taux: '',
  });

  const [newTicket, setNewTicket] = useState<NewTicketForm>({
    firstname: '',
    lastname: '',
    weightIn: '',
    operationType: 'milling',
    notes: '',
  });

  // Load clients from API
  const loadClients = async () => {
    setLoadingClients(true);
    try {
      const res = await api.get<any>('/clients');
      const payload = getPayload<any>(res);
      const clientsList = payload?.clients || payload || [];
      setClients(clientsList);

      if (clientsList.length === 0) {
        toast({
          variant: 'destructive',
          title: 'تنبيه',
          description: 'لا يوجد عملاء في النظام. يرجى إضافة عميل أولاً.',
        });
      }
    } catch (error: any) {
      console.error('Error loading clients:', error);
      toast({
        variant: 'destructive',
        title: 'خطأ',
        description: 'فشل في تحميل قائمة العملاء: ' + (error?.message || 'خطأ غير معروف'),
      });
    } finally {
      setLoadingClients(false);
    }
  };

  // Load recent tickets from API
  const loadRecentTickets = async (page: number = 1) => {
    setLoadingTickets(true);
    try {
      const res = await api.get<any>(`/batches?page=${page}&limit=${ticketsPerPage}`);
      const payload = getPayload<any>(res);
      
      const tickets = payload?.batches || payload || [];
      
      console.log('📊 API Response - Tickets order:');
      tickets.forEach((ticket: any, index: number) => {
        console.log(`${index + 1}. ID: ${ticket.id}, ticket_number: ${ticket.ticket_number}, date: ${ticket.date_received}`);
      });
      
      // Enhance tickets with QR codes
      const ticketsWithQR = await Promise.all(
        tickets.map(async (ticket: any) => {
          const qrCode = await generateQRCode({
            id: ticket.id,
            ticketNumber: ticket.ticket_number || generateDailyTicketNumber(dailyTicketCount),
            clientName: ticket.client ? `${ticket.client.firstname} ${ticket.client.lastname}` : `عميل #${ticket.clientId}`,
            weightIn: ticket.weight_in,
            dateReceived: ticket.date_received
          });
          
          return {
            id: String(ticket.id),
            ticketNumber: ticket.ticket_number || generateDailyTicketNumber(dailyTicketCount),
            clientId: String(ticket.clientId),
            clientName: ticket.client ? `${ticket.client.firstname} ${ticket.client.lastname}` : `عميل #${ticket.clientId}`,
            weightIn: ticket.weight_in ?? 0,
            weightOut: ticket.weight_out ?? undefined,
            netWeight: ticket.net_weight ?? undefined,
            numberOfBoxes: ticket.number_of_boxes ?? 0,
            unitPrice: ticket.unit_price ?? 0,
            totalAmount: ticket.total_amount ?? undefined,
            isPaid: ticket.is_paid ?? false,
            paymentMethod: ticket.payment_method ?? undefined,
            paymentReference: ticket.payment_reference ?? undefined,
            datePaid: ticket.date_paid ?? undefined,
            dateReceived: ticket.date_received || ticket.createdAt || new Date().toISOString(),
            status: ticket.status || 'received',
            operationType: ticket.operation_type || 'milling',
            notes: ticket.notes || '',
            qrCode: qrCode
          };
        })
      );
      
      setRecentTickets(ticketsWithQR);
      setTotalPages(payload?.pagination?.pages || 1);
      setTotalTickets(payload?.pagination?.total || 0);
      setCurrentPage(page);
    } catch (error: any) {
      console.error('Error loading tickets:', error);
      toast({
        variant: 'destructive',
        title: 'خطأ',
        description: 'فشل في تحميل التذاكر الحديثة: ' + (error?.message || 'خطأ غير معروف'),
      });
    } finally {
      setLoadingTickets(false);
    }
  };

  // Load current prices from API
  const loadCurrentPrices = async () => {
    setLoadingPrices(true);
    try {
      const response = await api.get('/prices?latest=true');
      
      if (response && typeof response === 'object' && response !== null) {
        setCurrentPrices(response);
      } else {
        setCurrentPrices(null);
      }
    } catch (error: any) {
      console.error('Error loading prices:', error);
      setCurrentPrices(null);
    } finally {
      setLoadingPrices(false);
    }
  };

  // Fetch ticket by code from API
  const fetchTicketByCode = async (code: string | number): Promise<ScannedTicket> => {
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

      const qrCode = await generateQRCode({
        id: data.id,
        ticketNumber: data.ticket_number || generateDailyTicketNumber(dailyTicketCount),
        clientName: data.client ? `${data.client.firstname} ${data.client.lastname}` : `عميل #${data.clientId}`,
        weightIn: data.weight_in,
        dateReceived: data.date_received
      });

      const ticket: ScannedTicket = {
        id: String(data.id),
        ticketNumber: data.ticket_number || generateDailyTicketNumber(dailyTicketCount),
        clientId: String(data.clientId),
        clientName: data.client
          ? `${data.client.firstname || ''} ${data.client.lastname || ''}`.trim() || `#${data.clientId}`
          : `#${data.clientId}`,
        weightIn: data.weight_in ?? 0,
        weightOut: data.weight_out ?? undefined,
        netWeight: data.net_weight ?? undefined,
        numberOfBoxes: data.number_of_boxes ?? 0,
        unitPrice: data.unit_price ?? 0,
        totalAmount: data.total_amount ?? undefined,
        dateReceived: data.date_received || data.createdAt || new Date().toISOString(),
        status: data.status || 'received',
        operationType: data.operation_type || 'milling',
        notes: data.notes || '',
        qrCode: qrCode
      };

      return ticket;
    } catch (e: any) {
      const errorMessage = e?.response?.status === 404 
        ? 'التذكرة غير موجودة في النظام'
        : e?.message || 'فشل جلب التذكرة';
      
      toast({ 
        variant: 'destructive', 
        title: 'خطأ', 
        description: errorMessage 
      });
      throw new Error(errorMessage);
    }
  };

  // Delete a ticket
  const deleteTicket = async (id: string) => {
    try {
      await deleteBatch(id);
      
      // Remove from recent tickets list
      setRecentTickets(prev => prev.filter(ticket => ticket.id !== id));
      
      // Update total count
      setTotalTickets(prev => Math.max(0, prev - 1));
      
      // Recalculate total pages
      const newTotalPages = Math.max(1, Math.ceil((totalTickets - 1) / ticketsPerPage));
      setTotalPages(newTotalPages);
      
      // Adjust current page if necessary
      if (currentPage > newTotalPages) {
        setCurrentPage(newTotalPages);
      }
      
      toast({
        title: 'تم الحذف',
        description: 'تم حذف التذكرة بنجاح',
      });
      
      // Reload tickets to ensure consistency
      await loadRecentTickets(currentPage);
      
    } catch (error: any) {
      console.error('Error deleting ticket:', error);
      toast({
        variant: 'destructive',
        title: 'خطأ في الحذف',
        description: error?.message || 'فشل في حذف التذكرة',
      });
      throw error;
    }
  };

  // Load everything on component mount
  const initializeData = async () => {
    await Promise.all([
      loadClients(),
      loadRecentTickets(),
      loadCurrentPrices(),
      loadDailyTicketCount().then(setDailyTicketCount)
    ]);
  };

  // Search clients based on firstname and lastname
  useEffect(() => {
    if (newTicket.firstname.trim() || newTicket.lastname.trim()) {
      const filtered = clients.filter((client) => {
        const firstnameMatch = client.firstname.toLowerCase().includes(newTicket.firstname.toLowerCase());
        const lastnameMatch = client.lastname.toLowerCase().includes(newTicket.lastname.toLowerCase());
        return firstnameMatch && lastnameMatch;
      });
      setSearchResults(filtered);
      
      const exactMatch = filtered.find((client) => 
        client.firstname.toLowerCase() === newTicket.firstname.toLowerCase() &&
        client.lastname.toLowerCase() === newTicket.lastname.toLowerCase()
      );
      if (exactMatch) {
        setSelectedClient(exactMatch);
      } else {
        setSelectedClient(null);
      }
    } else {
      setSearchResults([]);
      setSelectedClient(null);
    }
  }, [newTicket.firstname, newTicket.lastname, clients]);

  return {
    // State
    clients,
    loadingClients,
    searchResults,
    selectedClient,
    recentTickets,
    loadingTickets,
    currentPage,
    totalPages,
    totalTickets,
    currentPrices,
    loadingPrices,
    scannedTicket,
    isSaving,
    dailyTicketCount,
    editForm,
    newTicket,
    ticketsPerPage,

    // Setters
    setClients,
    setSearchResults,
    setSelectedClient,
    setRecentTickets,
    setCurrentPage,
    setScannedTicket,
    setIsSaving,
    setDailyTicketCount,
    setEditForm,
    setNewTicket,

    // Functions
    loadClients,
    loadRecentTickets,
    loadCurrentPrices,
    fetchTicketByCode,
    initializeData,
    updateBatch,
    deleteTicket
  };
};
