import React from 'react';
import { useTranslation } from 'react-i18next';
import { OliveCard, OliveCardHeader, OliveCardContent, OliveCardTitle } from '@/components/ui/olive-card';
import { OliveButton } from '@/components/ui/olive-button';
import { FileText, RefreshCw, QrCode, Printer, Edit, Trash2, DollarSign, History } from 'lucide-react';
import { Ticket } from '@/types/daily-work';

interface RecentTicketsSectionProps {
  recentTickets: Ticket[];
  loadingTickets: boolean;
  totalTickets: number;
  totalPages: number;
  currentPage: number;
  onTicketClick: (ticket: Ticket) => void;
  onPrintTicket: (ticket: Ticket) => void;
  onShowQrCode: (ticket: Ticket) => void;
  onDeleteTicket: (ticketId: string) => void;
  onPageChange?: (page: number) => void;
  onPayTicket?: (ticket: Ticket) => void;
  onViewPaymentHistory?: (clientId: string, clientName: string) => void;
}

export function RecentTicketsSection({
  recentTickets,
  loadingTickets,
  totalTickets,
  totalPages,
  currentPage,
  onTicketClick,
  onPrintTicket,
  onShowQrCode,
  onDeleteTicket,
  onPageChange,
  onPayTicket,
  onViewPaymentHistory,
}: RecentTicketsSectionProps) {
  const { t } = useTranslation();

  return (
    <div className="max-w-4xl mx-auto">
      <OliveCard>
        <OliveCardHeader>
          <OliveCardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            التذاكر الحديثة
            {totalTickets > 0 && (
              <span className="text-sm font-normal text-muted-foreground">
                ({totalTickets} تذكرة)
              </span>
            )}
          </OliveCardTitle>
        </OliveCardHeader>
        <OliveCardContent>
          {loadingTickets ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="mr-2 text-muted-foreground">جاري التحميل...</span>
            </div>
          ) : recentTickets.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">لا توجد تذاكر حتى الآن</p>
              <p className="text-sm text-muted-foreground mt-1">
                ابدأ بإنشاء أول تذكرة
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {recentTickets.map((ticket) => (
                <div
                  key={ticket.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div
                    className="flex items-center gap-4 flex-1 cursor-pointer"
                    onClick={() => onTicketClick(ticket)}
                  >
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-sm font-semibold text-primary">
                          {(() => {
                            if (!ticket.ticketNumber) return '#';
                            const parts = ticket.ticketNumber.split('/');
                            return parts[parts.length - 1] || '#';
                          })()}
                        </span>
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium text-foreground">
                          {ticket.clientName}
                        </h3>
                        <span
                          className={`text-xs px-2 py-1 rounded-full ${
                            ticket.status === 'completed'
                              ? 'bg-green-100 text-green-800'
                              : ticket.status === 'in_process'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {ticket.status === 'completed'
                            ? 'مكتملة'
                            : ticket.status === 'in_process'
                            ? 'قيد المعالجة'
                            : 'مستلمة'}
                        </span>
                        <span
                          className={`text-xs px-2 py-1 rounded-full ${
                            ticket.operationType === 'sale'
                              ? 'bg-orange-100 text-orange-800'
                              : 'bg-green-100 text-green-800'
                          }`}
                        >
                          {ticket.operationType === 'sale' ? 'بيع' : 'عصر'}
                        </span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        الوزن الداخل: {ticket.weightIn} كيلو •{' '}
                        {new Date(ticket.dateReceived).toLocaleDateString('ar-TN')}
                      </div>
                      {ticket.totalAmount && (
                        <div className="text-sm font-medium text-primary">
                          المبلغ الإجمالي: {ticket.totalAmount} د.ت
                          {/* Payment Status Indicator */}
                          <span className={`ml-2 text-xs px-2 py-1 rounded-full ${
                            !ticket.isPaid && ticket.totalAmount && ticket.totalAmount > 0 
                              ? 'bg-red-100 text-red-800' 
                              : 'bg-green-100 text-green-800'
                          }`}>
                            {!ticket.isPaid && ticket.totalAmount && ticket.totalAmount > 0 ? 'مستحق الدفع' : 'مدفوع'}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-wrap">
                    {/* Payment Button - Show if ticket has amount and is not paid */}
                    {!ticket.isPaid && ticket.totalAmount && ticket.totalAmount > 0 && onPayTicket && (
                      <OliveButton
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onPayTicket(ticket);
                        }}
                        title="تسجيل دفع"
                        className="text-green-600 hover:text-green-700 hover:bg-green-50"
                      >
                        <DollarSign className="h-4 w-4" />
                      </OliveButton>
                    )}
                    
                    {/* Payment History Button */}
                    {onViewPaymentHistory && (
                      <OliveButton
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onViewPaymentHistory(ticket.clientId, ticket.clientName);
                        }}
                        title="تاريخ الدفعات"
                      >
                        <History className="h-4 w-4" />
                      </OliveButton>
                    )}
                    
                    <OliveButton
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onShowQrCode(ticket);
                      }}
                      title="عرض رمز QR"
                    >
                      <QrCode className="h-4 w-4" />
                    </OliveButton>
                    <OliveButton
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onPrintTicket(ticket);
                      }}
                      title="طباعة التذكرة"
                    >
                      <Printer className="h-4 w-4" />
                    </OliveButton>
                    <OliveButton
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onTicketClick(ticket);
                      }}
                      title="تعديل التذكرة"
                    >
                      <Edit className="h-4 w-4" />
                    </OliveButton>
                    <OliveButton
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteTicket(ticket.id);
                      }}
                      title="حذف التذكرة"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </OliveButton>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6 pt-4 border-t">
              <div className="text-sm text-muted-foreground">
                الصفحة {currentPage} من {totalPages}
              </div>
              <div className="flex items-center gap-2">
                <OliveButton
                  variant="outline"
                  size="sm"
                  onClick={() => onPageChange?.(currentPage - 1)}
                  disabled={currentPage === 1 || loadingTickets}
                >
                  السابق
                </OliveButton>
                <div className="flex items-center gap-1">
                  {(() => {
                    const maxVisiblePages = 5;
                    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
                    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
                    
                    // Adjust start page if we're near the end
                    if (endPage - startPage < maxVisiblePages - 1) {
                      startPage = Math.max(1, endPage - maxVisiblePages + 1);
                    }
                    
                    return Array.from({ length: endPage - startPage + 1 }, (_, i) => {
                      const pageNum = startPage + i;
                      return (
                        <OliveButton
                          key={pageNum}
                          variant={currentPage === pageNum ? "primary" : "outline"}
                          size="sm"
                          onClick={() => onPageChange?.(pageNum)}
                          disabled={loadingTickets}
                          className="w-8 h-8 p-0"
                        >
                          {pageNum}
                        </OliveButton>
                      );
                    });
                  })()}
                </div>
                <OliveButton
                  variant="outline"
                  size="sm"
                  onClick={() => onPageChange?.(currentPage + 1)}
                  disabled={currentPage === totalPages || loadingTickets}
                >
                  التالي
                </OliveButton>
              </div>
            </div>
          )}
        </OliveCardContent>
      </OliveCard>
    </div>
  );
}
