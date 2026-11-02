import api, { setAuthToken, clearAuthToken } from './apiClient';

/**
 * Authentication & Multi-Role Services
 * Interfaces with FastAPI endpoints at /api/v1/auth
 */

export const authService = {
  /**
   * Register a new user with base credentials and active role
   */
  async signUpUser({ email, password, name, phone = '', city = '', initialRole = 'attendee' }) {
    const res = await api.post('/auth/signup', {
      email,
      password,
      name,
      phone,
      city,
      initialRole,
    });

    if (res.error) {
      return { user: null, token: null, error: res.error };
    }

    if (res.data?.token) {
      setAuthToken(res.data.token);
      const userObj = {
        ...res.data.user,
        token: res.data.token,
        role: res.data.user.active_role || initialRole,
      };
      localStorage.setItem('assemble_session', JSON.stringify(userObj));
      return { user: userObj, token: res.data.token, error: null };
    }

    return { user: null, token: null, error: 'Registration did not return a session.' };
  },

  /**
   * Authenticate with email & password
   */
  async signInUser({ email, password }) {
    const res = await api.post('/auth/login', { email, password });
    
    if (res.error) {
      return { user: null, token: null, error: res.error };
    }

    if (res.data?.token) {
      setAuthToken(res.data.token);
      const userObj = {
        ...res.data.user,
        token: res.data.token,
        role: res.data.user.active_role || 'attendee',
      };
      localStorage.setItem('assemble_session', JSON.stringify(userObj));
      return { user: userObj, token: res.data.token, error: null };
    }

    return { user: null, token: null, error: 'Login failed to return session token.' };
  },

  /**
   * Log out and clear active session
   */
  async signOutUser() {
    clearAuthToken();
    localStorage.removeItem('assemble_session');
    return { success: true };
  },

  /**
   * Fetch current user profile
   */
  async getCurrentUserProfile() {
    const res = await api.get('/auth/me');
    if (res.error) {
      return { user: null, error: res.error };
    }
    return { user: res.data, error: null };
  },

  /**
   * Switch active role persona
   */
  async switchActiveRole(targetRole) {
    const res = await api.post('/auth/switch-role', { targetRole });
    if (res.error) {
      return { user: null, error: res.error };
    }

    if (res.data?.token) {
      setAuthToken(res.data.token);
    }
    if (res.data?.user) {
      const current = JSON.parse(localStorage.getItem('assemble_session') || '{}');
      const updated = {
        ...current,
        ...res.data.user,
        role: targetRole,
      };
      localStorage.setItem('assemble_session', JSON.stringify(updated));
      return { user: updated, error: null };
    }

    return { user: null, error: 'Failed to switch role' };
  },

  /**
   * Save onboarding profile data for a role capability
   */
  async setupRole(role, profileData) {
    const res = await api.post('/auth/setup-role', { role, profileData });
    if (res.error) {
      return { data: null, error: res.error };
    }
    return { data: res.data, error: null };
  },
};

export default authService;
