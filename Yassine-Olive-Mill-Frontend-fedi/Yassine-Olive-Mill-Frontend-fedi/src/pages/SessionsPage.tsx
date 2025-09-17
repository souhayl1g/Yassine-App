import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Play, Pause, Clock, Users, Weight, BarChart3 } from 'lucide-react';
import { OliveCard } from '@/components/ui/olive-card';
import { OliveButton } from '@/components/ui/olive-button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/integrations/api/client';

interface WorkSession {
  id: string;
  start: string;
  finish: string | null;
  number_of_boxes: number;
  pressing_room_id: string | null;
  room_name?: string;
}

interface SessionStats {
  totalTickets: number;
  totalWeight: number;
  averageWeight: number;
  duration: number; // in minutes
}

interface Batch {
  id: string;
  client_id: string;
  date_received: string;
  weight_in: number | null;
  weight_out: number | null;
  net_weight: number;
  number_of_boxes: number;
}

export default function SessionsPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [activeSession, setActiveSession] = useState<WorkSession | null>(null);
  const [sessionHistory, setSessionHistory] = useState<WorkSession[]>([]);
  const [sessionStats, setSessionStats] = useState<SessionStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    try {
      setIsLoading(true);
      // GET /pressing-sessions
      const sessions = await api.get<any[]>('/pressing-sessions');

      const sessionsWithRoomNames = (sessions || []).map((session: any) => ({
        ...session,
        room_name: session.pressing_room?.name || session.room?.name || 'Unknown Room'
      }));

      // Find active session (no finish time)
      const active = sessionsWithRoomNames.find(session => !session.finish);
      const history = sessionsWithRoomNames.filter(session => session.finish);

      setActiveSession(active || null);
      setSessionHistory(history);

      // Calculate stats for active session
      if (active) {
        await calculateSessionStats(active.id);
      }
    } catch (error) {
      console.error('Error loading sessions:', error);
      toast({
        title: t('common.error'),
        description: 'Failed to load sessions',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const calculateSessionStats = async (sessionId: string) => {
    try {
      // This would typically involve querying batches/tickets related to the session
      // For now, we'll use placeholder values
      const stats: SessionStats = {
        totalTickets: 0,
        totalWeight: 0,
        averageWeight: 0,
        duration: activeSession ? Math.floor((Date.now() - new Date(activeSession.start).getTime()) / 60000) : 0
      };

      setSessionStats(stats);
    } catch (error) {
      console.error('Error calculating session stats:', error);
    }
  };

  const startNewSession = async () => {
    try {
      // First check if there's already an active session
      if (activeSession) {
        toast({
          title: t('common.error'),
          description: 'There is already an active session running',
          variant: 'destructive'
        });
        return;
      }

      // Pick an existing pressing room
      const rooms = await api.get<any[]>(`/pressing-rooms`);
      const selectedRoomId = rooms && rooms.length > 0 ? Number(rooms[0].id) : null;
      if (!selectedRoomId) {
        toast({
          title: t('common.error'),
          description: 'No pressing room found. Please create a room first.',
          variant: 'destructive'
        });
        return;
      }

      // POST /pressing-sessions
      await api.post('/pressing-sessions', {
        pressing_roomID: selectedRoomId,
        number_of_boxes: 0,
      });

      await loadSessions();
      
      toast({
        title: t('common.success'),
        description: 'New work session started successfully'
      });
    } catch (error) {
      console.error('Error starting session:', error);
      toast({
        title: t('common.error'),
        description: 'Failed to start new session',
        variant: 'destructive'
      });
    }
  };

  const endCurrentSession = async () => {
    try {
      if (!activeSession) return;

      await api.put(`/pressing-sessions/${activeSession.id}/finish`);

      await loadSessions();
      
      toast({
        title: t('common.success'),
        description: 'Work session ended successfully'
      });
    } catch (error) {
      console.error('Error ending session:', error);
      toast({
        title: t('common.error'),
        description: 'Failed to end session',
        variant: 'destructive'
      });
    }
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    
    if (hours > 0) {
      return `${hours}h ${remainingMinutes}m`;
    }
    return `${remainingMinutes}m`;
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-muted animate-pulse rounded" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-48 bg-muted animate-pulse rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{t('sessions.title')}</h1>
          <p className="text-muted-foreground mt-2">
            Monitor and manage work sessions
          </p>
        </div>
        
        {!activeSession ? (
          <OliveButton onClick={startNewSession}>
            <Play className="h-4 w-4 mr-2" />
            {t('sessions.startSession')}
          </OliveButton>
        ) : (
          <OliveButton variant="outline" onClick={endCurrentSession}>
            <Pause className="h-4 w-4 mr-2" />
            {t('sessions.endSession')}
          </OliveButton>
        )}
      </div>

      <Tabs defaultValue="active" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="active">{t('sessions.activeSession')}</TabsTrigger>
          <TabsTrigger value="history">{t('sessions.sessionHistory')}</TabsTrigger>
        </TabsList>
        
        <TabsContent value="active" className="mt-6">
          {activeSession ? (
            <div className="space-y-6">
              {/* Active Session Card */}
              <OliveCard className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-semibold text-foreground">
                      Current Session
                    </h3>
                    <div className="flex items-center mt-2">
                      <Badge className="bg-success/10 text-success border-success/20">
                        <div className="w-2 h-2 bg-success rounded-full mr-2 animate-pulse" />
                        Active
                      </Badge>
                    </div>
                  </div>
                  <Clock className="h-8 w-8 text-primary" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">{t('sessions.startTime')}</p>
                    <p className="font-semibold">
                      {formatDateTime(activeSession.start).time}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDateTime(activeSession.start).date}
                    </p>
                  </div>

                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">{t('sessions.sessionDuration')}</p>
                    <p className="font-semibold">
                      {formatDuration(sessionStats?.duration || 0)}
                    </p>
                  </div>

                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Room</p>
                    <p className="font-semibold">
                      {activeSession.room_name || 'N/A'}
                    </p>
                  </div>

                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Boxes</p>
                    <p className="font-semibold">
                      {activeSession.number_of_boxes}
                    </p>
                  </div>
                </div>
              </OliveCard>

              {/* Session Statistics */}
              {sessionStats && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <OliveCard className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">{t('sessions.totalTickets')}</p>
                        <p className="text-2xl font-bold text-foreground">{sessionStats.totalTickets}</p>
                      </div>
                      <Users className="h-8 w-8 text-primary" />
                    </div>
                  </OliveCard>

                  <OliveCard className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">{t('sessions.totalWeight')}</p>
                        <p className="text-2xl font-bold text-foreground">
                          {sessionStats.totalWeight} {t('common.kg')}
                        </p>
                      </div>
                      <Weight className="h-8 w-8 text-primary" />
                    </div>
                  </OliveCard>

                  <OliveCard className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">{t('sessions.averageWeight')}</p>
                        <p className="text-2xl font-bold text-foreground">
                          {sessionStats.averageWeight} {t('common.kg')}
                        </p>
                      </div>
                      <BarChart3 className="h-8 w-8 text-primary" />
                    </div>
                  </OliveCard>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12">
              <Clock className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">No Active Session</h3>
              <p className="text-muted-foreground mb-4">
                Start a new work session to begin tracking tickets and operations.
              </p>
              <OliveButton onClick={startNewSession}>
                <Play className="h-4 w-4 mr-2" />
                {t('sessions.startSession')}
              </OliveButton>
            </div>
          )}
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          <div className="space-y-4">
            {sessionHistory.length > 0 ? (
              sessionHistory.map((session) => {
                const startTime = formatDateTime(session.start);
                const endTime = session.finish ? formatDateTime(session.finish) : null;
                const duration = session.finish 
                  ? Math.floor((new Date(session.finish).getTime() - new Date(session.start).getTime()) / 60000)
                  : 0;

                return (
                  <OliveCard key={session.id} className="p-6">
                    <div className="flex justify-between items-start">
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <h4 className="font-semibold text-foreground">
                            Session {String(session.id || '').slice(0, 8)}
                          </h4>
                          <Badge variant="outline">
                            Completed
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground">{t('sessions.sessionDate')}</p>
                            <p className="font-medium">{startTime.date}</p>
                          </div>
                          
                          <div>
                            <p className="text-muted-foreground">{t('sessions.startTime')}</p>
                            <p className="font-medium">{startTime.time}</p>
                          </div>
                          
                          <div>
                            <p className="text-muted-foreground">{t('sessions.endTime')}</p>
                            <p className="font-medium">{endTime?.time || 'N/A'}</p>
                          </div>
                          
                          <div>
                            <p className="text-muted-foreground">{t('sessions.sessionDuration')}</p>
                            <p className="font-medium">{formatDuration(duration)}</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Boxes Processed</p>
                        <p className="text-lg font-semibold text-primary">{session.number_of_boxes}</p>
                      </div>
                    </div>
                  </OliveCard>
                );
              })
            ) : (
              <div className="text-center py-12">
                <BarChart3 className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-foreground mb-2">No Session History</h3>
                <p className="text-muted-foreground">
                  Completed sessions will appear here once you finish work sessions.
                </p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}