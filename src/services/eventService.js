import api from './apiClient';

/**
 * Events & Budgeting Services
 * Interfaces with FastAPI endpoints at /api/v1/events
 */

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
    return { data: res.data || [], error: null };
  },

  /**
   * Get single event by ID
   */
  async getEventById(eventId) {
    const res = await api.get(`/events/${eventId}`);
    return { data: res.data, error: res.error };
  },

  /**
   * Create and publish a new event
   */
  async createEvent(eventPayload) {
    const res = await api.post('/events', eventPayload);
    return { data: res.data, error: res.error };
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
