import api from './apiClient';

/**
 * Venues Marketplace & Bookings Services
 * Interfaces with FastAPI endpoints at /api/v1/venues
 */

export const venueService = {
  /**
   * Search directory of venues with filters
   */
  async getVenues(filters = {}) {
    const params = {};
    if (filters.city && filters.city !== 'All') params.city = filters.city;
    if (filters.minCapacity) params.minCapacity = filters.minCapacity;
    if (filters.maxPrice) params.maxPrice = filters.maxPrice;
    if (filters.amenities) params.amenities = filters.amenities;
    if (filters.vibe && filters.vibe !== 'All') params.vibe = filters.vibe;

    const res = await api.get('/venues', params);
    if (res.error) {
      return { data: [], error: res.error };
    }
    return { data: res.data || [], error: null };
  },

  /**
   * Get single venue by ID
   */
  async getVenueById(venueId) {
    const res = await api.get(`/venues/${venueId}`);
    return { data: res.data, error: res.error };
  },

  /**
   * Register a new venue
   */
  async createVenue(venuePayload) {
    const res = await api.post('/venues', venuePayload);
    return { data: res.data, error: res.error };
  },

  /**
   * Book a venue for an event
   */
  async bookVenue(venueId, bookingPayload) {
    const res = await api.post(`/venues/${venueId}/bookings`, bookingPayload);
    return { data: res.data, error: res.error };
  },

  /**
   * Fetch all venue bookings (for host or organizer)
   */
  async getBookings(filters = {}) {
    const params = {};
    if (filters.venueId) params.venueId = filters.venueId;
    if (filters.eventId) params.eventId = filters.eventId;
    if (filters.organizerId) params.organizerId = filters.organizerId;
    if (filters.status) params.status = filters.status;

    const res = await api.get('/venues/bookings', params);
    if (res.error) {
      return { data: [], error: res.error };
    }
    return { data: res.data || [], error: null };
  },

  /**
   * Update status of a venue booking (e.g. confirmed, declined, completed)
   */
  async updateBookingStatus(bookingId, status) {
    const res = await api.patch(`/venues/bookings/${bookingId}/status`, { status });
    return { data: res.data, error: res.error };
  },
};

export default venueService;
