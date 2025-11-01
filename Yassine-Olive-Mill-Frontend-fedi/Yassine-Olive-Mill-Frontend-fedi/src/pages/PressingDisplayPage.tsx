import React, { useState, useEffect } from 'react';
import { useFullscreen } from '@/contexts/FullscreenContext';
import { api } from '@/integrations/api/client';
import { 
  Factory, 
  Clock, 
  User, 
  Weight, 
  Play, 
  Timer,
  Package,
  Maximize,
  Minimize,
  List,
  Users
} from 'lucide-react';

interface PressingRoomData {
  id: number;
  name: string;
  status: 'available' | 'busy';
  currentBatch?: {
    id: string;
    clientName: string;
    weightIn: number;
    numberOfBatches: number;
    sessionStartTime: string;
    estimatedTime: number;
  };
}

interface QueueItem {
  id: number;
  batch_id: number;
  number_of_boxes: number;
  priority: number;
  status: string;
  notes?: string;
  created_at: string;
  batch: {
    id: number;
    ticket_number: string;
    weight_in: number;
    number_of_boxes: number;
    client: {
      id: number;
      firstname: string;
      lastname: string;
    };
  };
  operator: {
    id: number;
    firstname: string;
    lastname: string;
  };
}

interface CombinedDisplayData {
  pressingRooms: PressingRoomData[];
  queueItems: QueueItem[];
}

export function PressingDisplayPage() {
  const [pressingRooms, setPressingRooms] = useState<PressingRoomData[]>([]);
  const [queueItems, setQueueItems] = useState<QueueItem[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const { isFullscreen, toggleFullscreen } = useFullscreen();

  // Load combined data from API (rooms and queue in single call)
  const loadCombinedData = async () => {
    try {
      console.log('Loading combined display data from API...');
      const response = await api.get<CombinedDisplayData>('/pressing-rooms/combined-display-data');
      console.log('Combined display data response:', response);
      
      if (response && typeof response === 'object') {
        // Update pressing rooms
        if (response.pressingRooms && Array.isArray(response.pressingRooms)) {
          setPressingRooms(response.pressingRooms);
        } else {
          console.warn('Invalid pressing rooms format in combined response, setting empty array');
          setPressingRooms([]);
        }

        // Update queue items
        if (response.queueItems && Array.isArray(response.queueItems)) {
          setQueueItems(response.queueItems);
        } else {
          console.warn('Invalid queue items format in combined response, setting empty array');
          setQueueItems([]);
        }
      } else {
        console.warn('Invalid combined response format, setting empty arrays');
        setPressingRooms([]);
        setQueueItems([]);
      }
    } catch (error) {
      console.error('Error loading combined display data:', error);
      // Set empty arrays on error
      setPressingRooms([]);
      setQueueItems([]);
    }
  };

  // Calculate elapsed time and remaining time
  const getTimeInfo = (startTime: string, estimatedMinutes: number) => {
    const start = new Date(startTime);
    const elapsed = Math.floor((currentTime.getTime() - start.getTime()) / 1000 / 60); // in minutes
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
      return `${hours}س ${mins}د`;
    }
    return `${mins}د`;
  };

  // Format current time
  const formatCurrentTime = (date: Date) => {
    return date.toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  };

  // Fullscreen functionality is now handled by the context

  // Auto refresh data and time
  useEffect(() => {
    loadCombinedData();
    
    // Update time every second
    const timeInterval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    // Refresh data every 10 seconds - now using single API call
    const dataInterval = setInterval(() => {
      loadCombinedData();
    }, 10000);

    return () => {
      clearInterval(timeInterval);
      clearInterval(dataInterval);
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white p-6 relative">
      {/* Fullscreen Button - Absolute position relative to page */}
      <button
        onClick={() => {
          console.log('Fullscreen button clicked');
          toggleFullscreen().catch(error => {
            console.error('Fullscreen error:', error);
            alert('فشل في تفعيل الشاشة الكاملة. تأكد من أن المتصفح يدعم هذه الميزة.');
          });
        }}
        className="absolute top-4 right-4 z-40 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-lg p-3 transition-all duration-200 flex items-center gap-2 text-white shadow-lg cursor-pointer"
        title={isFullscreen ? "خروج من الشاشة الكاملة" : "شاشة كاملة"}
      >
        {isFullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
        <span className="text-sm font-medium">
          {isFullscreen ? "خروج" : "شاشة كاملة"}
        </span>
      </button>

      {/* Header */}
      <div className="mb-8 text-center">
        
        <h1 className="text-5xl font-bold text-white mb-2 drop-shadow-lg">
          🫒 معصرة ياسين وأبوه
        </h1>
        <div className="text-2xl font-medium text-blue-200 mb-4">
          شاشة مراقبة غرف العصر
        </div>
        <div className="text-xl text-blue-300 font-mono">
          {formatCurrentTime(currentTime)}
        </div>
      </div>

      {/* Pressing Rooms Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-7 gap-4 mb-8">
        {pressingRooms.map((room) => {
          const isAvailable = room.status === 'available';
          const timeInfo = room.currentBatch 
            ? getTimeInfo(room.currentBatch.sessionStartTime, room.currentBatch.estimatedTime)
            : null;

          return (
            <div
              key={room.id}
              className={`
                relative rounded-2xl p-4 shadow-2xl transition-all duration-500
                ${isAvailable 
                  ? 'bg-gradient-to-br from-green-500 to-green-600 hover:from-green-400 hover:to-green-500' 
                  : timeInfo?.isOvertime
                    ? 'bg-gradient-to-br from-red-500 to-red-600 animate-pulse'
                    : 'bg-gradient-to-br from-blue-500 to-blue-600'
                }
              `}
            >
              {/* Room Header */}
              <div className="text-center mb-4">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Factory className="h-8 w-8" />
                  <span className="text-2xl font-bold">{room.id}</span>
                </div>
                <h3 className="text-lg font-semibold">{room.name}</h3>
              </div>

              {/* Status */}
              {isAvailable ? (
                <div className="text-center">
                  <div className="text-6xl mb-2">✅</div>
                  <div className="text-xl font-bold">متاحة</div>
                  <div className="text-sm opacity-75">جاهزة للعمل</div>
                </div>
              ) : room.currentBatch && timeInfo && (
                <div className="space-y-3 text-sm">
                  {/* Client Info */}
                  <div className="bg-black/20 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <User className="h-4 w-4" />
                      <span className="font-semibold truncate">
                        {room.currentBatch.clientName}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs opacity-75">
                      <Package className="h-3 w-3" />
                      تذكرة #{room.currentBatch.id}
                    </div>
                  </div>

                  {/* Weight & Batches */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-black/20 rounded-lg p-2 text-center">
                      <Weight className="h-4 w-4 mx-auto mb-1" />
                      <div className="font-bold">{room.currentBatch.weightIn}</div>
                      <div className="text-xs opacity-75">كجم</div>
                    </div>
                    <div className="bg-black/20 rounded-lg p-2 text-center">
                      <Package className="h-4 w-4 mx-auto mb-1" />
                      <div className="font-bold">{room.currentBatch.numberOfBatches}</div>
                      <div className="text-xs opacity-75">دفعات</div>
                    </div>
                  </div>

                  {/* Time Information */}
                  <div className="bg-black/20 rounded-lg p-3 text-center">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <Clock className="h-4 w-4" />
                      <span className="font-semibold">الوقت</span>
                    </div>
                    
                    <div className="grid grid-cols-1 gap-1 text-xs">
                      <div>
                        <span className="opacity-75">مضى:</span>
                        <span className="font-bold ml-1">{formatTime(timeInfo.elapsed)}</span>
                      </div>
                      <div className={timeInfo.isOvertime ? 'text-red-200' : ''}>
                        <span className="opacity-75">
                          {timeInfo.isOvertime ? 'تجاوز:' : 'متبقي:'}
                        </span>
                        <span className="font-bold ml-1">
                          {timeInfo.isOvertime ? formatTime(timeInfo.elapsed - room.currentBatch.estimatedTime) : formatTime(timeInfo.remaining)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Status Indicator */}
                  <div className="text-center">
                    {timeInfo.isOvertime ? (
                      <div className="flex items-center justify-center gap-2 text-red-200">
                        <Timer className="h-4 w-4 animate-pulse" />
                        <span className="font-bold text-xs">تجاوز الوقت المقدر</span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-2 text-green-200">
                        <Play className="h-4 w-4" />
                        <span className="font-bold text-xs">قيد العمل</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-5 gap-6 text-center">
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
          <div className="text-3xl font-bold text-green-400">
            {pressingRooms.filter(r => r.status === 'available').length}
          </div>
          <div className="text-lg text-white/80">غرف متاحة</div>
        </div>
        
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
          <div className="text-3xl font-bold text-blue-400">
            {pressingRooms.filter(r => r.status === 'busy').length}
          </div>
          <div className="text-lg text-white/80">غرف تعمل</div>
        </div>
        
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
          <div className="text-3xl font-bold text-red-400">
            {pressingRooms.filter(r => {
              if (!r.currentBatch) return false;
              const timeInfo = getTimeInfo(r.currentBatch.sessionStartTime, r.currentBatch.estimatedTime);
              return timeInfo.isOvertime;
            }).length}
          </div>
          <div className="text-lg text-white/80">تجاوزت الوقت</div>
        </div>

        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
          <div className="text-3xl font-bold text-yellow-400">
            {pressingRooms
              .filter(r => r.currentBatch)
              .reduce((total, r) => total + (r.currentBatch?.weightIn || 0), 0)}
          </div>
          <div className="text-lg text-white/80">كجم قيد المعالجة</div>
        </div>

        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-orange-400/30">
          <div className="text-3xl font-bold text-orange-400">
            {queueItems.length}
          </div>
          <div className="text-lg text-white/80">في الطابور</div>
        </div>
      </div>

      {/* Queue Section - Compact Version */}
      {queueItems.length > 0 && (
        <div className="mt-6 mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <List className="h-6 w-6 text-orange-400" />
            <h2 className="text-2xl font-bold text-orange-400">طابور الانتظار</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-8 gap-3">
            {queueItems.map((queueItem, index) => (
              <div
                key={queueItem.id}
                className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg p-3 shadow-xl border border-orange-400/30 relative"
              >
                {/* Queue Position Badge */}
                <div className="absolute -top-2 -right-2 bg-white text-orange-600 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
                  {index + 1}
                </div>

                {/* Priority Badge */}
                {queueItem.priority > 0 && (
                  <div className="absolute -top-1 -left-1 bg-red-500 rounded-full w-3 h-3"></div>
                )}

                {/* Client Info */}
                <div className="text-center mb-2">
                  <div className="font-bold text-base text-white mb-1 truncate">
                    {queueItem.batch.client.firstname} {queueItem.batch.client.lastname}
                  </div>
                  <div className="text-xs opacity-75">
                    #{queueItem.batch.ticket_number}
                  </div>
                </div>

                {/* Compact Details */}
                <div className="grid grid-cols-2 gap-1 text-xs text-center">
                  <div className="bg-black/20 rounded px-1 py-1">
                    <div className="font-bold">{queueItem.batch.weight_in}</div>
                    <div className="opacity-75">كجم</div>
                  </div>
                  <div className="bg-black/20 rounded px-1 py-1">
                    <div className="font-bold">{queueItem.number_of_boxes}</div>
                    <div className="opacity-75">صندوق</div>
                  </div>
                </div>

                {/* Time */}
                <div className="text-center mt-2 text-xs opacity-75">
                  {new Date(queueItem.created_at).toLocaleTimeString('en-US', { 
                    hour: '2-digit', 
                    minute: '2-digit',
                    hour12: false 
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="mt-8 text-center text-white/60 text-sm">
        التحديث التلقائي كل 10 ثوانٍ (طلب واحد محسّن) • آخر تحديث: {currentTime.toLocaleTimeString('en-US', { hour12: false })}
      </div>
    </div>
  );
}