import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/integrations/api/client';
import { 
  X, Plus, Edit3, Search, Filter, Calendar, 
  DollarSign, Users, Receipt, ArrowUpDown, 
  Save, XCircle, CheckCircle, TrendingUp, 
  TrendingDown, Wallet, FileText, Download, Package, Trash2, 
  BarChart3, Eye, History
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

// Types
type ContainerRef = { id: number; label: string };

type OwnerFund = {
  id: number;
  date: string; // ISO date
  startingFunds: number;
  allocatedContainers: ContainerRef[];
  relatedSales: number[]; // sale/invoice ids
  amountSpent: number;
  balance: number;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
};

type Worker = {
  id: number;
  firstName: string;
  lastName: string;
  phone?: string;
  status: 'active' | 'inactive';
  createdOn: string;
  totalPaid?: number;
  outstandingBalance?: number;
};

type WorkerPayment = {
  id: number;
  date: string;
  workerId: number;
  amount: number;
  type: 'advance' | 'salary' | 'other';
  method: 'cash' | 'transfer' | 'check';
  notes?: string;
  createdAt?: string;
};

type Expense = {
  id: number;
  date: string;
  category: 'equipment' | 'repair' | 'supplies' | 'utilities' | 'maintenance' | 'fuel' | 'other';
  item: string;
  amount: number;
  vendor?: string;
  notes?: string;
  receipt_reference?: string;
  createdAt?: string;
};

type ExportPayment = {
  id: number;
  containerId: number;
  amount: number;
  payment_date: string;
  payment_method: string;
  payment_type: 'incoming';
  buyer_name?: string;
  buyer_contact?: string;
  reference?: string;
  notes?: string;
  container?: {
    id: number;
    label: string;
  };
  createdAt?: string;
  updatedAt?: string;
};

type TicketPayment = {
  id: number;
  ticketId: number;
  amount: number;
  payment_date: string;
  payment_method: string;
  payment_type: 'incoming' | 'outgoing';
  operation_type: 'sale' | 'pressing';
  reference?: string;
  notes?: string;
  ticket?: {
    id: number;
    ticketNumber?: string;
    client?: {
      id: number;
      firstname?: string;
      lastname?: string;
      name?: string;
      phone?: string;
    };
  };
  createdAt?: string;
  updatedAt?: string;
};

type SortConfig = {
  key: string;
  direction: 'asc' | 'desc';
};

export function PaymentsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const isAdmin = user?.role === 'admin';

  const [tab, setTab] = useState<'summary' | 'owner' | 'workers' | 'expenses' | 'sales' | 'ticketPayments'>('summary');
  const [selectedWorkerForHistory, setSelectedWorkerForHistory] = useState<Worker | null>(null);
  const [loading, setLoading] = useState(false);

  // Containers
  const [containers, setContainers] = useState<ContainerRef[]>([]);

  // Owner funds state
  const [ownerFunds, setOwnerFunds] = useState<OwnerFund[]>([]);
  const [showStartingAmountModal, setShowStartingAmountModal] = useState(false);
  const [startingAmount, setStartingAmount] = useState<number>(0);
  const [ownerDateFilter, setOwnerDateFilter] = useState<string>('');
  const [ownerSearch, setOwnerSearch] = useState<string>('');
  const [editingOwnerFund, setEditingOwnerFund] = useState<OwnerFund | null>(null);
  const [ownerSort, setOwnerSort] = useState<SortConfig>({ key: 'date', direction: 'desc' });

  // Workers and payments state
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [workerPayments, setWorkerPayments] = useState<WorkerPayment[]>([]);
  const [showWorkerModal, setShowWorkerModal] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  const [workerDraft, setWorkerDraft] = useState<Partial<Worker>>({ firstName: '', lastName: '', status: 'active' });
  const [paymentDraft, setPaymentDraft] = useState<Partial<WorkerPayment>>({ 
    date: new Date().toISOString().slice(0,10), 
    type: 'advance', 
    method: 'cash' 
  });
  const [workerSearch, setWorkerSearch] = useState<string>('');
  const [workerStatusFilter, setWorkerStatusFilter] = useState<string>('all');
  const [editingWorker, setEditingWorker] = useState<Worker | null>(null);
  const [editingPayment, setEditingPayment] = useState<WorkerPayment | null>(null);

  // Expenses state
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [expenseDraft, setExpenseDraft] = useState<Partial<Expense>>({ 
    date: new Date().toISOString().slice(0,10), 
    category: 'other' 
  });
  const [expenseSearch, setExpenseSearch] = useState<string>('');
  const [expenseCategoryFilter, setExpenseCategoryFilter] = useState<string>('all');
  const [expenseDateFilter, setExpenseDateFilter] = useState<string>('');
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [expenseSort, setExpenseSort] = useState<SortConfig>({ key: 'date', direction: 'desc' });

  // Export payments (Oil Sales) state - READ ONLY
  const [exportPayments, setExportPayments] = useState<ExportPayment[]>([]);
  const [exportPaymentSearch, setExportPaymentSearch] = useState<string>('');
  const [exportPaymentDateFilter, setExportPaymentDateFilter] = useState<string>('');
  const [exportPaymentBuyerFilter, setExportPaymentBuyerFilter] = useState<string>('');
  const [exportPaymentSort, setExportPaymentSort] = useState<SortConfig>({ key: 'payment_date', direction: 'desc' });

  // Ticket payments state - READ ONLY
  const [ticketPayments, setTicketPayments] = useState<TicketPayment[]>([]);
  const [ticketPaymentSearch, setTicketPaymentSearch] = useState<string>('');
  const [ticketPaymentDateFilter, setTicketPaymentDateFilter] = useState<string>('');
  const [ticketPaymentTypeFilter, setTicketPaymentTypeFilter] = useState<string>('all');
  const [ticketPaymentSort, setTicketPaymentSort] = useState<SortConfig>({ key: 'payment_date', direction: 'desc' });

  // Load containers
  useEffect(() => {
    const loadContainers = async () => {
      try {
        const data = await api.get<any[]>('/containers');
        setContainers((data || []).map(c => ({ id: c.id, label: c.label })));
      } catch (error) {
        console.error('Error loading containers:', error);
      }
    };
    loadContainers();
  }, []);

  // Load export payments (Oil Sales) - READ ONLY
  useEffect(() => {
    const loadExportPayments = async () => {
      if (!isAdmin) return;
      try {
        setLoading(true);
        const response = await api.get<any>('/export-payments');
        // Handle both response formats: { success: true, data: { payments: [...] } } or direct array
        if (response?.success && response?.data?.payments) {
          setExportPayments(response.data.payments);
        } else if (response?.success && response?.data && Array.isArray(response.data)) {
          setExportPayments(response.data);
        } else if (Array.isArray(response)) {
          setExportPayments(response);
        }
      } catch (error: any) {
        console.error('Error loading export payments:', error);
        toast({ 
          variant: 'destructive', 
          title: 'خطأ', 
          description: error?.message || 'فشل تحميل مبيعات الزيت' 
        });
      } finally {
        setLoading(false);
      }
    };
    loadExportPayments();
  }, [isAdmin, toast]);

  // Load ticket payments - READ ONLY
  useEffect(() => {
    const loadTicketPayments = async () => {
      if (!isAdmin) return;
      try {
        setLoading(true);
        const response = await api.get<any>('/ticket-payments');
        // Handle response format: { success: true, data: { payments: [...] } }
        if (response?.success && response?.data?.payments) {
          setTicketPayments(response.data.payments);
        } else if (response?.success && response?.data && Array.isArray(response.data)) {
          setTicketPayments(response.data);
        } else if (Array.isArray(response)) {
          setTicketPayments(response);
        }
      } catch (error: any) {
        console.error('Error loading ticket payments:', error);
        toast({ 
          variant: 'destructive', 
          title: 'خطأ', 
          description: error?.message || 'فشل تحميل مدفوعات التذاكر' 
        });
      } finally {
        setLoading(false);
      }
    };
    loadTicketPayments();
  }, [isAdmin, toast]);

  // Check if today's session exists when switching to owner tab
  useEffect(() => {
    if (tab === 'owner' && isAdmin) {
      const today = new Date().toISOString().slice(0,10);
      const todaySession = ownerFunds.find(f => f.date === today);
      if (!todaySession && ownerFunds.length > 0) {
        // Only show modal if we've loaded data and there's no today session
        setShowStartingAmountModal(true);
      }
    }
  }, [tab, ownerFunds, isAdmin]);

  // Load owner funds
  useEffect(() => {
    const loadOwnerFunds = async () => {
      if (!isAdmin) return;
      try {
        setLoading(true);
        const response = await api.get<any>('/owner-funds');
        if (response?.success && response?.data?.funds) {
          setOwnerFunds(response.data.funds);
        } else if (response?.success && response?.data && Array.isArray(response.data)) {
          setOwnerFunds(response.data);
        } else if (Array.isArray(response)) {
          setOwnerFunds(response);
        }
      } catch (error: any) {
        console.error('Error loading owner funds:', error);
        toast({ 
          variant: 'destructive', 
          title: 'خطأ', 
          description: error?.message || 'فشل تحميل أموال المالك' 
        });
      } finally {
        setLoading(false);
      }
    };
    loadOwnerFunds();
  }, [isAdmin, toast]);

  // Load workers
  useEffect(() => {
    const loadWorkers = async () => {
      if (!isAdmin) return;
      try {
        setLoading(true);
        const response = await api.get<any>('/workers');
        if (response?.success && response?.data?.workers) {
          setWorkers(response.data.workers);
        } else if (response?.success && response?.data && Array.isArray(response.data)) {
          setWorkers(response.data);
        } else if (Array.isArray(response)) {
          setWorkers(response);
        }
      } catch (error: any) {
        console.error('Error loading workers:', error);
        toast({ 
          variant: 'destructive', 
          title: 'خطأ', 
          description: error?.message || 'فشل تحميل العمال' 
        });
      } finally {
        setLoading(false);
      }
    };
    loadWorkers();
  }, [isAdmin, toast]);

  // Load worker payments
  useEffect(() => {
    const loadWorkerPayments = async () => {
      if (!isAdmin) return;
      try {
        setLoading(true);
        const response = await api.get<any>('/worker-payments');
        if (response?.success && response?.data?.payments) {
          setWorkerPayments(response.data.payments);
        } else if (response?.success && response?.data && Array.isArray(response.data)) {
          setWorkerPayments(response.data);
        } else if (Array.isArray(response)) {
          setWorkerPayments(response);
        }
      } catch (error: any) {
        console.error('Error loading worker payments:', error);
        toast({ 
          variant: 'destructive', 
          title: 'خطأ', 
          description: error?.message || 'فشل تحميل مدفوعات العمال' 
        });
      } finally {
        setLoading(false);
      }
    };
    loadWorkerPayments();
  }, [isAdmin, toast]);

  // Load expenses
  useEffect(() => {
    const loadExpenses = async () => {
      if (!isAdmin) return;
      try {
        setLoading(true);
        const response = await api.get<any>('/payment-expenses');
        if (response?.success && response?.data?.expenses) {
          setExpenses(response.data.expenses);
        } else if (response?.success && response?.data && Array.isArray(response.data)) {
          setExpenses(response.data);
        } else if (Array.isArray(response)) {
          setExpenses(response);
        }
      } catch (error: any) {
        console.error('Error loading expenses:', error);
        toast({ 
          variant: 'destructive', 
          title: 'خطأ', 
          description: error?.message || 'فشل تحميل المصروفات' 
        });
      } finally {
        setLoading(false);
      }
    };
    loadExpenses();
  }, [isAdmin, toast]);

  // Derived totals and summaries
  const ownerTotals = useMemo(() => {
    const today = new Date().toISOString().slice(0,10);
    const todaySession = ownerFunds.find(f => f.date === today);
    
    // Calculate today's sales from export payments
    const todaySales = exportPayments
      .filter(ep => ep.payment_date === today)
      .reduce((sum, ep) => sum + Number(ep.amount || 0), 0);
    
    // Calculate today's expenses
    const todayExpenses = expenses
      .filter(e => e.date === today)
      .reduce((sum, e) => sum + (e.amount || 0), 0);
    
    if (todaySession) {
      const totalSales = todaySales;
      // amountSpent is already calculated from outgoing ticket payments
      const totalSpent = todayExpenses + (todaySession.amountSpent || 0);
      const balance = (todaySession.startingFunds || 0) + totalSales - totalSpent;
      
      return {
        startingFunds: todaySession.startingFunds,
        totalSpent,
        totalSales,
        balance,
        containers: todaySession.allocatedContainers.length,
        sales: todaySession.relatedSales.length
      };
    }
    return { 
      startingFunds: 0, 
      totalSpent: todayExpenses, 
      totalSales: todaySales,
      balance: todaySales - todayExpenses, 
      containers: 0, 
      sales: exportPayments.filter(ep => ep.payment_date === today).length 
    };
  }, [ownerFunds, exportPayments, expenses]);

  const workersSummary = useMemo(() => {
    const totalPaid = workerPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const byWorker: Record<number, number> = {};
    workerPayments.forEach(p => {
      byWorker[p.workerId] = (byWorker[p.workerId] || 0) + (p.amount || 0);
    });
    return { totalPaid, byWorker };
  }, [workerPayments]);

  // Calculate outstanding balances for workers
  const workersWithBalances = useMemo(() => {
    return workers.map(worker => {
      const totalPaid = workerPayments
        .filter(p => p.workerId === worker.id)
        .reduce((sum, p) => sum + Number(p.amount || 0), 0);
      // Outstanding balance calculation - can be enhanced based on salary logic
      const outstandingBalance = 0; // Placeholder for future salary calculation
      return { ...worker, totalPaid, outstandingBalance };
    });
  }, [workers, workerPayments]);

  const expensesTotal = useMemo(() => {
    return expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  }, [expenses]);

  // Export payments summary
  const exportPaymentsTotal = useMemo(() => {
    return exportPayments.reduce((sum, ep) => sum + Number(ep.amount || 0), 0);
  }, [exportPayments]);

  // Ticket payments calculation - outgoing (negative), incoming (positive)
  const ticketPaymentsCalculated = useMemo(() => {
    const incoming = ticketPayments
      .filter(tp => tp.payment_type === 'incoming')
      .reduce((sum, tp) => sum + Number(tp.amount || 0), 0);
    
    const outgoing = ticketPayments
      .filter(tp => tp.payment_type === 'outgoing')
      .reduce((sum, tp) => sum + Number(tp.amount || 0), 0);
    
    // Outgoing are negative, incoming are positive
    const netBalance = incoming - outgoing;
    
    return {
      incoming,
      outgoing,
      netBalance,
      incomingCount: ticketPayments.filter(tp => tp.payment_type === 'incoming').length,
      outgoingCount: ticketPayments.filter(tp => tp.payment_type === 'outgoing').length,
      totalCount: ticketPayments.length
    };
  }, [ticketPayments]);

  // Filtered ticket payments
  const filteredTicketPayments = useMemo(() => {
    let filtered = [...ticketPayments];
    
    if (ticketPaymentDateFilter) {
      filtered = filtered.filter(tp => tp.payment_date === ticketPaymentDateFilter);
    }
    
    if (ticketPaymentTypeFilter !== 'all') {
      filtered = filtered.filter(tp => tp.payment_type === ticketPaymentTypeFilter);
    }
    
    if (ticketPaymentSearch) {
      const search = ticketPaymentSearch.toLowerCase();
      filtered = filtered.filter(tp => 
        tp.ticket?.ticketNumber?.toLowerCase().includes(search) ||
        tp.ticket?.client?.firstname?.toLowerCase().includes(search) ||
        tp.ticket?.client?.lastname?.toLowerCase().includes(search) ||
        tp.ticket?.client?.name?.toLowerCase().includes(search) ||
        tp.reference?.toLowerCase().includes(search) ||
        tp.notes?.toLowerCase().includes(search)
      );
    }

    filtered.sort((a, b) => {
      const aVal = a[ticketPaymentSort.key as keyof TicketPayment];
      const bVal = b[ticketPaymentSort.key as keyof TicketPayment];
      if (ticketPaymentSort.direction === 'asc') {
        return aVal > bVal ? 1 : -1;
      }
      return aVal < bVal ? 1 : -1;
    });

    return filtered;
  }, [ticketPayments, ticketPaymentDateFilter, ticketPaymentTypeFilter, ticketPaymentSearch, ticketPaymentSort]);

  // Filtered export payments
  const filteredExportPayments = useMemo(() => {
    let filtered = [...exportPayments];
    
    if (exportPaymentDateFilter) {
      filtered = filtered.filter(ep => ep.payment_date === exportPaymentDateFilter);
    }
    
    if (exportPaymentBuyerFilter) {
      const search = exportPaymentBuyerFilter.toLowerCase();
      filtered = filtered.filter(ep => 
        ep.buyer_name?.toLowerCase().includes(search) ||
        ep.buyer_contact?.toLowerCase().includes(search)
      );
    }
    
    if (exportPaymentSearch) {
      const search = exportPaymentSearch.toLowerCase();
      filtered = filtered.filter(ep => 
        ep.container?.label?.toLowerCase().includes(search) ||
        ep.reference?.toLowerCase().includes(search) ||
        ep.notes?.toLowerCase().includes(search)
      );
    }

    filtered.sort((a, b) => {
      const aVal = a[exportPaymentSort.key as keyof ExportPayment];
      const bVal = b[exportPaymentSort.key as keyof ExportPayment];
      if (exportPaymentSort.direction === 'asc') {
        return aVal > bVal ? 1 : -1;
      }
      return aVal < bVal ? 1 : -1;
    });

    return filtered;
  }, [exportPayments, exportPaymentDateFilter, exportPaymentBuyerFilter, exportPaymentSearch, exportPaymentSort]);

  // Filtered and sorted data
  const filteredOwnerFunds = useMemo(() => {
    let filtered = [...ownerFunds];
    
    if (ownerDateFilter) {
      filtered = filtered.filter(f => f.date === ownerDateFilter);
    }
    
    if (ownerSearch) {
      const search = ownerSearch.toLowerCase();
      filtered = filtered.filter(f => 
        f.notes?.toLowerCase().includes(search) ||
        f.allocatedContainers.some(c => c.label.toLowerCase().includes(search))
      );
    }

    filtered.sort((a, b) => {
      const aVal = a[ownerSort.key as keyof OwnerFund];
      const bVal = b[ownerSort.key as keyof OwnerFund];
      if (ownerSort.direction === 'asc') {
        return aVal > bVal ? 1 : -1;
      }
      return aVal < bVal ? 1 : -1;
    });

    return filtered;
  }, [ownerFunds, ownerDateFilter, ownerSearch, ownerSort]);

  const filteredWorkers = useMemo(() => {
    let filtered = workersWithBalances;
    
    if (workerSearch) {
      const search = workerSearch.toLowerCase();
      filtered = filtered.filter(w => 
        w.firstName.toLowerCase().includes(search) ||
        w.lastName.toLowerCase().includes(search) ||
        w.phone?.toLowerCase().includes(search)
      );
    }
    
    if (workerStatusFilter !== 'all') {
      filtered = filtered.filter(w => w.status === workerStatusFilter);
    }

    return filtered;
  }, [workersWithBalances, workerSearch, workerStatusFilter]);

  const filteredExpenses = useMemo(() => {
    let filtered = [...expenses];
    
    if (expenseDateFilter) {
      filtered = filtered.filter(e => e.date === expenseDateFilter);
    }
    
    if (expenseCategoryFilter !== 'all') {
      filtered = filtered.filter(e => e.category === expenseCategoryFilter);
    }
    
    if (expenseSearch) {
      const search = expenseSearch.toLowerCase();
      filtered = filtered.filter(e => 
        e.item.toLowerCase().includes(search) ||
        e.vendor?.toLowerCase().includes(search) ||
        e.notes?.toLowerCase().includes(search)
      );
    }

    filtered.sort((a, b) => {
      const aVal = a[expenseSort.key as keyof Expense];
      const bVal = b[expenseSort.key as keyof Expense];
      if (expenseSort.direction === 'asc') {
        return aVal > bVal ? 1 : -1;
      }
      return aVal < bVal ? 1 : -1;
    });

    return filtered;
  }, [expenses, expenseDateFilter, expenseCategoryFilter, expenseSearch, expenseSort]);

  // Handlers
  const handleCreateTodaySession = async () => {
    if (!startingAmount || startingAmount <= 0) {
      toast({ variant: 'destructive', title: 'خطأ', description: 'يرجى إدخال مبلغ صحيح' });
      return;
    }

    try {
      setLoading(true);
      const today = new Date().toISOString().slice(0,10);
      const response = await api.post<{ success: boolean; data: OwnerFund }>('/owner-funds', {
        date: today,
        startingFunds: startingAmount,
        amountSpent: 0,
        notes: ''
      });
      
      if (response.success) {
        setOwnerFunds(prev => [response.data, ...prev]);
        setShowStartingAmountModal(false);
        setStartingAmount(0);
        toast({ title: 'تم بنجاح', description: 'تم إنشاء جلسة اليوم' });
      }
    } catch (error: any) {
      console.error('Error creating owner fund:', error);
      toast({ 
        variant: 'destructive', 
        title: 'خطأ', 
        description: error?.message || 'فشل إنشاء الجلسة' 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveOwnerFund = async (fund: OwnerFund) => {
    try {
      setLoading(true);
      // Note: amountSpent is calculated automatically from outgoing ticket payments
      const response = await api.put<{ success: boolean; data: OwnerFund }>(`/owner-funds/${fund.id}`, {
        startingFunds: fund.startingFunds,
        notes: fund.notes,
        allocatedContainers: fund.allocatedContainers.map(c => c.id)
      });
      
      if (response.success) {
        setOwnerFunds(prev => prev.map(f => f.id === fund.id ? response.data : f));
        setEditingOwnerFund(null);
        toast({ title: 'تم بنجاح', description: 'تم تحديث الجلسة' });
      }
    } catch (error: any) {
      console.error('Error updating owner fund:', error);
      toast({ 
        variant: 'destructive', 
        title: 'خطأ', 
        description: error?.message || 'فشل تحديث الجلسة' 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveWorker = async (worker: Worker) => {
    try {
      setLoading(true);
      if (editingWorker) {
        const response = await api.put<{ success: boolean; data: Worker }>(`/workers/${worker.id}`, {
          firstName: worker.firstName,
          lastName: worker.lastName,
          phone: worker.phone,
          status: worker.status
        });
        if (response.success) {
          setWorkers(prev => prev.map(w => w.id === worker.id ? response.data : w));
          setEditingWorker(null);
          toast({ title: 'تم بنجاح', description: 'تم تحديث العامل' });
        }
      } else {
        const response = await api.post<{ success: boolean; data: Worker }>('/workers', {
          firstName: worker.firstName,
          lastName: worker.lastName,
          phone: worker.phone,
          status: worker.status
        });
        if (response.success) {
          setWorkers(prev => [...prev, response.data]);
          setShowWorkerModal(false);
          toast({ title: 'تم بنجاح', description: 'تم إضافة العامل' });
        }
      }
      setWorkerDraft({ firstName: '', lastName: '', status: 'active' });
    } catch (error: any) {
      console.error('Error saving worker:', error);
      toast({ 
        variant: 'destructive', 
        title: 'خطأ', 
        description: error?.message || 'فشل حفظ العامل' 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSavePayment = async (payment: WorkerPayment) => {
    try {
      setLoading(true);
      if (editingPayment) {
        const response = await api.put<{ success: boolean; data: WorkerPayment }>(`/worker-payments/${payment.id}`, {
          date: payment.date,
          amount: payment.amount,
          type: payment.type,
          method: payment.method,
          notes: payment.notes
        });
        if (response.success) {
          setWorkerPayments(prev => prev.map(p => p.id === payment.id ? response.data : p));
          setEditingPayment(null);
          toast({ title: 'تم بنجاح', description: 'تم تحديث الدفع' });
        }
      } else {
        const response = await api.post<{ success: boolean; data: WorkerPayment }>('/worker-payments', {
          workerId: payment.workerId,
          date: payment.date,
          amount: payment.amount,
          type: payment.type,
          method: payment.method,
          notes: payment.notes
        });
        if (response.success) {
          setWorkerPayments(prev => [...prev, response.data]);
          setShowPayModal(false);
          toast({ title: 'تم بنجاح', description: 'تم تسجيل الدفع' });
        }
      }
      setPaymentDraft({ date: new Date().toISOString().slice(0,10), type: 'advance', method: 'cash' });
    } catch (error: any) {
      console.error('Error saving worker payment:', error);
      toast({ 
        variant: 'destructive', 
        title: 'خطأ', 
        description: error?.message || 'فشل حفظ الدفع' 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveExpense = async (expense: Expense) => {
    try {
      setLoading(true);
      if (editingExpense) {
        const response = await api.put<{ success: boolean; data: Expense }>(`/payment-expenses/${expense.id}`, {
          date: expense.date,
          category: expense.category,
          item: expense.item,
          amount: expense.amount,
          vendor: expense.vendor,
          notes: expense.notes,
          receipt_reference: expense.receipt_reference
        });
        if (response.success) {
          setExpenses(prev => prev.map(e => e.id === expense.id ? response.data : e));
          setEditingExpense(null);
          toast({ title: 'تم بنجاح', description: 'تم تحديث المصروف' });
        }
      } else {
        const response = await api.post<{ success: boolean; data: Expense }>('/payment-expenses', {
          date: expense.date,
          category: expense.category,
          item: expense.item,
          amount: expense.amount,
          vendor: expense.vendor,
          notes: expense.notes,
          receipt_reference: expense.receipt_reference
        });
        if (response.success) {
          setExpenses(prev => [...prev, response.data]);
          setShowExpenseModal(false);
          toast({ title: 'تم بنجاح', description: 'تم إضافة المصروف' });
        }
      }
      setExpenseDraft({ date: new Date().toISOString().slice(0,10), category: 'other' });
    } catch (error: any) {
      console.error('Error saving expense:', error);
      toast({ 
        variant: 'destructive', 
        title: 'خطأ', 
        description: error?.message || 'فشل حفظ المصروف' 
      });
    } finally {
      setLoading(false);
    }
  };

  // Export Payment handlers - REMOVED (read-only)

  // Delete handlers
  const handleDeleteWorker = async (id: number) => {
    if (!confirm('هل أنت متأكد من حذف هذا العامل؟')) return;
    
    try {
      setLoading(true);
      const response = await api.delete<{ success: boolean }>(`/workers/${id}`);
      if (response.success) {
        setWorkers(prev => prev.filter(w => w.id !== id));
        toast({ title: 'تم بنجاح', description: 'تم حذف العامل' });
      }
    } catch (error: any) {
      console.error('Error deleting worker:', error);
      toast({ 
        variant: 'destructive', 
        title: 'خطأ', 
        description: error?.message || 'فشل حذف العامل' 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteWorkerPayment = async (id: number) => {
    if (!confirm('هل أنت متأكد من حذف هذا الدفع؟')) return;
    
    try {
      setLoading(true);
      const response = await api.delete<{ success: boolean }>(`/worker-payments/${id}`);
      if (response.success) {
        setWorkerPayments(prev => prev.filter(p => p.id !== id));
        toast({ title: 'تم بنجاح', description: 'تم حذف الدفع' });
      }
    } catch (error: any) {
      console.error('Error deleting worker payment:', error);
      toast({ 
        variant: 'destructive', 
        title: 'خطأ', 
        description: error?.message || 'فشل حذف الدفع' 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteExpense = async (id: number) => {
    if (!confirm('هل أنت متأكد من حذف هذا المصروف؟')) return;
    
    try {
      setLoading(true);
      const response = await api.delete<{ success: boolean }>(`/payment-expenses/${id}`);
      if (response.success) {
        setExpenses(prev => prev.filter(e => e.id !== id));
        toast({ title: 'تم بنجاح', description: 'تم حذف المصروف' });
      }
    } catch (error: any) {
      console.error('Error deleting expense:', error);
      toast({ 
        variant: 'destructive', 
        title: 'خطأ', 
        description: error?.message || 'فشل حذف المصروف' 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteOwnerFund = async (id: number) => {
    if (!confirm('هل أنت متأكد من حذف هذه الجلسة؟')) return;
    
    try {
      setLoading(true);
      const response = await api.delete<{ success: boolean }>(`/owner-funds/${id}`);
      if (response.success) {
        setOwnerFunds(prev => prev.filter(f => f.id !== id));
        toast({ title: 'تم بنجاح', description: 'تم حذف الجلسة' });
      }
    } catch (error: any) {
      console.error('Error deleting owner fund:', error);
      toast({ 
        variant: 'destructive', 
        title: 'خطأ', 
        description: error?.message || 'فشل حذف الجلسة' 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (key: string, currentSort: SortConfig, setSort: (s: SortConfig) => void) => {
    setSort({
      key,
      direction: currentSort.key === key && currentSort.direction === 'asc' ? 'desc' : 'asc'
    });
  };

  // Excel export for Oil Sales
  const handleExportToExcel = () => {
    try {
      const dataToExport = filteredExportPayments.map(payment => ({
        'التاريخ': payment.payment_date,
        'الحاوية': payment.container?.label || `حاوية #${payment.containerId}`,
        'المبلغ (د.ت)': Number(payment.amount),
        'المشتري': payment.buyer_name || '',
        'معلومات التواصل': payment.buyer_contact || '',
        'طريقة الدفع': payment.payment_method === 'cash' ? 'نقداً' : 
                      payment.payment_method === 'transfer' ? 'تحويل' : 
                      payment.payment_method === 'check' ? 'شيك' : payment.payment_method,
        'المرجع': payment.reference || '',
        'ملاحظات': payment.notes || ''
      }));

      const worksheet = XLSX.utils.json_to_sheet(dataToExport);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'مبيعات الزيت');
      
      // Set column widths
      const maxWidth = 20;
      worksheet['!cols'] = Object.keys(dataToExport[0] || {}).map(() => ({ wch: maxWidth }));
      
      const fileName = `مبيعات_الزيت_${new Date().toISOString().slice(0, 10)}.xlsx`;
      XLSX.writeFile(workbook, fileName);
      
      toast({
        title: 'تم بنجاح',
        description: `تم تصدير ${filteredExportPayments.length} عملية بيع إلى Excel`
      });
    } catch (error: any) {
      console.error('Error exporting to Excel:', error);
      toast({
        variant: 'destructive',
        title: 'خطأ',
        description: error?.message || 'فشل تصدير البيانات'
      });
    }
  };

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="text-center">وصول محدود</CardTitle>
            <CardDescription className="text-center">
              هذه الصفحة محجوزة للمسؤولين فقط.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">المدفوعات والمصروفات</h1>
          <p className="text-muted-foreground mt-1">إدارة الأموال والمدفوعات والمصروفات اليومية</p>
        </div>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="space-y-4">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="summary" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            الملخص
          </TabsTrigger>
          <TabsTrigger value="owner" className="flex items-center gap-2">
            <Wallet className="h-4 w-4" />
            أموال المالك
          </TabsTrigger>
          <TabsTrigger value="sales" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            مبيعات الزيت
          </TabsTrigger>
          <TabsTrigger value="ticketPayments" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            مدفوعات التذاكر
          </TabsTrigger>
          <TabsTrigger value="workers" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            مدفوعات العمال
          </TabsTrigger>
          <TabsTrigger value="expenses" className="flex items-center gap-2">
            <Receipt className="h-4 w-4" />
            مصروفات المعصرة
          </TabsTrigger>
        </TabsList>

        {/* Summary Tab */}
        <TabsContent value="summary" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Income Summary */}
            <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-green-200 dark:border-green-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-400">
                  <TrendingUp className="h-5 w-5" />
                  الدخل (الإيرادات)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">مبيعات الزيت:</span>
                    <strong className="text-lg text-green-700 dark:text-green-400">
                      {exportPaymentsTotal.toLocaleString()} د.ت
                    </strong>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">مدفوعات التذاكر الواردة:</span>
                    <strong className="text-lg text-green-700 dark:text-green-400">
                      {ticketPaymentsCalculated.incoming.toLocaleString()} د.ت
                    </strong>
                  </div>
                  <div className="border-t pt-2 mt-2">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold">إجمالي الدخل:</span>
                      <strong className="text-xl text-green-700 dark:text-green-400">
                        {(exportPaymentsTotal + ticketPaymentsCalculated.incoming).toLocaleString()} د.ت
                      </strong>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Expenses Summary */}
            <Card className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 border-red-200 dark:border-red-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-700 dark:text-red-400">
                  <TrendingDown className="h-5 w-5" />
                  المصروفات
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">مدفوعات التذاكر الصادرة:</span>
                    <strong className="text-lg text-red-700 dark:text-red-400">
                      {ticketPaymentsCalculated.outgoing.toLocaleString()} د.ت
                    </strong>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">مدفوعات العمال:</span>
                    <strong className="text-lg text-red-700 dark:text-red-400">
                      {workersSummary.totalPaid.toLocaleString()} د.ت
                    </strong>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">مصروفات المعصرة:</span>
                    <strong className="text-lg text-red-700 dark:text-red-400">
                      {expensesTotal.toLocaleString()} د.ت
                    </strong>
                  </div>
                  <div className="border-t pt-2 mt-2">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold">إجمالي المصروفات:</span>
                      <strong className="text-xl text-red-700 dark:text-red-400">
                        {(ticketPaymentsCalculated.outgoing + workersSummary.totalPaid + expensesTotal).toLocaleString()} د.ت
                      </strong>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Net Balance */}
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200 dark:border-blue-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-blue-700 dark:text-blue-400">
                  <Wallet className="h-5 w-5" />
                  الرصيد الصافي
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-4">
                  <div className="text-4xl font-bold mb-2">
                    <span className={(() => {
                      const net = (exportPaymentsTotal + ticketPaymentsCalculated.incoming) - 
                                  (ticketPaymentsCalculated.outgoing + workersSummary.totalPaid + expensesTotal);
                      return net >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400';
                    })()}>
                      {((exportPaymentsTotal + ticketPaymentsCalculated.incoming) - 
                        (ticketPaymentsCalculated.outgoing + workersSummary.totalPaid + expensesTotal)).toLocaleString()}
                    </span>
                    <span className="text-lg text-muted-foreground mr-2">د.ت</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    إجمالي الدخل - إجمالي المصروفات
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>التفاصيل الكاملة</CardTitle>
              <CardDescription>تفصيل جميع الإيرادات والمصروفات</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Income Details */}
                <div>
                  <h3 className="font-semibold text-lg mb-4 text-green-700 dark:text-green-400">
                    مصادر الدخل
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-3 bg-green-50 dark:bg-green-900/10 rounded-lg">
                      <div>
                        <div className="font-medium">مبيعات الزيت</div>
                        <div className="text-sm text-muted-foreground">
                          {exportPayments.length} عملية بيع
                        </div>
                      </div>
                      <strong className="text-green-700 dark:text-green-400">
                        {exportPaymentsTotal.toLocaleString()} د.ت
                      </strong>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-green-50 dark:bg-green-900/10 rounded-lg">
                      <div>
                        <div className="font-medium">مدفوعات التذاكر الواردة</div>
                        <div className="text-sm text-muted-foreground">
                          {ticketPaymentsCalculated.incomingCount} عملية
                        </div>
                      </div>
                      <strong className="text-green-700 dark:text-green-400">
                        {ticketPaymentsCalculated.incoming.toLocaleString()} د.ت
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Expense Details */}
                <div>
                  <h3 className="font-semibold text-lg mb-4 text-red-700 dark:text-red-400">
                    المصروفات
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-3 bg-red-50 dark:bg-red-900/10 rounded-lg">
                      <div>
                        <div className="font-medium">مدفوعات التذاكر الصادرة</div>
                        <div className="text-sm text-muted-foreground">
                          {ticketPaymentsCalculated.outgoingCount} عملية
                        </div>
                      </div>
                      <strong className="text-red-700 dark:text-red-400">
                        {ticketPaymentsCalculated.outgoing.toLocaleString()} د.ت
                      </strong>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-red-50 dark:bg-red-900/10 rounded-lg">
                      <div>
                        <div className="font-medium">مدفوعات العمال</div>
                        <div className="text-sm text-muted-foreground">
                          {workerPayments.length} دفعة
                        </div>
                      </div>
                      <strong className="text-red-700 dark:text-red-400">
                        {workersSummary.totalPaid.toLocaleString()} د.ت
                      </strong>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-red-50 dark:bg-red-900/10 rounded-lg">
                      <div>
                        <div className="font-medium">مصروفات المعصرة</div>
                        <div className="text-sm text-muted-foreground">
                          {expenses.length} مصروف
                        </div>
                      </div>
                      <strong className="text-red-700 dark:text-red-400">
                        {expensesTotal.toLocaleString()} د.ت
                      </strong>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Owner's Daily Funds Tab */}
        <TabsContent value="owner" className="space-y-4">
          <Card className="bg-card border-border">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>أموال المالك - ملخص اليوم</CardTitle>
                  <CardDescription className="mt-2">
                    {ownerTotals.startingFunds > 0 || ownerTotals.totalSales > 0 ? (
                      <div className="flex items-center gap-4 mt-2">
                        <span className="text-sm">بدء: <strong className="text-foreground">{ownerTotals.startingFunds.toLocaleString()}</strong> د.ت</span>
                        <span className="text-sm">مبيعات: <strong className="text-success">{ownerTotals.totalSales.toLocaleString()}</strong> د.ت</span>
                        <span className="text-sm">مصروف: <strong className="text-destructive">{ownerTotals.totalSpent.toLocaleString()}</strong> د.ت</span>
                        <span className="text-sm">المتبقي: <strong className="text-primary">{ownerTotals.balance.toLocaleString()}</strong> د.ت</span>
                        <span className="text-sm">الحاويات: <strong>{ownerTotals.containers}</strong></span>
                        <span className="text-sm">عمليات البيع: <strong>{ownerTotals.sales}</strong></span>
                      </div>
                    ) : (
                      'لا توجد جلسة اليوم'
                    )}
                  </CardDescription>
                </div>
                <Button onClick={() => {
                  const today = new Date().toISOString().slice(0,10);
                  const todaySession = ownerFunds.find(f => f.date === today);
                  if (todaySession) {
                    setEditingOwnerFund(todaySession);
                  } else {
                    setShowStartingAmountModal(true);
                  }
                }}>
                  <Plus className="h-4 w-4 mr-2" />
                  {ownerTotals.startingFunds > 0 ? 'تعديل الجلسة' : 'بدء جلسة جديدة'}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Filters */}
              <div className="flex flex-wrap gap-3">
                <div className="flex-1 min-w-[200px]">
                  <div className="relative">
                    <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="بحث في الملاحظات أو الحاويات..."
                      value={ownerSearch}
                      onChange={(e) => setOwnerSearch(e.target.value)}
                      className="pr-9"
                    />
                  </div>
                </div>
                <Input
                  type="date"
                  value={ownerDateFilter}
                  onChange={(e) => setOwnerDateFilter(e.target.value)}
                  className="w-[180px]"
                />
                <Button
                  variant="outline"
                  onClick={() => {
                    setOwnerDateFilter('');
                    setOwnerSearch('');
                  }}
                >
                  <X className="h-4 w-4 mr-2" />
                  إعادة تعيين
                </Button>
              </div>

              {/* Table */}
              <div className="rounded-md border border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="cursor-pointer" onClick={() => handleSort('date', ownerSort, setOwnerSort)}>
                        <div className="flex items-center gap-2">
                          التاريخ
                          <ArrowUpDown className="h-3 w-3" />
                        </div>
                      </TableHead>
                      <TableHead className="cursor-pointer" onClick={() => handleSort('startingFunds', ownerSort, setOwnerSort)}>
                        <div className="flex items-center gap-2">
                          الأموال المبدئية
                          <ArrowUpDown className="h-3 w-3" />
                        </div>
                      </TableHead>
                      <TableHead className="cursor-pointer" onClick={() => handleSort('amountSpent', ownerSort, setOwnerSort)}>
                        <div className="flex items-center gap-2">
                          المصروف
                          <ArrowUpDown className="h-3 w-3" />
                        </div>
                      </TableHead>
                      <TableHead>المتبقي</TableHead>
                      <TableHead>الحاويات</TableHead>
                      <TableHead>المبيعات</TableHead>
                      <TableHead>ملاحظات</TableHead>
                      <TableHead>إجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredOwnerFunds.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                          لا توجد جلسات
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredOwnerFunds.map(fund => (
                        <TableRow key={fund.id}>
                          <TableCell>{fund.date}</TableCell>
                          <TableCell>{fund.startingFunds.toLocaleString()} د.ت</TableCell>
                          <TableCell>{fund.amountSpent.toLocaleString()} د.ت</TableCell>
                          <TableCell>
                            <Badge variant={fund.balance >= 0 ? 'default' : 'destructive'}>
                              {fund.balance.toLocaleString()} د.ت
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {fund.allocatedContainers.map(c => (
                                <Badge key={c.id} variant="outline">{c.label}</Badge>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell>{fund.relatedSales.length}</TableCell>
                          <TableCell className="max-w-[200px] truncate">{fund.notes || '—'}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setEditingOwnerFund(fund)}
                              >
                                <Edit3 className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteOwnerFund(fund.id)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Oil Sales (Export Payments) Tab */}
        <TabsContent value="sales" className="space-y-4">
          <Card className="bg-card border-border">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>مبيعات الزيت</CardTitle>
                  <CardDescription className="mt-2">
                    إجمالي المبيعات: <strong className="text-foreground">{exportPaymentsTotal.toLocaleString()}</strong> د.ت
                    {' • '}
                    عدد العمليات: <strong>{exportPayments.length}</strong>
                    {' • '}
                    نقداً: <strong className="text-green-600">
                      {exportPayments.filter(ep => ep.payment_method === 'cash').reduce((sum, ep) => sum + Number(ep.amount || 0), 0).toLocaleString()}
                    </strong> د.ت
                  </CardDescription>
                </div>
                <Button onClick={handleExportToExcel} variant="outline" className="gap-2">
                  <Download className="h-4 w-4" />
                  تصدير Excel
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Filters */}
              <div className="flex flex-wrap gap-3">
                <div className="flex-1 min-w-[200px]">
                  <div className="relative">
                    <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="بحث في الحاوية أو المرجع..."
                      value={exportPaymentSearch}
                      onChange={(e) => setExportPaymentSearch(e.target.value)}
                      className="pr-9"
                    />
                  </div>
                </div>
                <Input
                  type="date"
                  value={exportPaymentDateFilter}
                  onChange={(e) => setExportPaymentDateFilter(e.target.value)}
                  className="w-[180px]"
                />
                <Input
                  placeholder="بحث بالمشتري..."
                  value={exportPaymentBuyerFilter}
                  onChange={(e) => setExportPaymentBuyerFilter(e.target.value)}
                  className="w-[200px]"
                />
                <Button
                  variant="outline"
                  onClick={() => {
                    setExportPaymentSearch('');
                    setExportPaymentDateFilter('');
                    setExportPaymentBuyerFilter('');
                  }}
                >
                  <X className="h-4 w-4 mr-2" />
                  إعادة تعيين
                </Button>
              </div>

              {/* Table */}
              <div className="rounded-md border border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="cursor-pointer" onClick={() => handleSort('payment_date', exportPaymentSort, setExportPaymentSort)}>
                        <div className="flex items-center gap-2">
                          التاريخ
                          <ArrowUpDown className="h-3 w-3" />
                        </div>
                      </TableHead>
                      <TableHead className="cursor-pointer" onClick={() => handleSort('container', exportPaymentSort, setExportPaymentSort)}>
                        <div className="flex items-center gap-2">
                          الحاوية
                          <ArrowUpDown className="h-3 w-3" />
                        </div>
                      </TableHead>
                      <TableHead className="cursor-pointer" onClick={() => handleSort('amount', exportPaymentSort, setExportPaymentSort)}>
                        <div className="flex items-center gap-2">
                          المبلغ
                          <ArrowUpDown className="h-3 w-3" />
                        </div>
                      </TableHead>
                      <TableHead>المشتري</TableHead>
                      <TableHead>التواصل</TableHead>
                      <TableHead>طريقة الدفع</TableHead>
                      <TableHead>المرجع</TableHead>
                      <TableHead>ملاحظات</TableHead>
                      <TableHead>إجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                          جاري التحميل...
                        </TableCell>
                      </TableRow>
                    ) : filteredExportPayments.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                          لا توجد عمليات بيع
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredExportPayments.map(payment => (
                        <TableRow key={payment.id}>
                          <TableCell>{payment.payment_date}</TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {payment.container?.label || `حاوية #${payment.containerId}`}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <strong className="text-success">
                              {Number(payment.amount).toLocaleString()} د.ت
                            </strong>
                          </TableCell>
                          <TableCell>{payment.buyer_name || '—'}</TableCell>
                          <TableCell>{payment.buyer_contact || '—'}</TableCell>
                          <TableCell>
                            <Badge variant={payment.payment_method === 'cash' ? 'default' : 'outline'} className={payment.payment_method === 'cash' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : ''}>
                              {payment.payment_method === 'cash' ? '💰 نقداً' : 
                               payment.payment_method === 'transfer' ? '🏦 تحويل' : 
                               payment.payment_method === 'check' ? '📝 شيك' : payment.payment_method}
                            </Badge>
                          </TableCell>
                          <TableCell>{payment.reference || '—'}</TableCell>
                          <TableCell className="max-w-[200px] truncate">{payment.notes || '—'}</TableCell>
                          <TableCell>
                            {/* READ ONLY - No edit/delete */}
                            <span className="text-muted-foreground text-sm">عرض فقط</span>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Ticket Payments Tab - READ ONLY */}
        <TabsContent value="ticketPayments" className="space-y-4">
          <Card className="bg-card border-border">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>مدفوعات التذاكر</CardTitle>
                  <CardDescription className="mt-2">
                    <div className="flex items-center gap-4 flex-wrap">
                      <span>إجمالي الواردات: <strong className="text-success">{ticketPaymentsCalculated.incoming.toLocaleString()}</strong> د.ت</span>
                      <span>إجمالي الصادرات: <strong className="text-destructive">{ticketPaymentsCalculated.outgoing.toLocaleString()}</strong> د.ت</span>
                      <span>الرصيد الصافي: <strong className={ticketPaymentsCalculated.netBalance >= 0 ? 'text-success' : 'text-destructive'}>{ticketPaymentsCalculated.netBalance.toLocaleString()}</strong> د.ت</span>
                      <span>عدد العمليات: <strong>{ticketPaymentsCalculated.totalCount}</strong></span>
                    </div>
                  </CardDescription>
                </div>
                {/* READ ONLY - No add/edit/delete buttons */}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Filters */}
              <div className="flex flex-wrap gap-3">
                <div className="flex-1 min-w-[200px]">
                  <div className="relative">
                    <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="بحث في رقم التذكرة أو العميل..."
                      value={ticketPaymentSearch}
                      onChange={(e) => setTicketPaymentSearch(e.target.value)}
                      className="pr-9"
                    />
                  </div>
                </div>
                <Input
                  type="date"
                  value={ticketPaymentDateFilter}
                  onChange={(e) => setTicketPaymentDateFilter(e.target.value)}
                  className="w-[180px]"
                />
                <Select value={ticketPaymentTypeFilter} onValueChange={setTicketPaymentTypeFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="نوع الدفع" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">جميع الأنواع</SelectItem>
                    <SelectItem value="incoming">وارد</SelectItem>
                    <SelectItem value="outgoing">صادر</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  onClick={() => {
                    setTicketPaymentSearch('');
                    setTicketPaymentDateFilter('');
                    setTicketPaymentTypeFilter('all');
                  }}
                >
                  <X className="h-4 w-4 mr-2" />
                  إعادة تعيين
                </Button>
              </div>

              {/* Table */}
              <div className="rounded-md border border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="cursor-pointer" onClick={() => handleSort('payment_date', ticketPaymentSort, setTicketPaymentSort)}>
                        <div className="flex items-center gap-2">
                          التاريخ
                          <ArrowUpDown className="h-3 w-3" />
                        </div>
                      </TableHead>
                      <TableHead>رقم التذكرة</TableHead>
                      <TableHead>العميل</TableHead>
                      <TableHead className="cursor-pointer" onClick={() => handleSort('payment_type', ticketPaymentSort, setTicketPaymentSort)}>
                        <div className="flex items-center gap-2">
                          نوع الدفع
                          <ArrowUpDown className="h-3 w-3" />
                        </div>
                      </TableHead>
                      <TableHead className="cursor-pointer" onClick={() => handleSort('operation_type', ticketPaymentSort, setTicketPaymentSort)}>
                        <div className="flex items-center gap-2">
                          نوع العملية
                          <ArrowUpDown className="h-3 w-3" />
                        </div>
                      </TableHead>
                      <TableHead className="cursor-pointer" onClick={() => handleSort('amount', ticketPaymentSort, setTicketPaymentSort)}>
                        <div className="flex items-center gap-2">
                          المبلغ
                          <ArrowUpDown className="h-3 w-3" />
                        </div>
                      </TableHead>
                      <TableHead>طريقة الدفع</TableHead>
                      <TableHead>المرجع</TableHead>
                      <TableHead>ملاحظات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                          جاري التحميل...
                        </TableCell>
                      </TableRow>
                    ) : filteredTicketPayments.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                          لا توجد مدفوعات
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredTicketPayments.map(payment => {
                        const clientName = payment.ticket?.client 
                          ? (payment.ticket.client.firstname && payment.ticket.client.lastname
                              ? `${payment.ticket.client.firstname} ${payment.ticket.client.lastname}`
                              : payment.ticket.client.name || '—')
                          : '—';
                        const displayAmount = payment.payment_type === 'outgoing' 
                          ? -Number(payment.amount) 
                          : Number(payment.amount);
                        
                        return (
                          <TableRow key={payment.id}>
                            <TableCell>{payment.payment_date}</TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {payment.ticket?.ticketNumber || `#${payment.ticketId}`}
                              </Badge>
                            </TableCell>
                            <TableCell>{clientName}</TableCell>
                            <TableCell>
                              <Badge variant={payment.payment_type === 'incoming' ? 'default' : 'destructive'}>
                                {payment.payment_type === 'incoming' ? 'وارد' : 'صادر'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {payment.operation_type === 'pressing' ? 'عصر' : 'بيع'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <strong className={payment.payment_type === 'incoming' ? 'text-success' : 'text-destructive'}>
                                {displayAmount >= 0 ? '+' : ''}{displayAmount.toLocaleString()} د.ت
                              </strong>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {payment.payment_method === 'cash' ? 'نقداً' : 
                                 payment.payment_method === 'transfer' ? 'تحويل' : 
                                 payment.payment_method === 'check' ? 'شيك' : payment.payment_method}
                              </Badge>
                            </TableCell>
                            <TableCell>{payment.reference || '—'}</TableCell>
                            <TableCell className="max-w-[200px] truncate">{payment.notes || '—'}</TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Workers' Payments Tab */}
        <TabsContent value="workers" className="space-y-4">
          <Card className="bg-card border-border">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>عمال - ملخص</CardTitle>
                  <CardDescription className="mt-2">
                    إجمالي المدفوعات: <strong className="text-foreground">{workersSummary.totalPaid.toLocaleString()}</strong> د.ت
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => {
                    setWorkerDraft({ firstName: '', lastName: '', status: 'active' });
                    setEditingWorker(null);
                    setShowWorkerModal(true);
                  }}>
                    <Plus className="h-4 w-4 mr-2" />
                    عامل جديد
                  </Button>
                  <Button onClick={() => {
                    setPaymentDraft({ date: new Date().toISOString().slice(0,10), type: 'advance', method: 'cash' });
                    setEditingPayment(null);
                    setShowPayModal(true);
                  }}>
                    <Plus className="h-4 w-4 mr-2" />
                    تسجيل دفع
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Filters */}
              <div className="flex flex-wrap gap-3">
                <div className="flex-1 min-w-[200px]">
                  <div className="relative">
                    <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="بحث بالاسم أو الهاتف..."
                      value={workerSearch}
                      onChange={(e) => setWorkerSearch(e.target.value)}
                      className="pr-9"
                    />
                  </div>
                </div>
                <Select value={workerStatusFilter} onValueChange={setWorkerStatusFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="الحالة" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">جميع الحالات</SelectItem>
                    <SelectItem value="active">نشط</SelectItem>
                    <SelectItem value="inactive">غير نشط</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  onClick={() => {
                    setWorkerSearch('');
                    setWorkerStatusFilter('all');
                  }}
                >
                  <X className="h-4 w-4 mr-2" />
                  إعادة تعيين
                </Button>
              </div>

              {/* Workers Table */}
              <div className="rounded-md border border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>الاسم الأول</TableHead>
                      <TableHead>الاسم الأخير</TableHead>
                      <TableHead>الهاتف</TableHead>
                      <TableHead>الحالة</TableHead>
                      <TableHead>إجمالي المدفوع</TableHead>
                      <TableHead>المتبقي</TableHead>
                      <TableHead>إجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredWorkers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          لا يوجد عمال
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredWorkers.map(worker => (
                        <TableRow 
                          key={worker.id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => setSelectedWorkerForHistory(worker)}
                        >
                          <TableCell className="font-medium">{worker.firstName}</TableCell>
                          <TableCell className="font-medium">{worker.lastName}</TableCell>
                          <TableCell>{worker.phone || '—'}</TableCell>
                          <TableCell>
                            <Badge variant={worker.status === 'active' ? 'default' : 'secondary'}>
                              {worker.status === 'active' ? 'نشط' : 'غير نشط'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <strong className="text-destructive">
                              {worker.totalPaid?.toLocaleString() || 0} د.ت
                            </strong>
                          </TableCell>
                          <TableCell>
                            <Badge variant={worker.outstandingBalance && worker.outstandingBalance > 0 ? 'destructive' : 'default'}>
                              {worker.outstandingBalance?.toLocaleString() || 0} د.ت
                            </Badge>
                          </TableCell>
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setWorkerDraft(worker);
                                  setEditingWorker(worker);
                                  setShowWorkerModal(true);
                                }}
                              >
                                <Edit3 className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedWorkerForHistory(worker);
                                }}
                                title="عرض سجل المدفوعات"
                              >
                                <History className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteWorker(worker.id)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Payments Table */}
              <div>
                <h3 className="text-lg font-semibold mb-3">سجل المدفوعات</h3>
                <div className="rounded-md border border-border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead>التاريخ</TableHead>
                        <TableHead>العامل</TableHead>
                        <TableHead>المبلغ</TableHead>
                        <TableHead>النوع</TableHead>
                        <TableHead>الطريقة</TableHead>
                        <TableHead>ملاحظات</TableHead>
                        <TableHead>إجراءات</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {workerPayments.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                            لا توجد دفعات
                          </TableCell>
                        </TableRow>
                      ) : (
                        workerPayments
                          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                          .map(payment => {
                            const worker = workers.find(w => w.id === payment.workerId);
                            return (
                              <TableRow key={payment.id}>
                                <TableCell>{payment.date}</TableCell>
                                <TableCell>{worker ? `${worker.firstName} ${worker.lastName}` : '—'}</TableCell>
                                <TableCell>{payment.amount.toLocaleString()} د.ت</TableCell>
                                <TableCell>
                                  <Badge variant="outline">
                                    {payment.type === 'advance' ? 'سلفة' : payment.type === 'salary' ? 'راتب' : 'أخرى'}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <Badge variant={payment.method === 'cash' ? 'default' : 'outline'} className={payment.method === 'cash' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : ''}>
                                    {payment.method === 'cash' ? '💰 نقداً' : payment.method === 'transfer' ? '🏦 تحويل' : '📝 شيك'}
                                  </Badge>
                                </TableCell>
                                <TableCell className="max-w-[200px] truncate">{payment.notes || '—'}</TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-1">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        setPaymentDraft(payment);
                                        setEditingPayment(payment);
                                        setShowPayModal(true);
                                      }}
                                    >
                                      <Edit3 className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleDeleteWorkerPayment(payment.id)}
                                    >
                                      <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Mill Expenses Tab */}
        <TabsContent value="expenses" className="space-y-4">
          <Card className="bg-card border-border">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>مصروفات المعصرة</CardTitle>
                  <CardDescription className="mt-2">
                    إجمالي المصروفات: <strong className="text-foreground">{expensesTotal.toLocaleString()}</strong> د.ت
                  </CardDescription>
                </div>
                <Button onClick={() => {
                  setExpenseDraft({ date: new Date().toISOString().slice(0,10), category: 'other' });
                  setEditingExpense(null);
                  setShowExpenseModal(true);
                }}>
                  <Plus className="h-4 w-4 mr-2" />
                  مصروف جديد
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Filters */}
              <div className="flex flex-wrap gap-3">
                <div className="flex-1 min-w-[200px]">
                  <div className="relative">
                    <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="بحث في البند أو المورد..."
                      value={expenseSearch}
                      onChange={(e) => setExpenseSearch(e.target.value)}
                      className="pr-9"
                    />
                  </div>
                </div>
                <Select value={expenseCategoryFilter} onValueChange={setExpenseCategoryFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="الفئة" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">جميع الفئات</SelectItem>
                    <SelectItem value="equipment">معدات</SelectItem>
                    <SelectItem value="repair">تصليح</SelectItem>
                    <SelectItem value="supplies">مستلزمات</SelectItem>
                    <SelectItem value="utilities">مرافق</SelectItem>
                    <SelectItem value="maintenance">صيانة</SelectItem>
                    <SelectItem value="fuel">وقود</SelectItem>
                    <SelectItem value="other">أخرى</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  type="date"
                  value={expenseDateFilter}
                  onChange={(e) => setExpenseDateFilter(e.target.value)}
                  className="w-[180px]"
                />
                <Button
                  variant="outline"
                  onClick={() => {
                    setExpenseSearch('');
                    setExpenseCategoryFilter('all');
                    setExpenseDateFilter('');
                  }}
                >
                  <X className="h-4 w-4 mr-2" />
                  إعادة تعيين
                </Button>
              </div>

              {/* Table */}
              <div className="rounded-md border border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="cursor-pointer" onClick={() => handleSort('date', expenseSort, setExpenseSort)}>
                        <div className="flex items-center gap-2">
                          التاريخ
                          <ArrowUpDown className="h-3 w-3" />
                        </div>
                      </TableHead>
                      <TableHead className="cursor-pointer" onClick={() => handleSort('category', expenseSort, setExpenseSort)}>
                        <div className="flex items-center gap-2">
                          الفئة
                          <ArrowUpDown className="h-3 w-3" />
                        </div>
                      </TableHead>
                      <TableHead className="cursor-pointer" onClick={() => handleSort('item', expenseSort, setExpenseSort)}>
                        <div className="flex items-center gap-2">
                          البند
                          <ArrowUpDown className="h-3 w-3" />
                        </div>
                      </TableHead>
                      <TableHead className="cursor-pointer" onClick={() => handleSort('amount', expenseSort, setExpenseSort)}>
                        <div className="flex items-center gap-2">
                          المبلغ
                          <ArrowUpDown className="h-3 w-3" />
                        </div>
                      </TableHead>
                      <TableHead>المورد</TableHead>
                      <TableHead>إيصال</TableHead>
                      <TableHead>ملاحظات</TableHead>
                      <TableHead>إجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredExpenses.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                          لا توجد مصروفات
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredExpenses.map(expense => (
                        <TableRow key={expense.id}>
                          <TableCell>{expense.date}</TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {expense.category === 'equipment' ? 'معدات' :
                               expense.category === 'repair' ? 'تصليح' :
                               expense.category === 'supplies' ? 'مستلزمات' :
                               expense.category === 'utilities' ? 'مرافق' :
                               expense.category === 'maintenance' ? 'صيانة' :
                               expense.category === 'fuel' ? 'وقود' : 'أخرى'}
                            </Badge>
                          </TableCell>
                          <TableCell>{expense.item}</TableCell>
                          <TableCell>{expense.amount.toLocaleString()} د.ت</TableCell>
                          <TableCell>{expense.vendor || '—'}</TableCell>
                          <TableCell>
                            {expense.receipt_reference ? (
                              <Badge variant="outline" className="cursor-pointer">
                                <FileText className="h-3 w-3 mr-1" />
                                {expense.receipt_reference}
                              </Badge>
                            ) : '—'}
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate">{expense.notes || '—'}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setExpenseDraft(expense);
                                  setEditingExpense(expense);
                                  setShowExpenseModal(true);
                                }}
                              >
                                <Edit3 className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteExpense(expense.id)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Starting Amount Modal */}
      <Dialog open={showStartingAmountModal} onOpenChange={setShowStartingAmountModal}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>بدء جلسة جديدة</DialogTitle>
            <DialogDescription>
              أدخل المبلغ الابتدائي لليوم ({new Date().toLocaleDateString('ar-TN')})
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="startingAmount">المبلغ الابتدائي (د.ت)</Label>
              <Input
                id="startingAmount"
                type="number"
                value={startingAmount || ''}
                onChange={(e) => setStartingAmount(Number(e.target.value))}
                placeholder="0"
                min="0"
                step="0.01"
              />
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setShowStartingAmountModal(false)}>
                إلغاء
              </Button>
              <Button onClick={handleCreateTodaySession}>
                <CheckCircle className="h-4 w-4 mr-2" />
                بدء الجلسة
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Owner Fund Modal */}
      {editingOwnerFund && (
        <Dialog open={!!editingOwnerFund} onOpenChange={(open) => !open && setEditingOwnerFund(null)}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>تعديل جلسة أموال المالك</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="ownerDate">التاريخ</Label>
                  <Input
                    id="ownerDate"
                    type="date"
                    value={editingOwnerFund.date}
                    onChange={(e) => setEditingOwnerFund({ ...editingOwnerFund, date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ownerStarting">الأموال المبدئية</Label>
                  <Input
                    id="ownerStarting"
                    type="number"
                    value={editingOwnerFund.startingFunds || ''}
                    onChange={(e) => {
                      const newAmount = Number(e.target.value);
                      // Balance will be recalculated on the backend from ticket payments
                      setEditingOwnerFund({
                        ...editingOwnerFund,
                        startingFunds: newAmount
                      });
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ownerSpent">المصروف (محسوب تلقائياً من الصادرات)</Label>
                  <Input
                    id="ownerSpent"
                    type="number"
                    value={editingOwnerFund.amountSpent || ''}
                    disabled
                    className="bg-muted"
                    readOnly
                  />
                  <p className="text-xs text-muted-foreground">
                    يتم حساب المصروف تلقائياً من مدفوعات التذاكر الصادرة لهذا التاريخ
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>المتبقي (محسوب تلقائياً)</Label>
                  <Input
                    value={editingOwnerFund.balance.toLocaleString()}
                    disabled
                    className="bg-muted"
                    readOnly
                  />
                </div>
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="ownerContainers">الحاويات المخصصة</Label>
                  <div className="border rounded-md p-3 max-h-48 overflow-y-auto bg-muted/30">
                    {containers.length === 0 ? (
                      <p className="text-sm text-muted-foreground">لا توجد حاويات متاحة</p>
                    ) : (
                      <div className="space-y-2">
                        {containers.map(c => {
                          const isSelected = editingOwnerFund.allocatedContainers.some(ac => ac.id === c.id);
                          return (
                            <label key={c.id} className="flex items-center space-x-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setEditingOwnerFund({
                                      ...editingOwnerFund,
                                      allocatedContainers: [...editingOwnerFund.allocatedContainers, c]
                                    });
                                  } else {
                                    setEditingOwnerFund({
                                      ...editingOwnerFund,
                                      allocatedContainers: editingOwnerFund.allocatedContainers.filter(ac => ac.id !== c.id)
                                    });
                                  }
                                }}
                                className="rounded border-input"
                              />
                              <span className="text-sm">{c.label}</span>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="ownerNotes">ملاحظات</Label>
                  <Input
                    id="ownerNotes"
                    value={editingOwnerFund.notes || ''}
                    onChange={(e) => setEditingOwnerFund({ ...editingOwnerFund, notes: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setEditingOwnerFund(null)}>
                  إلغاء
                </Button>
                <Button onClick={() => handleSaveOwnerFund(editingOwnerFund)}>
                  <Save className="h-4 w-4 mr-2" />
                  حفظ
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Worker Modal */}
      <Dialog open={showWorkerModal} onOpenChange={setShowWorkerModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingWorker ? 'تعديل عامل' : 'عامل جديد'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="workerFirstName">الاسم الأول</Label>
                <Input
                  id="workerFirstName"
                  value={workerDraft.firstName || ''}
                  onChange={(e) => setWorkerDraft({ ...workerDraft, firstName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="workerLastName">الاسم الأخير</Label>
                <Input
                  id="workerLastName"
                  value={workerDraft.lastName || ''}
                  onChange={(e) => setWorkerDraft({ ...workerDraft, lastName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="workerPhone">الهاتف</Label>
                <Input
                  id="workerPhone"
                  value={workerDraft.phone || ''}
                  onChange={(e) => setWorkerDraft({ ...workerDraft, phone: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="workerStatus">الحالة</Label>
                <Select
                  value={workerDraft.status || 'active'}
                  onValueChange={(value) => setWorkerDraft({ ...workerDraft, status: value as any })}
                >
                  <SelectTrigger id="workerStatus">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">نشط</SelectItem>
                    <SelectItem value="inactive">غير نشط</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => {
                setShowWorkerModal(false);
                setEditingWorker(null);
                setWorkerDraft({ firstName: '', lastName: '', status: 'active' });
              }}>
                إلغاء
              </Button>
              <Button onClick={() => handleSaveWorker(workerDraft as Worker)}>
                <Save className="h-4 w-4 mr-2" />
                حفظ
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Payment Modal */}
      <Dialog open={showPayModal} onOpenChange={setShowPayModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingPayment ? 'تعديل دفع' : 'تسجيل دفع عامل'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="paymentDate">التاريخ</Label>
                <Input
                  id="paymentDate"
                  type="date"
                  value={paymentDraft.date?.slice(0,10) || ''}
                  onChange={(e) => setPaymentDraft({ ...paymentDraft, date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="paymentWorker">العامل</Label>
                <Select
                  value={paymentDraft.workerId?.toString() || ''}
                  onValueChange={(value) => setPaymentDraft({ ...paymentDraft, workerId: Number(value) })}
                >
                  <SelectTrigger id="paymentWorker">
                    <SelectValue placeholder="اختر العامل" />
                  </SelectTrigger>
                  <SelectContent>
                    {workers.map(w => (
                      <SelectItem key={w.id} value={w.id.toString()}>
                        {w.firstName} {w.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="paymentAmount">المبلغ</Label>
                <Input
                  id="paymentAmount"
                  type="number"
                  value={paymentDraft.amount || ''}
                  onChange={(e) => setPaymentDraft({ ...paymentDraft, amount: Number(e.target.value) })}
                  placeholder="0"
                  min="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="paymentType">النوع</Label>
                <Select
                  value={paymentDraft.type || 'advance'}
                  onValueChange={(value) => setPaymentDraft({ ...paymentDraft, type: value as any })}
                >
                  <SelectTrigger id="paymentType">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="advance">سلفة</SelectItem>
                    <SelectItem value="salary">راتب</SelectItem>
                    <SelectItem value="other">أخرى</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="paymentMethod">الطريقة</Label>
                <Select
                  value={paymentDraft.method || 'cash'}
                  onValueChange={(value) => setPaymentDraft({ ...paymentDraft, method: value as any })}
                >
                  <SelectTrigger id="paymentMethod">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">نقداً</SelectItem>
                    <SelectItem value="transfer">تحويل</SelectItem>
                    <SelectItem value="check">شيك</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2 space-y-2">
                <Label htmlFor="paymentNotes">ملاحظات</Label>
                <Input
                  id="paymentNotes"
                  value={paymentDraft.notes || ''}
                  onChange={(e) => setPaymentDraft({ ...paymentDraft, notes: e.target.value })}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => {
                setShowPayModal(false);
                setEditingPayment(null);
                setPaymentDraft({ date: new Date().toISOString().slice(0,10), type: 'advance', method: 'cash' });
              }}>
                إلغاء
              </Button>
              <Button onClick={() => handleSavePayment(paymentDraft as WorkerPayment)}>
                <Save className="h-4 w-4 mr-2" />
                {editingPayment ? 'تحديث' : 'تسجيل'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Export Payment Modal - REMOVED (read-only) */}

      {/* Expense Modal */}
      <Dialog open={showExpenseModal} onOpenChange={setShowExpenseModal}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{editingExpense ? 'تعديل مصروف' : 'مصروف جديد'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="expenseDate">التاريخ</Label>
                <Input
                  id="expenseDate"
                  type="date"
                  value={expenseDraft.date?.slice(0,10) || ''}
                  onChange={(e) => setExpenseDraft({ ...expenseDraft, date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="expenseCategory">الفئة</Label>
                <Select
                  value={expenseDraft.category || 'other'}
                  onValueChange={(value) => setExpenseDraft({ ...expenseDraft, category: value as any })}
                >
                  <SelectTrigger id="expenseCategory">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="equipment">معدات</SelectItem>
                    <SelectItem value="repair">تصليح</SelectItem>
                    <SelectItem value="supplies">مستلزمات</SelectItem>
                    <SelectItem value="utilities">مرافق</SelectItem>
                    <SelectItem value="maintenance">صيانة</SelectItem>
                    <SelectItem value="fuel">وقود</SelectItem>
                    <SelectItem value="other">أخرى</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="expenseItem">البند</Label>
                <Input
                  id="expenseItem"
                  value={expenseDraft.item || ''}
                  onChange={(e) => setExpenseDraft({ ...expenseDraft, item: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="expenseAmount">المبلغ</Label>
                <Input
                  id="expenseAmount"
                  type="number"
                  value={expenseDraft.amount || ''}
                  onChange={(e) => setExpenseDraft({ ...expenseDraft, amount: Number(e.target.value) })}
                  placeholder="0"
                  min="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="expenseVendor">المورد</Label>
                <Input
                  id="expenseVendor"
                  value={expenseDraft.vendor || ''}
                  onChange={(e) => setExpenseDraft({ ...expenseDraft, vendor: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="expenseReceipt">رقم الإيصال</Label>
                <Input
                  id="expenseReceipt"
                  value={expenseDraft.receipt_reference || ''}
                  onChange={(e) => setExpenseDraft({ ...expenseDraft, receipt_reference: e.target.value })}
                />
              </div>
              <div className="col-span-2 space-y-2">
                <Label htmlFor="expenseNotes">ملاحظات</Label>
                <Input
                  id="expenseNotes"
                  value={expenseDraft.notes || ''}
                  onChange={(e) => setExpenseDraft({ ...expenseDraft, notes: e.target.value })}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => {
                setShowExpenseModal(false);
                setEditingExpense(null);
                setExpenseDraft({ date: new Date().toISOString().slice(0,10), category: 'other' });
              }}>
                إلغاء
              </Button>
              <Button onClick={() => handleSaveExpense(expenseDraft as Expense)}>
                <Save className="h-4 w-4 mr-2" />
                {editingExpense ? 'تحديث' : 'حفظ'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Worker Payment History Modal */}
      <Dialog open={!!selectedWorkerForHistory} onOpenChange={(open) => !open && setSelectedWorkerForHistory(null)}>
        <DialogContent className="sm:max-w-[800px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              سجل المدفوعات - {selectedWorkerForHistory?.firstName} {selectedWorkerForHistory?.lastName}
            </DialogTitle>
            <DialogDescription>
              جميع المدفوعات المسجلة لهذا العامل
            </DialogDescription>
          </DialogHeader>
          {selectedWorkerForHistory && (
            <div className="space-y-4">
              {/* Worker Info Summary */}
              <Card className="bg-muted/50">
                <CardContent className="pt-6">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <div className="text-sm text-muted-foreground">إجمالي المدفوع</div>
                      <div className="text-2xl font-bold text-destructive">
                        {workerPayments
                          .filter(p => p.workerId === selectedWorkerForHistory.id)
                          .reduce((sum, p) => sum + Number(p.amount || 0), 0)
                          .toLocaleString()} د.ت
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">عدد الدفعات</div>
                      <div className="text-2xl font-bold">
                        {workerPayments.filter(p => p.workerId === selectedWorkerForHistory.id).length}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">نقداً</div>
                      <div className="text-2xl font-bold text-green-600">
                        {workerPayments
                          .filter(p => p.workerId === selectedWorkerForHistory.id && p.method === 'cash')
                          .reduce((sum, p) => sum + Number(p.amount || 0), 0)
                          .toLocaleString()} د.ت
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Payment History Table */}
              <div className="rounded-md border border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>التاريخ</TableHead>
                      <TableHead>المبلغ</TableHead>
                      <TableHead>النوع</TableHead>
                      <TableHead>طريقة الدفع</TableHead>
                      <TableHead>ملاحظات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {workerPayments
                      .filter(p => p.workerId === selectedWorkerForHistory.id)
                      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                      .length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          لا توجد دفعات مسجلة
                        </TableCell>
                      </TableRow>
                    ) : (
                      workerPayments
                        .filter(p => p.workerId === selectedWorkerForHistory.id)
                        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                        .map(payment => (
                          <TableRow key={payment.id}>
                            <TableCell>{payment.date}</TableCell>
                            <TableCell>
                              <strong className="text-destructive">
                                {Number(payment.amount).toLocaleString()} د.ت
                              </strong>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {payment.type === 'advance' ? 'سلفة' : payment.type === 'salary' ? 'راتب' : 'أخرى'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant={payment.method === 'cash' ? 'default' : 'outline'} className={payment.method === 'cash' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : ''}>
                                {payment.method === 'cash' ? '💰 نقداً' : payment.method === 'transfer' ? '🏦 تحويل' : '📝 شيك'}
                              </Badge>
                            </TableCell>
                            <TableCell className="max-w-[200px] truncate">{payment.notes || '—'}</TableCell>
                          </TableRow>
                        ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
}
