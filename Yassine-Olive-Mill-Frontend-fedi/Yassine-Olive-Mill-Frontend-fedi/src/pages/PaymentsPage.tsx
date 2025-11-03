import React, { useState, useEffect } from 'react';
import { PaymentHistoryModal } from '@/components/payments/PaymentHistoryModal';
import { PaymentSummary } from '@/components/payments/PaymentSummary';
import { usePaymentOperations } from '@/hooks/usePaymentOperations';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, TrendingUp, Users, Receipt } from 'lucide-react';

export function PaymentsPage() {
  const payment = usePaymentOperations();
  const [paymentStats, setPaymentStats] = useState({
    totalPaid: 0,
    totalTransactions: 0,
    methodStats: {},
    averagePayment: 0
  });

  // Load payment statistics on mount
  useEffect(() => {
    loadPaymentStats();
  }, []);

  const loadPaymentStats = async () => {
    const stats = await payment.getPaymentStats();
    setPaymentStats(stats);
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-4xl font-bold text-foreground">نظام الدفعات</h1>
        <p className="text-lg text-muted-foreground mt-2">
          إدارة ومتابعة جميع الدفعات والفواتير
        </p>
      </div>

      {/* Quick Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي الإيرادات</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {paymentStats.totalPaid.toFixed(2)} دينار
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">عدد المعاملات</CardTitle>
            <Receipt className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {paymentStats.totalTransactions}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">متوسط الدفع</CardTitle>
            <TrendingUp className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {paymentStats.averagePayment.toFixed(2)} دينار
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">طرق الدفع</CardTitle>
            <Users className="h-4 w-4 text-indigo-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-indigo-600">
              {Object.keys(paymentStats.methodStats).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payment Summary */}
      <PaymentSummary
        totalPaid={paymentStats.totalPaid}
        totalTransactions={paymentStats.totalTransactions}
        methodStats={paymentStats.methodStats}
        averagePayment={paymentStats.averagePayment}
        onViewHistory={() => payment.openPaymentHistory()}
      />

      {/* Actions */}
      <Card>
        <CardHeader>
          <CardTitle>الإجراءات السريعة</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Button onClick={() => payment.openPaymentHistory()}>
              عرض جميع الدفعات
            </Button>
            <Button variant="outline" onClick={loadPaymentStats}>
              تحديث الإحصائيات
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Payment History Modal */}
      <PaymentHistoryModal
        isOpen={payment.isPaymentHistoryOpen}
        onClose={payment.closePaymentHistory}
        clientId={payment.selectedClientId}
        clientName={payment.selectedClientName}
      />
    </div>
  );
}
