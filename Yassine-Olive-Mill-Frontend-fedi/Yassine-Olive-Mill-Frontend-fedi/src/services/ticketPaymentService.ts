import { api } from '@/integrations/api/client';

export interface TicketPayment {
  id?: number;
  ticketId: number;
  amount: number;
  payment_date: string;
  payment_method: string;
  payment_type: 'incoming' | 'outgoing';
  operation_type: 'sale' | 'pressing';
  reference?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
  ticket?: {
    id: number;
    ticketNumber: string;
    client?: {
      id: number;
      name: string;
      phone?: string;
    };
  };
}

export interface TicketPaymentStats {
  incoming: {
    pressing: {
      totalAmount: number;
      count: number;
    };
  };
  outgoing: {
    sale: {
      totalAmount: number;
      count: number;
    };
  };
}

class TicketPaymentService {
  private baseUrl = '/api/ticket-payments';

  // Get all ticket payments with filtering
  async getTicketPayments(params?: {
    page?: number;
    limit?: number;
    operationType?: 'sale' | 'pressing';
    paymentType?: 'incoming' | 'outgoing';
    startDate?: string;
    endDate?: string;
  }) {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.operationType) queryParams.append('operationType', params.operationType);
    if (params?.paymentType) queryParams.append('paymentType', params.paymentType);
    if (params?.startDate) queryParams.append('startDate', params.startDate);
    if (params?.endDate) queryParams.append('endDate', params.endDate);
    
    const url = queryParams.toString() ? `${this.baseUrl}?${queryParams.toString()}` : this.baseUrl;
    const response = await api.get<any>(url);
    return response;
  }

  // Get ticket payment by ID
  async getTicketPaymentById(id: number) {
    const response = await api.get<any>(`${this.baseUrl}/${id}`);
    return response;
  }

  // Create new ticket payment
  async createTicketPayment(payment: Omit<TicketPayment, 'id' | 'createdAt' | 'updatedAt' | 'ticket'>) {
    const response = await api.post<any>(this.baseUrl, payment);
    return response;
  }

  // Update ticket payment
  async updateTicketPayment(id: number, updates: Partial<Pick<TicketPayment, 'amount' | 'payment_date' | 'payment_method' | 'reference' | 'notes'>>) {
    const response = await api.put<any>(`${this.baseUrl}/${id}`, updates);
    return response;
  }

  // Delete ticket payment
  async deleteTicketPayment(id: number) {
    const response = await api.delete<any>(`${this.baseUrl}/${id}`);
    return response;
  }

  // Get payments for specific ticket
  async getPaymentsByTicketId(ticketId: number) {
    const response = await api.get<any>(`${this.baseUrl}/ticket/${ticketId}`);
    return response;
  }

  // Get payment statistics
  async getTicketPaymentStats(params?: {
    startDate?: string;
    endDate?: string;
  }) {
    const queryParams = new URLSearchParams();
    if (params?.startDate) queryParams.append('startDate', params.startDate);
    if (params?.endDate) queryParams.append('endDate', params.endDate);
    
    const url = queryParams.toString() ? `${this.baseUrl}/stats?${queryParams.toString()}` : `${this.baseUrl}/stats`;
    const response = await api.get<any>(url);
    return response;
  }
}

export const ticketPaymentService = new TicketPaymentService();
