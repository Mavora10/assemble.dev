import api from './apiClient';

/**
 * Sponsorships & Due Diligence Services
 * Interfaces with FastAPI endpoints at /api/v1/sponsorships
 */

export const sponsorshipService = {
  /**
   * List event sponsorship opportunities
   */
  async getOpportunities(filters = {}) {
    const params = {};
    if (filters.category && filters.category !== 'All') params.category = filters.category;
    if (filters.city && filters.city !== 'All') params.city = filters.city;

    const res = await api.get('/sponsorships/opportunities', params);
    if (res.error) {
      return { data: [], error: res.error };
    }
    return { data: res.data || [], error: null };
  },

  /**
   * Submit a sponsorship bid / proposal or organizer request
   */
  async submitRequest(payload) {
    const res = await api.post('/sponsorships/requests', payload);
    return { data: res.data, error: res.error };
  },

  /**
   * Get sponsorship requests for the current user (sponsor or organizer)
   */
  async getMyRequests() {
    const res = await api.get('/sponsorships/requests');
    if (res.error) {
      return { data: [], error: res.error };
    }
    return { data: res.data || [], error: null };
  },

  /**
   * Update status of sponsorship request (e.g. approved, rejected)
   */
  async updateRequestStatus(requestId, status, message = '') {
    const res = await api.put(`/sponsorships/requests/${requestId}`, { status, message });
    return { data: res.data, error: res.error };
  },

  /**
   * Request milestone fund payout
   */
  async requestPayout(requestId, payoutPayload) {
    const res = await api.post(`/sponsorships/requests/${requestId}/payout`, payoutPayload);
    return { data: res.data, error: res.error };
  },
};

export default sponsorshipService;
