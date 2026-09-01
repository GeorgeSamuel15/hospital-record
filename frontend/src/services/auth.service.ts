import { api, ApiResponse } from './api';
import { CurrentUser } from '@/types/auth';

export async function loginRequest(email: string, password: string) {
  const res = await api.post<ApiResponse<{ user: CurrentUser }>>('/auth/login', { email, password });
  return res.data.data!.user;
}

export async function logoutRequest() {
  await api.post('/auth/logout');
}

export async function fetchCurrentUser() {
  const res = await api.get<ApiResponse<{ user: CurrentUser }>>('/auth/me');
  return res.data.data!.user;
}

export async function forgotPasswordRequest(email: string) {
  const res = await api.post<ApiResponse<never>>('/auth/forgot-password', { email });
  return res.data.message;
}

export async function resetPasswordRequest(token: string, newPassword: string) {
  const res = await api.post<ApiResponse<never>>('/auth/reset-password', { token, newPassword });
  return res.data.message;
}

export async function changePasswordRequest(currentPassword: string, newPassword: string) {
  const res = await api.post<ApiResponse<never>>('/auth/change-password', { currentPassword, newPassword });
  return res.data.message;
}
