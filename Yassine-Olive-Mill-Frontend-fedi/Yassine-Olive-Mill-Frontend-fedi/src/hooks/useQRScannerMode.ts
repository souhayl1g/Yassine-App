import { useState, useEffect } from 'react';

export type QRScannerMode = 'camera' | 'device';

const QR_SCANNER_MODE_KEY = 'qr-scanner-mode';

export const useQRScannerMode = () => {
  const [scannerMode, setScannerMode] = useState<QRScannerMode>(() => {
    // Load from localStorage on initialization
    const saved = localStorage.getItem(QR_SCANNER_MODE_KEY);
    return (saved as QRScannerMode) || 'camera';
  });

  // Save to localStorage whenever mode changes
  useEffect(() => {
    localStorage.setItem(QR_SCANNER_MODE_KEY, scannerMode);
  }, [scannerMode]);

  const toggleScannerMode = () => {
    setScannerMode(current => current === 'camera' ? 'device' : 'camera');
  };

  const isDeviceMode = scannerMode === 'device';
  const isCameraMode = scannerMode === 'camera';

  return {
    scannerMode,
    setScannerMode,
    toggleScannerMode,
    isDeviceMode,
    isCameraMode,
  };
};
