import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { OliveButton } from '@/components/ui/olive-button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { Client, NewTicketForm } from '@/types/daily-work';
import { getClientDisplayName } from '@/hooks/daily-work/utils';

interface AddTicketModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  newTicket: NewTicketForm;
  setNewTicket: React.Dispatch<React.SetStateAction<NewTicketForm>>;
  searchResults: Client[];
  selectedClient: Client | null;
  setSelectedClient: React.Dispatch<React.SetStateAction<Client | null>>;
  onAddTicket: () => Promise<void>;
  onCancel: () => void;
}

export function AddTicketModal({
  isOpen,
  onOpenChange,
  newTicket,
  setNewTicket,
  searchResults,
  selectedClient,
  setSelectedClient,
  onAddTicket,
  onCancel,
}: AddTicketModalProps) {
  const { t } = useTranslation();

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>إضافة تذكرة جديدة</DialogTitle>
          <DialogDescription>
            قم بملء البيانات المطلوبة لإنشاء تذكرة جديدة
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Client Name Search/Create */}
          <div className="space-y-2">
            <Label>بيانات العميل *</Label>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstname">الاسم الأول *</Label>
                <Input
                  id="firstname"
                  value={newTicket.firstname}
                  onChange={(e) =>
                    setNewTicket((prev) => ({ ...prev, firstname: e.target.value }))
                  }
                  placeholder="الاسم الأول"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastname">الاسم الأخير *</Label>
                <Input
                  id="lastname"
                  value={newTicket.lastname}
                  onChange={(e) =>
                    setNewTicket((prev) => ({ ...prev, lastname: e.target.value }))
                  }
                  placeholder="الاسم الأخير"
                />
              </div>
            </div>

            {/* Show search results */}
            {searchResults.length > 0 && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <Label className="text-sm font-medium text-blue-800">
                  عملاء موجودون:
                </Label>
                <div className="space-y-1 mt-2">
                  {searchResults.map((client) => (
                    <div
                      key={client.id}
                      className={`p-2 rounded cursor-pointer text-sm ${
                        selectedClient?.id === client.id
                          ? 'bg-blue-200 text-blue-900'
                          : 'bg-blue-100 text-blue-800 hover:bg-blue-150'
                      }`}
                      onClick={() => {
                        setSelectedClient(client);
                        setNewTicket((prev) => ({
                          ...prev,
                          firstname: client.firstname,
                          lastname: client.lastname,
                        }));
                      }}
                    >
                      {getClientDisplayName(client)}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Show selected client or new client message */}
            {selectedClient ? (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm text-green-800">
                    عميل موجود: {getClientDisplayName(selectedClient)}
                  </span>
                </div>
              </div>
            ) : newTicket.firstname || newTicket.lastname ? (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                  <span className="text-sm text-yellow-800">
                    عميل جديد سيتم إنشاؤه
                  </span>
                </div>
              </div>
            ) : null}
          </div>

          {/* Weight In */}
          <div className="space-y-2">
            <Label htmlFor="weightIn">الوزن الداخل (كيلو) *</Label>
            <Input
              id="weightIn"
              type="number"
              step="0.01"
              min="0"
              value={newTicket.weightIn}
              onChange={(e) =>
                setNewTicket((prev) => ({ ...prev, weightIn: e.target.value }))
              }
              placeholder="0.00"
            />
          </div>

          <div className="flex gap-2 pt-4">
            <OliveButton
              onClick={onAddTicket}
              className="flex-1"
              disabled={!newTicket.firstname || !newTicket.lastname}
            >
              حفظ التذكرة
            </OliveButton>
            <OliveButton
              variant="outline"
              onClick={onCancel}
              className="flex-1"
            >
              إلغاء
            </OliveButton>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
