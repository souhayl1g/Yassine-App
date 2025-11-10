import React from 'react';
import { OliveButton } from '@/components/ui/olive-button';

interface OperationButtonsProps {
  onStartOperation: () => void;
  onFinishOperation: () => void;
  onOpenOilSale?: () => void;
}

// Enhanced line-based icons with warehouse context
const TruckArrivingIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 140 90" className={className} fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
    {/* Warehouse building with better proportions */}
    <rect x="85" y="30" width="50" height="40" strokeWidth="2.5" rx="2" />
    <path d="M85 30 L110 12 L135 30" strokeWidth="2.5" fill="currentColor" fillOpacity="0.1" />
    
    {/* Warehouse details */}
    <rect x="95" y="45" width="12" height="18" strokeWidth="2" fill="currentColor" fillOpacity="0.05" />
    <line x1="101" y1="45" x2="101" y2="63" strokeWidth="1" opacity="0.6" />
    <rect x="115" y="38" width="8" height="10" strokeWidth="1.5" />
    <rect x="125" y="38" width="8" height="10" strokeWidth="1.5" />
    <line x1="119" y1="38" x2="119" y2="48" strokeWidth="0.8" opacity="0.6" />
    <line x1="129" y1="38" x2="129" y2="48" strokeWidth="0.8" opacity="0.6" />
    
    {/* Ground line */}
    <line x1="5" y1="70" x2="135" y2="70" strokeWidth="1" opacity="0.3" />
    
    {/* Enhanced truck design */}
    <rect x="8" y="38" width="32" height="18" strokeWidth="2.5" rx="2" fill="currentColor" fillOpacity="0.05" />
    <rect x="42" y="32" width="18" height="24" strokeWidth="2.5" rx="2" fill="currentColor" fillOpacity="0.08" />
    
    {/* Truck details */}
    <rect x="49" y="38" width="8" height="6" strokeWidth="1.5" fill="currentColor" fillOpacity="0.1" />
    <line x1="12" y1="42" x2="38" y2="42" strokeWidth="1" opacity="0.4" />
    <line x1="12" y1="48" x2="38" y2="48" strokeWidth="1" opacity="0.4" />
    
    {/* Enhanced wheels */}
    <circle cx="20" cy="62" r="5" strokeWidth="2.5" fill="currentColor" fillOpacity="0.05" />
    <circle cx="20" cy="62" r="2.5" strokeWidth="1.5" />
    <circle cx="50" cy="62" r="5" strokeWidth="2.5" fill="currentColor" fillOpacity="0.05" />
    <circle cx="50" cy="62" r="2.5" strokeWidth="1.5" />
    
    {/* Dynamic movement arrow with motion lines */}
    <path d="M65 45 L78 45" strokeWidth="3" stroke="#22c55e" />
    <path d="M73 41 L78 45 L73 49" strokeWidth="3" stroke="#22c55e" fill="none" />
    <line x1="60" y1="40" x2="68" y2="40" strokeWidth="1.5" stroke="#22c55e" opacity="0.5" />
    <line x1="62" y1="50" x2="70" y2="50" strokeWidth="1.5" stroke="#22c55e" opacity="0.5" />
  </svg>
);

const TruckDepartingIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 140 90" className={className} fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
    {/* Warehouse building with better proportions */}
    <rect x="5" y="30" width="50" height="40" strokeWidth="2.5" rx="2" />
    <path d="M5 30 L30 12 L55 30" strokeWidth="2.5" fill="currentColor" fillOpacity="0.1" />
    
    {/* Warehouse details */}
    <rect x="15" y="45" width="12" height="18" strokeWidth="2" fill="currentColor" fillOpacity="0.05" />
    <line x1="21" y1="45" x2="21" y2="63" strokeWidth="1" opacity="0.6" />
    <rect x="35" y="38" width="8" height="10" strokeWidth="1.5" />
    <rect x="45" y="38" width="8" height="10" strokeWidth="1.5" />
    <line x1="39" y1="38" x2="39" y2="48" strokeWidth="0.8" opacity="0.6" />
    <line x1="49" y1="38" x2="49" y2="48" strokeWidth="0.8" opacity="0.6" />
    
    {/* Ground line */}
    <line x1="5" y1="70" x2="135" y2="70" strokeWidth="1" opacity="0.3" />
    
    {/* Enhanced truck design - now facing right (away from warehouse) */}
    <rect x="70" y="38" width="35" height="18" strokeWidth="2.5" rx="2" fill="currentColor" fillOpacity="0.05" />
    <rect x="105" y="32" width="18" height="24" strokeWidth="2.5" rx="2" fill="currentColor" fillOpacity="0.08" />
    
    {/* Truck details - windshield now on the right side of cab (front) */}
    <rect x="112" y="38" width="8" height="6" strokeWidth="1.5" fill="currentColor" fillOpacity="0.1" />
    <line x1="74" y1="42" x2="97" y2="42" strokeWidth="1" opacity="0.4" />
    <line x1="74" y1="48" x2="97" y2="48" strokeWidth="1" opacity="0.4" />
    
    {/* Enhanced wheels */}
    <circle cx="80" cy="62" r="5" strokeWidth="2.5" fill="currentColor" fillOpacity="0.05" />
    <circle cx="80" cy="62" r="2.5" strokeWidth="1.5" />
    <circle cx="113" cy="62" r="5" strokeWidth="2.5" fill="currentColor" fillOpacity="0.05" />
    <circle cx="113" cy="62" r="2.5" strokeWidth="1.5" />
    
    {/* Dynamic movement arrow pointing right (in front of departing truck) with motion lines */}
    <path d="M125 45 L137 45" strokeWidth="3" stroke="#f59e0b" />
    <path d="M132 41 L137 45 L132 49" strokeWidth="3" stroke="#f59e0b" fill="none" />
    <line x1="125" y1="40" x2="130" y2="40" strokeWidth="1.5" stroke="#f59e0b" opacity="0.5" />
    <line x1="128" y1="50" x2="133" y2="50" strokeWidth="1.5" stroke="#f59e0b" opacity="0.5" />
  </svg>
);

export function OperationButtons({
  onStartOperation,
  onFinishOperation,
  onOpenOilSale,
}: OperationButtonsProps) {
  return (
    <div className="flex justify-center gap-12">
      {/* Truck Arriving - Start Operations */}
      <div className="flex flex-col items-center">
        <div className="group">
          <OliveButton
            onClick={onStartOperation}
            size="lg"
            className="w-48 h-48 flex flex-col items-center justify-center gap-5 rounded-3xl hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-2xl bg-gradient-to-br from-green-50 to-emerald-50 hover:from-green-100 hover:to-emerald-100 border-2 border-green-200 hover:border-green-300"
          >
            <div className="relative">
              <TruckArrivingIcon className="h-28 w-32 text-green-700 group-hover:scale-110 transition-transform duration-300" />
              {/* Pulsing indicator */}
              <div className="absolute -top-3 -right-3 w-6 h-6 bg-green-500 rounded-full animate-ping" />
              <div className="absolute -top-3 -right-3 w-6 h-6 bg-green-500 rounded-full" />
            </div>
            <span className="text-base font-bold text-green-800 group-hover:text-green-900">
              وصول شاحنة
            </span>
          </OliveButton>
        </div>
        <div className="mt-3 text-center">
          <p className="text-xs text-green-600 font-medium">استقبال الزيتون</p>
          <p className="text-xs text-muted-foreground">بدء العمليات</p>
        </div>
      </div>

      {/* Truck Departing - Complete Operations */}
      <div className="flex flex-col items-center">
        <div className="group">
          <OliveButton
            onClick={onFinishOperation}
            variant="outline"
            size="lg"
            className="w-48 h-48 flex flex-col items-center justify-center gap-5 rounded-3xl hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-2xl bg-gradient-to-br from-orange-50 to-amber-50 hover:from-orange-100 hover:to-amber-100 border-2 border-orange-200 hover:border-orange-300"
          >
            <div className="relative">
              <TruckDepartingIcon className="h-28 w-32 text-orange-700 group-hover:scale-110 transition-transform duration-300" />
              {/* Pulsing indicator */}
              <div className="absolute -top-3 -left-3 w-6 h-6 bg-orange-500 rounded-full animate-pulse" />
            </div>
            <span className="text-base font-bold text-orange-800 group-hover:text-orange-900">
              مغادرة شاحنة
            </span>
          </OliveButton>
        </div>
        <div className="mt-3 text-center">
          <p className="text-xs text-orange-600 font-medium">تسليم الزيت</p>
          <p className="text-xs text-muted-foreground">إنهاء العمليات</p>
        </div>
      </div>

      {/* Oil Sale (باز) */}
      <div className="flex flex-col items-center">
        <div className="group">
          <OliveButton
            onClick={onOpenOilSale}
            variant="outline"
            size="lg"
            className="w-48 h-48 flex flex-col items-center justify-center gap-5 rounded-3xl hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-2xl bg-gradient-to-br from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 border-2 border-blue-200 hover:border-blue-300"
          >
            <div className="relative">
              {/* Simple droplet icon */}
              <svg viewBox="0 0 64 64" className="h-28 w-28 text-blue-700 fill-none" stroke="currentColor" strokeWidth="2.5">
                <path d="M32 6 C26 16 16 26 16 38 a16 16 0 0 0 32 0 C48 26 38 16 32 6z" fill="currentColor" fillOpacity="0.06"/>
                <path d="M32 6 C26 16 16 26 16 38 a16 16 0 0 0 32 0 C48 26 38 16 32 6z"/>
              </svg>
              {/* Badge */}
              <div className="absolute -top-3 -right-3 w-6 h-6 bg-blue-500 rounded-full animate-pulse" />
            </div>
            <span className="text-base font-bold text-blue-800 group-hover:text-blue-900">
              باز
            </span>
          </OliveButton>
        </div>
        <div className="mt-3 text-center">
          <p className="text-xs text-blue-600 font-medium">بيع الزيت</p>
          <p className="text-xs text-muted-foreground">إيصال سريع</p>
        </div>
      </div>
    </div>
  );
}
