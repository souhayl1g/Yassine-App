import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, TrendingUp, TrendingDown, Droplets, DollarSign } from 'lucide-react';
import { OliveCard } from '@/components/ui/olive-card';
import { OliveButton } from '@/components/ui/olive-button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { api } from '@/integrations/api/client';
// Remplacé: Supabase n'est plus utilisé ici. Les endpoints containers ne sont pas définis
// dans api_documentation.yaml actuel. On affiche un état temporaire et on évite tout appel réseau.

interface Container {
  id: string;
  label: string;
  capacity: number;
  currentWeight: number;
  buyPrice: number;
  sellPrice: number;
  lastUpdated: string;
}

interface ContainerContent {
  id: string;
  container_id: string;
  total_weight: number;
  value: number;
  currency: string;
  recorded_at: string;
}

interface OilTransactionForm {
  weight: number;
  pricePerKg: number;
  type: 'add' | 'sell';
  containerId: string;
}

export default function ContainersPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [containers, setContainers] = useState<Container[]>([]);
  const [containerContents, setContainerContents] = useState<ContainerContent[]>([]);
  const [selectedContainer, setSelectedContainer] = useState<Container | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newContainer, setNewContainer] = useState({ label: '', capacity: '' as unknown as number | string });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<OilTransactionForm>();

  const loadContainers = async () => {
    try {
      setIsLoading(true);
      const data = await api.get<any[]>(`/containers`);
      const mapped: Container[] = (data || []).map((c: any) => ({
        id: String(c.id),
        label: c.label,
        capacity: c.capacity,
        currentWeight: c.currentWeight || 0,
        buyPrice: c.buyPrice || 0,
        sellPrice: c.sellPrice || 0,
        lastUpdated: c.lastUpdated || new Date().toISOString(),
      }));
      setContainers(mapped);
    } catch (e) {
      // silent; page will show empty state
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadContainers();
  }, []);

  // Suppression de loadContainers (non utilisé sans endpoints)

  const handleOilTransaction = async (data: OilTransactionForm) => {
    try {
      const container = containers.find(c => c.id === selectedContainer?.id);
      if (!container) return;

      await api.post(`/containers/${container.id}/transactions`, {
        type: data.type,
        weight: data.weight,
        pricePerKg: data.pricePerKg,
      });
      await loadContainers();
      setIsDialogOpen(false);
      reset();
      toast({ title: t('common.success'), description: data.type === 'add' ? 'Oil added successfully' : 'Oil sold successfully' });
    } catch (error) {
      console.error('Error processing transaction:', error);
      toast({
        title: t('common.error'),
        description: 'Failed to process transaction',
        variant: 'destructive'
      });
    }
  };

  const handleCreateContainer = async () => {
    try {
      if (!String(newContainer.label).trim() || !newContainer.capacity) {
        toast({ variant: 'destructive', title: t('common.error'), description: t('validation.required') });
        return;
      }
      await api.post('/containers', {
        label: newContainer.label,
        capacity: parseInt(String(newContainer.capacity)),
      });
      setIsCreateOpen(false);
      setNewContainer({ label: '', capacity: '' as unknown as number | string });
      await loadContainers();
      toast({ title: t('common.success'), description: 'Container created successfully' });
    } catch (e: any) {
      toast({ variant: 'destructive', title: t('common.error'), description: e?.message || 'Failed to create container' });
    }
  };

  const calculateProfit = (container: Container) => {
    if (container.buyPrice === 0 || container.sellPrice === 0) return 0;
    return (container.sellPrice - container.buyPrice) * container.currentWeight;
  };

  const calculateProfitMargin = (container: Container) => {
    if (container.buyPrice === 0) return 0;
    return ((container.sellPrice - container.buyPrice) / container.buyPrice) * 100;
  };

  const getContainerStatus = (container: Container) => {
    if (container.currentWeight === 0) return 'فارغ';
    if (container.currentWeight >= container.capacity) return 'ممتلئ';
    return 'متوفر';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ممتلئ': return 'bg-red-100 text-red-800 border-red-200';
      case 'متوفر': return 'bg-green-100 text-green-800 border-green-200';
      case 'فارغ': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-muted animate-pulse rounded" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-64 bg-muted animate-pulse rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{t('containers.title')}</h1>
          <p className="text-muted-foreground mt-2">
            Manage oil containers and track inventory
          </p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <OliveButton className="gap-2">
              <Plus className="h-4 w-4" />
              {t('containers.addContainer')}
            </OliveButton>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('containers.addContainer')}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="containerLabel">{t('containers.label')}</Label>
                <Input id="containerLabel" value={newContainer.label} onChange={(e) => setNewContainer({ ...newContainer, label: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="containerCapacity">{t('containers.capacity')} ({t('common.kg')})</Label>
                <Input id="containerCapacity" type="number" value={newContainer.capacity as any} onChange={(e) => setNewContainer({ ...newContainer, capacity: e.target.value })} />
              </div>
              <div className="flex justify-end gap-2">
                <OliveButton variant="outline" onClick={() => setIsCreateOpen(false)}>{t('actions.cancel')}</OliveButton>
                <OliveButton onClick={handleCreateContainer}>{t('actions.save')}</OliveButton>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {containers.map((container) => {
          const status = getContainerStatus(container);
          const fillPercentage = (container.currentWeight / container.capacity) * 100;
          const profit = calculateProfit(container);
          const profitMargin = calculateProfitMargin(container);

          return (
            <OliveCard key={container.id} className="p-6 hover:shadow-lg transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-semibold text-foreground">
                    {container.label}
                  </h3>
                  <Badge className={`mt-2 ${getStatusColor(status)}`}>
                    {container.currentWeight === 0 ? 'فارغ' : container.currentWeight >= container.capacity ? 'ممتلئ' : 'متوفر'}
                  </Badge>
                </div>
                <div className="flex flex-col items-end">
                  <Droplets className="h-8 w-8 text-primary mb-1" />
                  <span className="text-xs text-muted-foreground">
                    {new Date(container.lastUpdated).toLocaleDateString('ar-TN')}
                  </span>
                </div>
              </div>

              {/* Capacity Bar */}
              <div className="mb-4">
                <div className="flex justify-between text-sm text-muted-foreground mb-1">
                  <span>{t('containers.currentWeight')}</span>
                  <span>{container.currentWeight} / {container.capacity} {t('common.kg')}</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div 
                    className="h-2 rounded-full bg-primary transition-all duration-300"
                    style={{ width: `${Math.min(fillPercentage, 100)}%` }}
                  />
                </div>
              </div>

              {/* Financial Info */}
              <div className="space-y-3 mb-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">سعر الشراء</span>
                  <span className="font-medium">{container.buyPrice.toFixed(3)} د.ت</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">سعر البيع</span>
                  <span className="font-medium">{container.sellPrice.toFixed(3)} د.ت</span>
                </div>

                {container.currentWeight > 0 && (
                  <>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">الربح المتوقع</span>
                      <div className="flex items-center">
                        {profit > 0 ? (
                          <TrendingUp className="h-4 w-4 text-success mr-1" />
                        ) : (
                          <TrendingDown className="h-4 w-4 text-error mr-1" />
                        )}
                        <span className={`font-medium ${profit > 0 ? 'text-success' : 'text-error'}`}>
                          {profit.toFixed(3)} د.ت
                        </span>
                      </div>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">نسبة الربح</span>
                      <span className={`font-medium ${profitMargin > 0 ? 'text-success' : 'text-error'}`}>
                        {profitMargin.toFixed(1)}%
                      </span>
                    </div>
                  </>
                )}

                <div className="flex justify-between items-center pt-2 border-t border-border">
                  <span className="text-sm text-muted-foreground">قيمة المخزون</span>
                  <span className="font-bold text-primary">
                    {(container.currentWeight * (container.buyPrice || 0)).toFixed(3)} د.ت
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-2">
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild>
                    <OliveButton 
                      size="sm" 
                      className="w-full"
                      variant="outline"
                      onClick={() => {
                        setSelectedContainer(container);
                        setIsDialogOpen(true);
                      }}
                    >
                      <Plus className="h-4 w-4 ml-2" />
                      إضافة زيت
                    </OliveButton>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>
                        {t('containers.addOil')} - {selectedContainer?.label}
                      </DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit((data) => handleOilTransaction({ ...data, type: 'add', containerId: selectedContainer!.id }))}>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="weight">وزن الزيت (كيلو)</Label>
                          <Input
                            id="weight"
                            type="number"
                            step="0.01"
                            dir="ltr"
                            className={errors.weight ? 'border-red-500' : ''}
                            {...register('weight', { 
                              required: true,
                              min: { value: 0.01, message: 'يجب أن يكون الوزن أكبر من صفر' },
                              validate: value => value <= selectedContainer?.capacity || 'تجاوز سعة الحاوية'
                            })}
                          />
                          {errors.weight && (
                            <p className="text-sm text-red-500 mt-1">
                              {errors.weight.message || 'هذا الحقل مطلوب'}
                            </p>
                          )}
                        </div>
                        <div>
                          <Label htmlFor="pricePerKg">السعر لكل كيلو (د.ت)</Label>
                          <Input
                            id="pricePerKg"
                            type="number"
                            step="0.001"
                            dir="ltr"
                            className={errors.pricePerKg ? 'border-red-500' : ''}
                            {...register('pricePerKg', { 
                              required: true,
                              min: { value: 0.001, message: 'يجب أن يكون السعر أكبر من صفر' }
                            })}
                          />
                          {errors.pricePerKg && (
                            <p className="text-sm text-red-500 mt-1">
                              {errors.pricePerKg.message || 'هذا الحقل مطلوب'}
                            </p>
                          )}
                        </div>
                        <div className="flex justify-end gap-2">
                          <OliveButton type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                            إلغاء
                          </OliveButton>
                          <OliveButton type="submit">
                            حفظ
                          </OliveButton>
                        </div>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>

                <Dialog>
                  <DialogTrigger asChild>
                    <OliveButton 
                      size="sm" 
                      variant="outline"
                      onClick={() => setSelectedContainer(container)}
                      disabled={container.currentWeight === 0}
                    >
                      <DollarSign className="h-4 w-4 mr-2" />
                      {t('containers.sellOil')}
                    </OliveButton>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>
                        {t('containers.sellOil')} - {selectedContainer?.label}
                      </DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit((data) => handleOilTransaction({ ...data, type: 'sell', containerId: selectedContainer!.id }))}>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="sellWeight">{t('containers.oilWeight')} ({t('common.kg')})</Label>
                          <Input
                            id="sellWeight"
                            type="number"
                            step="0.01"
                            max={selectedContainer?.currentWeight || 0}
                            {...register('weight', { required: true, min: 0.01, max: selectedContainer?.currentWeight || 0 })}
                          />
                          {errors.weight && (
                            <p className="text-sm text-error mt-1">{t('validation.required')}</p>
                          )}
                        </div>
                        <div>
                          <Label htmlFor="sellPricePerKg">{t('containers.pricePerKg')} ({t('common.currency')})</Label>
                          <Input
                            id="sellPricePerKg"
                            type="number"
                            step="0.01"
                            {...register('pricePerKg', { required: true, min: 0.01 })}
                          />
                          {errors.pricePerKg && (
                            <p className="text-sm text-error mt-1">{t('validation.required')}</p>
                          )}
                        </div>
                        <div className="flex justify-end space-x-2">
                          <OliveButton type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                            {t('actions.cancel')}
                          </OliveButton>
                          <OliveButton type="submit">
                            {t('actions.save')}
                          </OliveButton>
                        </div>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>

              <div className="text-xs text-muted-foreground mt-4 text-center">
                {t('containers.lastUpdated')}: {new Date(container.lastUpdated).toLocaleDateString()}
              </div>
            </OliveCard>
          );
        })}
      </div>

      {containers.length === 0 && (
        <div className="text-center py-12">
          <Droplets className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-foreground mb-2">{t('common.info')}</h3>
          <p className="text-muted-foreground">{t('common.noData')}</p>
        </div>
      )}
    </div>
  );
}