import React, { useEffect, useState, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { QrCode } from 'lucide-react';

interface DeviceQRScannerProps {
  onScan: (qrData: string) => void;
  isActive: boolean;
  placeholder?: string;
}

export function DeviceQRScanner({ onScan, isActive, placeholder = "امسح رمز QR باستخدام الماسح الضوئي..." }: DeviceQRScannerProps) {
  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!isActive) {
      setIsListening(false);
      return;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      // Focus the hidden input when scanning starts
      if (inputRef.current && document.activeElement !== inputRef.current) {
        inputRef.current.focus();
      }

      // Clear any existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Always in listening state while active
      setIsListening(true);

      // Set timeout to finish scanning (barcode scanners are very fast)
      timeoutRef.current = setTimeout(() => {
        if (input.trim()) {
          onScan(input.trim());
          setInput('');
          toast({
            title: 'تم المسح بنجاح',
            description: 'تم قراءة رمز QR بواسطة الماسح الضوئي',
          });
        }
        // Keep listening for the next scan immediately
        setIsListening(true);
  }, 50); // Ultra-short timeout for faster scanner confirmation
    };

    const handleInput = (e: Event) => {
      const target = e.target as HTMLInputElement;
      setInput(target.value);
    };

    // Listen for keyboard events globally
    document.addEventListener('keydown', handleKeyDown);
    
    // Listen for input changes on the hidden input
    if (inputRef.current) {
      inputRef.current.addEventListener('input', handleInput);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      if (inputRef.current) {
        inputRef.current.removeEventListener('input', handleInput);
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [isActive, input, isListening, onScan, toast]);

  // Auto-focus and set listening when component becomes active
  useEffect(() => {
    if (isActive && inputRef.current) {
      inputRef.current.focus();
      setIsListening(true);
    }
  }, [isActive]);

  if (!isActive) return null;

  return (
    <div className="flex flex-col items-center p-8 bg-gradient-to-br from-blue-50 to-green-50 border-2 border-dashed border-blue-300 rounded-lg">
      {/* Hidden input for capturing scanner data */}
      <input
        ref={inputRef}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        className="opacity-0 absolute -z-10"
        autoComplete="off"
        tabIndex={-1}
      />
      
      {/* Scanner icon and status */}
      <div className={`p-5 rounded-full mb-4 ${isActive ? 'bg-green-100 animate-pulse' : 'bg-blue-100'}`}>
        <QrCode className={`h-10 w-10 ${isActive ? 'text-green-600' : 'text-blue-600'}`} />
      </div>
      
      {/* Status text */}
      <div className="text-center">
        <h3 className={`text-lg font-semibold mb-2 ${isActive ? 'text-green-700' : 'text-blue-700'}`}>
          {'جاري المسح...'}
        </h3>
        <p className="text-sm text-gray-600 max-w-sm">
          {placeholder}
        </p>
        
        {/* Device info */}
        <div className="mt-4 p-3 bg-white border border-gray-200 rounded-lg text-xs text-gray-500">
          <p className="font-medium">HENEX HC-3206R-2D</p>
          <p>الماسح الضوئي جاهز للاستخدام</p>
        </div>
        
        {/* Current input display (for debugging) */}
        {input && (
          <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs">
            البيانات المقروءة: {input}
          </div>
        )}
      </div>
    </div>
  );
}
