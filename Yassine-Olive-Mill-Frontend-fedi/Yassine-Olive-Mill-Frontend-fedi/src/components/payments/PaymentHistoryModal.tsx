import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/integrations/api/client';
import { 
  CreditCard, 
  Banknote, 
  Building, 
  FileText, 
  DollarSign, 
  Calendar,
  Receipt,
  History
} from 'lucide-react';

interface Payment {
  id: number;
  amount: number;
  payment_date: string;
  payment_method: 'cash' | 'check' | 'bank_transfer' | 'card';
  reference?: string;
  invoice: {
    id: number;
    amount: number;
    status: string;
    issue_date: string;
    client: {
      id: number;
      firstname: string;
      lastname: string;
    };
  };
}

interface PaymentHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientId?: string;
  clientName?: string;
}

export function PaymentHistoryModal({ isOpen, onClose, clientId, clientName }: PaymentHistoryModalProps) {
  const { toast } = useToast();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalPaid, setTotalPaid] = useState(0);

  useEffect(() => {
    if (isOpen) {
      loadPaymentHistory();
    }
  }, [isOpen, clientId]);

  const loadPaymentHistory = async () => {
    setLoading(true);
    try {
      // Load all payments
      const paymentsRes = await api.get('/payments');
      const paymentsData = paymentsRes as any;
      let allPayments = paymentsData?.data?.payments || paymentsData?.data || paymentsData || [];

      // Filter by client if specified
      if (clientId) {
        allPayments = allPayments.filter((payment: Payment) => 
          payment.invoice?.client?.id === parseInt(clientId)
        );
      }

      // Sort by payment date (newest first)
      allPayments.sort((a: Payment, b: Payment) => 
        new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime()
      );

      setPayments(allPayments);
      
      // Calculate total paid
      const total = allPayments.reduce((sum: number, payment: Payment) => sum + payment.amount, 0);
      setTotalPaid(total);
      
    } catch (error: any) {
      console.error('Error loading payment history:', error);
      toast({
        variant: 'destructive',
        title: 'خطأ',
        description: 'فشل في تحميل تاريخ الدفعات'
      });
    } finally {
      setLoading(false);
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-green-100 text-green-800">مدفوعة</Badge>;
      case 'overdue':
        return <Badge className="bg-red-100 text-red-800">متأخرة</Badge>;
      case 'sent':
        return <Badge className="bg-blue-100 text-blue-800">مرسلة</Badge>;
      default:
        return <Badge className="bg-yellow-100 text-yellow-800">مسودة</Badge>;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            تاريخ الدفعات
            {clientName && ` - ${clientName}`}
          </DialogTitle>
          <DialogDescription>
            عرض جميع الدفعات {clientName ? `للعميل ${clientName}` : 'في النظام'}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="text-sm text-muted-foreground mt-2">جاري تحميل تاريخ الدفعات...</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Summary */}
            <div className="p-4 border rounded-lg bg-muted/50">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">إجمالي الدفعات:</span>
                <span className="font-bold text-lg text-green-600">
                  {totalPaid.toFixed(2)} دينار
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">عدد الدفعات:</span>
                <span className="font-medium">{payments.length} دفعة</span>
              </div>
            </div>

            {/* Payments List */}
            <ScrollArea className="h-[400px]">
              <div className="space-y-3">
                {payments.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Receipt className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>لا توجد دفعات مسجلة</p>
                  </div>
                ) : (
                  payments.map((payment) => (
                    <div key={payment.id} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                      <div className="flex justify-between items-start mb-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            {getPaymentMethodIcon(payment.payment_method)}
                            <span className="font-medium">{getPaymentMethodLabel(payment.payment_method)}</span>
                            {payment.reference && (
                              <Badge variant="outline" className="text-xs">
                                {payment.reference}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Calendar className="h-4 w-4" />
                            {new Date(payment.payment_date).toLocaleDateString('ar-EG', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-lg text-green-600">
                            {payment.amount.toFixed(2)} دينار
                          </div>
                          <div className="text-xs text-muted-foreground">
                            دفعة #{payment.id}
                          </div>
                        </div>
                      </div>

                      {/* Invoice Info */}
                      <div className="border-t pt-3 mt-3">
                        <div className="flex justify-between items-center text-sm">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <Receipt className="h-4 w-4 text-muted-foreground" />
                              <span>فاتورة #{payment.invoice.id}</span>
                              {getStatusBadge(payment.invoice.status)}
                            </div>
                            {!clientName && payment.invoice.client && (
                              <div className="text-muted-foreground">
                                العميل: {payment.invoice.client.firstname} {payment.invoice.client.lastname}
                              </div>
                            )}
                          </div>
                          <div className="text-right">
                            <div className="text-muted-foreground">
                              مبلغ الفاتورة: {payment.invoice.amount.toFixed(2)} دينار
                            </div>
                            <div className="text-xs text-muted-foreground">
                              تاريخ الإصدار: {new Date(payment.invoice.issue_date).toLocaleDateString('ar-EG')}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4 border-t">
              <Button onClick={loadPaymentHistory} variant="outline" className="flex-1">
                تحديث
              </Button>
              <Button onClick={onClose} className="flex-1">
                إغلاق
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
