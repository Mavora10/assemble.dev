/**
 * Unified API Client for Event Horizon (Assemble.dev)
 * Handles communication with the FastAPI backend and provides fallback support.
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

export const getAuthToken = () => {
  try {
    const directToken = localStorage.getItem('assemble_auth_token');
    if (directToken) return directToken;
    const session = localStorage.getItem('assemble_session');
    if (session) {
      const parsed = JSON.parse(session);
      return parsed.token || null;
    }
  } catch (e) {
    console.error('Error reading auth token:', e);
  }
  return null;
};

export const setAuthToken = (token) => {
  if (token) {
    localStorage.setItem('assemble_auth_token', token);
  } else {
    localStorage.removeItem('assemble_auth_token');
  }
};

export const clearAuthToken = () => {
  localStorage.removeItem('assemble_auth_token');
};

/**
 * Returns the WebSocket URL for real-time rooms
 */
export const getWebSocketUrl = (path = '') => {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = window.location.host;
  // If Vite is proxying or development port 8000
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  if (import.meta.env.VITE_API_URL && import.meta.env.VITE_API_URL.includes(':8000')) {
    return `${protocol}//127.0.0.1:8000${cleanPath}`;
  }
  return `${protocol}//${host}${cleanPath}`;
};

/**
 * Core fetch wrapper with JSON serialization, Bearer token injection, and error formatting
 */
async function request(endpoint, options = {}) {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
  
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  const token = getAuthToken();
  if (token && !headers['Authorization']) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config = {
    ...options,
    headers,
  };

  if (config.body && typeof config.body === 'object' && !(config.body instanceof FormData)) {
    config.body = JSON.stringify(config.body);
  }

  try {
    const response = await fetch(url, config);
    let data = null;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      const text = await response.text();
      data = text ? { message: text } : null;
    }

    if (!response.ok) {
      const errorMessage = data?.detail || data?.message || `HTTP ${response.status}: ${response.statusText}`;
      return { data: null, error: errorMessage, status: response.status };
    }

    return { data, error: null, status: response.status };
  } catch (err) {
    console.warn(`[API Client] Network or fetch error reaching ${url}:`, err.message);
    return { data: null, error: err.message, isNetworkError: true };
  }
}

export const api = {
  get: (endpoint, params = {}, options = {}) => {
    let url = endpoint;
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        searchParams.append(key, val);
      }
    });
    const queryString = searchParams.toString();
    if (queryString) {
      url += (url.includes('?') ? '&' : '?') + queryString;
    }
    return request(url, { ...options, method: 'GET' });
  },

  post: (endpoint, body = {}, options = {}) => {
    return request(endpoint, { ...options, method: 'POST', body });
  },

  put: (endpoint, body = {}, options = {}) => {
    return request(endpoint, { ...options, method: 'PUT', body });
  },

  patch: (endpoint, body = {}, options = {}) => {
    return request(endpoint, { ...options, method: 'PATCH', body });
  },

  delete: (endpoint, options = {}) => {
    return request(endpoint, { ...options, method: 'DELETE' });
  },
};

export default api;
