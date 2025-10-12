import React, { useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { OliveCard, OliveCardHeader, OliveCardContent, OliveCardTitle } from '@/components/ui/olive-card';
import { OliveButton } from '@/components/ui/olive-button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
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
  AlertCircle,
  QrCode,
  Printer,
  Trash2,
  MoreHorizontal,
  Edit
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/integrations/api/client';
import QRCode from 'qrcode';
import { useReactToPrint } from 'react-to-print';

interface CurrentBatch {
  id: string;
  clientName: string;
  weightIn: number;
  numberOfBatches: number;
  sessionStartTime: string;
  estimatedTime: number;
}

interface Room {
  id: number;
  name: string;
  status: 'busy' | 'available' | 'maintenance';
  currentBatch?: CurrentBatch;
}



export function RoomsPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isAddRoomOpen, setIsAddRoomOpen] = useState(false);
  const [newRoom, setNewRoom] = useState({
    name: '',
    status: 'inactive' as 'active' | 'inactive' | 'maintenance'
  });
  
  // QR Code state
  const [selectedRoomForQR, setSelectedRoomForQR] = useState<Room | null>(null);
  const [isQRDialogOpen, setIsQRDialogOpen] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const printRef = useRef<HTMLDivElement>(null);

  // Rename room state
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
  const [roomToRename, setRoomToRename] = useState<Room | null>(null);
  const [newRoomName, setNewRoomName] = useState('');

  const loadRooms = async () => {
    try {
      const resp = await api.get<Room[]>('/pressing-rooms/display-data');
      setRooms(resp || []);
    } catch (e: any) {
      console.error('Failed to load rooms:', e);
      toast({ 
        variant: 'destructive', 
        title: t('common.error'), 
        description: e?.message || 'Failed to load rooms' 
      });
    }
  };

  useEffect(() => {
    loadRooms();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      loadRooms();
    }, 30000);
    
    return () => clearInterval(interval);
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
      case 'busy': return 'bg-success text-success-foreground';
      case 'available': return 'bg-muted text-muted-foreground';
      case 'maintenance': return 'bg-warning text-warning-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'busy': return Play;
      case 'available': return Square;
      case 'maintenance': return Settings;
      default: return Square;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'busy': return 'نشط';
      case 'available': return 'متاح';
      case 'maintenance': return 'صيانة';
      default: return 'متاح';
    }
  };

  // Calculate elapsed time and remaining time
  const getTimeInfo = (startTime: string, estimatedMinutes: number) => {
    const start = new Date(startTime);
    const elapsed = Math.floor((Date.now() - start.getTime()) / 1000 / 60); // in minutes
    const remaining = Math.max(0, estimatedMinutes - elapsed);
    
    return {
      elapsed,
      remaining,
      isOvertime: elapsed > estimatedMinutes
    };
  };

  // Format time display
  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours} ساعة ${mins} دقيقة`;
    }
    return `${mins} دقيقة`;
  };

  const handleMaintenance = (roomId: number) => {
    // This would normally make an API call to toggle maintenance status
    toast({
      title: t('common.success'),
      description: 'تم تحديث حالة الصيانة',
    });
    loadRooms(); // Refresh the data
  };

  const handleDeleteRoom = async (roomId: number, roomName: string) => {
    try {
      await api.delete(`/pressing-rooms/${roomId}`);
      await loadRooms();
      toast({
        title: t('common.success'),
        description: `تم حذف غرفة "${roomName}" بنجاح`,
      });
    } catch (e: any) {
      toast({
        variant: 'destructive',
        title: t('common.error'),
        description: e?.message || 'فشل في حذف الغرفة',
      });
    }
  };

  const handleRenameRoom = (room: Room) => {
    setRoomToRename(room);
    setNewRoomName(room.name);
    setIsRenameDialogOpen(true);
  };

  const handleSaveRename = async () => {
    if (!roomToRename || !newRoomName.trim()) {
      toast({
        variant: 'destructive',
        title: t('common.error'),
        description: 'يرجى إدخال اسم الغرفة',
      });
      return;
    }

    try {
      await api.put(`/pressing-rooms/${roomToRename.id}`, { name: newRoomName.trim() });
      await loadRooms();
      setIsRenameDialogOpen(false);
      setRoomToRename(null);
      setNewRoomName('');
      toast({
        title: t('common.success'),
        description: `تم تغيير اسم الغرفة إلى "${newRoomName.trim()}" بنجاح`,
      });
    } catch (e: any) {
      toast({
        variant: 'destructive',
        title: t('common.error'),
        description: e?.message || 'فشل في تغيير اسم الغرفة',
      });
    }
  };

  // Generate QR code for room
  const generateQRCode = async (room: Room) => {
    try {
      const qrData = JSON.stringify({ id: room.id, type: 'room' });
      const dataUrl = await QRCode.toDataURL(qrData, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      setQrCodeDataUrl(dataUrl);
      setSelectedRoomForQR(room);
      setIsQRDialogOpen(true);
    } catch (error) {
      console.error('Failed to generate QR code:', error);
      toast({
        variant: 'destructive',
        title: 'خطأ',
        description: 'فشل في إنشاء رمز QR',
      });
    }
  };

  // Print QR code
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `QR-${selectedRoomForQR?.name || 'Room'}`,
  });

  const activeRoomsCount = rooms.filter(room => room.status === 'busy').length;
  const totalBoxes = rooms.reduce((sum, room) => {
    return sum + (room.currentBatch?.numberOfBatches || 0);
  }, 0);
  const totalWeight = rooms.reduce((sum, room) => {
    return sum + (room.currentBatch?.weightIn || 0);
  }, 0);

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

        <div className="flex gap-2">
          <OliveButton 
            size="lg" 
            variant="outline"
            className="gap-2"
            onClick={loadRooms}
          >
            <RotateCw className="h-5 w-5" />
            تحديث
          </OliveButton>
          
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
                <p className="text-sm text-muted-foreground">وزن قيد المعالجة</p>
                <p className="text-3xl font-bold text-secondary">{totalWeight} كجم</p>
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
                      {getStatusText(room.status)}
                    </Badge>
                  </div>
                  <div className="flex gap-1">
                    <OliveButton
                      variant="ghost"
                      size="sm"
                      onClick={() => generateQRCode(room)}
                      className="text-muted-foreground hover:text-blue-600"
                      title="إنشاء رمز QR"
                    >
                      <QrCode className="h-4 w-4" />
                    </OliveButton>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <OliveButton
                          variant="ghost"
                          size="sm"
                          className="text-muted-foreground hover:text-foreground"
                          title="المزيد من الخيارات"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </OliveButton>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem
                          onClick={() => handleRenameRoom(room)}
                          className="gap-2"
                        >
                          <Edit className="h-4 w-4" />
                          إعادة تسمية
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleMaintenance(room.id)}
                          className="gap-2 text-warning hover:text-warning"
                        >
                          <Settings className="h-4 w-4" />
                          {room.status === 'maintenance' ? 'إنهاء الصيانة' : 'وضع الصيانة'}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <DropdownMenuItem
                              className="gap-2 text-destructive hover:text-destructive focus:text-destructive"
                              disabled={room.status === 'busy'}
                              onSelect={(e) => e.preventDefault()}
                            >
                              <Trash2 className="h-4 w-4" />
                              حذف الغرفة
                            </DropdownMenuItem>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>تأكيد حذف الغرفة</AlertDialogTitle>
                              <AlertDialogDescription>
                                هل أنت متأكد من حذف غرفة "{room.name}"؟ هذا الإجراء لا يمكن التراجع عنه.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>إلغاء</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteRoom(room.id, room.name)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                حذف
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </OliveCardHeader>

              <OliveCardContent className="space-y-4">
                {room.status === 'busy' && room.currentBatch && (
                  <>
                    {/* Current Client */}
                    <div className="flex items-center gap-2 p-3 bg-success/10 rounded-lg">
                      <User className="h-4 w-4 text-success" />
                      <div className="flex-1">
                        <p className="text-sm text-muted-foreground">العميل الحالي</p>
                        <p className="font-semibold text-success">{room.currentBatch.clientName}</p>
                      </div>
                    </div>

                    {/* Ticket ID */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">رقم التذكرة</span>
                      </div>
                      <span className="font-bold text-lg">#{room.currentBatch.id}</span>
                    </div>

                    {/* Weight and Boxes */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">الوزن</span>
                        </div>
                        <span className="font-bold">{room.currentBatch.weightIn} كجم</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">الصناديق</span>
                        </div>
                        <span className="font-bold">{room.currentBatch.numberOfBatches}</span>
                      </div>
                    </div>

                    {/* Time Information */}
                    {room.currentBatch.sessionStartTime && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">وقت البداية</span>
                          </div>
                          <span className="text-sm font-medium">
                            {new Date(room.currentBatch.sessionStartTime).toLocaleTimeString('en-US', {
                              hour: '2-digit',
                              minute: '2-digit',
                              hour12: false
                            })}
                          </span>
                        </div>

                        {(() => {
                          const timeInfo = getTimeInfo(room.currentBatch.sessionStartTime, room.currentBatch.estimatedTime);
                          return (
                            <div className="grid grid-cols-2 gap-4">
                              <div className="text-center p-2 bg-blue-50 rounded-lg">
                                <p className="text-xs text-muted-foreground">مضى</p>
                                <p className="font-bold text-blue-600">{formatTime(timeInfo.elapsed)}</p>
                              </div>
                              <div className={`text-center p-2 rounded-lg ${timeInfo.isOvertime ? 'bg-red-50' : 'bg-green-50'}`}>
                                <p className="text-xs text-muted-foreground">
                                  {timeInfo.isOvertime ? 'تجاوز' : 'متبقي'}
                                </p>
                                <p className={`font-bold ${timeInfo.isOvertime ? 'text-red-600' : 'text-green-600'}`}>
                                  {timeInfo.isOvertime ? formatTime(timeInfo.elapsed - room.currentBatch.estimatedTime) : formatTime(timeInfo.remaining)}
                                </p>
                              </div>
                            </div>
                          );
                        })()}

                        {(() => {
                          const timeInfo = getTimeInfo(room.currentBatch.sessionStartTime, room.currentBatch.estimatedTime);
                          return timeInfo.isOvertime && (
                            <div className="flex items-center gap-2 p-2 bg-red-50 text-red-600 rounded-lg">
                              <AlertCircle className="h-4 w-4" />
                              <span className="text-sm font-medium">تجاوز الوقت المقدر</span>
                            </div>
                          );
                        })()}
                      </div>
                    )}
                  </>
                )}

                {room.status === 'available' && (
                  <div className="text-center py-6">
                    <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                    <p className="text-muted-foreground mb-4">الغرفة متاحة</p>
                  </div>
                )}

                {room.status === 'maintenance' && (
                  <div className="text-center py-6">
                    <Settings className="h-12 w-12 text-warning mx-auto mb-3" />
                    <p className="text-warning font-medium mb-4">تحت الصيانة</p>
                  </div>
                )}



                {/* Action Buttons */}
                <div className="flex gap-2 pt-4 border-t">
                  {room.status === 'available' && (
                    <OliveButton 
                      onClick={() => loadRooms()}
                      className="flex-1 gap-2"
                      variant="outline"
                    >
                      <RotateCw className="h-4 w-4" />
                      تحديث
                    </OliveButton>
                  )}

                  {room.status === 'busy' && (
                    <>
                      <OliveButton 
                        onClick={() => generateQRCode(room)}
                        className="flex-1 gap-2"
                        variant="primary"
                      >
                        <QrCode className="h-4 w-4" />
                        مسح لإنهاء الجلسة
                      </OliveButton>
                      <OliveButton 
                        onClick={() => loadRooms()}
                        className="flex-1 gap-2"
                        variant="outline"
                      >
                        <RotateCw className="h-4 w-4" />
                        تحديث الحالة
                      </OliveButton>
                    </>
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

      {/* QR Code Dialog */}
      <Dialog open={isQRDialogOpen} onOpenChange={setIsQRDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center">
              رمز QR - {selectedRoomForQR?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* QR Code Display */}
            <div className="flex justify-center">
              <div ref={printRef} className="bg-white p-8 rounded-lg shadow-sm">
                <div className="text-center space-y-4">
                  <h2 className="text-xl font-bold text-gray-800">
                    {selectedRoomForQR?.name}
                  </h2>
                  <p className="text-gray-600 text-sm">
                    رمز QR - غرفة العصر
                  </p>
                  {qrCodeDataUrl && (
                    <img 
                      src={qrCodeDataUrl} 
                      alt={`QR Code for ${selectedRoomForQR?.name}`}
                      className="mx-auto block"
                    />
                  )}
                  <div className="text-xs text-gray-500 space-y-1">
                    <p>امسح هذا الرمز باستخدام تطبيق الموظف</p>
                    <p>لعرض معلومات الغرفة وإنهاء الجلسات</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-4">
              <OliveButton 
                onClick={handlePrint} 
                className="flex-1 gap-2"
                variant="outline"
              >
                <Printer className="h-4 w-4" />
                طباعة
              </OliveButton>
              <OliveButton 
                onClick={() => setIsQRDialogOpen(false)} 
                className="flex-1"
              >
                إغلاق
              </OliveButton>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Rename Room Dialog */}
      <Dialog open={isRenameDialogOpen} onOpenChange={setIsRenameDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>إعادة تسمية الغرفة</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="renameRoomName">اسم الغرفة الجديد</Label>
              <Input
                id="renameRoomName"
                value={newRoomName}
                onChange={(e) => setNewRoomName(e.target.value)}
                placeholder="أدخل اسم الغرفة الجديد"
                autoFocus
              />
            </div>
            <div className="flex gap-2 pt-4">
              <OliveButton onClick={handleSaveRename} className="flex-1">
                حفظ
              </OliveButton>
              <OliveButton 
                variant="outline" 
                onClick={() => {
                  setIsRenameDialogOpen(false);
                  setRoomToRename(null);
                  setNewRoomName('');
                }} 
                className="flex-1"
              >
                إلغاء
              </OliveButton>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}