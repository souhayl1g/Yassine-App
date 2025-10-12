import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { OliveCard, OliveCardHeader, OliveCardContent, OliveCardTitle } from '@/components/ui/olive-card';
import { OliveButton } from '@/components/ui/olive-button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { 
  Settings, 
  User, 
  DollarSign, 
  Palette, 
  Globe, 
  Building, 
  Printer,
  Save,
  Plus,
  Edit2,
  Trash2,
  Loader
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/integrations/api/client';

interface UserProfile {
  firstname: string;
  lastname: string;
  phone: string;
  email: string;
}

interface CompanySettings {
  name: string;
  address: string;
  phone: string;
  email: string;
  logo?: string;
}

interface PricingSettings {
  millingPricePerKg: number;
  oilClientSellingPricePerKg: number;
  oilExportSellingPricePerKg: number;
  oliveBuyingPricePerKg: number;
  emptyBidonPrice: number;
  currency: string;
}

export function SettingsPage() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { toast } = useToast();

  const [userProfile, setUserProfile] = useState<UserProfile>({
    firstname: user?.firstname || '',
    lastname: user?.lastname || '',
    phone: user?.phone || '',
    email: user?.email || '',
  });

  const [companySettings, setCompanySettings] = useState<CompanySettings>({
    name: 'معصرة الزيتون النموذجية',
    address: 'جلمة سيدي بوزيد تونس',
    phone: '+966501234567',
    email: 'info@olivemill.com',
  });

  const [pricingSettings, setPricingSettings] = useState<PricingSettings>({
    millingPricePerKg: 0,
    oilClientSellingPricePerKg: 0,
    oilExportSellingPricePerKg: 0,
    oliveBuyingPricePerKg: 0,
    emptyBidonPrice: 0,
    currency: 'TND',
  });

  const [printSettings, setPrintSettings] = useState({
    printQRCode: true,
    printClientCopy: true,
    printA4Format: true,
    print80mmFormat: false,
    includeCompanyLogo: true,
  });

  const [loadingPrices, setLoadingPrices] = useState(false);
  const [savingPrices, setSavingPrices] = useState(false);

  // Load current prices on component mount
  useEffect(() => {
    loadCurrentPrices();
  }, []);

  const loadCurrentPrices = async () => {
    try {
      setLoadingPrices(true);
      const response = await api.get('/prices?latest=true');
      
      // Handle the response data properly
      if (response && typeof response === 'object' && response !== null) {
        setPricingSettings({
          millingPricePerKg: (response as any).milling_price_per_kg || 0,
          oilClientSellingPricePerKg: (response as any).oil_client_selling_price_per_kg || 0,
          oilExportSellingPricePerKg: (response as any).oil_export_selling_price_per_kg || 0,
          oliveBuyingPricePerKg: (response as any).olive_buying_price_per_kg || 0,
          emptyBidonPrice: (response as any).empty_bidon_price || 0,
          currency: 'TND',
        });
      } else {
        // If no response or null, set all to 0
        setPricingSettings({
          millingPricePerKg: 0,
          oilClientSellingPricePerKg: 0,
          oilExportSellingPricePerKg: 0,
          oliveBuyingPricePerKg: 0,
          emptyBidonPrice: 0,
          currency: 'TND',
        });
      }
    } catch (error) {
      console.error('Error loading prices:', error);
      // Set all prices to 0 if fetch fails
      setPricingSettings({
        millingPricePerKg: 0,
        oilClientSellingPricePerKg: 0,
        oilExportSellingPricePerKg: 0,
        oliveBuyingPricePerKg: 0,
        emptyBidonPrice: 0,
        currency: 'TND',
      });
      toast({
        title: 'خطأ',
        description: 'فشل في تحميل الأسعار الحالية، تم تعيين القيم الافتراضية',
        variant: 'destructive',
      });
    } finally {
      setLoadingPrices(false);
    }
  };

  const handleSaveProfile = () => {
    toast({
      title: t('common.success'),
      description: 'تم حفظ الملف الشخصي بنجاح',
    });
  };

  const handleSaveCompany = () => {
    toast({
      title: t('common.success'),
      description: 'تم حفظ معلومات الشركة بنجاح',
    });
  };

  const handleSavePricing = async () => {
    try {
      setSavingPrices(true);
      
      // Validate that at least one price is set
      const hasValidPrice = pricingSettings.millingPricePerKg > 0 || 
                           pricingSettings.oilClientSellingPricePerKg > 0 || 
                           pricingSettings.oilExportSellingPricePerKg > 0 || 
                           pricingSettings.oliveBuyingPricePerKg > 0 ||
                           pricingSettings.emptyBidonPrice > 0;

      if (!hasValidPrice) {
        toast({
          title: 'تنبيه',
          description: 'يرجى إدخال سعر واحد على الأقل',
          variant: 'destructive',
        });
        return;
      }
      
      // Create new price record with current settings
      const priceData = {
        milling_price_per_kg: pricingSettings.millingPricePerKg,
        oil_client_selling_price_per_kg: pricingSettings.oilClientSellingPricePerKg,
        oil_export_selling_price_per_kg: pricingSettings.oilExportSellingPricePerKg,
        olive_buying_price_per_kg: pricingSettings.oliveBuyingPricePerKg,
        empty_bidon_price: pricingSettings.emptyBidonPrice,
      };

      await api.post('/prices', priceData);
      
      toast({
        title: t('common.success'),
        description: 'تم حفظ إعدادات التسعير بنجاح وإنشاء سجل أسعار جديد',
      });

      // Reload prices to get the latest data
      await loadCurrentPrices();
    } catch (error: any) {
      console.error('Error saving prices:', error);
      const errorMessage = error?.message || 'فشل في حفظ إعدادات التسعير';
      toast({
        title: 'خطأ',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setSavingPrices(false);
    }
  };

  const handleSavePrint = () => {
    toast({
      title: t('common.success'),
      description: 'تم حفظ إعدادات الطباعة بنجاح',
    });
  };

  if (user?.role !== 'admin') {
    return (
      <div className="space-y-8">
        <div className="text-center py-12">
          <Settings className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">غير مصرح</h3>
          <p className="text-muted-foreground">
            تحتاج إلى صلاحيات الإدارة للوصول إلى هذه الصفحة
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-4xl font-bold text-foreground">
          {t('settings.title')}
        </h1>
        <p className="text-lg text-muted-foreground mt-2">
          إدارة إعدادات النظام والتفضيلات
        </p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="profile" className="gap-2">
            <User className="h-4 w-4" />
            الملف الشخصي
          </TabsTrigger>
          <TabsTrigger value="pricing" className="gap-2">
            <DollarSign className="h-4 w-4" />
            التسعير
          </TabsTrigger>
          <TabsTrigger value="company" className="gap-2">
            <Building className="h-4 w-4" />
            الشركة
          </TabsTrigger>
          <TabsTrigger value="print" className="gap-2">
            <Printer className="h-4 w-4" />
            الطباعة
          </TabsTrigger>
          <TabsTrigger value="appearance" className="gap-2">
            <Palette className="h-4 w-4" />
            المظهر
          </TabsTrigger>
        </TabsList>

        {/* Profile Settings */}
        <TabsContent value="profile">
          <OliveCard>
            <OliveCardHeader>
              <OliveCardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                {t('settings.profile')}
              </OliveCardTitle>
            </OliveCardHeader>
            <OliveCardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstname">الاسم الأول</Label>
                  <Input
                    id="firstname"
                    value={userProfile.firstname}
                    onChange={(e) => setUserProfile({...userProfile, firstname: e.target.value})}
                    className="olive-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastname">اسم العائلة</Label>
                  <Input
                    id="lastname"
                    value={userProfile.lastname}
                    onChange={(e) => setUserProfile({...userProfile, lastname: e.target.value})}
                    className="olive-input"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">البريد الإلكتروني</Label>
                <Input
                  id="email"
                  type="email"
                  value={userProfile.email}
                  onChange={(e) => setUserProfile({...userProfile, email: e.target.value})}
                  className="olive-input"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">رقم الهاتف</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={userProfile.phone}
                  onChange={(e) => setUserProfile({...userProfile, phone: e.target.value})}
                  className="olive-input"
                />
              </div>

              <OliveButton onClick={handleSaveProfile} className="gap-2">
                <Save className="h-4 w-4" />
                {t('actions.save')}
              </OliveButton>
            </OliveCardContent>
          </OliveCard>
        </TabsContent>

        {/* Pricing Settings */}
        <TabsContent value="pricing">
          <OliveCard>
            <OliveCardHeader>
              <OliveCardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                {t('settings.pricing')}
                {loadingPrices && <Loader className="h-4 w-4 animate-spin" />}
              </OliveCardTitle>
            </OliveCardHeader>
            <OliveCardContent className="space-y-4">
              {loadingPrices ? (
                <div className="flex items-center justify-center py-8">
                  <Loader className="h-8 w-8 animate-spin" />
                  <span className="mr-2">جاري تحميل الأسعار الحالية...</span>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>سعر العصر لكل كيلو</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={pricingSettings.millingPricePerKg}
                        onChange={(e) => setPricingSettings({
                          ...pricingSettings, 
                          millingPricePerKg: parseFloat(e.target.value) || 0
                        })}
                        className="olive-input"
                        disabled={savingPrices}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>سعر بيع الزيت للعملاء لكل كيلو</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={pricingSettings.oilClientSellingPricePerKg}
                        onChange={(e) => setPricingSettings({
                          ...pricingSettings, 
                          oilClientSellingPricePerKg: parseFloat(e.target.value) || 0
                        })}
                        className="olive-input"
                        disabled={savingPrices}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>سعر بيع الزيت للتصدير لكل كيلو</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={pricingSettings.oilExportSellingPricePerKg}
                        onChange={(e) => setPricingSettings({
                          ...pricingSettings, 
                          oilExportSellingPricePerKg: parseFloat(e.target.value) || 0
                        })}
                        className="olive-input"
                        disabled={savingPrices}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>سعر شراء الزيتون لكل كيلو</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={pricingSettings.oliveBuyingPricePerKg}
                        onChange={(e) => setPricingSettings({
                          ...pricingSettings, 
                          oliveBuyingPricePerKg: parseFloat(e.target.value) || 0
                        })}
                        className="olive-input"
                        disabled={savingPrices}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>سعر البيدون الفارغ</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={pricingSettings.emptyBidonPrice}
                        onChange={(e) => setPricingSettings({
                          ...pricingSettings, 
                          emptyBidonPrice: parseFloat(e.target.value) || 0
                        })}
                        className="olive-input"
                        disabled={savingPrices}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>العملة</Label>
                    <Select 
                      value={pricingSettings.currency} 
                      onValueChange={(value) => setPricingSettings({...pricingSettings, currency: value})}
                      disabled={savingPrices}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="TND">دينار تونسي (TND)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex flex-col gap-2">
                    <OliveButton 
                      onClick={handleSavePricing} 
                      className="gap-2"
                      disabled={savingPrices}
                    >
                      {savingPrices ? (
                        <>
                          <Loader className="h-4 w-4 animate-spin" />
                          جاري الحفظ...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4" />
                          {t('actions.save')}
                        </>
                      )}
                    </OliveButton>
                    <p className="text-sm text-muted-foreground">
                      سيتم إنشاء سجل أسعار جديد في قاعدة البيانات عند الحفظ
                    </p>
                  </div>
                </>
              )}
            </OliveCardContent>
          </OliveCard>
        </TabsContent>

        {/* Company Settings */}
        <TabsContent value="company">
          <OliveCard>
            <OliveCardHeader>
              <OliveCardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5" />
                {t('settings.company')}
              </OliveCardTitle>
            </OliveCardHeader>
            <OliveCardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="company-name">اسم الشركة</Label>
                <Input
                  id="company-name"
                  value={companySettings.name}
                  onChange={(e) => setCompanySettings({...companySettings, name: e.target.value})}
                  className="olive-input"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="company-address">العنوان</Label>
                <Textarea
                  id="company-address"
                  value={companySettings.address}
                  onChange={(e) => setCompanySettings({...companySettings, address: e.target.value})}
                  className="olive-input min-h-[100px]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="company-phone">رقم الهاتف</Label>
                  <Input
                    id="company-phone"
                    type="tel"
                    value={companySettings.phone}
                    onChange={(e) => setCompanySettings({...companySettings, phone: e.target.value})}
                    className="olive-input"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="company-email">البريد الإلكتروني</Label>
                  <Input
                    id="company-email"
                    type="email"
                    value={companySettings.email}
                    onChange={(e) => setCompanySettings({...companySettings, email: e.target.value})}
                    className="olive-input"
                  />
                </div>
              </div>

              <OliveButton onClick={handleSaveCompany} className="gap-2">
                <Save className="h-4 w-4" />
                {t('actions.save')}
              </OliveButton>
            </OliveCardContent>
          </OliveCard>
        </TabsContent>

        {/* Print Settings */}
        <TabsContent value="print">
          <OliveCard>
            <OliveCardHeader>
              <OliveCardTitle className="flex items-center gap-2">
                <Printer className="h-5 w-5" />
                {t('settings.print')}
              </OliveCardTitle>
            </OliveCardHeader>
            <OliveCardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="print-qr">طباعة رمز QR</Label>
                    <p className="text-sm text-muted-foreground">
                      إضافة رمز QR على التذاكر المطبوعة
                    </p>
                  </div>
                  <Switch
                    id="print-qr"
                    checked={printSettings.printQRCode}
                    onCheckedChange={(checked) => setPrintSettings({...printSettings, printQRCode: checked})}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="print-client-copy">نسخة العميل</Label>
                    <p className="text-sm text-muted-foreground">
                      طباعة نسخة إضافية للعميل
                    </p>
                  </div>
                  <Switch
                    id="print-client-copy"
                    checked={printSettings.printClientCopy}
                    onCheckedChange={(checked) => setPrintSettings({...printSettings, printClientCopy: checked})}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="print-a4">تنسيق A4</Label>
                    <p className="text-sm text-muted-foreground">
                      استخدام تنسيق A4 للطباعة
                    </p>
                  </div>
                  <Switch
                    id="print-a4"
                    checked={printSettings.printA4Format}
                    onCheckedChange={(checked) => setPrintSettings({...printSettings, printA4Format: checked})}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="print-80mm">تنسيق 80mm</Label>
                    <p className="text-sm text-muted-foreground">
                      استخدام تنسيق 80mm للإيصالات
                    </p>
                  </div>
                  <Switch
                    id="print-80mm"
                    checked={printSettings.print80mmFormat}
                    onCheckedChange={(checked) => setPrintSettings({...printSettings, print80mmFormat: checked})}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="include-logo">شعار الشركة</Label>
                    <p className="text-sm text-muted-foreground">
                      إضافة شعار الشركة على المطبوعات
                    </p>
                  </div>
                  <Switch
                    id="include-logo"
                    checked={printSettings.includeCompanyLogo}
                    onCheckedChange={(checked) => setPrintSettings({...printSettings, includeCompanyLogo: checked})}
                  />
                </div>
              </div>

              <OliveButton onClick={handleSavePrint} className="gap-2">
                <Save className="h-4 w-4" />
                {t('actions.save')}
              </OliveButton>
            </OliveCardContent>
          </OliveCard>
        </TabsContent>

        {/* Appearance Settings */}
        <TabsContent value="appearance">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <OliveCard>
              <OliveCardHeader>
                <OliveCardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  {t('settings.language')}
                </OliveCardTitle>
              </OliveCardHeader>
              <OliveCardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>اللغة الحالية</Label>
                  <Select value={i18n.language} onValueChange={(lang) => i18n.changeLanguage(lang)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ar">🇸🇦 العربية</SelectItem>
                      <SelectItem value="en">🇺🇸 English</SelectItem>
                      <SelectItem value="fr">🇫🇷 Français</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </OliveCardContent>
            </OliveCard>

            <OliveCard>
              <OliveCardHeader>
                <OliveCardTitle className="flex items-center gap-2">
                  <Palette className="h-5 w-5" />
                  {t('settings.theme')}
                </OliveCardTitle>
              </OliveCardHeader>
              <OliveCardContent className="space-y-4">
                <div className="text-center py-4">
                  <p className="text-muted-foreground">
                    إعدادات المظهر والألوان قيد التطوير
                  </p>
                </div>
              </OliveCardContent>
            </OliveCard>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}