import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { QRCodeSVG } from 'qrcode.react';
import { OliveCard, OliveCardHeader, OliveCardContent, OliveCardTitle } from '@/components/ui/olive-card';
import { OliveButton } from '@/components/ui/olive-button';
import { Input } from '@/components/ui/input';
import { FuzzySearchInput, FuzzySearchHighlighter, SearchStats, useFuzzySearch } from '@/components/ui/fuzzy-search';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/integrations/api/client';
import {
  Plus,
  Search,
  FileText,
  QrCode,
  Calendar,
  User,
  Scale,
  Package,
  Download,
  RefreshCw,
  AlertTriangle,
  UserPlus,
  Edit2,
  Printer,
  DollarSign,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { BatchLoadingHistory } from '@/components/BatchLoadingHistory';

interface Client {
  id: string;
  firstname: string;
  lastname: string;
  email?: string;
  phone?: string;
}

interface Ticket {
  id: string;
  clientId: string;
  clientName: string;
  weightIn: number;
  weightOut?: number;
  netWeight?: number;
  numberOfBoxes: number;
  unitPrice?: number;
  totalAmount?: number;
  isPaid?: boolean;
  paymentMethod?: string;
  paymentReference?: string;
  status: 'draft' | 'confirmed' | 'paid';
  dateReceived: string;
  datePaid?: string;
  createdAt: string;
  boxesLoadedToPressing?: number;
  batchLoadings?: Array<{
    id: number;
    boxesLoaded: number;
    loadedAt: string;
    notes?: string;
    pressingRoom: {
      id: number;
      name: string;
    };
    operator?: {
      id: number;
      username: string;
      firstname?: string;
      lastname?: string;
    };
    pressingSession: {
      id: number;
      start: string;
      finish?: string;
    };
  }>;
}

const mockTickets: Ticket[] = [];

// robust response extractor (works with axios {data} or fetch-like payloads)
const getPayload = <T,>(res: any): T => (res && typeof res === 'object' && 'data' in res ? res.data : res);

export function TicketsPage() {
  const { t } = useTranslation();
  const { toast } = useToast();

  const [tickets, setTickets] = useState<Ticket[]>(mockTickets);
  const [clients, setClients] = useState<Client[]>([]);
  const [loadingClients, setLoadingClients] = useState(false);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [ticketsPerPage] = useState(20);
  const [totalTickets, setTotalTickets] = useState(0);
  const [useLocalFuzzySearch] = useState(true); // Always use smart fuzzy search

  const [isAddTicketOpen, setIsAddTicketOpen] = useState(false);
  const [isAddClientOpen, setIsAddClientOpen] = useState(false);

  const [qrModalTicket, setQrModalTicket] = useState<Ticket | null>(null);
  const [paymentModalTicket, setPaymentModalTicket] = useState<Ticket | null>(null);
  const [editModalTicket, setEditModalTicket] = useState<Ticket | null>(null);
  const [loadingHistoryTicket, setLoadingHistoryTicket] = useState<Ticket | null>(null);

  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [paymentData, setPaymentData] = useState({ method: 'cash', reference: '', amount: '' });

  const [newTicket, setNewTicket] = useState({
    clientId: '',
    weightIn: '',
    weightOut: '',
    numberOfBoxes: '',
    unitPrice: '',
    notes: '',
  });

  const [newClient, setNewClient] = useState({
    firstname: '',
    lastname: '',
    email: '',
    phone: '',
  });

  // ---------- API loads ----------
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

  // IMPORTANT: use /batches instead of /tickets with server-side pagination
  const loadTickets = async (page: number = currentPage, search: string = searchQuery, status: string = statusFilter) => {
    setLoadingTickets(true);
    try {
      // Build query parameters for server-side pagination and filtering
      const params = new URLSearchParams({
        page: page.toString(),
        limit: ticketsPerPage.toString(),
        ...(search && { search, fuzzy: 'true' }), // Enable fuzzy search on server
        ...(status !== 'all' && { status: status === 'draft' ? 'received' : status === 'confirmed' ? 'in_process' : 'completed' })
      });

      const res = await api.get<any>(`/batches?${params.toString()}`);
      const payload = getPayload<any>(res);
      
      // Extract data and pagination info
      const rawList = payload?.batches || payload?.data || payload?.items || payload || [];
      const total = payload?.total || payload?.totalCount || payload?.count || payload?.pagination?.total || rawList.length;
      
      console.log('Server response:', { payload, rawList: rawList.length, total });
      
      const list: Ticket[] = rawList.map((b: any) => {
        const cid = b.client_id ?? b.clientId;
        const clientName =
          b.client_name ||
          (b.client ? `${b.client.firstname || ''} ${b.client.lastname || ''}`.trim() : `#${cid}`);
        const status = b.status === 'received' ? 'draft' : b.status === 'in_process' ? 'confirmed' : 'paid';

        return {
          id: String(b.id),
          clientId: String(cid ?? ''),
          clientName,
          weightIn: b.weight_in ?? 0,
          weightOut: b.weight_out ?? undefined,
          netWeight: b.net_weight ?? undefined,
          numberOfBoxes: b.number_of_boxes ?? 0,
          unitPrice: b.unit_price ?? 0,
          totalAmount: b.total_amount ?? 0,
          isPaid: b.is_paid ?? false,
          paymentMethod: b.payment_method,
          paymentReference: b.payment_reference,
          status,
          dateReceived: b.date_received || b.createdAt,
          datePaid: b.date_paid,
          createdAt: b.createdAt,
          boxesLoadedToPressing: b.boxes_loaded_to_pressing ?? 0,
          batchLoadings: b.batchLoadings || [],
        };
      });

      setTickets(list);
      setTotalTickets(total);
    } catch (e: any) {
      console.error('Error loading tickets:', e);
      toast({ variant: 'destructive', title: t('common.error'), description: e?.message || 'Failed to load tickets' });
    } finally {
      setLoadingTickets(false);
    }
  };

  // Load initial data
  useEffect(() => {
    loadClients();
    loadTickets(1, '', 'all');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load tickets when page changes
  useEffect(() => {
    loadTickets(currentPage, searchQuery, statusFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage]);

  // Debounced search and filter effect - always use local fuzzy search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setCurrentPage(1);
      // We use local fuzzy search only, no server-side search needed
    }, 500); // 500ms debounce for search

    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, statusFilter]);

  // Load all tickets for local fuzzy search
  useEffect(() => {
    if (tickets.length === 0) {
      // Load all tickets for local smart search
      loadTickets(1, '', statusFilter);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------- helpers ----------
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'bg-warning text-warning-foreground';
      case 'confirmed':
        return 'bg-info text-info-foreground';
      case 'paid':
        return 'bg-success text-success-foreground';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  // Treat empty weightOut as 0; never negative
  const calculateNetWeight = () => {
    const weightIn = parseFloat(newTicket.weightIn || '0');
    const weightOut = newTicket.weightOut === '' ? 0 : parseFloat(newTicket.weightOut || '0');
    return Math.max(0, weightIn - weightOut);
  };

  const calculateTotalAmount = () => {
    const netWeight = calculateNetWeight();
    const unitPrice = parseFloat(newTicket.unitPrice || '0');
    return netWeight * unitPrice;
  };

  const handlePrint = (ticketId: string) => {
    const ticket = tickets.find((t) => t.id === ticketId);
    if (!ticket) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const qrData = JSON.stringify({
      id: ticket.id,
      clientName: ticket.clientName,
      weightIn: ticket.weightIn,
      weightOut: ticket.weightOut,
      netWeight: ticket.netWeight,
      numberOfBoxes: ticket.numberOfBoxes,
      dateReceived: ticket.dateReceived,
    });

    printWindow.document.write(`
      <html>
        <head>
          <title>تذكرة #${ticket.id}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; direction: rtl; }
            .ticket { border: 2px solid #333; padding: 20px; margin: 20px 0; }
            .header { text-align: center; border-bottom: 1px solid #333; padding-bottom: 10px; }
            .qr-section { text-align: center; margin: 20px 0; }
            .details { margin: 20px 0; }
            .detail-row { display: flex; justify-content: space-between; margin: 10px 0; }
            .weights { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; margin: 20px 0; }
            .weight-box { text-align: center; border: 1px solid #ccc; padding: 10px; }
          </style>
        </head>
        <body>
          <div class="ticket">
            <div class="header">
              <h2>معصرة الزيتون</h2>
              <h3>تذكرة رقم: #${ticket.id}</h3>
            </div>
            <div class="qr-section">
              <div id="qrcode"></div>
            </div>
            <div class="details">
              <div class="detail-row">
                <strong>اسم العميل:</strong>
                <span>${ticket.clientName}</span>
              </div>
              <div class="detail-row">
                <strong>تاريخ الاستلام:</strong>
                <span>${new Date(ticket.dateReceived).toLocaleDateString('ar-EG')}</span>
              </div>
              <div class="detail-row">
                <strong>عدد الصناديق:</strong>
                <span>${ticket.numberOfBoxes}</span>
              </div>
            </div>
            <div class="weights">
              <div class="weight-box">
                <strong>الوزن الداخل</strong><br>
                <span style="font-size: 1.2em;">${ticket.weightIn} كيلو</span>
              </div>
              ${typeof ticket.weightOut === 'number' ? `
              <div class="weight-box">
                <strong>الوزن الخارج</strong><br>
                <span style="font-size: 1.2em;">${ticket.weightOut} كيلو</span>
              </div>` : ''}
              ${typeof ticket.netWeight === 'number' ? `
              <div class="weight-box">
                <strong>الوزن الصافي</strong><br>
                <span style="font-size: 1.2em; color: #22c55e;">${ticket.netWeight} كيلو</span>
              </div>` : ''}
            </div>
          </div>
          <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js"></script>
          <script>
            const qr = qrcode(0, 'M');
            qr.addData(${JSON.stringify(qrData)});
            qr.make();
            document.getElementById('qrcode').innerHTML = qr.createImgTag(4);
            window.print();
            window.onafterprint = function() { window.close(); };
          </script>
        </body>
      </html>
    `);

    printWindow.document.close();
  };

  const validateClientExists = async (clientId: string): Promise<boolean> => {
    try {
      const response = await api.get(`/clients/${clientId}`);
      return !!response;
    } catch {
      return false;
    }
  };

  // ---------- create ticket (POST /batches) ----------
  const handleAddTicket = async () => {
    // Validation
    if (!newTicket.clientId) {
      toast({ variant: 'destructive', title: t('common.error'), description: 'يرجى اختيار العميل' });
      return;
    }
    if (!newTicket.weightIn || !newTicket.numberOfBoxes) {
      toast({ variant: 'destructive', title: t('common.error'), description: 'يرجى ملء جميع الحقول المطلوبة' });
      return;
    }

    const weightIn = parseFloat(newTicket.weightIn);
    const weightOut = newTicket.weightOut === '' ? 0 : parseFloat(newTicket.weightOut || '0');
    const netWeight = Math.max(0, weightIn - weightOut);
    const numberOfBoxes = parseInt(newTicket.numberOfBoxes, 10);
    const unitPrice = parseFloat(newTicket.unitPrice || '0');
    const totalAmount = +(netWeight * unitPrice).toFixed(2);

    if (isNaN(weightIn) || weightIn <= 0) {
      toast({ variant: 'destructive', title: t('common.error'), description: 'يرجى إدخال وزن صحيح للوزن الداخل' });
      return;
    }
    if (isNaN(numberOfBoxes) || numberOfBoxes <= 0) {
      toast({ variant: 'destructive', title: t('common.error'), description: 'يرجى إدخال عدد صناديق صحيح' });
      return;
    }
    if (isNaN(weightOut) || weightOut < 0) {
      toast({ variant: 'destructive', title: t('common.error'), description: 'يرجى إدخال وزن صحيح للوزن الخارج' });
      return;
    }
    if (weightOut >= weightIn) {
      toast({ variant: 'destructive', title: t('common.error'), description: 'الوزن الخارج يجب أن يكون أقل من الوزن الداخل' });
      return;
    }

    try {
      // Double-check client exists
      const clientExists = await validateClientExists(newTicket.clientId);
      if (!clientExists) {
        toast({
          variant: 'destructive',
          title: t('common.error'),
          description: 'العميل المحدد غير موجود. يرجى تحديث قائمة العملاء وإعادة المحاولة.',
        });
        await loadClients();
        return;
      }

      // Server requires: clientId (camelCase), net_weight, number_of_boxes
      const payload: any = {
          clientId: parseInt(newTicket.clientId, 10),
          weight_in: weightIn,
          weight_out: weightOut || undefined,
          net_weight: netWeight, // Ensure net_weight is calculated
          number_of_boxes: parseInt(newTicket.numberOfBoxes, 10),
          unit_price: parseFloat(newTicket.unitPrice) || 0,
          total_amount: calculateTotalAmount(),
          notes: newTicket.notes || undefined,
        };

  await api.post('/batches', payload);

      // reset & refresh
      setNewTicket({ clientId: '', weightIn: '', weightOut: '', numberOfBoxes: '', unitPrice: '', notes: '' });
      setSelectedClientId('');
      setIsAddTicketOpen(false);
      await loadTickets(currentPage, searchQuery, statusFilter);

      toast({ title: t('common.success'), description: 'تم إنشاء التذكرة بنجاح' });
    } catch (e: any) {
      console.error('Error creating ticket:', e);
      if (e?.message?.includes('foreign key constraint') || e?.message?.includes('batches_clientId_fkey')) {
        toast({
          variant: 'destructive',
          title: 'خطأ في البيانات',
          description: 'العميل المحدد غير موجود في النظام. يرجى اختيار عميل آخر أو إنشاء عميل جديد.',
        });
        await loadClients();
      } else {
        toast({ variant: 'destructive', title: t('common.error'), description: e?.message || 'فشل في إنشاء التذكرة' });
      }
    }
  };

  // ---------- payment ----------
  const handleMarkAsPaid = (ticket: Ticket) => {
    setPaymentModalTicket(ticket);
    setPaymentData({
      method: 'cash',
      reference: '',
      amount: ticket.totalAmount ? Number(ticket.totalAmount).toString() : '0',
    });
  };

  // Delete ticket
  const handleDeleteTicket = async (ticket: Ticket) => {
    if (!confirm(`هل أنت متأكد من حذف التذكرة #${ticket.id}؟ هذا الإجراء لا يمكن التراجع عنه.`)) return;
    try {
      await api.delete(`/batches/${ticket.id}`);
      toast({ title: t('common.success'), description: 'تم حذف التذكرة' });
      await loadTickets(currentPage, searchQuery, statusFilter);
    } catch (error: any) {
      console.error('Error deleting ticket:', error);
      toast({ variant: 'destructive', title: t('common.error'), description: error?.message || 'فشل في حذف التذكرة' });
    }
  };

  // Open edit modal
  const handleEditTicket = (ticket: Ticket) => {
    setEditModalTicket(ticket);
  };

  // Submit edit
  const handleSubmitEdit = async (updates: Partial<Ticket>) => {
    if (!editModalTicket) return;
    try {
      // Map FE fields to backend
      const payload: any = {};
      if (updates.weightIn !== undefined) payload.weight_in = updates.weightIn;
      if (updates.weightOut !== undefined) payload.weight_out = updates.weightOut;
      if (updates.unitPrice !== undefined) payload.unit_price = updates.unitPrice;
      if (updates.numberOfBoxes !== undefined) payload.number_of_boxes = updates.numberOfBoxes;
      // Calculate and include net_weight if both weights are available
      if (updates.weightIn !== undefined || updates.weightOut !== undefined) {
        const weightIn = updates.weightIn ?? editModalTicket.weightIn;
        const weightOut = updates.weightOut ?? editModalTicket.weightOut ?? 0;
        payload.net_weight = Math.max(0, weightIn - weightOut);
      }

      // Calculate total amount if we have net weight and unit price
      const netWeight = payload.net_weight ?? editModalTicket.netWeight;
      const unitPrice = updates.unitPrice ?? editModalTicket.unitPrice;
      if (netWeight !== undefined && unitPrice !== undefined) {
        payload.total_amount = netWeight * unitPrice;
      }

      if (updates.status !== undefined) payload.status = updates.status === 'draft' ? 'received' : updates.status === 'confirmed' ? 'in_process' : 'completed';
      if (updates.isPaid !== undefined) payload.is_paid = updates.isPaid;
      if (updates.paymentMethod !== undefined) payload.payment_method = updates.paymentMethod;

      await api.put(`/batches/${editModalTicket.id}`, payload);
      toast({ title: t('common.success'), description: 'تم تحديث التذكرة' });
      setEditModalTicket(null);
      await loadTickets(currentPage, searchQuery, statusFilter);
    } catch (error: any) {
      console.error('Error updating ticket:', error);
      toast({ variant: 'destructive', title: t('common.error'), description: error?.message || 'فشل في تحديث التذكرة' });
    }
  };

  // PUT /batches/:id
  const handleProcessPayment = async () => {
    if (!paymentModalTicket) return;

    try {
  await api.put(`/batches/${paymentModalTicket.id}`, {
        status: 'paid',
        is_paid: true,
        payment_method: paymentData.method,
        payment_reference: paymentData.reference || undefined,
        date_paid: new Date().toISOString(),
      });

      await loadTickets(currentPage, searchQuery, statusFilter);
      setPaymentModalTicket(null);
      setPaymentData({ method: 'cash', reference: '', amount: '' });

      toast({ title: t('common.success'), description: 'تم تسجيل الدفع بنجاح' });
    } catch (error: any) {
      console.error('Error processing payment:', error);
      toast({
        variant: 'destructive',
        title: t('common.error'),
        description: error?.message || 'فشل في تسجيل الدفع',
      });
    }
  };

  // ---------- client create ----------
  const handleAddClient = async () => {
    if (!newClient.firstname || !newClient.lastname) {
      toast({ variant: 'destructive', title: t('common.error'), description: 'يرجى ملء الاسم الأول والأخير على الأقل' });
      return;
    }

    try {
      const clientData = {
        firstname: newClient.firstname.trim(),
        lastname: newClient.lastname.trim(),
        email: newClient.email.trim() || undefined,
        phone: newClient.phone.trim() || undefined,
      };

      const res = await api.post('/clients', clientData);
      const payload = getPayload<any>(res);
      const createdClient: Client = payload?.client || payload;

      await loadClients();
      setNewClient({ firstname: '', lastname: '', email: '', phone: '' });
      setIsAddClientOpen(false);

      if (createdClient?.id) {
        setSelectedClientId(String(createdClient.id));
        setNewTicket((prev) => ({ ...prev, clientId: String(createdClient.id) }));
      }

      toast({ title: t('common.success'), description: 'تم إنشاء العميل بنجاح' });
    } catch (e: any) {
      console.error('Error creating client:', e);
      toast({ variant: 'destructive', title: t('common.error'), description: e?.message || 'فشل في إنشاء العميل' });
    }
  };

  const handleViewQR = (ticket: Ticket) => setQrModalTicket(ticket);
  const handleViewLoadingHistory = (ticket: Ticket) => setLoadingHistoryTicket(ticket);

  // Correct: QRCodeSVG renders <svg>, not <canvas>
  const downloadQR = (ticket: Ticket) => {
    const svg = document.getElementById(`qr-${ticket.id}`) as unknown as SVGSVGElement | null;
    if (!svg) return;
    const serializer = new XMLSerializer();
    const svgStr = serializer.serializeToString(svg);
    const blob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ticket-${ticket.id}-qr.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const generateQRData = (ticket: Ticket) =>
    JSON.stringify({
      id: ticket.id,
      clientName: ticket.clientName,
      weightIn: ticket.weightIn,
      weightOut: ticket.weightOut,
      netWeight: ticket.netWeight,
      numberOfBoxes: ticket.numberOfBoxes,
      dateReceived: ticket.dateReceived,
      status: ticket.status,
    });

  // Smart fuzzy search functionality - always enabled
  const fuzzySearchResults = useFuzzySearch(
    tickets,
    searchQuery,
    ['clientName', 'id', 'notes'],
    { threshold: 0.4, minSearchLength: 2 }
  );

  // Always use fuzzy search results for smart name matching
  const displayTickets = fuzzySearchResults.results.map(result => result.item);

  // Calculate pagination based on smart search results
  const effectiveTotalTickets = displayTickets.length;
  const totalPages = Math.ceil(effectiveTotalTickets / ticketsPerPage);
  const startIndex = (currentPage - 1) * ticketsPerPage;
  const endIndex = Math.min(startIndex + ticketsPerPage, effectiveTotalTickets);
  
  console.log('Smart search pagination:', { 
    totalTickets, 
    effectiveTotalTickets, 
    ticketsPerPage, 
    totalPages, 
    currentPage,
    searchQuery 
  });

  // Group tickets by date (tickets are already filtered on server)
  const groupTicketsByDate = (tickets: Ticket[]) => {
    const groups: { [key: string]: Ticket[] } = {};
    
    tickets.forEach((ticket) => {
      const date = new Date(ticket.dateReceived);
      const dateKey = date.toLocaleDateString('ar-TN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(ticket);
    });

    // Sort groups by date (newest first)
    const sortedGroups = Object.entries(groups).sort(([a], [b]) => {
      const dateA = new Date(groups[a][0].dateReceived);
      const dateB = new Date(groups[b][0].dateReceived);
      return dateB.getTime() - dateA.getTime();
    });

    return sortedGroups;
  };

  const groupedTickets = groupTicketsByDate(displayTickets);

  const getClientDisplayName = (client: Client): string => {
    const fullName = `${client.firstname} ${client.lastname}`.trim();
    const contact = client.email || client.phone;
    return contact ? `${fullName} (${contact})` : fullName;
  };

  // ---------- render ----------
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-4xl font-bold text-foreground">{t('tickets.title')}</h1>
          <p className="text-lg text-muted-foreground mt-2">إدارة تذاكر المعصرة ومتابعة حالتها</p>
        </div>

        <Dialog open={isAddTicketOpen} onOpenChange={setIsAddTicketOpen}>
          <DialogTrigger asChild>
            <OliveButton size="lg" className="gap-2">
              <Plus className="h-5 w-5" />
              {t('tickets.addTicket')}
            </OliveButton>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>إضافة تذكرة جديدة</DialogTitle>
              <DialogDescription>
                قم بملء البيانات المطلوبة لإنشاء تذكرة جديدة
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* Client */}
              <div className="space-y-2">
                <Label htmlFor="clientSelect">العميل *</Label>
                <div className="flex gap-2">
                  <Select
                    value={selectedClientId}
                    onValueChange={(value) => {
                      setSelectedClientId(value);
                      setNewTicket((prev) => ({ ...prev, clientId: value }));
                    }}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder={loadingClients ? 'جاري التحميل...' : 'اختر العميل'} />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.length === 0 ? (
                        <SelectItem value="no-clients" disabled>
                          {loadingClients ? 'جاري التحميل...' : 'لا يوجد عملاء'}
                        </SelectItem>
                      ) : (
                        clients.map((client) => (
                          <SelectItem key={client.id} value={client.id}>
                            {getClientDisplayName(client)}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>

                  <OliveButton
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={loadClients}
                    disabled={loadingClients}
                    title="تحديث قائمة العملاء"
                  >
                    <RefreshCw className={`h-4 w-4 ${loadingClients ? 'animate-spin' : ''}`} />
                  </OliveButton>

                  <Dialog open={isAddClientOpen} onOpenChange={setIsAddClientOpen}>
                    <DialogTrigger asChild>
                      <OliveButton type="button" variant="outline" size="sm" title="إضافة عميل جديد">
                        <UserPlus className="h-4 w-4" />
                      </OliveButton>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle>إضافة عميل جديد</DialogTitle>
                        <DialogDescription>
                          أدخل بيانات العميل الجديد
                        </DialogDescription>
                      </DialogHeader>

                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="firstname">الاسم الأول *</Label>
                            <Input
                              id="firstname"
                              value={newClient.firstname}
                              onChange={(e) =>
                                setNewClient((prev) => ({ ...prev, firstname: e.target.value }))
                              }
                              placeholder="الاسم الأول"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="lastname">الاسم الأخير *</Label>
                            <Input
                              id="lastname"
                              value={newClient.lastname}
                              onChange={(e) =>
                                setNewClient((prev) => ({ ...prev, lastname: e.target.value }))
                              }
                              placeholder="الاسم الأخير"
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="email">البريد الإلكتروني</Label>
                          <Input
                            id="email"
                            type="email"
                            value={newClient.email}
                            onChange={(e) =>
                              setNewClient((prev) => ({ ...prev, email: e.target.value }))
                            }
                            placeholder="example@email.com"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="phone">رقم الهاتف</Label>
                          <Input
                            id="phone"
                            type="tel"
                            value={newClient.phone}
                            onChange={(e) =>
                              setNewClient((prev) => ({ ...prev, phone: e.target.value }))
                            }
                            placeholder="+966 50 123 4567"
                          />
                        </div>

                        <div className="flex gap-2 pt-4">
                          <OliveButton onClick={handleAddClient} className="flex-1">
                            إضافة العميل
                          </OliveButton>
                          <OliveButton
                            variant="outline"
                            onClick={() => {
                              setIsAddClientOpen(false);
                              setNewClient({ firstname: '', lastname: '', email: '', phone: '' });
                            }}
                            className="flex-1"
                          >
                            إلغاء
                          </OliveButton>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>

                {!selectedClientId && clients.length === 0 && (
                  <div className="flex items-center gap-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
                    <AlertTriangle className="h-4 w-4" />
                    <span>لا يوجد عملاء في النظام. يرجى إضافة عميل أولاً.</span>
                  </div>
                )}
              </div>

              {/* Weights */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="weightIn">الوزن الداخل (كيلو) *</Label>
                  <Input
                    id="weightIn"
                    type="number"
                    step="0.01"
                    min="0"
                    value={newTicket.weightIn}
                    onChange={(e) => setNewTicket((prev) => ({ ...prev, weightIn: e.target.value }))}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="weightOut">الوزن الخارج (كيلو)</Label>
                  <Input
                    id="weightOut"
                    type="number"
                    step="0.01"
                    min="0"
                    value={newTicket.weightOut}
                    onChange={(e) => setNewTicket((prev) => ({ ...prev, weightOut: e.target.value }))}
                    placeholder="0.00"
                  />
                </div>
              </div>

              {(newTicket.weightIn || newTicket.weightOut) && (
                <div className="p-3 bg-muted/50 rounded-lg">
                  <Label className="text-sm font-medium">الوزن الصافي</Label>
                  <div className="text-lg font-bold text-primary">{calculateNetWeight().toFixed(2)} كيلو</div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="numberOfBoxes">عدد الصناديق *</Label>
                  <Input
                    id="numberOfBoxes"
                    type="number"
                    min="1"
                    value={newTicket.numberOfBoxes}
                    onChange={(e) =>
                      setNewTicket((prev) => ({ ...prev, numberOfBoxes: e.target.value }))
                    }
                    placeholder="أدخل عدد الصناديق"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="unitPrice">سعر الكيلو (دينار)</Label>
                  <Input
                    id="unitPrice"
                    type="number"
                    step="0.01"
                    min="0"
                    value={newTicket.unitPrice}
                    onChange={(e) => setNewTicket((prev) => ({ ...prev, unitPrice: e.target.value }))}
                    placeholder="0.00"
                  />
                </div>
              </div>

              {(newTicket.weightIn || newTicket.weightOut) &&
                newTicket.unitPrice &&
                parseFloat(newTicket.unitPrice || '0') > 0 && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <Label className="text-sm font-medium text-green-800">المبلغ الإجمالي</Label>
                    <div className="text-xl font-bold text-green-600">{calculateTotalAmount().toFixed(2)} دينار</div>
                    <p className="text-xs text-green-600 mt-1">
                      {calculateNetWeight().toFixed(2)} كيلو × {parseFloat(newTicket.unitPrice || '0').toFixed(2)} دينار
                    </p>
                  </div>
                )}

              <div className="space-y-2">
                <Label htmlFor="notes">ملاحظات (اختياري)</Label>
                <Textarea
                  id="notes"
                  value={newTicket.notes}
                  onChange={(e) => setNewTicket((prev) => ({ ...prev, notes: e.target.value }))}
                  placeholder="أدخل أي ملاحظات"
                />
              </div>

              <div className="flex gap-2 pt-4">
                <OliveButton
                  onClick={handleAddTicket}
                  className="flex-1"
                  disabled={!selectedClientId || clients.length === 0}
                >
                  إضافة التذكرة
                </OliveButton>
                <OliveButton
                  variant="outline"
                  onClick={() => {
                    setIsAddTicketOpen(false);
                    setNewTicket({
                      clientId: '',
                      weightIn: '',
                      weightOut: '',
                      numberOfBoxes: '',
                      unitPrice: '',
                      notes: '',
                    });
                    setSelectedClientId('');
                  }}
                  className="flex-1"
                >
                  إلغاء
                </OliveButton>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <OliveCard>
        <OliveCardContent className="p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <div className="flex-1">
              <FuzzySearchInput
                placeholder="البحث الذكي برقم التذكرة أو اسم العميل... (يدعم البحث التقريبي وتبديل الأسماء)"
                value={searchQuery}
                onChange={setSearchQuery}
                className="w-full"
                showClearButton={true}
              />
              <SearchStats
                totalResults={displayTickets.length}
                searchQuery={searchQuery}
                hasSearch={!!searchQuery && searchQuery.length >= 2}
                className="mt-2"
              />
              {searchQuery && searchQuery.length >= 2 && (
                <div className="mt-2 text-xs text-muted-foreground">
                  💡 البحث الذكي يدعم: أسماء العملاء، أرقام التذاكر، والملاحظات. يتعامل مع الأخطاء الإملائية والبحث التقريبي وتبديل الأسماء.
                </div>
              )}
            </div>
            <div className="flex gap-2 flex-wrap">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="جميع الحالات" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الحالات</SelectItem>
                  <SelectItem value="draft">{t('tickets.draft')}</SelectItem>
                  <SelectItem value="confirmed">{t('tickets.confirmed')}</SelectItem>
                  <SelectItem value="paid">{t('tickets.paid')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </OliveCardContent>
      </OliveCard>

      {/* Payment Modal */}
      <Dialog open={!!paymentModalTicket} onOpenChange={() => setPaymentModalTicket(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>تسجيل الدفع للتذكرة #{paymentModalTicket?.id}</DialogTitle>
            <DialogDescription>
              قم بتأكيد تفاصيل الدفع للتذكرة
            </DialogDescription>
          </DialogHeader>

          {paymentModalTicket && (
            <div className="space-y-4">
              <div className="p-4 bg-muted/50 rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-muted-foreground">العميل:</span>
                  <span className="font-medium">{paymentModalTicket.clientName}</span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-muted-foreground">الوزن الصافي:</span>
                  <span className="font-medium">{paymentModalTicket.netWeight} كيلو</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">المبلغ المطلوب:</span>
                  <span className="text-lg font-bold text-primary">
                    {paymentModalTicket.totalAmount ? Number(paymentModalTicket.totalAmount).toFixed(2) : '0.00'} دينار
                  </span>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="paymentMethod">طريقة الدفع</Label>
                  <Select
                    value={paymentData.method}
                    onValueChange={(value) => setPaymentData((prev) => ({ ...prev, method: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="اختر الطريقة" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">نقدي</SelectItem>
                      <SelectItem value="card">بطاقة ائتمانية</SelectItem>
                      <SelectItem value="bank_transfer">حوالة بنكية</SelectItem>
                      <SelectItem value="check">شيك</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="paymentReference">مرجع الدفع (اختياري)</Label>
                  <Input
                    id="paymentReference"
                    value={paymentData.reference}
                    onChange={(e) =>
                      setPaymentData((prev) => ({ ...prev, reference: e.target.value }))
                    }
                    placeholder="رقم المعاملة أو المرجع"
                  />
                </div>

                <div className="flex gap-2 pt-4">
                  <OliveButton onClick={handleProcessPayment} className="flex-1">
                    تأكيد الدفع
                  </OliveButton>
                  <OliveButton
                    variant="outline"
                    onClick={() => {
                      setPaymentModalTicket(null);
                      setPaymentData({ method: 'cash', reference: '', amount: '' });
                    }}
                    className="flex-1"
                  >
                    إلغاء
                  </OliveButton>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* QR Modal */}
      <Dialog open={!!qrModalTicket} onOpenChange={() => setQrModalTicket(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>رمز QR للتذكرة #{qrModalTicket?.id}</DialogTitle>
            <DialogDescription>
              استخدم هذا الرمز لمسح التذكرة
            </DialogDescription>
          </DialogHeader>

          {qrModalTicket && (
            <div className="flex flex-col items-center space-y-4">
              <div className="p-4 bg-white rounded-lg">
                <QRCodeSVG
                  id={`qr-${qrModalTicket.id}`}
                  value={generateQRData(qrModalTicket)}
                  size={200}
                  level="M"
                  includeMargin
                />
              </div>
              <div className="text-center space-y-2">
                <p className="text-sm text-muted-foreground">العميل: {qrModalTicket.clientName}</p>
                <p className="text-sm text-muted-foreground">الوزن الصافي: {qrModalTicket.netWeight} كيلو</p>
              </div>
              <OliveButton onClick={() => downloadQR(qrModalTicket)} className="gap-2">
                <Download className="h-4 w-4" />
                تحميل رمز QR
              </OliveButton>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Tickets List */}
      {loadingTickets ? (
        <OliveCard>
          <OliveCardContent className="flex flex-col items-center justify-center py-12">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mb-4"></div>
            <p className="text-muted-foreground">جاري تحميل التذاكر...</p>
          </OliveCardContent>
        </OliveCard>
      ) : totalTickets === 0 ? (
        <OliveCard>
          <OliveCardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">{t('tickets.noTickets')}</h3>
            <p className="text-muted-foreground mb-6 text-center">ابدأ بإنشاء تذاكر جديدة لتتبع معاملاتك</p>
            <OliveButton className="gap-2" onClick={() => setIsAddTicketOpen(true)}>
              <Plus className="h-5 w-5" />
              إنشاء أول تذكرة
            </OliveButton>
          </OliveCardContent>
        </OliveCard>
      ) : (
        <div className="space-y-6">
          {/* Tickets Header */}
          <OliveCard>
            <OliveCardHeader>
              <OliveCardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  جميع التذاكر
                  <span className="text-sm font-normal text-muted-foreground">
                    ({totalTickets} تذكرة)
                  </span>
                </div>
                <div className="text-sm text-muted-foreground">
                  الصفحة {currentPage} من {totalPages} - عرض {startIndex + 1}-{endIndex} من {effectiveTotalTickets}
                  <span className="text-xs text-muted-foreground ml-2">(بحث ذكي)</span>
                </div>
              </OliveCardTitle>
            </OliveCardHeader>
          </OliveCard>

          {/* Grouped Tickets */}
          {groupedTickets.length === 0 ? (
            <OliveCard>
              <OliveCardContent className="text-center py-8">
                <p className="text-muted-foreground">لا توجد تذاكر في هذه الصفحة</p>
              </OliveCardContent>
            </OliveCard>
          ) : (
            groupedTickets.map(([dateKey, ticketsInGroup]) => (
              <OliveCard key={dateKey}>
                <OliveCardHeader>
                  <OliveCardTitle className="flex items-center gap-2 text-lg">
                    <Calendar className="h-5 w-5" />
                    {dateKey}
                    <span className="text-sm font-normal text-muted-foreground">
                      ({ticketsInGroup.length} تذكرة)
                    </span>
                  </OliveCardTitle>
                </OliveCardHeader>
                <OliveCardContent>
                  <div className="space-y-4">
                    {ticketsInGroup.map((ticket) => (
                      <div
                        key={ticket.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-4 flex-1">
                          <div className="flex-shrink-0">
                            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                              <span className="text-sm font-semibold text-primary">
                                <FuzzySearchHighlighter
                                  text={`#${ticket.id}`}
                                  searchWords={fuzzySearchResults.searchWords}
                                  highlightClassName="bg-yellow-300 text-yellow-900 px-1 rounded"
                                />
                              </span>
                            </div>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-medium text-foreground">
                                <FuzzySearchHighlighter
                                  text={ticket.clientName}
                                  searchWords={fuzzySearchResults.searchWords}
                                  highlightClassName="bg-yellow-200 text-yellow-900 px-1 rounded font-semibold"
                                />
                              </h3>
                              <span
                                className={`text-xs px-2 py-1 rounded-full ${getStatusColor(ticket.status)}`}
                              >
                                {t(`tickets.${ticket.status}`)}
                              </span>
                              {ticket.isPaid ? (
                                <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-800">
                                  مدفوع
                                </span>
                              ) : ticket.totalAmount && Number(ticket.totalAmount) > 0 ? (
                                <span className="text-xs px-2 py-1 rounded-full bg-red-100 text-red-800">
                                  مستحق الدفع
                                </span>
                              ) : null}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              الوزن الداخل: {ticket.weightIn} كيلو • 
                              {typeof ticket.netWeight === 'number' && ` الوزن الصافي: ${ticket.netWeight} كيلو • `}
                              عدد الصناديق: {ticket.numberOfBoxes} • 
                              {new Date(ticket.dateReceived).toLocaleTimeString('ar-TN', { 
                                hour: '2-digit', 
                                minute: '2-digit' 
                              })}
                            </div>
                            {ticket.totalAmount && Number(ticket.totalAmount) > 0 && (
                              <div className="text-sm font-medium text-primary">
                                المبلغ الإجمالي: {Number(ticket.totalAmount).toFixed(2)} د.ت
                                {ticket.isPaid && ticket.paymentMethod && (
                                  <span className="ml-2 text-xs text-muted-foreground">
                                    • {ticket.paymentMethod === 'cash'
                                      ? 'نقدي'
                                      : ticket.paymentMethod === 'card'
                                      ? 'بطاقة'
                                      : ticket.paymentMethod === 'bank_transfer'
                                      ? 'حوالة'
                                      : ticket.paymentMethod === 'check'
                                      ? 'شيك'
                                      : ticket.paymentMethod}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 flex-wrap">
                          {/* Payment Button - Show if ticket has amount and is not paid */}
                          {!ticket.isPaid && ticket.totalAmount && Number(ticket.totalAmount) > 0 && (
                            <OliveButton
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMarkAsPaid(ticket);
                              }}
                              title="تسجيل الدفع"
                              className="text-green-600 hover:text-green-700 hover:bg-green-50"
                            >
                              <DollarSign className="h-4 w-4" />
                            </OliveButton>
                          )}
                          
                          {/* Loading History Button */}
                          {ticket.batchLoadings && ticket.batchLoadings.length > 0 && (
                            <OliveButton
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleViewLoadingHistory(ticket);
                              }}
                              title="عرض تاريخ تحميل الصناديق"
                            >
                              <Package className="h-4 w-4" />
                            </OliveButton>
                          )}
                          
                          <OliveButton
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewQR(ticket);
                            }}
                            title="عرض رمز QR"
                          >
                            <QrCode className="h-4 w-4" />
                          </OliveButton>
                          <OliveButton
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePrint(ticket.id);
                            }}
                            title="طباعة التذكرة"
                          >
                            <Printer className="h-4 w-4" />
                          </OliveButton>
                          <OliveButton
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditTicket(ticket);
                            }}
                            title="تعديل التذكرة"
                          >
                            <Edit2 className="h-4 w-4" />
                          </OliveButton>
                          <OliveButton
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteTicket(ticket);
                            }}
                            title="حذف التذكرة"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <AlertTriangle className="h-4 w-4" />
                          </OliveButton>
                        </div>
                      </div>
                    ))}
                  </div>
                </OliveCardContent>
              </OliveCard>
            ))
          )}

          {/* Enhanced Pagination */}
          {totalTickets > 0 && (
            <OliveCard>
              <OliveCardHeader>
                <OliveCardTitle className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span>عرض {startIndex + 1}-{endIndex} من أصل {effectiveTotalTickets} تذكرة</span>
                    <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">بحث ذكي</span>
                  </div>
                  <div className="text-muted-foreground">
                    الصفحة {currentPage} من {totalPages}
                  </div>
                </OliveCardTitle>
              </OliveCardHeader>
              <OliveCardContent className="flex items-center justify-between py-4">
                {/* First Page and Previous */}
                <div className="flex items-center gap-2">
                  <OliveButton
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                    className="gap-1"
                  >
                    الأولى
                  </OliveButton>
                  <OliveButton
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="gap-1"
                  >
                    <ChevronRight className="h-4 w-4" />
                    السابق
                  </OliveButton>
                </div>
                
                {/* Page Numbers */}
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 7) {
                      pageNum = i + 1;
                    } else if (currentPage <= 4) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 3) {
                      pageNum = totalPages - 6 + i;
                    } else {
                      pageNum = currentPage - 3 + i;
                    }
                    
                    return (
                      <OliveButton
                        key={pageNum}
                        variant={currentPage === pageNum ? "primary" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(pageNum)}
                        className={`min-w-[40px] ${currentPage === pageNum ? 'font-bold' : ''}`}
                      >
                        {pageNum}
                      </OliveButton>
                    );
                  })}
                  
                  {/* Show ellipsis if there are more pages */}
                  {totalPages > 7 && currentPage < totalPages - 3 && (
                    <>
                      <span className="px-2 text-muted-foreground">...</span>
                      <OliveButton
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(totalPages)}
                        className="min-w-[40px]"
                      >
                        {totalPages}
                      </OliveButton>
                    </>
                  )}
                </div>
                
                {/* Next and Last Page */}
                <div className="flex items-center gap-2">
                  <OliveButton
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="gap-1"
                  >
                    التالي
                    <ChevronLeft className="h-4 w-4" />
                  </OliveButton>
                  <OliveButton
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                    className="gap-1"
                  >
                    الأخيرة
                  </OliveButton>
                </div>
              </OliveCardContent>
            </OliveCard>
          )}
        </div>
      )}

      {/* Edit Modal */}
      <Dialog open={!!editModalTicket} onOpenChange={() => setEditModalTicket(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>تعديل التذكرة #{editModalTicket?.id}</DialogTitle>
            <DialogDescription>
              قم بتعديل بيانات التذكرة
            </DialogDescription>
          </DialogHeader>

          {editModalTicket && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>الوزن الداخل (كيلو)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={String(editModalTicket.weightIn)}
                    onChange={(e) => setEditModalTicket((prev) => (prev ? { ...prev, weightIn: parseFloat(e.target.value) || 0 } : prev))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>الوزن الخارج (كيلو)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={String(editModalTicket.weightOut ?? '')}
                    onChange={(e) => setEditModalTicket((prev) => (prev ? { ...prev, weightOut: e.target.value === '' ? undefined : parseFloat(e.target.value) } : prev))}
                  />
                </div>
              </div>

              {/* Show calculated net weight and total amount */}
              {editModalTicket.weightIn && (
                <>
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <Label className="text-sm font-medium">الوزن الصافي</Label>
                    <div className="text-lg font-bold text-primary">
                      {(editModalTicket.weightIn - (editModalTicket.weightOut || 0)).toFixed(2)} كيلو
                    </div>
                  </div>
                  {editModalTicket.unitPrice && (
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <Label className="text-sm font-medium">المبلغ الإجمالي</Label>
                      <div className="text-lg font-bold text-primary">
                        {((editModalTicket.weightIn - (editModalTicket.weightOut || 0)) * editModalTicket.unitPrice).toFixed(3)} د.ت
                      </div>
                    </div>
                  )}
                </>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>سعر الكيلو</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={String(editModalTicket.unitPrice ?? '')}
                    onChange={(e) => setEditModalTicket((prev) => (prev ? { ...prev, unitPrice: e.target.value === '' ? undefined : parseFloat(e.target.value) } : prev))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>عدد الصناديق</Label>
                  <Input
                    type="number"
                    value={String(editModalTicket.numberOfBoxes)}
                    onChange={(e) => setEditModalTicket((prev) => (prev ? { ...prev, numberOfBoxes: parseInt(e.target.value || '0', 10) } : prev))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>الحالة</Label>
                <Select value={editModalTicket.status} onValueChange={(v) => setEditModalTicket((prev) => (prev ? { ...prev, status: v as any } : prev))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">{t('tickets.draft')}</SelectItem>
                    <SelectItem value="confirmed">{t('tickets.confirmed')}</SelectItem>
                    <SelectItem value="paid">{t('tickets.paid')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2 pt-4">
                <OliveButton onClick={() => handleSubmitEdit(editModalTicket)} className="flex-1">حفظ</OliveButton>
                <OliveButton variant="outline" onClick={() => setEditModalTicket(null)} className="flex-1">إلغاء</OliveButton>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Loading History Dialog */}
      <Dialog open={!!loadingHistoryTicket} onOpenChange={() => setLoadingHistoryTicket(null)}>
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>تاريخ تحميل الصناديق - التذكرة #{loadingHistoryTicket?.id}</DialogTitle>
            <DialogDescription>
              عرض تفصيلي لعمليات تحميل الصناديق إلى غرف العصر
            </DialogDescription>
          </DialogHeader>
          
          {loadingHistoryTicket && (
            <div className="space-y-4">
              {/* Summary */}
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-muted-foreground">إجمالي الصناديق</p>
                  <p className="text-2xl font-bold text-blue-600">{loadingHistoryTicket.numberOfBoxes}</p>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <p className="text-sm text-muted-foreground">الصناديق المحملة</p>
                  <p className="text-2xl font-bold text-green-600">{loadingHistoryTicket.boxesLoadedToPressing || 0}</p>
                </div>
                <div className="text-center p-3 bg-orange-50 rounded-lg">
                  <p className="text-sm text-muted-foreground">المتبقي</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {loadingHistoryTicket.numberOfBoxes - (loadingHistoryTicket.boxesLoadedToPressing || 0)}
                  </p>
                </div>
              </div>

              {/* Loading History */}
              <BatchLoadingHistory 
                batchId={loadingHistoryTicket.id}
                loadings={loadingHistoryTicket.batchLoadings || []}
                totalBoxes={loadingHistoryTicket.numberOfBoxes}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}