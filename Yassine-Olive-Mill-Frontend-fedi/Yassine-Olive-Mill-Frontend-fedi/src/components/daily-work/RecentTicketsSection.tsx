import React from 'react';
import { useTranslation } from 'react-i18next';
import { OliveCard, OliveCardHeader, OliveCardContent, OliveCardTitle } from '@/components/ui/olive-card';
import { FileText, RefreshCw } from 'lucide-react';
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
                          {ticket.ticketNumber?.split('/').pop() || '#'}
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
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {/* Action buttons would go here */}
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
                {/* Pagination buttons would go here */}
              </div>
            </div>
          )}
        </OliveCardContent>
      </OliveCard>
    </div>
  );
}
