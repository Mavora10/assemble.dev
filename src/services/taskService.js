import api from './apiClient';

/**
 * Organizer Task Management Services
 * Interfaces with FastAPI endpoints at /api/v1/events/{eventId}/tasks
 */

export const taskService = {
  /**
   * Fetch all preparation tasks for an event
   */
  async getEventTasks(eventId) {
    const res = await api.get(`/events/${eventId}/tasks`);
    if (res.error) {
      return { data: [], error: res.error };
    }
    return { data: res.data || [], error: null };
  },

  /**
   * Create a new task for an event
   */
  async createEventTask(eventId, taskPayload) {
    const res = await api.post(`/events/${eventId}/tasks`, taskPayload);
    return { data: res.data, error: res.error };
  },

  /**
   * Update task status, assignee, or priority
   */
  async updateEventTask(eventId, taskId, updates) {
    const res = await api.put(`/events/${eventId}/tasks/${taskId}`, updates);
    return { data: res.data, error: res.error };
  },

  /**
   * Delete a task
   */
  async deleteEventTask(eventId, taskId) {
    const res = await api.delete(`/events/${eventId}/tasks/${taskId}`);
    return { data: res.data, error: res.error };
  },

  /**
   * Pre-populate event with recommended checklist template
   */
  async applyTemplate(eventId, templateName = 'Tech Conference') {
    const res = await api.post(`/events/${eventId}/tasks/apply-template`, { template_name: templateName });
    return { data: res.data, error: res.error };
  },
};

export default taskService;
