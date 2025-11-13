import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { OliveCard, OliveCardHeader, OliveCardContent, OliveCardTitle } from '@/components/ui/olive-card';
import { OliveButton } from '@/components/ui/olive-button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { 
  Package, 
  ArrowRight, 
  Clock, 
  User, 
  Weight, 
  Factory,
  Search,
  Filter
} from 'lucide-react';
import { api } from '@/integrations/api/client';
import { useToast } from '@/hooks/use-toast';

interface BatchData {
  id: string;
  ticketNumber: string;
  clientName: string;
  weightIn: number;
  numberOfBatches: number;
  numberOfBidons: number;
  status: 'received' | 'in_process' | 'completed' | 'assigned';
  dateReceived: string;
  pressingRoomId?: number;
  estimatedTime?: number;
}

interface PressingRoom {
  id: number;
  name: string;
  status: 'available' | 'busy' | 'maintenance';
  currentBatch?: BatchData;
  sessionStartTime?: string;
}

export function BatchManagementPage() {
  const { t } = useTranslation();
  const { toast } = useToast();

  // State
  const [batches, setBatches] = useState<BatchData[]>([]);
  const [pressingRooms, setPressingRooms] = useState<PressingRoom[]>([]);
  const [selectedBatch, setSelectedBatch] = useState<BatchData | null>(null);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<string>('');
  const [estimatedTime, setEstimatedTime] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Helper function to extract payload from API responses
  const getPayload = <T,>(res: any): T => (res && typeof res === 'object' && 'data' in res ? res.data : res);

  // Load batches ready for processing
  const loadBatches = async () => {
    setLoading(true);
    try {
      const res = await api.get<any>('/batches?status=in_process,completed');
      const payload = getPayload<any>(res);
      const batchList = payload?.batches || payload || [];
      
      const formattedBatches: BatchData[] = batchList.map((batch: any) => ({
        id: String(batch.id),
        ticketNumber: batch.ticket_number || `#${batch.id}`,
        clientName: batch.client 
          ? `${batch.client.firstname} ${batch.client.lastname}` 
          : `عميل #${batch.clientId}`,
        weightIn: batch.weight_in || 0,
        numberOfBatches: batch.number_of_boxes || 0,
        numberOfBidons: batch.number_of_bidons || 0,
        status: batch.status || 'in_process',
        dateReceived: batch.date_received || batch.createdAt,
        pressingRoomId: batch.pressing_room_id,
        estimatedTime: batch.estimated_time
      }));
      
      setBatches(formattedBatches);
    } catch (error: any) {
      console.error('Error loading batches:', error);
      toast({
        variant: 'destructive',
        title: 'خطأ',
        description: 'فشل في تحميل الدفعات',
      });
    } finally {
      setLoading(false);
    }
  };

  // Load pressing rooms
  const loadPressingRooms = async () => {
    try {
      // Create default 7 pressing rooms if they don't exist
      const defaultRooms: PressingRoom[] = Array.from({ length: 7 }, (_, i) => ({
        id: i + 1,
        name: `غرفة العصر ${i + 1}`,
        status: 'available'
      }));
      
      setPressingRooms(defaultRooms);
      
      // TODO: Replace with actual API call when pressing rooms table is created
      // const res = await api.get('/pressing-rooms');
      // const rooms = getPayload<PressingRoom[]>(res);
      // setPressingRooms(rooms);
    } catch (error: any) {
      console.error('Error loading pressing rooms:', error);
      setPressingRooms(Array.from({ length: 7 }, (_, i) => ({
        id: i + 1,
        name: `غرفة العصر ${i + 1}`,
        status: 'available'
      })));
    }
  };

  // Assign batch to pressing room
  const handleAssignBatch = async () => {
    if (!selectedBatch || !selectedRoom || !estimatedTime) {
      toast({
        variant: 'destructive',
        title: 'خطأ',
        description: 'يرجى ملء جميع الحقول المطلوبة',
      });
      return;
    }

    setLoading(true);
    try {
      const payload = {
        pressing_room_id: parseInt(selectedRoom),
        estimated_time: parseInt(estimatedTime),
        status: 'assigned',
        session_start_time: new Date().toISOString()
      };

      await api.put(`/batches/${selectedBatch.id}`, payload);

      // Update local state
      setBatches(prev => prev.map(batch => 
        batch.id === selectedBatch.id 
          ? { ...batch, status: 'assigned', pressingRoomId: parseInt(selectedRoom), estimatedTime: parseInt(estimatedTime) }
          : batch
      ));

      // Update pressing room status
      setPressingRooms(prev => prev.map(room => 
        room.id === parseInt(selectedRoom)
          ? { 
              ...room, 
              status: 'busy', 
              currentBatch: selectedBatch,
              sessionStartTime: new Date().toISOString()
            }
          : room
      ));

      toast({
        title: 'نجح',
        description: 'تم تخصيص الدفعة لغرفة العصر بنجاح',
      });

      setIsAssignModalOpen(false);
      setSelectedBatch(null);
      setSelectedRoom('');
      setEstimatedTime('');
    } catch (error: any) {
      console.error('Error assigning batch:', error);
      toast({
        variant: 'destructive',
        title: 'خطأ',
        description: 'فشل في تخصيص الدفعة',
      });
    } finally {
      setLoading(false);
    }
  };

  // Filter batches
  const filteredBatches = batches.filter(batch => {
    const matchesSearch = batch.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         batch.ticketNumber.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || batch.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Get status badge color
  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'in_process': return 'default';
      case 'completed': return 'secondary';
      case 'assigned': return 'outline';
      default: return 'destructive';
    }
  };

  // Get status text
  const getStatusText = (status: string) => {
    switch (status) {
      case 'in_process': return 'قيد المعالجة';
      case 'completed': return 'مكتملة';
      case 'assigned': return 'مخصصة';
      default: return 'غير معروف';
    }
  };

  // Load data on mount
  useEffect(() => {
    loadBatches();
    loadPressingRooms();
    
    // Set up polling for real-time updates
    const interval = setInterval(() => {
      loadBatches();
    }, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">إدارة الدفعات</h1>
          <p className="text-muted-foreground mt-2">
            تخصيص الدفعات المعالجة إلى غرف العصر
          </p>
        </div>
        
        {/* Pressing Rooms Status */}
        <div className="grid grid-cols-7 gap-2">
          {pressingRooms.map((room) => (
            <div
              key={room.id}
              className={`p-2 rounded-lg text-center text-xs ${
                room.status === 'busy' 
                  ? 'bg-red-100 text-red-800 border border-red-200' 
                  : 'bg-green-100 text-green-800 border border-green-200'
              }`}
            >
              <div className="font-semibold">{room.id}</div>
              <div>{room.status === 'busy' ? 'مشغولة' : 'متاحة'}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Filters */}
      <OliveCard>
        <OliveCardContent className="p-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="البحث بالاسم أو رقم التذكرة..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="تصفية حسب الحالة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الحالات</SelectItem>
                <SelectItem value="in_process">قيد المعالجة</SelectItem>
                <SelectItem value="completed">مكتملة</SelectItem>
                <SelectItem value="assigned">مخصصة</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </OliveCardContent>
      </OliveCard>

      {/* Batches List */}
      <OliveCard>
        <OliveCardHeader>
          <OliveCardTitle>الدفعات الجاهزة للمعالجة ({filteredBatches.length})</OliveCardTitle>
        </OliveCardHeader>
        <OliveCardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-muted-foreground">جاري التحميل...</p>
            </div>
          ) : filteredBatches.length === 0 ? (
            <div className="text-center py-8">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">لا توجد دفعات جاهزة للمعالجة</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {filteredBatches.map((batch) => (
                <div
                  key={batch.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Package className="h-6 w-6 text-blue-600" />
                    </div>
                    
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold">{batch.ticketNumber}</span>
                        <Badge variant={getStatusBadgeVariant(batch.status)}>
                          {getStatusText(batch.status)}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {batch.clientName}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-6 text-sm">
                    <div className="text-center">
                      <div className="font-medium">{batch.weightIn} كجم</div>
                      <div className="text-muted-foreground flex items-center gap-1">
                        <Weight className="h-3 w-3" />
                        الوزن
                      </div>
                    </div>
                    
                    <div className="text-center">
                      <div className="font-medium">{batch.numberOfBatches}</div>
                      <div className="text-muted-foreground">دفعات</div>
                    </div>

                    <div className="text-center">
                      <div className="font-medium">{batch.numberOfBidons}</div>
                      <div className="text-muted-foreground">بيدونات</div>
                    </div>

                    {batch.status !== 'assigned' && (
                      <OliveButton
                        onClick={() => {
                          setSelectedBatch(batch);
                          setIsAssignModalOpen(true);
                        }}
                        size="sm"
                      >
                        <ArrowRight className="h-4 w-4 mr-1" />
                        تخصيص
                      </OliveButton>
                    )}

                    {batch.status === 'assigned' && batch.pressingRoomId && (
                      <div className="text-center">
                        <div className="font-medium text-green-600">غرفة {batch.pressingRoomId}</div>
                        <div className="text-muted-foreground flex items-center gap-1">
                          <Factory className="h-3 w-3" />
                          مخصصة
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </OliveCardContent>
      </OliveCard>

      {/* Assignment Modal */}
      <Dialog open={isAssignModalOpen} onOpenChange={setIsAssignModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تخصيص دفعة لغرفة العصر</DialogTitle>
            <DialogDescription>
              اختر غرفة العصر والوقت المقدر للمعالجة
            </DialogDescription>
          </DialogHeader>

          {selectedBatch && (
            <div className="space-y-4">
              {/* Batch Info */}
              <div className="p-3 bg-muted rounded-lg">
                <h4 className="font-semibold mb-2">بيانات الدفعة</h4>
                <div className="text-sm space-y-1">
                  <div>التذكرة: {selectedBatch.ticketNumber}</div>
                  <div>العميل: {selectedBatch.clientName}</div>
                  <div>الوزن: {selectedBatch.weightIn} كجم</div>
                  <div>عدد الدفعات: {selectedBatch.numberOfBatches}</div>
                </div>
              </div>

              {/* Room Selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium">اختر غرفة العصر *</label>
                <Select value={selectedRoom} onValueChange={setSelectedRoom}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر غرفة العصر" />
                  </SelectTrigger>
                  <SelectContent>
                    {pressingRooms
                      .filter(room => room.status === 'available')
                      .map((room) => (
                        <SelectItem key={room.id} value={String(room.id)}>
                          {room.name} - متاحة
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Estimated Time */}
              <div className="space-y-2">
                <label className="text-sm font-medium">الوقت المقدر (بالدقائق) *</label>
                <Input
                  type="number"
                  min="1"
                  max="240"
                  value={estimatedTime}
                  onChange={(e) => setEstimatedTime(e.target.value)}
                  placeholder="مثال: 45"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-4">
                <OliveButton
                  variant="outline"
                  onClick={() => {
                    setIsAssignModalOpen(false);
                    setSelectedBatch(null);
                    setSelectedRoom('');
                    setEstimatedTime('');
                  }}
                  className="flex-1"
                >
                  إلغاء
                </OliveButton>
                <OliveButton
                  onClick={handleAssignBatch}
                  className="flex-1"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      جاري التخصيص...
                    </>
                  ) : (
                    <>
                      <Factory className="h-4 w-4 mr-2" />
                      تخصيص الدفعة
                    </>
                  )}
                </OliveButton>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}