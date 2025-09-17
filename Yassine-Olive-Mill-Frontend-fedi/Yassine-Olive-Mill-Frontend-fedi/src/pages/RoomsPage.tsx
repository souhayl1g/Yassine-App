import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { OliveCard, OliveCardHeader, OliveCardContent, OliveCardTitle } from '@/components/ui/olive-card';
import { OliveButton } from '@/components/ui/olive-button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Building2, 
  Play, 
  Square, 
  Settings, 
  User, 
  Package, 
  Clock,
  Plus,
  RotateCw,
  Users,
  AlertCircle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/integrations/api/client';

interface Client {
  id: string;
  name: string;
  status: 'waiting' | 'processing' | 'completed';
  ticketId: string;
  weightIn: number;
  numberOfBoxes: number;
  arrivalTime: string;
  estimatedWaitTime?: number;
}

interface Room {
  id: string;
  name: string;
  status: 'active' | 'inactive' | 'maintenance';
  currentClient?: string;
  boxCount: number;
  startTime?: string;
  estimatedFinish?: string;
  waitingList: Client[];
}

const mockRooms: Room[] = [
  {
    id: '1',
    name: 'غرفة العصر A',
    status: 'active',
    currentClient: 'أحمد المزارع',
    boxCount: 12,
    startTime: new Date(Date.now() - 3600000).toISOString(),
    estimatedFinish: new Date(Date.now() + 1800000).toISOString(),
    waitingList: [
      {
        id: '1',
        name: 'محمد العلي',
        status: 'waiting',
        ticketId: 'TKT001235',
        weightIn: 85.5,
        numberOfBoxes: 6,
        arrivalTime: new Date(Date.now() - 1800000).toISOString(),
        estimatedWaitTime: 45
      },
      {
        id: '2',
        name: 'سارة الأحمد',
        status: 'waiting',
        ticketId: 'TKT001236',
        weightIn: 120.0,
        numberOfBoxes: 8,
        arrivalTime: new Date(Date.now() - 900000).toISOString(),
        estimatedWaitTime: 90
      }
    ]
  },
  {
    id: '2',
    name: 'غرفة العصر B',
    status: 'active',
    currentClient: 'فاطمة البائعة',
    boxCount: 8,
    startTime: new Date(Date.now() - 1800000).toISOString(),
    estimatedFinish: new Date(Date.now() + 3600000).toISOString(),
    waitingList: [
      {
        id: '3',
        name: 'عبدالله السعد',
        status: 'waiting',
        ticketId: 'TKT001237',
        weightIn: 95.0,
        numberOfBoxes: 7,
        arrivalTime: new Date(Date.now() - 1200000).toISOString(),
        estimatedWaitTime: 60
      }
    ]
  },
  {
    id: '3',
    name: 'غرفة العصر C',
    status: 'inactive',
    boxCount: 0,
    waitingList: []
  },
  {
    id: '4',
    name: 'غرفة العصر D',
    status: 'maintenance',
    boxCount: 0,
    waitingList: []
  },
  {
    id: '5',
    name: 'غرفة العصر E',
    status: 'active',
    currentClient: 'محمد الزراعي',
    boxCount: 15,
    startTime: new Date(Date.now() - 7200000).toISOString(),
    estimatedFinish: new Date(Date.now() + 900000).toISOString(),
    waitingList: [
      {
        id: '4',
        name: 'نورا القحطاني',
        status: 'waiting',
        ticketId: 'TKT001238',
        weightIn: 110.0,
        numberOfBoxes: 9,
        arrivalTime: new Date(Date.now() - 600000).toISOString(),
        estimatedWaitTime: 30
      }
    ]
  },
];

export function RoomsPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isAddRoomOpen, setIsAddRoomOpen] = useState(false);
  const [newRoom, setNewRoom] = useState({
    name: '',
    status: 'inactive' as 'active' | 'inactive' | 'maintenance'
  });

  const loadRooms = async () => {
    try {
      const resp = await api.get<any[]>('/pressing-rooms');
      const mapped: Room[] = (resp || []).map((r: any) => ({
        id: String(r.id),
        name: r.name,
        status: (r.status as any) || 'inactive',
        boxCount: 0,
        waitingList: [],
      }));
      setRooms(mapped);
    } catch (e: any) {
      toast({ variant: 'destructive', title: t('common.error'), description: e?.message || 'Failed to load rooms' });
    }
  };

  useEffect(() => {
    loadRooms();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAddRoom = async () => {
    if (!newRoom.name.trim()) {
      toast({
        variant: 'destructive',
        title: t('common.error'),
        description: 'يرجى إدخال اسم الغرفة',
      });
      return;
    }
    try {
      await api.post('/pressing-rooms', { name: newRoom.name });
      await loadRooms();
      setNewRoom({ name: '', status: 'inactive' });
      setIsAddRoomOpen(false);
      toast({ title: t('common.success'), description: 'تم إضافة الغرفة بنجاح' });
    } catch (e: any) {
      toast({ variant: 'destructive', title: t('common.error'), description: e?.message || 'Failed to add room' });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-success text-success-foreground';
      case 'inactive': return 'bg-muted text-muted-foreground';
      case 'maintenance': return 'bg-warning text-warning-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return Play;
      case 'inactive': return Square;
      case 'maintenance': return Settings;
      default: return Square;
    }
  };

  const handleStartBatch = (roomId: string) => {
    setRooms(rooms.map(room => 
      room.id === roomId 
        ? { 
            ...room, 
            status: 'active' as const,
            startTime: new Date().toISOString(),
            estimatedFinish: new Date(Date.now() + 7200000).toISOString(),
          }
        : room
    ));
    
    toast({
      title: t('common.success'),
      description: 'تم بدء دفعة العصر بنجاح',
    });
  };

  const handleStopBatch = (roomId: string) => {
    setRooms(rooms.map(room => 
      room.id === roomId 
        ? { 
            ...room, 
            status: 'inactive' as const,
            currentClient: undefined,
            boxCount: 0,
            startTime: undefined,
            estimatedFinish: undefined,
          }
        : room
    ));
    
    toast({
      title: t('common.success'),
      description: 'تم إيقاف دفعة العصر بنجاح',
    });
  };

  const handleMaintenance = (roomId: string) => {
    const targetRoom = rooms.find(r => r.id === roomId);
    setRooms(rooms.map(room => 
      room.id === roomId 
        ? { 
            ...room, 
            status: room.status === 'maintenance' ? 'inactive' : 'maintenance' as const,
            currentClient: undefined,
            boxCount: 0,
            startTime: undefined,
            estimatedFinish: undefined,
          }
        : room
    ));
    
    toast({
      title: t('common.success'),
      description: targetRoom?.status === 'maintenance' ? 'تم الانتهاء من الصيانة' : 'تم تحويل الغرفة للصيانة',
    });
  };

  const formatTimeRemaining = (estimatedFinish: string) => {
    const remaining = new Date(estimatedFinish).getTime() - Date.now();
    if (remaining <= 0) return 'منتهي';
    
    const hours = Math.floor(remaining / (1000 * 60 * 60));
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours} ساعة ${minutes} دقيقة`;
    }
    return `${minutes} دقيقة`;
  };

  const activeRoomsCount = rooms.filter(room => room.status === 'active').length;
  const totalBoxes = rooms.reduce((sum, room) => sum + room.boxCount, 0);

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-4xl font-bold text-foreground">
            {t('rooms.title')}
          </h1>
          <p className="text-lg text-muted-foreground mt-2">
            إدارة غرف العصر ومتابعة الإنتاج
          </p>
        </div>

        <Dialog open={isAddRoomOpen} onOpenChange={setIsAddRoomOpen}>
          <DialogTrigger asChild>
            <OliveButton size="lg" className="gap-2">
              <Plus className="h-5 w-5" />
              {t('rooms.addRoom')}
            </OliveButton>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>إضافة غرفة عصر جديدة</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="roomName">اسم الغرفة</Label>
                <Input
                  id="roomName"
                  value={newRoom.name}
                  onChange={(e) => setNewRoom(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="أدخل اسم الغرفة"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="roomStatus">حالة الغرفة</Label>
                <Select
                  value={newRoom.status}
                  onValueChange={(value) => setNewRoom(prev => ({ ...prev, status: value as 'active' | 'inactive' | 'maintenance' }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="inactive">غير نشط</SelectItem>
                    <SelectItem value="active">نشط</SelectItem>
                    <SelectItem value="maintenance">صيانة</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2 pt-4">
                <OliveButton onClick={handleAddRoom} className="flex-1">
                  إضافة الغرفة
                </OliveButton>
                <OliveButton variant="outline" onClick={() => setIsAddRoomOpen(false)} className="flex-1">
                  إلغاء
                </OliveButton>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <OliveCard>
          <OliveCardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">الغرف النشطة</p>
                <p className="text-3xl font-bold text-success">{activeRoomsCount}</p>
              </div>
              <Building2 className="h-8 w-8 text-success" />
            </div>
          </OliveCardContent>
        </OliveCard>

        <OliveCard>
          <OliveCardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">إجمالي الغرف</p>
                <p className="text-3xl font-bold text-primary">{rooms.length}</p>
              </div>
              <Building2 className="h-8 w-8 text-primary" />
            </div>
          </OliveCardContent>
        </OliveCard>

        <OliveCard>
          <OliveCardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">صناديق قيد المعالجة</p>
                <p className="text-3xl font-bold text-secondary">{totalBoxes}</p>
              </div>
              <Package className="h-8 w-8 text-secondary" />
            </div>
          </OliveCardContent>
        </OliveCard>
      </div>

      {/* Rooms Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {rooms.map((room) => {
          const StatusIcon = getStatusIcon(room.status);
          
          return (
            <OliveCard key={room.id} className="hover:shadow-lg transition-shadow">
              <OliveCardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <OliveCardTitle className="text-xl">
                      {room.name}
                    </OliveCardTitle>
                    <Badge className={getStatusColor(room.status)}>
                      <StatusIcon className="h-3 w-3 mr-1" />
                      {t(`rooms.${room.status}`)}
                    </Badge>
                  </div>
                  <OliveButton
                    variant="ghost"
                    size="sm"
                    onClick={() => handleMaintenance(room.id)}
                    className="text-muted-foreground hover:text-warning"
                  >
                    <Settings className="h-4 w-4" />
                  </OliveButton>
                </div>
              </OliveCardHeader>

              <OliveCardContent className="space-y-4">
                {room.status === 'active' && room.currentClient && (
                  <>
                    {/* Current Client */}
                    <div className="flex items-center gap-2 p-3 bg-success/10 rounded-lg">
                      <User className="h-4 w-4 text-success" />
                      <div className="flex-1">
                        <p className="text-sm text-muted-foreground">العميل الحالي</p>
                        <p className="font-semibold text-success">{room.currentClient}</p>
                      </div>
                    </div>

                    {/* Box Count */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">الصناديق</span>
                      </div>
                      <span className="font-bold text-lg">{room.boxCount}</span>
                    </div>

                    {/* Time Information */}
                    {room.startTime && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">وقت البداية</span>
                        </div>
                        <p className="text-sm font-medium">
                          {new Date(room.startTime).toLocaleTimeString('ar-SA', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                    )}

                    {room.estimatedFinish && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <RotateCw className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">الوقت المتبقي</span>
                        </div>
                        <p className="text-sm font-medium text-primary">
                          {formatTimeRemaining(room.estimatedFinish)}
                        </p>
                      </div>
                    )}
                  </>
                )}

                {room.status === 'inactive' && (
                  <div className="text-center py-6">
                    <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                    <p className="text-muted-foreground mb-4">الغرفة غير نشطة</p>
                  </div>
                )}

                {room.status === 'maintenance' && (
                  <div className="text-center py-6">
                    <Settings className="h-12 w-12 text-warning mx-auto mb-3" />
                    <p className="text-warning font-medium mb-4">تحت الصيانة</p>
                  </div>
                )}

                {/* Waiting List */}
                {room.waitingList && room.waitingList.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">قائمة الانتظار ({room.waitingList.length})</span>
                    </div>
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      {room.waitingList.map((client, index) => (
                        <div key={client.id} className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-bold">
                              {index + 1}
                            </div>
                            <div>
                              <p className="text-sm font-medium">{client.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {client.weightIn} كيلو • {client.numberOfBoxes} صندوق
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <Badge variant="outline" className="text-xs">
                              {client.estimatedWaitTime} دقيقة
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2 pt-4 border-t">
                  {room.status === 'inactive' && (
                    <OliveButton 
                      onClick={() => handleStartBatch(room.id)}
                      className="flex-1 gap-2"
                      variant="success"
                    >
                      <Play className="h-4 w-4" />
                      {t('rooms.startBatch')}
                    </OliveButton>
                  )}

                  {room.status === 'active' && (
                    <OliveButton 
                      onClick={() => handleStopBatch(room.id)}
                      className="flex-1 gap-2"
                      variant="error"
                    >
                      <Square className="h-4 w-4" />
                      {t('rooms.stopBatch')}
                    </OliveButton>
                  )}

                  {room.status === 'maintenance' && (
                    <OliveButton 
                      onClick={() => handleMaintenance(room.id)}
                      className="flex-1 gap-2"
                    >
                      <RotateCw className="h-4 w-4" />
                      إنهاء الصيانة
                    </OliveButton>
                  )}
                </div>
              </OliveCardContent>
            </OliveCard>
          );
        })}
      </div>
    </div>
  );
}