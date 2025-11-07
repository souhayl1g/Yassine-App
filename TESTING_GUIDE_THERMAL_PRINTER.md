# 🧪 Testing Your Thermal Printer Setup

## Pre-Test Checklist

- [ ] Epson TM-T20X connected to network via Ethernet
- [ ] Printer powered on
- [ ] Paper loaded
- [ ] Printer IP address known (e.g., 192.168.1.81)
- [ ] Backend server running
- [ ] Frontend dev server running

## Step-by-Step Testing

### Step 1: Verify Network Connection

```bash
# From your development machine
ping 192.168.1.81

# If ping works, test TCP port
telnet 192.168.1.81 9100
# (Press Ctrl+C to exit)
```

✅ **Expected**: Ping replies, telnet connects
❌ **If fails**: Check printer network settings, cables, firewall

---

### Step 2: Test Backend API

#### Test 2a: Backend Health Check
```bash
curl http://localhost:3000/api/health
```

✅ **Expected**: 
```json
{
  "status": "OK",
  "message": "Olive Oil Mill API is running",
  "timestamp": "2025-11-07T..."
}
```

#### Test 2b: Test Printer Endpoint

**PowerShell (Windows):**
```powershell
curl.exe -X POST http://localhost:3000/api/printer/test -H "Content-Type: application/json" -d '{\"printerIP\":\"192.168.1.81\",\"port\":9100}'
```

**Bash/Linux/Mac:**
```bash
curl -X POST http://localhost:3000/api/printer/test \
  -H "Content-Type: application/json" \
  -d '{
    "printerIP": "192.168.1.81",
    "port": 9100
  }'
```

✅ **Expected**: 
- Response: `{"success": true, "message": "Print job sent successfully"}`
- Printer prints test page with "TEST PRINT" header

❌ **If fails**: Check console for error messages

---

### Step 3: Test Frontend Settings UI

1. **Open Settings Page** in your React app
2. **Add PrinterSettings component** (if not already added):
   ```tsx
   import { PrinterSettings } from '@/components/settings/PrinterSettings';
   
   function SettingsPage() {
     return (
       <div className="p-6">
         <PrinterSettings />
       </div>
     );
   }
   ```

3. **Configure Printer**:
   - Enter IP: `192.168.1.81`
   - Port: `9100` (default)
   - Enable: Toggle ON

4. **Click "اختبار الاتصال والطباعة"**

✅ **Expected**: 
- Toast notification: "Printer test successful!"
- Printer prints test page
- No errors in browser console

---

### Step 4: Test Printing Functions

#### Test 4a: Print Arrival Receipt

Open browser console and run:
```javascript
// Get the hook (you may need to extract this to a test component)
const testTicket = {
  id: 1,
  ticketNumber: '2025/11/06/001',
  clientName: 'محمد أحمد',
  operationType: 'milling',
  weightIn: 500,
  numberOfBidons: 10,
  numberOfBoxes: 5,
  dateReceived: new Date().toISOString()
};

// From your component with the hook:
await printArrivalReceipt(testTicket);
```

✅ **Expected**: Printer outputs arrival receipt with all details

#### Test 4b: Print Exit Receipt

```javascript
const testExitTicket = {
  id: 2,
  ticketNumber: '2025/11/06/002',
  clientName: 'أحمد محمد',
  operationType: 'milling',
  weightIn: 500,
  weightOut: 300,
  unitPrice: 0.250,
  numberOfBidons: 10,
  numberOfBidonsProduced: 13,
  totalAmount: 51.500,
  isPaid: true
};

const priceData = {
  emptyBidonPrice: 0.50
};

await printExitReceipt(testExitTicket, priceData);
```

✅ **Expected**: Printer outputs exit receipt with calculations

#### Test 4c: Print Raw Text

```javascript
await printRawText('Hello from React!\nThis is line 2\nمرحبا بك');
```

✅ **Expected**: Simple text receipt with Arabic support

---

### Step 5: Integration Test with PrintTicketModal

1. **Create a test ticket** in your app
2. **Open print modal**
3. **Click print button**

✅ **Expected**: 
- If `enabled: true` → Printer prints receipt
- If `enabled: false` → Only browser print dialog
- No errors or crashes

---

## Common Issues & Solutions

### Issue: "Failed to connect to printer"

**Possible Causes:**
1. Wrong IP address
   - Solution: Verify printer IP (print config page from printer)
2. Firewall blocking
   - Solution: Allow port 9100 in firewall
3. Printer offline
   - Solution: Check printer power and network cable
4. Wrong port number
   - Solution: Try 9101 or 9102

### Issue: "Connection timeout"

**Possible Causes:**
1. Printer in sleep mode
   - Solution: Press printer button to wake
2. Network congestion
   - Solution: Check network connectivity
3. Backend timeout too short
   - Solution: Timeout is 10s (should be enough)

### Issue: Arabic text appears as ??????

**Possible Causes:**
1. Printer doesn't support UTF-8
   - Solution: Check printer character set settings
2. Wrong encoding
   - Solution: Verify printer firmware supports international characters

### Issue: Paper not cutting

**Possible Causes:**
1. Auto-cutter not installed
   - Solution: Check printer hardware configuration
2. Cutter mechanism jammed
   - Solution: Clear paper jam, check cutter blade
3. Cut command not sent
   - Solution: Verify backend sends CUT command (already included)

### Issue: Print appears but content is wrong

**Possible Causes:**
1. ESC/POS commands incompatible
   - Solution: Check Epson TM-T20X command reference
2. Data not reaching printer correctly
   - Solution: Verify network transmission
3. Character encoding issue
   - Solution: Test with simple English text first

---

## Performance Tests

### Test: Multiple Rapid Prints

```javascript
// Test queue handling
for (let i = 0; i < 5; i++) {
  await printRawText(`Test print ${i + 1}`);
  await new Promise(r => setTimeout(r, 1000)); // 1s delay
}
```

✅ **Expected**: All 5 receipts print in order

### Test: Large Receipt

```javascript
const largeData = {
  title: 'Large Receipt Test',
  lines: Array.from({ length: 50 }, (_, i) => `Line ${i + 1}`)
};

await printCustomReceipt(largeData, 'general');
```

✅ **Expected**: Receipt prints completely without truncation

### Test: Concurrent Requests

```javascript
// Test simultaneous prints (not recommended in production)
Promise.all([
  printRawText('Print 1'),
  printRawText('Print 2'),
  printRawText('Print 3')
]);
```

⚠️ **Note**: May cause issues. Use sequential printing in production.

---

## Success Criteria

✅ **All tests pass if:**

1. Test print works from backend API
2. Test print works from frontend settings
3. Arrival receipt formats correctly
4. Exit receipt calculates totals correctly
5. Arabic text renders properly
6. Paper cuts automatically
7. No console errors
8. Toast notifications appear correctly
9. Settings persist after page reload
10. Can enable/disable printing

---

## Next Steps After Testing

Once all tests pass:

1. ✅ **Document printer location** and IP for team
2. ✅ **Train users** on settings configuration
3. ✅ **Integrate with production workflow** (choose integration pattern)
4. ✅ **Set up monitoring** (optional)
5. ✅ **Create backup plan** if printer fails (browser print fallback)

---

## Quick Test Script

Save this as a test component:

```tsx
// TestPrinterComponent.tsx
import { useThermalPrinter } from '@/hooks/useThermalPrinter';
import { OliveButton } from '@/components/ui/olive-button';

export function TestPrinterComponent() {
  const { 
    testConnection, 
    printRawText,
    printCustomReceipt,
    isLoading 
  } = useThermalPrinter();

  const runTests = async () => {
    console.log('🧪 Starting printer tests...');

    // Test 1: Connection
    console.log('Test 1: Connection');
    const connected = await testConnection();
    if (!connected) return;

    // Test 2: Raw text
    console.log('Test 2: Raw text');
    await printRawText('Test raw text\nمرحبا');

    // Test 3: Custom receipt
    console.log('Test 3: Custom receipt');
    await printCustomReceipt({
      title: 'Test Receipt',
      lines: ['Line 1', 'Line 2', 'Line 3']
    });

    console.log('✅ All tests complete!');
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Printer Test Suite</h1>
      <OliveButton onClick={runTests} disabled={isLoading}>
        {isLoading ? 'Testing...' : 'Run All Tests'}
      </OliveButton>
    </div>
  );
}
```

Add to your app temporarily for testing:
```tsx
import { TestPrinterComponent } from './TestPrinterComponent';

// In your router or App.tsx
<Route path="/test-printer" element={<TestPrinterComponent />} />
```

Navigate to `/test-printer` and click "Run All Tests"

---

## Support Checklist

If you need help:

- [ ] Read error message in console
- [ ] Check browser network tab for API calls
- [ ] Verify printer IP is correct
- [ ] Test network connectivity with ping
- [ ] Check backend logs
- [ ] Review THERMAL_PRINTER_SETUP.md
- [ ] Try with different ticket data
- [ ] Test with simple raw text first
- [ ] Verify printer power and paper
- [ ] Check printer display for errors

---

**Happy Printing! 🖨️**
