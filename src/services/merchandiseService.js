import api from './apiClient';

/**
 * Merchandise & Swag Store Services
 * Interfaces with FastAPI endpoints at /api/v1/merchandise
 */

export const merchandiseService = {
  /**
   * Fetch swag products catalog
   */
  async getCatalog() {
    const res = await api.get('/merchandise/catalog');
    if (res.error) {
      return { data: [], error: res.error };
    }
    return { data: res.data || [], error: null };
  },

  /**
   * Submit custom merch order for an event
   */
  async createOrder(orderPayload) {
    const res = await api.post('/merchandise/orders', orderPayload);
    return { data: res.data, error: res.error };
  },

  /**
   * Fetch all orders placed by the current organizer
   */
  async getMyOrders() {
    const res = await api.get('/merchandise/orders');
    if (res.error) {
      return { data: [], error: res.error };
    }
    return { data: res.data || [], error: null };
  },

  /**
   * Get tracking and details of a single order
   */
  async getOrderById(orderId) {
    const res = await api.get(`/merchandise/orders/${orderId}`);
    return { data: res.data, error: res.error };
  },
};

export default merchandiseService;
