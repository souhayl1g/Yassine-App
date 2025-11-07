# Epson TM-T20X Thermal Printer Integration

Complete end-to-end integration for printing receipts from React frontend to Epson TM-T20X thermal printer over Ethernet.

## 📋 Overview

This integration allows your React application to send print jobs directly to an Epson TM-T20X thermal printer connected via Ethernet (TCP/IP). The system uses a Node.js/Express backend to communicate with the printer using ESC/POS commands.

## 🔧 Hardware Setup

### Printer Details
- **Model**: Epson TM-T20X (M352A)
- **Connection**: Ethernet (TCP/IP)
- **Default Port**: 9100
- **Paper Width**: 80mm (or 58mm depending on configuration)

### Network Configuration

1. **Connect the printer to your local network** via Ethernet cable
2. **Configure printer network settings**:
   - Access printer configuration (check Epson manual)
   - Set a static IP address (recommended): e.g., `192.168.1.81`
   - Or use DHCP and note the assigned IP
3. **Test network connectivity**: Ping the printer from your computer
   ```bash
   ping 192.168.1.81
   ```

## 🚀 Backend Setup

### 1. Installation

No additional npm packages required! The backend uses Node.js built-in `net` module for TCP/IP communication.

### 2. Files Created

- **Controller**: `controllers/printerController.js` - Handles printer communication
- **Routes**: `routes/printer.js` - API endpoints
- **Integration**: Added to `routes/index.js`

### 3. API Endpoints

#### Test Printer Connection
```http
POST /api/printer/test
Content-Type: application/json

{
  "printerIP": "192.168.1.81",
  "port": 9100
}
```

**Response**:
```json
{
  "success": true,
  "message": "Print job sent successfully"
}
```

#### Print Receipt
```http
POST /api/printer/receipt
Content-Type: application/json

{
  "printerIP": "192.168.1.81",
  "port": 9100,
  "receiptType": "arrival",
  "receiptData": {
    "ticketNumber": "2025/11/06/001",
    "clientName": "محمد أحمد",
    "weightIn": 500,
    "operationType": "milling",
    "numberOfBidons": 10,
    "dateReceived": "2025-11-06T10:30:00"
  }
}
```

**Receipt Types**:
- `arrival` - Arrival/Receiving receipt
- `exit` - Exit/Final receipt with payment details
- `general` - Custom receipt with lines
- `raw` - Raw text printing

#### Print Raw Text
```http
POST /api/printer/raw
Content-Type: application/json

{
  "printerIP": "192.168.1.81",
  "port": 9100,
  "text": "Hello, World!\nThis is a test print."
}
```

### 4. ESC/POS Commands Supported

The backend includes a full ESC/POS command builder with:

- ✅ Text alignment (left, center, right)
- ✅ Bold, underline formatting
- ✅ Font sizes (double height, width, both)
- ✅ Line drawing
- ✅ Paper feed
- ✅ Paper cutting
- ✅ UTF-8 support (Arabic text)

## 🎨 Frontend Setup

### 1. Hook: useThermalPrinter

Import and use the thermal printer hook:

```tsx
import { useThermalPrinter } from '@/hooks/useThermalPrinter';

function MyComponent() {
  const { 
    settings,
    updateSettings,
    testConnection,
    printArrivalReceipt,
    printExitReceipt,
    isLoading
  } = useThermalPrinter();

  // Test connection
  const handleTest = async () => {
    const success = await testConnection();
    console.log('Test result:', success);
  };

  // Print arrival receipt
  const handlePrintArrival = async (ticket) => {
    const success = await printArrivalReceipt(ticket);
  };

  return (
    <button onClick={handleTest}>Test Printer</button>
  );
}
```

### 2. Settings Component

Add printer settings to your settings page:

```tsx
import { PrinterSettings } from '@/components/settings/PrinterSettings';

function SettingsPage() {
  return (
    <div>
      <h1>Settings</h1>
      <PrinterSettings />
    </div>
  );
}
```

### 3. Integration with Print Modal

Update your `PrintTicketModal` to include thermal printing:

```tsx
import { useThermalPrinter } from '@/hooks/useThermalPrinter';

export function PrintTicketModal({ ticket, onPrint }) {
  const { printArrivalReceipt, printExitReceipt } = useThermalPrinter();

  const handlePrint = async () => {
    // Print to thermal printer (if enabled)
    if (ticket.status === 'received') {
      await printArrivalReceipt(ticket);
    } else if (ticket.status === 'completed') {
      await printExitReceipt(ticket);
    }

    // Also trigger browser print (for labels/QR codes)
    onPrint();
  };

  return (
    <button onClick={handlePrint}>Print</button>
  );
}
```

## 📝 Usage Examples

### Example 1: Test Printer Connection

```tsx
const { testConnection } = useThermalPrinter();

const handleTest = async () => {
  const success = await testConnection();
  // Will print a test page and show toast notification
};
```

### Example 2: Print Arrival Receipt

```tsx
const { printArrivalReceipt } = useThermalPrinter();

const ticket = {
  id: 123,
  ticketNumber: '2025/11/06/001',
  clientName: 'محمد أحمد',
  operationType: 'milling',
  weightIn: 500,
  numberOfBidons: 10,
  numberOfBoxes: 5,
  dateReceived: '2025-11-06T10:30:00'
};

await printArrivalReceipt(ticket);
```

### Example 3: Print Exit Receipt with Calculations

```tsx
const { printExitReceipt } = useThermalPrinter();

const ticket = {
  ticketNumber: '2025/11/06/001',
  clientName: 'محمد أحمد',
  operationType: 'milling',
  weightIn: 500,
  weightOut: 300,
  unitPrice: 0.250,
  numberOfBidons: 10,
  numberOfBidonsProduced: 13,
  totalAmount: 50.50,
  isPaid: true
};

const priceData = {
  emptyBidonPrice: 0.50
};

await printExitReceipt(ticket, priceData);
```

### Example 4: Print Custom Receipt

```tsx
const { printCustomReceipt } = useThermalPrinter();

const customData = {
  title: 'Daily Summary',
  lines: [
    { text: 'معصرة ياسين وأبوه', align: 'center', bold: true },
    { text: '────────────────────', align: 'center' },
    'Total Tickets: 45',
    'Total Weight: 2,500 kg',
    'Revenue: 1,250.00 TND',
    { text: '────────────────────', align: 'center' },
    { text: 'Thank You!', align: 'center' }
  ]
};

await printCustomReceipt(customData, 'general');
```

### Example 5: Print Raw Text

```tsx
const { printRawText } = useThermalPrinter();

await printRawText('Simple text message\nLine 2\nLine 3');
```

## ⚙️ Configuration

### Printer Settings (Stored in localStorage)

```typescript
interface PrinterSettings {
  printerIP: string;    // e.g., '192.168.1.81'
  port: number;         // default: 9100
  enabled: boolean;     // Enable/disable automatic printing
}
```

### Enable/Disable Printing

```tsx
const { settings, updateSettings } = useThermalPrinter();

// Enable printing
updateSettings({ enabled: true });

// Disable printing (for testing without hardware)
updateSettings({ enabled: false });

// Change printer IP
updateSettings({ printerIP: '192.168.1.100' });
```

## 🔍 Troubleshooting

### Printer Not Responding

1. **Check network connection**:
   ```bash
   ping 192.168.1.81
   ```

2. **Verify printer IP address**:
   - Print configuration page from printer
   - Check printer's LCD display
   - Access printer web interface (if available)

3. **Check port number**: Most Epson printers use port 9100, but some may use 9101 or 9102

4. **Firewall**: Ensure your firewall allows TCP connections on port 9100

### Arabic Text Not Printing Correctly

- The printer must support UTF-8 encoding
- If characters appear garbled, try configuring printer's character set
- Epson TM-T20X supports international characters

### Connection Timeout

- Default timeout is 10 seconds
- Check if printer is in sleep mode (send a test print to wake it up)
- Verify network speed and stability

### Paper Not Cutting

- Ensure printer has auto-cutter installed
- Check if paper cutter is working (mechanical issue)
- Paper cut command is sent at the end of each print job

## 🎯 Best Practices

1. **Test Connection First**: Always use `testConnection()` before starting production use

2. **Handle Errors Gracefully**: The hook returns `false` if printing fails, allowing you to show browser print dialog as fallback

3. **Store Settings Securely**: Printer IP is stored in localStorage. For production, consider backend configuration

4. **Disable During Development**: Set `enabled: false` when testing without physical printer

5. **Network Configuration**: Use static IP for printer to avoid configuration changes

## 📊 Print Receipt Formats

### Arrival Receipt
```
      معصرة ياسين وأبوه
        إيصال الوصول
================================
رقم: 2025/11/06/001
العميل: محمد أحمد
نوع العملية: عصر
--------------------------------
وزن الدخول: 500 كلغ
عدد البدونات: 10
عدد الصناديق: 5
================================
التاريخ: 06/11/2025
الوقت: 10:30:00
         شكراً لكم


[Cut paper]
```

### Exit Receipt
```
      معصرة ياسين وأبوه
        إيصال نهائي
================================
رقم: 2025/11/06/001
العميل: محمد أحمد
نوع: عصر
--------------------------------
وزن الدخول: 500 كلغ
وزن الخروج: 300 كلغ
الوزن الصافي: 200 كلغ
--------------------------------
البدونات المجلوبة: 10
بدونات إضافية: +3
تكلفة البدونات: 1.500 د.ت
================================
سعر/كلغ: 0.250 د.ت
المبلغ الأساسي: 50.000 د.ت
تكلفة البدونات: 1.500 د.ت
--------------------------------
المجموع: 51.500 د.ت
================================
         ✓ مدفوع
التاريخ: 06/11/2025
الوقت: 14:30:00
         شكراً لكم


[Cut paper]
```

## 🔐 Security Considerations

1. **Network Security**: Printer should be on a secure local network
2. **Access Control**: Add authentication middleware if needed:
   ```javascript
   router.post('/test', verifyToken, testPrinter);
   ```
3. **Rate Limiting**: Consider adding rate limiting to prevent abuse
4. **Input Validation**: All inputs are validated on backend

## 🚦 Testing

### Backend Test (with curl)
```bash
curl -X POST http://localhost:3000/api/printer/test \
  -H "Content-Type: application/json" \
  -d '{"printerIP":"192.168.1.81","port":9100}'
```

### Frontend Test
1. Go to Settings page
2. Enter printer IP address
3. Click "اختبار الاتصال والطباعة"
4. Check printer for test page

## 📞 Support

For issues specific to:
- **Printer hardware**: Consult Epson TM-T20X manual
- **Network configuration**: Check your router/switch settings
- **ESC/POS commands**: Refer to Epson ESC/POS documentation
- **Integration code**: Check the implementation files

## ✅ Feature Checklist

- ✅ TCP/IP connection to printer
- ✅ ESC/POS command support
- ✅ Arabic text support (UTF-8)
- ✅ Multiple receipt types
- ✅ Configurable settings
- ✅ Error handling
- ✅ Test functionality
- ✅ Auto-cut paper
- ✅ Text formatting (bold, align, size)
- ✅ React hook integration
- ✅ Settings UI component
- ✅ Toast notifications
- ✅ Loading states

## 🎉 Ready to Use!

Your thermal printer integration is now complete! Follow the configuration steps above and start printing receipts from your React application.
