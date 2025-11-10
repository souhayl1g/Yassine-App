import React, { useEffect, useMemo, useState } from 'react';
import { api } from '@/integrations/api/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';

export type OilSale = {
  id: number;
  clientId: number;
  clientName: string;
  weightKg: number;
  unitPrice: number;
  totalAmount: number;
  createdAt: string;
};

export function OilSalesPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [sales, setSales] = useState<OilSale[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const res = await api.get<{ oilSales?: OilSale[]; pagination?: any } | OilSale[]>('/oil-sales');
      let items: OilSale[] = [];
      if (Array.isArray(res)) items = res as OilSale[];
      else if (res && (res as any).oilSales) items = (res as any).oilSales;
      setSales(items);
    } catch (err: any) {
      toast({ variant: 'destructive', title: t('common.error'), description: err?.message || 'فشل تحميل مبيعات الزيت' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const totalToday = useMemo(() => {
    const today = new Date().toISOString().slice(0,10);
    return sales
      .filter(s => s.createdAt?.slice(0,10) === today)
      .reduce((sum, s) => sum + (Number(s.totalAmount) || 0), 0);
  }, [sales]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('oilSales.title')}</h1>
        <Button onClick={load} disabled={loading} variant="outline">
          <RefreshCw className={loading ? 'animate-spin h-4 w-4' : 'h-4 w-4'} />
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between w-full">
            <span>{t('oilSales.list')}</span>
            <span className="text-sm text-muted-foreground">{t('oilSales.totalToday')}: {totalToday.toLocaleString()}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="w-full overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[80px]">#</TableHead>
                  <TableHead>{t('oilSales.client')}</TableHead>
                  <TableHead>{t('oilSales.weight')}</TableHead>
                  <TableHead>{t('oilSales.unitPrice')}</TableHead>
                  <TableHead>{t('oilSales.total')}</TableHead>
                  <TableHead>{t('common.date')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sales.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      {loading ? t('common.loading') : t('common.noData')}
                    </TableCell>
                  </TableRow>
                )}
                {sales.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>{s.id}</TableCell>
                    <TableCell>{s.clientName}</TableCell>
                    <TableCell>{s.weightKg}</TableCell>
                    <TableCell>{s.unitPrice}</TableCell>
                    <TableCell className="font-semibold">{s.totalAmount}</TableCell>
                    <TableCell>{new Date(s.createdAt).toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default OilSalesPage;
