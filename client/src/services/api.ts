import axios from 'axios';
import { setSessionExpiredState } from '../utils/session';

const api = axios.create({
  baseURL: (process as any).env.REACT_APP_API_URL || 'http://localhost:5000/api',
  timeout: 10000,
});

const getApiErrorText = (data: unknown) => {
  if (typeof data === 'string') {
    return data;
  }

  if (data && typeof data === 'object') {
    const apiData = data as { error?: string; message?: string };
    return apiData.error || apiData.message || '';
  }

  return '';
};

const isExpiredSessionError = (status?: number, data?: unknown) => {
  const message = getApiErrorText(data).toLowerCase();
  return status === 401 || (status === 400 && message === 'jwt expired');
};

const redirectToSessionExpired = (message: string) => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  setSessionExpiredState(message);

  if (window.location.pathname !== '/session-expired') {
    window.location.replace('/session-expired');
  }
};

// Add token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers['auth-token'] = token;
  }
  return config;
});

// If the backend reports an expired session, clear auth and show a dedicated screen.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const data = error.response?.data;

    if (isExpiredSessionError(status, data)) {
      redirectToSessionExpired('Your session expired. Please log in again.');
    }

    return Promise.reject(error);
  }
);

export default api;