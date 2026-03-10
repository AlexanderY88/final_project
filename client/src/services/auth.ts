import api from './api';
import { LoginCredentials, RegisterData, User } from '../types/auth';

export const login = async (credentials: LoginCredentials) => {
  // Server returns a raw JWT token string
  const { data: token } = await api.post('/users/login', credentials);
  localStorage.setItem('token', token);

  // Fetch full user profile
  const { data: user } = await api.get('/users/profile');
  localStorage.setItem('user', JSON.stringify(user));

  return { user, token };
};

export const register = async (userData: RegisterData) => {
  const { data: token } = await api.post('/users/register', userData);
  localStorage.setItem('token', token);

  const { data: user } = await api.get('/users/profile');
  localStorage.setItem('user', JSON.stringify(user));

  return { user, token };
};

export const getProfile = async (): Promise<User> => {
  const { data } = await api.get('/users/profile');
  localStorage.setItem('user', JSON.stringify(data));
  return data;
};

export const logout = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
};

export const getStoredToken = (): string | null => {
  return localStorage.getItem('token');
};

export const getStoredUser = (): User | null => {
  const str = localStorage.getItem('user');
  return str ? JSON.parse(str) : null;
};

export const isAuthenticated = (): boolean => {
  return !!(getStoredToken() && getStoredUser());
};