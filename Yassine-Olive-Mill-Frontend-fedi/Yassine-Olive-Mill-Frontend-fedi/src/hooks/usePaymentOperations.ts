import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/integrations/api/client';

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

export function usePaymentOperations() {
  const { toast } = useToast();
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isPaymentHistoryOpen, setIsPaymentHistoryOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [selectedClientName, setSelectedClientName] = useState<string>('');

  // Open payment modal for a specific ticket
  const openPaymentModal = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setIsPaymentModalOpen(true);
  };

  // Close payment modal
  const closePaymentModal = () => {
    setIsPaymentModalOpen(false);
    setSelectedTicket(null);
  };

  // Open payment history for a client or all payments
  const openPaymentHistory = (clientId?: string, clientName?: string) => {
    setSelectedClientId(clientId || '');
    setSelectedClientName(clientName || '');
    setIsPaymentHistoryOpen(true);
  };

  // Close payment history modal
  const closePaymentHistory = () => {
    setIsPaymentHistoryOpen(false);
    setSelectedClientId('');
    setSelectedClientName('');
  };

  // Get invoice for a ticket
  const getOrCreateInvoice = async (ticket: Ticket): Promise<Invoice | null> => {
    try {
      // First, try to find existing invoice for this batch
      const invoicesRes = await api.get(`/invoices?batchId=${ticket.id}`);
      const invoicesData = invoicesRes as any;
      const invoices = invoicesData?.data?.invoices || invoicesData?.data || invoicesData || [];
      
      if (invoices.length > 0) {
        return invoices[0];
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
        return invoiceData?.data || invoiceData;
      }
    } catch (error: any) {
      console.error('Error loading/creating invoice:', error);
      toast({
        variant: 'destructive',
        title: 'خطأ',
        description: 'فشل في تحميل بيانات الفاتورة'
      });
      return null;
    }
  };

  // Process payment for an invoice
  const processPayment = async (
    invoiceId: number,
    amount: number,
    paymentMethod: string,
    reference?: string
  ): Promise<boolean> => {
    try {
      // Record payment
      await api.post('/payments', {
        invoiceId,
        amount,
        payment_method: paymentMethod,
        reference: reference || undefined
      });

      toast({
        title: 'تم بنجاح',
        description: 'تم تسجيل الدفع بنجاح'
      });

      return true;
    } catch (error: any) {
      console.error('Error processing payment:', error);
      toast({
        variant: 'destructive',
        title: 'خطأ',
        description: error?.message || 'فشل في تسجيل الدفع'
      });
      return false;
    }
  };

  // Get payment history for client
  const getPaymentHistory = async (clientId?: string): Promise<Payment[]> => {
    try {
      const paymentsRes = await api.get('/payments');
      const paymentsData = paymentsRes as any;
      let allPayments = paymentsData?.data?.payments || paymentsData?.data || paymentsData || [];

      // Filter by client if specified
      if (clientId) {
        allPayments = allPayments.filter((payment: any) => 
          payment.invoice?.client?.id === parseInt(clientId)
        );
      }

      // Sort by payment date (newest first)
      allPayments.sort((a: any, b: any) => 
        new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime()
      );

      return allPayments;
    } catch (error: any) {
      console.error('Error loading payment history:', error);
      toast({
        variant: 'destructive',
        title: 'خطأ',
        description: 'فشل في تحميل تاريخ الدفعات'
      });
      return [];
    }
  };

  // Get payment statistics
  const getPaymentStats = async (clientId?: string) => {
    try {
      const payments = await getPaymentHistory(clientId);
      const totalPaid = payments.reduce((sum: number, payment: any) => sum + payment.amount, 0);
      const totalTransactions = payments.length;
      
      // Group by payment method
      const methodStats = payments.reduce((stats: any, payment: any) => {
        const method = payment.payment_method;
        if (!stats[method]) {
          stats[method] = { count: 0, total: 0 };
        }
        stats[method].count++;
        stats[method].total += payment.amount;
        return stats;
      }, {});

      return {
        totalPaid,
        totalTransactions,
        methodStats,
        averagePayment: totalTransactions > 0 ? totalPaid / totalTransactions : 0
      };
    } catch (error) {
      console.error('Error calculating payment stats:', error);
      return {
        totalPaid: 0,
        totalTransactions: 0,
        methodStats: {},
        averagePayment: 0
      };
    }
  };

  // Check if ticket has outstanding balance
  const hasOutstandingBalance = async (ticket: Ticket): Promise<boolean> => {
    const invoice = await getOrCreateInvoice(ticket);
    if (!invoice) return false;

    const totalPaid = invoice.payments?.reduce((sum, p) => sum + p.amount, 0) || 0;
    return totalPaid < invoice.amount;
  };

  return {
    // State
    isPaymentModalOpen,
    isPaymentHistoryOpen,
    selectedTicket,
    selectedClientId,
    selectedClientName,

    // Actions
    openPaymentModal,
    closePaymentModal,
    openPaymentHistory,
    closePaymentHistory,

    // Payment operations
    getOrCreateInvoice,
    processPayment,
    getPaymentHistory,
    getPaymentStats,
    hasOutstandingBalance,
  };
}
