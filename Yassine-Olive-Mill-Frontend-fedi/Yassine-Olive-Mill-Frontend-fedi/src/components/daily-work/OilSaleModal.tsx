import React, { useEffect, useState, useMemo, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { OliveButton } from '@/components/ui/olive-button';
import { api } from '@/integrations/api/client';
import { getPayload } from '@/hooks/daily-work/utils';
import { Client } from '@/types/daily-work';
import { QRCodeSVG } from 'qrcode.react';

interface OilSaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  clients: Client[];
  reloadClients?: () => Promise<void>;
}

interface CreatedSale {
  id: number;
  clientId: number;
  clientName: string;
  weightKg: number;
  unitPrice: number;
  totalAmount: number;
  createdAt: string;
}

export const OilSaleModal: React.FC<OilSaleModalProps> = ({ isOpen, onClose, clients, reloadClients }) => {
  const [search, setSearch] = useState('');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [weight, setWeight] = useState('');
  const [unitPrice, setUnitPrice] = useState('');
  const [loadingPrices, setLoadingPrices] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createdSale, setCreatedSale] = useState<CreatedSale | null>(null);
  const printRef = useRef<HTMLDivElement | null>(null);

  // Load latest prices so we can prefill unit price (oliveBuyingPricePerKg reused)
  useEffect(() => {
    const loadPrices = async () => {
      if (!isOpen) return;
      setLoadingPrices(true);
      try {
        const res = await api.get<any>('/prices?latest=true');
        if (res && typeof res === 'object') {
          const buying = (res as any).olive_buying_price_per_kg || 0;
          setUnitPrice(buying ? String(buying) : '');
        }
      } catch (e) {
        console.warn('Failed to load prices', e);
      } finally {
        setLoadingPrices(false);
      }
    };
    loadPrices();
  }, [isOpen]);

  // Filter clients
  const filteredClients = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return clients;
    return clients.filter(c =>
      `${c.firstname} ${c.lastname}`.toLowerCase().includes(term)
    );
  }, [clients, search]);

  const resetForm = () => {
    setSearch('');
    setSelectedClient(null);
    setWeight('');
    setCreatedSale(null);
    // keep unitPrice
  };

  const handleCreateSale = async () => {
    if (!selectedClient) return alert('اختر عميل');
    if (!weight) return alert('أدخل وزن الزيت');
    if (!unitPrice) return alert('لا يوجد سعر');
    const w = parseFloat(weight);
    const p = parseFloat(unitPrice);
    if (isNaN(w) || w <= 0) return alert('وزن غير صالح');
    if (isNaN(p) || p <= 0) return alert('سعر غير صالح');

    setCreating(true);
    try {
      const body = { clientId: parseInt(selectedClient.id, 10), weightKg: w, unitPrice: p };
      const res = await api.post<any>('/oil-sales', body);
      const payload: any = getPayload<any>(res) || res;
      const sale = payload.sale || payload;
      setCreatedSale(sale);
      // auto print
      setTimeout(() => triggerPrint(), 50);
    } catch (e: any) {
      alert(e.message || 'فشل إنشاء عملية البيع');
    } finally {
      setCreating(false);
    }
  };

  const buildReceiptHtml = () => {
    if (!createdSale) return '';
    const qrData = JSON.stringify({
      saleId: createdSale.id,
      clientName: createdSale.clientName,
      weightKg: createdSale.weightKg,
      unitPrice: createdSale.unitPrice,
      totalAmount: createdSale.totalAmount,
      date: createdSale.createdAt,
    });
    return (
      <div style={{ width: '70mm', height: '80mm', padding: '2mm', fontFamily: 'Arial, sans-serif', direction: 'rtl', display: 'flex', flexDirection: 'column' }}>
        <div style={{ textAlign: 'center', marginBottom: '1mm' }}>
          <h2 style={{ fontSize: '13px', fontWeight: 'bold', color: '#1d4ed8', margin: 0 }}>💧 إيصال بيع زيت</h2>
          <p style={{ fontSize: '11px', color: '#4b5563', margin: 0 }}>معصرة الحاج لطفي</p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'center', gap: '1mm', marginBottom: '1mm' }}>
          <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#0f172a' }}>{createdSale.clientName}</div>
          <div style={{ fontSize: '11px', color: '#1e3a8a' }}>الوزن: {createdSale.weightKg.toFixed(2)} كلغ</div>
          <div style={{ fontSize: '11px', color: '#1e3a8a' }}>السعر لكل كلغ: {createdSale.unitPrice.toFixed(3)} د.ت</div>
          <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#1d4ed8' }}>الإجمالي: {createdSale.totalAmount.toFixed(3)} د.ت</div>
        </div>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <QRCodeSVG value={qrData} size={70} level="H" includeMargin={false} />
        </div>
        <div style={{ textAlign: 'center', fontSize: '10px', color: '#64748b', marginTop: '2mm' }}>شكراً لكم 🌿</div>
      </div>
    );
  };

  const triggerPrint = () => {
    if (!createdSale) return;
    try {
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      document.body.appendChild(iframe);
      const doc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!doc) return;
      doc.open();
      doc.write('<!DOCTYPE html><html><head><title>طباعة</title></head><body style="margin:0;">');
      const container = document.createElement('div');
      // Render React element to string via innerHTML hack
      const temp = document.createElement('div');
      // Using outerHTML of a temporary wrapper
      temp.appendChild((printRef.current?.firstChild as any)?.cloneNode(true) || document.createElement('div'));
      doc.write(printRef.current?.innerHTML || '');
      doc.write('</body></html>');
      doc.close();
      iframe.onload = () => {
        setTimeout(() => {
          iframe.contentWindow?.print();
          setTimeout(() => document.body.removeChild(iframe), 1000);
        }, 100);
      };
    } catch (e) {
      console.error('Print failed', e);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(o) => { if (!o) { resetForm(); onClose(); } }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>بيع الزيت (باز)</DialogTitle>
          <DialogDescription>اختر العميل ثم أدخل الوزن لطباعة إيصال بيع الزيت</DialogDescription>
        </DialogHeader>

        {/* Step 1: Search & select client */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Input
              placeholder="بحث عن عميل"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <div className="max-h-40 overflow-y-auto space-y-1 border rounded p-2 bg-gray-50">
              {filteredClients.map(c => (
                <div
                  key={c.id}
                  onClick={() => setSelectedClient(c)}
                  className={`p-2 rounded cursor-pointer text-sm flex justify-between ${selectedClient?.id === c.id ? 'bg-blue-600 text-white' : 'bg-white hover:bg-blue-100'}`}
                >
                  <span>{c.firstname} {c.lastname}</span>
                  {selectedClient?.id === c.id && <span>✓</span>}
                </div>
              ))}
              {filteredClients.length === 0 && <div className="text-xs text-gray-500">لا نتائج</div>}
            </div>
            {selectedClient && (
              <div className="text-xs text-blue-700 font-medium">العميل المحدد: {selectedClient.firstname} {selectedClient.lastname}</div>
            )}
          </div>

          {/* Step 2: Weight & Price */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-medium">الوزن (كلغ)</label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">السعر لكل كلغ</label>
              <Input
                type="number"
                min="0"
                step="0.001"
                value={unitPrice}
                onChange={(e) => setUnitPrice(e.target.value)}
                placeholder={loadingPrices ? '...' : '0.000'}
              />
            </div>
          </div>

          {/* Summary */}
          <div className="p-3 rounded bg-blue-50 border border-blue-200 text-sm">
            <div>الإجمالي: <span className="font-bold">{(parseFloat(weight || '0') * parseFloat(unitPrice || '0')).toFixed(3)} د.ت</span></div>
          </div>

          {/* Actions */}
          {!createdSale && (
            <OliveButton
              onClick={handleCreateSale}
              disabled={creating || !selectedClient || !weight || !unitPrice}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white"
            >
              حفظ و طباعة الإيصال
            </OliveButton>
          )}

          {createdSale && (
            <div className="space-y-3">
              <div ref={printRef}>{buildReceiptHtml()}</div>
              <div className="flex gap-2">
                <OliveButton onClick={triggerPrint} className="flex-1">إعادة الطباعة</OliveButton>
                <OliveButton variant="outline" onClick={() => { resetForm(); onClose(); }} className="flex-1">إغلاق</OliveButton>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
