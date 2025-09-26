import React, { useEffect, useState, useRef } from 'react';
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
  X,
  Edit,
  Trash2,
  Printer,
  Download,
  Minimize2,
  Maximize2,
  Camera
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getCurrentDayInfo, formatDayTime, formatDayDate, getDayStatusText } from '@/lib/daySystem';
import { api } from '@/integrations/api/client';
import { useToast } from '@/hooks/use-toast';
import QrScanner from 'qr-scanner';
import QRCode from 'qrcode';

interface Client {
  id: string;
  firstname: string;
  lastname: string;
  email?: string;
  phone?: string;
}

interface Ticket {
  id: string;
  ticketNumber: string;
  clientId: string;
  clientName: string;
  weightIn: number;
  weightOut?: number;
  netWeight?: number;
  numberOfBoxes: number;
  unitPrice?: number;
  totalAmount?: number;
  dateReceived: string;
  status: 'received' | 'in_process' | 'completed';
  notes?: string;
  qrCode?: string;
}

interface ScannedTicket extends Ticket {}

interface MinimizedTicket {
  id: string;
  ticketNumber: string;
  clientName: string;
  weightIn: number;
  isMaximized: boolean;
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
  const [recentTickets, setRecentTickets] = useState<Ticket[]>([]);
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
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [ticketToPrint, setTicketToPrint] = useState<Ticket | null>(null);
  const [isQrDisplayOpen, setIsQrDisplayOpen] = useState(false);
  const [qrCodeImage, setQrCodeImage] = useState<string>('');

  // Camera QR scanning state
  const [isCameraScanOpen, setIsCameraScanOpen] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const qrScannerRef = useRef<QrScanner | null>(null);

  // Minimized tickets state - now on left side
  const [minimizedTickets, setMinimizedTickets] = useState<MinimizedTicket[]>([]);

  // Daily ticket counter
  const [dailyTicketCount, setDailyTicketCount] = useState(0);

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

  // Generate daily ticket number (reset each day, starting from 1)
  const generateDailyTicketNumber = () => {
    const today = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD
    const count = dailyTicketCount + 1;
    setDailyTicketCount(count);
    return `${today.replace(/-/g, '/')}/${count.toString().padStart(3, '0')}`;
  };

  // Load daily ticket count from localStorage or API
  const loadDailyTicketCount = async () => {
    const today = new Date().toLocaleDateString('en-CA');
    
    try {
      // Try to get today's tickets count from API
      const res = await api.get<any>(`/batches?date=${today}`);
      const payload = getPayload<any>(res);
      const todayTickets = payload?.batches || payload || [];
      setDailyTicketCount(todayTickets.length);
    } catch (error) {
      // Fallback to localStorage
      const stored = localStorage.getItem(`dailyTicketCount_${today}`);
      if (stored) {
        setDailyTicketCount(parseInt(stored, 10));
      } else {
        setDailyTicketCount(0);
      }
    }
  };

  // Generate QR code for ticket
  const generateQRCode = async (ticketData: any): Promise<string> => {
    try {
      const qrData = JSON.stringify({
        ticketId: ticketData.id,
        ticketNumber: ticketData.ticketNumber,
        clientName: ticketData.clientName,
        weightIn: ticketData.weightIn,
        dateReceived: ticketData.dateReceived
      });
      
      return await QRCode.toDataURL(qrData, {
        width: 200,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
    } catch (error) {
      console.error('Error generating QR code:', error);
      return '';
    }
  };

  // Initialize camera for QR scanning
  const initializeCamera = async () => {
    if (!videoRef.current) return;

    try {
      // Check if camera is available
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      // Initialize QR scanner
      qrScannerRef.current = new QrScanner(
        videoRef.current,
        (result) => {
          handleQRResult(result.data);
        },
        {
          highlightScanRegion: true,
          highlightCodeOutline: true,
        }
      );

      await qrScannerRef.current.start();
      setIsCameraActive(true);
    } catch (error) {
      console.error('Error accessing camera:', error);
      toast({
        variant: 'destructive',
        title: 'خطأ',
        description: 'لا يمكن الوصول إلى الكاميرا. يرجى التحقق من الأذونات.',
      });
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
        // If parsing fails, check if the result is a number or string
        const directId = parseInt(result, 10);
        qrData = { id: isNaN(directId) ? result : directId };
      }

      const ticketId = qrData.id || qrData.ticketId;
      if (!ticketId) {
        throw new Error('لم يتم العثور على معرف التذكرة في رمز QR');
      }

      const ticket = await fetchTicketByCode(ticketId);
      setScannedTicket(ticket);

      // Check if this ticket is minimized and maximize it
      const minimizedIndex = minimizedTickets.findIndex(t => t.id === ticket.id);
      if (minimizedIndex !== -1) {
        const updatedMinimizedTickets = [...minimizedTickets];
        updatedMinimizedTickets[minimizedIndex] = {
          ...updatedMinimizedTickets[minimizedIndex],
          isMaximized: true
        };
        setMinimizedTickets(updatedMinimizedTickets);
      }

      setEditForm({
        weightOut: ticket.weightOut !== undefined ? String(ticket.weightOut) : '',
        numberOfBoxes: ticket.numberOfBoxes ? String(ticket.numberOfBoxes) : '',
        notes: ticket.notes || '',
      });

      setIsEditModalOpen(true);
      setIsCameraScanOpen(false);
      stopCamera();
      
      toast({ title: t('common.success'), description: 'تم مسح رمز QR بنجاح' });
    } catch (error: any) {
      console.error('QR scan error:', error);
      toast({ variant: 'destructive', title: t('common.error'), description: 'فشل قراءة رمز QR' });
    }
  };

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
      // Enhance tickets with QR codes
      const ticketsWithQR = await Promise.all(
        tickets.map(async (ticket: any) => {
          const qrCode = await generateQRCode({
            id: ticket.id,
            ticketNumber: ticket.ticket_number || generateDailyTicketNumber(),
            clientName: ticket.client ? `${ticket.client.firstname} ${ticket.client.lastname}` : `عميل #${ticket.clientId}`,
            weightIn: ticket.weight_in,
            dateReceived: ticket.date_received
          });
          
          return {
            id: String(ticket.id),
            ticketNumber: ticket.ticket_number || generateDailyTicketNumber(),
            clientId: String(ticket.clientId),
            clientName: ticket.client ? `${ticket.client.firstname} ${ticket.client.lastname}` : `عميل #${ticket.clientId}`,
            weightIn: ticket.weight_in ?? 0,
            weightOut: ticket.weight_out ?? undefined,
            netWeight: ticket.net_weight ?? undefined,
            numberOfBoxes: ticket.number_of_boxes ?? 0,
            unitPrice: ticket.unit_price ?? 0,
            totalAmount: ticket.total_amount ?? undefined,
            dateReceived: ticket.date_received || ticket.createdAt || new Date().toISOString(),
            status: ticket.status || 'received',
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

  // Load everything on component mount
  useEffect(() => {
    loadClients();
    loadRecentTickets();
    loadCurrentPrices();
    loadDailyTicketCount();
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

  // Handle QR scan for completion (file upload)
  const handleQRScan = async (file: File) => {
    try {
      const result = await QrScanner.scanImage(file);
      if (result) {
        await handleQRResult(result);
      } else {
        toast({ variant: 'destructive', title: t('common.error'), description: 'لم يتم التعرف على رمز QR' });
      }
    } catch (error: any) {
      console.error('QR scan error:', error);
      toast({ variant: 'destructive', title: t('common.error'), description: 'فشل قراءة رمز QR' });
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
        ticketNumber: data.ticket_number || generateDailyTicketNumber(),
        clientName: data.client ? `${data.client.firstname} ${data.client.lastname}` : `عميل #${data.clientId}`,
        weightIn: data.weight_in,
        dateReceived: data.date_received
      });

      const ticket: ScannedTicket = {
        id: String(data.id),
        ticketNumber: data.ticket_number || generateDailyTicketNumber(),
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

    if (unitPrice <= 0) {
      toast({ variant: 'destructive', title: t('common.error'), description: 'لا يوجد سعر محدد في النظام. يرجى تحديد الأسعار في صفحة الإعدادات.' });
      return;
    }

    const netWeight = weightOut === undefined ? scannedTicket.weightIn : Math.max(0, scannedTicket.weightIn - weightOut);
    // Calculate total amount with minimum price of 40 DT
    const calculatedAmount = netWeight * unitPrice;
    const totalAmount = Math.max(40, +calculatedAmount.toFixed(2));

    const payload: any = {
      clientId: scannedTicket.clientId,
      weight_in: Math.round(scannedTicket.weightIn),
      weight_out: weightOut !== undefined ? Math.round(weightOut) : undefined,
      net_weight: Math.round(netWeight),
      number_of_boxes: numberOfBoxes,
      unit_price: unitPrice,
      total_amount: totalAmount,
      status: weightOut !== undefined ? 'completed' : 'in_process',
      notes: editForm.notes || undefined,
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
        status: weightOut !== undefined ? 'completed' : 'in_process',
        notes: editForm.notes,
      };
      setScannedTicket(updated);
      setIsEditModalOpen(false);

      // Remove from minimized tickets if completed
      if (weightOut !== undefined) {
        setMinimizedTickets(prev => prev.filter(t => t.id !== scannedTicket.id));
        
        // Show print modal for completed ticket
        setTicketToPrint(updated);
        setIsPrintModalOpen(true);
      }

      toast({ title: t('common.success'), description: 'تم تحديث التذكرة بنجاح' });
      
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

  // Handle delete ticket
  const handleDeleteTicket = async (ticketId: string) => {
    if (!confirm('هل أنت متأكد من حذف هذه التذكرة؟ لا يمكن التراجع عن هذا الإجراء.')) {
      return;
    }

    try {
      await api.delete(`/batches/${ticketId}`);
      // Also remove from minimized tickets if exists
      setMinimizedTickets(prev => prev.filter(t => t.id !== ticketId));
      toast({ title: t('common.success'), description: 'تم حذف التذكرة بنجاح' });
      await loadRecentTickets(currentPage);
    } catch (error: any) {
      console.error('Error deleting ticket:', error);
      toast({
        variant: 'destructive',
        title: 'خطأ',
        description: 'فشل في حذف التذكرة: ' + (error?.message || 'خطأ غير معروف'),
      });
    }
  };

  // Handle add ticket
  const handleAddTicket = async () => {
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
        await loadClients();
      }

      const ticketNumber = generateDailyTicketNumber();
      const payload: any = {
        clientId: clientId,
        ticket_number: ticketNumber,
        weight_in: weightIn,
        net_weight: weightIn,
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
      setNewTicket({ 
        firstname: '', 
        lastname: '', 
        weightIn: '', 
        notes: '' 
      });
      setSelectedClient(null);
      setIsAddTicketOpen(false);

      toast({ title: t('common.success'), description: 'تم إنشاء التذكرة بنجاح' });
      
      await loadRecentTickets(currentPage);
    } catch (e: any) {
      console.error('Error creating ticket:', e);
      toast({ variant: 'destructive', title: t('common.error'), description: e?.message || 'فشل في إنشاء التذكرة' });
    }
  };

  // Handle ticket click to edit
  const handleTicketClick = async (ticket: Ticket) => {
    try {
      setScannedTicket(ticket);

      setEditForm({
        weightOut: ticket.weightOut !== undefined ? String(ticket.weightOut) : '',
        numberOfBoxes: ticket.numberOfBoxes ? String(ticket.numberOfBoxes) : '',
        notes: ticket.notes || '',
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

  // Print the ticket with dark mode support
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
    const ticket = recentTickets.find(t => t.id === ticketId) || minimizedTickets.find(t => t.id === ticketId);
    if (ticket) {
      handleTicketClick(ticket as Ticket);
    }
  };

  // Remove from minimized
  const removeFromMinimized = (ticketId: string) => {
    setMinimizedTickets(prev => prev.filter(t => t.id !== ticketId));
  };

  // Calculate net weight from edit form
  const calculateEditNetWeight = () => {
    if (!scannedTicket) return 0;
    const weightOut = editForm.weightOut === '' ? 0 : parseFloat(editForm.weightOut || '0');
    return Math.max(0, scannedTicket.weightIn - weightOut);
  };

  // Calculate total amount from edit form
  const calculateEditTotalAmount = () => {
    const netWeight = calculateEditNetWeight();
    const unitPrice = currentPrices?.milling_price_per_kg || 0;
    const calculatedAmount = netWeight * unitPrice;
    return Math.max(40, +calculatedAmount.toFixed(2));
  };

  const isMinimumPriceApplied = () => {
    const netWeight = calculateEditNetWeight();
    const unitPrice = currentPrices?.milling_price_per_kg || 0;
    return (netWeight * unitPrice) < 40;
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
            <div className="text-xs text-muted-foreground mt-1">
              تذاكر اليوم: {dailyTicketCount}
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
                    حفظ التذكرة
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

                <div className="flex gap-2">
                  <OliveButton
                    onClick={() => {
                      setIsQrScanOpen(false);
                      setIsCameraScanOpen(true);
                    }}
                    className="flex-1"
                  >
                    <Camera className="h-4 w-4 mr-2" />
                    فتح الكاميرا
                  </OliveButton>
                  <OliveButton
                    variant="outline"
                    onClick={() => setIsQrScanOpen(false)}
                    className="flex-1"
                  >
                    إغلاق
                  </OliveButton>
                </div>

                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>ملاحظة:</strong> رمز QR يجب أن يحتوي على معرف التذكرة والوزن الخارج وعدد الصناديق لإكمال المعالجة.
                  </p>
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
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div 
                        className="flex items-center gap-4 flex-1 cursor-pointer"
                        onClick={() => handleTicketClick(ticket)}
                      >
                        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 flex-shrink-0">
                          <span className="text-xs font-bold text-primary text-center leading-tight">
                            #{ticket.ticketNumber.split('/').pop()}
                          </span>
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold">{ticket.clientName}</h4>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Scale className="h-3 w-3" />
                              {ticket.weightIn} كيلو
                            </span>
                            {ticket.numberOfBoxes > 0 && (
                              <span className="flex items-center gap-1">
                                <Box className="h-3 w-3" />
                                {ticket.numberOfBoxes} صندوق
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {new Date(ticket.dateReceived).toLocaleDateString('ar-TN')}
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
                        {ticket.totalAmount && (
                          <div className="text-right">
                            <div className="font-semibold text-primary">
                              {ticket.totalAmount.toFixed(2)} دينار
                            </div>
                            {ticket.netWeight && ticket.unitPrice && (
                              <div className="text-xs text-muted-foreground">
                                {ticket.netWeight} × {ticket.unitPrice}
                              </div>
                            )}
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <OliveButton
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleShowQrCode(ticket);
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
                              handlePrintTicket(ticket);
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
                              handleTicketClick(ticket);
                            }}
                            title="تعديل التذكرة"
                          >
                            <Edit className="h-4 w-4" />
                          </OliveButton>
                          <OliveButton
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteTicket(ticket.id);
                            }}
                            title="حذف التذكرة"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </OliveButton>
                        </div>
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

      {/* Minimized Tickets Bar - Bottom Left */}
      {minimizedTickets.length > 0 && (
        <div className="fixed left-4 bottom-4 bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm border border-gray-200 dark:border-gray-700 p-3 z-40 rounded-lg shadow-lg max-h-[calc(100vh-8rem)] overflow-y-auto flex flex-col gap-2 min-w-[200px] max-w-[320px]">
          <div className="flex flex-col items-center gap-2 max-h-80 overflow-y-auto">
            <span className="text-sm font-medium text-gray-700 whitespace-nowrap rotate-90 transform origin-center mb-4">
              التذاكر المصغرة
            </span>
            {minimizedTickets.map((ticket) => (
              <div 
                key={ticket.id}
                className={`group relative flex items-center gap-3 p-2.5 rounded-md border cursor-pointer transition-colors ${
                  ticket.isMaximized 
                    ? 'bg-blue-50 dark:bg-blue-900/50 border-blue-300 dark:border-blue-700' 
                    : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
                onClick={() => maximizeTicket(ticket.id)}
              >
                <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-primary/10 dark:bg-primary/20 text-primary dark:text-primary-foreground">
                  <span className="text-xs font-medium">#{ticket.ticketNumber.split('/').pop()}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100 block truncate" title={ticket.clientName}>
                    {ticket.clientName}
                  </span>
                </div>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFromMinimized(ticket.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-200 hover:bg-red-200 dark:hover:bg-red-800 flex items-center justify-center transition-opacity"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Camera QR Scan Modal */}
      {isCameraScanOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-lg relative">
            <button 
              className="absolute top-2 right-2 text-gray-500 hover:text-gray-700" 
              onClick={() => {
                setIsCameraScanOpen(false);
                stopCamera();
              }}
            >
              <X className="h-5 w-5" />
            </button>

            <h2 className="text-2xl font-bold mb-4 text-primary text-center">مسح QR بالكاميرا</h2>
            
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 mb-4">
              <div className="relative aspect-video bg-black rounded overflow-hidden">
                <video 
                  ref={videoRef} 
                  className="w-full h-full object-cover"
                  playsInline
                />
                {!isCameraActive && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
                    <div className="text-white text-center">
                      <Camera className="h-12 w-12 mx-auto mb-2" />
                      <p>جاري تهيئة الكاميرا...</p>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="text-center mt-4">
                <p className="text-sm text-gray-600">وجه الكاميرا نحو رمز QR للمسح الضوئي</p>
              </div>
            </div>

            <div className="flex gap-2">
              {!isCameraActive ? (
                <OliveButton 
                  onClick={initializeCamera}
                  className="flex-1"
                >
                  <Camera className="h-4 w-4 mr-2" />
                  تشغيل الكاميرا
                </OliveButton>
              ) : (
                <OliveButton 
                  onClick={stopCamera}
                  variant="outline"
                  className="flex-1"
                >
                  إيقاف الكاميرا
                </OliveButton>
              )}
              <OliveButton 
                variant="outline" 
                onClick={() => {
                  setIsCameraScanOpen(false);
                  stopCamera();
                }}
                className="flex-1"
              >
                إغلاق
              </OliveButton>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal for Ticket */}
      {isEditModalOpen && scannedTicket && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 text-foreground rounded-lg p-6 w-full max-w-lg shadow-lg relative">
            <button 
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200" 
              onClick={() => setIsEditModalOpen(false)}
            >
              <X className="h-5 w-5" />
            </button>

            <h2 className="text-2xl font-bold mb-6 text-primary">تعديل التذكرة #{scannedTicket.ticketNumber}</h2>

            {/* Static ticket info */}
            <div className="space-y-3 mb-6 p-4 bg-muted/20 rounded-lg">
              <div className="text-muted-foreground">رقم التذكرة: <span className="text-foreground font-medium">#{scannedTicket.ticketNumber}</span></div>
              <div className="text-muted-foreground">اسم العميل: <span className="text-foreground font-medium">{scannedTicket.clientName}</span></div>
              <div className="text-muted-foreground">الوزن الداخل: <span className="text-foreground font-medium">{scannedTicket.weightIn} كيلو</span></div>
              <div className="text-muted-foreground">تاريخ الاستلام: <span className="text-foreground font-medium">
                {new Date(scannedTicket.dateReceived).toLocaleDateString('ar-TN')}
              </span></div>
            </div>

            {/* Editable fields */}
            <div className="grid grid-cols-2 gap-6 mb-6">
              <div>
                <label className="text-sm">
                  <span className="block mb-2">الوزن الخارج (كيلو)</span>
                  <Input
                    type="number"
                    step="0.01"
                    value={editForm.weightOut}
                    onChange={(e) => setEditForm((p) => ({ ...p, weightOut: e.target.value }))}
                    placeholder="أدخل الوزن الخارج"
                    className="w-full"
                  />
                </label>
              </div>
              <div>
                <label className="text-sm">
                  <span className="block mb-2">عدد الصناديق</span>
                  <Input
                    type="number"
                    min="0"
                    value={editForm.numberOfBoxes}
                    onChange={(e) => setEditForm((p) => ({ ...p, numberOfBoxes: e.target.value }))}
                    placeholder="0"
                    className="w-full"
                  />
                </label>
              </div>
            </div>

            {/* Display current pricing information */}
            <div className="mb-6">
              <div className="p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
                <div className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">السعر المستخدم للحساب:</div>
                {loadingPrices ? (
                  <div className="flex items-center text-blue-700 dark:text-blue-300">
                    <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                    جاري تحميل الأسعار...
                  </div>
                ) : currentPrices && currentPrices.milling_price_per_kg > 0 ? (
                  <div className="text-lg font-bold text-blue-700 dark:text-blue-300">
                    سعر العصر: {currentPrices.milling_price_per_kg} دينار/كيلو
                  </div>
                ) : (
                  <div className="text-red-700 dark:text-red-400">
                    لا توجد أسعار محددة في النظام. يرجى تحديد الأسعار في صفحة الإعدادات.
                  </div>
                )}
              </div>
            </div>

            {/* Calculated values */}
            {editForm.weightOut && (
              <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
                <div className="p-3 rounded bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800">
                  <div className="text-blue-800 dark:text-blue-200 font-medium">الوزن الصافي</div>
                  <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                    {calculateEditNetWeight().toFixed(2)} كيلو
                  </div>
                </div>
                <div className="p-3 rounded bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800">
                  <div className="text-green-800 dark:text-green-200 font-medium">المبلغ الإجمالي</div>
                  <div className="text-lg font-bold text-green-600 dark:text-green-400">
                    {calculateEditTotalAmount().toFixed(2)} دينار
                  </div>
                  {isMinimumPriceApplied() && (
                    <div className="text-xs text-green-600 dark:text-green-400 mt-1">
                      تم تطبيق الحد الأدنى للسعر (40 دينار)
                    </div>
                  )}
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

            <div className="flex gap-3">
              <OliveButton 
                onClick={handleSaveChanges} 
                disabled={isSaving}
                className="flex-1"
              >
                {isSaving ? 'جارٍ الحفظ...' : 'حفظ التغييرات'}
              </OliveButton>
              <OliveButton 
                variant="outline" 
                onClick={() => minimizeTicket(scannedTicket)}
                className="flex-1"
              >
                <Minimize2 className="h-4 w-4 mr-2" />
                تصغير
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

      {/* Print Ticket Modal */}
      {isPrintModalOpen && ticketToPrint && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[#0F1729] rounded-lg p-6 w-full max-w-md shadow-lg relative text-white">
            <button 
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-200" 
              onClick={() => setIsPrintModalOpen(false)}
            >
              <X className="h-5 w-5" />
            </button>

            <h2 className="text-2xl font-bold mb-6 text-[#22C55E] text-center">تذكرة معصرة الزيتون</h2>
            
            <div className="border border-gray-700 p-6 rounded-lg mb-6 bg-[#1D2839]">
              <div className="text-center mb-4">
                <div className="text-lg font-medium text-white">تذكرة رقم: {ticketToPrint.ticketNumber}</div>
                <div className="text-sm text-gray-400">{new Date(ticketToPrint.dateReceived).toLocaleDateString('ar-TN')}</div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="text-center p-3 bg-[#0F1729] rounded border border-gray-700">
                  <div className="text-gray-300 mb-1">الوزن الداخل</div>
                  <div className="text-white">{ticketToPrint.weightIn} كيلو</div>
                </div>
                <div className="text-center p-3 bg-[#0F1729] rounded border border-gray-700">
                  <div className="text-gray-300 mb-1">الوزن الخارج</div>
                  <div className="text-white">{ticketToPrint.weightOut || 'لم يتم الوزن'} كيلو</div>
                </div>
              </div>
              
              <div className="text-center mb-4 p-3 bg-[#0F1729] rounded border border-gray-700">
                <div className="text-gray-300 mb-1">اسم العميل</div>
                <div className="text-white">{ticketToPrint.clientName}</div>
              </div>
              
              {ticketToPrint.qrCode && (
                <div className="text-center mb-3">
                  <img src={ticketToPrint.qrCode} alt="QR Code" className="w-32 h-32 mx-auto bg-white p-2 rounded" />
                  <div className="text-sm text-gray-400 mt-2">مسح QR للإكمال</div>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <OliveButton 
                onClick={printTicket}
                className="flex-1 bg-[#22C55E] hover:bg-[#22C55E]/90 text-white"
              >
                <Printer className="h-4 w-4 mr-2" />
                طباعة
              </OliveButton>
              <OliveButton 
                variant="outline" 
                onClick={() => minimizeTicket(ticketToPrint)}
                className="flex-1 border-gray-700 text-gray-300 hover:text-white hover:bg-gray-700"
              >
                <Minimize2 className="h-4 w-4 mr-2" />
                تصغير
              </OliveButton>
              <OliveButton 
                variant="outline" 
                onClick={() => setIsPrintModalOpen(false)}
                className="flex-1 border-gray-700 text-gray-300 hover:text-white hover:bg-gray-700"
              >
                إغلاق
              </OliveButton>
            </div>
          </div>
        </div>
      )}

      {/* QR Code Display Modal */}
      {isQrDisplayOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-sm shadow-lg relative">
            <button 
              className="absolute top-2 right-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300" 
              onClick={() => setIsQrDisplayOpen(false)}
            >
              <X className="h-5 w-5" />
            </button>

            <h2 className="text-2xl font-bold mb-4 text-primary text-center">رمز QR للتذكرة</h2>
            
            <div className="text-center space-y-4">
              <div className="border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg p-4 inline-block">
                <img src={qrCodeImage} alt="QR Code" className="w-48 h-48" />
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">استخدم هذا الرمز للمسح الضوئي عند إكمال المعالجة</p>
              
              <OliveButton
                variant="outline"
                onClick={() => {
                  const link = document.createElement('a');
                  link.href = qrCodeImage;
                  link.download = 'qr-code.png';
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                }}
                className="mx-auto"
              >
                <Download className="h-4 w-4 ml-2" />
                تحميل الرمز
              </OliveButton>
            </div>

            <div className="flex gap-2 mt-4">
              <OliveButton 
                variant="outline" 
                onClick={() => setIsQrDisplayOpen(false)}
                className="flex-1"
              >
                إغلاق
              </OliveButton>
            </div>
          </div>
        </div>
      )}
    </>
  );
}