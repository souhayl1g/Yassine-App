import React, { useRef, useEffect, useState } from 'react';
import { X, Printer, Minimize2 } from 'lucide-react';
import { OliveButton } from '@/components/ui/olive-button';
import { Ticket } from '@/types/daily-work';
import { QRCodeSVG } from 'qrcode.react';
import { useReactToPrint } from 'react-to-print';
import { api } from '@/integrations/api/client';

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

  const ticketType = !ticket ? 'box-labels' : 
    ticket.status === 'received' ? 'arrival-receipt' :
    ticket.status === 'completed' ? 'exit-receipt' :
    'box-labels';

  const getPageStyle = () => `
    @page {
      size: 58mm 43mm;
      margin: 0;
    }
    @media print {
      html, body {
        margin: 0;
        padding: 0;
      }
      .print-page {
        width: 58mm !important;
        height: 43mm !important;
        page-break-after: always !important;
        break-after: page !important;
        overflow: hidden !important;
      }
      .print-page:last-child {
        page-break-after: auto !important;
        break-after: auto !important;
      }
    }
  `;

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Ticket-${ticket?.ticketNumber}`,
    pageStyle: getPageStyle(),
    onAfterPrint: onPrint,
  });

  if (!isOpen || !ticket) return null;

  const numberOfBoxes = ticket.numberOfBoxes || 0;
  const totalLabels = numberOfBoxes || 1;
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
              <div className="bg-white border border-black p-1 mx-auto text-gray-900" dir="rtl" style={{ width: '58mm', height: '43mm' }}>
                <div className="text-center border-b border-emerald-600 pb-0.5 mb-1">
                  <h2 className="text-[8px] font-bold text-emerald-700 leading-none">معصرة ياسين وأبوه</h2>
                  <p className="text-[5px] text-gray-600 leading-none">إيصال الوصول</p>
                </div>
                <div className="flex h-[calc(43mm-12mm)]">
                  <div className="w-1/2 flex items-center justify-center border-r border-black pr-0.5">
                    <QRCodeSVG value={qrCodeValue} size={50} level="H" includeMargin={false} />
                  </div>
                  <div className="w-1/2 pl-1 flex flex-col justify-center text-right text-[6px] space-y-0.5">
                    <div className="flex justify-between leading-tight">
                      <span className="font-bold">رقم:</span>
                      <span className="font-semibold">{ticketIdText}</span>
                    </div>
                    <div className="flex justify-between leading-tight">
                      <span className="font-bold">نوع:</span>
                      <span>{ticket.operationType === 'milling' ? 'عصر' : 'بيع'}</span>
                    </div>
                    <div className="leading-tight border-b border-gray-300 pb-0.5">
                      <span className="font-bold">{ticket.clientName}</span>
                    </div>
                    <div className="flex justify-between leading-tight">
                      <span className="font-bold">دخول:</span>
                      <span className="text-emerald-700 font-bold">{ticket.weightIn} كلغ</span>
                    </div>
                    {numberOfBidons > 0 && (
                      <div className="flex justify-between leading-tight bg-blue-50 px-0.5 rounded">
                        <span className="font-bold">بدونات:</span>
                        <span className="text-blue-700 font-bold">{numberOfBidons}</span>
                      </div>
                    )}
                    <div className="text-[4.5px] leading-tight text-gray-500">
                      {new Date(ticket.dateReceived).toLocaleDateString('ar-TN')}
                    </div>
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
                        <div className="text-[8px] font-bold text-black leading-none border-b border-black pb-0.5 mb-0.5">معصرة ياسين وأبوه</div>
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
              <div className="bg-white border border-black p-1 mx-auto text-gray-900" dir="rtl" style={{ width: '58mm', height: '43mm' }}>
                <div className="text-center border-b border-emerald-600 pb-0.5 mb-0.5">
                  <h2 className="text-[8px] font-bold text-emerald-700 leading-none">معصرة ياسين وأبوه</h2>
                  <p className="text-[5px] text-gray-600 leading-none">إيصال نهائي - {ticket.operationType === 'milling' ? 'عصر' : 'بيع'}</p>
                </div>
                <div className="flex h-[calc(43mm-9mm)]">
                  <div className="w-1/2 flex items-center justify-center border-r border-black pr-0.5">
                    <QRCodeSVG value={qrCodeValue} size={50} level="H" includeMargin={false} />
                  </div>
                  <div className="w-1/2 pl-1 flex flex-col justify-between text-right text-[5.5px]">
                    <div className="space-y-[1px]">
                      <div className="flex justify-between leading-tight font-bold border-b border-gray-300 pb-0.5">
                        <span>رقم: {ticketIdText}</span>
                        <span className="text-[4px]">{new Date(ticket.dateReceived).toLocaleDateString('ar-TN')}</span>
                      </div>
                      <div className="leading-tight font-bold text-[6px] truncate">{ticket.clientName}</div>
                      
                      <div className="flex justify-between leading-tight">
                        <span>دخول:</span>
                        <span className="font-semibold">{ticket.weightIn}</span>
                      </div>
                      <div className="flex justify-between leading-tight">
                        <span>خروج:</span>
                        <span className="font-semibold">{weightOut}</span>
                      </div>
                      <div className="flex justify-between leading-tight bg-emerald-100 px-0.5 rounded">
                        <span className="font-bold">صافي:</span>
                        <span className="text-emerald-700 font-bold">{safeNetWeight} كلغ</span>
                      </div>
                      <div className="flex justify-between leading-tight">
                        <span>البدونات المجلوبة:</span>
                        <span className="font-bold text-blue-700">{numberOfBidons} بدون</span>
                      </div>
                      <div className="flex justify-between leading-tight">
                        <span>بدونات إضافية:</span>
                        <span className={additionalBidonsForClient > 0 ? 'font-bold text-orange-700' : 'font-bold text-gray-500'}>
                          {additionalBidonsForClient > 0 ? `+${additionalBidonsForClient}` : '+0'} بدون
                        </span>
                      </div>
                      <div className="flex justify-between leading-tight">
                        <span>تكلفة البدونات الإضافية:</span>
                        <span className={additionalBidonsForClient > 0 ? 'font-bold text-orange-700' : 'font-bold text-gray-500'}>
                          {additionalBidonsForClient > 0
                            ? `${additionalBidonsForClient}×${(currentPrices?.emptyBidonPrice || 0).toFixed(2)} = ${bidonCost.toFixed(3)} د.ت`
                            : '0.000 د.ت'}
                        </span>
                      </div>
                    </div>
                    
                    <div className="border-t border-emerald-600 pt-0.5 space-y-[1px]">
                      <div className="flex justify-between leading-tight text-[5px]">
                        <span>سعر/كلغ:</span>
                        <span className="font-bold">{derivedUnitPrice > 0 ? derivedUnitPrice.toFixed(3) : '—'}</span>
                      </div>
                      <div className="flex justify-between leading-tight text-[4.5px]">
                        <span>أساسي ({safeNetWeight}×{derivedUnitPrice.toFixed(2)}):</span>
                        <span className="font-semibold">{baseAmount > 0 ? baseAmount.toFixed(3) : '—'}</span>
                      </div>
                      {additionalBidonsForClient > 0 && (
                        <>
                          <div className="flex justify-between leading-tight bg-orange-50 px-0.5 rounded text-[4.5px]">
                            <span>بدونات إضافية:</span>
                            <span className="text-orange-700 font-bold">{additionalBidonsForClient} بدون</span>
                          </div>
                          <div className="flex justify-between leading-tight bg-orange-50 px-0.5 rounded text-[4.5px]">
                            <span>سعر ({additionalBidonsForClient}×{(currentPrices?.emptyBidonPrice || 0).toFixed(2)}):</span>
                            <span className="text-orange-700 font-bold">{bidonCost.toFixed(3)}</span>
                          </div>
                        </>
                      )}
                      <div className="flex justify-between leading-tight bg-emerald-100 px-0.5 rounded">
                        <span className="font-bold">مجموع:</span>
                        <span className="text-emerald-700 font-bold text-[6px]">{derivedTotalAmount > 0 ? derivedTotalAmount.toFixed(3) : '—'}</span>
                      </div>
                      <div className={`text-center text-[4.5px] font-bold ${ticket.isPaid ? 'text-green-700' : 'text-orange-700'}`}>
                        {ticket.isPaid ? '✅ مدفوع' : '⏳ غير مدفوع'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div style={{ display: 'none' }}>
            <div ref={printRef}>
              {ticketType === 'arrival-receipt' && (
                <div className="print-page">
                  <div style={{
                    width: '100%',
                    height: '100%',
                    padding: '1mm',
                    boxSizing: 'border-box',
                    fontFamily: 'Arial, sans-serif',
                    backgroundColor: 'white',
                    border: '1px solid #000',
                    direction: 'rtl',
                  }}>
                    <div style={{
                      textAlign: 'center',
                      borderBottom: '1px solid #059669',
                      paddingBottom: '0.5mm',
                      marginBottom: '1mm',
                    }}>
                      <h2 style={{ fontSize: '8pt', fontWeight: 'bold', color: '#059669', margin: 0, lineHeight: 1 }}>
                        معصرة ياسين وأبوه
                      </h2>
                      <p style={{ fontSize: '5pt', color: '#4b5563', margin: 0, lineHeight: 1 }}>إيصال الوصول</p>
                    </div>

                    <div style={{ display: 'flex', height: 'calc(43mm - 10mm)' }}>
                      <div style={{
                        width: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRight: '1px solid #000',
                        paddingRight: '0.5mm',
                      }}>
                        <QRCodeSVG value={qrCodeValue} size={85} level="H" includeMargin={false} />
                      </div>
                      <div style={{
                        width: '50%',
                        paddingLeft: '1.5mm',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        textAlign: 'right',
                      }}>
                        <div style={{ fontSize: '6pt', marginBottom: '0.5mm', lineHeight: 1.2 }}>
                          <span style={{ fontWeight: 'bold' }}>رقم: </span>
                          <span style={{ fontWeight: 600 }}>{ticketIdText}</span>
                        </div>
                        <div style={{ fontSize: '6pt', marginBottom: '0.5mm', lineHeight: 1.2 }}>
                          <span style={{ fontWeight: 'bold' }}>نوع: </span>
                          <span>{ticket.operationType === 'milling' ? 'عصر' : 'بيع'}</span>
                        </div>
                        <div style={{
                          fontSize: '6pt',
                          fontWeight: 'bold',
                          borderBottom: '1px solid #d1d5db',
                          paddingBottom: '0.5mm',
                          marginBottom: '0.5mm',
                          lineHeight: 1.2,
                        }}>
                          {ticket.clientName}
                        </div>
                        <div style={{ fontSize: '6pt', marginBottom: '0.5mm', lineHeight: 1.2 }}>
                          <span style={{ fontWeight: 'bold' }}>دخول: </span>
                          <span style={{ color: '#059669', fontWeight: 'bold' }}>{ticket.weightIn} كلغ</span>
                        </div>
                        {numberOfBidons > 0 && (
                          <div style={{
                            fontSize: '6pt',
                            backgroundColor: '#eff6ff',
                            padding: '0.5mm',
                            borderRadius: '1mm',
                            marginBottom: '0.5mm',
                            lineHeight: 1.2,
                          }}>
                            <span style={{ fontWeight: 'bold' }}>بدونات: </span>
                            <span style={{ color: '#2563eb', fontWeight: 'bold' }}>{numberOfBidons}</span>
                          </div>
                        )}
                        <div style={{ fontSize: '4.5pt', color: '#6b7280', lineHeight: 1.2 }}>
                          {new Date(ticket.dateReceived).toLocaleDateString('ar-TN')}
                        </div>
                      </div>
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
                        معصرة ياسين وأبوه
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
                    padding: '1mm',
                    boxSizing: 'border-box',
                    fontFamily: 'Arial, sans-serif',
                    backgroundColor: 'white',
                    border: '1px solid #000',
                    direction: 'rtl',
                  }}>
                    <div style={{
                      textAlign: 'center',
                      borderBottom: '1px solid #059669',
                      paddingBottom: '0.5mm',
                      marginBottom: '0.5mm',
                    }}>
                      <h2 style={{ fontSize: '8pt', fontWeight: 'bold', color: '#059669', margin: 0, lineHeight: 1 }}>
                        معصرة ياسين وأبوه
                      </h2>
                      <p style={{ fontSize: '5pt', color: '#4b5563', margin: 0, lineHeight: 1 }}>
                        إيصال نهائي - {ticket.operationType === 'milling' ? 'عصر' : 'بيع'}
                      </p>
                    </div>

                    <div style={{ display: 'flex', height: 'calc(43mm - 9mm)' }}>
                      <div style={{
                        width: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRight: '1px solid #000',
                        paddingRight: '0.5mm',
                      }}>
                        <QRCodeSVG value={qrCodeValue} size={85} level="H" includeMargin={false} />
                      </div>
                      <div style={{
                        width: '50%',
                        paddingLeft: '1.5mm',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        textAlign: 'right',
                      }}>
                        <div style={{ fontSize: '5.5pt' }}>
                          <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            fontWeight: 'bold',
                            borderBottom: '0.5px solid #d1d5db',
                            paddingBottom: '0.5mm',
                            marginBottom: '0.5mm',
                            lineHeight: 1.2,
                          }}>
                            <span>رقم: {ticketIdText}</span>
                            <span style={{ fontSize: '4pt' }}>{new Date(ticket.dateReceived).toLocaleDateString('ar-TN')}</span>
                          </div>
                          <div style={{ fontWeight: 'bold', fontSize: '6pt', marginBottom: '0.5mm', lineHeight: 1.2 }}>
                            {ticket.clientName}
                          </div>
                          
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3mm', lineHeight: 1.2 }}>
                            <span>دخول:</span>
                            <span style={{ fontWeight: 600 }}>{ticket.weightIn}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3mm', lineHeight: 1.2 }}>
                            <span>خروج:</span>
                            <span style={{ fontWeight: 600 }}>{weightOut}</span>
                          </div>
                          <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            backgroundColor: '#ecfdf5',
                            padding: '0.5mm',
                            borderRadius: '0.5mm',
                            marginBottom: '0.5mm',
                            lineHeight: 1.2,
                          }}>
                            <span style={{ fontWeight: 'bold' }}>صافي:</span>
                            <span style={{ color: '#059669', fontWeight: 'bold' }}>{safeNetWeight} كلغ</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3mm', lineHeight: 1.2 }}>
                            <span>البدونات المجلوبة:</span>
                            <span style={{ color: '#2563eb', fontWeight: 'bold' }}>{numberOfBidons} بدون</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3mm', lineHeight: 1.2 }}>
                            <span>بدونات إضافية:</span>
                            <span style={{ color: additionalBidonsForClient > 0 ? '#ea580c' : '#6b7280', fontWeight: 'bold' }}>
                              {additionalBidonsForClient > 0 ? `+${additionalBidonsForClient}` : '+0'} بدون
                            </span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3mm', lineHeight: 1.2 }}>
                            <span>تكلفة البدونات الإضافية:</span>
                            <span style={{ color: additionalBidonsForClient > 0 ? '#ea580c' : '#6b7280', fontWeight: 'bold' }}>
                              {additionalBidonsForClient > 0
                                ? `${additionalBidonsForClient}×${(currentPrices?.emptyBidonPrice || 0).toFixed(2)} = ${bidonCost.toFixed(3)} د.ت`
                                : '0.000 د.ت'}
                            </span>
                          </div>
                        </div>
                        
                        <div style={{ borderTop: '1px solid #059669', paddingTop: '0.5mm', fontSize: '5pt' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3mm', lineHeight: 1.2 }}>
                            <span>سعر/كلغ:</span>
                            <span style={{ fontWeight: 'bold' }}>{derivedUnitPrice > 0 ? derivedUnitPrice.toFixed(3) : '—'}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3mm', lineHeight: 1.2, fontSize: '4.5pt' }}>
                            <span>أساسي ({safeNetWeight}×{derivedUnitPrice.toFixed(2)}):</span>
                            <span style={{ fontWeight: 600 }}>{baseAmount > 0 ? baseAmount.toFixed(3) : '—'}</span>
                          </div>
                          {additionalBidonsForClient > 0 && (
                            <>
                              <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                backgroundColor: '#fff7ed',
                                padding: '0.5mm',
                                borderRadius: '0.5mm',
                                marginBottom: '0.3mm',
                                fontSize: '4.5pt',
                                lineHeight: 1.2,
                              }}>
                                <span>بدونات إضافية:</span>
                                <span style={{ color: '#ea580c', fontWeight: 'bold' }}>{additionalBidonsForClient} بدون</span>
                              </div>
                              <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                backgroundColor: '#fff7ed',
                                padding: '0.5mm',
                                borderRadius: '0.5mm',
                                marginBottom: '0.3mm',
                                fontSize: '4.5pt',
                                lineHeight: 1.2,
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
                            padding: '0.5mm',
                            borderRadius: '0.5mm',
                            marginBottom: '0.3mm',
                            lineHeight: 1.2,
                          }}>
                            <span style={{ fontWeight: 'bold' }}>مجموع:</span>
                            <span style={{ color: '#059669', fontWeight: 'bold', fontSize: '6pt' }}>
                              {derivedTotalAmount > 0 ? derivedTotalAmount.toFixed(3) : '—'}
                            </span>
                          </div>
                          <div style={{
                            textAlign: 'center',
                            fontSize: '4.5pt',
                            fontWeight: 'bold',
                            color: ticket.isPaid ? '#10b981' : '#f97316',
                            lineHeight: 1.2,
                          }}>
                            {ticket.isPaid ? '✅ مدفوع' : '⏳ غير مدفوع'}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
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