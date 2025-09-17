import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { OliveCard, OliveCardHeader, OliveCardContent, OliveCardTitle } from '@/components/ui/olive-card';
import { OliveButton } from '@/components/ui/olive-button';
import { 
  FileText, 
  Users, 
  QrCode, 
  Scale, 
  Box, 
  Building2,
  Plus,
  Activity,
  TrendingUp
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getCurrentDayInfo, formatDayTime, formatDayDate, getDayStatusText } from '@/lib/daySystem';
import { api } from '@/integrations/api/client';

type Metrics = { todayTickets: number; totalWeight: number; currentBoxes: number; activeRooms: number };

type Activity = { id: string | number; type: string; description: string; timestamp?: string };

export function DashboardPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const dayInfo = getCurrentDayInfo();

  const [metrics, setMetrics] = useState<Metrics>({ todayTickets: 0, totalWeight: 0, currentBoxes: 0, activeRooms: 0 });
  const [activities, setActivities] = useState<Activity[]>([]);

  const loadDashboard = async () => {
    try {
      const overview = await api.get<{ metrics: any }>(`/dashboard/overview`);
      const m = overview.metrics || {};
      setMetrics({
        todayTickets: Number(m.todayTickets || 0),
        totalWeight: Number(m.totalOilProduced || 0),
        currentBoxes: Number(m.currentBoxes || 0),
        activeRooms: Number(m.activeRooms || 0),
      });
      const acts = await api.get<Activity[]>(`/dashboard/activity?limit=20`);
      setActivities(acts || []);
    } catch (e) {
      // silent fail; UI shows zeros
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const quickActions = [
    {
      key: 'newTicket',
      icon: FileText,
      onClick: () => navigate('/tickets'),
      roles: ['admin', 'operator']
    },
    {
      key: 'newClient',
      icon: Users,
      onClick: () => navigate('/clients'),
      roles: ['admin', 'operator']
    },
    {
      key: 'scanQR',
      icon: QrCode,
      onClick: () => navigate('/qr'),
      roles: ['admin', 'operator', 'scanner']
    },
  ];

  const filteredActions = quickActions.filter(action => 
    user && action.roles.includes(user.role)
  );

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'ticket': return FileText;
      case 'qr': return QrCode;
      case 'room': return Building2;
      case 'client': return Users;
      case 'weight': return Scale;
      default: return Activity;
    }
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-4xl font-bold text-foreground">
            {t('dashboard.title')}
          </h1>
          <p className="text-lg text-muted-foreground mt-2">
            {t('common.welcome')}, {user?.firstname}! 👋
          </p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-primary">
            {formatDayTime(new Date())}
          </div>
          <div className="text-sm text-muted-foreground">
            {formatDayDate(new Date())}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {getDayStatusText()} • {Math.round(dayInfo.dayProgress)}% من اليوم
          </div>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <OliveCard className="hover:shadow-xl transition-shadow">
          <OliveCardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <OliveCardTitle className="text-sm font-medium">
              {t('dashboard.todayTickets')}
            </OliveCardTitle>
            <FileText className="h-5 w-5 text-primary" />
          </OliveCardHeader>
          <OliveCardContent>
            <div className="text-3xl font-bold text-primary">{metrics.todayTickets}</div>
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-2">
              <TrendingUp className="h-3 w-3" />
              +12% من الأمس
            </p>
          </OliveCardContent>
        </OliveCard>

        <OliveCard className="hover:shadow-xl transition-shadow">
          <OliveCardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <OliveCardTitle className="text-sm font-medium">
              {t('dashboard.totalWeight')}
            </OliveCardTitle>
            <Scale className="h-5 w-5 text-secondary" />
          </OliveCardHeader>
          <OliveCardContent>
            <div className="text-3xl font-bold text-secondary">
              {metrics.totalWeight.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {t('dashboard.kg')}
            </p>
          </OliveCardContent>
        </OliveCard>

        <OliveCard className="hover:shadow-xl transition-shadow">
          <OliveCardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <OliveCardTitle className="text-sm font-medium">
              {t('dashboard.currentBoxes')}
            </OliveCardTitle>
            <Box className="h-5 w-5 text-info" />
          </OliveCardHeader>
          <OliveCardContent>
            <div className="text-3xl font-bold text-info">{metrics.currentBoxes}</div>
            <p className="text-xs text-muted-foreground">
              في المعالجة
            </p>
          </OliveCardContent>
        </OliveCard>

        <OliveCard className="hover:shadow-xl transition-shadow">
          <OliveCardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <OliveCardTitle className="text-sm font-medium">
              {t('dashboard.activeRooms')}
            </OliveCardTitle>
            <Building2 className="h-5 w-5 text-success" />
          </OliveCardHeader>
          <OliveCardContent>
            <div className="text-3xl font-bold text-success">{metrics.activeRooms}</div>
            <p className="text-xs text-muted-foreground">
              من أصل 5 غرف
            </p>
          </OliveCardContent>
        </OliveCard>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Quick Actions */}
        <div className="lg:col-span-1">
          <OliveCard>
            <OliveCardHeader>
              <OliveCardTitle className="text-xl">
                {t('dashboard.quickActions')}
              </OliveCardTitle>
            </OliveCardHeader>
            <OliveCardContent className="space-y-3">
              {filteredActions.map((action) => {
                const Icon = action.icon;
                return (
                  <OliveButton
                    key={action.key}
                    variant="outline"
                    size="lg"
                    className="w-full justify-start gap-3"
                    onClick={action.onClick}
                  >
                    <Icon className="h-5 w-5" />
                    {t(`dashboard.${action.key}`)}
                  </OliveButton>
                );
              })}
            </OliveCardContent>
          </OliveCard>
        </div>

        {/* Recent Activity */}
        <div className="lg:col-span-2">
          <OliveCard>
            <OliveCardHeader>
              <OliveCardTitle className="text-xl">
                {t('dashboard.recentActivity')}
              </OliveCardTitle>
            </OliveCardHeader>
            <OliveCardContent>
              {activities.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>{t('dashboard.noActivity')}</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {activities.map((activity) => {
                    const Icon = getActivityIcon(activity.type);
                    return (
                      <div key={activity.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                          <Icon className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex-1 space-y-1">
                          <p className="text-sm font-medium leading-none">
                            {activity.description}
                          </p>
                          {activity.timestamp && (
                            <p className="text-xs text-muted-foreground">
                              {new Date(activity.timestamp).toLocaleString('ar-SA')}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </OliveCardContent>
          </OliveCard>
        </div>
      </div>
    </div>
  );
}