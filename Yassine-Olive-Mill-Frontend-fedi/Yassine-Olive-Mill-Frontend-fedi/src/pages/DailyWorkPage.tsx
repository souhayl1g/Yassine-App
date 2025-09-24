import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { OliveCard, OliveCardHeader, OliveCardContent, OliveCardTitle } from '@/components/ui/olive-card';
import { OliveButton } from '@/components/ui/olive-button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  FileText, 
  Users, 
  QrCode, 
  Scale, 
  Box, 
  Building2,
  Plus,
  Activity,
  TrendingUp,
  Coffee,
  Clock,
  RefreshCw,
  AlertTriangle,
  UserPlus,
  X
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getCurrentDayInfo, formatDayTime, formatDayDate, getDayStatusText } from '@/lib/daySystem';
import { api } from '@/integrations/api/client';
import { useToast } from '@/hooks/use-toast';
import QrScanner from 'qr-scanner';

interface Client {
  id: string;
  firstname: string;
  lastname: string;
  email?: string;
  phone?: string;
}

interface ScannedTicket {
  id: string;
  clientId: string;
  clientName: string;
  weightIn: number;
  weightOut?: number;
  netWeight?: number;
  numberOfBoxes: number;
  unitPrice?: number;
  totalAmount?: number;
  dateReceived: string;
  status: string;
}

export function DailyWorkPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const dayInfo = getCurrentDayInfo();
  const { toast } = useToast();

  // State for ticket creation
  const [clients, setClients] = useState<Client[]>([]);
  const [loadingClients, setLoadingClients] = useState(false);
  const [isAddTicketOpen, setIsAddTicketOpen] = useState(false);
  const [isQrScanOpen, setIsQrScanOpen] = useState(false);
  const [searchResults, setSearchResults] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  // State for recent tickets
  const [recentTickets, setRecentTickets] = useState<any[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalTickets, setTotalTickets] = useState(0);
  const ticketsPerPage = 5;

  // State for prices
  const [currentPrices, setCurrentPrices] = useState<any>(null);
  const [loadingPrices, setLoadingPrices] = useState(false);

  // QR Scan state
  const [scannedTicket, setScannedTicket] = useState<ScannedTicket | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    weightOut: '',
    numberOfBoxes: '',
    notes: '',
  });

  const [newTicket, setNewTicket] = useState({
    firstname: '',
    lastname: '',
    weightIn: '',
    notes: '',
  });

  // Helper function to extract payload from API responses
  const getPayload = <T,>(res: any): T => (res && typeof res === 'object' && 'data' in res ? res.data : res);

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
      
      setRecentTickets(payload?.batches || payload || []);
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
      
      // Handle the response data properly
      if (response && typeof response === 'object' && response !== null) {
        setCurrentPrices(response);
      } else {
        // If no response or null, set to null
        setCurrentPrices(null);
      }
    } catch (error: any) {
      console.error('Error loading prices:', error);
      setCurrentPrices(null);
      // Don't show error toast for prices as it's not critical for daily operations
    } finally {
      setLoadingPrices(false);
    }
  };

  // Load clients, tickets, and prices on component mount
  useEffect(() => {
    loadClients();
    loadRecentTickets();
    loadCurrentPrices();
  }, []);

  // Search clients based on firstname and lastname
  useEffect(() => {
    if (newTicket.firstname.trim() || newTicket.lastname.trim()) {
      const filtered = clients.filter((client) => {
        const firstnameMatch = client.firstname.toLowerCase().includes(newTicket.firstname.toLowerCase());
        const lastnameMatch = client.lastname.toLowerCase().includes(newTicket.lastname.toLowerCase());
        return firstnameMatch && lastnameMatch;
      });
      setSearchResults(filtered);
      
      // Auto-select if exact match found
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

  // Calculate net weight - simplified for weight in only
  const calculateNetWeight = () => {
    const weightIn = parseFloat(newTicket.weightIn || '0');
    return weightIn; // For now, net weight equals weight in
  };



  // Handle QR scan for completion
  const handleQRScan = async (file: File) => {
    try {
      const result = await QrScanner.scanImage(file);
      if (result) {
        // Try to parse QR code data
        let qrData;
        try {
          qrData = JSON.parse(result);
        } catch {
          // If not JSON, assume it's a ticket ID
          qrData = { id: result };
        }

        // Fetch ticket by ID
        const ticket = await fetchTicketByCode(qrData.id);
        setScannedTicket(ticket);

        setEditForm({
          weightOut: ticket.weightOut !== undefined ? String(ticket.weightOut) : '',
          numberOfBoxes: ticket.numberOfBoxes ? String(ticket.numberOfBoxes) : '',
          notes: '',
        });

        setIsEditModalOpen(true);
        setIsQrScanOpen(false);
        toast({ title: t('common.success'), description: 'تم مسح رمز QR بنجاح' });
      } else {
        toast({ variant: 'destructive', title: t('common.error'), description: 'لم يتم التعرف على رمز QR' });
      }
    } catch (error: any) {
      console.error('QR scan error:', error);
      toast({ variant: 'destructive', title: t('common.error'), description: 'فشل قراءة رمز QR' });
    }
  };

  // Fetch ticket by code from API
  const fetchTicketByCode = async (code: string): Promise<ScannedTicket> => {
    // Extract numeric id from something like TKT00123 -> 123
    const num = parseInt(code.replace(/\D+/g, ''), 10);
    const idOrCode = isNaN(num) ? code : String(num);

    try {
      const res = await api.get<any>(`/batches/${idOrCode}`);
      const data = getPayload<any>(res);

      const ticket: ScannedTicket = {
        id: String(data.id),
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
      };

      return ticket;
    } catch (e: any) {
      toast({ variant: 'destructive', title: t('common.error'), description: e?.message || 'فشل جلب التذكرة' });
      throw e;
    }
  };

  // Update batch via API
  const updateBatch = async (id: string, payload: any) => {
    const attempts: Array<() => Promise<any>> = [
      () => api.put(`/batches/${id}`, payload),
      () => api.post(`/batches/${id}`, { ...payload, _method: 'PUT' }),
      () => api.post(`/batches/update/${id}`, payload),
      () => api.post(`/batches/${id}/update`, payload),
    ];

    let lastErr: any;
    for (const tryCall of attempts) {
      try {
        const r = await tryCall();
        return r;
      } catch (err: any) {
        lastErr = err;
        const msg = (err?.message || '').toLowerCase();
        if (!(msg.includes('404') || msg.includes('405') || msg.includes('not found') || msg.includes('method'))) {
          throw err;
        }
      }
    }
    throw lastErr;
  };

  // Handle save changes from edit modal
  const handleSaveChanges = async () => {
    if (!scannedTicket) return;

    const weightOut = editForm.weightOut === '' ? undefined : parseFloat(editForm.weightOut);
    const numberOfBoxes = Math.max(0, parseInt(editForm.numberOfBoxes || '0', 10));
    const unitPrice = currentPrices?.milling_price_per_kg || 0;

    if (weightOut !== undefined && weightOut >= scannedTicket.weightIn) {
      toast({ variant: 'destructive', title: t('common.error'), description: 'الوزن الخارج يجب أن يكون أقل من الوزن الداخل' });
      return;
    }

    if (unitPrice <= 0) {
      toast({ variant: 'destructive', title: t('common.error'), description: 'لا يوجد سعر محدد في النظام. يرجى تحديد الأسعار في صفحة الإعدادات.' });
      return;
    }

    const netWeight = weightOut === undefined ? scannedTicket.weightIn : Math.max(0, scannedTicket.weightIn - weightOut);
    const totalAmount = +(netWeight * unitPrice).toFixed(2);

    const payload: any = {
      clientId: scannedTicket.clientId,
      weight_in: Math.round(scannedTicket.weightIn),
      weight_out: weightOut !== undefined ? Math.round(weightOut) : undefined,
      net_weight: Math.round(netWeight),
      number_of_boxes: numberOfBoxes,
      unit_price: unitPrice,
      total_amount: totalAmount,
      status: 'in_process',
    };

    setIsSaving(true);
    try {
      await updateBatch(scannedTicket.id, payload);

      // Update local state
      const updated: ScannedTicket = {
        ...scannedTicket,
        weightOut: weightOut,
        netWeight: netWeight,
        numberOfBoxes: numberOfBoxes,
        unitPrice: unitPrice,
        totalAmount: totalAmount,
        status: 'in_process',
      };
      setScannedTicket(updated);
      setIsEditModalOpen(false);

      toast({ title: t('common.success'), description: 'تم تحديث التذكرة بنجاح' });
      
      // Reload recent tickets to reflect changes
      await loadRecentTickets(currentPage);
    } catch (e: any) {
      console.error('Update failed:', e);
      toast({
        variant: 'destructive',
        title: 'خطأ',
        description: e?.message || 'فشل في تحديث التذكرة',
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Calculate net weight from edit form
  const calculateEditNetWeight = () => {
    if (!scannedTicket) return 0;
    const weightOut = editForm.weightOut === '' ? 0 : parseFloat(editForm.weightOut || '0');
    return Math.max(0, scannedTicket.weightIn - weightOut);
  };

  // Calculate total amount from edit form using backend price
  const calculateEditTotalAmount = () => {
    const netWeight = calculateEditNetWeight();
    const unitPrice = currentPrices?.milling_price_per_kg || 0;
    return netWeight * unitPrice;
  };

  // Validate client exists
  const validateClientExists = async (clientId: string): Promise<boolean> => {
    try {
      const response = await api.get(`/clients/${clientId}`);
      return !!response;
    } catch {
      return false;
    }
  };

  // Handle add ticket
  const handleAddTicket = async () => {
    // Validation
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

      // Check if we have a selected existing client
      if (selectedClient) {
        clientId = parseInt(selectedClient.id, 10);
      } else {
        // Create new client
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
        
        // Refresh clients list
        await loadClients();
      }

      const payload: any = {
        clientId: clientId,
        weight_in: weightIn,
        net_weight: weightIn, // Initial net weight equals weight in
        notes: newTicket.notes || undefined,
      };

      await api.post('/batches', payload);

      // Reset form
      setNewTicket({ 
        firstname: '', 
        lastname: '', 
        weightIn: '', 
        notes: '' 
      });
      setSelectedClient(null);
      setIsAddTicketOpen(false);

      toast({ title: t('common.success'), description: 'تم إنشاء التذكرة بنجاح' });
      
      // Reload recent tickets
      await loadRecentTickets(currentPage);
    } catch (e: any) {
      console.error('Error creating ticket:', e);
      toast({ variant: 'destructive', title: t('common.error'), description: e?.message || 'فشل في إنشاء التذكرة' });
    }
  };

  // Handle ticket click to edit
  const handleTicketClick = async (ticket: any) => {
    try {
      // Convert ticket data to ScannedTicket format
      const scannedTicketData: ScannedTicket = {
        id: String(ticket.id),
        clientId: String(ticket.clientId),
        clientName: ticket.client 
          ? `${ticket.client.firstname} ${ticket.client.lastname}` 
          : `عميل #${ticket.clientId}`,
        weightIn: ticket.weight_in ?? 0,
        weightOut: ticket.weight_out ?? undefined,
        netWeight: ticket.net_weight ?? undefined,
        numberOfBoxes: ticket.number_of_boxes ?? 0,
        unitPrice: ticket.unit_price ?? 0,
        totalAmount: ticket.total_amount ?? undefined,
        dateReceived: ticket.date_received || ticket.createdAt || new Date().toISOString(),
        status: ticket.status || 'received',
      };

      setScannedTicket(scannedTicketData);

      setEditForm({
        weightOut: scannedTicketData.weightOut !== undefined ? String(scannedTicketData.weightOut) : '',
        numberOfBoxes: scannedTicketData.numberOfBoxes ? String(scannedTicketData.numberOfBoxes) : '',
        notes: '',
      });

      setIsEditModalOpen(true);
    } catch (error: any) {
      console.error('Error opening ticket:', error);
      toast({ variant: 'destructive', title: t('common.error'), description: 'فشل في فتح التذكرة' });
    }
  };

  // Get client display name
  const getClientDisplayName = (client: Client): string => {
    const fullName = `${client.firstname} ${client.lastname}`.trim();
    const contact = client.email || client.phone;
    return contact ? `${fullName} (${contact})` : fullName;
  };

  return (
    <>
      <div className="space-y-8">
        {/* Page Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-4xl font-bold text-foreground">
              {t('dailyWork.title')}
            </h1>
            <p className="text-lg text-muted-foreground mt-2">
              {t('dailyWork.subtitle')}
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-primary">
              {formatDayTime(new Date())}
            </div>
            <div className="text-sm text-muted-foreground">
              {formatDayDate(new Date())}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {getDayStatusText()} • {Math.round(dayInfo.dayProgress)}% {t('dailyWork.ofTheDay')}
            </div>
          </div>
        </div>

      {/* Start Operations - Ticket Creation */}
      <div className="flex justify-center">
        <Dialog open={isAddTicketOpen} onOpenChange={setIsAddTicketOpen}>
          <DialogTrigger asChild>
            <OliveButton 
              size="lg" 
              className="gap-3 px-8 py-4 text-lg"
            >
              <Plus className="h-6 w-6" />
              {t('dailyWork.startOperations')}
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
              {/* Client Name Search/Create */}
              <div className="space-y-2">
                <Label>بيانات العميل *</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstname">الاسم الأول *</Label>
                    <Input
                      id="firstname"
                      value={newTicket.firstname}
                      onChange={(e) => setNewTicket((prev) => ({ ...prev, firstname: e.target.value }))}
                      placeholder="الاسم الأول"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastname">الاسم الأخير *</Label>
                    <Input
                      id="lastname"
                      value={newTicket.lastname}
                      onChange={(e) => setNewTicket((prev) => ({ ...prev, lastname: e.target.value }))}
                      placeholder="الاسم الأخير"
                    />
                  </div>
                </div>

                {/* Show search results */}
                {searchResults.length > 0 && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <Label className="text-sm font-medium text-blue-800">عملاء موجودون:</Label>
                    <div className="space-y-1 mt-2">
                      {searchResults.map((client) => (
                        <div
                          key={client.id}
                          className={`p-2 rounded cursor-pointer text-sm ${
                            selectedClient?.id === client.id 
                              ? 'bg-blue-200 text-blue-900' 
                              : 'bg-blue-100 text-blue-800 hover:bg-blue-150'
                          }`}
                          onClick={() => {
                            setSelectedClient(client);
                            setNewTicket(prev => ({
                              ...prev,
                              firstname: client.firstname,
                              lastname: client.lastname
                            }));
                          }}
                        >
                          {getClientDisplayName(client)}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Show selected client or new client message */}
                {selectedClient ? (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-sm text-green-800">عميل موجود: {getClientDisplayName(selectedClient)}</span>
                    </div>
                  </div>
                ) : (newTicket.firstname || newTicket.lastname) ? (
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                      <span className="text-sm text-yellow-800">عميل جديد سيتم إنشاؤه</span>
                    </div>
                  </div>
                ) : null}
              </div>

              {/* Weight In */}
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
                  disabled={!newTicket.firstname || !newTicket.lastname}
                >
                  إضافة التذكرة
                </OliveButton>
                <OliveButton
                  variant="outline"
                  onClick={() => {
                    setIsAddTicketOpen(false);
                    setNewTicket({
                      firstname: '',
                      lastname: '',
                      weightIn: '',
                      notes: '',
                    });
                    setSelectedClient(null);
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

      {/* QR Code Scan for Completion */}
      <div className="flex justify-center">
        <Dialog open={isQrScanOpen} onOpenChange={setIsQrScanOpen}>
          <DialogTrigger asChild>
            <OliveButton 
              variant="outline"
              size="lg" 
              className="gap-3 px-8 py-4 text-lg"
            >
              <QrCode className="h-6 w-6" />
              مسح QR لإكمال التذكرة
            </OliveButton>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>مسح رمز QR لإكمال التذكرة</DialogTitle>
              <DialogDescription>
                ارفع صورة رمز QR أو اسحب الملف هنا لإكمال معالجة التذكرة
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
                <QrCode className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-sm text-muted-foreground mb-4">
                  اختر ملف صورة QR أو اسحبه هنا
                </p>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      handleQRScan(file);
                    }
                  }}
                  className="w-full"
                />
              </div>

              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>ملاحظة:</strong> رمز QR يجب أن يحتوي على معرف التذكرة والوزن الخارج وعدد الصناديق لإكمال المعالجة.
                </p>
              </div>

              <div className="flex gap-2 pt-4">
                <OliveButton
                  variant="outline"
                  onClick={() => setIsQrScanOpen(false)}
                  className="flex-1"
                >
                  إغلاق
                </OliveButton>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Recent Tickets Section */}
      <div className="max-w-4xl mx-auto">
        <OliveCard>
          <OliveCardHeader>
            <OliveCardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              التذاكر الحديثة
              {totalTickets > 0 && (
                <span className="text-sm font-normal text-muted-foreground">
                  ({totalTickets} تذكرة)
                </span>
              )}
            </OliveCardTitle>
          </OliveCardHeader>
          <OliveCardContent>
            {loadingTickets ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                <span className="mr-2 text-muted-foreground">جاري التحميل...</span>
              </div>
            ) : recentTickets.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">لا توجد تذاكر حتى الآن</p>
                <p className="text-sm text-muted-foreground mt-1">ابدأ بإنشاء أول تذكرة</p>
              </div>
            ) : (
              <div className="space-y-4">
                {recentTickets.map((ticket) => (
                  <div
                    key={ticket.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => handleTicketClick(ticket)}
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
                        <span className="text-sm font-bold text-primary">#{ticket.id}</span>
                      </div>
                      <div>
                        <h4 className="font-semibold">
                          {ticket.client 
                            ? `${ticket.client.firstname} ${ticket.client.lastname}` 
                            : `عميل #${ticket.clientId}`
                          }
                        </h4>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Scale className="h-3 w-3" />
                            {ticket.weight_in} كيلو
                          </span>
                          {ticket.number_of_boxes > 0 && (
                            <span className="flex items-center gap-1">
                              <Box className="h-3 w-3" />
                              {ticket.number_of_boxes} صندوق
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {new Date(ticket.date_received || ticket.createdAt).toLocaleDateString('ar-TN')}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className={`px-2 py-1 rounded text-xs font-medium ${
                        ticket.status === 'received' 
                          ? 'bg-yellow-100 text-yellow-800' 
                          : ticket.status === 'in_process'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {ticket.status === 'received' ? 'مستلم' : 
                         ticket.status === 'in_process' ? 'قيد المعالجة' : 'مكتمل'}
                      </div>
                      {ticket.total_amount && (
                        <div className="text-right">
                          <div className="font-semibold text-primary">
                            {ticket.total_amount.toFixed(2)} دينار
                          </div>
                          {ticket.net_weight && ticket.unit_price && (
                            <div className="text-xs text-muted-foreground">
                              {ticket.net_weight} × {ticket.unit_price}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-6 pt-4 border-t">
                <div className="text-sm text-muted-foreground">
                  الصفحة {currentPage} من {totalPages}
                </div>
                <div className="flex items-center gap-2">
                  <OliveButton
                    variant="outline"
                    size="sm"
                    onClick={() => loadRecentTickets(currentPage - 1)}
                    disabled={currentPage === 1 || loadingTickets}
                  >
                    السابق
                  </OliveButton>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      const pageNum = i + 1;
                      return (
                        <OliveButton
                          key={pageNum}
                          variant={currentPage === pageNum ? "primary" : "outline"}
                          size="sm"
                          onClick={() => loadRecentTickets(pageNum)}
                          disabled={loadingTickets}
                          className="w-8 h-8 p-0"
                        >
                          {pageNum}
                        </OliveButton>
                      );
                    })}
                  </div>
                  <OliveButton
                    variant="outline"
                    size="sm"
                    onClick={() => loadRecentTickets(currentPage + 1)}
                    disabled={currentPage === totalPages || loadingTickets}
                  >
                    التالي
                  </OliveButton>
                </div>
              </div>
            )}
          </OliveCardContent>
        </OliveCard>
      </div>
    </div>

    {/* Edit Modal for QR Scanned Ticket */}
    {isEditModalOpen && scannedTicket && (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-900 rounded-lg p-8 w-full max-w-lg shadow-lg relative">
          <button 
            className="absolute top-2 right-2 text-gray-500 hover:text-gray-700" 
            onClick={() => setIsEditModalOpen(false)}
          >
            <X className="h-5 w-5" />
          </button>

          <h2 className="text-2xl font-bold mb-4 text-primary">إكمال معالجة التذكرة</h2>

          {/* Static ticket info */}
          <div className="space-y-2 mb-4 text-sm bg-muted/20 p-3 rounded-lg">
            <div>رقم التذكرة: <span className="font-semibold">#{scannedTicket.id}</span></div>
            <div>اسم العميل: <span className="font-semibold">{scannedTicket.clientName}</span></div>
            <div>الوزن الداخل: <span className="font-semibold">{scannedTicket.weightIn} كيلو</span></div>
            <div>تاريخ الاستلام: <span className="font-semibold">
              {new Date(scannedTicket.dateReceived).toLocaleDateString('ar-TN')}
            </span></div>
          </div>

          {/* Editable fields */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <label className="text-sm">
              <span className="block mb-1">الوزن الخارج (كيلو)</span>
              <Input
                type="number"
                step="0.01"
                value={editForm.weightOut}
                onChange={(e) => setEditForm((p) => ({ ...p, weightOut: e.target.value }))}
                placeholder="أدخل الوزن الخارج"
                className="w-full"
              />
            </label>
            <label className="text-sm">
              <span className="block mb-1">عدد الصناديق</span>
              <Input
                type="number"
                min="0"
                value={editForm.numberOfBoxes}
                onChange={(e) => setEditForm((p) => ({ ...p, numberOfBoxes: e.target.value }))}
                placeholder="عدد الصناديق"
                className="w-full"
              />
            </label>
          </div>

          {/* Display current pricing information */}
          <div className="mb-4">
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="text-sm font-medium text-blue-800 mb-2">السعر المستخدم للحساب:</div>
              {loadingPrices ? (
                <div className="flex items-center text-blue-700">
                  <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                  جاري تحميل الأسعار...
                </div>
              ) : currentPrices && currentPrices.milling_price_per_kg > 0 ? (
                <div className="text-lg font-bold text-blue-700">
                  سعر العصر: {currentPrices.milling_price_per_kg} دينار/كيلو
                </div>
              ) : (
                <div className="text-red-700">
                  لا توجد أسعار محددة في النظام. يرجى تحديد الأسعار في صفحة الإعدادات.
                </div>
              )}
            </div>
          </div>

          {/* Calculated values */}
          {editForm.weightOut && (
            <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
              <div className="p-3 rounded bg-blue-50 border border-blue-200">
                <div className="text-blue-800 font-medium">الوزن الصافي</div>
                <div className="text-lg font-bold text-blue-600">
                  {calculateEditNetWeight().toFixed(2)} كيلو
                </div>
              </div>
              <div className="p-3 rounded bg-green-50 border border-green-200">
                <div className="text-green-800 font-medium">المبلغ الإجمالي</div>
                <div className="text-lg font-bold text-green-600">
                  {calculateEditTotalAmount().toFixed(2)} دينار
                </div>
              </div>
            </div>
          )}

          <div className="mb-6">
            <label className="text-sm">
              <span className="block mb-1">ملاحظات (اختياري)</span>
              <Textarea
                value={editForm.notes}
                onChange={(e) => setEditForm((p) => ({ ...p, notes: e.target.value }))}
                placeholder="أدخل أي ملاحظات إضافية"
                className="w-full"
              />
            </label>
          </div>

          <div className="flex gap-2">
            <OliveButton 
              onClick={handleSaveChanges} 
              disabled={isSaving || !editForm.weightOut || !editForm.numberOfBoxes} 
              className="flex-1"
            >
              {isSaving ? 'جارٍ الحفظ...' : 'حفظ التغييرات'}
            </OliveButton>
            <OliveButton 
              variant="outline" 
              onClick={() => setIsEditModalOpen(false)}
              className="flex-1"
            >
              إلغاء
            </OliveButton>
          </div>
        </div>
      </div>
    )}
    </>
  );
}