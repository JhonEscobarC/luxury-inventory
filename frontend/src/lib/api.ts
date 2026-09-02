import axios from "axios";

export const AUTH_TOKEN_KEY = "luxury_token";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "/api",
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const SESSION_EXPIRED_EVENT = "luxury-session-expired";

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem(AUTH_TOKEN_KEY);
      window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
    }
    return Promise.reject(error);
  },
);
