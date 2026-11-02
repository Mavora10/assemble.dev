import api, { getWebSocketUrl } from './apiClient';

/**
 * Communities & Live Rooms Services
 * Interfaces with FastAPI endpoints at /api/v1/communities and WebSocket /ws/community/{id}
 */

export const communityService = {
  /**
   * Fetch all communities
   */
  async getCommunities() {
    const res = await api.get('/communities');
    if (res.error) {
      return { data: [], error: res.error };
    }
    return { data: res.data || [], error: null };
  },

  /**
   * Get single community by ID
   */
  async getCommunityById(communityId) {
    const res = await api.get(`/communities/${communityId}`);
    return { data: res.data, error: res.error };
  },

  /**
   * Create a new community room
   */
  async createCommunity(payload) {
    const res = await api.post('/communities', payload);
    return { data: res.data, error: res.error };
  },

  /**
   * Join a community
   */
  async joinCommunity(communityId) {
    const res = await api.post(`/communities/${communityId}/join`);
    return { data: res.data, error: res.error };
  },

  /**
   * Fetch recent messages / discussions for a community
   */
  async getMessages(communityId, limit = 50) {
    const res = await api.get(`/communities/${communityId}/messages`, { limit });
    if (res.error) {
      return { data: [], error: res.error };
    }
    return { data: res.data || [], error: null };
  },

  /**
   * Post message to community discussions
   */
  async postMessage(communityId, messagePayload) {
    const res = await api.post(`/communities/${communityId}/messages`, messagePayload);
    return { data: res.data, error: res.error };
  },

  /**
   * Open real-time WebSocket connection to the community room
   */
  createWebSocketConnection(communityId, { onMessage, onOpen, onClose, onError }) {
    const wsUrl = getWebSocketUrl(`/ws/community/${communityId}`);
    const socket = new WebSocket(wsUrl);

    socket.onopen = (event) => {
      console.log(`[WebSocket] Connected to community room ${communityId}`);
      if (onOpen) onOpen(event);
    };

    socket.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data);
        if (onMessage) onMessage(parsed);
      } catch (e) {
        console.error('[WebSocket] Error parsing message:', e);
      }
    };

    socket.onclose = (event) => {
      console.log(`[WebSocket] Closed connection for ${communityId}`);
      if (onClose) onClose(event);
    };

    socket.onerror = (err) => {
      console.warn(`[WebSocket] Error on ${wsUrl}:`, err);
      if (onError) onError(err);
    };

    return {
      socket,
      send(payload) {
        if (socket.readyState === WebSocket.OPEN) {
          socket.send(typeof payload === 'string' ? payload : JSON.stringify(payload));
        } else {
          console.warn('[WebSocket] Cannot send message, socket not OPEN');
        }
      },
      close() {
        socket.close();
      }
    };
  }
};

export default communityService;
