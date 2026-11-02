import api from './apiClient';

/**
 * Speakers Marketplace & Lineups Services
 * Interfaces with FastAPI endpoints at /api/v1/speakers
 */

export const speakerService = {
  /**
   * Search directory of keynote speakers
   */
  async getSpeakers(filters = {}) {
    const params = {};
    if (filters.topic) params.topic = filters.topic;
    if (filters.location && filters.location !== 'All') params.location = filters.location;
    if (filters.availableOnly !== undefined) params.availableOnly = filters.availableOnly;

    const res = await api.get('/speakers', params);
    if (res.error) {
      return { data: [], error: res.error };
    }
    return { data: res.data || [], error: null };
  },

  /**
   * Get single speaker details
   */
  async getSpeakerById(speakerId) {
    const res = await api.get(`/speakers/${speakerId}`);
    return { data: res.data, error: res.error };
  },

  /**
   * Send speaking invitation to a speaker for an event
   */
  async inviteSpeaker(invitePayload) {
    const res = await api.post('/speakers/invitations', invitePayload);
    return { data: res.data, error: res.error };
  },

  /**
   * Get invitations received by the current speaker or sent by organizer
   */
  async getMyInvitations() {
    const res = await api.get('/speakers/invitations');
    if (res.error) {
      return { data: [], error: res.error };
    }
    return { data: res.data || [], error: null };
  },

  /**
   * Accept or decline a speaking invitation
   */
  async updateInvitationStatus(inviteId, status) {
    const res = await api.put(`/speakers/invitations/${inviteId}`, { status });
    return { data: res.data, error: res.error };
  },

  /**
   * Get confirmed lineup for an event
   */
  async getEventLineup(eventId) {
    const res = await api.get(`/events/${eventId}/lineup`);
    if (res.error) {
      return { data: [], error: res.error };
    }
    return { data: res.data || [], error: null };
  },
};

export default speakerService;
