import net from 'net';
import { Buffer } from 'buffer';

/**
 * ESC/POS Command Builder for Epson TM-T20X
 * This class helps build ESC/POS commands for thermal printing
 */
class EscPosBuilder {
  constructor() {
    this.buffer = [];
    // ESC/POS Commands
    this.ESC = 0x1B;
    this.GS = 0x1D;
    this.LF = 0x0A;
    this.INIT = [this.ESC, 0x40]; // Initialize printer
    this.CUT = [this.GS, 0x56, 0x00]; // Cut paper
    this.ALIGN_LEFT = [this.ESC, 0x61, 0x00];
    this.ALIGN_CENTER = [this.ESC, 0x61, 0x01];
    this.ALIGN_RIGHT = [this.ESC, 0x61, 0x02];
    this.BOLD_ON = [this.ESC, 0x45, 0x01];
    this.BOLD_OFF = [this.ESC, 0x45, 0x00];
    this.UNDERLINE_ON = [this.ESC, 0x2D, 0x01];
    this.UNDERLINE_OFF = [this.ESC, 0x2D, 0x00];
    this.DOUBLE_HEIGHT = [this.ESC, 0x21, 0x10];
    this.DOUBLE_WIDTH = [this.ESC, 0x21, 0x20];
    this.DOUBLE_BOTH = [this.ESC, 0x21, 0x30];
    this.NORMAL_SIZE = [this.ESC, 0x21, 0x00];
  }

  init() {
    this.buffer.push(...this.INIT);
    return this;
  }

  text(str) {
    // Convert string to bytes (UTF-8)
    const bytes = Buffer.from(str, 'utf8');
    this.buffer.push(...bytes);
    return this;
  }

  newLine(count = 1) {
    for (let i = 0; i < count; i++) {
      this.buffer.push(this.LF);
    }
    return this;
  }

  alignLeft() {
    this.buffer.push(...this.ALIGN_LEFT);
    return this;
  }

  alignCenter() {
    this.buffer.push(...this.ALIGN_CENTER);
    return this;
  }

  alignRight() {
    this.buffer.push(...this.ALIGN_RIGHT);
    return this;
  }

  bold(enable = true) {
    this.buffer.push(...(enable ? this.BOLD_ON : this.BOLD_OFF));
    return this;
  }

  underline(enable = true) {
    this.buffer.push(...(enable ? this.UNDERLINE_ON : this.UNDERLINE_OFF));
    return this;
  }

  doubleHeight() {
    this.buffer.push(...this.DOUBLE_HEIGHT);
    return this;
  }

  doubleWidth() {
    this.buffer.push(...this.DOUBLE_WIDTH);
    return this;
  }

  doubleBoth() {
    this.buffer.push(...this.DOUBLE_BOTH);
    return this;
  }

  normalSize() {
    this.buffer.push(...this.NORMAL_SIZE);
    return this;
  }

  cut() {
    this.buffer.push(...this.CUT);
    return this;
  }

  drawLine(char = '-', length = 32) {
    this.text(char.repeat(length));
    this.newLine();
    return this;
  }

  feed(lines = 3) {
    this.newLine(lines);
    return this;
  }

  getBuffer() {
    return Buffer.from(this.buffer);
  }
}

/**
 * Print to Epson TM-T20X via TCP/IP
 */
const printToEpson = async (printerIP, port, data) => {
  return new Promise((resolve, reject) => {
    const client = new net.Socket();
    const timeout = 10000; // 10 seconds timeout

    // Set timeout
    client.setTimeout(timeout);

    client.connect(port, printerIP, () => {
      console.log(`Connected to printer at ${printerIP}:${port}`);
      client.write(data);
    });

    client.on('data', (data) => {
      console.log('Printer response:', data);
    });

    client.on('close', () => {
      console.log('Connection closed');
      resolve({ success: true, message: 'Print job sent successfully' });
    });

    client.on('error', (err) => {
      console.error('Printer error:', err);
      reject({
        success: false,
        message: 'Failed to connect to printer',
        error: err.message
      });
    });

    client.on('timeout', () => {
      console.error('Connection timeout');
      client.destroy();
      reject({
        success: false,
        message: 'Connection timeout',
        error: 'Printer did not respond within 10 seconds'
      });
    });

    // Close after writing
    setTimeout(() => {
      client.end();
    }, 2000);
  });
};

/**
 * Controller: Test printer connection
 */
export const testPrinter = async (req, res) => {
  try {
    const { printerIP, port = 9100 } = req.body;

    if (!printerIP) {
      return res.status(400).json({
        success: false,
        message: 'Printer IP address is required'
      });
    }

    // Build test print
    const builder = new EscPosBuilder();
    builder
      .init()
      .alignCenter()
      .doubleBoth()
      .bold()
      .text('TEST PRINT')
      .normalSize()
      .newLine(2)
      .alignLeft()
      .text('Printer: Epson TM-T20X')
      .newLine()
      .text(`IP: ${printerIP}`)
      .newLine()
      .text(`Port: ${port}`)
      .newLine()
      .text(`Time: ${new Date().toLocaleString('ar-TN')}`)
      .newLine(2)
      .drawLine('=', 32)
      .alignCenter()
      .text('Connection Successful!')
      .newLine()
      .feed(3)
      .cut();

    const data = builder.getBuffer();
    const result = await printToEpson(printerIP, port, data);

    res.json(result);
  } catch (error) {
    console.error('Test print error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to print test page',
      error: error.error || error.message
    });
  }
};

/**
 * Controller: Print receipt from frontend
 */
export const printReceipt = async (req, res) => {
  try {
    const { 
      printerIP, 
      port = 9100, 
      receiptData,
      receiptType = 'general' 
    } = req.body;

    if (!printerIP) {
      return res.status(400).json({
        success: false,
        message: 'Printer IP address is required'
      });
    }

    if (!receiptData) {
      return res.status(400).json({
        success: false,
        message: 'Receipt data is required'
      });
    }

    let data;

    // Handle different receipt types
    switch (receiptType) {
      case 'arrival':
        data = buildArrivalReceipt(receiptData);
        break;
      case 'exit':
        data = buildExitReceipt(receiptData);
        break;
      case 'raw':
        // Raw ESC/POS commands from frontend
        data = Buffer.from(receiptData.rawCommands || receiptData.content || '');
        break;
      default:
        data = buildGeneralReceipt(receiptData);
    }

    const result = await printToEpson(printerIP, port, data);

    res.json(result);
  } catch (error) {
    console.error('Print receipt error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to print receipt',
      error: error.error || error.message
    });
  }
};

/**
 * Build arrival receipt for printing
 */
function buildArrivalReceipt(data) {
  const builder = new EscPosBuilder();
  
  builder
    .init()
    .alignCenter()
    .bold()
    .text('معصرة ياسين وأبوه')
    .bold(false)
    .newLine()
    .text('إيصال الوصول')
    .newLine()
    .drawLine('=', 32)
    .alignLeft()
    .bold()
    .text(`رقم: ${data.ticketNumber || data.id}`)
    .bold(false)
    .newLine()
    .text(`العميل: ${data.clientName}`)
    .newLine()
    .text(`نوع العملية: ${data.operationType === 'milling' ? 'عصر' : 'بيع'}`)
    .newLine()
    .drawLine('-', 32)
    .bold()
    .text(`وزن الدخول: ${data.weightIn} كلغ`)
    .bold(false)
    .newLine();

  if (data.numberOfBidons > 0) {
    builder
      .text(`عدد البدونات: ${data.numberOfBidons}`)
      .newLine();
  }

  if (data.numberOfBoxes > 0) {
    builder
      .text(`عدد الصناديق: ${data.numberOfBoxes}`)
      .newLine();
  }

  builder
    .drawLine('=', 32)
    .text(`التاريخ: ${new Date(data.dateReceived).toLocaleDateString('ar-TN')}`)
    .newLine()
    .text(`الوقت: ${new Date(data.dateReceived).toLocaleTimeString('ar-TN')}`)
    .newLine(2)
    .alignCenter()
    .text('شكراً لكم')
    .feed(3)
    .cut();

  return builder.getBuffer();
}

/**
 * Build exit receipt for printing
 */
function buildExitReceipt(data) {
  const builder = new EscPosBuilder();
  
  const weightIn = data.weightIn || 0;
  const weightOut = data.weightOut || 0;
  const netWeight = weightIn - weightOut;
  const unitPrice = data.unitPrice || 0;
  const baseAmount = netWeight * unitPrice;
  const numberOfBidons = data.numberOfBidons || 0;
  const additionalBidons = data.additionalBidons || 0;
  const bidonCost = data.bidonCost || 0;
  const totalAmount = data.totalAmount || (baseAmount + bidonCost);

  builder
    .init()
    .alignCenter()
    .bold()
    .doubleBoth()
    .text('معصرة ياسين وأبوه')
    .normalSize()
    .bold(false)
    .newLine()
    .text('إيصال نهائي')
    .newLine()
    .drawLine('=', 32)
    .alignLeft()
    .bold()
    .text(`رقم: ${data.ticketNumber || data.id}`)
    .bold(false)
    .newLine()
    .text(`العميل: ${data.clientName}`)
    .newLine()
    .text(`نوع: ${data.operationType === 'milling' ? 'عصر' : 'بيع'}`)
    .newLine()
    .drawLine('-', 32)
    .text(`وزن الدخول: ${weightIn} كلغ`)
    .newLine()
    .text(`وزن الخروج: ${weightOut} كلغ`)
    .newLine()
    .bold()
    .text(`الوزن الصافي: ${netWeight} كلغ`)
    .bold(false)
    .newLine()
    .drawLine('-', 32);

  if (numberOfBidons > 0) {
    builder
      .text(`البدونات المجلوبة: ${numberOfBidons}`)
      .newLine();
  }

  if (additionalBidons > 0) {
    builder
      .text(`بدونات إضافية: +${additionalBidons}`)
      .newLine()
      .text(`تكلفة البدونات: ${bidonCost.toFixed(3)} د.ت`)
      .newLine();
  }

  builder
    .drawLine('=', 32)
    .text(`سعر/كلغ: ${unitPrice.toFixed(3)} د.ت`)
    .newLine()
    .text(`المبلغ الأساسي: ${baseAmount.toFixed(3)} د.ت`)
    .newLine();

  if (bidonCost > 0) {
    builder
      .text(`تكلفة البدونات: ${bidonCost.toFixed(3)} د.ت`)
      .newLine();
  }

  builder
    .drawLine('-', 32)
    .bold()
    .doubleHeight()
    .text(`المجموع: ${totalAmount.toFixed(3)} د.ت`)
    .normalSize()
    .bold(false)
    .newLine()
    .drawLine('=', 32)
    .alignCenter()
    .text(data.isPaid ? '✓ مدفوع' : '✗ غير مدفوع')
    .newLine(2)
    .text(`التاريخ: ${new Date().toLocaleDateString('ar-TN')}`)
    .newLine()
    .text(`الوقت: ${new Date().toLocaleTimeString('ar-TN')}`)
    .newLine(2)
    .text('شكراً لكم')
    .feed(3)
    .cut();

  return builder.getBuffer();
}

/**
 * Build general receipt for printing
 */
function buildGeneralReceipt(data) {
  const builder = new EscPosBuilder();
  
  builder
    .init()
    .alignCenter()
    .bold()
    .text(data.title || 'Receipt')
    .bold(false)
    .newLine(2)
    .alignLeft();

  // Print lines if provided
  if (data.lines && Array.isArray(data.lines)) {
    data.lines.forEach(line => {
      if (typeof line === 'string') {
        builder.text(line).newLine();
      } else if (typeof line === 'object') {
        // Support formatting
        if (line.align === 'center') builder.alignCenter();
        if (line.align === 'right') builder.alignRight();
        if (line.bold) builder.bold();
        if (line.underline) builder.underline();
        if (line.doubleHeight) builder.doubleHeight();
        
        builder.text(line.text || '').newLine();
        
        // Reset formatting
        builder.normalSize().bold(false).underline(false).alignLeft();
      }
    });
  } else if (data.content) {
    // Simple content
    builder.text(data.content).newLine();
  }

  builder
    .feed(3)
    .cut();

  return builder.getBuffer();
}

/**
 * Controller: Print raw text
 */
export const printRawText = async (req, res) => {
  try {
    const { printerIP, port = 9100, text } = req.body;

    if (!printerIP) {
      return res.status(400).json({
        success: false,
        message: 'Printer IP address is required'
      });
    }

    if (!text) {
      return res.status(400).json({
        success: false,
        message: 'Text content is required'
      });
    }

    const builder = new EscPosBuilder();
    builder
      .init()
      .text(text)
      .newLine(2)
      .feed(3)
      .cut();

    const data = builder.getBuffer();
    const result = await printToEpson(printerIP, port, data);

    res.json(result);
  } catch (error) {
    console.error('Print raw text error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to print text',
      error: error.error || error.message
    });
  }
};

export default {
  testPrinter,
  printReceipt,
  printRawText
};
