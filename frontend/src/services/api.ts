import axios from 'axios';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api',
  withCredentials: true, // send/receive httpOnly auth cookies
  headers: { 'Content-Type': 'application/json' },
});

// Standard API envelope returned by the backend for every response.
export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: Record<string, string[] | undefined>;
}

let isRefreshing = false;
let pendingQueue: Array<{ retry: () => void; reject: (reason?: unknown) => void }> = [];

// If an access token expires mid-session, try one silent refresh before
// giving up and forcing the user back to login.
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry && !originalRequest.url?.includes('/auth/')) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          pendingQueue.push({ retry: () => resolve(api(originalRequest)), reject });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        await api.post('/auth/refresh');
        pendingQueue.forEach(({ retry }) => retry());
        pendingQueue = [];
        return api(originalRequest);
      } catch (refreshError) {
        pendingQueue.forEach(({ reject }) => reject(refreshError));
        pendingQueue = [];
        window.location.replace('/login');
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);
