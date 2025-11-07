import React, { useRef, useEffect, useState } from 'react';
import { X, Printer, Minimize2 } from 'lucide-react';
import { OliveButton } from '@/components/ui/olive-button';
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
}

export function PrintTicketModal({
  isOpen,
  ticket,
  onPrint,
  onMinimize,
  onClose,
}: PrintTicketModalProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const [currentPrices, setCurrentPrices] = useState<any>(null);

  useEffect(() => {
    if (isOpen && ticketType === 'exit-receipt') {
      loadCurrentPrices();
    }
  }, [isOpen]);

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

  const PRINT_ROOT_ID = 'olive-print-root';

  const ticketType = !ticket ? 'box-labels' : 
    ticket.status === 'received' ? 'arrival-receipt' :
    ticket.status === 'completed' ? 'exit-receipt' :
    'box-labels';

  const getPageStyle = () => {
    // Use 70x120mm for arrival and exit receipts (taller), 58x43mm for box labels
    const isReceipt = ticketType === 'arrival-receipt' || ticketType === 'exit-receipt';
    const width = isReceipt ? '70mm' : '58mm';
    const height = isReceipt ? '120mm' : '43mm';
    
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
    onAfterPrint: onPrint,
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

  const buildLabelDocumentHtml = () => {
    const labelStyle = `
      @page {
        size: 58mm 43mm;
        margin: 0;
      }
      body {
        margin: 0;
        padding: 0;
        width: 58mm;
        background: white;
        direction: rtl;
      }
      .label-page {
        width: 58mm;
        height: 43mm;
        page-break-after: always;
        box-sizing: border-box;
        padding: 1.5mm;
        font-family: Arial, sans-serif;
        display: flex;
        flex-direction: row;
        position: relative;
        border: 1.2px solid #000;
        overflow: hidden;
      }
      .label-page:last-child {
        page-break-after: auto;
      }
      .label-index {
        position: absolute;
        top: 0;
        right: 0;
        font-size: 6pt;
        font-weight: bold;
        color: #000;
        background-color: #e5e7eb;
        padding: 0.5mm 1mm;
        border-bottom-left-radius: 1mm;
      }
      .label-qr {
        width: 26mm;
        display: flex;
        align-items: center;
        justify-content: center;
        padding-right: 1mm;
        border-right: 1px solid #000;
      }
      .label-details {
        flex: 1;
        display: flex;
        flex-direction: column;
        justify-content: center;
        padding-left: 1.5mm;
        text-align: right;
      }
      .label-title {
        font-size: 8pt;
        font-weight: 700;
        color: #000;
        line-height: 1.1;
        border-bottom: 1px solid #000;
        padding-bottom: 0.5mm;
        margin-bottom: 0.5mm;
      }
      .label-text {
        font-size: 6pt;
        color: #000;
        margin-bottom: 0.3mm;
      }
      .label-client {
        font-size: 7pt;
        font-weight: 600;
        color: #000;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        margin-bottom: 0.5mm;
      }
    `;

    const qrSvgMarkup = renderToStaticMarkup(
      <QRCodeSVG value={qrCodeValue} size={95} level="H" includeMargin={false} />
    );

    const labelsMarkup = labelsToPrint.map((boxNum) => `
      <div class="label-page">
        <div class="label-index">${boxNum}/${totalLabels}</div>
        <div class="label-qr">${qrSvgMarkup}</div>
        <div class="label-details">
          <div class="label-title">معصرة الحاج لطفي</div>
          <div class="label-client">${ticket?.clientName ?? ''}</div>
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

  const handleLabelPrint = () => {
    if (!ticket) {
      return;
    }

    const html = buildLabelDocumentHtml();
    printHtmlDocument(html);
  };

  const handlePrint = () => {
    if (ticketType === 'box-labels') {
      handleLabelPrint();
    } else {
      standardPrint();
    }
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
              <div className="bg-white border border-black p-2 mx-auto text-gray-900" dir="rtl" style={{ width: '70mm', height: '120mm' }}>
                <div className="text-center border-b border-emerald-600 pb-1 mb-2">
                  <h2 className="text-[12px] font-bold text-emerald-700 leading-none">معصرة الحاج لطفي</h2>
                  <p className="text-[8px] text-gray-600 leading-none">إيصال الوصول</p>
                </div>
                <div className="flex flex-col h-[calc(120mm-20mm)]">
                  <div className="flex-1 flex flex-col justify-start text-right space-y-1 mb-2">
                    <div className="flex justify-between leading-tight text-[9px]">
                      <span className="font-bold">رقم:</span>
                      <span className="font-semibold">{ticketIdText}</span>
                    </div>
                    <div className="flex justify-between leading-tight text-[9px]">
                      <span className="font-bold">نوع:</span>
                      <span>{ticket.operationType === 'milling' ? 'عصر' : 'بيع'}</span>
                    </div>
                    <div className="leading-tight border-b border-gray-300 pb-1 mb-1">
                      <span className="font-bold text-[14px]">{ticket.clientName}</span>
                    </div>
                    <div className="flex justify-between leading-tight text-[9px]">
                      <span className="font-bold">دخول:</span>
                      <span className="text-emerald-700 font-bold">{ticket.weightIn} كلغ</span>
                    </div>
                    {numberOfBidons > 0 && (
                      <div className="flex justify-between leading-tight bg-blue-50 px-1 rounded text-[9px]">
                        <span className="font-bold">بدونات:</span>
                        <span className="text-blue-700 font-bold">{numberOfBidons}</span>
                      </div>
                    )}
                    <div className="text-[7px] leading-tight text-gray-500">
                      {new Date(ticket.dateReceived).toLocaleDateString('ar-TN')}
                    </div>
                  </div>
                  <div className="flex items-center justify-center border-t border-black pt-2">
                    <QRCodeSVG value={qrCodeValue} size={140} level="H" includeMargin={false} />
                  </div>
                </div>
              </div>
            )}

            {ticketType === 'box-labels' && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                {labelsToPrint.map((boxNum) => (
                  <div
                    key={boxNum}
                    className="bg-white border border-black rounded p-2 shadow-sm relative"
                    style={{ aspectRatio: '58/43' }}
                  >
                    <div className="absolute top-0 right-0 text-[6px] font-bold text-black bg-gray-200 px-1 rounded-bl">
                      {boxNum}/{totalLabels}
                    </div>
                    <div className="h-full w-full flex">
                      <div className="w-1/2 flex items-center justify-center pr-1 border-r border-black">
                        <QRCodeSVG value={qrCodeValue} size={56} level="H" includeMargin={false} />
                      </div>
                      <div className="w-1/2 pl-1 flex flex-col justify-center text-right" dir="rtl">
                        <div className="text-[8px] font-bold text-black leading-none border-b border-black pb-0.5 mb-0.5">معصرة الحاج لطفي</div>
                        <div className="text-[7px] font-semibold text-black truncate leading-tight">{ticket.clientName}</div>
                        <div className="text-[6px] text-black leading-tight">رقم: {ticketIdText}</div>
                        <div className="text-[6px] text-black leading-tight">{new Date(ticket.dateReceived).toLocaleDateString('ar-TN')}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {ticketType === 'exit-receipt' && (
              <div className="bg-white border border-black p-2 mx-auto text-gray-900" dir="rtl" style={{ width: '70mm', height: '120mm' }}>
                <div className="text-center border-b border-emerald-600 pb-1 mb-2">
                  <h2 className="text-[12px] font-bold text-emerald-700 leading-none">معصرة الحاج لطفي</h2>
                  <p className="text-[8px] text-gray-600 leading-none">إيصال نهائي - {ticket.operationType === 'milling' ? 'عصر' : 'بيع'}</p>
                </div>
                <div className="flex flex-col h-[calc(120mm-20mm)]">
                  <div className="flex-1 flex flex-col justify-start text-right space-y-1 mb-2">
                    <div className="flex justify-between leading-tight text-[9px] font-bold border-b border-gray-300 pb-1">
                      <span>رقم: {ticketIdText}</span>
                      <span className="text-[7px]">{new Date(ticket.dateReceived).toLocaleDateString('ar-TN')}</span>
                    </div>
                    <div className="leading-tight font-bold text-[14px] mb-1">{ticket.clientName}</div>
                    
                    <div className="flex justify-between leading-tight text-[9px]">
                      <span>دخول:</span>
                      <span className="font-semibold">{ticket.weightIn} كلغ</span>
                    </div>
                    <div className="flex justify-between leading-tight text-[9px]">
                      <span>خروج:</span>
                      <span className="font-semibold">{weightOut} كلغ</span>
                    </div>
                    <div className="flex justify-between leading-tight bg-emerald-100 px-1 rounded text-[9px]">
                      <span className="font-bold">صافي:</span>
                      <span className="text-emerald-700 font-bold">{safeNetWeight} كلغ</span>
                    </div>
                    <div className="flex justify-between leading-tight text-[8px]">
                      <span>البدونات المجلوبة:</span>
                      <span className="font-bold text-blue-700">{numberOfBidons} بدون</span>
                    </div>
                    <div className="flex justify-between leading-tight text-[8px]">
                      <span>بدونات إضافية:</span>
                      <span className={additionalBidonsForClient > 0 ? 'font-bold text-orange-700' : 'font-bold text-gray-500'}>
                        {additionalBidonsForClient > 0 ? `+${additionalBidonsForClient}` : '+0'} بدون
                      </span>
                    </div>
                    <div className="flex justify-between leading-tight text-[7px]">
                      <span>تكلفة البدونات الإضافية:</span>
                      <span className={additionalBidonsForClient > 0 ? 'font-bold text-orange-700' : 'font-bold text-gray-500'}>
                        {additionalBidonsForClient > 0
                          ? `${additionalBidonsForClient}×${(currentPrices?.emptyBidonPrice || 0).toFixed(2)} = ${bidonCost.toFixed(3)} د.ت`
                          : '0.000 د.ت'}
                      </span>
                    </div>
                    
                    <div className="border-t border-emerald-600 pt-1 space-y-1 mt-1">
                      <div className="flex justify-between leading-tight text-[8px]">
                        <span>سعر/كلغ:</span>
                        <span className="font-bold">{derivedUnitPrice > 0 ? derivedUnitPrice.toFixed(3) : '—'}</span>
                      </div>
                      <div className="flex justify-between leading-tight text-[7px]">
                        <span>أساسي ({safeNetWeight}×{derivedUnitPrice.toFixed(2)}):</span>
                        <span className="font-semibold">{baseAmount > 0 ? baseAmount.toFixed(3) : '—'}</span>
                      </div>
                      {additionalBidonsForClient > 0 && (
                        <>
                          <div className="flex justify-between leading-tight bg-orange-50 px-1 rounded text-[7px]">
                            <span>بدونات إضافية:</span>
                            <span className="text-orange-700 font-bold">{additionalBidonsForClient} بدون</span>
                          </div>
                          <div className="flex justify-between leading-tight bg-orange-50 px-1 rounded text-[7px]">
                            <span>سعر ({additionalBidonsForClient}×{(currentPrices?.emptyBidonPrice || 0).toFixed(2)}):</span>
                            <span className="text-orange-700 font-bold">{bidonCost.toFixed(3)}</span>
                          </div>
                        </>
                      )}
                      <div className="flex justify-between leading-tight bg-emerald-100 px-1 rounded text-[9px]">
                        <span className="font-bold">مجموع:</span>
                        <span className="text-emerald-700 font-bold">{derivedTotalAmount > 0 ? derivedTotalAmount.toFixed(3) : '—'}</span>
                      </div>
                      <div className={`text-center text-[8px] font-bold ${ticket.isPaid ? 'text-green-700' : 'text-orange-700'}`}>
                        {ticket.isPaid ? '✅ مدفوع' : '⏳ غير مدفوع'}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-center border-t border-black pt-2">
                    <QRCodeSVG value={qrCodeValue} size={140} level="H" includeMargin={false} />
                  </div>
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
                    border: '1px solid #000',
                    direction: 'rtl',
                    display: 'flex',
                    flexDirection: 'column',
                  }}>
                    <div style={{
                      textAlign: 'center',
                      borderBottom: '1px solid #059669',
                      paddingBottom: '1mm',
                      marginBottom: '2mm',
                    }}>
                      <h2 style={{ fontSize: '12pt', fontWeight: 'bold', color: '#059669', margin: 0, lineHeight: 1 }}>
                        معصرة الحاج لطفي
                      </h2>
                      <p style={{ fontSize: '8pt', color: '#4b5563', margin: 0, lineHeight: 1 }}>إيصال الوصول</p>
                    </div>

                    <div style={{ 
                      flex: 1, 
                      display: 'flex', 
                      flexDirection: 'column', 
                      justifyContent: 'flex-start',
                      textAlign: 'right',
                      marginBottom: '2mm',
                    }}>
                      <div style={{ fontSize: '9pt', marginBottom: '1mm', lineHeight: 1.3 }}>
                        <span style={{ fontWeight: 'bold' }}>رقم: </span>
                        <span style={{ fontWeight: 600 }}>{ticketIdText}</span>
                      </div>
                      <div style={{ fontSize: '9pt', marginBottom: '1mm', lineHeight: 1.3 }}>
                        <span style={{ fontWeight: 'bold' }}>نوع: </span>
                        <span>{ticket.operationType === 'milling' ? 'عصر' : 'بيع'}</span>
                      </div>
                      <div style={{
                        fontSize: '14pt',
                        fontWeight: 'bold',
                        borderBottom: '1px solid #d1d5db',
                        paddingBottom: '1mm',
                        marginBottom: '1mm',
                        lineHeight: 1.3,
                      }}>
                        {ticket.clientName}
                      </div>
                      <div style={{ fontSize: '9pt', marginBottom: '1mm', lineHeight: 1.3 }}>
                        <span style={{ fontWeight: 'bold' }}>دخول: </span>
                        <span style={{ color: '#059669', fontWeight: 'bold' }}>{ticket.weightIn} كلغ</span>
                      </div>
                      {numberOfBidons > 0 && (
                        <div style={{
                          fontSize: '9pt',
                          backgroundColor: '#eff6ff',
                          padding: '1mm',
                          borderRadius: '1mm',
                          marginBottom: '1mm',
                          lineHeight: 1.3,
                        }}>
                          <span style={{ fontWeight: 'bold' }}>بدونات: </span>
                          <span style={{ color: '#2563eb', fontWeight: 'bold' }}>{numberOfBidons}</span>
                        </div>
                      )}
                      <div style={{ fontSize: '7pt', color: '#6b7280', lineHeight: 1.3 }}>
                        {new Date(ticket.dateReceived).toLocaleDateString('ar-TN')}
                      </div>
                    </div>

                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderTop: '1px solid #000',
                      paddingTop: '2mm',
                    }}>
                      <QRCodeSVG value={qrCodeValue} size={140} level="H" includeMargin={false} />
                    </div>
                  </div>
                </div>
              )}

              {ticketType === 'box-labels' && labelsToPrint.map((boxNum) => (
                <div key={boxNum} className="print-page">
                  <div style={{
                    width: '100%',
                    height: '100%',
                    padding: '1.5mm',
                    boxSizing: 'border-box',
                    display: 'flex',
                    flexDirection: 'row',
                    position: 'relative',
                    fontFamily: 'Arial, sans-serif',
                    backgroundColor: 'white',
                    border: '1.2px solid #000',
                  }}>
                    <div style={{
                      position: 'absolute',
                      top: '0',
                      right: '0',
                      fontSize: '6pt',
                      fontWeight: 'bold',
                      color: '#000',
                      backgroundColor: '#e5e7eb',
                      padding: '0.5mm 1mm',
                      borderBottomLeftRadius: '1mm',
                    }}>
                      {boxNum}/{totalLabels}
                    </div>
                    <div style={{
                      width: '26mm',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      paddingRight: '1mm',
                      borderRight: '1px solid #000',
                    }}>
                      <QRCodeSVG value={qrCodeValue} size={95} level="H" includeMargin={false} />
                    </div>
                    <div style={{
                      flex: 1,
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      paddingLeft: '1.5mm',
                    }} dir="rtl">
                      <div style={{
                        fontSize: '8pt',
                        fontWeight: 700,
                        color: '#000',
                        lineHeight: 1.1,
                        borderBottom: '1px solid #000',
                        paddingBottom: '0.5mm',
                        marginBottom: '0.5mm',
                        textAlign: 'right',
                      }}>
                        معصرة الحاج لطفي
                      </div>
                      <div style={{
                        fontSize: '7pt',
                        fontWeight: 600,
                        color: '#000',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        marginBottom: '0.5mm',
                        textAlign: 'right',
                      }}>
                        {ticket.clientName}
                      </div>
                      <div style={{
                        fontSize: '6.2pt',
                        color: '#000',
                        marginBottom: '0.3mm',
                        textAlign: 'right',
                      }}>
                        رقم: {ticketIdText}
                      </div>
                      <div style={{
                        fontSize: '6pt',
                        color: '#000',
                        textAlign: 'right',
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
                    padding: '2mm',
                    boxSizing: 'border-box',
                    fontFamily: 'Arial, sans-serif',
                    backgroundColor: 'white',
                    border: '1px solid #000',
                    direction: 'rtl',
                    display: 'flex',
                    flexDirection: 'column',
                  }}>
                    <div style={{
                      textAlign: 'center',
                      borderBottom: '1px solid #059669',
                      paddingBottom: '1mm',
                      marginBottom: '2mm',
                    }}>
                      <h2 style={{ fontSize: '12pt', fontWeight: 'bold', color: '#059669', margin: 0, lineHeight: 1 }}>
                        معصرة الحاج لطفي
                      </h2>
                      <p style={{ fontSize: '8pt', color: '#4b5563', margin: 0, lineHeight: 1 }}>
                        إيصال نهائي - {ticket.operationType === 'milling' ? 'عصر' : 'بيع'}
                      </p>
                    </div>

                    <div style={{ 
                      flex: 1, 
                      display: 'flex', 
                      flexDirection: 'column', 
                      justifyContent: 'flex-start',
                      textAlign: 'right',
                      marginBottom: '2mm',
                    }}>
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontWeight: 'bold',
                        borderBottom: '1px solid #d1d5db',
                        paddingBottom: '1mm',
                        marginBottom: '1mm',
                        lineHeight: 1.3,
                        fontSize: '9pt',
                      }}>
                        <span>رقم: {ticketIdText}</span>
                        <span style={{ fontSize: '7pt' }}>{new Date(ticket.dateReceived).toLocaleDateString('ar-TN')}</span>
                      </div>
                      <div style={{ fontWeight: 'bold', fontSize: '14pt', marginBottom: '1mm', lineHeight: 1.3 }}>
                        {ticket.clientName}
                      </div>
                      
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1mm', lineHeight: 1.3, fontSize: '9pt' }}>
                        <span>دخول:</span>
                        <span style={{ fontWeight: 600 }}>{ticket.weightIn} كلغ</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1mm', lineHeight: 1.3, fontSize: '9pt' }}>
                        <span>خروج:</span>
                        <span style={{ fontWeight: 600 }}>{weightOut} كلغ</span>
                      </div>
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        backgroundColor: '#ecfdf5',
                        padding: '1mm',
                        borderRadius: '1mm',
                        marginBottom: '1mm',
                        lineHeight: 1.3,
                        fontSize: '9pt',
                      }}>
                        <span style={{ fontWeight: 'bold' }}>صافي:</span>
                        <span style={{ color: '#059669', fontWeight: 'bold' }}>{safeNetWeight} كلغ</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1mm', lineHeight: 1.3, fontSize: '8pt' }}>
                        <span>البدونات المجلوبة:</span>
                        <span style={{ color: '#2563eb', fontWeight: 'bold' }}>{numberOfBidons} بدون</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1mm', lineHeight: 1.3, fontSize: '8pt' }}>
                        <span>بدونات إضافية:</span>
                        <span style={{ color: additionalBidonsForClient > 0 ? '#ea580c' : '#6b7280', fontWeight: 'bold' }}>
                          {additionalBidonsForClient > 0 ? `+${additionalBidonsForClient}` : '+0'} بدون
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1mm', lineHeight: 1.3, fontSize: '7pt' }}>
                        <span>تكلفة البدونات الإضافية:</span>
                        <span style={{ color: additionalBidonsForClient > 0 ? '#ea580c' : '#6b7280', fontWeight: 'bold' }}>
                          {additionalBidonsForClient > 0
                            ? `${additionalBidonsForClient}×${(currentPrices?.emptyBidonPrice || 0).toFixed(2)} = ${bidonCost.toFixed(3)} د.ت`
                            : '0.000 د.ت'}
                        </span>
                      </div>
                      
                      <div style={{ borderTop: '1px solid #059669', paddingTop: '1mm', marginTop: '1mm' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1mm', lineHeight: 1.3, fontSize: '8pt' }}>
                          <span>سعر/كلغ:</span>
                          <span style={{ fontWeight: 'bold' }}>{derivedUnitPrice > 0 ? derivedUnitPrice.toFixed(3) : '—'}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1mm', lineHeight: 1.3, fontSize: '7pt' }}>
                          <span>أساسي ({safeNetWeight}×{derivedUnitPrice.toFixed(2)}):</span>
                          <span style={{ fontWeight: 600 }}>{baseAmount > 0 ? baseAmount.toFixed(3) : '—'}</span>
                        </div>
                        {additionalBidonsForClient > 0 && (
                          <>
                            <div style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              backgroundColor: '#fff7ed',
                              padding: '1mm',
                              borderRadius: '1mm',
                              marginBottom: '1mm',
                              fontSize: '7pt',
                              lineHeight: 1.3,
                            }}>
                              <span>بدونات إضافية:</span>
                              <span style={{ color: '#ea580c', fontWeight: 'bold' }}>{additionalBidonsForClient} بدون</span>
                            </div>
                            <div style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              backgroundColor: '#fff7ed',
                              padding: '1mm',
                              borderRadius: '1mm',
                              marginBottom: '1mm',
                              fontSize: '7pt',
                              lineHeight: 1.3,
                            }}>
                              <span>سعر ({additionalBidonsForClient}×{(currentPrices?.emptyBidonPrice || 0).toFixed(2)}):</span>
                              <span style={{ color: '#ea580c', fontWeight: 'bold' }}>{bidonCost.toFixed(3)}</span>
                            </div>
                          </>
                        )}
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          backgroundColor: '#ecfdf5',
                          padding: '1mm',
                          borderRadius: '1mm',
                          marginBottom: '1mm',
                          lineHeight: 1.3,
                          fontSize: '9pt',
                        }}>
                          <span style={{ fontWeight: 'bold' }}>مجموع:</span>
                          <span style={{ color: '#059669', fontWeight: 'bold' }}>
                            {derivedTotalAmount > 0 ? derivedTotalAmount.toFixed(3) : '—'}
                          </span>
                        </div>
                        <div style={{
                          textAlign: 'center',
                          fontSize: '8pt',
                          fontWeight: 'bold',
                          color: ticket.isPaid ? '#10b981' : '#f97316',
                          lineHeight: 1.3,
                        }}>
                          {ticket.isPaid ? '✅ مدفوع' : '⏳ غير مدفوع'}
                        </div>
                      </div>
                    </div>

                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderTop: '1px solid #000',
                      paddingTop: '2mm',
                    }}>
                      <QRCodeSVG value={qrCodeValue} size={140} level="H" includeMargin={false} />
                    </div>
                  </div>
                </div>
              )}
              </div>
            </div>
          </div>

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
        </div>
      </div>
    </div>
  );
}