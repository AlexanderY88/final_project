import api from './api';
import { ProductFormData } from '../types/product';

export const getAll = async (page = 1, limit = 10, userId?: string, scope?: string) => {
  const { data } = await api.get('/products', { params: { page, limit, userId, scope } });
  return data;
};

export const getById = async (id: string) => {
  const { data } = await api.get(`/products/${id}`);
  return data;
};

export const create = async (productData: ProductFormData, imageFile?: File) => {
  const formData = new FormData();

  Object.entries(productData).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      formData.append(key, String(value));
    }
  });

  if (imageFile) {
    formData.append('productImage', imageFile);
  }

  const { data } = await api.post('/products/create', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
};

export const update = async (id: string, productData: ProductFormData, imageFile?: File) => {
  const formData = new FormData();

  Object.entries(productData).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      formData.append(key, String(value));
    }
  });

  if (imageFile) {
    formData.append('productImage', imageFile);
  }

  const { data } = await api.put(`/products/${id}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
};

export const remove = async (id: string) => {
  const { data } = await api.delete(`/products/${id}`);
  return data;
};

export const updateQuantity = async (id: string, quantity: number) => {
  const { data } = await api.patch(`/products/${id}/quantity`, { quantity });
  return data;
};

export const getBranchesReport = async () => {
  const { data } = await api.get('/products/branches/report');
  return data;
};
