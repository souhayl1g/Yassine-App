import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { OliveCard, OliveCardHeader, OliveCardContent, OliveCardTitle } from '@/components/ui/olive-card';
import { OliveButton } from '@/components/ui/olive-button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  History, 
  Search, 
  Download, 
  Calendar, 
  User, 
  Activity,
  FileText,
  Users,
  QrCode,
  Building2,
  Scale,
  Settings
} from 'lucide-react';
import { api } from '@/integrations/api/client';

interface HistoryEvent {
  id: string;
  type: 'ticket' | 'client' | 'qr' | 'room' | 'weight' | 'system';
  action: string;
  description: string;
  user: string;
  timestamp: string;
  details?: Record<string, any>;
}

const mockHistory: HistoryEvent[] = [];

export function HistoryPage() {
  const { t } = useTranslation();
  const [history, setHistory] = useState<HistoryEvent[]>(mockHistory);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<string>('today');

  const loadHistory = async () => {
    try {
      const events = await api.get<HistoryEvent[]>(`/dashboard/activity?limit=100`);
      setHistory(events || []);
    } catch (e) {
      // silent
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'ticket': return FileText;
      case 'client': return Users;
      case 'qr': return QrCode;
      case 'room': return Building2;
      case 'weight': return Scale;
      case 'system': return Settings;
      default: return Activity;
    }
  };

  const getEventColor = (type: string) => {
    switch (type) {
      case 'ticket': return 'bg-primary text-primary-foreground';
      case 'client': return 'bg-secondary text-secondary-foreground';
      case 'qr': return 'bg-info text-info-foreground';
      case 'room': return 'bg-success text-success-foreground';
      case 'weight': return 'bg-warning text-warning-foreground';
      case 'system': return 'bg-muted text-muted-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getActionText = (action: string) => {
    switch (action) {
      case 'create': return 'إنشاء';
      case 'update': return 'تحديث';
      case 'delete': return 'حذف';
      case 'scan': return 'مسح';
      case 'start_batch': return 'بدء دفعة';
      case 'stop_batch': return 'إيقاف دفعة';
      case 'record': return 'تسجيل';
      case 'login': return 'دخول';
      case 'logout': return 'خروج';
      default: return action;
    }
  };

  const filteredHistory = history.filter(event => {
    const matchesSearch = 
      event.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.user.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesType = typeFilter === 'all' || event.type === typeFilter;
    
    // Simple date filtering (you can expand this)
    let matchesDate = true;
    if (dateRange === 'today') {
      const today = new Date().toDateString();
      matchesDate = new Date(event.timestamp).toDateString() === today;
    }
    
    return matchesSearch && matchesType && matchesDate;
  });

  const handleExport = () => {
    // In a real app, this would generate and download a CSV/PDF
    alert('تصدير التقرير - هذه ميزة تجريبية');
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-4xl font-bold text-foreground">
            {t('history.title')}
          </h1>
          <p className="text-lg text-muted-foreground mt-2">
            سجل جميع الأنشطة والعمليات في النظام
          </p>
        </div>

        <OliveButton onClick={handleExport} size="lg" className="gap-2">
          <Download className="h-5 w-5" />
          تصدير التقرير
        </OliveButton>
      </div>

      {/* Filters */}
      <OliveCard>
        <OliveCardContent className="p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
            <div className="flex-1 relative">
              <Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="البحث في الأنشطة والأحداث..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="olive-input pr-10"
              />
            </div>
            <div className="flex gap-2">
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="نوع الحدث" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الأنواع</SelectItem>
                  <SelectItem value="ticket">التذاكر</SelectItem>
                  <SelectItem value="client">العملاء</SelectItem>
                  <SelectItem value="qr">مسح QR</SelectItem>
                  <SelectItem value="room">الغرف</SelectItem>
                  <SelectItem value="weight">الأوزان</SelectItem>
                  <SelectItem value="system">النظام</SelectItem>
                </SelectContent>
              </Select>

              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="الفترة الزمنية" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">اليوم</SelectItem>
                  <SelectItem value="week">هذا الأسبوع</SelectItem>
                  <SelectItem value="month">هذا الشهر</SelectItem>
                  <SelectItem value="all">الكل</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </OliveCardContent>
      </OliveCard>

      {/* History Events */}
      <OliveCard>
        <OliveCardHeader>
          <OliveCardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            {t('history.eventLog')}
          </OliveCardTitle>
        </OliveCardHeader>
        <OliveCardContent>
          {filteredHistory.length === 0 ? (
            <div className="text-center py-12">
              <History className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
              <h3 className="text-xl font-semibold mb-2">لا توجد أحداث</h3>
              <p className="text-muted-foreground">
                لم يتم العثور على أحداث تطابق المعايير المحددة
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredHistory.map((event, index) => {
                const Icon = getEventIcon(event.type);
                const isLastItem = index === filteredHistory.length - 1;
                
                return (
                  <div key={event.id} className="relative">
                    <div className="flex gap-4">
                      {/* Timeline line */}
                      {!isLastItem && (
                        <div className="absolute right-6 top-12 w-0.5 h-full bg-border -translate-x-1/2" />
                      )}
                      
                      {/* Icon */}
                      <div className={`flex h-12 w-12 items-center justify-center rounded-full ${getEventColor(event.type)} flex-shrink-0`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      
                      {/* Content */}
                      <div className="flex-1 min-w-0 pb-8">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline" className="text-xs">
                                {getActionText(event.action)}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {new Date(event.timestamp).toLocaleString('ar-SA')}
                              </span>
                            </div>
                            <p className="text-sm font-medium text-foreground mb-2">
                              {event.description}
                            </p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <User className="h-3 w-3" />
                              <span>{event.user}</span>
                            </div>
                            
                            {/* Event Details */}
                            {event.details && Object.keys(event.details).length > 0 && (
                              <div className="mt-3 p-3 bg-muted/50 rounded-lg">
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                  {Object.entries(event.details).map(([key, value]) => (
                                    <div key={key}>
                                      <span className="text-muted-foreground">{key}:</span>
                                      <span className="ml-1 font-medium">
                                        {typeof value === 'boolean' ? (value ? 'نعم' : 'لا') : String(value)}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </OliveCardContent>
      </OliveCard>
    </div>
  );
}