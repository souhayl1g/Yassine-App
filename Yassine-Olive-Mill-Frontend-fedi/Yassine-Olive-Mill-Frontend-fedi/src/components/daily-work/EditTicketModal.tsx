
import React, { useState, useEffect } from 'react';
import { X, RefreshCw, Minimize2, FileText } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { OliveButton } from '@/components/ui/olive-button';
import { Ticket, EditTicketForm, Price } from '@/types/daily-work';

interface EditTicketModalProps {
  isOpen: boolean;
  ticket: Ticket | null;
  editForm: EditTicketForm;
  setEditForm: React.Dispatch<React.SetStateAction<EditTicketForm>>;
  currentPrices: Price | null;
  loadingPrices: boolean;
  isSaving: boolean;
  onSave: () => void;
  onMinimize: (ticket: Ticket) => void;
  onShowDetails: (ticket: Ticket) => void;
  onClose: () => void;
  calculateEditNetWeight: () => number;
  calculateEditTotalAmount: (operationType?: string) => Promise<number>;
  calculateEditTotalAmountWithDetails: (operationType?: string) => Promise<{
    amount: number;
    calculationMethod: string;
    containerWeight?: number;
  }>;
  isMinimumPriceApplied: (operationType?: string) => Promise<boolean>;
  isFinishingOperation?: boolean; // New prop to indicate if this is a finishing operation
}

export function EditTicketModal({
  isOpen,
  ticket,
  editForm,
  setEditForm,
  currentPrices,
  loadingPrices,
  isSaving,
  onSave,
  onMinimize,
  onShowDetails,
  onClose,
  calculateEditNetWeight,
  calculateEditTotalAmount,
  calculateEditTotalAmountWithDetails,
  isMinimumPriceApplied,
  isFinishingOperation = false,
}: EditTicketModalProps) {
  const [totalAmount, setTotalAmount] = useState<number>(0);
  const [isMinimumApplied, setIsMinimumApplied] = useState<boolean>(false);
  const [calculationLoading, setCalculationLoading] = useState<boolean>(false);

  // Check if the form is valid for saving
  const isFormValid = () => {
    if (isFinishingOperation) {
      const numberOfBoxes = parseInt(editForm.numberOfBoxes) || 0;
      return numberOfBoxes > 0;
    }
    return true;
  };

  // Update calculations when form changes
  useEffect(() => {
    if (editForm.weightOut && ticket?.operationType) {
      setCalculationLoading(true);
      Promise.all([
        calculateEditTotalAmount(ticket.operationType),
        isMinimumPriceApplied(ticket.operationType)
      ]).then(([amount, isMinimum]) => {
        setTotalAmount(amount);
        setIsMinimumApplied(isMinimum);
        setCalculationLoading(false);
      }).catch(() => {
        setCalculationLoading(false);
      });
    }
  }, [editForm.weightOut, editForm.numberOfBoxes, editForm.taux, ticket?.operationType, calculateEditTotalAmount, isMinimumPriceApplied]);

  if (!isOpen || !ticket) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 text-foreground rounded-lg p-6 w-full max-w-lg shadow-lg relative">
        <button 
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 z-10" 
          onClick={onClose}
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center justify-between mb-6 pr-8">
          <h2 className="text-2xl font-bold text-primary">تعديل التذكرة #{ticket.ticketNumber}</h2>
          
          {/* Operation type badge - inline with header */}
          <div className={`inline-flex items-center px-3 py-1 rounded-lg text-sm font-medium ${
            ticket?.operationType === 'sale' 
              ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200 border border-orange-200 dark:border-orange-800'
              : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 border border-green-200 dark:border-green-800'
          }`}>
            {ticket?.operationType === 'sale' ? '🛒 عملية بيع' : '🫒 عملية عصر'}
          </div>
        </div>

        {/* Static ticket info */}
        <div className="mb-6 p-4 bg-muted/20 rounded-lg">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="text-muted-foreground">رقم التذكرة: <span className="text-foreground font-medium">#{ticket.ticketNumber}</span></div>
            <div className="text-muted-foreground">اسم العميل: <span className="text-foreground font-medium">{ticket.clientName}</span></div>
            <div className="text-muted-foreground">الوزن الداخل: <span className="text-foreground font-medium">{ticket.weightIn} كيلو</span></div>
            <div className="text-muted-foreground">تاريخ الاستلام: <span className="text-foreground font-medium">
              {new Date(ticket.dateReceived).toLocaleDateString('ar-TN')}
            </span></div>
          </div>
        </div>

        {/* Editable fields */}
        <div className="mb-6">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-sm">
                <span className="block mb-2">الوزن الخارج (كيلو)</span>
                <Input
                  type="number"
                  step="0.01"
                  value={editForm.weightOut}
                  onChange={(e) => setEditForm((p) => ({ ...p, weightOut: e.target.value }))}
                  placeholder="أدخل الوزن الخارج"
                  className="w-full"
                />
              </label>
            </div>
            <div>
              <label className="text-sm">
                <span className="block mb-2">عدد الصناديق</span>
                <Input
                  type="number"
                  min="0"
                  value={editForm.numberOfBoxes}
                  onChange={(e) => setEditForm((p) => ({ ...p, numberOfBoxes: e.target.value }))}
                  placeholder="0"
                  className="w-full"
                  disabled={isFinishingOperation}
                />
                {isFinishingOperation && (
                  <p className="text-xs text-muted-foreground mt-1">
                    لا يمكن تعديل عدد الصناديق أثناء إكمال العملية. انتظر حتى يقوم المسؤول بمسح وإدخال العدد.
                  </p>
                )}
              </label>
            </div>
          </div>
          
          {/* Taux field for sale operations */}
          {ticket?.operationType === 'sale' && (
            <div className="mb-2">
              <label className="text-sm">
                <span className="block mb-2">معدل الاستخراج (التوكس) - اختياري</span>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={editForm.taux}
                  onChange={(e) => setEditForm((p) => ({ ...p, taux: e.target.value }))}
                  placeholder="أدخل نسبة استخراج الزيت (مثال: 18.5)"
                  className="w-full"
                />
              </label>
            </div>
          )}
          
          {ticket?.operationType === 'sale' && (
            <div className="text-xs text-muted-foreground">
              إذا لم يتم إدخال معدل الاستخراج، سيتم حساب السعر بناءً على دفعات الزيت المسجلة
            </div>
          )}
        </div>

        {/* Display current pricing information */}
        <div className="mb-4">
          <div className="p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded">
            <div className="text-xs font-medium text-blue-800 dark:text-blue-200 mb-2">السعر المستخدم للحساب:</div>
            {loadingPrices ? (
              <div className="flex items-center text-blue-700 dark:text-blue-300 text-sm">
                <RefreshCw className="h-3 w-3 animate-spin mr-2" />
                جاري تحميل الأسعار...
              </div>
            ) : currentPrices ? (
              <div>
                {ticket?.operationType === 'sale' ? (
                  currentPrices.oil_client_selling_price_per_kg > 0 ? (
                    <div className="text-base font-bold text-blue-700 dark:text-blue-300">
                      سعر بيع الزيت: {currentPrices.oil_client_selling_price_per_kg} دينار/كيلو
                    </div>
                  ) : (
                    <div className="text-red-700 dark:text-red-400 text-sm">
                      لا يوجد سعر بيع الزيت محدد في النظام. يرجى تحديد الأسعار في صفحة الإعدادات.
                    </div>
                  )
                ) : (
                  currentPrices.milling_price_per_kg > 0 ? (
                    <div className="text-base font-bold text-blue-700 dark:text-blue-300">
                      سعر العصر: {currentPrices.milling_price_per_kg} دينار/كيلو
                    </div>
                  ) : (
                    <div className="text-red-700 dark:text-red-400 text-sm">
                      لا يوجد سعر العصر محدد في النظام. يرجى تحديد الأسعار في صفحة الإعدادات.
                    </div>
                  )
                )}
              </div>
            ) : (
              <div className="text-red-700 dark:text-red-400 text-sm">
                لا توجد أسعار محددة في النظام. يرجى تحديد الأسعار في صفحة الإعدادات.
              </div>
            )}
          </div>
        </div>

        {/* Calculated values */}
        {editForm.weightOut && (
          <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
            <div className="p-3 rounded bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800">
              <div className="text-blue-800 dark:text-blue-200 font-medium">الوزن الصافي</div>
              <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                {calculateEditNetWeight().toFixed(2)} كيلو
              </div>
            </div>
            <div className="p-3 rounded bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800">
              <div className="text-green-800 dark:text-green-200 font-medium">المبلغ الإجمالي</div>
              <div className="text-lg font-bold text-green-600 dark:text-green-400">
                {calculationLoading ? (
                  <RefreshCw className="h-4 w-4 animate-spin inline" />
                ) : (
                  <>
                    {totalAmount.toFixed(2)} دينار
                    {isMinimumApplied && (
                      <div className="text-xs text-green-600 dark:text-green-400 mt-1">
                        تم تطبيق الحد الأدنى للسعر (40 دينار)
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="mb-6">
          <label className="text-sm">
            <span className="block mb-1">ملاحظات (اختياري)</span>
            <Textarea
              value={editForm.notes}
              onChange={(e) => setEditForm((p) => ({ ...p, notes: e.target.value }))}
              placeholder="أدخل أي ملاحظات إضافية"
              className="w-full"
            />
          </label>
        </div>

        {/* Validation message for finishing operations */}
        {isFinishingOperation && !isFormValid() && (
          <div className="mb-4 p-3 bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800 rounded">
            <div className="text-orange-800 dark:text-orange-200 text-sm">
              <strong>تنبيه:</strong> لا يمكن إكمال العملية بدون تحديد عدد الصناديق. يرجى انتظار المسؤول لمسح وإدخال عدد الصناديق المطلوب.
            </div>
          </div>
        )}

        <div className="space-y-3">
          {/* Primary Action */}
          <OliveButton 
            onClick={onSave} 
            disabled={isSaving || !isFormValid()}
            className="w-full"
            size="lg"
          >
            {isSaving ? 'جارٍ الحفظ...' : 'حفظ التغييرات'}
          </OliveButton>
          
          {/* Secondary Actions */}
          <div className="grid grid-cols-3 gap-2">
            <OliveButton 
              variant="outline" 
              onClick={() => onMinimize(ticket)}
              size="sm"
            >
              <Minimize2 className="h-4 w-4 mr-1" />
              تصغير
            </OliveButton>
            <OliveButton 
              variant="outline"
              onClick={() => onShowDetails(ticket)}
              size="sm"
            >
              <FileText className="h-4 w-4 mr-1" />
              تفاصيل
            </OliveButton>
            <OliveButton 
              variant="outline" 
              onClick={onClose}
              size="sm"
            >
              إلغاء
            </OliveButton>
          </div>
        </div>
      </div>
    </div>
  );
}
