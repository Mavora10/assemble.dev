import api from './apiClient';

/**
 * Tickets & Check-In Services
 * Interfaces with FastAPI endpoints at /api/v1/tickets
 */

/** Map a `tickets` row (plus joined event) to the attendee pass shape. */
export function mapTicket(row) {
  if (!row) return row;
  const event = row.events || {};
  const ticketId = row.ticket_id || row.ticketId;
  const eventId = row.event_id || row.eventId;
  const location = event.location || row.location || '';
  const city = event.city || '';
  return {
    ...row,
    ticketId,
    eventId,
    eventTitle: event.title || row.eventTitle || '',
    userName: row.user_name || row.userName || '',
    userEmail: row.user_email || row.userEmail || '',
    phone: row.phone || '',
    date: event.start_date || row.date || row.registration_date || '',
    time: event.start_time || row.time || '',
    venue: location ? `${location}${city ? `, ${city}` : ''}` : (row.venue || ''),
    price: Number(row.price ?? 0),
    ticketTierName: row.ticket_tier_name || row.ticketTierName || 'General Admission',
    registrationDate: row.registration_date || row.registrationDate || '',
    registrationType: row.registration_type || row.registrationType || 'Attendee',
    status: row.status || 'confirmed',
    qrCodeData: row.qrCodeData || (ticketId ? `ASSEMBLE:${ticketId}:${eventId}` : ''),
  };
}

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
    const rows = Array.isArray(res.data) ? res.data : [];
    return { data: rows.map(mapTicket), error: null };
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
