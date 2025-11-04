export interface Client {
  id: string;
  firstname: string;
  lastname: string;
  email?: string;
  phone?: string;
}

export interface Ticket {
  id: string;
  ticketNumber: string;
  clientId: string;
  clientName: string;
  weightIn: number;
  weightOut?: number;
  netWeight?: number;
  numberOfBoxes: number;
  unitPrice?: number;
  totalAmount?: number;
  isPaid?: boolean;
  paymentMethod?: string;
  paymentReference?: string;
  datePaid?: string;
  dateReceived: string;
  status: 'received' | 'in_process' | 'completed';
  operationType?: 'milling' | 'sale';
  notes?: string;
  qrCode?: string;
}

export interface ScannedTicket extends Ticket {}

export interface MinimizedTicket {
  id: string;
  ticketNumber: string;
  clientName: string;
  weightIn: number;
  isMaximized: boolean;
}

export interface NewTicketForm {
  firstname: string;
  lastname: string;
  weightIn: string;
  operationType: 'milling' | 'sale';
}

export interface EditTicketForm {
  weightOut: string;
  numberOfBoxes: string;
  taux: string; // Oil extraction percentage for sale operations
  // Payment fields
  isPaid: boolean;
  paymentAmount: string;
}

export interface Price {
  id: string;
  milling_price_per_kg: number;
  oil_client_selling_price_per_kg: number;
  empty_bidon_price: number;
  date: string;
}

export interface DailyWorkState {
  // Ticket creation
  clients: Client[];
  loadingClients: boolean;
  isAddTicketOpen: boolean;
  isQrScanOpen: boolean;
  searchResults: Client[];
  selectedClient: Client | null;

  // Recent tickets
  recentTickets: Ticket[];
  loadingTickets: boolean;
  currentPage: number;
  totalPages: number;
  totalTickets: number;

  // Prices
  currentPrices: any;
  loadingPrices: boolean;

  // QR Scan state
  scannedTicket: ScannedTicket | null;
  isEditModalOpen: boolean;
  isSaving: boolean;
  isPrintModalOpen: boolean;
  ticketToPrint: Ticket | null;
  isQrDisplayOpen: boolean;
  qrCodeImage: string;

  // Camera QR scanning
  isCameraScanOpen: boolean;
  isCameraActive: boolean;

  // Minimized tickets
  minimizedTickets: MinimizedTicket[];

  // Daily ticket counter
  dailyTicketCount: number;

  // Forms
  editForm: EditTicketForm;
  newTicket: NewTicketForm;

  // Details modal
  isDetailsModalOpen: boolean;
  pressingHistory: any[];
  loadingPressingHistory: boolean;
}
