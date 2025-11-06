import React, { useEffect, useState, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { QrCode } from 'lucide-react';

interface DeviceQRScannerProps {
  onScan: (qrData: string) => void;
  isActive: boolean;
  placeholder?: string;
}

export function DeviceQRScanner({ onScan, isActive, placeholder = "امسح رمز QR باستخدام الماسح الضوئي..." }: DeviceQRScannerProps) {
  // Display value for debugging/status only
  const [input, setInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  // Internal buffer (faster than state) – scanners type very quickly
  const bufferRef = useRef('');
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!isActive) return;

    // Map physical key codes to US layout characters so scans work even if OS layout is AZERTY/AR
    const US_DIGITS: Record<string, string> = {
      Digit0: '0', Digit1: '1', Digit2: '2', Digit3: '3', Digit4: '4',
      Digit5: '5', Digit6: '6', Digit7: '7', Digit8: '8', Digit9: '9',
    };
    const US_DIGITS_SHIFT: Record<string, string> = {
      Digit1: '!', Digit2: '@', Digit3: '#', Digit4: '$', Digit5: '%',
      Digit6: '^', Digit7: '&', Digit8: '*', Digit9: '(', Digit0: ')',
    };
    const US_PUNC: Record<string, string> = {
      Minus: '-', Equal: '=', BracketLeft: '[', BracketRight: ']', Backslash: '\\',
      Semicolon: ';', Quote: "'", Comma: ',', Period: '.', Slash: '/', Backquote: '`', Space: ' ',
    };
    const US_PUNC_SHIFT: Record<string, string> = {
      Minus: '_', Equal: '+', BracketLeft: '{', BracketRight: '}', Backslash: '|',
      Semicolon: ':', Quote: '"', Comma: '<', Period: '>', Slash: '?', Backquote: '~',
    };

    const translateUS = (e: KeyboardEvent): string => {
      // Letters
      const m = e.code.match(/^Key([A-Z])$/);
      if (m) return e.shiftKey ? m[1] : m[1].toLowerCase();
      // Digits row
      if (US_DIGITS[e.code]) return e.shiftKey ? (US_DIGITS_SHIFT[e.code] || US_DIGITS[e.code]) : US_DIGITS[e.code];
      // Punctuation
      if (US_PUNC[e.code]) return e.shiftKey ? (US_PUNC_SHIFT[e.code] || US_PUNC[e.code]) : US_PUNC[e.code];
      return '';
    };

    // Validate QR data format before passing to handler
    const isValidQRData = (data: string): boolean => {
      // Must be at least 5 characters
      if (data.length < 5) return false;
      
      // Check if it's valid JSON (our ticket QR format)
      try {
        const parsed = JSON.parse(data);
        // Must have either ticketId or id field
        if (parsed.ticketId || parsed.id) return true;
      } catch {
        // Not JSON, continue other checks
      }
      
      // Check if it's a plain number (ticket ID)
      if (/^\d+$/.test(data)) return true;
      
      // Check if it looks like a ticket number format (YYYY/MM/DD/NNN)
      if (/^\d{4}\/\d{2}\/\d{2}\/\d{3,}$/.test(data)) return true;
      
      // Reject if it contains too many special chars or non-ASCII garbage
      const specialCharRatio = (data.match(/[^a-zA-Z0-9\s\{\}\[\]":,\.\-\/]/g) || []).length / data.length;
      return specialCharRatio < 0.3; // Allow max 30% special chars
    };

    // Finalize the scan either on Enter or on inactivity
    const finalize = () => {
      const value = bufferRef.current.trim();
      if (!value) return;
      
      // Validate before sending
      if (!isValidQRData(value)) {
        bufferRef.current = '';
        setInput('');
        toast({ 
          variant: 'destructive',
          title: 'مسح غير صالح', 
          description: 'البيانات المقروءة غير صحيحة. يرجى المحاولة مرة أخرى.' 
        });
        return;
      }
      
      onScan(value);
      bufferRef.current = '';
      setInput('');
      toast({ title: 'تم المسح بنجاح', description: 'تم قراءة رمز QR بواسطة الماسح الضوئي' });
    };

    const scheduleFinalize = (delay = 120) => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(finalize, delay);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ensure keystrokes are captured by hidden input (helps some browsers)
      if (inputRef.current && document.activeElement !== inputRef.current) {
        inputRef.current.focus();
      }

      // Ignore modifier-only keys
      if (e.ctrlKey || e.altKey || e.metaKey) return;

      if (e.key === 'Enter') {
        e.preventDefault();
        scheduleFinalize(0);
        return;
      }
      if (e.key === 'Escape') {
        bufferRef.current = '';
        setInput('');
        return;
      }

      // Use US mapping based on physical key code so active OS layout doesn't matter (AZERTY, AR, ...)
      const ch = translateUS(e);
      if (ch) {
        e.preventDefault();
        bufferRef.current += ch;
        setInput(bufferRef.current);
        scheduleFinalize(80); // Most scanners are fast – short idle timeout marks end of scan
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [isActive, onScan, toast]);

  // Auto-focus the hidden input when active
  useEffect(() => {
    if (isActive && inputRef.current) inputRef.current.focus();
  }, [isActive]);

  if (!isActive) return null;

  return (
    <div className="flex flex-col items-center p-8 bg-gradient-to-br from-blue-50 to-green-50 border-2 border-dashed border-blue-300 rounded-lg">
      {/* Hidden input to keep focus on the page while scanning */}
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
