import React, { useState, useEffect } from 'react';
import { OliveCard, OliveCardContent, OliveCardHeader, OliveCardTitle } from '@/components/ui/olive-card';
import { OliveButton } from '@/components/ui/olive-button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Clock, Package2, Building2, User, History } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/integrations/api/client';
import { BatchLoadingHistory } from '@/components/BatchLoadingHistory';

interface BatchLoading {
  id: number;
  batchId: number;
  pressingSessionId: number;
  pressingRoomId: number;
  boxesLoaded: number;
  loadedAt: string;
  notes?: string;
  batch: {
    id: number;
    number_of_boxes: number;
    client: {
      id: number;
      firstname: string;
      lastname: string;
    };
  };
  pressingRoom: {
    id: number;
    name: string;
  };
  pressingSession: {
    id: number;
    start: string;
    finish?: string;
  };
  operator?: {
    id: number;
    username: string;
    firstname?: string;
    lastname?: string;
  };
}

interface Room {
  id: number;
  name: string;
}

interface Session {
  id: number;
  start: string;
  finish?: string;
  pressing_roomID: number;
}

export function BatchLoadingTestPage() {
  const { toast } = useToast();
  const [loadings, setLoadings] = useState<BatchLoading[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState('');
  const [batchHistory, setBatchHistory] = useState<any>(null);
  
  // Form state for creating new loading record
  const [newLoading, setNewLoading] = useState({
    batchId: '',
    pressingSessionId: '',
    pressingRoomId: '',
    boxesLoaded: '',
    notes: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [loadingsRes, roomsRes, sessionsRes] = await Promise.all([
        api.get<{ loadings: BatchLoading[] }>('/batch-loadings'),
        api.get<Room[]>('/pressing-rooms'),
        api.get<Session[]>('/pressing-sessions')
      ]);

      setLoadings(loadingsRes.loadings || []);
      setRooms(roomsRes || []);
      setSessions(sessionsRes || []);
    } catch (error: any) {
      console.error('Failed to load data:', error);
      toast({
        variant: 'destructive',
        title: 'خطأ',
        description: 'فشل في تحميل البيانات'
      });
    }
  };

  const handleCreateLoading = async () => {
    if (!newLoading.batchId || !newLoading.pressingSessionId || !newLoading.pressingRoomId || !newLoading.boxesLoaded) {
      toast({
        variant: 'destructive',
        title: 'خطأ',
        description: 'يرجى ملء جميع الحقول المطلوبة'
      });
      return;
    }

    try {
      await api.post('/batch-loadings', {
        batchId: parseInt(newLoading.batchId),
        pressingSessionId: parseInt(newLoading.pressingSessionId),
        pressingRoomId: parseInt(newLoading.pressingRoomId),
        boxesLoaded: parseInt(newLoading.boxesLoaded),
        notes: newLoading.notes || undefined
      });

      toast({
        title: 'نجح',
        description: 'تم إنشاء سجل التحميل بنجاح'
      });

      setNewLoading({
        batchId: '',
        pressingSessionId: '',
        pressingRoomId: '',
        boxesLoaded: '',
        notes: ''
      });

      loadData();
    } catch (error: any) {
      console.error('Failed to create loading:', error);
      toast({
        variant: 'destructive',
        title: 'خطأ',
        description: error?.response?.data?.error || 'فشل في إنشاء سجل التحميل'
      });
    }
  };

  const loadBatchHistory = async () => {
    if (!selectedBatchId) {
      toast({
        variant: 'destructive',
        title: 'خطأ',
        description: 'يرجى إدخال رقم الدفعة'
      });
      return;
    }

    try {
      const response = await api.get(`/batch-loadings/history/${selectedBatchId}`);
      setBatchHistory(response);
      toast({
        title: 'نجح',
        description: 'تم تحميل تاريخ الدفعة بنجاح'
      });
    } catch (error: any) {
      console.error('Failed to load batch history:', error);
      toast({
        variant: 'destructive',
        title: 'خطأ',
        description: error?.response?.data?.error || 'فشل في تحميل تاريخ الدفعة'
      });
    }
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('ar-EG');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">اختبار نظام تتبع تحميل الصناديق</h1>
        <p className="text-muted-foreground">إدارة واختبار سجلات تحميل الصناديق</p>
      </div>

      {/* Create New Loading Record */}
      <OliveCard>
        <OliveCardHeader>
          <OliveCardTitle>إنشاء سجل تحميل جديد</OliveCardTitle>
        </OliveCardHeader>
        <OliveCardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="batchId">رقم الدفعة</Label>
              <Input
                id="batchId"
                type="number"
                value={newLoading.batchId}
                onChange={(e) => setNewLoading(prev => ({ ...prev, batchId: e.target.value }))}
                placeholder="أدخل رقم الدفعة"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="boxesLoaded">عدد الصناديق المحملة</Label>
              <Input
                id="boxesLoaded"
                type="number"
                value={newLoading.boxesLoaded}
                onChange={(e) => setNewLoading(prev => ({ ...prev, boxesLoaded: e.target.value }))}
                placeholder="أدخل عدد الصناديق"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="pressingRoomId">غرفة العصر</Label>
              <Select value={newLoading.pressingRoomId} onValueChange={(value) => setNewLoading(prev => ({ ...prev, pressingRoomId: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر غرفة العصر" />
                </SelectTrigger>
                <SelectContent>
                  {rooms.map((room) => (
                    <SelectItem key={room.id} value={String(room.id)}>
                      {room.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="pressingSessionId">جلسة العصر</Label>
              <Select value={newLoading.pressingSessionId} onValueChange={(value) => setNewLoading(prev => ({ ...prev, pressingSessionId: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر جلسة العصر" />
                </SelectTrigger>
                <SelectContent>
                  {sessions.map((session) => (
                    <SelectItem key={session.id} value={String(session.id)}>
                      جلسة #{session.id} - {formatDateTime(session.start)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">ملاحظات</Label>
            <Textarea
              id="notes"
              value={newLoading.notes}
              onChange={(e) => setNewLoading(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="ملاحظات إضافية (اختياري)"
            />
          </div>

          <OliveButton onClick={handleCreateLoading} className="w-full">
            إنشاء سجل التحميل
          </OliveButton>
        </OliveCardContent>
      </OliveCard>

      {/* Load Batch History */}
      <OliveCard>
        <OliveCardHeader>
          <OliveCardTitle>عرض تاريخ دفعة معينة</OliveCardTitle>
        </OliveCardHeader>
        <OliveCardContent className="space-y-4">
          <div className="flex gap-4">
            <Input
              type="number"
              value={selectedBatchId}
              onChange={(e) => setSelectedBatchId(e.target.value)}
              placeholder="أدخل رقم الدفعة"
              className="flex-1"
            />
            <OliveButton onClick={loadBatchHistory}>
              <History className="h-4 w-4 mr-2" />
              عرض التاريخ
            </OliveButton>
          </div>

          {batchHistory && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-muted-foreground">إجمالي العمليات</p>
                  <p className="text-2xl font-bold text-blue-600">{batchHistory.totalLoadingOperations}</p>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <p className="text-sm text-muted-foreground">إجمالي الصناديق المحملة</p>
                  <p className="text-2xl font-bold text-green-600">{batchHistory.totalBoxesLoaded}</p>
                </div>
                <div className="text-center p-3 bg-purple-50 rounded-lg">
                  <p className="text-sm text-muted-foreground">رقم الدفعة</p>
                  <p className="text-2xl font-bold text-purple-600">{batchHistory.batchId}</p>
                </div>
              </div>

              <BatchLoadingHistory 
                batchId={String(batchHistory.batchId)}
                loadings={batchHistory.history || []}
              />
            </div>
          )}
        </OliveCardContent>
      </OliveCard>

      {/* Current Loading Records */}
      <OliveCard>
        <OliveCardHeader>
          <OliveCardTitle>سجلات التحميل الحالية ({loadings.length})</OliveCardTitle>
        </OliveCardHeader>
        <OliveCardContent>
          <div className="space-y-4">
            {loadings.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">لا توجد سجلات تحميل</p>
            ) : (
              loadings.map((loading) => (
                <div key={loading.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <h3 className="font-semibold">سجل #{loading.id}</h3>
                      <p className="text-sm text-muted-foreground">
                        العميل: {loading.batch.client.firstname} {loading.batch.client.lastname}
                      </p>
                    </div>
                    <Badge variant="outline">
                      {loading.boxesLoaded} صندوق
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Package2 className="h-4 w-4 text-primary" />
                      <span>دفعة #{loading.batchId}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-secondary" />
                      <span>{loading.pressingRoom.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-warning" />
                      <span>{formatDateTime(loading.loadedAt)}</span>
                    </div>
                    {loading.operator && (
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-info" />
                        <span>{loading.operator.username}</span>
                      </div>
                    )}
                  </div>

                  {loading.notes && (
                    <div className="pt-2 border-t">
                      <p className="text-sm text-muted-foreground">
                        <strong>ملاحظات:</strong> {loading.notes}
                      </p>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </OliveCardContent>
      </OliveCard>
    </div>
  );
}
