import { useState, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import QrScanner from 'qr-scanner';
import { ScannedTicket, MinimizedTicket, EditTicketForm } from '@/types/daily-work';

export const useQRScanner = (
  minimizedTickets: MinimizedTicket[],
  setMinimizedTickets: React.Dispatch<React.SetStateAction<MinimizedTicket[]>>,
  setScannedTicket: React.Dispatch<React.SetStateAction<ScannedTicket | null>>,
  setEditForm: React.Dispatch<React.SetStateAction<EditTicketForm>>,
  setIsEditModalOpen: React.Dispatch<React.SetStateAction<boolean>>,
  setIsCameraScanOpen: React.Dispatch<React.SetStateAction<boolean>>,
  fetchTicketByCode: (code: string | number) => Promise<ScannedTicket>,
  setIsFinishingOperation: React.Dispatch<React.SetStateAction<boolean>>
) => {
  const { toast } = useToast();
  const [isCameraActive, setIsCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const qrScannerRef = useRef<QrScanner | null>(null);

  // Initialize camera for QR scanning
  const initializeCamera = async () => {
    if (!videoRef.current) return;

    try {
      // Check if camera is available
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      // Initialize QR scanner
      qrScannerRef.current = new QrScanner(
        videoRef.current,
        (result) => {
          handleQRResult(result.data);
        },
        {
          highlightScanRegion: true,
          highlightCodeOutline: true,
        }
      );

      await qrScannerRef.current.start();
      setIsCameraActive(true);
    } catch (error) {
      console.error('Error accessing camera:', error);
      toast({
        variant: 'destructive',
        title: 'خطأ',
        description: 'لا يمكن الوصول إلى الكاميرا. يرجى التحقق من الأذونات.',
      });
    }
  };

  // Stop camera
  const stopCamera = () => {
    if (qrScannerRef.current) {
      qrScannerRef.current.stop();
      qrScannerRef.current.destroy();
      qrScannerRef.current = null;
    }

    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }

    setIsCameraActive(false);
  };

  // Handle QR scan result
  const handleQRResult = async (result: string) => {
    try {
      let qrData;
      try {
        qrData = JSON.parse(result);
      } catch {
        // If parsing fails, check if the result is a number or string
        const directId = parseInt(result, 10);
        qrData = { id: isNaN(directId) ? result : directId };
      }

      const ticketId = qrData.id || qrData.ticketId;
      if (!ticketId) {
        throw new Error('لم يتم العثور على معرف التذكرة في رمز QR');
      }

      const ticket = await fetchTicketByCode(ticketId);
      setScannedTicket(ticket);

      // Check if this ticket is minimized and maximize it
      const minimizedIndex = minimizedTickets.findIndex(t => t.id === ticket.id);
      if (minimizedIndex !== -1) {
        const updatedMinimizedTickets = [...minimizedTickets];
        updatedMinimizedTickets[minimizedIndex] = {
          ...updatedMinimizedTickets[minimizedIndex],
          isMaximized: true
        };
        setMinimizedTickets(updatedMinimizedTickets);
      }

      setEditForm({
        weightOut: ticket.weightOut !== undefined ? String(ticket.weightOut) : '',
        numberOfBoxes: ticket.numberOfBoxes ? String(ticket.numberOfBoxes) : '',
        taux: '', // Reset taux for each ticket
        // Payment fields
        isPaid: ticket.isPaid || false,
        paymentAmount: ticket.totalAmount ? String(ticket.totalAmount) : '',
      });

        // Only set finishing operation for milling operations, not for sale
        setIsFinishingOperation(ticket.operationType !== 'sale');
      setIsEditModalOpen(true);
      setIsCameraScanOpen(false);
      stopCamera();
      
      toast({ title: 'نجح', description: 'تم مسح رمز QR بنجاح' });
    } catch (error: any) {
      console.error('QR scan error:', error);
      toast({ variant: 'destructive', title: 'خطأ', description: 'فشل قراءة رمز QR' });
    }
  };

  // Handle QR scan for completion (file upload)
  const handleQRScan = async (file: File) => {
    try {
      const result = await QrScanner.scanImage(file);
      if (result) {
        await handleQRResult(result);
      } else {
        toast({ variant: 'destructive', title: 'خطأ', description: 'لم يتم التعرف على رمز QR' });
      }
    } catch (error: any) {
      console.error('QR scan error:', error);
      toast({ variant: 'destructive', title: 'خطأ', description: 'فشل قراءة رمز QR' });
    }
  };

  return {
    isCameraActive,
    videoRef,
    initializeCamera,
    stopCamera,
    handleQRResult,
    handleQRScan
  };
};
