import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  DollarSign, 
  TrendingUp, 
  CreditCard, 
  Banknote, 
  Building, 
  FileText,
  History,
  Receipt
} from 'lucide-react';

interface PaymentSummaryProps {
  totalPaid: number;
  totalTransactions: number;
  methodStats: Record<string, { count: number; total: number }>;
  averagePayment: number;
  onViewHistory: () => void;
  className?: string;
}

export function PaymentSummary({ 
  totalPaid, 
  totalTransactions, 
  methodStats, 
  averagePayment,
  onViewHistory,
  className = '' 
}: PaymentSummaryProps) {
  
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

  const methodEntries = Object.entries(methodStats).sort(([,a], [,b]) => b.total - a.total);

  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 ${className}`}>
      {/* Total Revenue */}
      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">إجمالي الإيرادات</CardTitle>
          <DollarSign className="h-4 w-4 text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">
            {totalPaid.toFixed(2)} دينار
          </div>
          <p className="text-xs text-muted-foreground">
            من {totalTransactions} معاملة
          </p>
        </CardContent>
      </Card>

      {/* Average Payment */}
      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">متوسط الدفع</CardTitle>
          <TrendingUp className="h-4 w-4 text-blue-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-blue-600">
            {averagePayment.toFixed(2)} دينار
          </div>
          <p className="text-xs text-muted-foreground">
            لكل معاملة
          </p>
        </CardContent>
      </Card>

      {/* Payment Methods */}
      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">طرق الدفع</CardTitle>
          <Receipt className="h-4 w-4 text-purple-600" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {methodEntries.length > 0 ? (
              methodEntries.slice(0, 2).map(([method, stats]) => (
                <div key={method} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getPaymentMethodIcon(method)}
                    <span className="text-sm">{getPaymentMethodLabel(method)}</span>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {stats.count}
                  </Badge>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">
                لا توجد دفعات
              </p>
            )}
            {methodEntries.length > 2 && (
              <p className="text-xs text-muted-foreground">
                +{methodEntries.length - 2} طرق أخرى
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">الإجراءات</CardTitle>
          <History className="h-4 w-4 text-indigo-600" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onViewHistory}
              className="w-full"
            >
              <History className="h-4 w-4 mr-2" />
              عرض التاريخ
            </Button>
            <div className="text-xs text-muted-foreground text-center">
              تفاصيل جميع الدفعات
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Payment Methods (if more than 2) */}
      {methodEntries.length > 2 && (
        <Card className="md:col-span-2 lg:col-span-4 hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="text-sm font-medium">تفصيل طرق الدفع</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {methodEntries.map(([method, stats]) => (
                <div key={method} className="text-center p-3 border rounded-lg">
                  <div className="flex justify-center mb-2">
                    {getPaymentMethodIcon(method)}
                  </div>
                  <div className="text-sm font-medium mb-1">
                    {getPaymentMethodLabel(method)}
                  </div>
                  <div className="text-lg font-bold text-primary">
                    {stats.total.toFixed(2)} د
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {stats.count} معاملة
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
