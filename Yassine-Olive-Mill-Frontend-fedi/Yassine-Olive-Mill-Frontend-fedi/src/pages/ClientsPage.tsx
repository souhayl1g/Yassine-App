import React, { useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { OliveCard, OliveCardHeader, OliveCardContent, OliveCardTitle } from '@/components/ui/olive-card';
import { OliveButton } from '@/components/ui/olive-button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  Search, 
  Users, 
  Phone, 
  MapPin, 
  Edit2, 
  Trash2,
  UserPlus,
  FileText,
  Camera,
  X,
  RotateCcw
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/integrations/api/client';
import QrScanner from 'qr-scanner';

// Set the worker path for QR Scanner
QrScanner.WORKER_PATH = '/qr-scanner-worker.min.js';

interface Client {
  id: number | string;
  firstname: string;
  lastname: string;
  phone: string;
  address?: string;
  createdAt?: string;
  type?: 'grower' | 'seller';
}

interface ClientsResponse {
  clients: Client[];
  pagination?: { total: number; page: number; pages: number };
}

export function ClientsPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [clients, setClients] = useState<Client[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [viewingClient, setViewingClient] = useState<Client | null>(null);
  const [clientTickets, setClientTickets] = useState<any[]>([]);
  const [loadingClientDetails, setLoadingClientDetails] = useState(false);

  // QR Scanner state
  const [isQrScannerOpen, setIsQrScannerOpen] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const qrScannerRef = useRef<QrScanner | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    firstname: '',
    lastname: '',
    phone: '',
    address: '',
    type: 'grower' as 'grower' | 'seller',
  });

  const resetForm = () => {
    setFormData({
      firstname: '',
      lastname: '',
      phone: '',
      address: '',
      type: 'grower',
    });
  };

  const loadClients = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', '10');
      if (searchQuery.trim()) params.set('search', searchQuery.trim());
      const resp = await api.get<ClientsResponse>(`/clients?${params.toString()}`);
      
      // Defensive null checks
      if (!resp) {
        setClients([]);
        setPages(1);
        return;
      }
      
      const list = (resp.clients || []).map((c) => ({
        ...c,
        // fallback pour type si l'API ne le retourne pas
        type: (c as any).type || 'grower',
      }));
      setClients(list);
      setPages(resp.pagination?.pages || 1);
    } catch (e: any) {
      console.error('Error loading clients:', e);
      toast({ 
        variant: 'destructive', 
        title: t('common.error'), 
        description: e?.message || 'فشل تحميل العملاء. يرجى المحاولة مرة أخرى.' 
      });
      setClients([]);
      setPages(1);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadClients();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  useEffect(() => {
    const id = setTimeout(() => {
      setPage(1);
      loadClients();
    }, 300);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  const handleAddClient = async () => {
    if (!formData.firstname || !formData.lastname || !formData.phone) {
      toast({
        variant: 'destructive',
        title: t('common.error'),
        description: t('validation.required'),
      });
      return;
    }
    try {
      await api.post('/clients', {
        firstname: formData.firstname,
        lastname: formData.lastname,
        phone: formData.phone,
        address: formData.address,
      });
      await loadClients();
      setIsAddDialogOpen(false);
      resetForm();
      toast({ title: t('common.success'), description: 'تم إضافة العميل بنجاح' });
    } catch (e: any) {
      toast({ variant: 'destructive', title: t('common.error'), description: e?.message || 'Failed to add client' });
    }
  };

  // Prevent any accidental print triggers when dialogs close
  useEffect(() => {
    // Close any lingering print windows when dialogs close
    const cleanupPrintWindows = () => {
      try {
        // Check if there's a print window reference from DailyWork
        if ((window as any).__olivePrintWindow) {
          const printWindow = (window as any).__olivePrintWindow;
          if (printWindow && !printWindow.closed) {
            // Only close if it's been open for more than 5 seconds (user likely cancelled)
            setTimeout(() => {
              try {
                if (printWindow && !printWindow.closed) {
                  printWindow.close();
                  (window as any).__olivePrintWindow = null;
                }
              } catch (e) {
                // Ignore errors
              }
            }, 100);
          } else {
            (window as any).__olivePrintWindow = null;
          }
        }
      } catch (e) {
        // Ignore errors
      }
    };
    
    // Only run cleanup when dialogs close (not when they open)
    if (!isAddDialogOpen && !editingClient) {
      cleanupPrintWindows();
    }
  }, [isAddDialogOpen, editingClient]);

  const handleEditClient = async () => {
    if (!editingClient || !formData.firstname || !formData.lastname || !formData.phone) {
      toast({
        variant: 'destructive',
        title: t('common.error'),
        description: t('validation.required'),
      });
      return;
    }
    try {
      await api.put(`/clients/${editingClient.id}`, {
        firstname: formData.firstname,
        lastname: formData.lastname,
        phone: formData.phone,
        address: formData.address,
      });
      await loadClients();
      setEditingClient(null);
      resetForm();
      toast({ title: t('common.success'), description: 'تم تحديث العميل بنجاح' });
    } catch (e: any) {
      toast({ variant: 'destructive', title: t('common.error'), description: e?.message || 'Failed to update client' });
    }
  };

  const handleDeleteClient = async (clientId: string | number) => {
    try {
      await api.delete(`/clients/${clientId}`);
      await loadClients();
      toast({ title: t('common.success'), description: 'تم حذف العميل بنجاح' });
    } catch (e: any) {
      toast({ variant: 'destructive', title: t('common.error'), description: e?.message || 'Failed to delete client' });
    }
  };

  const openEditDialog = (client: Client) => {
    setEditingClient(client);
    setFormData({
      firstname: client.firstname,
      lastname: client.lastname,
      phone: client.phone,
      address: client.address || '',
      type: client.type,
    });
  };

  const handleViewClient = async (client: Client) => {
    if (!client || !client.id) {
      toast({
        variant: 'destructive',
        title: t('common.error'),
        description: 'بيانات العميل غير صحيحة',
      });
      return;
    }
    
    setViewingClient(client);
    setLoadingClientDetails(true);
    try {
      const response = await api.get(`/clients/${client.id}`);
      
      // Defensive null checks
      if (!response) {
        setClientTickets([]);
        return;
      }
      
      const clientData = response as any;
      
      // Extract tickets/batches from the client data
      const tickets = Array.isArray(clientData?.batches) ? clientData.batches : [];
      setClientTickets(tickets);
    } catch (error: any) {
      console.error('Error loading client details:', error);
      toast({
        variant: 'destructive',
        title: t('common.error'),
        description: error?.message || 'فشل في تحميل بيانات العميل',
      });
      setClientTickets([]);
    } finally {
      setLoadingClientDetails(false);
    }
  };

  // Helper function to extract payload from API responses
  const getPayload = <T,>(res: any): T => (res && typeof res === 'object' && 'data' in res ? res.data : res);

  // Initialize camera for QR scanning
  const initializeCamera = async () => {
    if (!videoRef.current) return;

    // Check if we're on HTTPS or localhost
    const isSecure = location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1';
    if (!isSecure) {
      toast({
        variant: 'destructive',
        title: 'خطأ في الأمان',
        description: 'الكاميرا تتطلب HTTPS للعمل. يرجى استخدام https:// أو localhost',
      });
      setIsCameraActive(false);
      return;
    }

    // Check if getUserMedia is available
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      toast({
        variant: 'destructive',
        title: 'خطأ في الكاميرا',
        description: 'المتصفح لا يدعم الوصول إلى الكاميرا',
      });
      setIsCameraActive(false);
      return;
    }

    try {
      // Mobile-optimized camera settings
      const isMobile = window.innerWidth < 768;
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment',
          width: { ideal: isMobile ? 640 : 1280 },
          height: { ideal: isMobile ? 480 : 720 }
        } 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      qrScannerRef.current = new QrScanner(
        videoRef.current,
        (result) => {
          if (result && result.data) {
            handleQRResult(result.data);
          }
        },
        {
          highlightScanRegion: true,
          highlightCodeOutline: true,
          preferredCamera: 'environment',
          maxScansPerSecond: 3, // Reduced for mobile performance
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

      // Fetch the batch to get client information
      const batch = await fetchBatchById(batchId);
      
      // Find the client from the batch
      const client = await findClientFromBatch(batch);
      
      // Stop scanning after successful scan
      stopCamera();
      setIsQrScannerOpen(false);
      
      // Open the client details modal
      await handleViewClient(client);
      
      toast({ title: 'نجح', description: 'تم العثور على العميل من رمز QR بنجاح' });
    } catch (error: any) {
      console.error('QR scan error:', error);
      toast({ variant: 'destructive', title: 'خطأ', description: error.message || 'فشل قراءة رمز QR' });
    }
  };

  // Fetch batch by ID from API
  const fetchBatchById = async (batchId: string | number) => {
    if (!batchId) {
      throw new Error('معرف التذكرة مطلوب');
    }

    let idOrCode: string;
    
    if (typeof batchId === 'number') {
      idOrCode = String(batchId);
    } else if (typeof batchId === 'string' && batchId.trim()) {
      const num = parseInt(batchId.replace(/\D+/g, ''), 10);
      idOrCode = isNaN(num) ? batchId.trim() : String(num);
    } else {
      throw new Error('معرف التذكرة غير صالح');
    }

    if (!idOrCode) {
      throw new Error('معرف التذكرة مطلوب');
    }

    try {
      const res = await api.get<any>(`/batches/${idOrCode}`);
      
      if (!res) {
        throw new Error('فشل جلب بيانات التذكرة');
      }

      const data = getPayload<any>(res);

      if (!data || !data.id) {
        throw new Error('التذكرة غير موجودة في النظام');
      }

      return data;
    } catch (e: any) {
      console.error('Error fetching batch:', e);
      const errorMessage = e?.response?.status === 404 
        ? 'التذكرة غير موجودة في النظام'
        : e?.message || 'فشل جلب بيانات التذكرة';
      
      throw new Error(errorMessage);
    }
  };

  // Find client from batch data
  const findClientFromBatch = async (batch: any): Promise<Client> => {
    try {
      if (!batch) {
        throw new Error('بيانات التذكرة غير صحيحة');
      }

      if (!batch.clientId && !batch.client?.id) {
        throw new Error('لا يوجد معرف عميل في هذه التذكرة');
      }

      const clientId = batch.clientId || batch.client?.id;
      
      if (!clientId) {
        throw new Error('لا يوجد معرف عميل صحيح');
      }
      
      // If we already have client data in the batch, use it
      if (batch.client && batch.client.firstname && batch.client.lastname) {
        return {
          id: clientId,
          firstname: batch.client.firstname || '',
          lastname: batch.client.lastname || '',
          phone: batch.client.phone || '',
          address: batch.client.address || '',
          type: batch.client.type || 'grower',
          createdAt: batch.client.createdAt
        };
      }

      // Otherwise, fetch the client data separately
      const clientResponse = await api.get(`/clients/${clientId}`);
      const clientData = getPayload<any>(clientResponse);
      
      if (!clientData || !clientData.id) {
        throw new Error('لم يتم العثور على بيانات العميل');
      }

      if (!clientData.firstname || !clientData.lastname) {
        throw new Error('بيانات العميل غير مكتملة');
      }

      return {
        id: clientData.id,
        firstname: clientData.firstname,
        lastname: clientData.lastname,
        phone: clientData.phone || '',
        address: clientData.address || '',
        type: clientData.type || 'grower',
        createdAt: clientData.createdAt
      };
    } catch (e: any) {
      const errorMessage = e?.response?.status === 404 
        ? 'العميل غير موجود في النظام'
        : e?.message || 'فشل العثور على العميل';
      
      throw new Error(errorMessage);
    }
  };

  // Handle opening QR scanner
  const handleOpenQrScanner = () => {
    setIsQrScannerOpen(true);
    setIsCameraActive(true);
    setTimeout(() => {
      initializeCamera();
    }, 100);
  };

  // Handle closing QR scanner
  const handleCloseQrScanner = () => {
    stopCamera();
    setIsQrScannerOpen(false);
  };

  // Cleanup camera when component unmounts or QR scanner closes
  useEffect(() => {
    if (!isQrScannerOpen) {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isQrScannerOpen]);

  const filteredClients = clients.filter(client => {
    const matchesSearch = 
      client.firstname.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.lastname.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.phone.includes(searchQuery);
    
    const matchesType = typeFilter === 'all' || client.type === typeFilter;
    
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-4 sm:space-y-6 lg:space-y-8">
      {/* Page Header */}
      <div className="flex flex-col gap-3 sm:gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground">
            {t('clients.title')}
          </h1>
          <p className="text-sm sm:text-base lg:text-lg text-muted-foreground mt-1 sm:mt-2">
            إدارة عملاء المعصرة وبياناتهم
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto">
          <OliveButton 
            size="lg" 
            variant="outline" 
            className="gap-2 w-full sm:w-auto min-h-[44px]"
            onClick={handleOpenQrScanner}
          >
            <Camera className="h-4 w-4 sm:h-5 sm:w-5" />
            <span className="text-sm sm:text-base">مسح QR للعميل</span>
          </OliveButton>
          
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <OliveButton size="lg" className="gap-2 w-full sm:w-auto min-h-[44px]">
                <Plus className="h-4 w-4 sm:h-5 sm:w-5" />
                <span className="text-sm sm:text-base">{t('clients.addClient')}</span>
              </OliveButton>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md max-w-[95vw] max-h-[95vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{t('clients.addClient')}</DialogTitle>
              </DialogHeader>
              <ClientForm
                formData={formData}
                setFormData={setFormData}
                onSubmit={handleAddClient}
                onCancel={() => {
                  setIsAddDialogOpen(false);
                  resetForm();
                }}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filters */}
      <OliveCard>
        <OliveCardContent className="p-4 sm:p-6">
          <div className="flex flex-col gap-3 sm:gap-4 md:flex-row md:items-center">
            <div className="flex-1 relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="البحث بالاسم أو رقم الهاتف..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="olive-input pr-10 min-h-[44px]"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full md:w-48 min-h-[44px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الأنواع</SelectItem>
                <SelectItem value="grower">{t('clients.grower')}</SelectItem>
                <SelectItem value="seller">{t('clients.seller')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </OliveCardContent>
      </OliveCard>

      {/* Clients Grid */}
      {isLoading ? (
        <OliveCard>
          <OliveCardContent className="py-12">
            <div className="h-6 bg-muted animate-pulse rounded mb-4" />
            <div className="h-6 bg-muted animate-pulse rounded w-1/2" />
          </OliveCardContent>
        </OliveCard>
      ) : filteredClients.length === 0 ? (
        <OliveCard>
          <OliveCardContent className="flex flex-col items-center justify-center py-12">
            <Users className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">{t('clients.noClients')}</h3>
            <p className="text-muted-foreground mb-6 text-center">
              ابدأ بإضافة عملاء جدد لإدارة أعمالك
            </p>
            <OliveButton onClick={() => setIsAddDialogOpen(true)} className="gap-2">
              <UserPlus className="h-5 w-5" />
              إضافة أول عميل
            </OliveButton>
          </OliveCardContent>
        </OliveCard>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {filteredClients.map((client) => (
            <OliveCard 
              key={client.id} 
              className="hover:shadow-lg transition-shadow cursor-pointer active:scale-[0.98]"
              onClick={() => handleViewClient(client)}
            >
              <OliveCardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <OliveCardTitle className="text-lg">
                      {client.firstname} {client.lastname}
                    </OliveCardTitle>
                    {client.type && (
                      <Badge 
                        variant={client.type === 'grower' ? 'default' : 'secondary'}
                        className="w-fit"
                      >
                        {t(`clients.${client.type}`)}
                      </Badge>
                    )}
                  </div>
                  <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                    <OliveButton
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditDialog(client)}
                      className="min-w-[44px] min-h-[44px] touch-manipulation"
                    >
                      <Edit2 className="h-4 w-4" />
                    </OliveButton>
                    <OliveButton
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteClient(client.id)}
                      className="text-destructive hover:text-destructive min-w-[44px] min-h-[44px] touch-manipulation"
                    >
                      <Trash2 className="h-4 w-4" />
                    </OliveButton>
                  </div>
                </div>
              </OliveCardHeader>
              <OliveCardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{client.phone}</span>
                </div>
                {client.address && (
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className="truncate">{client.address}</span>
                  </div>
                )}
                <div className="text-xs text-muted-foreground">
                  تاريخ التسجيل: {client.createdAt ? new Date(client.createdAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'numeric',
                    day: 'numeric'
                  }) : '-'}
                </div>
                <div className="text-xs text-primary font-medium">
                  انقر لعرض التفاصيل والتذاكر السابقة
                </div>
              </OliveCardContent>
            </OliveCard>
          ))}
        </div>
      )}

      {/* Pagination */}
      <div className="flex justify-center items-center gap-3 flex-wrap">
        <OliveButton 
          variant="outline" 
          disabled={page <= 1} 
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          className="min-h-[44px] min-w-[100px] touch-manipulation"
        >
          {t('pagination.previous')}
        </OliveButton>
        <span className="text-sm sm:text-base text-muted-foreground px-2">{page} / {pages}</span>
        <OliveButton 
          variant="outline" 
          disabled={page >= pages} 
          onClick={() => setPage((p) => Math.min(pages, p + 1))}
          className="min-h-[44px] min-w-[100px] touch-manipulation"
        >
          {t('pagination.next')}
        </OliveButton>
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editingClient} onOpenChange={(open) => !open && setEditingClient(null)}>
        <DialogContent className="sm:max-w-md max-w-[95vw] max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">{t('clients.editClient')}</DialogTitle>
          </DialogHeader>
          <ClientForm
            formData={formData}
            setFormData={setFormData}
            onSubmit={handleEditClient}
            onCancel={() => {
              setEditingClient(null);
              resetForm();
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Client Details Modal */}
      <Dialog open={!!viewingClient} onOpenChange={(open) => !open && setViewingClient(null)}>
        <DialogContent className="sm:max-w-5xl max-w-[95vw] max-h-[95vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader className="pb-4 sm:pb-6">
            <DialogTitle className="text-lg sm:text-xl lg:text-2xl font-bold text-center">
              تفاصيل العميل: {viewingClient?.firstname} {viewingClient?.lastname}
            </DialogTitle>
          </DialogHeader>
          
          {viewingClient && (
            <div className="space-y-4 sm:space-y-6 lg:space-y-8">
              {/* Client Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
                <OliveCard className="border-2">
                  <OliveCardHeader className="pb-4">
                    <OliveCardTitle className="flex items-center gap-3 text-lg">
                      <Users className="h-6 w-6 text-primary" />
                      معلومات العميل
                    </OliveCardTitle>
                  </OliveCardHeader>
                  <OliveCardContent className="space-y-4">
                    <div className="flex justify-between items-center py-2">
                      <span className="text-muted-foreground font-medium">الاسم الكامل:</span>
                      <span className="font-semibold">{viewingClient.firstname} {viewingClient.lastname}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-t border-muted/20">
                      <span className="text-muted-foreground font-medium">رقم الهاتف:</span>
                      <span className="font-semibold">{viewingClient.phone || 'غير محدد'}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-t border-muted/20">
                      <span className="text-muted-foreground font-medium">العنوان:</span>
                      <span className="font-semibold text-right max-w-48 truncate" title={viewingClient.address}>
                        {viewingClient.address || 'غير محدد'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-t border-muted/20">
                      <span className="text-muted-foreground font-medium">النوع:</span>
                      <Badge variant={viewingClient.type === 'grower' ? 'default' : 'secondary'} className="px-3 py-1">
                        {t(`clients.${viewingClient.type}`)}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center py-2 border-t border-muted/20">
                      <span className="text-muted-foreground font-medium">تاريخ التسجيل:</span>
                      <span className="font-semibold">
                        {viewingClient.createdAt ? new Date(viewingClient.createdAt).toLocaleDateString('ar-SA') : 'غير محدد'}
                      </span>
                    </div>
                  </OliveCardContent>
                </OliveCard>

                {/* Statistics */}
                <OliveCard className="border-2">
                  <OliveCardHeader className="pb-4">
                    <OliveCardTitle className="flex items-center gap-3 text-lg">
                      <FileText className="h-6 w-6 text-primary" />
                      إحصائيات العميل
                    </OliveCardTitle>
                  </OliveCardHeader>
                  <OliveCardContent className="space-y-4">
                    <div className="flex justify-between items-center py-2">
                      <span className="text-muted-foreground font-medium">إجمالي التذاكر:</span>
                      <span className="font-bold text-primary text-xl">{clientTickets.length}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-t border-muted/20">
                      <span className="text-muted-foreground font-medium">إجمالي الوزن:</span>
                      <span className="font-semibold text-green-600">
                        {clientTickets.reduce((sum, ticket) => sum + (ticket.weight_in || 0), 0)} كغ
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-t border-muted/20">
                      <span className="text-muted-foreground font-medium">إجمالي الصناديق:</span>
                      <span className="font-semibold text-blue-600">
                        {clientTickets.reduce((sum, ticket) => sum + (ticket.number_of_boxes || 0), 0)} صندوق
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-t border-muted/20">
                      <span className="text-muted-foreground font-medium">آخر زيارة:</span>
                      <span className="font-semibold">
                        {clientTickets.length > 0 
                          ? new Date(Math.max(...clientTickets.map(t => new Date(t.date_received || t.createdAt).getTime()))).toLocaleDateString('ar-SA')
                          : 'لا توجد زيارات'
                        }
                      </span>
                    </div>
                  </OliveCardContent>
                </OliveCard>
              </div>

              {/* Tickets History */}
              <OliveCard className="border-2">
                <OliveCardHeader className="pb-4">
                  <OliveCardTitle className="flex items-center gap-3 text-lg">
                    <FileText className="h-6 w-6 text-primary" />
                    سجل التذاكر السابقة ({clientTickets.length})
                  </OliveCardTitle>
                </OliveCardHeader>
                <OliveCardContent className="px-6">
                  {loadingClientDetails ? (
                    <div className="flex justify-center items-center py-12">
                      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
                      <span className="mr-4 text-muted-foreground text-lg">جاري تحميل التذاكر...</span>
                    </div>
                  ) : clientTickets.length === 0 ? (
                    <div className="text-center py-12">
                      <FileText className="h-20 w-20 text-muted-foreground mx-auto mb-6" />
                      <h3 className="text-xl font-semibold mb-3">لا توجد تذاكر سابقة</h3>
                      <p className="text-muted-foreground text-lg">لم يقم هذا العميل بإنشاء أي تذاكر بعد</p>
                    </div>
                  ) : (
                    <div className="space-y-6 max-h-[450px] overflow-y-auto pr-2">
                      {clientTickets
                        .sort((a, b) => new Date(b.date_received || b.createdAt).getTime() - new Date(a.date_received || a.createdAt).getTime())
                        .map((ticket, index) => (
                        <div key={ticket.id} className="border-2 rounded-xl p-6 hover:bg-muted/30 transition-all duration-200 hover:shadow-md">
                          <div className="flex justify-between items-start mb-5">
                            <div className="space-y-1">
                              <h4 className="font-bold text-lg">تذكرة #{ticket.id}</h4>
                              <p className="text-muted-foreground">
                                {new Date(ticket.date_received || ticket.createdAt).toLocaleDateString('ar-SA', {
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric'
                                })}
                              </p>
                            </div>
                            <Badge 
                              variant={
                                ticket.status === 'completed' ? 'default' : 
                                ticket.status === 'in_process' ? 'secondary' : 
                                'outline'
                              }
                              className="px-4 py-2 text-sm font-medium"
                            >
                              {ticket.status === 'completed' ? 'مكتملة' : 
                               ticket.status === 'in_process' ? 'قيد المعالجة' : 
                               'مستلمة'}
                            </Badge>
                          </div>
                          
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
                            <div className="text-center p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                              <span className="text-muted-foreground text-sm block mb-1">الوزن</span>
                              <div className="font-bold text-blue-600 text-lg">{ticket.weight_in || 0} كغ</div>
                            </div>
                            <div className="text-center p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                              <span className="text-muted-foreground text-sm block mb-1">الصناديق</span>
                              <div className="font-bold text-green-600 text-lg">{ticket.number_of_boxes || 0} صندوق</div>
                            </div>
                            <div className="text-center p-3 bg-purple-50 dark:bg-purple-950/20 rounded-lg">
                              <span className="text-muted-foreground text-sm block mb-1">نوع العملية</span>
                              <div className="font-bold text-purple-600">
                                {ticket.operation_type === 'milling' ? 'عصر' : 
                                 ticket.operation_type === 'storage' ? 'تخزين' : 
                                 'أخرى'}
                              </div>
                            </div>
                            <div className="text-center p-3 bg-orange-50 dark:bg-orange-950/20 rounded-lg">
                              <span className="text-muted-foreground text-sm block mb-1">رقم التذكرة</span>
                              <div className="font-bold text-orange-600">{ticket.ticket_number || '-'}</div>
                            </div>
                          </div>
                          
                          {ticket.notes && (
                            <div className="mt-5 pt-4 border-t border-muted/30">
                              <span className="text-muted-foreground font-medium text-sm">ملاحظات:</span>
                              <p className="mt-2 p-3 bg-muted/20 rounded-lg text-sm leading-relaxed">{ticket.notes}</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </OliveCardContent>
              </OliveCard>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* QR Scanner Dialog */}
      <Dialog open={isQrScannerOpen} onOpenChange={(open) => !open && handleCloseQrScanner()}>
        <DialogContent className="sm:max-w-md max-w-[95vw] max-h-[95vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-center text-base sm:text-lg">مسح QR للعثور على العميل</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <p className="text-center text-muted-foreground">
              وجه الكاميرا نحو رمز QR الخاص بتذكرة العميل
            </p>
            
            {/* Camera View */}
            <div className="relative w-full aspect-square bg-black rounded-lg overflow-hidden">
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                autoPlay
                playsInline
                muted
              />
              
              {/* Camera status overlay */}
              {!isCameraActive && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                  <div className="text-white text-center">
                    <Camera className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">جاري تشغيل الكاميرا...</p>
                  </div>
                </div>
              )}

              {/* Scanning frame overlay */}
              {isCameraActive && (
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute inset-4 border-2 border-white/50 rounded-lg">
                    <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-primary"></div>
                    <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-primary"></div>
                    <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-primary"></div>
                    <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-primary"></div>
                  </div>
                  <div className="absolute bottom-4 left-4 right-4 text-center">
                    <p className="text-white text-sm bg-black/50 px-2 py-1 rounded">
                      ضع رمز QR داخل الإطار
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Control Buttons */}
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <OliveButton
                variant="outline"
                onClick={handleCloseQrScanner}
                className="flex-1 min-h-[44px] touch-manipulation"
              >
                <X className="h-4 w-4 mr-2" />
                <span className="text-sm sm:text-base">إلغاء</span>
              </OliveButton>
              
              {!isCameraActive ? (
                <OliveButton
                  onClick={initializeCamera}
                  className="flex-1 min-h-[44px] touch-manipulation"
                >
                  <Camera className="h-4 w-4 mr-2" />
                  <span className="text-sm sm:text-base">تشغيل الكاميرا</span>
                </OliveButton>
              ) : (
                <OliveButton
                  onClick={() => {
                    stopCamera();
                    setTimeout(initializeCamera, 500);
                  }}
                  variant="outline"
                  className="flex-1 min-h-[44px] touch-manipulation"
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  <span className="text-sm sm:text-base">إعادة تشغيل</span>
                </OliveButton>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface ClientFormProps {
  formData: any;
  setFormData: (data: any) => void;
  onSubmit: () => void;
  onCancel: () => void;
}

function ClientForm({ formData, setFormData, onSubmit, onCancel }: ClientFormProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-3 sm:space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <div className="space-y-2">
          <Label htmlFor="firstname">{t('clients.firstname')}</Label>
          <Input
            id="firstname"
            value={formData.firstname}
            onChange={(e) => setFormData({ ...formData, firstname: e.target.value })}
            className="olive-input"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="lastname">{t('clients.lastname')}</Label>
          <Input
            id="lastname"
            value={formData.lastname}
            onChange={(e) => setFormData({ ...formData, lastname: e.target.value })}
            className="olive-input"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="phone">{t('clients.phone')}</Label>
        <Input
          id="phone"
          type="tel"
          value={formData.phone}
          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          className="olive-input"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="type">{t('clients.type')}</Label>
        <Select 
          value={formData.type} 
          onValueChange={(value) => setFormData({ ...formData, type: value })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="grower">{t('clients.grower')}</SelectItem>
            <SelectItem value="seller">{t('clients.seller')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="address">{t('clients.address')}</Label>
        <Input
          id="address"
          value={formData.address}
          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
          className="olive-input"
        />
      </div>

      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-3 sm:pt-4">
        <OliveButton onClick={onSubmit} className="flex-1 min-h-[44px] touch-manipulation">
          <span className="text-sm sm:text-base">{t('actions.save')}</span>
        </OliveButton>
        <OliveButton variant="outline" onClick={onCancel} className="flex-1 min-h-[44px] touch-manipulation">
          <span className="text-sm sm:text-base">{t('actions.cancel')}</span>
        </OliveButton>
      </div>
    </div>
  );
}