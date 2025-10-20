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
  TrendingUp,
  RefreshCw
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalRooms, setTotalRooms] = useState(5); // Default, will be fetched

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Loading dashboard data...');
      
      // Fetch dashboard data and rooms info in parallel
      const [overview, acts, roomsData] = await Promise.all([
        api.get<{ metrics: any }>(`/dashboard/overview`).then(data => {
          console.log('Dashboard overview response:', data);
          return data;
        }).catch((err) => {
          console.error('Overview API error:', err);
          throw err;
        }),
        api.get<Activity[]>(`/dashboard/activity?limit=20`).then(data => {
          console.log('Dashboard activity response:', data);
          return data;
        }).catch((err) => {
          console.warn('Activity API error:', err);
          return [];
        }), // Fallback to empty array
        api.get<any[]>(`/pressing-rooms`).then(data => {
          console.log('Pressing rooms response:', data);
          return data;
        }).catch((err) => {
          console.warn('Rooms API error:', err);
          return [];
        }) // Fallback to empty array
      ]);
      
      const m = overview.metrics || {};
      setMetrics({
        todayTickets: Number(m.todayTickets || 0),
        totalWeight: Number(m.totalOilProduced || 0),
        currentBoxes: Number(m.currentBoxes || 0),
        activeRooms: Number(m.activeRooms || 0),
      });
      
      setActivities(Array.isArray(acts) ? acts : []);
      
      // Set total rooms count from API
      if (roomsData && Array.isArray(roomsData)) {
        setTotalRooms(roomsData.length);
      }
      
    } catch (e: any) {
      console.error('Dashboard load error:', e);
      const errorMessage = e?.message || e?.toString() || 'Failed to load dashboard data';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadDashboard, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const quickActions = [
    {
      key: 'dailyWork',
      icon: Activity,
      onClick: () => navigate('/'),
      roles: ['admin', 'operator']
    },
    {
      key: 'newTicket',
      icon: FileText,
      onClick: () => navigate('/tickets'),
      roles: ['admin', 'operator']
    },
    {
      key: 'pressingRooms',
      icon: Building2,
      onClick: () => navigate('/rooms'),
      roles: ['admin', 'operator']
    },
    {
      key: 'newClient',
      icon: Users,
      onClick: () => navigate('/clients'),
      roles: ['admin', 'operator']
    },
    {
      key: 'containers',
      icon: Box,
      onClick: () => navigate('/containers'),
      roles: ['admin', 'operator']
    },
    {
      key: 'settings',
      icon: Plus,
      onClick: () => navigate('/settings'),
      roles: ['admin']
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
      {/* Error Display */}
      {error && (
        <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-center gap-2 text-red-700 dark:text-red-300">
            <Activity className="h-4 w-4" />
            <span className="text-sm font-medium">{error}</span>
            <OliveButton 
              variant="outline" 
              size="sm" 
              onClick={loadDashboard}
              className="ml-auto"
            >
              إعادة المحاولة
            </OliveButton>
          </div>
        </div>
      )}

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
        <div className="flex items-center gap-4">
          {/* Refresh Button */}
          <OliveButton
            variant="outline"
            size="sm"
            onClick={loadDashboard}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            تحديث
          </OliveButton>
          
          {/* Day Info */}
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
            <div className="text-3xl font-bold text-primary">{loading ? '...' : metrics.todayTickets}</div>
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-2">
              <TrendingUp className="h-3 w-3" />
              {t('dashboard.ticketsToday')}
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
              {loading ? '...' : metrics.totalWeight.toLocaleString()}
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
            <div className="text-3xl font-bold text-info">{loading ? '...' : metrics.currentBoxes}</div>
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
            <div className="text-3xl font-bold text-success">{loading ? '...' : metrics.activeRooms}</div>
            <p className="text-xs text-muted-foreground">
              من أصل {totalRooms} غرف
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
              {loading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-start gap-3 p-3 rounded-lg animate-pulse">
                      <div className="h-9 w-9 bg-muted rounded-lg"></div>
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-muted rounded w-3/4"></div>
                        <div className="h-3 bg-muted rounded w-1/2"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : activities.length === 0 ? (
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