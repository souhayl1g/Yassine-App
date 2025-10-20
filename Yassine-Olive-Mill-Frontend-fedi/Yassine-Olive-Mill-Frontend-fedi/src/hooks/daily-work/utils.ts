import { api } from '@/integrations/api/client';
import QRCode from 'qrcode';

// Helper function to extract payload from API responses
export const getPayload = <T,>(res: any): T => 
  (res && typeof res === 'object' && 'data' in res ? res.data : res);

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

// Generate daily ticket number (reset each day, starting from 1)
export const generateDailyTicketNumber = (dailyTicketCount: number): string => {
  const today = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD
  const count = dailyTicketCount + 1;
  return `${today.replace(/-/g, '/')}/${count.toString().padStart(3, '0')}`;
};

// Load daily ticket count from localStorage or API
export const loadDailyTicketCount = async (): Promise<number> => {
  const today = new Date().toLocaleDateString('en-CA');
  
  try {
    // Try to get today's tickets count from API
    const res = await api.get<any>(`/batches?date=${today}`);
    const payload = getPayload<any>(res);
    const todayTickets = payload?.batches || payload || [];
    return todayTickets.length;
  } catch (error) {
    // Fallback to localStorage
    const stored = localStorage.getItem(`dailyTicketCount_${today}`);
    if (stored) {
      return parseInt(stored, 10);
    } else {
      return 0;
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
