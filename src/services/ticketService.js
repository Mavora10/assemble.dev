import api from './apiClient';

/**
 * Tickets & Check-In Services
 * Interfaces with FastAPI endpoints at /api/v1/tickets
 */

export const ticketService = {
  /**
   * Book ticket(s) for an event
   */
  async bookTicket(ticketPayload) {
    const res = await api.post('/tickets/book', ticketPayload);
    return { data: res.data, error: res.error };
  },

  /**
   * Fetch tickets booked by the currently authenticated user
   */
  async getMyTickets() {
    const res = await api.get('/tickets/my-tickets');
    if (res.error) {
      return { data: [], error: res.error };
    }
    return { data: res.data || [], error: null };
  },

  /**
   * Check in an attendee using their QR ticket code
   */
  async checkInTicket(ticketCode) {
    const res = await api.post('/tickets/check-in', { ticketCode });
    return { data: res.data, error: res.error };
  },
};

export default ticketService;
