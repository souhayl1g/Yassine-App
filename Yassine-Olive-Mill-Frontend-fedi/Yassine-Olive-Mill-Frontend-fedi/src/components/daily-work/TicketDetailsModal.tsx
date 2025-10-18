import React from 'react';
import { 
  X, 
  Printer, 
  QrCode, 
  Clock, 
  Box, 
  Building2, 
  Users, 
  Activity, 
  TrendingUp, 
  RefreshCw, 
  Coffee 
} from 'lucide-react';
import { OliveButton } from '@/components/ui/olive-button';
import { Ticket, Price } from '@/types/daily-work';

interface TicketDetailsModalProps {
  isOpen: boolean;
  ticket: Ticket | null;
  pressingHistory: any[];
  loadingPressingHistory: boolean;
  currentPrices: Price | null;
  onClose: () => void;
  onPrint: (ticket: Ticket) => void;
  onShowQR: (ticket: Ticket) => void;
}

export function TicketDetailsModal({
  isOpen,
  ticket,
  pressingHistory,
  loadingPressingHistory,
  currentPrices,
  onClose,
  onPrint,
  onShowQR,
}: TicketDetailsModalProps) {
  if (!isOpen || !ticket) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 text-foreground rounded-lg p-6 w-full max-w-2xl shadow-lg relative max-h-[90vh] overflow-y-auto">
        <button 
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200" 
          onClick={onClose}
        >
          <X className="h-5 w-5" />
        </button>

        <h2 className="text-2xl font-bold mb-6 text-primary">تفاصيل التذكرة الكاملة</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground border-b pb-2">المعلومات الأساسية</h3>
            
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">رقم التذكرة:</span>
                <span className="font-medium text-foreground">#{ticket.ticketNumber}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-muted-foreground">معرف التذكرة:</span>
                <span className="font-medium text-foreground">#{ticket.id}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-muted-foreground">اسم العميل:</span>
                <span className="font-medium text-foreground">{ticket.clientName}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-muted-foreground">معرف العميل:</span>
                <span className="font-medium text-foreground">#{ticket.clientId}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-muted-foreground">نوع العملية:</span>
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  ticket.operationType === 'sale' 
                    ? 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-200'
                    : 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200'
                }`}>
                  {ticket.operationType === 'sale' ? 'بيع' : 'عصر'}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-muted-foreground">حالة التذكرة:</span>
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  ticket.status === 'received' 
                    ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' 
                    : ticket.status === 'in_process'
                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                    : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                }`}>
                  {ticket.status === 'received' ? 'مستلم' : 
                   ticket.status === 'in_process' ? 'قيد المعالجة' : 'مكتمل'}
                </span>
              </div>
            </div>
          </div>

          {/* Weight Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground border-b pb-2">معلومات الأوزان</h3>
            
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">الوزن الداخل:</span>
                <span className="font-medium text-foreground">{ticket.weightIn} كيلو</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-muted-foreground">الوزن الخارج:</span>
                <span className="font-medium text-foreground">
                  {ticket.weightOut !== undefined ? `${ticket.weightOut} كيلو` : 'لم يتم الوزن بعد'}
                </span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-muted-foreground">صافي الوزن:</span>
                <span className="font-medium text-primary">
                  {ticket.netWeight !== undefined ? `${ticket.netWeight} كيلو` : `${ticket.weightIn} كيلو`}
                </span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-muted-foreground">عدد الصناديق:</span>
                <span className="font-medium text-foreground">{ticket.numberOfBoxes || 0} صندوق</span>
              </div>
            </div>
          </div>

          {/* Bidons Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground border-b pb-2">معلومات البيدونات</h3>
            
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">البيدونات المجلبة:</span>
                <span className="font-medium text-foreground">
                  {pressingHistory.find(h => h.type === 'batch_created')?.details?.bidonsBrought || 0} بيدون
                </span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-muted-foreground">البيدونات المنتجة:</span>
                <span className="font-medium text-primary">
                  {pressingHistory
                    .filter(h => h.type === 'session_end')
                    .reduce((total, session) => total + (session.details?.oilProduced || 0), 0)} بيدون
                </span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-muted-foreground">البيدونات الإضافية المباعة للعميل:</span>
                <span className="font-bold text-green-600 dark:text-green-400">
                  {(() => {
                    const brought = pressingHistory.find(h => h.type === 'batch_created')?.details?.bidonsBrought || 0;
                    const produced = pressingHistory
                      .filter(h => h.type === 'session_end')
                      .reduce((total, session) => total + (session.details?.oilProduced || 0), 0);
                    const toReturn = Math.max(0, produced - brought);
                    return toReturn;
                  })()} بيدون
                </span>
              </div>
              
              {/* Extra Bidons Cost Calculation */}
              {(() => {
                const brought = pressingHistory.find(h => h.type === 'batch_created')?.details?.bidonsBrought || 0;
                const produced = pressingHistory
                  .filter(h => h.type === 'session_end')
                  .reduce((total, session) => total + (session.details?.oilProduced || 0), 0);
                const extraBidons = Math.max(0, produced - brought);
                const emptyBidonPrice = currentPrices?.empty_bidon_price || 0;
                const totalExtraBidonsCost = extraBidons * emptyBidonPrice;
                
                if (extraBidons > 0 && emptyBidonPrice > 0) {
                  return (
                    <div className="p-3 bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800 rounded-lg">
                      <div className="text-sm text-orange-800 dark:text-orange-200">
                        <strong>تكلفة البيدونات الإضافية:</strong><br />
                        {extraBidons} بيدون × {emptyBidonPrice} دينار = <strong>{totalExtraBidonsCost.toFixed(2)} دينار</strong>
                      </div>
                    </div>
                  );
                }
                return null;
              })()}
            </div>
          </div>

          {/* Financial Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground border-b pb-2">المعلومات المالية</h3>
            
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">سعر الوحدة:</span>
                <span className="font-medium text-foreground">
                  {ticket.unitPrice ? `${ticket.unitPrice} دينار/كيلو` : 'غير محدد'}
                </span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-muted-foreground">المبلغ الإجمالي:</span>
                <span className="font-bold text-primary text-lg">
                  {ticket.totalAmount ? `${ticket.totalAmount} دينار` : 'غير محسوب'}
                </span>
              </div>

              {ticket.totalAmount && ticket.netWeight && ticket.unitPrice && (
                <div className="p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <div className="text-sm text-blue-800 dark:text-blue-200">
                    <strong>حساب المبلغ:</strong><br />
                    {ticket.netWeight} كيلو × {ticket.unitPrice} دينار = {(ticket.netWeight * ticket.unitPrice).toFixed(2)} دينار
                    {ticket.totalAmount > (ticket.netWeight * ticket.unitPrice) && (
                      <span className="block mt-1 text-xs">
                        (تم تطبيق الحد الأدنى 40 دينار)
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Date Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground border-b pb-2">معلومات التواريخ</h3>
            
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">تاريخ الاستلام:</span>
                <span className="font-medium text-foreground">
                  {new Date(ticket.dateReceived).toLocaleDateString('ar-TN')}
                </span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-muted-foreground">وقت الاستلام:</span>
                <span className="font-medium text-foreground">
                  {new Date(ticket.dateReceived).toLocaleTimeString('ar-TN')}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-muted-foreground">منذ:</span>
                <span className="font-medium text-foreground">
                  {Math.floor((new Date().getTime() - new Date(ticket.dateReceived).getTime()) / (1000 * 60 * 60 * 24))} يوم
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Notes Section */}
        {ticket.notes && (
          <div className="mt-6">
            <h3 className="text-lg font-semibold text-foreground border-b pb-2 mb-3">الملاحظات</h3>
            <div className="p-4 bg-muted/20 rounded-lg">
              <p className="text-foreground whitespace-pre-wrap">{ticket.notes}</p>
            </div>
          </div>
        )}

        {/* QR Code Section */}
        {ticket.qrCode && (
          <div className="mt-6">
            <h3 className="text-lg font-semibold text-foreground border-b pb-2 mb-3">رمز QR</h3>
            <div className="flex justify-center">
              <div className="p-4 bg-white rounded-lg border">
                <img 
                  src={ticket.qrCode} 
                  alt="QR Code" 
                  className="w-32 h-32"
                />
              </div>
            </div>
          </div>
        )}

        {/* Processing Workflow History */}
        <div className="mt-6">
          <h3 className="text-lg font-semibold text-foreground border-b pb-2 mb-3">سير العمل ومراحل التشغيل</h3>
          
          {loadingPressingHistory ? (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <span className="mr-3 text-muted-foreground">جاري تحميل التاريخ...</span>
            </div>
          ) : pressingHistory.length > 0 ? (
            <div className="space-y-4 max-h-80 overflow-y-auto">
              {/* Timeline visualization */}
              <div className="relative">
                {pressingHistory.map((entry: any, index: number) => (
                  <div key={`${entry.type}-${entry.id}-${index}`} className="relative flex items-start mb-6 last:mb-0">
                    {/* Timeline line */}
                    {index < pressingHistory.length - 1 && (
                      <div className="absolute right-4 top-8 w-0.5 h-8 bg-border"></div>
                    )}
                    
                    {/* Status indicator */}
                    <div className="flex-shrink-0 ml-4">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        entry.status === 'completed' ? 'bg-green-100 dark:bg-green-900' :
                        entry.status === 'active' ? 'bg-blue-100 dark:bg-blue-900' :
                        'bg-gray-100 dark:bg-gray-800'
                      }`}>
                        {entry.type === 'batch_created' && <Box className={`h-4 w-4 ${entry.status === 'completed' ? 'text-green-600 dark:text-green-300' : 'text-gray-600 dark:text-gray-400'}`} />}
                        {entry.type === 'room_assignment' && <Building2 className={`h-4 w-4 ${entry.status === 'completed' ? 'text-green-600 dark:text-green-300' : 'text-gray-600 dark:text-gray-400'}`} />}
                        {entry.type === 'box_loading' && <Users className={`h-4 w-4 ${entry.status === 'completed' ? 'text-green-600 dark:text-green-300' : 'text-gray-600 dark:text-gray-400'}`} />}
                        {entry.type === 'session_start' && <Activity className={`h-4 w-4 ${entry.status === 'completed' ? 'text-green-600 dark:text-green-300' : 'text-gray-600 dark:text-gray-400'}`} />}
                        {entry.type === 'session_end' && <TrendingUp className={`h-4 w-4 ${entry.status === 'completed' ? 'text-green-600 dark:text-green-300' : 'text-gray-600 dark:text-gray-400'}`} />}
                        {entry.type === 'session_active' && <RefreshCw className={`h-4 w-4 animate-spin ${entry.status === 'active' ? 'text-blue-600 dark:text-blue-300' : 'text-gray-600 dark:text-gray-400'}`} />}
                        {entry.type === 'batch_completed' && <Coffee className={`h-4 w-4 ${entry.status === 'completed' ? 'text-green-600 dark:text-green-300' : 'text-gray-600 dark:text-gray-400'}`} />}
                      </div>
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1 bg-muted/20 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-medium text-foreground">{entry.title}</h4>
                          <p className="text-sm text-muted-foreground mt-1">{entry.description}</p>
                        </div>
                        <div className="text-left">
                          <div className="text-xs text-muted-foreground">
                            {new Date(entry.timestamp).toLocaleDateString('ar-TN')}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(entry.timestamp).toLocaleTimeString('ar-TN', { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </div>
                        </div>
                      </div>
                      
                      {/* Additional details based on entry type */}
                      {entry.details && (
                        <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                          {entry.type === 'batch_created' && (
                            <>
                              <div>
                                <span className="text-muted-foreground">إجمالي الصناديق: </span>
                                <span className="font-medium">{entry.details.totalBoxes}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">الوزن الداخل: </span>
                                <span className="font-medium">{entry.details.weightIn} كيلو</span>
                              </div>
                              {entry.details.bidonsBrought !== undefined && (
                                <div>
                                  <span className="text-muted-foreground">البيدونات المجلبة: </span>
                                  <span className="font-medium">{entry.details.bidonsBrought} بيدون</span>
                                </div>
                              )}
                            </>
                          )}
                          
                          {entry.type === 'room_assignment' && (
                            <>
                              <div>
                                <span className="text-muted-foreground">الغرفة: </span>
                                <span className="font-medium">{entry.details.roomName}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">الوقت المقدر: </span>
                                <span className="font-medium">{entry.details.estimatedTime} دقيقة</span>
                              </div>
                            </>
                          )}
                          
                          {entry.type === 'box_loading' && (
                            <>
                              <div>
                                <span className="text-muted-foreground">الصناديق المحملة: </span>
                                <span className="font-medium">{entry.details.boxesLoaded}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">المشغل: </span>
                                <span className="font-medium">{entry.details.operator}</span>
                              </div>
                              {entry.details.notes && (
                                <div className="col-span-2">
                                  <span className="text-muted-foreground">ملاحظات: </span>
                                  <span className="font-medium">{entry.details.notes}</span>
                                </div>
                              )}
                            </>
                          )}
                          
                          {(entry.type === 'session_start' || entry.type === 'session_active') && (
                            <>
                              <div>
                                <span className="text-muted-foreground">الغرفة: </span>
                                <span className="font-medium">{entry.details.roomName}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">الصناديق المعالجة: </span>
                                <span className="font-medium">{entry.details.boxesProcessed}</span>
                              </div>
                            </>
                          )}
                          
                          {entry.type === 'session_end' && (
                            <>
                              <div>
                                <span className="text-muted-foreground">المدة: </span>
                                <span className="font-medium">{entry.details.duration} دقيقة</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">الزيت المنتج: </span>
                                <span className="font-medium">{entry.details.oilProduced} بيدون</span>
                              </div>
                            </>
                          )}
                          
                          {entry.type === 'batch_completed' && (
                            <>
                              <div>
                                <span className="text-muted-foreground">الوزن الصافي: </span>
                                <span className="font-medium">{entry.details.netWeight} كيلو</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">الصناديق المحملة: </span>
                                <span className="font-medium">{entry.details.boxesLoaded}/{entry.details.totalBoxes}</span>
                              </div>
                              {entry.details.totalAmount && (
                                <div className="col-span-2">
                                  <span className="text-muted-foreground">المبلغ الإجمالي: </span>
                                  <span className="font-bold text-primary">{entry.details.totalAmount} دينار</span>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      )}
                      
                      {/* Status badge */}
                      <div className="mt-3">
                        <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                          entry.status === 'completed' 
                            ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200'
                            : entry.status === 'active'
                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200'
                            : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                        }`}>
                          {entry.status === 'completed' ? 'مكتمل' : 
                           entry.status === 'active' ? 'نشط' : 'في الانتظار'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="text-muted-foreground mb-2">
                <Clock className="h-12 w-12 mx-auto mb-2 opacity-50" />
                لا يوجد تاريخ معالجة لهذه التذكرة
              </div>
              <p className="text-sm text-muted-foreground">
                عندما يتم تحميل الصناديق أو بدء جلسة عصر، ستظهر مراحل التشغيل هنا
              </p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 mt-8 pt-4 border-t">
          <OliveButton 
            onClick={() => onPrint(ticket)}
            className="flex-1"
          >
            <Printer className="h-4 w-4 mr-2" />
            طباعة التذكرة
          </OliveButton>
          
          {ticket.qrCode && (
            <OliveButton 
              variant="outline"
              onClick={() => onShowQR(ticket)}
              className="flex-1"
            >
              <QrCode className="h-4 w-4 mr-2" />
              عرض QR
            </OliveButton>
          )}
          
          <OliveButton 
            variant="outline"
            onClick={onClose}
            className="flex-1"
          >
            إغلاق
          </OliveButton>
        </div>
      </div>
    </div>
  );
}
