import api from './api';
import { User } from '../types/auth';
import { CreateChildBrunchData } from '../types/user';

export interface GetAllUsersQuery {
  search?: string;
  role?: 'admin' | 'main_brunch' | 'user';
  city?: string;
}

export interface CreateUserData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: 'admin' | 'main_brunch' | 'user';
  phone?: string;
  city?: string;
  country?: string;
  street?: string;
  houseNumber?: number;
  zip?: number;
  mainBrunchId?: string;
}

export const getProfile = async (): Promise<User> => {
  const { data } = await api.get('/users/profile');
  return data;
};

export const getById = async (id: string): Promise<User> => {
  const { data } = await api.get(`/users/${id}`);
  return data;
};

export const updateProfile = async (id: string, userData: any) => {
  const { data } = await api.put(`/users/update-profile/${id}`, userData);
  return data;
};

export const updatePassword = async (id: string, newPassword: string) => {
  const { data } = await api.put(`/users/change-password/${id}`, { newPassword });
  return data;
};

export const deleteUser = async (id: string) => {
  const { data } = await api.delete(`/users/${id}`);
  return data;
};

export const getChildBranches = async (mainBrunchId?: string) => {
  const { data } = await api.get('/users/child-brunches', { params: { mainBrunchId } });
  return data;
};

export const createChildBranch = async (branchData: CreateChildBrunchData) => {
  const { data } = await api.post('/users/create-child-brunch', branchData);
  return data;
};

export const createUser = async (userData: CreateUserData) => {
  const { data } = await api.post('/users/create-user', userData);
  return data;
};

export const getAllUsers = async (query?: GetAllUsersQuery): Promise<User[]> => {
  const { data } = await api.get('/users/all', { params: query });
  return data;
};
