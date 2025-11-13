import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/integrations/api/client';
import { CreditCard, Banknote, Building, FileText, DollarSign } from 'lucide-react';

interface Ticket {
  id: string;
  clientId: string;
  clientName: string;
  totalAmount?: number;
  isPaid?: boolean;
  status: string;
}

interface Invoice {
  id: number;
  amount: number;
  status: 'draft' | 'sent' | 'paid' | 'overdue';
  issue_date: string;
  due_date: string;
  notes?: string;
  payments?: Payment[];
}

interface Payment {
  id: number;
  amount: number;
  payment_date: string;
  payment_method: 'cash' | 'check' | 'bank_transfer' | 'card';
  reference?: string;
}

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticket: Ticket | null;
  onPaymentComplete: () => void;
}

export function PaymentModal({ isOpen, onClose, ticket, onPaymentComplete }: PaymentModalProps) {
  const { toast } = useToast();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loadingInvoice, setLoadingInvoice] = useState(false);
  const [processing, setProcessing] = useState(false);
  
  const [paymentData, setPaymentData] = useState({
    amount: '',
    payment_method: 'cash' as const,
    reference: '',
    notes: ''
  });

  // Load or create invoice for the ticket
  useEffect(() => {
    if (ticket && isOpen) {
      loadOrCreateInvoice();
      setPaymentData({
        amount: ticket.totalAmount?.toString() || '',
        payment_method: 'cash',
        reference: '',
        notes: ''
      });
    }
  }, [ticket, isOpen]);

  const loadOrCreateInvoice = async () => {
    if (!ticket) return;
    
    setLoadingInvoice(true);
    try {
      // First, try to find existing invoice for this batch
      const invoicesRes = await api.get(`/invoices?batchId=${ticket.id}`);
      const invoicesData = invoicesRes as any;
      const invoices = invoicesData?.data?.invoices || invoicesData?.data || invoicesData || [];
      
      if (invoices.length > 0) {
        setInvoice(invoices[0]);
      } else {
        // Create new invoice
        const newInvoiceRes = await api.post('/invoices', {
          clientId: parseInt(ticket.clientId),
          batchId: parseInt(ticket.id),
          amount: ticket.totalAmount || 0,
          due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days from now
          notes: `فاتورة عن التذكرة رقم ${ticket.id}`
        });
        
        const invoiceData = newInvoiceRes as any;
        setInvoice(invoiceData?.data || invoiceData);
      }
    } catch (error: any) {
      console.error('Error loading/creating invoice:', error);
      toast({
        variant: 'destructive',
        title: 'خطأ',
        description: 'فشل في تحميل بيانات الفاتورة'
      });
    } finally {
      setLoadingInvoice(false);
    }
  };

  const handlePayment = async () => {
    if (!invoice || !paymentData.amount) {
      toast({
        variant: 'destructive',
        title: 'خطأ',
        description: 'يرجى إدخال مبلغ الدفع'
      });
      return;
    }

    const amount = parseFloat(paymentData.amount);
    if (amount <= 0 || amount > invoice.amount) {
      toast({
        variant: 'destructive',
        title: 'خطأ',
        description: 'مبلغ الدفع غير صحيح'
      });
      return;
    }

    setProcessing(true);
    try {
      // Record payment
      await api.post('/payments', {
        invoiceId: invoice.id,
        amount: amount,
        payment_method: paymentData.payment_method,
        reference: paymentData.reference || undefined
      });

      // Update batch status if fully paid
      const totalPaid = (invoice.payments?.reduce((sum, p) => sum + p.amount, 0) || 0) + amount;
      if (totalPaid >= invoice.amount) {
        await api.put(`/batches/${ticket!.id}`, {
          status: 'paid',
          is_paid: true,
          payment_method: paymentData.payment_method,
          payment_reference: paymentData.reference || undefined,
          date_paid: new Date().toISOString()
        });
      }

      toast({
        title: 'تم بنجاح',
        description: 'تم تسجيل الدفع بنجاح'
      });

      onPaymentComplete();
      onClose();
    } catch (error: any) {
      console.error('Error processing payment:', error);
      toast({
        variant: 'destructive',
        title: 'خطأ',
        description: error?.message || 'فشل في تسجيل الدفع'
      });
    } finally {
      setProcessing(false);
    }
  };

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case 'cash': return <Banknote className="h-4 w-4" />;
      case 'card': return <CreditCard className="h-4 w-4" />;
      case 'bank_transfer': return <Building className="h-4 w-4" />;
      case 'check': return <FileText className="h-4 w-4" />;
      default: return <DollarSign className="h-4 w-4" />;
    }
  };

  const getPaymentMethodLabel = (method: string) => {
    switch (method) {
      case 'cash': return 'نقدي';
      case 'card': return 'بطاقة ائتمانية';
      case 'bank_transfer': return 'حوالة بنكية';
      case 'check': return 'شيك';
      default: return method;
    }
  };

  const remainingAmount = invoice ? invoice.amount - (invoice.payments?.reduce((sum, p) => sum + p.amount, 0) || 0) : 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            تسجيل دفع للتذكرة #{ticket?.id}
          </DialogTitle>
          <DialogDescription>
            إدارة دفعات العميل {ticket?.clientName}
          </DialogDescription>
        </DialogHeader>

        {loadingInvoice ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="text-sm text-muted-foreground mt-2">جاري تحميل بيانات الفاتورة...</p>
          </div>
        ) : invoice ? (
          <div className="space-y-6">
            {/* Invoice Summary */}
            <div className="p-4 border rounded-lg bg-muted/50">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-muted-foreground">رقم الفاتورة:</span>
                <span className="font-medium">#{invoice.id}</span>
              </div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-muted-foreground">المبلغ الإجمالي:</span>
                <span className="font-bold text-lg">{invoice.amount.toFixed(2)} دينار</span>
              </div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-muted-foreground">المبلغ المتبقي:</span>
                <span className="font-bold text-lg text-red-600">
                  {remainingAmount.toFixed(2)} دينار
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">حالة الفاتورة:</span>
                <Badge className={
                  invoice.status === 'paid' ? 'bg-green-100 text-green-800' :
                  invoice.status === 'overdue' ? 'bg-red-100 text-red-800' :
                  'bg-yellow-100 text-yellow-800'
                }>
                  {invoice.status === 'paid' ? 'مدفوعة' :
                   invoice.status === 'overdue' ? 'متأخرة' :
                   invoice.status === 'sent' ? 'مرسلة' : 'مسودة'}
                </Badge>
              </div>
            </div>

            {/* Previous Payments */}
            {invoice.payments && invoice.payments.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">الدفعات السابقة:</Label>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {invoice.payments.map((payment) => (
                    <div key={payment.id} className="flex justify-between items-center p-2 border rounded bg-background">
                      <div className="flex items-center gap-2">
                        {getPaymentMethodIcon(payment.payment_method)}
                        <span className="text-sm">{getPaymentMethodLabel(payment.payment_method)}</span>
                        {payment.reference && (
                          <span className="text-xs text-muted-foreground">({payment.reference})</span>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="font-medium">{payment.amount.toFixed(2)} دينار</div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(payment.payment_date).toLocaleDateString('ar-EG')}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* New Payment Form */}
            {remainingAmount > 0 && (
              <div className="space-y-4">
                <Label className="text-sm font-medium">دفعة جديدة:</Label>
                
                <div className="space-y-2">
                  <Label htmlFor="amount">المبلغ *</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    max={remainingAmount}
                    value={paymentData.amount}
                    onChange={(e) => setPaymentData(prev => ({ ...prev, amount: e.target.value }))}
                    placeholder={`الحد الأقصى: ${remainingAmount.toFixed(2)}`}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="payment_method">طريقة الدفع *</Label>
                  <Select
                    value={paymentData.payment_method}
                    onValueChange={(value: any) => setPaymentData(prev => ({ ...prev, payment_method: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">
                        <div className="flex items-center gap-2">
                          <Banknote className="h-4 w-4" />
                          نقدي
                        </div>
                      </SelectItem>
                      <SelectItem value="card">
                        <div className="flex items-center gap-2">
                          <CreditCard className="h-4 w-4" />
                          بطاقة ائتمانية
                        </div>
                      </SelectItem>
                      <SelectItem value="bank_transfer">
                        <div className="flex items-center gap-2">
                          <Building className="h-4 w-4" />
                          حوالة بنكية
                        </div>
                      </SelectItem>
                      <SelectItem value="check">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          شيك
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reference">مرجع الدفع (اختياري)</Label>
                  <Input
                    id="reference"
                    value={paymentData.reference}
                    onChange={(e) => setPaymentData(prev => ({ ...prev, reference: e.target.value }))}
                    placeholder="رقم المعاملة أو المرجع"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">ملاحظات (اختياري)</Label>
                  <Textarea
                    id="notes"
                    value={paymentData.notes}
                    onChange={(e) => setPaymentData(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="أي ملاحظات إضافية"
                    rows={2}
                  />
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4 border-t">
              {remainingAmount > 0 ? (
                <Button
                  onClick={handlePayment}
                  disabled={processing || !paymentData.amount}
                  className="flex-1"
                >
                  {processing ? 'جاري التسجيل...' : 'تسجيل الدفع'}
                </Button>
              ) : (
                <div className="flex-1 text-center text-green-600 font-medium">
                  ✅ تم دفع الفاتورة بالكامل
                </div>
              )}
              <Button variant="outline" onClick={onClose} className="flex-1">
                إغلاق
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-muted-foreground">فشل في تحميل بيانات الفاتورة</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
