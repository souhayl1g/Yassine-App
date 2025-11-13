import React from 'react';
import { Clock, User, Package2, Building2 } from 'lucide-react';
import { OliveCard, OliveCardContent, OliveCardHeader, OliveCardTitle } from '@/components/ui/olive-card';
import { Badge } from '@/components/ui/badge';

interface BatchLoadingHistoryProps {
  batchId: string;
  loadings: Array<{
    id: number;
    boxesLoaded: number;
    loadedAt: string;
    notes?: string;
    pressingRoom: {
      id: number;
      name: string;
    };
    operator?: {
      id: number;
      username: string;
      firstname?: string;
      lastname?: string;
    };
    pressingSession: {
      id: number;
      start: string;
      finish?: string;
    };
  }>;
  totalBoxes?: number;
}

export function BatchLoadingHistory({ batchId, loadings, totalBoxes }: BatchLoadingHistoryProps) {
  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString('ar-EG'),
      time: date.toLocaleTimeString('ar-EG', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
      })
    };
  };

  const getOperatorName = (operator?: { username: string; firstname?: string; lastname?: string }) => {
    if (!operator) return 'غير محدد';
    if (operator.firstname || operator.lastname) {
      return `${operator.firstname || ''} ${operator.lastname || ''}`.trim();
    }
    return operator.username;
  };

  // Calculate cumulative totals
  let cumulativeBoxes = 0;
  const loadingsWithCumulative = loadings.map(loading => {
    cumulativeBoxes += loading.boxesLoaded;
    return {
      ...loading,
      cumulativeBoxes
    };
  });

  const totalLoadedBoxes = cumulativeBoxes;

  if (loadings.length === 0) {
    return (
      <OliveCard>
        <OliveCardHeader>
          <OliveCardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            تاريخ تحميل الصناديق
          </OliveCardTitle>
        </OliveCardHeader>
        <OliveCardContent>
          <p className="text-muted-foreground text-center py-4">
            لا توجد عمليات تحميل مسجلة لهذه الدفعة
          </p>
        </OliveCardContent>
      </OliveCard>
    );
  }

  return (
    <OliveCard>
      <OliveCardHeader>
        <OliveCardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          تاريخ تحميل الصناديق
        </OliveCardTitle>
        <div className="flex gap-4 text-sm text-muted-foreground">
          <span>إجمالي العمليات: {loadings.length}</span>
          <span>إجمالي الصناديق المحملة: {totalLoadedBoxes}</span>
          {totalBoxes && (
            <span>من أصل: {totalBoxes} صندوق</span>
          )}
        </div>
      </OliveCardHeader>
      <OliveCardContent>
        <div className="space-y-4">
          {loadingsWithCumulative.map((loading, index) => {
            const dateTime = formatDateTime(loading.loadedAt);
            const isLatest = index === loadings.length - 1;
            
            return (
              <div 
                key={loading.id} 
                className={`relative border rounded-lg p-4 ${isLatest ? 'border-primary bg-primary/5' : 'border-border'}`}
              >
                {isLatest && (
                  <Badge variant="default" className="absolute -top-2 right-2 text-xs">
                    الأحدث
                  </Badge>
                )}
                
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {/* Boxes loaded info */}
                  <div className="flex items-center gap-2">
                    <Package2 className="h-4 w-4 text-primary" />
                    <div>
                      <p className="text-sm font-medium">
                        {loading.boxesLoaded} صندوق
                      </p>
                      <p className="text-xs text-muted-foreground">
                        الإجمالي: {loading.cumulativeBoxes}
                      </p>
                    </div>
                  </div>

                  {/* Room info */}
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-secondary" />
                    <div>
                      <p className="text-sm font-medium">
                        {loading.pressingRoom.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        غرفة العصر
                      </p>
                    </div>
                  </div>

                  {/* Operator info */}
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-info" />
                    <div>
                      <p className="text-sm font-medium">
                        {getOperatorName(loading.operator)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        المشغل
                      </p>
                    </div>
                  </div>

                  {/* Time info */}
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-warning" />
                    <div>
                      <p className="text-sm font-medium">
                        {dateTime.time}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {dateTime.date}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Notes */}
                {loading.notes && (
                  <div className="mt-3 pt-3 border-t border-border">
                    <p className="text-sm text-muted-foreground">
                      <strong>ملاحظات:</strong> {loading.notes}
                    </p>
                  </div>
                )}

                {/* Session info */}
                <div className="mt-3 pt-3 border-t border-border">
                  <p className="text-xs text-muted-foreground">
                    جلسة العصر: #{loading.pressingSession.id}
                    {loading.pressingSession.finish && (
                      <span className="ml-2 text-success">مكتملة</span>
                    )}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </OliveCardContent>
    </OliveCard>
  );
}
