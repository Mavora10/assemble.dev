import api from './apiClient';

/**
 * Events & Budgeting Services
 * Interfaces with FastAPI endpoints at /api/v1/events
 */

const FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=1200&auto=format&fit=crop';

/** Map a Supabase `events` row (snake_case) to the shape the attendee UI reads. */
export function mapEvent(row) {
  if (!row) return row;
  const price = Number(row.price ?? 0);
  return {
    ...row,
    id: row.id,
    title: row.title,
    description: row.description || '',
    category: row.category || 'Event',
    format: row.format || 'In-Person',
    startDate: row.start_date || row.startDate || '',
    time: row.start_time || row.startTime || row.time || '',
    endDate: row.end_date || row.endDate || null,
    location: row.location || 'Venue to be announced',
    city: row.city || '',
    organizer: row.organizer_name || row.organizer || 'Organizer',
    organizerName: row.organizer_name || row.organizerName || row.organizer || 'Organizer',
    organizerEmail: row.organizer_email || row.organizerEmail || '',
    organizerId: row.organizer_id || row.organizerId || null,
    price,
    isFree: row.is_free ?? row.isFree ?? price === 0,
    imageUrl: row.image_url || row.imageUrl || FALLBACK_IMAGE,
    expectedAttendees: row.expected_attendees ?? row.expectedAttendees ?? 0,
    registeredCount: row.registered_count ?? row.registeredCount ?? 0,
    checkedInCount: row.checked_in_count ?? row.checkedInCount ?? 0,
    budget: Number(row.budget ?? 0),
    revenue: Number(row.revenue ?? 0),
    ticketTiers: row.ticket_tiers || row.ticketTiers || [],
    sponsorshipOpportunities: row.sponsorship_opportunities || row.sponsorshipOpportunities || [],
    speakers: row.speakers || [],
    schedule: row.schedule || [],
    venueDetails: row.venue_details || row.venueDetails || null,
    status: row.status || 'published',
    volunteersNeeded: row.volunteers_needed ?? row.volunteersNeeded ?? 0,
    associatedCommunities: row.associated_communities || row.associatedCommunities || [],
    swagOrder: row.swag_order || row.swagOrder || null,
  };
}

export const eventService = {
  /**
   * Fetch list of events with optional search, category, city, and price filtering
   */
  async getEvents(filters = {}) {
    const params = {};
    if (filters.search) params.search = filters.search;
    if (filters.category && filters.category !== 'All') params.category = filters.category;
    if (filters.city && filters.city !== 'All') params.city = filters.city;
    if (filters.isFree !== undefined && filters.isFree !== null) params.isFree = filters.isFree;
    if (filters.limit) params.limit = filters.limit;

    const res = await api.get('/events', params);
    if (res.error) {
      return { data: [], error: res.error };
    }
    const rows = Array.isArray(res.data) ? res.data : [];
    return { data: rows.map(mapEvent), error: null };
  },

  /**
   * Get single event by ID
   */
  async getEventById(eventId) {
    const res = await api.get(`/events/${eventId}`);
    return { data: res.data ? mapEvent(res.data) : null, error: res.error };
  },

  /**
   * Create and publish/save a new event
   */
  async createEvent(eventPayload) {
    const res = await api.post('/events', eventPayload);
    return { data: res.data, error: res.error };
  },

  /**
   * Update an existing draft or published event
   * Enforces organizer ownership on backend and notifies attendees on finalized changes
   */
  async updateEvent(eventId, eventPayload) {
    const res = await api.put(`/events/${eventId}`, eventPayload);
    return { data: res.data, error: res.error };
  },

  /**
   * Update schedule/agenda for an event
   */
  async updateEventSchedule(eventId, schedule) {
    const res = await api.put(`/events/${eventId}/schedule`, { schedule });
    return { data: res.data, error: res.error };
  },

  /**
   * Retrieve registered attendees for an event (organizer-only)
   */
  async getEventAttendees(eventId) {
    const res = await api.get(`/events/${eventId}/attendees`);
    return { data: res.data || [], error: res.error };
  },

  /**
   * Retrieve event budget, revenue, and expenses
   */
  async getEventFinances(eventId) {
    const res = await api.get(`/events/${eventId}/finances`);
    return { data: res.data, error: res.error };
  },

  /**
   * Log an expense for an event
   */
  async logEventExpense(eventId, expensePayload) {
    const res = await api.post(`/events/${eventId}/expenses`, expensePayload);
    return { data: res.data, error: res.error };
  },
};

export default eventService;
