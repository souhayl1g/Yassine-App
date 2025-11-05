import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/integrations/api/client';
import { 
  X, Plus, Edit3, Search, Filter, Calendar, 
  DollarSign, Users, Receipt, ArrowUpDown, 
  Save, XCircle, CheckCircle, TrendingUp, 
  TrendingDown, Wallet, FileText, Download
} from 'lucide-react';
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

type SortConfig = {
  key: string;
  direction: 'asc' | 'desc';
};

export function PaymentsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const isAdmin = user?.role === 'admin';

  const [tab, setTab] = useState<'owner' | 'workers' | 'expenses'>('owner');
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

  // Load owner funds (mock for now - replace with API)
  useEffect(() => {
    // TODO: Replace with actual API call
    // const loadOwnerFunds = async () => {
    //   try {
    //     const data = await api.get<OwnerFund[]>('/owner-funds');
    //     setOwnerFunds(data || []);
    //   } catch (error) {
    //     console.error('Error loading owner funds:', error);
    //   }
    // };
    // loadOwnerFunds();
  }, []);

  // Load workers (mock for now - replace with API)
  useEffect(() => {
    // TODO: Replace with actual API call using Employee model
    // const loadWorkers = async () => {
    //   try {
    //     const data = await api.get<Worker[]>('/employees');
    //     setWorkers(data || []);
    //   } catch (error) {
    //     console.error('Error loading workers:', error);
    //   }
    // };
    // loadWorkers();
  }, []);

  // Load expenses (mock for now - replace with API)
  useEffect(() => {
    // TODO: Replace with actual API call
    // const loadExpenses = async () => {
    //   try {
    //     const data = await api.get<Expense[]>('/expenses');
    //     setExpenses(data || []);
    //   } catch (error) {
    //     console.error('Error loading expenses:', error);
    //   }
    // };
    // loadExpenses();
  }, []);

  // Derived totals and summaries
  const ownerTotals = useMemo(() => {
    const today = new Date().toISOString().slice(0,10);
    const todaySession = ownerFunds.find(f => f.date === today);
    if (todaySession) {
      return {
        startingFunds: todaySession.startingFunds,
        totalSpent: todaySession.amountSpent,
        balance: todaySession.balance,
        containers: todaySession.allocatedContainers.length,
        sales: todaySession.relatedSales.length
      };
    }
    return { startingFunds: 0, totalSpent: 0, balance: 0, containers: 0, sales: 0 };
  }, [ownerFunds]);

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
        .reduce((sum, p) => sum + (p.amount || 0), 0);
      // TODO: Calculate from salary/advance logic
      const outstandingBalance = 0; // Placeholder
      return { ...worker, totalPaid, outstandingBalance };
    });
  }, [workers, workerPayments]);

  const expensesTotal = useMemo(() => {
    return expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  }, [expenses]);

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

    const today = new Date().toISOString().slice(0,10);
    const newSession: OwnerFund = {
      id: Date.now(),
      date: today,
      startingFunds: startingAmount,
      allocatedContainers: [],
      relatedSales: [],
      amountSpent: 0,
      balance: startingAmount,
      notes: ''
    };

    setOwnerFunds(prev => [newSession, ...prev]);
    setShowStartingAmountModal(false);
    setStartingAmount(0);
    toast({ title: 'تم بنجاح', description: 'تم إنشاء جلسة اليوم' });
  };

  const handleSaveOwnerFund = (fund: OwnerFund) => {
    setOwnerFunds(prev => prev.map(f => f.id === fund.id ? fund : f));
    setEditingOwnerFund(null);
    toast({ title: 'تم بنجاح', description: 'تم تحديث الجلسة' });
  };

  const handleSaveWorker = (worker: Worker) => {
    if (editingWorker) {
      setWorkers(prev => prev.map(w => w.id === worker.id ? worker : w));
      setEditingWorker(null);
    } else {
      setWorkers(prev => [...prev, { ...worker, id: Date.now(), createdOn: new Date().toISOString().slice(0,10) }]);
      setShowWorkerModal(false);
    }
    setWorkerDraft({ firstName: '', lastName: '', status: 'active' });
    toast({ title: 'تم بنجاح', description: editingWorker ? 'تم تحديث العامل' : 'تم إضافة العامل' });
  };

  const handleSavePayment = (payment: WorkerPayment) => {
    if (editingPayment) {
      setWorkerPayments(prev => prev.map(p => p.id === payment.id ? payment : p));
      setEditingPayment(null);
    } else {
      setWorkerPayments(prev => [...prev, { ...payment, id: Date.now() }]);
      setShowPayModal(false);
    }
    setPaymentDraft({ date: new Date().toISOString().slice(0,10), type: 'advance', method: 'cash' });
    toast({ title: 'تم بنجاح', description: editingPayment ? 'تم تحديث الدفع' : 'تم تسجيل الدفع' });
  };

  const handleSaveExpense = (expense: Expense) => {
    if (editingExpense) {
      setExpenses(prev => prev.map(e => e.id === expense.id ? expense : e));
      setEditingExpense(null);
    } else {
      setExpenses(prev => [...prev, { ...expense, id: Date.now() }]);
      setShowExpenseModal(false);
    }
    setExpenseDraft({ date: new Date().toISOString().slice(0,10), category: 'other' });
    toast({ title: 'تم بنجاح', description: editingExpense ? 'تم تحديث المصروف' : 'تم إضافة المصروف' });
  };

  const handleSort = (key: string, currentSort: SortConfig, setSort: (s: SortConfig) => void) => {
    setSort({
      key,
      direction: currentSort.key === key && currentSort.direction === 'asc' ? 'desc' : 'asc'
    });
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
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="owner" className="flex items-center gap-2">
            <Wallet className="h-4 w-4" />
            أموال المالك
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

        {/* Owner's Daily Funds Tab */}
        <TabsContent value="owner" className="space-y-4">
          <Card className="bg-card border-border">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>أموال المالك - ملخص اليوم</CardTitle>
                  <CardDescription className="mt-2">
                    {ownerTotals.startingFunds > 0 ? (
                      <div className="flex items-center gap-4 mt-2">
                        <span className="text-sm">بدء: <strong className="text-foreground">{ownerTotals.startingFunds.toLocaleString()}</strong> د.ت</span>
                        <span className="text-sm">مصروف: <strong className="text-destructive">{ownerTotals.totalSpent.toLocaleString()}</strong> د.ت</span>
                        <span className="text-sm">المتبقي: <strong className="text-primary">{ownerTotals.balance.toLocaleString()}</strong> د.ت</span>
                        <span className="text-sm">الحاويات: <strong>{ownerTotals.containers}</strong></span>
                        <span className="text-sm">المبيعات: <strong>{ownerTotals.sales}</strong></span>
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
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditingOwnerFund(fund)}
                            >
                              <Edit3 className="h-4 w-4" />
                            </Button>
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
                        <TableRow key={worker.id}>
                          <TableCell>{worker.firstName}</TableCell>
                          <TableCell>{worker.lastName}</TableCell>
                          <TableCell>{worker.phone || '—'}</TableCell>
                          <TableCell>
                            <Badge variant={worker.status === 'active' ? 'default' : 'secondary'}>
                              {worker.status === 'active' ? 'نشط' : 'غير نشط'}
                            </Badge>
                          </TableCell>
                          <TableCell>{worker.totalPaid?.toLocaleString() || 0} د.ت</TableCell>
                          <TableCell>
                            <Badge variant={worker.outstandingBalance && worker.outstandingBalance > 0 ? 'destructive' : 'default'}>
                              {worker.outstandingBalance?.toLocaleString() || 0} د.ت
                            </Badge>
                          </TableCell>
                          <TableCell>
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
                                <TableCell>{payment.method === 'cash' ? 'نقداً' : payment.method === 'transfer' ? 'تحويل' : 'شيك'}</TableCell>
                                <TableCell className="max-w-[200px] truncate">{payment.notes || '—'}</TableCell>
                                <TableCell>
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
                      setEditingOwnerFund({
                        ...editingOwnerFund,
                        startingFunds: newAmount,
                        balance: newAmount - (editingOwnerFund.amountSpent || 0)
                      });
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ownerSpent">المصروف</Label>
                  <Input
                    id="ownerSpent"
                    type="number"
                    value={editingOwnerFund.amountSpent || ''}
                    onChange={(e) => {
                      const newSpent = Number(e.target.value);
                      setEditingOwnerFund({
                        ...editingOwnerFund,
                        amountSpent: newSpent,
                        balance: (editingOwnerFund.startingFunds || 0) - newSpent
                      });
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label>المتبقي</Label>
                  <Input
                    value={editingOwnerFund.balance.toLocaleString()}
                    disabled
                    className="bg-muted"
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
    </div>
  );
}
