import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { OliveCard, OliveCardHeader, OliveCardContent, OliveCardTitle } from '@/components/ui/olive-card';
import { OliveButton } from '@/components/ui/olive-button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  Search, 
  Users, 
  Phone, 
  MapPin, 
  Edit2, 
  Trash2,
  UserPlus
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/integrations/api/client';

interface Client {
  id: number | string;
  firstname: string;
  lastname: string;
  phone: string;
  address?: string;
  createdAt?: string;
  type?: 'grower' | 'seller';
}

interface ClientsResponse {
  clients: Client[];
  pagination?: { total: number; page: number; pages: number };
}

export function ClientsPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [clients, setClients] = useState<Client[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    firstname: '',
    lastname: '',
    phone: '',
    address: '',
    type: 'grower' as 'grower' | 'seller',
  });

  const resetForm = () => {
    setFormData({
      firstname: '',
      lastname: '',
      phone: '',
      address: '',
      type: 'grower',
    });
  };

  const loadClients = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', '10');
      if (searchQuery.trim()) params.set('search', searchQuery.trim());
      const resp = await api.get<ClientsResponse>(`/clients?${params.toString()}`);
      const list = (resp.clients || []).map((c) => ({
        ...c,
        // fallback pour type si l'API ne le retourne pas
        type: (c as any).type || 'grower',
      }));
      setClients(list);
      setPages(resp.pagination?.pages || 1);
    } catch (e: any) {
      toast({ variant: 'destructive', title: t('common.error'), description: e?.message || 'Failed to load clients' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadClients();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  useEffect(() => {
    const id = setTimeout(() => {
      setPage(1);
      loadClients();
    }, 300);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  const handleAddClient = async () => {
    if (!formData.firstname || !formData.lastname || !formData.phone) {
      toast({
        variant: 'destructive',
        title: t('common.error'),
        description: t('validation.required'),
      });
      return;
    }
    try {
      await api.post('/clients', {
        firstname: formData.firstname,
        lastname: formData.lastname,
        phone: formData.phone,
        address: formData.address,
      });
      await loadClients();
      setIsAddDialogOpen(false);
      resetForm();
      toast({ title: t('common.success'), description: 'تم إضافة العميل بنجاح' });
    } catch (e: any) {
      toast({ variant: 'destructive', title: t('common.error'), description: e?.message || 'Failed to add client' });
    }
  };

  const handleEditClient = async () => {
    if (!editingClient || !formData.firstname || !formData.lastname || !formData.phone) {
      toast({
        variant: 'destructive',
        title: t('common.error'),
        description: t('validation.required'),
      });
      return;
    }
    try {
      await api.put(`/clients/${editingClient.id}`,[
        {
          firstname: formData.firstname,
          lastname: formData.lastname,
          phone: formData.phone,
          address: formData.address,
        }
      ] as any);
      // Certaines API acceptent un objet; si votre backend n'accepte pas un tableau, remplacez ci-dessus par un objet.
      await loadClients();
      setEditingClient(null);
      resetForm();
      toast({ title: t('common.success'), description: 'تم تحديث العميل بنجاح' });
    } catch (e: any) {
      toast({ variant: 'destructive', title: t('common.error'), description: e?.message || 'Failed to update client' });
    }
  };

  const handleDeleteClient = async (clientId: string | number) => {
    try {
      await api.delete(`/clients/${clientId}`);
      await loadClients();
      toast({ title: t('common.success'), description: 'تم حذف العميل بنجاح' });
    } catch (e: any) {
      toast({ variant: 'destructive', title: t('common.error'), description: e?.message || 'Failed to delete client' });
    }
  };

  const openEditDialog = (client: Client) => {
    setEditingClient(client);
    setFormData({
      firstname: client.firstname,
      lastname: client.lastname,
      phone: client.phone,
      address: client.address || '',
      type: client.type,
    });
  };

  const filteredClients = clients.filter(client => {
    const matchesSearch = 
      client.firstname.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.lastname.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.phone.includes(searchQuery);
    
    const matchesType = typeFilter === 'all' || client.type === typeFilter;
    
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-4xl font-bold text-foreground">
            {t('clients.title')}
          </h1>
          <p className="text-lg text-muted-foreground mt-2">
            إدارة عملاء المعصرة وبياناتهم
          </p>
        </div>

        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <OliveButton size="lg" className="gap-2">
              <Plus className="h-5 w-5" />
              {t('clients.addClient')}
            </OliveButton>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{t('clients.addClient')}</DialogTitle>
            </DialogHeader>
            <ClientForm
              formData={formData}
              setFormData={setFormData}
              onSubmit={handleAddClient}
              onCancel={() => {
                setIsAddDialogOpen(false);
                resetForm();
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <OliveCard>
        <OliveCardContent className="p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <div className="flex-1 relative">
              <Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="البحث بالاسم أو رقم الهاتف..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="olive-input pr-10"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الأنواع</SelectItem>
                <SelectItem value="grower">{t('clients.grower')}</SelectItem>
                <SelectItem value="seller">{t('clients.seller')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </OliveCardContent>
      </OliveCard>

      {/* Clients Grid */}
      {isLoading ? (
        <OliveCard>
          <OliveCardContent className="py-12">
            <div className="h-6 bg-muted animate-pulse rounded mb-4" />
            <div className="h-6 bg-muted animate-pulse rounded w-1/2" />
          </OliveCardContent>
        </OliveCard>
      ) : filteredClients.length === 0 ? (
        <OliveCard>
          <OliveCardContent className="flex flex-col items-center justify-center py-12">
            <Users className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">{t('clients.noClients')}</h3>
            <p className="text-muted-foreground mb-6 text-center">
              ابدأ بإضافة عملاء جدد لإدارة أعمالك
            </p>
            <OliveButton onClick={() => setIsAddDialogOpen(true)} className="gap-2">
              <UserPlus className="h-5 w-5" />
              إضافة أول عميل
            </OliveButton>
          </OliveCardContent>
        </OliveCard>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredClients.map((client) => (
            <OliveCard key={client.id} className="hover:shadow-lg transition-shadow">
              <OliveCardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <OliveCardTitle className="text-lg">
                      {client.firstname} {client.lastname}
                    </OliveCardTitle>
                    {client.type && (
                      <Badge 
                        variant={client.type === 'grower' ? 'default' : 'secondary'}
                        className="w-fit"
                      >
                        {t(`clients.${client.type}`)}
                      </Badge>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <OliveButton
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditDialog(client)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </OliveButton>
                    <OliveButton
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteClient(client.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </OliveButton>
                  </div>
                </div>
              </OliveCardHeader>
              <OliveCardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{client.phone}</span>
                </div>
                {client.address && (
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className="truncate">{client.address}</span>
                  </div>
                )}
                <div className="text-xs text-muted-foreground">
                  تاريخ التسجيل: {client.createdAt ? new Date(client.createdAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'numeric',
                    day: 'numeric'
                  }) : '-'}
                </div>
              </OliveCardContent>
            </OliveCard>
          ))}
        </div>
      )}

      {/* Pagination */}
      <div className="flex justify-center items-center gap-3">
        <OliveButton variant="outline" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
          {t('pagination.previous')}
        </OliveButton>
        <span className="text-sm text-muted-foreground">{page} / {pages}</span>
        <OliveButton variant="outline" disabled={page >= pages} onClick={() => setPage((p) => Math.min(pages, p + 1))}>
          {t('pagination.next')}
        </OliveButton>
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editingClient} onOpenChange={(open) => !open && setEditingClient(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('clients.editClient')}</DialogTitle>
          </DialogHeader>
          <ClientForm
            formData={formData}
            setFormData={setFormData}
            onSubmit={handleEditClient}
            onCancel={() => {
              setEditingClient(null);
              resetForm();
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface ClientFormProps {
  formData: any;
  setFormData: (data: any) => void;
  onSubmit: () => void;
  onCancel: () => void;
}

function ClientForm({ formData, setFormData, onSubmit, onCancel }: ClientFormProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="firstname">{t('clients.firstname')}</Label>
          <Input
            id="firstname"
            value={formData.firstname}
            onChange={(e) => setFormData({ ...formData, firstname: e.target.value })}
            className="olive-input"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="lastname">{t('clients.lastname')}</Label>
          <Input
            id="lastname"
            value={formData.lastname}
            onChange={(e) => setFormData({ ...formData, lastname: e.target.value })}
            className="olive-input"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="phone">{t('clients.phone')}</Label>
        <Input
          id="phone"
          type="tel"
          value={formData.phone}
          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          className="olive-input"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="type">{t('clients.type')}</Label>
        <Select 
          value={formData.type} 
          onValueChange={(value) => setFormData({ ...formData, type: value })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="grower">{t('clients.grower')}</SelectItem>
            <SelectItem value="seller">{t('clients.seller')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="address">{t('clients.address')}</Label>
        <Input
          id="address"
          value={formData.address}
          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
          className="olive-input"
        />
      </div>

      <div className="flex gap-2 pt-4">
        <OliveButton onClick={onSubmit} className="flex-1">
          {t('actions.save')}
        </OliveButton>
        <OliveButton variant="outline" onClick={onCancel} className="flex-1">
          {t('actions.cancel')}
        </OliveButton>
      </div>
    </div>
  );
}