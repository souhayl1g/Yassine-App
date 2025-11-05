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
  batchId: number;
  ticketNumber: string;
  clientName: string;
  totalBoxes: number;
  boxesQueued: number;
  boxesRemaining: number;
  progress: number;
  startedAt: string;
  queuerName: string;
  weightIn: number;
  operationType: string;
  status: string;
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

  // Format current time in Arabic
  const formatCurrentTime = (date: Date) => {
    const days = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    const months = ['جانفي', 'فيري', 'مارس', 'أفريل', 'ماي', 'جوان', 'جويلية', 'أوت', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
    
    const dayName = days[date.getDay()];
    const monthName = months[date.getMonth()];
    const day = date.getDate();
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    
    return `${dayName}، ${day} ${monthName} ${year} الساعة ${hours}:${minutes}:${seconds}`;
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-gray-100 to-gray-200 p-6 relative">
      {/* Date Display - Top Left */}
      <div className="absolute top-6 left-6 z-50">
        <div className="text-lg text-gray-600 font-mono bg-white px-6 py-2 rounded-full shadow-md border border-gray-300">
          {formatCurrentTime(currentTime)}
        </div>
      </div>

      {/* Fullscreen Button */}
      <button
        onClick={() => {
          console.log('Fullscreen button clicked');
          toggleFullscreen().catch(error => {
            console.error('Fullscreen error:', error);
            alert('فشل في تفعيل الشاشة الكاملة. تأكد من أن المتصفح يدعم هذه الميزة.');
          });
        }}
        className="absolute top-6 right-6 z-50 bg-white hover:bg-gray-50 border-2 border-gray-300 rounded-xl p-3 transition-all duration-200 flex items-center gap-2 text-gray-700 shadow-lg cursor-pointer hover:shadow-xl"
        title={isFullscreen ? "خروج من الشاشة الكاملة" : "شاشة كاملة"}
      >
        {isFullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
        <span className="text-sm font-semibold">
          {isFullscreen ? "خروج" : "شاشة كاملة"}
        </span>
      </button>

      {/* Header */}
      <div className="mb-10 text-center">
        <div className="inline-flex items-center gap-3 bg-gradient-to-r from-emerald-600 to-green-600 px-8 py-4 rounded-2xl shadow-xl mb-4">
          <span className="text-5xl">🫒</span>
          <h1 className="text-4xl font-black text-white">
            معصرة ياسين وأبوه
          </h1>
        </div>
        <div className="text-xl font-bold text-gray-700 mb-2">
          لوحة مراقبة غرف العصر
        </div>
      </div>

      {/* Pressing Rooms Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-7 gap-5 mb-10">
        {pressingRooms.map((room) => {
          const isAvailable = room.status === 'available';
          const timeInfo = room.currentBatch 
            ? getTimeInfo(room.currentBatch.sessionStartTime, room.currentBatch.estimatedTime)
            : null;

          return (
            <div
              key={room.id}
              className={`
                relative rounded-2xl p-5 shadow-lg border-2 transition-all duration-500 hover:shadow-2xl
                ${isAvailable 
                  ? 'bg-white border-gray-300' 
                  : timeInfo?.isOvertime
                    ? 'bg-red-50 border-red-500 animate-pulse'
                    : 'bg-green-50 border-green-500'
                }
              `}
            >
              {/* Room Header */}
              <div className="text-center mb-4 pb-3 border-b-2 border-gray-200">
                <div className={`inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl mb-2 ${
                  isAvailable ? 'bg-gray-100' : timeInfo?.isOvertime ? 'bg-red-100' : 'bg-green-100'
                }`}>
                  <Factory className={`h-7 w-7 ${
                    isAvailable ? 'text-gray-600' : timeInfo?.isOvertime ? 'text-red-600' : 'text-green-600'
                  }`} />
                  <span className={`text-2xl font-black ${
                    isAvailable ? 'text-gray-700' : timeInfo?.isOvertime ? 'text-red-700' : 'text-green-700'
                  }`}>غرفة {room.id}</span>
                </div>
                <h3 className="text-base font-bold text-gray-700">{room.name}</h3>
              </div>

              {/* Status */}
              {isAvailable ? (
                <div className="text-center py-6">
                  <div className="text-6xl font-black text-gray-400 mb-3">فارغة </div>
                  <div className="text-xl font-bold text-gray-600">في انتظار العمل</div>
                </div>
              ) : room.currentBatch && timeInfo && (
                <div className="space-y-3">
                  {/* Client Info */}
                  <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-200">
                    <div className="flex items-center gap-2 mb-1">
                      <User className="h-5 w-5 text-blue-600" />
                      <span className="font-bold text-gray-800 truncate text-sm">
                        {room.currentBatch.clientName}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Package className="h-4 w-4" />
                      <span>تذكرة #{room.currentBatch.id}</span>
                    </div>
                  </div>

                  {/* Weight & Batches */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-white rounded-xl p-3 text-center shadow-sm border border-gray-200">
                      <Weight className="h-5 w-5 mx-auto mb-1 text-amber-600" />
                      <div className="text-xl font-black text-gray-800">{room.currentBatch.weightIn}</div>
                      <div className="text-xs text-gray-600 font-semibold">كيلوجرام</div>
                    </div>
                    <div className="bg-white rounded-xl p-3 text-center shadow-sm border border-gray-200">
                      <Package className="h-5 w-5 mx-auto mb-1 text-purple-600" />
                      <div className="text-xl font-black text-gray-800">{room.currentBatch.numberOfBatches}</div>
                      <div className="text-xs text-gray-600 font-semibold">دفعة</div>
                    </div>
                  </div>

                  {/* Time Information */}
                  <div className={`rounded-xl p-4 text-center shadow-sm border-2 ${
                    timeInfo.isOvertime ? 'bg-red-100 border-red-400' : 'bg-blue-100 border-blue-400'
                  }`}>
                    <div className="flex items-center justify-center gap-2 mb-3">
                      <Clock className={`h-5 w-5 ${timeInfo.isOvertime ? 'text-red-600' : 'text-blue-600'}`} />
                      <span className={`font-bold ${timeInfo.isOvertime ? 'text-red-800' : 'text-blue-800'}`}>الوقت</span>
                    </div>
                    
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-700 font-semibold">مضى:</span>
                        <span className="font-black text-gray-900 text-base">{formatTime(timeInfo.elapsed)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className={`font-semibold ${timeInfo.isOvertime ? 'text-red-700' : 'text-gray-700'}`}>
                          {timeInfo.isOvertime ? 'تجاوز:' : 'متبقي:'}
                        </span>
                        <span className={`font-black text-base ${timeInfo.isOvertime ? 'text-red-700' : 'text-gray-900'}`}>
                          {timeInfo.isOvertime ? formatTime(timeInfo.elapsed - room.currentBatch.estimatedTime) : formatTime(timeInfo.remaining)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Status Indicator */}
                  <div className={`text-center py-2 px-3 rounded-xl ${
                    timeInfo.isOvertime ? 'bg-red-100' : 'bg-green-100'
                  }`}>
                    {timeInfo.isOvertime ? (
                      <div className="flex items-center justify-center gap-2 text-red-700">
                        <Timer className="h-5 w-5 animate-pulse" />
                        <span className="font-black text-sm">⚠️ تجاوز الوقت</span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-2 text-green-700">
                        <Play className="h-5 w-5" />
                        <span className="font-black text-sm">▶ قيد التشغيل</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Queue Section - 3 Columns with 4 Cards Each */}
      {queueItems.length > 0 && (
        <div className="mt-8">
          <div className="bg-gradient-to-r from-orange-500 to-amber-500 rounded-xl p-3 mb-4 shadow-lg">
            <div className="flex items-center justify-center gap-2">
              <Users className="h-6 w-6 text-white" />
              <h2 className="text-2xl font-black text-white">قائمة الانتظار ({queueItems.length})</h2>
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-6" dir="rtl">
            {/* Column 1 */}
            <div className="space-y-3">
              {queueItems.slice(0, 4).map((queueItem, index) => (
                <div
                  key={queueItem.id}
                  className="bg-white rounded-lg p-3 shadow-md border-2 border-orange-300 hover:shadow-lg transition-all duration-200"
                >
                  {/* Queue Position & Client Name */}
                  <div className="flex items-center gap-3 mb-2">
                    <div className="bg-gradient-to-br from-orange-500 to-amber-600 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-black shadow-md flex-shrink-0">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <div className="font-bold text-sm text-gray-800 truncate">
                        {queueItem.clientName}
                      </div>
                      <div className="text-[10px] text-gray-500 font-semibold">
                        #{queueItem.ticketNumber}
                      </div>
                    </div>
                  </div>

                  {/* Progress Info - Horizontal Layout */}
                  <div className="flex items-center justify-between">
                    <div className="text-gray-600 font-semibold text-sm">
                      📦 {queueItem.boxesQueued}/{queueItem.totalBoxes}
                    </div>
                    <div className="text-gray-600 font-semibold text-sm">
                      ⚖️ {queueItem.weightIn} كجم
                    </div>
                    <div className="text-base font-black text-blue-600">
                      {queueItem.progress}%
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Column 2 */}
            <div className="space-y-3">
              {queueItems.slice(4, 8).map((queueItem, index) => (
                <div
                  key={queueItem.id}
                  className="bg-white rounded-lg p-3 shadow-md border-2 border-orange-300 hover:shadow-lg transition-all duration-200"
                >
                  {/* Queue Position & Client Name */}
                  <div className="flex items-center gap-3 mb-2">
                    <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-black shadow-md flex-shrink-0">
                      {index + 5}
                    </div>
                    <div className="flex-1">
                      <div className="font-bold text-sm text-gray-800 truncate">
                        {queueItem.clientName}
                      </div>
                      <div className="text-[10px] text-gray-500 font-semibold">
                        #{queueItem.ticketNumber}
                      </div>
                    </div>
                  </div>

                  {/* Progress Info - Horizontal Layout */}
                  <div className="flex items-center justify-between">
                    <div className="text-gray-600 font-semibold text-sm">
                      📦 {queueItem.boxesQueued}/{queueItem.totalBoxes}
                    </div>
                    <div className="text-gray-600 font-semibold text-sm">
                      ⚖️ {queueItem.weightIn} كجم
                    </div>
                    <div className="text-base font-black text-blue-600">
                      {queueItem.progress}%
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Column 3 */}
            <div className="space-y-3">
              {queueItems.slice(8, 12).map((queueItem, index) => (
                <div
                  key={queueItem.id}
                  className="bg-white rounded-lg p-3 shadow-md border-2 border-orange-300 hover:shadow-lg transition-all duration-200"
                >
                  {/* Queue Position & Client Name */}
                  <div className="flex items-center gap-3 mb-2">
                    <div className="bg-gradient-to-br from-orange-500 to-amber-600 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-black shadow-md flex-shrink-0">
                      {index + 9}
                    </div>
                    <div className="flex-1">
                      <div className="font-bold text-sm text-gray-800 truncate">
                        {queueItem.clientName}
                      </div>
                      <div className="text-[10px] text-gray-500 font-semibold">
                        #{queueItem.ticketNumber}
                      </div>
                    </div>
                  </div>

                  {/* Progress Info - Horizontal Layout */}
                  <div className="flex items-center justify-between">
                    <div className="text-gray-600 font-semibold text-sm">
                      📦 {queueItem.boxesQueued}/{queueItem.totalBoxes}
                    </div>
                    <div className="text-gray-600 font-semibold text-sm">
                      ⚖️ {queueItem.weightIn} كجم
                    </div>
                    <div className="text-base font-black text-blue-600">
                      {queueItem.progress}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}