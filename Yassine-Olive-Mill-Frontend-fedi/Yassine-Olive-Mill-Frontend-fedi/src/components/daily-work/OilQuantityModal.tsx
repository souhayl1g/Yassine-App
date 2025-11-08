import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { OliveButton } from '@/components/ui/olive-button';
import { Ticket } from '@/types/daily-work';
import { useNavigate } from 'react-router-dom';
import { api } from '@/integrations/api/client';

interface OilQuantityModalProps {
  isOpen: boolean;
  ticket: Ticket | null;
  onClose: () => void;
  onSave?: () => void;
}

export function OilQuantityModal({
  isOpen,
  ticket,
  onClose,
  onSave,
}: OilQuantityModalProps) {
  const navigate = useNavigate();
  const [quantity, setQuantity] = useState<string>('');
  const [saving, setSaving] = useState(false);

  const isMilling = ticket?.operationType === 'milling';
  const isSale = ticket?.operationType === 'sale';

  const handleSave = async () => {
    if (!ticket) return;
    
    const quantityNum = parseFloat(quantity);
    if (isNaN(quantityNum) || quantityNum <= 0) {
      alert(isMilling ? 'يرجى إدخال كمية صحيحة باللتر' : 'يرجى إدخال كمية صحيحة بالكيلو');
      return;
    }

    try {
      setSaving(true);

      if (isMilling) {
        // For milling: save quantity as liters and convert to bidons (assuming 16 liters per bidon)
        // Note: We store the liters directly, but calculate bidons for display
        const bidonsProduced = Math.floor(quantityNum / 16);
        const payload: any = {
          number_of_bidons: bidonsProduced,
          // Store the liters quantity if backend supports it, otherwise just bidons
        };

        await api.put(`/batches/${ticket.id}`, payload);
        
        if (onSave) {
          onSave();
        }
        onClose();
      } else if (isSale) {
        // For sale: save quantity as weight_out (this is the olive weight in kilos)
        // Then navigate to containers page to add this quantity
        const payload: any = {
          weight_out: quantityNum,
          status: 'in_process', // Keep as in_process until containers are filled
        };

        await api.put(`/batches/${ticket.id}`, payload);
        
        // Navigate to containers page with ticket info and quantity
        navigate('/containers', { 
          state: { 
            ticketId: ticket.id, 
            quantity: quantityNum,
            ticketNumber: ticket.ticketNumber,
            operationType: 'sale'
          } 
        });
        
        if (onSave) {
          onSave();
        }
        onClose();
      }
    } catch (error: any) {
      console.error('Error saving oil quantity:', error);
      alert('حدث خطأ في حفظ الكمية');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isMilling ? 'إدخال كمية الزيت' : 'إدخال كمية الزيتون'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>
              {isMilling ? 'كمية الزيت باللتر *' : 'كمية الزيتون بالكيلو *'}
            </Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder={isMilling ? 'أدخل كمية الزيت باللتر' : 'أدخل كمية الزيتون بالكيلو'}
              className="mt-2"
            />
            {isMilling && (
              <p className="text-sm text-muted-foreground mt-2">
                💡 سيتم حساب عدد البدونات تلقائياً (بدون = 16 لتر)
              </p>
            )}
            {isSale && (
              <p className="text-sm text-muted-foreground mt-2">
                💡 سيتم توجيهك إلى صفحة الحاويات لإضافة هذه الكمية
              </p>
            )}
          </div>

          <div className="flex gap-3">
            <OliveButton
              onClick={handleSave}
              disabled={saving || !quantity}
              className="flex-1"
            >
              {saving ? 'جارٍ الحفظ...' : 'حفظ'}
            </OliveButton>
            <OliveButton
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              إلغاء
            </OliveButton>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

