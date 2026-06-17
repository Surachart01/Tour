import axios from 'axios';

const getBaseURL = () => {
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl) {
    // Trim trailing slash if present
    const cleanedUrl = envUrl.endsWith('/') ? envUrl.slice(0, -1) : envUrl;
    // Auto-append /api/v1 if not already present in the env url
    return cleanedUrl.endsWith('/api/v1') ? cleanedUrl : `${cleanedUrl}/api/v1`;
  }
  return 'http://localhost:8081/api/v1';
};

const api = axios.create({
  baseURL: getBaseURL(),
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to attach JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle unauthorized errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      console.warn('Unauthorized request, logging out...');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // Redirect to login if on client side
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
