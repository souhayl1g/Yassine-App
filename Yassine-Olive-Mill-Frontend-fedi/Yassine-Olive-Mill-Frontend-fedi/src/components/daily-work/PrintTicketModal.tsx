import React, { useRef } from 'react';
import { X, Printer, Minimize2 } from 'lucide-react';
import { OliveButton } from '@/components/ui/olive-button';
import { Ticket } from '@/types/daily-work';
import { QRCodeSVG } from 'qrcode.react';
import { useReactToPrint } from 'react-to-print';

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

  // Determine ticket type based on status
  const ticketType = !ticket ? 'box-labels' : 
    ticket.status === 'received' ? 'arrival-receipt' :
    ticket.status === 'completed' ? 'exit-receipt' :
    'box-labels';

  const getPageStyle = () => {
    if (ticketType === 'box-labels') {
      return `
        @page {
          size: 58mm 43mm;
          margin: 0;
        }
        @media print {
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            margin: 0;
            padding: 0;
          }
          .page-break {
            page-break-after: always;
          }
        }
      `;
    } else {
      // A5 size for arrival receipt and A4 for exit receipt
      const size = ticketType === 'arrival-receipt' ? '148mm 210mm' : '210mm 297mm';
      return `
        @page {
          size: ${size};
          margin: 10mm;
        }
        @media print {
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      `;
    }
  };

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Ticket-${ticket?.ticketNumber}`,
    pageStyle: getPageStyle(),
    onAfterPrint: onPrint,
  });

  if (!isOpen || !ticket) return null;

  // Generate array of box numbers (1 to numberOfBoxes)
  const numberOfBoxes = ticket.numberOfBoxes || 0;
  // We always print exactly 5 labels with numbering 1/5 .. 5/5
  const totalLabels = 5;
  const labelsToPrint = Array.from({ length: totalLabels }, (_, i) => i + 1);
  const ticketIdText = ticket.ticketNumber ?? String(ticket.id);
  // Use the same payload as the app-wide QR (JSON with key fields)
  const qrCodeValue = JSON.stringify({
    ticketId: ticket.id,
    ticketNumber: ticket.ticketNumber,
    clientName: ticket.clientName,
    weightIn: ticket.weightIn,
    dateReceived: ticket.dateReceived,
  });

  // Determine modal title and description based on ticket type
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
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-emerald-600 to-green-600 text-white p-6 rounded-t-xl flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black mb-1">{getModalTitle()}</h2>
            <p className="text-emerald-100 text-sm">
              {getModalDescription()}
            </p>
          </div>
          <button
            onClick={onClose}
            className="bg-white/20 hover:bg-white/30 rounded-full p-2 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Preview Section */}
        <div className="p-6">
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 mb-6">
            <h3 className="font-bold text-gray-800 dark:text-gray-200 mb-3 flex items-center gap-2">
              👁️ معاينة
            </h3>

            {/* TYPE 1: Arrival Receipt Preview */}
            {ticketType === 'arrival-receipt' && (
              <div className="bg-white border-2 border-black rounded-lg p-6 max-w-md mx-auto" dir="rtl">
                <div className="text-center border-b-2 border-emerald-600 pb-3 mb-4">
                  <h2 className="text-2xl font-bold text-emerald-700">معصرة ياسين وأبوه</h2>
                  <p className="text-sm text-gray-600">إيصال الوصول</p>
                </div>
                <div className="flex justify-center mb-4">
                  <QRCodeSVG value={qrCodeValue} size={120} level="H" />
                </div>
                <div className="space-y-2 text-right">
                  <div className="flex justify-between border-b pb-2">
                    <span className="font-bold">رقم التذكرة:</span>
                    <span>{ticketIdText}</span>
                  </div>
                  <div className="flex justify-between border-b pb-2">
                    <span className="font-bold">اسم العميل:</span>
                    <span>{ticket.clientName}</span>
                  </div>
                  <div className="flex justify-between border-b pb-2">
                    <span className="font-bold">الوزن عند الدخول:</span>
                    <span>{ticket.weightIn} كلغ</span>
                  </div>
                  <div className="flex justify-between border-b pb-2">
                    <span className="font-bold">تاريخ الوصول:</span>
                    <span>{new Date(ticket.dateReceived).toLocaleString('ar-TN')}</span>
                  </div>
                </div>
                <div className="mt-4 text-center text-xs text-gray-500">
                  يرجى الاحتفاظ بهذا الإيصال
                </div>
              </div>
            )}

            {/* TYPE 2: Box Labels Preview */}
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

            {/* TYPE 3: Exit Receipt Preview */}
            {ticketType === 'exit-receipt' && (
              <div className="bg-white border-2 border-black rounded-lg p-8 max-w-2xl mx-auto" dir="rtl">
                <div className="text-center border-b-4 border-emerald-600 pb-4 mb-6">
                  <h1 className="text-4xl font-bold text-emerald-700 mb-2">معصرة ياسين وأبوه</h1>
                  <p className="text-xl text-gray-700">إيصال نهائي</p>
                </div>
                <div className="grid grid-cols-2 gap-6 mb-6">
                  <div className="space-y-3">
                    <div className="bg-emerald-50 p-3 rounded">
                      <p className="text-sm text-gray-600">رقم التذكرة</p>
                      <p className="text-xl font-bold">{ticketIdText}</p>
                    </div>
                    <div className="bg-emerald-50 p-3 rounded">
                      <p className="text-sm text-gray-600">اسم العميل</p>
                      <p className="text-xl font-bold">{ticket.clientName}</p>
                    </div>
                    <div className="bg-emerald-50 p-3 rounded">
                      <p className="text-sm text-gray-600">التاريخ</p>
                      <p className="text-lg">{new Date(ticket.dateReceived).toLocaleDateString('ar-TN')}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-center">
                    <QRCodeSVG value={qrCodeValue} size={150} level="H" />
                  </div>
                </div>
                <div className="border-t-2 border-gray-300 pt-4 space-y-3">
                  <div className="bg-gray-50 p-3 rounded mb-3">
                    <p className="text-sm text-gray-600 mb-2">نوع العملية</p>
                    <p className="text-lg font-bold">
                      {ticket.operationType === 'milling' ? '🫒 عصر' : '🛒 بيع'}
                    </p>
                  </div>
                  <div className="flex justify-between text-lg border-b pb-2">
                    <span className="font-bold">الوزن عند الدخول:</span>
                    <span className="text-emerald-700">{ticket.weightIn} كلغ</span>
                  </div>
                  <div className="flex justify-between text-lg border-b pb-2">
                    <span className="font-bold">الوزن عند الخروج:</span>
                    <span className="text-emerald-700">{ticket.weightOut || 0} كلغ</span>
                  </div>
                  <div className="flex justify-between text-xl border-b-2 border-emerald-600 pb-2">
                    <span className="font-bold">الوزن الصافي:</span>
                    <span className="text-emerald-700 font-bold">{ticket.netWeight || 0} كلغ</span>
                  </div>
                  <div className="flex justify-between text-lg border-b pb-2">
                    <span className="font-bold">عدد الصناديق:</span>
                    <span>{ticket.numberOfBoxes}</span>
                  </div>
                  
                  {/* Pricing Section */}
                  {ticket.unitPrice && (
                    <>
                      <div className="border-t-2 border-emerald-600 pt-3 mt-3">
                        <div className="flex justify-between text-lg border-b pb-2 bg-emerald-50 px-3 py-2 rounded">
                          <span className="font-bold">السعر للكيلوغرام:</span>
                          <span className="text-emerald-700 font-bold">{ticket.unitPrice.toFixed(3)} د.ت</span>
                        </div>
                        <div className="flex justify-between text-2xl border-b-2 border-emerald-600 pb-2 mt-2 bg-emerald-100 px-3 py-3 rounded">
                          <span className="font-bold">المبلغ الإجمالي:</span>
                          <span className="text-emerald-700 font-bold">{(ticket.totalAmount || 0).toFixed(3)} د.ت</span>
                        </div>
                        {ticket.isPaid && (
                          <div className="mt-2 text-center bg-green-100 border-2 border-green-500 rounded px-3 py-2">
                            <span className="text-green-700 font-bold">✅ مدفوع</span>
                            {ticket.paymentMethod && (
                              <span className="text-sm text-gray-600 mr-2">
                                ({ticket.paymentMethod === 'cash' ? 'نقداً' : ticket.paymentMethod})
                              </span>
                            )}
                          </div>
                        )}
                        {!ticket.isPaid && (
                          <div className="mt-2 text-center bg-orange-100 border-2 border-orange-500 rounded px-3 py-2">
                            <span className="text-orange-700 font-bold">⏳ غير مدفوع</span>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
                <div className="mt-6 bg-emerald-50 p-4 rounded-lg text-center border-2 border-emerald-200">
                  <p className="text-lg font-semibold text-emerald-800 mb-2">🌿 شكراً لثقتكم بنا 🌿</p>
                  <p className="text-sm text-gray-700">نتمنى لكم موسماً مباركاً وزيتاً عالي الجودة</p>
                  <p className="text-xs text-gray-600 mt-2">معصرة ياسين وأبوه - جودة وثقة منذ سنوات</p>
                </div>
              </div>
            )}
          </div>

          {/* Print Content (Hidden) */}
          <div style={{ display: 'none' }}>
            <div ref={printRef}>
              {/* TYPE 1: Arrival Receipt Print */}
              {ticketType === 'arrival-receipt' && (
                <div
                  style={{
                    fontFamily: 'Arial, sans-serif',
                    padding: '15mm',
                    direction: 'rtl',
                  }}
                >
                  <div
                    style={{
                      textAlign: 'center',
                      borderBottom: '3px solid #059669',
                      paddingBottom: '8mm',
                      marginBottom: '10mm',
                    }}
                  >
                    <h1 style={{ fontSize: '28pt', fontWeight: 'bold', color: '#059669', margin: '0 0 3mm 0' }}>
                      معصرة ياسين وأبوه
                    </h1>
                    <p style={{ fontSize: '14pt', color: '#4b5563', margin: 0 }}>إيصال الوصول</p>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '10mm' }}>
                    <QRCodeSVG value={qrCodeValue} size={150} level="H" />
                  </div>

                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14pt' }}>
                    <tr>
                      <td style={{ padding: '4mm', borderBottom: '1px solid #d1d5db', fontWeight: 'bold', width: '40%' }}>
                        رقم التذكرة:
                      </td>
                      <td style={{ padding: '4mm', borderBottom: '1px solid #d1d5db', textAlign: 'left' }}>
                        {ticketIdText}
                      </td>
                    </tr>
                    <tr>
                      <td style={{ padding: '4mm', borderBottom: '1px solid #d1d5db', fontWeight: 'bold' }}>
                        اسم العميل:
                      </td>
                      <td style={{ padding: '4mm', borderBottom: '1px solid #d1d5db', textAlign: 'left' }}>
                        {ticket.clientName}
                      </td>
                    </tr>
                    <tr>
                      <td style={{ padding: '4mm', borderBottom: '1px solid #d1d5db', fontWeight: 'bold' }}>
                        الوزن عند الدخول:
                      </td>
                      <td style={{ padding: '4mm', borderBottom: '1px solid #d1d5db', textAlign: 'left', color: '#059669', fontWeight: 'bold' }}>
                        {ticket.weightIn} كلغ
                      </td>
                    </tr>
                    <tr>
                      <td style={{ padding: '4mm', borderBottom: '1px solid #d1d5db', fontWeight: 'bold' }}>
                        تاريخ الوصول:
                      </td>
                      <td style={{ padding: '4mm', borderBottom: '1px solid #d1d5db', textAlign: 'left' }}>
                        {new Date(ticket.dateReceived).toLocaleString('ar-TN')}
                      </td>
                    </tr>
                  </table>

                  <div
                    style={{
                      marginTop: '15mm',
                      textAlign: 'center',
                      fontSize: '11pt',
                      color: '#6b7280',
                      padding: '5mm',
                      border: '1px dashed #d1d5db',
                      borderRadius: '2mm',
                    }}
                  >
                    <p style={{ margin: 0 }}>يرجى الاحتفاظ بهذا الإيصال وتسليمه للماسح الضوئي</p>
                  </div>
                </div>
              )}

              {/* TYPE 2: Box Labels Print */}
              {ticketType === 'box-labels' && labelsToPrint.map((boxNum) => (
                <div
                  key={boxNum}
                  className={boxNum < totalLabels ? 'page-break' : ''}
                  style={{
                    width: '58mm',
                    height: '43mm',
                    padding: '1.5mm',
                    boxSizing: 'border-box',
                    display: 'flex',
                    flexDirection: 'row',
                    position: 'relative',
                    fontFamily: 'Arial, sans-serif',
                    backgroundColor: 'white',
                    border: '1.2px solid #000',
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      top: '0',
                      right: '0',
                      fontSize: '6pt',
                      fontWeight: 'bold',
                      color: '#000',
                      backgroundColor: '#e5e7eb',
                      padding: '0.5mm 1mm',
                      borderBottomLeftRadius: '1mm',
                    }}
                  >
                    {boxNum}/{totalLabels}
                  </div>
                  <div
                    style={{
                      width: '26mm',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      paddingRight: '1mm',
                      borderRight: '1px solid #000',
                    }}
                  >
                    <QRCodeSVG value={qrCodeValue} size={95} level="H" includeMargin={false} />
                  </div>
                  <div
                    style={{
                      flex: 1,
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      paddingLeft: '1.5mm',
                    }}
                    dir="rtl"
                  >
                    <div
                      style={{
                        fontSize: '8pt',
                        fontWeight: 700,
                        color: '#000',
                        lineHeight: 1.1,
                        borderBottom: '1px solid #000',
                        paddingBottom: '0.5mm',
                        marginBottom: '0.5mm',
                        textAlign: 'right',
                      }}
                    >
                      معصرة ياسين وأبوه
                    </div>
                    <div
                      style={{
                        fontSize: '7pt',
                        fontWeight: 600,
                        color: '#000',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        marginBottom: '0.5mm',
                        textAlign: 'right',
                      }}
                    >
                      {ticket.clientName}
                    </div>
                    <div
                      style={{
                        fontSize: '6.2pt',
                        color: '#000',
                        marginBottom: '0.3mm',
                        textAlign: 'right',
                      }}
                    >
                      رقم: {ticketIdText}
                    </div>
                    <div
                      style={{
                        fontSize: '6pt',
                        color: '#000',
                        textAlign: 'right',
                      }}
                    >
                      {new Date(ticket.dateReceived).toLocaleDateString('ar-TN')}
                    </div>
                  </div>
                </div>
              ))}

              {/* TYPE 3: Exit Receipt Print */}
              {ticketType === 'exit-receipt' && (
                <div
                  style={{
                    fontFamily: 'Arial, sans-serif',
                    padding: '15mm',
                    direction: 'rtl',
                  }}
                >
                  <div
                    style={{
                      textAlign: 'center',
                      borderBottom: '4px solid #059669',
                      paddingBottom: '10mm',
                      marginBottom: '12mm',
                    }}
                  >
                    <h1 style={{ fontSize: '36pt', fontWeight: 'bold', color: '#059669', margin: '0 0 4mm 0' }}>
                      معصرة ياسين وأبوه
                    </h1>
                    <p style={{ fontSize: '18pt', color: '#374151', margin: 0, fontWeight: 600 }}>إيصال نهائي</p>
                  </div>

                  <div style={{ display: 'flex', gap: '10mm', marginBottom: '12mm' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ backgroundColor: '#ecfdf5', padding: '5mm', marginBottom: '4mm', borderRadius: '2mm' }}>
                        <p style={{ fontSize: '11pt', color: '#6b7280', margin: '0 0 2mm 0' }}>رقم التذكرة</p>
                        <p style={{ fontSize: '20pt', fontWeight: 'bold', margin: 0 }}>{ticketIdText}</p>
                      </div>
                      <div style={{ backgroundColor: '#ecfdf5', padding: '5mm', marginBottom: '4mm', borderRadius: '2mm' }}>
                        <p style={{ fontSize: '11pt', color: '#6b7280', margin: '0 0 2mm 0' }}>اسم العميل</p>
                        <p style={{ fontSize: '18pt', fontWeight: 'bold', margin: 0 }}>{ticket.clientName}</p>
                      </div>
                      <div style={{ backgroundColor: '#ecfdf5', padding: '5mm', borderRadius: '2mm' }}>
                        <p style={{ fontSize: '11pt', color: '#6b7280', margin: '0 0 2mm 0' }}>التاريخ</p>
                        <p style={{ fontSize: '14pt', margin: 0 }}>{new Date(ticket.dateReceived).toLocaleDateString('ar-TN')}</p>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '5mm' }}>
                      <QRCodeSVG value={qrCodeValue} size={180} level="H" />
                    </div>
                  </div>

                  <div style={{ backgroundColor: '#f9fafb', padding: '5mm', marginBottom: '5mm', borderRadius: '2mm' }}>
                    <p style={{ fontSize: '14pt', color: '#6b7280', margin: '0 0 2mm 0' }}>نوع العملية</p>
                    <p style={{ fontSize: '18pt', fontWeight: 'bold', margin: 0 }}>
                      {ticket.operationType === 'milling' ? '🫒 عصر' : '🛒 بيع'}
                    </p>
                  </div>

                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '16pt', marginBottom: '10mm' }}>
                    <tr>
                      <td style={{ padding: '5mm', borderBottom: '1px solid #d1d5db', fontWeight: 'bold' }}>
                        الوزن عند الدخول:
                      </td>
                      <td style={{ padding: '5mm', borderBottom: '1px solid #d1d5db', textAlign: 'left', color: '#059669', fontWeight: 'bold' }}>
                        {ticket.weightIn} كلغ
                      </td>
                    </tr>
                    <tr>
                      <td style={{ padding: '5mm', borderBottom: '1px solid #d1d5db', fontWeight: 'bold' }}>
                        الوزن عند الخروج:
                      </td>
                      <td style={{ padding: '5mm', borderBottom: '1px solid #d1d5db', textAlign: 'left', color: '#059669', fontWeight: 'bold' }}>
                        {ticket.weightOut || 0} كلغ
                      </td>
                    </tr>
                    <tr>
                      <td style={{ padding: '5mm', borderBottom: '2px solid #059669', fontWeight: 'bold', fontSize: '18pt' }}>
                        الوزن الصافي:
                      </td>
                      <td style={{ padding: '5mm', borderBottom: '2px solid #059669', textAlign: 'left', color: '#059669', fontWeight: 'bold', fontSize: '20pt' }}>
                        {ticket.netWeight || 0} كلغ
                      </td>
                    </tr>
                    <tr>
                      <td style={{ padding: '5mm', borderBottom: '1px solid #d1d5db', fontWeight: 'bold' }}>
                        عدد الصناديق:
                      </td>
                      <td style={{ padding: '5mm', borderBottom: '1px solid #d1d5db', textAlign: 'left', fontWeight: 'bold' }}>
                        {ticket.numberOfBoxes}
                      </td>
                    </tr>
                  </table>

                  {/* Pricing Section for Print */}
                  {ticket.unitPrice && (
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '16pt', marginBottom: '10mm', border: '2px solid #059669', borderRadius: '2mm' }}>
                      <tr style={{ backgroundColor: '#ecfdf5' }}>
                        <td style={{ padding: '5mm', borderBottom: '1px solid #059669', fontWeight: 'bold' }}>
                          السعر للكيلوغرام:
                        </td>
                        <td style={{ padding: '5mm', borderBottom: '1px solid #059669', textAlign: 'left', color: '#059669', fontWeight: 'bold' }}>
                          {ticket.unitPrice.toFixed(3)} د.ت
                        </td>
                      </tr>
                      <tr style={{ backgroundColor: '#d1fae5' }}>
                        <td style={{ padding: '6mm', fontWeight: 'bold', fontSize: '20pt' }}>
                          المبلغ الإجمالي:
                        </td>
                        <td style={{ padding: '6mm', textAlign: 'left', color: '#059669', fontWeight: 'bold', fontSize: '22pt' }}>
                          {(ticket.totalAmount || 0).toFixed(3)} د.ت
                        </td>
                      </tr>
                    </table>
                  )}

                  {/* Payment Status */}
                  {ticket.unitPrice && (
                    <div style={{ marginBottom: '10mm', textAlign: 'center' }}>
                      {ticket.isPaid ? (
                        <div style={{ backgroundColor: '#d1fae5', border: '3px solid #10b981', padding: '5mm', borderRadius: '2mm' }}>
                          <p style={{ fontSize: '18pt', fontWeight: 'bold', color: '#10b981', margin: 0 }}>
                            ✅ مدفوع
                          </p>
                          {ticket.paymentMethod && (
                            <p style={{ fontSize: '12pt', color: '#6b7280', margin: '2mm 0 0 0' }}>
                              الطريقة: {ticket.paymentMethod === 'cash' ? 'نقداً' : ticket.paymentMethod}
                            </p>
                          )}
                        </div>
                      ) : (
                        <div style={{ backgroundColor: '#fed7aa', border: '3px solid #f97316', padding: '5mm', borderRadius: '2mm' }}>
                          <p style={{ fontSize: '18pt', fontWeight: 'bold', color: '#f97316', margin: 0 }}>
                            ⏳ غير مدفوع
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  <div
                    style={{
                      backgroundColor: '#ecfdf5',
                      padding: '8mm',
                      borderRadius: '3mm',
                      textAlign: 'center',
                      border: '2px solid #059669',
                    }}
                  >
                    <p style={{ fontSize: '18pt', fontWeight: 'bold', color: '#059669', margin: '0 0 3mm 0' }}>
                      🌿 شكراً لثقتكم بنا 🌿
                    </p>
                    <p style={{ fontSize: '14pt', color: '#374151', margin: '0 0 3mm 0' }}>
                      نتمنى لكم موسماً مباركاً وزيتاً عالي الجودة
                    </p>
                    <p style={{ fontSize: '11pt', color: '#6b7280', margin: 0 }}>
                      معصرة ياسين وأبوه - جودة وثقة منذ سنوات
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
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
