import React from 'react';
import { Settings, Printer, Wifi } from 'lucide-react';
import { OliveButton } from '@/components/ui/olive-button';
import { useThermalPrinter } from '@/hooks/useThermalPrinter';

export function PrinterSettings() {
  const { settings, updateSettings, testConnection, isLoading } = useThermalPrinter();

  const handleTest = async () => {
    await testConnection();
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-3 rounded-lg">
          <Printer className="h-6 w-6 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">إعدادات الطابعة الحرارية</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">Epson TM-T20X Thermal Printer</p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Enable/Disable Printing */}
        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <div className="flex items-center gap-3">
            <Wifi className="h-5 w-5 text-gray-600 dark:text-gray-300" />
            <div>
              <p className="font-semibold text-gray-900 dark:text-white">تفعيل الطباعة التلقائية</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Enable automatic thermal printing</p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.enabled}
              onChange={(e) => updateSettings({ enabled: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
          </label>
        </div>

        {/* Printer IP Address */}
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
            عنوان IP للطابعة
            <span className="text-gray-500 text-xs ml-2">(Printer IP Address)</span>
          </label>
          <input
            type="text"
            value={settings.printerIP}
            onChange={(e) => updateSettings({ printerIP: e.target.value })}
            placeholder="192.168.1.81"
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            dir="ltr"
          />
          <p className="text-xs text-gray-500 dark:text-gray-400">
            أدخل عنوان IP الخاص بالطابعة على الشبكة المحلية
          </p>
        </div>

        {/* Port Number */}
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
            رقم المنفذ
            <span className="text-gray-500 text-xs ml-2">(Port Number)</span>
          </label>
          <input
            type="number"
            value={settings.port}
            onChange={(e) => updateSettings({ port: parseInt(e.target.value) || 9100 })}
            placeholder="9100"
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            dir="ltr"
          />
          <p className="text-xs text-gray-500 dark:text-gray-400">
            المنفذ الافتراضي للطابعة هو 9100
          </p>
        </div>

        {/* Test Connection Button */}
        <OliveButton
          onClick={handleTest}
          disabled={isLoading || !settings.printerIP}
          className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white"
        >
          {isLoading ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
              جاري الاختبار...
            </>
          ) : (
            <>
              <Printer className="h-5 w-5 mr-2" />
              اختبار الاتصال والطباعة
            </>
          )}
        </OliveButton>

        {/* Info Box */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2 flex items-center gap-2">
            <Settings className="h-4 w-4" />
            معلومات مهمة
          </h3>
          <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1 list-disc list-inside">
            <li>تأكد من توصيل الطابعة بنفس الشبكة المحلية</li>
            <li>يمكنك معرفة عنوان IP من إعدادات الطابعة</li>
            <li>بعد تفعيل الطباعة، سيتم طباعة الإيصالات تلقائياً</li>
            <li>استخدم زر الاختبار للتأكد من عمل الطابعة</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
