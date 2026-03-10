import api from './api';

export const getLogs = async (type: string, date: string, hour?: number) => {
  const url = hour !== undefined ? `/logs/${type}/${date}/${hour}` : `/logs/${type}/${date}`;
  const { data } = await api.get(url);
  return data;
};

export const getAnalytics = async (date: string) => {
  const { data } = await api.get(`/logs/analytics/${date}`);
  return data;
};

export const searchLogs = async (params: any) => {
  const { data } = await api.post('/logs/search', params);
  return data;
};

export const getErrorSummary = async () => {
  const { data } = await api.get('/logs/errors/summary');
  return data;
};
