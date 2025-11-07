import { useState } from 'react';
import { api } from '@/integrations/api/client';
import { toast } from 'sonner';

// Get printer settings from localStorage
const getPrinterSettings = () => {
  const saved = localStorage.getItem('printerSettings');
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {
      console.error('Failed to parse printer settings:', e);
    }
  }
  return {
    printerIP: '192.168.1.81',
    port: 9100,
    enabled: false
  };
};

// Save printer settings to localStorage
const savePrinterSettings = (settings: any) => {
  localStorage.setItem('printerSettings', JSON.stringify(settings));
};

export interface PrinterSettings {
  printerIP: string;
  port: number;
  enabled: boolean;
}

export const useThermalPrinter = () => {
  const [settings, setSettingsState] = useState<PrinterSettings>(getPrinterSettings());
  const [isLoading, setIsLoading] = useState(false);

  const updateSettings = (newSettings: Partial<PrinterSettings>) => {
    const updated = { ...settings, ...newSettings };
    setSettingsState(updated);
    savePrinterSettings(updated);
  };

  /**
   * Test printer connection
   */
  const testConnection = async () => {
    if (!settings.printerIP) {
      toast.error('Please enter a printer IP address');
      return false;
    }

    setIsLoading(true);
    try {
      const response = await api.post('/printer/test', {
        printerIP: settings.printerIP,
        port: settings.port
      }) as any;

      if (response?.success) {
        toast.success('Printer test successful! Check the printed receipt.');
        return true;
      } else {
        toast.error(response?.message || 'Failed to connect to printer');
        return false;
      }
    } catch (error: any) {
      console.error('Printer test error:', error);
      toast.error(error.response?.data?.message || 'Failed to connect to printer');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Print arrival receipt
   */
  const printArrivalReceipt = async (ticket: any) => {
    if (!settings.enabled) {
      console.log('Thermal printing disabled, skipping...');
      return false;
    }

    setIsLoading(true);
    try {
      const response = await api.post('/printer/receipt', {
        printerIP: settings.printerIP,
        port: settings.port,
        receiptType: 'arrival',
        receiptData: {
          id: ticket.id,
          ticketNumber: ticket.ticketNumber,
          clientName: ticket.clientName,
          operationType: ticket.operationType,
          weightIn: ticket.weightIn,
          numberOfBidons: ticket.numberOfBidons || 0,
          numberOfBoxes: ticket.numberOfBoxes || 0,
          dateReceived: ticket.dateReceived
        }
      }) as any;

      if (response?.success) {
        toast.success('Receipt printed successfully!');
        return true;
      } else {
        toast.error(response?.message || 'Failed to print receipt');
        return false;
      }
    } catch (error: any) {
      console.error('Print error:', error);
      toast.error(error.response?.data?.message || 'Failed to print receipt');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Print exit receipt
   */
  const printExitReceipt = async (ticket: any, priceData?: any) => {
    if (!settings.enabled) {
      console.log('Thermal printing disabled, skipping...');
      return false;
    }

    setIsLoading(true);
    try {
      // Calculate values
      const weightIn = ticket.weightIn || 0;
      const weightOut = ticket.weightOut || 0;
      const netWeight = weightIn - weightOut;
      const unitPrice = ticket.unitPrice || 0;
      const baseAmount = netWeight * unitPrice;
      
      // Calculate bidon costs
      const numberOfBidons = ticket.numberOfBidons || 0;
      let additionalBidons = 0;
      
      if (ticket.operationType === 'milling') {
        const bidonsProduced = ticket.numberOfBidonsProduced || 0;
        additionalBidons = Math.max(0, bidonsProduced - numberOfBidons);
      } else {
        additionalBidons = numberOfBidons;
      }
      
      const emptyBidonPrice = priceData?.emptyBidonPrice || 0;
      const bidonCost = additionalBidons * emptyBidonPrice;
      const totalAmount = ticket.totalAmount || (baseAmount + bidonCost);

      const response = await api.post('/printer/receipt', {
        printerIP: settings.printerIP,
        port: settings.port,
        receiptType: 'exit',
        receiptData: {
          id: ticket.id,
          ticketNumber: ticket.ticketNumber,
          clientName: ticket.clientName,
          operationType: ticket.operationType,
          weightIn,
          weightOut,
          netWeight,
          unitPrice,
          baseAmount,
          numberOfBidons,
          additionalBidons,
          bidonCost,
          totalAmount,
          isPaid: ticket.isPaid
        }
      }) as any;

      if (response?.success) {
        toast.success('Receipt printed successfully!');
        return true;
      } else {
        toast.error(response?.message || 'Failed to print receipt');
        return false;
      }
    } catch (error: any) {
      console.error('Print error:', error);
      toast.error(error.response?.data?.message || 'Failed to print receipt');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Print custom receipt
   */
  const printCustomReceipt = async (receiptData: any, receiptType = 'general') => {
    if (!settings.enabled) {
      console.log('Thermal printing disabled, skipping...');
      return false;
    }

    setIsLoading(true);
    try {
      const response = await api.post('/printer/receipt', {
        printerIP: settings.printerIP,
        port: settings.port,
        receiptType,
        receiptData
      }) as any;

      if (response?.success) {
        toast.success('Printed successfully!');
        return true;
      } else {
        toast.error(response?.message || 'Failed to print');
        return false;
      }
    } catch (error: any) {
      console.error('Print error:', error);
      toast.error(error.response?.data?.message || 'Failed to print');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Print raw text
   */
  const printRawText = async (text: string) => {
    if (!settings.enabled) {
      console.log('Thermal printing disabled, skipping...');
      return false;
    }

    setIsLoading(true);
    try {
      const response = await api.post('/printer/raw', {
        printerIP: settings.printerIP,
        port: settings.port,
        text
      }) as any;

      if (response?.success) {
        toast.success('Text printed successfully!');
        return true;
      } else {
        toast.error(response?.message || 'Failed to print text');
        return false;
      }
    } catch (error: any) {
      console.error('Print error:', error);
      toast.error(error.response?.data?.message || 'Failed to print text');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    settings,
    updateSettings,
    isLoading,
    testConnection,
    printArrivalReceipt,
    printExitReceipt,
    printCustomReceipt,
    printRawText
  };
};
