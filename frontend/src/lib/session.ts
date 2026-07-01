const NAME = 'session';
const MAX_AGE = 7 * 24 * 60 * 60; // 7 days — matches JWT expiration

export const setSessionCookie = () => {
  const secure = location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${NAME}=1; path=/; max-age=${MAX_AGE}; SameSite=Lax${secure}`;
};

export const clearSessionCookie = () => {
  document.cookie = `${NAME}=; path=/; max-age=0`;
};
