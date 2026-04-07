import api from './api';

export interface ContactMessage {
  _id: string;
  messageNumber: number;
  name: string;
  email: string;
  subject: string;
  message: string;
  userId?: { _id: string; name: { first: string; last: string }; email: string } | null;
  status: 'open' | 'reopened' | 'closed';
  adminComment: string;
  adminComments?: Array<{
    _id?: string;
    text: string;
    createdAt: string;
  }>;
  closedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MessagesResponse {
  messages: ContactMessage[];
  total: number;
  page: number;
  pages: number;
}

export const sendContactMessage = async (data: {
  name: string;
  email: string;
  subject: string;
  message: string;
}): Promise<{ message: string; data: { _id: string; messageNumber: number } }> => {
  const res = await api.post('/messages', data);
  return res.data;
};

export const getMessages = async (params: {
  status?: 'active' | 'open' | 'reopened' | 'closed';
  subject?: 'general' | 'support' | 'feedback' | 'other';
  page?: number;
  search?: string;
}): Promise<MessagesResponse> => {
  const res = await api.get('/messages', { params });
  return res.data;
};

export const closeMessage = async (
  id: string,
  adminComment: string
): Promise<{ message: string; data: ContactMessage }> => {
  const res = await api.patch(`/messages/${id}/close`, { adminComment });
  return res.data;
};

export const addMessageComment = async (
  id: string,
  adminComment: string
): Promise<{ message: string; data: ContactMessage }> => {
  const res = await api.patch(`/messages/${id}/comment`, { adminComment });
  return res.data;
};

export const reopenMessage = async (
  id: string
): Promise<{ message: string; data: ContactMessage }> => {
  const res = await api.patch(`/messages/${id}/reopen`);
  return res.data;
};
