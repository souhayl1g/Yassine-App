import React, { useState, useEffect, useRef } from 'react';
import QrScanner from 'qr-scanner';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { OliveCard, OliveCardHeader, OliveCardContent, OliveCardTitle } from '@/components/ui/olive-card';
import { OliveButton } from '@/components/ui/olive-button';
import { Badge } from '@/components/ui/badge';
import {
  QrCode,
  Camera,
  CameraOff,
  Check,
  X,
  RotateCcw,
  AlertCircle,
  FileText,
  User,
  Scale,
  Calendar
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/integrations/api/client';

type Status = 'draft' | 'confirmed' | 'paid';

interface ScannedTicket {
  id: string;
  clientId: string; // Added clientId field
  clientName: string;
  weightIn: number;
  weightOut?: number;
  netWeight?: number;
  numberOfBoxes: number;
  unitPrice?: number;
  totalAmount?: number;
  amountPaid?: number;
  isPaid?: boolean;
  dateReceived: string;
  status: Status;
}

const tnd = new Intl.NumberFormat('ar-TN', { style: 'currency', currency: 'TND', minimumFractionDigits: 2 });

export function QRScannerPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { toast } = useToast();

  const [isScanning, setIsScanning] = useState(false);
  const [scannedTicket, setScannedTicket] = useState<ScannedTicket | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Modal state & form
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploadedTicket, setUploadedTicket] = useState<ScannedTicket | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState({
    weightIn: '',
    weightOut: '',
    numberOfBoxes: '',
    unitPrice: '',
    status: 'draft' as Status,
    amountPaid: '',
  });

  // Video/camera refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // ---------- Camera ----------
  const startCamera = async () => {
    try {
      setCameraError(null);
      
      // Check if mediaDevices API is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera API is not supported in this browser or environment');
      }

      // Request camera access
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
      });

      // Set up video stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
      }
      setIsScanning(true);
    } catch (error: any) {
      console.error('Camera access error:', error);
      
      // Provide more specific error messages
      let errorMessage = t('qr.cameraAccess');
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        errorMessage = 'تم رفض الوصول للكاميرا. يرجى السماح بالوصول في إعدادات المتصفح.';
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        errorMessage = 'لم يتم العثور على كاميرا. يرجى التأكد من توصيل كاميرا.';
      } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
        errorMessage = 'لا يمكن الوصول للكاميرا. قد تكون مستخدمة من قبل تطبيق آخر.';
      } else if (error.name === 'OverconstrainedError') {
        errorMessage = 'لا تتوفر كاميرا تدعم المواصفات المطلوبة.';
      } else if (error.message.includes('SSL')) {
        errorMessage = 'يجب استخدام HTTPS للوصول للكاميرا.';
      }
      
      setCameraError(errorMessage);
      toast({ 
        variant: 'destructive', 
        title: t('common.error'), 
        description: errorMessage 
      });
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsScanning(false);
  };

  useEffect(() => () => stopCamera(), []);

  // ---------- Helpers ----------
  const toNumber = (v: string) => (isNaN(parseFloat(v)) ? 0 : parseFloat(v));
  const fmtTND = (n?: number) => tnd.format(n ?? 0);

  // derived values from modal form
  const netFromForm = (() => {
    const wi = toNumber(form.weightIn);
    if (form.weightOut === '') return wi; // treat empty as "no out" -> net = in
    const wo = toNumber(form.weightOut);
    return Math.max(0, wi - wo);
  })();

  const totalFromForm = (() => {
    const price = toNumber(form.unitPrice);
    return +(netFromForm * price).toFixed(2);
  })();

  // ---------- API ----------
  const fetchTicketByCode = async (code: string): Promise<ScannedTicket> => {
    // Extract numeric id from something like TKT00123 -> 123
    const num = parseInt(code.replace(/\D+/g, ''), 10);
    const idOrCode = isNaN(num) ? code : String(num);

    try {
      const res = await api.get<any>(`/batches/${idOrCode}`);
      const data = (res && typeof res === 'object' && 'data' in res) ? (res as any).data : res;

      const ticket: ScannedTicket = {
        id: String(data.id),
        clientId: String(data.clientId), // Ensure clientId is included
        clientName: data.client
          ? `${data.client.firstname || ''} ${data.client.lastname || ''}`.trim() || `#${data.clientId}`
          : `#${data.clientId}`,
        weightIn: data.weight_in ?? 0,
        weightOut: data.weight_out ?? undefined,
        netWeight: data.net_weight ?? undefined,
        numberOfBoxes: data.number_of_boxes ?? 0,
        unitPrice: data.unit_price ?? 0,
        totalAmount: data.total_amount ?? undefined,
        amountPaid: data.amount_paid ?? 0,
        isPaid: data.is_paid ?? false,
        dateReceived: data.date_received || data.createdAt || new Date().toISOString(),
        status:
          data.status === 'received' ? 'draft'
          : data.status === 'in_process' ? 'confirmed'
          : 'paid',
      };

      return ticket;
    } catch (e: any) {
      toast({ variant: 'destructive', title: t('common.error'), description: e?.message || 'فشل جلب التذكرة' });
      throw e;
    } finally {
      setIsScanning(false);
      stopCamera();
    }
  };

  /**
   * Some backends don't expose PATCH/PUT at /batches/:id. To kill the 404,
   * we probe a few common update routes until one succeeds.
   */
  const updateBatch = async (id: string, payload: any) => {
    const attempts: Array<() => Promise<any>> = [
      () => api.post(`/batches/${id}`, { ...payload, _method: 'PATCH' }), // POST + method-override for PATCH
      () => api.put(`/batches/${id}`, payload),                    // RESTful PUT
      () => api.post(`/batches/${id}`, { ...payload, _method: 'PUT' }), // POST + method-override
      () => api.post(`/batches/update/${id}`, payload),            // /update/:id
      () => api.post(`/batches/${id}/update`, payload),            // /:id/update
      () => api.post(`/batches/update`, { id, ...payload }),       // /update body: {id,...}
      () => api.post(`/batches`, { id, ...payload, _method: 'PATCH' }), // POST + method-override for PATCH
      () => api.put(`/batches`, { id, ...payload }),               // PUT collection with id in body
    ];

    let lastErr: any;
    for (const tryCall of attempts) {
      try {
        const r = await tryCall();
        return r;
      } catch (err: any) {
        lastErr = err;
        // Only continue probing on 404/405; otherwise bubble up
        const msg = (err?.message || '').toLowerCase();
        if (!(msg.includes('404') || msg.includes('405') || msg.includes('not found') || msg.includes('method'))) {
          throw err;
        }
      }
    }
    throw lastErr;
  };

  // ---------- Upload QR flow ----------
  const handleUploadQR = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const result = await QrScanner.scanImage(file);
      if (result) {
        const ticket = await fetchTicketByCode(result);
        setUploadedTicket(ticket);
        setScannedTicket(ticket);

        setForm({
          weightIn: ticket.weightIn ? String(ticket.weightIn) : '',
          weightOut: ticket.weightOut !== undefined ? String(ticket.weightOut) : '',
          numberOfBoxes: ticket.numberOfBoxes ? String(ticket.numberOfBoxes) : '',
          unitPrice: ticket.unitPrice !== undefined ? String(ticket.unitPrice) : '',
          status: ticket.status,
          amountPaid: ticket.amountPaid !== undefined ? String(ticket.amountPaid) : '',
        });

        setUploadModalOpen(true);
        toast({ title: t('common.success'), description: 'تم مسح رمز QR بنجاح' });
      } else {
        toast({ variant: 'destructive', title: t('common.error'), description: 'لم يتم التعرف على رمز QR' });
      }
    } catch {
      toast({ variant: 'destructive', title: t('common.error'), description: 'فشل قراءة رمز QR' });
    } finally {
      event.target.value = '';
    }
  };

  // ---------- Save changes (modal) ----------
  const handleSaveChanges = async () => {
    if (!uploadedTicket) return;

    const weight_in = toNumber(form.weightIn);
    const weight_out = form.weightOut === '' ? undefined : toNumber(form.weightOut);
    const number_of_boxes = Math.max(0, parseInt(form.numberOfBoxes || '0', 10));
    const unit_price = toNumber(form.unitPrice);

    if (!(weight_in > 0)) {
      toast({ variant: 'destructive', title: t('common.error'), description: 'أدخل وزنًا صحيحًا للوزن الداخل' });
      return;
    }
    if (weight_out !== undefined && weight_out >= weight_in) {
      toast({ variant: 'destructive', title: t('common.error'), description: 'الوزن الخارج يجب أن يكون أقل من الوزن الداخل' });
      return;
    }

    const net_weight = weight_out === undefined ? weight_in : Math.max(0, weight_in - weight_out);
    const total_amount = +(net_weight * unit_price).toFixed(2);
    const amount_paid = form.amountPaid === '' ? undefined : toNumber(form.amountPaid);
    const status = form.status;
    const is_paid = status === 'paid';
    const date_paid = is_paid ? new Date().toISOString() : undefined;

    const payload: any = {
      clientId: uploadedTicket.clientId, // Ensure clientId is included
      weight_in,
      weight_out,
      net_weight, // Ensure net_weight is included
      number_of_boxes, // Ensure number_of_boxes is included
      unit_price,
      total_amount,
      amount_paid,
      status,
      is_paid,
      date_paid,
    };

    setIsSaving(true);
    try {
      await updateBatch(uploadedTicket.id, payload);

      // reflect changes locally
      const updated: ScannedTicket = {
        ...uploadedTicket,
        weightIn: weight_in,
        weightOut: weight_out,
        netWeight: net_weight,
        numberOfBoxes: number_of_boxes,
        unitPrice: unit_price,
        totalAmount: total_amount,
        amountPaid: amount_paid,
        status,
        isPaid: is_paid,
      };
      setUploadedTicket(updated);
      setScannedTicket(updated);
      setUploadModalOpen(false);

      toast({ title: t('common.success'), description: 'تم حفظ التغييرات بنجاح' });
    } catch (e: any) {
      console.error('Update failed:', e);
      toast({
        variant: 'destructive',
        title: 'خطأ',
        description: e?.message || 'لم يتم العثور على مسار التعديل. تحقق من مسارات الخادم لـ batches.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  // ---------- Misc UI ----------
  const simulateQRScan = () => {
    const simulatedCode = 'TKT000001';
    setTimeout(async () => {
      try {
        const ticket = await fetchTicketByCode(simulatedCode);
        setScannedTicket(ticket);
        toast({ title: t('common.success'), description: 'تم مسح رمز QR بنجاح (محاكاة)' });
      } catch {}
    }, 1000);
  };

  const handleApprove = () => {
    toast({ title: t('common.success'), description: 'تم الموافقة على التذكرة' });
    resetScanner();
  };
  const handleReject = () => {
    toast({ variant: 'destructive', title: t('actions.reject'), description: 'تم رفض التذكرة' });
    resetScanner();
  };
  const resetScanner = () => {
    setScannedTicket(null);
    stopCamera();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-warning text-warning-foreground';
      case 'confirmed': return 'bg-info text-info-foreground';
      case 'paid': return 'bg-success text-success-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-4xl font-bold text-foreground mb-2">{t('qr.title')}</h1>
        <p className="text-lg text-muted-foreground">مسح رموز QR للتذاكر والموافقة عليها</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Scanner Section */}
        <div className="space-y-6">
          <OliveCard>
            <OliveCardHeader>
              <OliveCardTitle className="flex items-center gap-2">
                <QrCode className="h-5 w-5" />
                {t('qr.scanTicket')}
              </OliveCardTitle>
            </OliveCardHeader>
            <OliveCardContent>
              {/* Upload QR */}
              <div className="flex justify-center mb-4">
                <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">
                  <QrCode className="h-5 w-5" />
                  <span>رفع رمز QR</span>
                  <input type="file" accept="image/*" onChange={handleUploadQR} className="hidden" />
                </label>
              </div>

              {!isScanning && !scannedTicket && (
                <div className="text-center py-12">
                  <div className="flex h-24 w-24 items-center justify-center rounded-full bg-primary/10 mx-auto mb-6">
                    <QrCode className="h-12 w-12 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">ابدأ مسح QR</h3>
                  <p className="text-muted-foreground mb-6">اضغط على الزر أدناه لبدء مسح رمز QR</p>
                  <OliveButton onClick={startCamera} size="lg" className="gap-2">
                    <Camera className="h-5 w-5" />
                    بدء المسح
                  </OliveButton>
                </div>
              )}

              {cameraError && (
                <div className="text-center py-12">
                  <AlertCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
                  <p className="text-destructive mb-4">{cameraError}</p>
                  <OliveButton onClick={startCamera} variant="outline">المحاولة مرة أخرى</OliveButton>
                </div>
              )}

              {isScanning && (
                <div className="space-y-4">
                  <div className="relative aspect-video rounded-lg overflow-hidden bg-black">
                    <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                    <div className="absolute inset-0 border-2 border-primary/50 rounded-lg">
                      <div className="absolute inset-4 border border-primary rounded-lg animate-pulse">
                        <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-primary rounded-tl-lg"></div>
                        <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-primary rounded-tr-lg"></div>
                        <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-primary rounded-bl-lg"></div>
                        <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-primary rounded-br-lg"></div>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <OliveButton onClick={simulateQRScan} className="flex-1">محاكاة المسح (تجريبي)</OliveButton>
                    <OliveButton onClick={stopCamera} variant="outline" className="gap-2">
                      <CameraOff className="h-4 w-4" />
                      إيقاف
                    </OliveButton>
                  </div>

                  <p className="text-sm text-muted-foreground text-center">وجه الكاميرا نحو رمز QR على التذكرة</p>
                </div>
              )}
            </OliveCardContent>
          </OliveCard>
        </div>

        {/* Ticket Info */}
        <div className="space-y-6">
          {scannedTicket ? (
            <OliveCard>
              <OliveCardHeader>
                <OliveCardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  {t('qr.ticketInfo')}
                </OliveCardTitle>
              </OliveCardHeader>
              <OliveCardContent className="space-y-6">
                <div className="text-center border-b pb-4">
                  <h3 className="text-2xl font-bold text-primary mb-2">#{scannedTicket.id}</h3>
                  <Badge className={getStatusColor(scannedTicket.status)}>{t(`tickets.${scannedTicket.status}`)}</Badge>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <User className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">اسم العميل</p>
                      <p className="font-semibold">{scannedTicket.clientName}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Scale className="h-5 w-5 text-muted-foreground" />
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground">الأوزان</p>
                      <div className="grid grid-cols-3 gap-2 text-sm">
                        <div><span className="text-muted-foreground">داخل:</span><span className="font-medium ml-1">{scannedTicket.weightIn} كيلو</span></div>
                        {typeof scannedTicket.weightOut === 'number' && (
                          <div><span className="text-muted-foreground">خارج:</span><span className="font-medium ml-1">{scannedTicket.weightOut} كيلو</span></div>
                        )}
                        {typeof scannedTicket.netWeight === 'number' && (
                          <div><span className="text-muted-foreground">صافي:</span><span className="font-medium ml-1 text-primary">{scannedTicket.netWeight} كيلو</span></div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">تاريخ الاستلام</p>
                      <p className="font-semibold">
                        {new Date(scannedTicket.dateReceived).toLocaleDateString('ar-TN', { year: 'numeric', month: 'numeric', day: 'numeric' })}
                      </p>
                    </div>
                  </div>

                  {(typeof scannedTicket.unitPrice === 'number' || typeof scannedTicket.totalAmount === 'number') && (
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div><span className="text-muted-foreground">سعر الكيلو:</span><span className="font-medium ml-1">{fmtTND(scannedTicket.unitPrice)}</span></div>
                      <div>
                        <span className="text-muted-foreground">الإجمالي:</span>
                        <span className="font-medium ml-1 text-primary">
                          {fmtTND(
                            typeof scannedTicket.totalAmount === 'number'
                              ? scannedTicket.totalAmount
                              : (scannedTicket.netWeight ?? 0) * (scannedTicket.unitPrice ?? 0)
                          )}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {user?.role === 'scanner' ? (
                  <div className="flex gap-2 pt-4 border-t">
                    <OliveButton onClick={handleApprove} className="flex-1 gap-2" variant="success">
                      <Check className="h-4 w-4" /> {t('actions.approve')}
                    </OliveButton>
                    <OliveButton onClick={handleReject} className="flex-1 gap-2" variant="error">
                      <X className="h-4 w-4" /> {t('actions.reject')}
                    </OliveButton>
                  </div>
                ) : (
                  <div className="flex gap-2 pt-4 border-t">
                    <OliveButton onClick={resetScanner} className="flex-1 gap-2">
                      <RotateCcw className="h-4 w-4" /> {t('qr.scanAnother')}
                    </OliveButton>
                  </div>
                )}
              </OliveCardContent>
            </OliveCard>
          ) : (
            <OliveCard>
              <OliveCardContent className="flex flex-col items-center justify-center py-16">
                <QrCode className="h-16 w-16 text-muted-foreground mb-4 opacity-50" />
                <h3 className="text-xl font-semibold mb-2 text-muted-foreground">في انتظار المسح</h3>
                <p className="text-muted-foreground text-center">ستظهر معلومات التذكرة هنا بعد مسح رمز QR</p>
              </OliveCardContent>
            </OliveCard>
          )}
        </div>
      </div>

      {/* ---- Upload/Edit Modal ---- */}
      {uploadModalOpen && uploadedTicket && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 rounded-lg p-8 w-full max-w-lg shadow-lg relative">
            <button className="absolute top-2 right-2 text-gray-500" onClick={() => setUploadModalOpen(false)}>
              <X className="h-5 w-5" />
            </button>

            <h2 className="text-2xl font-bold mb-4 text-primary">معلومات التذكرة</h2>

            {/* Static info */}
            <div className="space-y-2 mb-4 text-sm">
              <div>رقم التذكرة: <span className="font-semibold">{uploadedTicket.id}</span></div>
              <div>اسم العميل: <span className="font-semibold">{uploadedTicket.clientName}</span></div>
            </div>

            {/* Editable fields */}
            <div className="grid grid-cols-2 gap-3 mb-3">
              <label className="text-sm">
                <span className="block mb-1">الوزن داخل (كيلو)</span>
                <input type="number" step="0.01" className="w-full border rounded px-2 py-1 bg-background"
                  value={form.weightIn} onChange={(e) => setForm((p) => ({ ...p, weightIn: e.target.value }))}/>
              </label>
              <label className="text-sm">
                <span className="block mb-1">الوزن خارج (كيلو)</span>
                <input type="number" step="0.01" className="w-full border rounded px-2 py-1 bg-background"
                  value={form.weightOut} onChange={(e) => setForm((p) => ({ ...p, weightOut: e.target.value }))} placeholder="اتركه فارغًا إن لم يوجد"/>
              </label>
              <label className="text-sm">
                <span className="block mb-1">عدد الصناديق</span>
                <input type="number" className="w-full border rounded px-2 py-1 bg-background"
                  value={form.numberOfBoxes} onChange={(e) => setForm((p) => ({ ...p, numberOfBoxes: e.target.value }))}/>
              </label>
              <label className="text-sm">
                <span className="block mb-1">سعر الكيلو</span>
                <input type="number" step="0.01" className="w-full border rounded px-2 py-1 bg-background"
                  value={form.unitPrice} onChange={(e) => setForm((p) => ({ ...p, unitPrice: e.target.value }))}/>
              </label>
            </div>

            {/* Derived values */}
            <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
              <div className="p-2 rounded bg-muted/40">
                <div className="text-muted-foreground">الوزن الصافي</div>
                <div className="font-semibold text-primary">{netFromForm.toFixed(2)} كيلو</div>
              </div>
              <div className="p-2 rounded bg-muted/40">
                <div className="text-muted-foreground">الإجمالي</div>
                <div className="font-semibold text-primary">{fmtTND(totalFromForm)}</div>
              </div>
            </div>

            {/* Status & Paid */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              <label className="text-sm">
                <span className="block mb-1">الحالة</span>
                <select className="w-full border rounded px-2 py-1 bg-background"
                  value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value as Status }))}>
                  <option value="draft">{t('tickets.draft')}</option>
                  <option value="confirmed">{t('tickets.confirmed')}</option>
                  <option value="paid">{t('tickets.paid')}</option>
                </select>
              </label>
              <label className="text-sm">
                <span className="block mb-1">المبلغ المدفوع</span>
                <input type="number" step="0.01" className="w-full border rounded px-2 py-1 bg-background"
                  value={form.amountPaid} onChange={(e) => setForm((p) => ({ ...p, amountPaid: e.target.value }))} placeholder="أدخل المبلغ"/>
              </label>
            </div>

            <OliveButton onClick={handleSaveChanges} disabled={isSaving || !form.weightIn} className="w-full">
              {isSaving ? 'جارٍ الحفظ...' : 'حفظ التغييرات'}
            </OliveButton>
          </div>
        </div>
      )}
    </div>
  );
}
