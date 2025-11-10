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
    // Always load prices when modal opens to ensure correct pricing for exit receipts
    if (isOpen) {
      loadCurrentPrices();
    }
    // Reset arrival receipt printed state when modal opens/closes
    if (!isOpen) {
      setArrivalReceiptPrinted(false);
    }
  }, [isOpen, ticketType, ticket?.id]); // Reload prices when ticket changes

  const loadCurrentPrices = async () => {
    try {
      const response = await api.get('/prices?latest=true');
      if (response && typeof response === 'object' && response !== null) {
        const prices = {
          millingPricePerKg: (response as any).milling_price_per_kg || 0,
          oliveBuyingPricePerKg: (response as any).olive_buying_price_per_kg || 0,
          emptyBidonPrice: (response as any).empty_bidon_price || 0,
        };
        console.log('💰 Prices loaded for exit receipt:', prices);
        setCurrentPrices(prices);
      }
    } catch (error) {
      console.error('Error loading prices:', error);
      // Set prices to null so we know they failed to load
      setCurrentPrices(null);
    }
  };

  const getPageStyle = () => {
    // Use 70x85mm for exit receipt (more compact), 70x80mm for arrival receipt, 120x120mm for box labels (wider and taller)
    const isReceipt = ticketType === 'arrival-receipt' || ticketType === 'exit-receipt';
    const width = isReceipt ? '100mm' : '120mm';
    const height = ticketType === 'exit-receipt' ? '85mm' : isReceipt ? '80mm' : '120mm';
    const pageMargin = isReceipt ? '0' : '5mm';
    
    return `
    @page {
      size: ${width} ${height};
      margin: ${pageMargin} !important;
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
      } else if (ticketType === 'exit-receipt' && ticket) {
        // After printing exit receipt, automatically print box labels
        // Use the actual numberOfBoxes value, don't default to 0 if it's undefined/null
        const numBoxes = ticket.numberOfBoxes ?? 0;
        if (numBoxes > 0) {
          // Small delay to ensure exit receipt print is complete
          setTimeout(() => {
            handleLabelPrint(numBoxes);
            // Don't call onPrint() here - let the label print cleanup handle it
          }, 500);
        } else {
          onPrint();
        }
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
    if (!ticket) return '';
    
    // Use the provided numBoxes, or the ticket's numberOfBoxes, but only if it's a valid positive number
    // Don't default to 1 - use the actual value
    const boxesCount = numBoxes !== undefined ? numBoxes : (ticket?.numberOfBoxes ?? 0);
    if (boxesCount <= 0) {
      return ''; // Don't generate labels if no boxes
    }
    
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
    
    // Calculate net weight for labels
    const weightIn = ticket?.weightIn || 0;
    const weightOut = ticket?.weightOut || 0;
    const calculatedNetWeight = weightIn - weightOut;
    const netWeight = calculatedNetWeight > 0 ? calculatedNetWeight : 0;
    
    // Calculate ticket ID text and QR code value
    const ticketIdText = ticket.ticketNumber ?? String(ticket.id);
    const qrCodeValue = JSON.stringify({
      ticketId: ticket.id,
      ticketNumber: ticket.ticketNumber,
      clientName: ticket.clientName,
      weightIn: ticket.weightIn,
      dateReceived: ticket.dateReceived,
    });
    
    const labelStyle = `
      @page {
        size: 120mm 120mm;
        margin: 5mm;
      }
      body {
        margin: 0;
        padding: 0;
        width: 120mm;
        background: white;
        direction: rtl;
      }
      @media print {
        .label-page {
          page-break-after: always !important;
          page-break-before: always !important;
          break-after: page !important;
          break-before: page !important;
          page-break-inside: avoid !important;
          break-inside: avoid !important;
        }
        .label-page:first-child {
          page-break-before: auto !important;
          break-before: auto !important;
        }
        .label-page:last-child {
          page-break-after: auto !important;
          break-after: auto !important;
        }
      }
      .label-page {
        width: 120mm;
        height: 120mm;
        page-break-after: always !important;
        page-break-before: always !important;
        break-after: page !important;
        break-before: page !important;
        box-sizing: border-box;
        padding: 2mm;
        font-family: Arial, sans-serif;
        display: flex;
        flex-direction: column;
        position: relative;
        border: none;
        overflow: visible;
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }
      .label-page:first-child {
        page-break-before: auto !important;
        break-before: auto !important;
      }
      .label-page:last-child {
        page-break-after: auto !important;
        break-after: auto !important;
      }
      .label-index {
        text-align: center;
        font-size: 24pt;
        font-weight: bold;
        color: #000;
        margin-bottom: 2mm;
      }
      .label-client-name {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        text-align: center;
        margin: 2mm 0;
        flex-shrink: 0;
      }
      .label-client-firstname {
        font-size: 24pt;
        font-weight: bold;
        color: #000;
        margin-bottom: 1mm;
      }
      .label-client-lastname {
        font-size: 24pt;
        font-weight: bold;
        color: #000;
        margin-bottom: 1mm;
      }
      .label-text {
        font-size: 20pt;
        color: #000;
        text-align: center;
        margin-top: 1mm;
      }
      .label-net-weight {
        font-size: 16pt;
        font-weight: bold;
        color: #000;
        text-align: center;
        margin-top: 1mm;
      }
      .label-operation-type {
        font-size: 14pt;
        font-weight: bold;
        text-align: center;
        margin-top: 1mm;
        padding: 2mm 4mm;
        border-radius: 2mm;
        display: inline-block;
      }
      .label-operation-milling {
        background-color: #d1fae5;
        color: #000000ff;
      }
      .label-operation-sale {
        background-color: #e0e7ff;
        color: #000000ff;
      }
      .label-qr {
        display: flex;
        align-items: center;
        justify-content: center;
        margin-top: 5mm;
        padding-top: 5mm;
        width: 100%;
        height: 100%;
        overflow: visible;
        flex: 1;
        align-self: center;
      }
      .label-qr svg {
        max-width: 100%;
        height: 100%;
        display: block;
        margin: 0 auto;
      }
    `;

    const qrSvgMarkup = renderToStaticMarkup(
      <QRCodeSVG value={qrCodeValue} size={80} level="H" includeMargin={false} />
    );

    // Get operation type label
    const operationType = ticket?.operationType || 'milling';
    const operationTypeLabel = operationType === 'milling' ? '🫒 عصر' : '💰 بيع';
    const operationTypeClass = operationType === 'milling' ? 'label-operation-milling' : 'label-operation-sale';

    const labelsToPrintArray = Array.from({ length: boxesCount }, (_, i) => i + 1);
    const labelsMarkup = labelsToPrintArray.map((boxNum) => `
      <div class="label-page">
        <div class="label-index">${boxNum}/${boxesCount}</div>
        <div class="label-client-name">
          <div class="label-client-firstname">${clientNames.firstname}</div>
          <div class="label-client-lastname">${clientNames.lastname}</div>
          <div class="label-operation-type ${operationTypeClass}">${operationTypeLabel}</div>
          <div class="label-text">رقم: ${ticketIdText}</div>
          <div class="label-text">${ticket ? new Date(ticket.dateReceived).toLocaleDateString('ar-TN') : ''}</div>
          ${netWeight > 0 ? `<div class="label-net-weight">الوزن الصافي: ${netWeight.toFixed(2)} كلغ</div>` : ''}
        </div>
        <div class="label-qr">${qrSvgMarkup}</div>
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

    // Use the provided numberOfBoxes, or the ticket's numberOfBoxes (can be 0 or undefined)
    // Don't default to 1 - use the actual value from the ticket
    const boxesToPrint = numberOfBoxes !== undefined ? numberOfBoxes : (ticket.numberOfBoxes ?? 0);
    if (boxesToPrint <= 0) {
      console.warn('No boxes to print labels for');
      return;
    }
    const html = buildLabelDocumentHtml(boxesToPrint);
    if (html) {
      printHtmlDocument(html);
    }
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
    // Use the actual numberOfBoxes value (can be 0, undefined, or a number)
    const boxesValue = ticket.numberOfBoxes ?? 0;
    setBoxNumberInput(boxesValue > 0 ? String(boxesValue) : '');
    setShowBoxNumberPrompt(true);
  };
  
  // Always prompt for box number when printing labels from print button
  useEffect(() => {
    if (isOpen && ticket && forceBoxLabels && ticketType === 'box-labels') {
      // Auto-show prompt when modal opens with forceBoxLabels
      // Use the actual numberOfBoxes value (can be 0, undefined, or a number)
      const boxesValue = ticket.numberOfBoxes ?? 0;
      setBoxNumberInput(boxesValue > 0 ? String(boxesValue) : '');
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

  // Use the actual numberOfBoxes value, don't default to 1
  const numberOfBoxes = ticket.numberOfBoxes ?? 0;
  const totalLabels = numberOfBoxes > 0 ? numberOfBoxes : 0;
  const labelsToPrint = totalLabels > 0 ? Array.from({ length: totalLabels }, (_, i) => i + 1) : [];
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

  // Ensure isPaid is properly evaluated as boolean
  // Handle cases where isPaid might be undefined, false, or truthy
  const isPaid = Boolean(ticket.isPaid) || (ticket as any).isPaid === 'true' || (ticket as any).isPaid === 1;

  const weightIn = ticket.weightIn || 0;
  const weightOut = ticket.weightOut || 0;
  const calculatedNetWeight = weightIn - weightOut;
  const safeNetWeight = calculatedNetWeight > 0 ? calculatedNetWeight : 0;

  // Unified pricing logic: both milling and sale use milling price per kg
  // (olive buying price is no longer used for service calculation)
  const unifiedBaseUnitPrice = currentPrices?.millingPricePerKg || 0;

  // Prefer ticket.unitPrice if explicitly stored (and > 0), else fall back to unified milling price
  let derivedUnitPrice = 0;
  if (typeof ticket.unitPrice === 'number' && ticket.unitPrice > 0) {
    derivedUnitPrice = ticket.unitPrice;
  } else if (unifiedBaseUnitPrice > 0) {
    derivedUnitPrice = unifiedBaseUnitPrice;
  } else if (!currentPrices) {
    console.warn('⚠️ Unified pricing: currentPrices not loaded yet, calculation may be 0');
  }

  // Calculate base amount
  const baseAmount = (derivedUnitPrice > 0 && safeNetWeight > 0)
    ? derivedUnitPrice * safeNetWeight
    : 0;

  // Minimum rule applies to ALL operation types now (e.g. 200kg * unitPrice)
  const MINIMUM_WEIGHT = 200;
  const minimumServiceAmount = derivedUnitPrice > 0 ? derivedUnitPrice * MINIMUM_WEIGHT : 0;
  const minimumApplied = derivedUnitPrice > 0 && baseAmount < minimumServiceAmount;
  const serviceAmount = derivedUnitPrice > 0 ? Math.max(baseAmount, minimumServiceAmount) : baseAmount;

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
    // For sale operations, all bidons are additional
    additionalBidonsForClient = numberOfBidons;
  }

  const bidonCost = additionalBidonsForClient > 0
    ? additionalBidonsForClient * (currentPrices?.emptyBidonPrice || 0)
    : 0;

  // Calculate total amount: use ticket's totalAmount if available and valid, otherwise calculate it
  const computedTotal = serviceAmount + bidonCost;
  
  // For sale operations, always calculate if we have valid price and weight
  // Only use ticket.totalAmount if it's valid AND we don't have a better calculated value
  let derivedTotalAmount = computedTotal;
  if (typeof ticket.totalAmount === 'number' && ticket.totalAmount > 0) {
    // Use the higher of stored or calculated, but prefer calculated for sale operations
    if (ticket.operationType === 'sale' && computedTotal > 0) {
      derivedTotalAmount = Math.max(ticket.totalAmount, computedTotal);
    } else {
      derivedTotalAmount = Math.max(ticket.totalAmount, computedTotal);
    }
  } else if (ticket.operationType === 'sale' && computedTotal === 0 && derivedUnitPrice === 0) {
    // If we can't calculate and no stored amount, show 0 but log warning
    console.warn('⚠️ Sale operation: Cannot calculate total amount - prices may not be loaded');
  }

  // Debug logging for exit receipt unified pricing
  if (ticketType === 'exit-receipt') {
    console.log('🧮 EXIT RECEIPT CALCULATION (Unified Pricing):', {
      operationType: ticket.operationType,
      currentPrices,
      derivedUnitPrice,
      safeNetWeight,
      baseAmount,
      minimumServiceAmount,
      minimumApplied,
      serviceAmount,
      bidonCost,
      computedTotal,
      ticketTotalAmount: ticket.totalAmount,
      derivedTotalAmount,
    });
  }

  const getModalTitle = () => {
    if (ticketType === 'arrival-receipt') return '🎫 طباعة إيصال الوصول';
    if (ticketType === 'exit-receipt') return '📄 طباعة إيصال الخروج';
    return '🏷️ طباعة ملصقات الصناديق';
  };

  const getModalDescription = () => {
    if (ticketType === 'arrival-receipt') return `إيصال وصول لـ ${ticket.clientName}`;
    if (ticketType === 'exit-receipt') return `إيصال نهائي لـ ${ticket.clientName}`;
    return totalLabels > 0 ? `${totalLabels} ملصقات لـ ${ticket.clientName}` : `ملصقات لـ ${ticket.clientName}`;
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
              <div className="bg-white p-4 mx-auto text-gray-900" dir="rtl" style={{ width: '70mm', height: '80mm' }}>
                {/* Big Title and Logo */}
                <div className="text-center mb-1">
                  <div className="flex justify-center mb-0.5">
                    <img 
                      src="/favicon.svg" 
                      alt="Logo" 
                      className="h-6 w-6"
                    />
                  </div>
                  <h2 className="text-[13px] font-bold text-emerald-700 leading-tight mb-0">معصرة الحاج لطفي</h2>
                  <p className="text-[13px] text-gray-600 leading-tight">إيصال الوصول</p>
                </div>

                {/* Client Info - Centered */}
                <div className="flex flex-col text-center space-y-0.5 mb-1">
                  <div className="space-y-0">
                    <div className="text-[13px] text-gray-600 font-semibold">الاسم الأول</div>
                    <div className="font-bold text-[13px] text-gray-900 leading-tight">{clientNames.firstname}</div>
                  </div>
                  <div className="space-y-0">
                    <div className="text-[13px] text-gray-600 font-semibold">اسم العائلة</div>
                    <div className="font-bold text-[13px] text-gray-900 leading-tight">{clientNames.lastname}</div>
                  </div>
                  <div className="flex justify-between leading-tight text-[13px] mt-0.5">
                    <span className="font-bold">رقم التذكرة:</span>
                    <span className="font-semibold">{ticketIdText}</span>
                  </div>
                  <div className="flex justify-between leading-tight text-[13px]">
                    <span className="font-bold">نوع العملية:</span>
                    <span className="font-semibold">{ticket.operationType === 'milling' ? 'عصر' : 'بيع'}</span>
                  </div>
                  <div className="flex justify-between leading-tight text-[13px]">
                    <span className="font-bold">التاريخ:</span>
                    <span className="font-semibold">{new Date(ticket.dateReceived).toLocaleDateString('ar-TN')}</span>
                  </div>
                </div>

                {/* Spacer */}
                <div className="flex-1"></div>

                {/* Big QR Code in Center */}
                <div className="flex items-center justify-center py-1">
                  <QRCodeSVG value={qrCodeValue} size={70} level="H" includeMargin={false} />
                </div>

                {/* Cute Message to Client */}
                <div className="text-center pt-1">
                  <p className="text-[13px] text-gray-700 leading-tight font-medium">
                    🌿 شكراً لثقتكم بنا 🌿
                  </p>
                  <p className="text-[13px] text-gray-600 leading-tight mt-0">
                    نتمنى لكم تجربة ممتازة معنا
                  </p>
                  <p className="text-[13px] text-gray-500 leading-tight mt-0">
                    للاستفسار: يرجى الاتصال بنا
                  </p>
                </div>
              </div>
            )}

            {ticketType === 'box-labels' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {totalLabels > 0 ? labelsToPrint.map((boxNum) => (
                  <div
                    key={boxNum}
                    className="bg-white rounded p-2 shadow-sm flex flex-col"
                    style={{ aspectRatio: '120/85' }}
                  >
                    <div className="text-center text-[16px] font-bold text-black mb-2">
                      {boxNum}/{totalLabels}
                    </div>
                    <div className="flex-1 flex flex-col items-center justify-center text-center mb-2">
                      <div className="text-[14px] font-bold text-black mb-1">{clientNames.firstname}</div>
                      <div className="text-[14px] font-bold text-black mb-1">{clientNames.lastname}</div>
                      <div className={`text-[11px] font-bold px-2 py-1 rounded mb-1 ${
                        ticket.operationType === 'milling' 
                          ? 'bg-emerald-100 text-emerald-700' 
                          : 'bg-indigo-100 text-indigo-700'
                      }`}>
                        {ticket.operationType === 'milling' ? '🫒 عصر' : '💰 بيع'}
                      </div>
                      <div className="text-[11px] text-black">رقم: {ticketIdText}</div>
                      <div className="text-[11px] text-black">{new Date(ticket.dateReceived).toLocaleDateString('ar-TN')}</div>
                      {safeNetWeight > 0 && (
                        <div className="text-[12px] font-bold text-black mt-1">الوزن الصافي: {safeNetWeight.toFixed(2)} كلغ</div>
                      )}
                    </div>
                    <div className="flex items-center justify-center mt-2 pt-2 overflow-visible flex-1">
                      <QRCodeSVG value={qrCodeValue} size={80} level="H" includeMargin={false} />
                    </div>
                  </div>
                )) : (
                  <div className="col-span-full text-center text-gray-500 py-8">
                    لا توجد صناديق لطباعة الملصقات
                  </div>
                )}
              </div>
            )}

            {ticketType === 'exit-receipt' && (
              <div className="bg-white p-4 mx-auto text-gray-900" dir="rtl" style={{ width: '70mm', minHeight: '85mm' }}>
                {/* Big Title and Logo - Centered */}
                <div className="text-center mb-1">
                  <div className="flex justify-center mb-0.5">
                    <img 
                      src="/favicon.svg" 
                      alt="Logo" 
                      className="h-6 w-6"
                    />
                  </div>
                  <h2 className="text-[13px] font-bold text-emerald-700 leading-tight mb-0">معصرة الحاج لطفي</h2>
                  <p className="text-[13px] text-gray-600 leading-tight">إيصال نهائي - {ticket.operationType === 'milling' ? 'عصر' : 'بيع'}</p>
                </div>

                {/* Client Info */}
                <div className="flex flex-col text-center space-y-0.5 mb-1">
                  <div className="space-y-0">
                    <div className="text-[13px] text-gray-600 font-semibold">الاسم الأول</div>
                    <div className="font-bold text-[13px] text-gray-900 leading-tight">{clientNames.firstname}</div>
                  </div>
                  <div className="space-y-0">
                    <div className="text-[13px] text-gray-600 font-semibold">اسم العائلة</div>
                    <div className="font-bold text-[13px] text-gray-900 leading-tight">{clientNames.lastname}</div>
                  </div>
                  
                  {/* Operation Type Badge */}
                  <div className={`text-center py-1 rounded text-[13px] font-bold mt-0.5 ${ticket.operationType === 'sale' ? 'bg-purple-100 text-purple-700' : 'bg-emerald-100 text-emerald-700'}`}>
                    {ticket.operationType === 'milling' ? '🫒 عملية عصر' : '💰 عملية بيع'}
                  </div>
                  
                  {/* Net Weight */}
                  <div className="flex justify-between leading-tight bg-emerald-50 px-1.5 py-0.5 rounded text-[13px] mt-0.5">
                    <span className="font-bold">الوزن الصافي:</span>
                    <span className="text-emerald-700 font-bold">{safeNetWeight} كلغ</span>
                  </div>

                  {/* Total */}
                  <div className="flex justify-between leading-tight bg-blue-50 px-1.5 py-0.5 rounded text-[13px]">
                    <span className="font-bold">المبلغ الإجمالي:</span>
                    <span className="text-blue-700 font-bold">
                      {derivedTotalAmount > 0 
                        ? `${derivedTotalAmount.toFixed(3)} د.ت`
                        : computedTotal > 0 
                          ? `${computedTotal.toFixed(3)} د.ت`
                          : '— د.ت'}
                    </span>
                  </div>

                  {/* Payment State */}
                  <div className={`text-center py-0.5 rounded text-[13px] font-bold ${isPaid ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                    {isPaid ? '✅ مدفوع' : '⏳ غير مدفوع'}
                  </div>
                </div>

                {/* Spacer */}
                <div className="flex-1 min-h-[2mm]"></div>

                {/* Big QR Code in Center */}
                <div className="flex items-center justify-center py-1">
                  <QRCodeSVG value={qrCodeValue} size={70} level="H" includeMargin={false} />
                </div>

                {/* Cute Message to Client */}
                <div className="text-center pt-1">
                  <p className="text-[13px] text-gray-700 leading-tight font-medium">
                    🌿 شكراً لثقتكم بنا 🌿
                  </p>
                  <p className="text-[13px] text-gray-600 leading-tight mt-0">
                    نتمنى لكم تجربة ممتازة معنا
                  </p>
                  <p className="text-[13px] text-gray-500 leading-tight mt-0">
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
                      padding: '2mm',
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
                      marginBottom: '1mm',
                    }}>
                      <div style={{ marginBottom: '0.5mm' }}>
                        <img 
                          src="/favicon.svg" 
                          alt="Logo" 
                          style={{ height: '6mm', width: '6mm' }}
                        />
                      </div>
                      <h2 style={{ fontSize: '13px', fontWeight: 'bold', color: '#059669', margin: 0, lineHeight: 1.1, marginBottom: '0.2mm' }}>
                        معصرة الحاج لطفي
                      </h2>
                      <p style={{ fontSize: '13px', color: '#4b5563', margin: 0, lineHeight: 1.1 }}>إيصال الوصول</p>
                    </div>

                    {/* Client Info - Centered */}
                    <div style={{ 
                      display: 'flex', 
                      flexDirection: 'column', 
                      textAlign: 'center',
                      marginBottom: '1mm',
                      gap: '0.5mm',
                    }}>
                      <div style={{ gap: '0mm' }}>
                        <div style={{ fontSize: '13px', color: '#4b5563', fontWeight: 600, marginBottom: '0.2mm' }}>الاسم الأول</div>
                        <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#111827', lineHeight: 1.1 }}>{clientNames.firstname}</div>
                      </div>
                      <div style={{ gap: '0mm' }}>
                        <div style={{ fontSize: '13px', color: '#4b5563', fontWeight: 600, marginBottom: '0.2mm' }}>اسم العائلة</div>
                        <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#111827', lineHeight: 1.1 }}>{clientNames.lastname}</div>
                      </div>
                      <div style={{ fontSize: '13px', display: 'flex', justifyContent: 'space-between', lineHeight: 1.2, marginTop: '0.5mm' }}>
                        <span style={{ fontWeight: 'bold' }}>رقم التذكرة:</span>
                        <span style={{ fontWeight: 600 }}>{ticketIdText}</span>
                      </div>
                      <div style={{ fontSize: '13px', display: 'flex', justifyContent: 'space-between', lineHeight: 1.2 }}>
                        <span style={{ fontWeight: 'bold' }}>نوع العملية:</span>
                        <span style={{ fontWeight: 600 }}>{ticket.operationType === 'milling' ? 'عصر' : 'بيع'}</span>
                      </div>
                      <div style={{ fontSize: '13px', display: 'flex', justifyContent: 'space-between', lineHeight: 1.2 }}>
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
                      padding: '1mm 0',
                    }}>
                      <QRCodeSVG value={qrCodeValue} size={70} level="H" includeMargin={false} />
                    </div>

                    {/* Cute Message to Client */}
                    <div style={{
                      textAlign: 'center',
                      paddingTop: '1mm',
                    }}>
                      <p style={{ fontSize: '7pt', color: '#374151', margin: 0, lineHeight: 1.2, fontWeight: 500 }}>
                        🌿 شكراً لثقتكم بنا 🌿
                      </p>
                      <p style={{ fontSize: '6pt', color: '#4b5563', margin: '0.2mm 0 0 0', lineHeight: 1.2 }}>
                        نتمنى لكم تجربة ممتازة معنا
                      </p>
                      <p style={{ fontSize: '5pt', color: '#6b7280', margin: '0.2mm 0 0 0', lineHeight: 1.2 }}>
                        للاستفسار: يرجى الاتصال بنا
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {ticketType === 'box-labels' && totalLabels > 0 && labelsToPrint.map((boxNum) => (
                <div key={boxNum} className="print-page">
                  <div style={{
                    width: '100%',
                    height: '100%',
                    padding: '2mm',
                    boxSizing: 'border-box',
                    display: 'flex',
                    flexDirection: 'column',
                    fontFamily: 'Arial, sans-serif',
                    backgroundColor: 'white',
                    border: 'none',
                    overflow: 'visible',
                  }}>
                    <div style={{
                      textAlign: 'center',
                      fontSize: '24pt',
                      fontWeight: 'bold',
                      color: '#000',
                      marginBottom: '2mm',
                    }}>
                      {boxNum}/{totalLabels}
                    </div>
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      textAlign: 'center',
                      margin: '2mm 0',
                      flexShrink: 0,
                    }}>
                      <div style={{
                        fontSize: '16pt',
                        fontWeight: 'bold',
                        color: '#000',
                        marginBottom: '1mm',
                      }}>
                        {clientNames.firstname}
                      </div>
                      <div style={{
                        fontSize: '16pt',
                        fontWeight: 'bold',
                        color: '#000',
                        marginBottom: '1mm',
                      }}>
                        {clientNames.lastname}
                      </div>
                      <div style={{
                        fontSize: '14pt',
                        fontWeight: 'bold',
                        textAlign: 'center',
                        marginTop: '1mm',
                        marginBottom: '1mm',
                        padding: '2mm 4mm',
                        borderRadius: '2mm',
                        display: 'inline-block',
                        backgroundColor: ticket.operationType === 'milling' ? '#d1fae5' : '#e0e7ff',
                        color: ticket.operationType === 'milling' ? '#065f46' : '#3730a3',
                      }}>
                        {ticket.operationType === 'milling' ? '🫒 عصر' : '💰 بيع'}
                      </div>
                      <div style={{
                        fontSize: '11pt',
                        color: '#000',
                        marginTop: '1mm',
                      }}>
                        رقم: {ticketIdText}
                      </div>
                      <div style={{
                        fontSize: '11pt',
                        color: '#000',
                      }}>
                        {new Date(ticket.dateReceived).toLocaleDateString('ar-TN')}
                      </div>
                      {safeNetWeight > 0 && (
                        <div style={{
                          fontSize: '10pt',
                          fontWeight: 'bold',
                          color: '#000',
                          marginTop: '1mm',
                        }}>
                          الوزن الصافي: {safeNetWeight.toFixed(2)} كلغ
                        </div>
                      )}
                    </div>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginTop: '2mm',
                      paddingTop: '2mm',
                      width: '100%',
                      height: 'auto',
                      overflow: 'visible',
                      flex: 1,
                      alignSelf: 'center',
                      minHeight: '80px',
                    }}>
                      <QRCodeSVG value={qrCodeValue} size={80} level="H" includeMargin={false} />
                    </div>
                  </div>
                </div>
              ))}

              {ticketType === 'exit-receipt' && (
                <div className="print-page">
                  <div style={{
                    width: '100%',
                    height: '100%',
                    padding: '2mm',
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
                      marginBottom: '1mm',
                    }}>
                      <div style={{ marginBottom: '0.5mm', display: 'flex', justifyContent: 'center' }}>
                        <img 
                          src="/favicon.svg" 
                          alt="Logo" 
                          style={{ height: '6mm', width: '6mm' }}
                        />
                      </div>
                      <h2 style={{ fontSize: '13px', fontWeight: 'bold', color: '#059669', margin: 0, lineHeight: 1.1, marginBottom: '0.2mm' }}>
                        معصرة الحاج لطفي
                      </h2>
                      <p style={{ fontSize: '13px', color: '#4b5563', margin: 0, lineHeight: 1.1 }}>
                        إيصال نهائي - {ticket.operationType === 'milling' ? 'عصر' : 'بيع'}
                      </p>
                    </div>

                    {/* Client Info */}
                    <div style={{ 
                      display: 'flex', 
                      flexDirection: 'column', 
                      textAlign: 'center',
                      marginBottom: '1mm',
                      gap: '0.5mm',
                    }}>
                      <div style={{ gap: '0mm' }}>
                        <div style={{ fontSize: '13px', color: '#4b5563', fontWeight: 600, marginBottom: '0.2mm' }}>الاسم الأول</div>
                        <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#111827', lineHeight: 1.1 }}>{clientNames.firstname}</div>
                      </div>
                      <div style={{ gap: '0mm' }}>
                        <div style={{ fontSize: '13px', color: '#4b5563', fontWeight: 600, marginBottom: '0.2mm' }}>اسم العائلة</div>
                        <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#111827', lineHeight: 1.1 }}>{clientNames.lastname}</div>
                      </div>
                      
                      {/* Operation Type Badge */}
                      <div style={{
                        textAlign: 'center',
                        padding: '1mm',
                        borderRadius: '1mm',
                        marginTop: '0.5mm',
                        fontSize: '13px',
                        fontWeight: 'bold',
                        backgroundColor: ticket.operationType === 'sale' ? '#f3e8ff' : '#d1fae5',
                        color: ticket.operationType === 'sale' ? '#6b21a8' : '#065f46',
                      }}>
                        {ticket.operationType === 'milling' ? '🫒 عملية عصر' : '💰 عملية بيع'}
                      </div>
                      
                      {/* Net Weight */}
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        backgroundColor: '#ecfdf5',
                        padding: '1mm',
                        borderRadius: '1mm',
                        marginTop: '0.5mm',
                        lineHeight: 1.2,
                        fontSize: '13px',
                      }}>
                        <span style={{ fontWeight: 'bold' }}>الوزن الصافي:</span>
                        <span style={{ color: '#059669', fontWeight: 'bold' }}>{safeNetWeight} كلغ</span>
                      </div>

                      {/* Total */}
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        backgroundColor: '#eff6ff',
                        padding: '1mm',
                        borderRadius: '1mm',
                        lineHeight: 1.2,
                        fontSize: '13px',
                      }}>
                        <span style={{ fontWeight: 'bold' }}>المبلغ الإجمالي:</span>
                        <span style={{ color: '#2563eb', fontWeight: 'bold' }}>
                          {derivedTotalAmount > 0 
                            ? `${derivedTotalAmount.toFixed(3)} د.ت`
                            : computedTotal > 0 
                              ? `${computedTotal.toFixed(3)} د.ت`
                              : '— د.ت'}
                        </span>
                      </div>

                      {/* Payment State */}
                      <div style={{
                        textAlign: 'center',
                        padding: '1mm',
                        borderRadius: '1mm',
                        fontSize: '13px',
                        fontWeight: 'bold',
                        backgroundColor: isPaid ? '#dcfce7' : '#fed7aa',
                        color: isPaid ? '#166534' : '#9a3412',
                      }}>
                        {isPaid ? '✅ مدفوع' : '⏳ غير مدفوع'}
                      </div>
                    </div>

                    {/* Spacer */}
                    <div style={{ flex: 1, minHeight: '2mm' }}></div>

                    {/* Big QR Code in Center */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '1mm 0',
                    }}>
                      <QRCodeSVG value={qrCodeValue} size={70} level="H" includeMargin={false} />
                    </div>

                    {/* Cute Message to Client */}
                    <div style={{
                      textAlign: 'center',
                      paddingTop: '1mm',
                    }}>
                      <p style={{ fontSize: '13px', color: '#374151', margin: 0, lineHeight: 1.2, fontWeight: 500 }}>
                        🌿 شكراً لثقتكم بنا 🌿
                      </p>
                      <p style={{ fontSize: '13px', color: '#4b5563', margin: '0.2mm 0 0 0', lineHeight: 1.2 }}>
                        نتمنى لكم تجربة ممتازة معنا
                      </p>
                      <p style={{ fontSize: '13px', color: '#6b7280', margin: '0.2mm 0 0 0', lineHeight: 1.2 }}>
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
                {ticketType === 'box-labels' && (totalLabels > 0 ? `طباعة ${totalLabels} ملصقات` : 'طباعة ملصقات')}
                {ticketType === 'exit-receipt' && (numberOfBoxes > 0 
                  ? `طباعة إيصال الخروج و ${numberOfBoxes} ملصقات`
                  : 'طباعة إيصال الخروج')}
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