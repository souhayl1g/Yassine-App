import { api } from '@/integrations/api/client';
import QRCode from 'qrcode';

// Helper function to extract payload from API responses
export const getPayload = <T,>(res: any): T => 
  (res && typeof res === 'object' && 'data' in res ? res.data : res);

// Format date for ticket number (YYYY/MM/DD)
export const formatDateForTicket = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}/${month}/${day}`;
};

// Generate QR code for ticket
export const generateQRCode = async (ticketData: any): Promise<string> => {
  try {
    const qrData = JSON.stringify({
      ticketId: ticketData.id,
      ticketNumber: ticketData.ticketNumber,
      clientName: ticketData.clientName,
      weightIn: ticketData.weightIn,
      dateReceived: ticketData.dateReceived
    });
    
    return await QRCode.toDataURL(qrData, {
      width: 200,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });
  } catch (error) {
    console.error('Error generating QR code:', error);
    return '';
  }
};

// Generate today's ticket number
export const generateDailyTicketNumber = async (): Promise<string> => {
  const today = new Date();
  const todayStr = today.toLocaleDateString('en-CA');
  
  try {
    // Use the new next-ticket-number endpoint to get the next sequential number
    const res = await api.get<any>(`/batches/next-ticket-number?date=${todayStr}`);
    const payload = getPayload<any>(res);
    return payload?.nextTicketNumber || `${formatDateForTicket(today)}/001`;
  } catch (error) {
    // Fallback to the old method
    const formattedDate = formatDateForTicket(today);
    const ticketCount = await loadDailyTicketCount();
    
    // Generate sequential number (starting from 1)
    const nextNumber = ticketCount + 1;
    const paddedNumber = nextNumber.toString().padStart(3, '0');
    
    return `${formattedDate}/${paddedNumber}`;
  }
};

// Load daily ticket count from localStorage or API
export const loadDailyTicketCount = async (): Promise<number> => {
  const today = new Date().toLocaleDateString('en-CA');
  
  try {
    // Use the new next-ticket-number endpoint to get accurate daily count
    const res = await api.get<any>(`/batches/next-ticket-number?date=${today}`);
    const payload = getPayload<any>(res);
    return payload?.dailyCount || 0;
  } catch (error) {
    // Fallback to the old method
    try {
      const res = await api.get<any>(`/batches?date=${today}`);
      const payload = getPayload<any>(res);
      const todayTickets = payload?.batches || payload || [];
      return todayTickets.length;
    } catch (fallbackError) {
      // Final fallback to localStorage
      const stored = localStorage.getItem(`dailyTicketCount_${today}`);
      if (stored) {
        return parseInt(stored, 10);
      } else {
        return 0;
      }
    }
  }
};

// Get client display name
export const getClientDisplayName = (client: any): string => {
  const fullName = `${client.firstname} ${client.lastname}`.trim();
  const contact = client.email || client.phone;
  return contact ? `${fullName} (${contact})` : fullName;
};

// Update batch via API
export const updateBatch = async (id: string, payload: any) => {
  const attempts: Array<() => Promise<any>> = [
    () => api.put(`/batches/${id}`, payload),
    () => api.post(`/batches/${id}`, { ...payload, _method: 'PUT' }),
    () => api.post(`/batches/update/${id}`, payload),
    () => api.post(`/batches/${id}/update`, payload),
  ];

  let lastErr: any;
  for (const tryCall of attempts) {
    try {
      const r = await tryCall();
      return r;
    } catch (err: any) {
      lastErr = err;
      const msg = (err?.message || '').toLowerCase();
      if (!(msg.includes('404') || msg.includes('405') || msg.includes('not found') || msg.includes('method'))) {
        throw err;
      }
    }
  }
  throw lastErr;
};

// Delete batch via API
export const deleteBatch = async (id: string) => {
  const attempts: Array<() => Promise<any>> = [
    () => api.delete(`/batches/${id}`),
    () => api.post(`/batches/${id}`, { _method: 'DELETE' }),
    () => api.post(`/batches/delete/${id}`),
    () => api.post(`/batches/${id}/delete`),
  ];

  let lastErr: any;
  for (const tryCall of attempts) {
    try {
      const r = await tryCall();
      return r;
    } catch (err: any) {
      lastErr = err;
      const msg = (err?.message || '').toLowerCase();
      if (!(msg.includes('404') || msg.includes('405') || msg.includes('not found') || msg.includes('method'))) {
        throw err;
      }
    }
  }
  throw lastErr;
};

// Fetch container contents for a specific batch ID and calculate total weight
export const getContainerContentsWeight = async (batchId: string): Promise<number> => {
  try {
    // Try to get container contents for this batch
    const response = await api.get(`/container-contents?batchId=${batchId}`);
    const payload = getPayload<any>(response);
    
    let containerContents = [];
    
    // Handle different response formats
    if (Array.isArray(payload)) {
      containerContents = payload.filter(content => 
        String(content.batch_id) === String(batchId) || 
        String(content.batchId) === String(batchId)
      );
    } else if (payload && Array.isArray(payload.containerContents)) {
      containerContents = payload.containerContents.filter(content => 
        String(content.batch_id) === String(batchId) || 
        String(content.batchId) === String(batchId)
      );
    } else if (payload && Array.isArray(payload.data)) {
      containerContents = payload.data.filter(content => 
        String(content.batch_id) === String(batchId) || 
        String(content.batchId) === String(batchId)
      );
    }
    
    // Sum all weights from container contents
    const totalWeight = containerContents.reduce((sum, content) => {
      const weight = parseFloat(content.weight || content.net_weight || 0);
      return sum + weight;
    }, 0);
    
    return totalWeight;
  } catch (error) {
    console.error('Error fetching container contents:', error);
    return 0;
  }
};
