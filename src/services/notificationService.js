import api from './apiClient';

/**
 * Attendee Notifications Service
 * Interfaces with FastAPI endpoints at /api/v1/notifications
 */

export const notificationService = {
  /**
   * Fetch all notifications for the currently logged-in user
   */
  async getNotifications() {
    const res = await api.get('/notifications');
    if (res.error) {
      return { data: [], error: res.error };
    }
    return { data: res.data || [], error: null };
  },

  /**
   * Mark a single notification as read
   */
  async markAsRead(notificationId) {
    const res = await api.patch(`/notifications/${notificationId}/read`);
    return { data: res.data, error: res.error };
  },

  /**
   * Mark all notifications for the current user as read
   */
  async markAllAsRead() {
    const res = await api.post('/notifications/read-all');
    return { data: res.data, error: res.error };
  },
};

export default notificationService;

