import React from 'react';
import { X } from 'lucide-react';
import { MinimizedTicket } from '@/types/daily-work';

interface MinimizedTicketsBarProps {
  minimizedTickets: MinimizedTicket[];
  onMaximizeTicket: (ticketId: string) => void;
  onRemoveFromMinimized: (ticketId: string) => void;
}

export function MinimizedTicketsBar({
  minimizedTickets,
  onMaximizeTicket,
  onRemoveFromMinimized,
}: MinimizedTicketsBarProps) {
  if (minimizedTickets.length === 0) return null;

  return (
    <div className="fixed left-4 bottom-4 bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm border border-gray-200 dark:border-gray-700 p-3 z-40 rounded-lg shadow-lg max-h-[calc(100vh-8rem)] overflow-y-auto flex flex-col gap-2 min-w-[200px] max-w-[320px]">
      <div className="flex flex-col items-center gap-2 max-h-80 overflow-y-auto">
        <span className="text-sm font-medium text-gray-700 whitespace-nowrap rotate-90 transform origin-center mb-4">
          التذاكر المصغرة
        </span>
        {minimizedTickets.map((ticket) => (
          <div
            key={ticket.id}
            className={`group relative flex items-center gap-3 p-2.5 rounded-md border cursor-pointer transition-colors ${
              ticket.isMaximized
                ? 'bg-blue-50 dark:bg-blue-900/50 border-blue-300 dark:border-blue-700'
                : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
            onClick={() => onMaximizeTicket(ticket.id)}
          >
            <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-primary/10 dark:bg-primary/20 text-primary dark:text-primary-foreground">
              <span className="text-xs font-medium">#</span>
            </div>
            <div className="flex-1 min-w-0">
              <span
                className="text-sm font-medium text-gray-900 dark:text-gray-100 block truncate"
                title={ticket.clientName}
              >
                {ticket.clientName}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {ticket.weightIn} كيلو
              </span>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRemoveFromMinimized(ticket.id);
              }}
              className="opacity-0 group-hover:opacity-100 absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-200 hover:bg-red-200 dark:hover:bg-red-800 flex items-center justify-center transition-opacity"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
