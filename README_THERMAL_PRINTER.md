# 🎉 Epson TM-T20X Thermal Printer - Setup Complete!

## ✅ What Has Been Implemented

### Backend (Node.js/Express)
1. **✅ Printer Controller** (`controllers/printerController.js`)
   - Full ESC/POS command builder
   - TCP/IP connection handler
   - Receipt formatting functions
   - Error handling and timeouts

2. **✅ API Routes** (`routes/printer.js`)
   - `POST /api/printer/test` - Test printer connection
   - `POST /api/printer/receipt` - Print formatted receipts
   - `POST /api/printer/raw` - Print raw text

3. **✅ Integration** 
   - Added to main routes in `routes/index.js`
   - No additional npm packages needed!

### Frontend (React/TypeScript)
1. **✅ Custom Hook** (`src/hooks/useThermalPrinter.ts`)
   - Settings management (localStorage)
   - Test connection function
   - Print arrival receipts
   - Print exit receipts
   - Print custom receipts
   - Print raw text
   - Loading states
   - Error handling with toast notifications

2. **✅ Settings Component** (`src/components/settings/PrinterSettings.tsx`)
   - Configure printer IP address
   - Configure port number
   - Enable/disable printing
   - Test connection button
   - Beautiful UI with Arabic support

### Documentation
1. **✅ Complete Setup Guide** (`THERMAL_PRINTER_SETUP.md`)
   - Hardware setup instructions
   - API documentation
   - Usage examples
   - Troubleshooting guide

2. **✅ Integration Examples** (`THERMAL_PRINTER_INTEGRATION_EXAMPLES.tsx`)
   - Multiple integration patterns
   - Code examples for PrintTicketModal

## 🚀 Quick Start

### 1. Configure Your Printer

1. Connect Epson TM-T20X to your network via Ethernet
2. Find printer's IP address (check printer settings or your router)
3. Note: Default port is 9100

### 2. Test the Backend

Start your backend server and test:

```bash
cd yassine_olive_mill_backend-fedi
npm start
```

Test with curl:
```bash
curl -X POST http://localhost:3000/api/printer/test \
  -H "Content-Type: application/json" \
  -d '{"printerIP":"192.168.1.81","port":9100}'
```

### 3. Configure Frontend

1. Add `PrinterSettings` component to your settings page
2. Enter printer IP address: `192.168.1.81`
3. Click test button - printer should print a test page
4. Enable automatic printing

### 4. Integrate with Your Print Modal

Choose one of three integration patterns:

**Option A: Print Both (Thermal + Browser)**
```tsx
// After browser print, also send to thermal printer
onAfterPrint: async () => {
  if (printerSettings.enabled) {
    await printArrivalReceipt(ticket);
  }
}
```

**Option B: Separate Buttons**
```tsx
// One button for thermal, one for browser
<button onClick={handleThermalPrint}>طباعة حرارية</button>
<button onClick={handleBrowserPrint}>طباعة ملصقات</button>
```

**Option C: Smart Auto-Select**
```tsx
// Receipts → thermal, Labels → browser
if (ticketType === 'arrival-receipt' || ticketType === 'exit-receipt') {
  await printArrivalReceipt(ticket);
} else {
  handleBrowserPrint(); // For labels with QR codes
}
```

## 📝 Usage Examples

### Test Connection
```tsx
const { testConnection } = useThermalPrinter();
await testConnection();
```

### Print Arrival Receipt
```tsx
const { printArrivalReceipt } = useThermalPrinter();
await printArrivalReceipt(ticket);
```

### Print Exit Receipt
```tsx
const { printExitReceipt } = useThermalPrinter();
await printExitReceipt(ticket, currentPrices);
```

## 🎨 What Gets Printed

### Arrival Receipt Format
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
================================
التاريخ: 06/11/2025
         شكراً لكم
```

### Exit Receipt Format
```
      معصرة ياسين وأبوه
        إيصال نهائي
================================
رقم: 2025/11/06/001
العميل: محمد أحمد
الوزن الصافي: 200 كلغ
--------------------------------
سعر/كلغ: 0.250 د.ت
المبلغ الأساسي: 50.000 د.ت
تكلفة البدونات: 1.500 د.ت
--------------------------------
المجموع: 51.500 د.ت
         ✓ مدفوع
```

## ⚙️ Settings

Stored in browser localStorage:
```typescript
{
  printerIP: "192.168.1.81",  // Your printer's IP
  port: 9100,                 // Usually 9100
  enabled: true               // Auto-print on/off
}
```

## 🔧 Troubleshooting

### Printer Not Found
```bash
# Test network connectivity
ping 192.168.1.81

# Check if port is open
telnet 192.168.1.81 9100
```

### Connection Timeout
- Wake printer from sleep mode
- Check firewall settings
- Verify correct IP address
- Try port 9101 or 9102 if 9100 doesn't work

### Arabic Text Issues
- Printer must support UTF-8
- Check printer's character set configuration
- Epson TM-T20X supports international characters

### Paper Not Cutting
- Verify auto-cutter is installed
- Check paper cutter mechanism
- Paper should cut automatically after each job

## 🎯 Next Steps

1. **Test the integration**:
   - Use test button in settings
   - Verify receipt prints correctly
   - Check Arabic text rendering

2. **Integrate with your workflow**:
   - Choose integration pattern (see examples)
   - Update PrintTicketModal component
   - Test with real tickets

3. **Production deployment**:
   - Configure static IP for printer
   - Document printer location
   - Train users on settings

4. **Optional enhancements**:
   - Add authentication to printer endpoints
   - Create printer status monitoring
   - Add print queue management
   - Support multiple printers

## 📊 Features Included

- ✅ Network printing via TCP/IP
- ✅ ESC/POS command support
- ✅ Arabic text (UTF-8)
- ✅ Bold, underline, alignment
- ✅ Auto-cut paper
- ✅ Error handling
- ✅ Loading states
- ✅ Toast notifications
- ✅ Settings persistence
- ✅ Test functionality
- ✅ Multiple receipt types
- ✅ Custom formatting

## 📚 Documentation Files

- `THERMAL_PRINTER_SETUP.md` - Complete setup guide with API docs
- `THERMAL_PRINTER_INTEGRATION_EXAMPLES.tsx` - Code examples
- `README_THERMAL_PRINTER.md` - This file (quick reference)

## 🎉 You're Ready!

Your Epson TM-T20X thermal printer integration is complete and ready to use. Just configure the printer IP in settings and start printing!

For detailed information, see `THERMAL_PRINTER_SETUP.md`.

---

**Need Help?**
- Check troubleshooting section in THERMAL_PRINTER_SETUP.md
- Verify network connection first
- Test with the test button before production use
- Consult Epson TM-T20X manual for hardware issues
