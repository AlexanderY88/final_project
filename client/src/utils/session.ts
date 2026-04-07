export const SESSION_EXPIRED_KEY = 'sessionExpiredMessage';

export const setSessionExpiredState = (message: string) => {
  sessionStorage.setItem(SESSION_EXPIRED_KEY, message);
};

export const getSessionExpiredState = () => {
  return sessionStorage.getItem(SESSION_EXPIRED_KEY);
};

export const clearSessionExpiredState = () => {
  sessionStorage.removeItem(SESSION_EXPIRED_KEY);
};