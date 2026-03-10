import api from './api';
import { User } from '../types/auth';
import { CreateChildBrunchData } from '../types/user';

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

export const deleteUser = async (id: string) => {
  const { data } = await api.delete(`/users/${id}`);
  return data;
};

export const getChildBranches = async () => {
  const { data } = await api.get('/users/child-brunches');
  return data;
};

export const createChildBranch = async (branchData: CreateChildBrunchData) => {
  const { data } = await api.post('/users/create-child-brunch', branchData);
  return data;
};

export const getAllUsers = async (): Promise<User[]> => {
  const { data } = await api.get('/users/all');
  return data;
};
