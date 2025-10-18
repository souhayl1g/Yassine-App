import React from 'react';
import { X, Printer, Minimize2 } from 'lucide-react';
import { OliveButton } from '@/components/ui/olive-button';
import { Ticket } from '@/types/daily-work';

interface PrintTicketModalProps {
  isOpen: boolean;
  ticket: Ticket | null;
  onPrint: () => void;
  onMinimize: (ticket: Ticket) => void;
  onClose: () => void;
}

export function PrintTicketModal({
  isOpen,
  ticket,
  onPrint,
  onMinimize,
  onClose,
}: PrintTicketModalProps) {
  if (!isOpen || !ticket) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-[#0F1729] rounded-lg p-6 w-full max-w-md shadow-lg relative text-white">
        <button 
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-200" 
          onClick={onClose}
        >
          <X className="h-5 w-5" />
        </button>

        <h2 className="text-2xl font-bold mb-6 text-[#22C55E] text-center">تذكرة معصرة الزيتون</h2>
        
        <div className="border border-gray-700 p-6 rounded-lg mb-6 bg-[#1D2839]">
          <div className="text-center mb-4">
            <div className="text-lg font-medium text-white">تذكرة رقم: {ticket.ticketNumber}</div>
            <div className="text-sm text-gray-400">{new Date(ticket.dateReceived).toLocaleDateString('ar-TN')}</div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="text-center p-3 bg-[#0F1729] rounded border border-gray-700">
              <div className="text-gray-300 mb-1">الوزن الداخل</div>
              <div className="text-white">{ticket.weightIn} كيلو</div>
            </div>
            <div className="text-center p-3 bg-[#0F1729] rounded border border-gray-700">
              <div className="text-gray-300 mb-1">الوزن الخارج</div>
              <div className="text-white">{ticket.weightOut || 'لم يتم الوزن'} كيلو</div>
            </div>
          </div>
          
          <div className="text-center mb-4 p-3 bg-[#0F1729] rounded border border-gray-700">
            <div className="text-gray-300 mb-1">اسم العميل</div>
            <div className="text-white">{ticket.clientName}</div>
          </div>
          
          {ticket.qrCode && (
            <div className="text-center mb-3">
              <img src={ticket.qrCode} alt="QR Code" className="w-32 h-32 mx-auto bg-white p-2 rounded" />
              <div className="text-sm text-gray-400 mt-2">مسح QR للإكمال</div>
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <OliveButton 
            onClick={onPrint}
            className="flex-1 bg-[#22C55E] hover:bg-[#22C55E]/90 text-white"
          >
            <Printer className="h-4 w-4 mr-2" />
            طباعة
          </OliveButton>
          <OliveButton 
            variant="outline" 
            onClick={() => onMinimize(ticket)}
            className="flex-1 border-gray-700 text-gray-300 hover:text-white hover:bg-gray-700"
          >
            <Minimize2 className="h-4 w-4 mr-2" />
            تصغير
          </OliveButton>
          <OliveButton 
            variant="outline" 
            onClick={onClose}
            className="flex-1 border-gray-700 text-gray-300 hover:text-white hover:bg-gray-700"
          >
            إغلاق
          </OliveButton>
        </div>
      </div>
    </div>
  );
}
