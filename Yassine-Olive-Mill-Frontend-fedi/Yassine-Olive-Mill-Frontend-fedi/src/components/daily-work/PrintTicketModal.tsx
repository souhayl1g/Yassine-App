import React, { useRef, useEffect, useState } from 'react';
import { X, Printer, Minimize2, Tag, LogOut } from 'lucide-react';
import { OliveButton } from '@/components/ui/olive-button';
import { Input } from '@/components/ui/input';
import { Ticket } from '@/types/daily-work';
import { QRCodeSVG } from 'qrcode.react';
import { useReactToPrint } from 'react-to-print';
import { api } from '@/integrations/api/client';
import { renderToStaticMarkup } from 'react-dom/server';

interface PrintTicketModalProps {
  isOpen: boolean;
  ticket: Ticket | null;
  onPrint: () => void;
  onMinimize: (ticket: Ticket) => void;
  onClose: () => void;
  onOpenQuitWindow?: (ticket: Ticket) => void;
}

export function PrintTicketModal({
  isOpen,
  ticket,
  onPrint,
  onMinimize,
  onClose,
  onOpenQuitWindow,
}: PrintTicketModalProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const [currentPrices, setCurrentPrices] = useState<any>(null);
  const [arrivalReceiptPrinted, setArrivalReceiptPrinted] = useState(false);
  const [showBoxNumberPrompt, setShowBoxNumberPrompt] = useState(false);
  const [boxNumberInput, setBoxNumberInput] = useState<string>('');

  const PRINT_ROOT_ID = 'olive-print-root';

  // Check if we should force box-labels printing (when called from print button in ticket list)
  const forceBoxLabels = (ticket as any)?._forceBoxLabels === true;
  
  const ticketType = !ticket ? 'box-labels' : 
    forceBoxLabels ? 'box-labels' :
    ticket.status === 'received' ? 'arrival-receipt' :
    ticket.status === 'completed' ? 'exit-receipt' :
    'box-labels';

  useEffect(() => {
    if (isOpen && ticketType === 'exit-receipt') {
      loadCurrentPrices();
    }
    // Reset arrival receipt printed state when modal opens/closes
    if (!isOpen) {
      setArrivalReceiptPrinted(false);
    }
  }, [isOpen, ticketType]);

  const loadCurrentPrices = async () => {
    try {
      const response = await api.get('/prices?latest=true');
      if (response && typeof response === 'object' && response !== null) {
        setCurrentPrices({
          millingPricePerKg: (response as any).milling_price_per_kg || 0,
          oliveBuyingPricePerKg: (response as any).olive_buying_price_per_kg || 0,
          emptyBidonPrice: (response as any).empty_bidon_price || 0,
        });
      }
    } catch (error) {
      console.error('Error loading prices:', error);
    }
  };

  const getPageStyle = () => {
    // Use 70x200mm for exit receipt (taller to fit QR code and logo), 70x180mm for arrival receipt, 80x80mm for box labels
    const isReceipt = ticketType === 'arrival-receipt' || ticketType === 'exit-receipt';
    const width = isReceipt ? '70mm' : '80mm';
    const height = ticketType === 'exit-receipt' ? '200mm' : isReceipt ? '180mm' : '80mm';
    
    return `
    @page {
      size: ${width} ${height};
      margin: 0 !important;
    }
    @media print {
      html, body {
        margin: 0 !important;
        padding: 0 !important;
        width: ${width} !important;
        height: ${height} !important;
        max-height: ${height} !important;
        overflow: visible !important;
      }
      #${PRINT_ROOT_ID} {
        width: ${width} !important;
        min-height: ${height} !important;
        height: auto !important;
        display: block !important;
      }
      .print-page {
        width: ${width} !important;
        min-height: ${height} !important;
        height: ${height} !important;
        max-height: ${height} !important;
        display: block !important;
        page-break-before: always !important;
        page-break-after: always !important;
        page-break-inside: avoid !important;
        break-before: page !important;
        break-after: page !important;
        overflow: hidden !important;
      }
      .print-page:first-child {
        page-break-before: auto !important;
        break-before: auto !important;
      }
      .print-page:last-child {
        page-break-after: auto !important;
        break-after: auto !important;
      }
    }
  `;
  };

  const standardPrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Ticket-${ticket?.ticketNumber}`,
    pageStyle: getPageStyle(),
    onAfterPrint: () => {
      // If we just printed arrival receipt, show options
      if (ticketType === 'arrival-receipt' && ticket) {
        setArrivalReceiptPrinted(true);
      } else {
        onPrint();
      }
    },
  });

  const printHtmlDocument = (html: string) => {
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const cleanup = () => {
      if (iframe.parentNode) {
        iframe.parentNode.removeChild(iframe);
      }
      onPrint();
    };

    const handleAfterPrint = () => {
      cleanup();
    };

    const iframeWindow = iframe.contentWindow;
    if (!iframeWindow) {
      cleanup();
      return;
    }

    iframeWindow.addEventListener('afterprint', handleAfterPrint);
    iframeWindow.addEventListener('beforeunload', handleAfterPrint);

    const doc = iframeWindow.document;
    doc.open();
    doc.write(html);
    doc.close();

    const triggerPrint = () => {
      try {
        iframeWindow.focus();
        iframeWindow.print();
      } catch (error) {
        console.error('Print error', error);
        cleanup();
      }
    };

    if (doc.readyState === 'complete') {
      setTimeout(triggerPrint, 200);
    } else {
      iframeWindow.addEventListener('load', () => setTimeout(triggerPrint, 200));
    }

    setTimeout(cleanup, 60000);
  };

  const buildLabelDocumentHtml = (numBoxes?: number) => {
    const boxesCount = numBoxes || ticket?.numberOfBoxes || 1;
    
    // Parse client name to get first and last name
    const parseClientName = (fullName: string) => {
      const parts = fullName.trim().split(/\s+/);
      if (parts.length === 1) {
        return { firstname: parts[0], lastname: '' };
      }
      const firstname = parts[0];
      const lastname = parts.slice(1).join(' ');
      return { firstname, lastname };
    };
    
    const clientNames = ticket?.clientName ? parseClientName(ticket.clientName) : { firstname: '', lastname: '' };
    
    const labelStyle = `
      @page {
        size: 80mm 80mm;
        margin: 0;
      }
      body {
        margin: 0;
        padding: 0;
        width: 80mm;
        background: white;
        direction: rtl;
      }
      .label-page {
        width: 80mm;
        height: 80mm;
        page-break-after: always;
        box-sizing: border-box;
        padding: 2mm;
        font-family: Arial, sans-serif;
        display: flex;
        flex-direction: row;
        position: relative;
        border: none;
        overflow: hidden;
      }
      .label-page:last-child {
        page-break-after: auto;
      }
      .label-index {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        font-size: 28pt;
        font-weight: bold;
        color: #000;
        z-index: 10;
      }
      .label-qr {
        width: 35mm;
        display: flex;
        align-items: center;
        justify-content: center;
        padding-right: 3mm;
        margin-right: 3mm;
        border-right: none;
      }
      .label-details {
        flex: 1;
        display: flex;
        flex-direction: column;
        justify-content: center;
        padding-left: 3mm;
        text-align: right;
      }
      .label-text {
        font-size: 7pt;
        color: #000;
        margin-bottom: 0.5mm;
      }
      .label-client-firstname {
        font-size: 10pt;
        font-weight: bold;
        color: #000;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        margin-bottom: 0.5mm;
      }
      .label-client-lastname {
        font-size: 10pt;
        font-weight: bold;
        color: #000;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        margin-bottom: 0.8mm;
      }
    `;

    const qrSvgMarkup = renderToStaticMarkup(
      <QRCodeSVG value={qrCodeValue} size={130} level="H" includeMargin={false} />
    );

    const labelsToPrintArray = Array.from({ length: boxesCount }, (_, i) => i + 1);
    const labelsMarkup = labelsToPrintArray.map((boxNum) => `
      <div class="label-page">
        <div class="label-index">${boxNum}/${boxesCount}</div>
        <div class="label-qr">${qrSvgMarkup}</div>
        <div class="label-details">
          <div class="label-client-firstname">${clientNames.firstname}</div>
          <div class="label-client-lastname">${clientNames.lastname}</div>
          <div class="label-text">رقم: ${ticketIdText}</div>
          <div class="label-text">${ticket ? new Date(ticket.dateReceived).toLocaleDateString('ar-TN') : ''}</div>
        </div>
      </div>
    `).join('');

    return `<!DOCTYPE html>
      <html lang="ar" dir="rtl">
        <head>
          <meta charSet="utf-8" />
          <title>طباعة الملصقات - ${ticket?.clientName ?? ''}</title>
          <style>${labelStyle}</style>
        </head>
        <body>
          ${labelsMarkup}
        </body>
      </html>`;
  };

  const handleLabelPrint = (numberOfBoxes?: number) => {
    if (!ticket) {
      return;
    }

    // If numberOfBoxes is provided, use it; otherwise use ticket's numberOfBoxes
    const boxesToPrint = numberOfBoxes || ticket.numberOfBoxes || 1;
    const html = buildLabelDocumentHtml(boxesToPrint);
    printHtmlDocument(html);
  };

  const handlePrint = () => {
    if (ticketType === 'box-labels') {
      // For box-labels, always prompt for number of boxes
      handlePrintLabels();
    } else {
      standardPrint();
    }
  };

  const handlePrintLabels = () => {
    if (!ticket) return;
    // Always prompt for number of boxes when printing sticky labels
    setBoxNumberInput(String(ticket.numberOfBoxes || ''));
    setShowBoxNumberPrompt(true);
  };
  
  // Always prompt for box number when printing labels from print button
  useEffect(() => {
    if (isOpen && ticket && forceBoxLabels && ticketType === 'box-labels') {
      // Auto-show prompt when modal opens with forceBoxLabels
      setBoxNumberInput(String(ticket.numberOfBoxes || ''));
      setShowBoxNumberPrompt(true);
    }
  }, [isOpen, ticket, forceBoxLabels, ticketType]);

  const confirmPrintLabels = () => {
    if (!ticket) return;
    const numBoxes = parseInt(boxNumberInput) || 0;
    if (numBoxes <= 0) {
      alert('يرجى إدخال عدد صحيح من الصناديق');
      return;
    }
    
    setShowBoxNumberPrompt(false);
    
    // Print labels with the specified number of boxes using the existing function
    handleLabelPrint(numBoxes);
    
    // After printing labels, keep options open if arrival receipt was printed
    setTimeout(() => {
      if (arrivalReceiptPrinted) {
        setArrivalReceiptPrinted(true);
      }
    }, 100);
  };

  const handleOpenQuitWindow = () => {
    if (!ticket || !onOpenQuitWindow) return;
    onClose();
    onOpenQuitWindow(ticket);
  };

  if (!isOpen || !ticket) return null;

  const numberOfBoxes = ticket.numberOfBoxes || 0;
  const totalLabels = Math.max(1, numberOfBoxes);
  const labelsToPrint = Array.from({ length: totalLabels }, (_, i) => i + 1);
  const ticketIdText = ticket.ticketNumber ?? String(ticket.id);
  const qrCodeValue = JSON.stringify({
    ticketId: ticket.id,
    ticketNumber: ticket.ticketNumber,
    clientName: ticket.clientName,
    weightIn: ticket.weightIn,
    dateReceived: ticket.dateReceived,
  });

  // Parse client name to get first and last name
  const parseClientName = (fullName: string) => {
    const parts = fullName.trim().split(/\s+/);
    if (parts.length === 1) {
      return { firstname: parts[0], lastname: '' };
    }
    const firstname = parts[0];
    const lastname = parts.slice(1).join(' ');
    return { firstname, lastname };
  };
  
  const clientNames = ticket?.clientName ? parseClientName(ticket.clientName) : { firstname: '', lastname: '' };

  const weightIn = ticket.weightIn || 0;
  const weightOut = ticket.weightOut || 0;
  const calculatedNetWeight = weightIn - weightOut;
  const safeNetWeight = calculatedNetWeight > 0 ? calculatedNetWeight : 0;

  let baseUnitPrice = 0;
  if (currentPrices && ticket.operationType) {
    if (ticket.operationType === 'milling') {
      baseUnitPrice = currentPrices.millingPricePerKg || 0;
    } else if (ticket.operationType === 'sale') {
      baseUnitPrice = currentPrices.oilExportSellingPricePerKg || 0;
    }
  }

  const derivedUnitPrice = typeof ticket.unitPrice === 'number' && ticket.unitPrice > 0
    ? ticket.unitPrice
    : baseUnitPrice;

  const baseAmount = derivedUnitPrice * safeNetWeight;

  const numberOfBidons = ticket.numberOfBidons || 0;
  let bidonsProduced = 0;
  let additionalBidonsForClient = 0;

  if (ticket.operationType === 'milling') {
    if (ticket.numberOfBidonsProduced !== undefined && ticket.numberOfBidonsProduced !== null) {
      bidonsProduced = ticket.numberOfBidonsProduced;
    } else {
      const taux = ticket.taux || 0;
      const oilProduction = safeNetWeight * (taux / 100);
      bidonsProduced = Math.floor(oilProduction / 16);
    }
    additionalBidonsForClient = Math.max(0, bidonsProduced - numberOfBidons);
  } else {
    additionalBidonsForClient = numberOfBidons;
  }

  const bidonCost = additionalBidonsForClient > 0
    ? additionalBidonsForClient * (currentPrices?.emptyBidonPrice || 0)
    : 0;

  const derivedTotalAmount = typeof ticket.totalAmount === 'number' && ticket.totalAmount > 0
    ? ticket.totalAmount
    : baseAmount + bidonCost;

  const getModalTitle = () => {
    if (ticketType === 'arrival-receipt') return '🎫 طباعة إيصال الوصول';
    if (ticketType === 'exit-receipt') return '📄 طباعة إيصال الخروج';
    return '🏷️ طباعة ملصقات الصناديق';
  };

  const getModalDescription = () => {
    if (ticketType === 'arrival-receipt') return `إيصال وصول لـ ${ticket.clientName}`;
    if (ticketType === 'exit-receipt') return `إيصال نهائي لـ ${ticket.clientName}`;
    return `${totalLabels} ملصقات لـ ${ticket.clientName}`;
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-gradient-to-r from-emerald-600 to-green-600 text-white p-6 rounded-t-xl flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black mb-1">{getModalTitle()}</h2>
            <p className="text-emerald-100 text-sm">{getModalDescription()}</p>
          </div>
          <button
            onClick={onClose}
            className="bg-white/20 hover:bg-white/30 rounded-full p-2 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6">
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 mb-6">
            <h3 className="font-bold text-gray-800 dark:text-gray-200 mb-3 flex items-center gap-2">
              👁️ معاينة
            </h3>

            {ticketType === 'arrival-receipt' && (
              <div className="bg-white p-4 mx-auto text-gray-900" dir="rtl" style={{ width: '70mm', height: '180mm' }}>
                {/* Big Title and Logo */}
                <div className="text-center mb-5">
                  <div className="flex justify-center mb-2">
                    <img 
                      src="/favicon.svg" 
                      alt="Logo" 
                      className="h-14 w-14"
                    />
                  </div>
                  <h2 className="text-[20px] font-bold text-emerald-700 leading-tight mb-1">معصرة الحاج لطفي</h2>
                  <p className="text-[11px] text-gray-600 leading-tight">إيصال الوصول</p>
                </div>

                {/* Client Info - Centered */}
                <div className="flex flex-col text-center space-y-3 mb-5">
                  <div className="space-y-2">
                    <div className="text-[10px] text-gray-600 font-semibold">الاسم الأول</div>
                    <div className="font-bold text-[20px] text-gray-900">{clientNames.firstname}</div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-[10px] text-gray-600 font-semibold">اسم العائلة</div>
                    <div className="font-bold text-[20px] text-gray-900">{clientNames.lastname}</div>
                  </div>
                  <div className="flex justify-between leading-tight text-[11px] mt-4">
                    <span className="font-bold">رقم التذكرة:</span>
                    <span className="font-semibold">{ticketIdText}</span>
                  </div>
                  <div className="flex justify-between leading-tight text-[11px]">
                    <span className="font-bold">التاريخ:</span>
                    <span className="font-semibold">{new Date(ticket.dateReceived).toLocaleDateString('ar-TN')}</span>
                  </div>
                </div>

                {/* Spacer */}
                <div className="flex-1"></div>

                {/* Big QR Code in Center */}
                <div className="flex items-center justify-center py-4">
                  <QRCodeSVG value={qrCodeValue} size={220} level="H" includeMargin={false} />
                </div>

                {/* Cute Message to Client */}
                <div className="text-center pt-3">
                  <p className="text-[10px] text-gray-700 leading-tight font-medium">
                    🌿 شكراً لثقتكم بنا 🌿
                  </p>
                  <p className="text-[9px] text-gray-600 leading-tight mt-1">
                    نتمنى لكم تجربة ممتازة معنا
                  </p>
                  <p className="text-[8px] text-gray-500 leading-tight mt-1">
                    للاستفسار: يرجى الاتصال بنا
                  </p>
                </div>
              </div>
            )}

            {ticketType === 'box-labels' && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {labelsToPrint.map((boxNum) => (
                  <div
                    key={boxNum}
                    className="bg-white rounded p-2 shadow-sm relative"
                    style={{ aspectRatio: '80/80' }}
                  >
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10 text-[10px] font-bold text-black">
                      {boxNum}/{totalLabels}
                    </div>
                    <div className="h-full w-full flex">
                      <div className="w-1/2 flex items-center justify-center pr-3">
                        <QRCodeSVG value={qrCodeValue} size={80} level="H" includeMargin={false} />
                      </div>
                      <div className="w-1/2 pl-3 flex flex-col justify-center text-right" dir="rtl">
                        <div className="text-[9px] font-bold text-black leading-tight">{clientNames.firstname}</div>
                        <div className="text-[9px] font-bold text-black leading-tight mb-1">{clientNames.lastname}</div>
                        <div className="text-[7px] text-black leading-tight">رقم: {ticketIdText}</div>
                        <div className="text-[7px] text-black leading-tight">{new Date(ticket.dateReceived).toLocaleDateString('ar-TN')}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {ticketType === 'exit-receipt' && (
              <div className="bg-white p-4 mx-auto text-gray-900" dir="rtl" style={{ width: '70mm', minHeight: '200mm' }}>
                {/* Big Title and Logo - Centered */}
                <div className="text-center mb-4">
                  <div className="flex justify-center mb-2">
                    <img 
                      src="/favicon.svg" 
                      alt="Logo" 
                      className="h-12 w-12"
                    />
                  </div>
                  <h2 className="text-[18px] font-bold text-emerald-700 leading-tight mb-1">معصرة الحاج لطفي</h2>
                  <p className="text-[10px] text-gray-600 leading-tight">إيصال نهائي - {ticket.operationType === 'milling' ? 'عصر' : 'بيع'}</p>
                </div>

                {/* Client Info */}
                <div className="flex flex-col text-center space-y-2 mb-4">
                  <div className="space-y-1">
                    <div className="text-[9px] text-gray-600 font-semibold">الاسم الأول</div>
                    <div className="font-bold text-[18px] text-gray-900">{clientNames.firstname}</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-[9px] text-gray-600 font-semibold">اسم العائلة</div>
                    <div className="font-bold text-[18px] text-gray-900">{clientNames.lastname}</div>
                  </div>
                  
                  {/* Net Weight */}
                  <div className="flex justify-between leading-tight bg-emerald-50 px-3 py-2 rounded text-[13px] mt-2">
                    <span className="font-bold">الوزن الصافي:</span>
                    <span className="text-emerald-700 font-bold">{safeNetWeight} كلغ</span>
                  </div>

                  {/* Total */}
                  <div className="flex justify-between leading-tight bg-blue-50 px-3 py-2 rounded text-[13px]">
                    <span className="font-bold">المبلغ الإجمالي:</span>
                    <span className="text-blue-700 font-bold">{derivedTotalAmount > 0 ? derivedTotalAmount.toFixed(3) : '—'} د.ت</span>
                  </div>

                  {/* Payment State */}
                  <div className={`text-center py-2 rounded text-[13px] font-bold ${ticket.isPaid ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                    {ticket.isPaid ? '✅ مدفوع' : '⏳ غير مدفوع'}
                  </div>
                </div>

                {/* Spacer */}
                <div className="flex-1 min-h-[10mm]"></div>

                {/* Big QR Code in Center */}
                <div className="flex items-center justify-center py-3">
                  <QRCodeSVG value={qrCodeValue} size={200} level="H" includeMargin={false} />
                </div>

                {/* Cute Message to Client */}
                <div className="text-center pt-2">
                  <p className="text-[9px] text-gray-700 leading-tight font-medium">
                    🌿 شكراً لثقتكم بنا 🌿
                  </p>
                  <p className="text-[8px] text-gray-600 leading-tight mt-1">
                    نتمنى لكم تجربة ممتازة معنا
                  </p>
                  <p className="text-[7px] text-gray-500 leading-tight mt-1">
                    للاستفسار: يرجى الاتصال بنا
                  </p>
                </div>
              </div>
            )}
          </div>

          <div style={{ display: 'none' }}>
            <div ref={printRef}>
              <style>{getPageStyle()}</style>
              <div id={PRINT_ROOT_ID}>
              {ticketType === 'arrival-receipt' && (
                <div className="print-page">
                  <div style={{
                    width: '100%',
                    height: '100%',
                    padding: '4mm',
                    boxSizing: 'border-box',
                    fontFamily: 'Arial, sans-serif',
                    backgroundColor: 'white',
                    direction: 'rtl',
                    display: 'flex',
                    flexDirection: 'column',
                  }}>
                    {/* Big Title and Logo */}
                    <div style={{
                      textAlign: 'center',
                      marginBottom: '5mm',
                    }}>
                      <div style={{ marginBottom: '2mm' }}>
                        <img 
                          src="/favicon.svg" 
                          alt="Logo" 
                          style={{ height: '14mm', width: '14mm' }}
                        />
                      </div>
                      <h2 style={{ fontSize: '20pt', fontWeight: 'bold', color: '#059669', margin: 0, lineHeight: 1.2, marginBottom: '1mm' }}>
                        معصرة الحاج لطفي
                      </h2>
                      <p style={{ fontSize: '11pt', color: '#4b5563', margin: 0, lineHeight: 1.2 }}>إيصال الوصول</p>
                    </div>

                    {/* Client Info - Centered */}
                    <div style={{ 
                      display: 'flex', 
                      flexDirection: 'column', 
                      textAlign: 'center',
                      marginBottom: '5mm',
                      gap: '3mm',
                    }}>
                      <div style={{ gap: '2mm' }}>
                        <div style={{ fontSize: '10pt', color: '#4b5563', fontWeight: 600, marginBottom: '1mm' }}>الاسم الأول</div>
                        <div style={{ fontSize: '20pt', fontWeight: 'bold', color: '#111827' }}>{clientNames.firstname}</div>
                      </div>
                      <div style={{ gap: '2mm' }}>
                        <div style={{ fontSize: '10pt', color: '#4b5563', fontWeight: 600, marginBottom: '1mm' }}>اسم العائلة</div>
                        <div style={{ fontSize: '20pt', fontWeight: 'bold', color: '#111827' }}>{clientNames.lastname}</div>
                      </div>
                      <div style={{ fontSize: '11pt', display: 'flex', justifyContent: 'space-between', lineHeight: 1.3, marginTop: '4mm' }}>
                        <span style={{ fontWeight: 'bold' }}>رقم التذكرة:</span>
                        <span style={{ fontWeight: 600 }}>{ticketIdText}</span>
                      </div>
                      <div style={{ fontSize: '11pt', display: 'flex', justifyContent: 'space-between', lineHeight: 1.3 }}>
                        <span style={{ fontWeight: 'bold' }}>التاريخ:</span>
                        <span style={{ fontWeight: 600 }}>{new Date(ticket.dateReceived).toLocaleDateString('ar-TN')}</span>
                      </div>
                    </div>

                    {/* Spacer */}
                    <div style={{ flex: 1 }}></div>

                    {/* Big QR Code in Center */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '4mm 0',
                    }}>
                      <QRCodeSVG value={qrCodeValue} size={220} level="H" includeMargin={false} />
                    </div>

                    {/* Cute Message to Client */}
                    <div style={{
                      textAlign: 'center',
                      paddingTop: '3mm',
                    }}>
                      <p style={{ fontSize: '10pt', color: '#374151', margin: 0, lineHeight: 1.3, fontWeight: 500 }}>
                        🌿 شكراً لثقتكم بنا 🌿
                      </p>
                      <p style={{ fontSize: '9pt', color: '#4b5563', margin: '1mm 0 0 0', lineHeight: 1.3 }}>
                        نتمنى لكم تجربة ممتازة معنا
                      </p>
                      <p style={{ fontSize: '8pt', color: '#6b7280', margin: '1mm 0 0 0', lineHeight: 1.3 }}>
                        للاستفسار: يرجى الاتصال بنا
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {ticketType === 'box-labels' && labelsToPrint.map((boxNum) => (
                <div key={boxNum} className="print-page">
                  <div style={{
                    width: '100%',
                    height: '100%',
                    padding: '2mm',
                    boxSizing: 'border-box',
                    display: 'flex',
                    flexDirection: 'row',
                    position: 'relative',
                    fontFamily: 'Arial, sans-serif',
                    backgroundColor: 'white',
                    border: 'none',
                  }}>
                    <div style={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      fontSize: '28pt',
                      fontWeight: 'bold',
                      color: '#000',
                      zIndex: 10,
                    }}>
                      {boxNum}/{totalLabels}
                    </div>
                    <div style={{
                      width: '35mm',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      paddingRight: '3mm',
                      marginRight: '3mm',
                      borderRight: 'none',
                    }}>
                      <QRCodeSVG value={qrCodeValue} size={130} level="H" includeMargin={false} />
                    </div>
                    <div style={{
                      flex: 1,
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      paddingLeft: '3mm',
                      textAlign: 'right',
                    }} dir="rtl">
                      <div style={{
                        fontSize: '10pt',
                        fontWeight: 'bold',
                        color: '#000',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        marginBottom: '0.5mm',
                      }}>
                        {clientNames.firstname}
                      </div>
                      <div style={{
                        fontSize: '10pt',
                        fontWeight: 'bold',
                        color: '#000',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        marginBottom: '0.8mm',
                      }}>
                        {clientNames.lastname}
                      </div>
                      <div style={{
                        fontSize: '7pt',
                        color: '#000',
                        marginBottom: '0.5mm',
                      }}>
                        رقم: {ticketIdText}
                      </div>
                      <div style={{
                        fontSize: '7pt',
                        color: '#000',
                      }}>
                        {new Date(ticket.dateReceived).toLocaleDateString('ar-TN')}
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {ticketType === 'exit-receipt' && (
                <div className="print-page">
                  <div style={{
                    width: '100%',
                    height: '100%',
                    padding: '3mm',
                    boxSizing: 'border-box',
                    fontFamily: 'Arial, sans-serif',
                    backgroundColor: 'white',
                    direction: 'rtl',
                    display: 'flex',
                    flexDirection: 'column',
                  }}>
                    {/* Big Title and Logo - Centered */}
                    <div style={{
                      textAlign: 'center',
                      marginBottom: '4mm',
                    }}>
                      <div style={{ marginBottom: '2mm', display: 'flex', justifyContent: 'center' }}>
                        <img 
                          src="/favicon.svg" 
                          alt="Logo" 
                          style={{ height: '12mm', width: '12mm' }}
                        />
                      </div>
                      <h2 style={{ fontSize: '18pt', fontWeight: 'bold', color: '#059669', margin: 0, lineHeight: 1.2, marginBottom: '1mm' }}>
                        معصرة الحاج لطفي
                      </h2>
                      <p style={{ fontSize: '10pt', color: '#4b5563', margin: 0, lineHeight: 1.2 }}>
                        إيصال نهائي - {ticket.operationType === 'milling' ? 'عصر' : 'بيع'}
                      </p>
                    </div>

                    {/* Client Info */}
                    <div style={{ 
                      display: 'flex', 
                      flexDirection: 'column', 
                      textAlign: 'center',
                      marginBottom: '4mm',
                      gap: '2mm',
                    }}>
                      <div style={{ gap: '1mm' }}>
                        <div style={{ fontSize: '9pt', color: '#4b5563', fontWeight: 600, marginBottom: '0.5mm' }}>الاسم الأول</div>
                        <div style={{ fontSize: '18pt', fontWeight: 'bold', color: '#111827' }}>{clientNames.firstname}</div>
                      </div>
                      <div style={{ gap: '1mm' }}>
                        <div style={{ fontSize: '9pt', color: '#4b5563', fontWeight: 600, marginBottom: '0.5mm' }}>اسم العائلة</div>
                        <div style={{ fontSize: '18pt', fontWeight: 'bold', color: '#111827' }}>{clientNames.lastname}</div>
                      </div>
                      
                      {/* Net Weight */}
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        backgroundColor: '#ecfdf5',
                        padding: '2.5mm',
                        borderRadius: '1mm',
                        marginTop: '2mm',
                        lineHeight: 1.3,
                        fontSize: '13pt',
                      }}>
                        <span style={{ fontWeight: 'bold' }}>الوزن الصافي:</span>
                        <span style={{ color: '#059669', fontWeight: 'bold' }}>{safeNetWeight} كلغ</span>
                      </div>

                      {/* Total */}
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        backgroundColor: '#eff6ff',
                        padding: '2.5mm',
                        borderRadius: '1mm',
                        lineHeight: 1.3,
                        fontSize: '13pt',
                      }}>
                        <span style={{ fontWeight: 'bold' }}>المبلغ الإجمالي:</span>
                        <span style={{ color: '#2563eb', fontWeight: 'bold' }}>{derivedTotalAmount > 0 ? derivedTotalAmount.toFixed(3) : '—'} د.ت</span>
                      </div>

                      {/* Payment State */}
                      <div style={{
                        textAlign: 'center',
                        padding: '2.5mm',
                        borderRadius: '1mm',
                        fontSize: '13pt',
                        fontWeight: 'bold',
                        backgroundColor: ticket.isPaid ? '#dcfce7' : '#fed7aa',
                        color: ticket.isPaid ? '#166534' : '#9a3412',
                      }}>
                        {ticket.isPaid ? '✅ مدفوع' : '⏳ غير مدفوع'}
                      </div>
                    </div>

                    {/* Spacer */}
                    <div style={{ flex: 1, minHeight: '10mm' }}></div>

                    {/* Big QR Code in Center */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '3mm 0',
                    }}>
                      <QRCodeSVG value={qrCodeValue} size={200} level="H" includeMargin={false} />
                    </div>

                    {/* Cute Message to Client */}
                    <div style={{
                      textAlign: 'center',
                      paddingTop: '2mm',
                    }}>
                      <p style={{ fontSize: '9pt', color: '#374151', margin: 0, lineHeight: 1.3, fontWeight: 500 }}>
                        🌿 شكراً لثقتكم بنا 🌿
                      </p>
                      <p style={{ fontSize: '8pt', color: '#4b5563', margin: '1mm 0 0 0', lineHeight: 1.3 }}>
                        نتمنى لكم تجربة ممتازة معنا
                      </p>
                      <p style={{ fontSize: '7pt', color: '#6b7280', margin: '1mm 0 0 0', lineHeight: 1.3 }}>
                        للاستفسار: يرجى الاتصال بنا
                      </p>
                    </div>
                  </div>
                </div>
              )}
              </div>
            </div>
          </div>

          {arrivalReceiptPrinted && ticketType === 'arrival-receipt' ? (
            // Show two options after printing arrival receipt
            <div className="space-y-3">
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
                <p className="text-sm text-blue-800 dark:text-blue-200 text-center font-medium">
                  اختر الإجراء التالي:
                </p>
              </div>
              <div className="flex gap-3">
                <OliveButton
                  onClick={handlePrintLabels}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white text-lg py-6"
                >
                  <Tag className="h-5 w-5 mr-2" />
                  طباعة ملصقات الصناديق
                </OliveButton>
                <OliveButton
                  onClick={handleOpenQuitWindow}
                  className="flex-1 bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white text-lg py-6"
                >
                  <LogOut className="h-5 w-5 mr-2" />
                  إدخال وزن الخروج
                </OliveButton>
              </div>
              <OliveButton 
                variant="outline" 
                onClick={() => {
                  setArrivalReceiptPrinted(false);
                  onClose();
                }}
                className="w-full text-lg py-6"
              >
                إغلاق
              </OliveButton>
            </div>
          ) : (
            // Normal print buttons
            <div className="flex gap-3">
              <OliveButton
                onClick={handlePrint}
                className="flex-1 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white text-lg py-6"
              >
                <Printer className="h-5 w-5 mr-2" />
                {ticketType === 'arrival-receipt' && 'طباعة إيصال الوصول'}
                {ticketType === 'box-labels' && `طباعة ${totalLabels} ملصقات`}
                {ticketType === 'exit-receipt' && 'طباعة إيصال الخروج'}
              </OliveButton>
              <OliveButton 
                variant="outline" 
                onClick={() => onMinimize(ticket)}
                className="flex-1 text-lg py-6"
              >
                <Minimize2 className="h-4 w-4 mr-2" />
                تصغير
              </OliveButton>
              <OliveButton 
                variant="outline" 
                onClick={onClose}
                className="flex-1 text-lg py-6"
              >
                إغلاق
              </OliveButton>
            </div>
          )}
        </div>
      </div>

      {/* Box Number Prompt Modal */}
      {showBoxNumberPrompt && ticket && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold mb-4">عدد الصناديق</h3>
            <p className="text-sm text-muted-foreground mb-4">
              يرجى إدخال عدد الصناديق المراد طباعة الملصقات لها:
            </p>
            <Input
              type="number"
              min="1"
              value={boxNumberInput}
              onChange={(e) => setBoxNumberInput(e.target.value)}
              placeholder="عدد الصناديق"
              className="mb-4"
              autoFocus
            />
            <div className="flex gap-3">
              <OliveButton
                onClick={confirmPrintLabels}
                className="flex-1"
              >
                طباعة
              </OliveButton>
              <OliveButton
                variant="outline"
                onClick={() => {
                  setShowBoxNumberPrompt(false);
                  setBoxNumberInput('');
                }}
                className="flex-1"
              >
                إلغاء
              </OliveButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}