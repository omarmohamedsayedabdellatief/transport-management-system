import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  withCredentials: true, // Send cookies (for refresh token)
});

// Attach access token from localStorage to outgoing requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('tms_access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Intercept 401 and attempt automatic token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url.includes('/auth/login') &&
      !originalRequest.url.includes('/auth/refresh')
    ) {
      originalRequest._retry = true;
      try {
        const res = await axios.post('/api/auth/refresh', {}, { withCredentials: true });
        const newToken = res.data.data.accessToken;
        localStorage.setItem('tms_access_token', newToken);
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch {
        localStorage.removeItem('tms_access_token');
        localStorage.removeItem('tms_user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;