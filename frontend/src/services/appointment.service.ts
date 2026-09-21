import { api, ApiResponse } from './api';
import { AppointmentItem, AppointmentStatus } from '@/types/clinical';

export interface ListAppointmentsParams {
  appointmentId?: string;
  from?: string;
  to?: string;
  status?: AppointmentStatus;
  doctorId?: string;
  patientId?: string;
  page?: number;
  pageSize?: number;
}

export async function listAppointments(params: ListAppointmentsParams) {
  const res = await api.get<ApiResponse<{ appointments: AppointmentItem[]; pagination: { total: number; page: number; pageSize: number; totalPages: number } }>>(
    '/appointments',
    { params }
  );
  return res.data.data!;
}

export async function createAppointment(input: {
  patientId: string;
  doctorId: string;
  departmentId?: string;
  scheduledAt: string;
  reason: string;
  notes?: string;
}) {
  const res = await api.post<ApiResponse<{ appointment: AppointmentItem }>>('/appointments', input);
  return res.data.data!.appointment;
}

export async function updateAppointment(id: string, input: Partial<{ scheduledAt: string; reason: string; status: AppointmentStatus; notes: string }>) {
  const res = await api.put<ApiResponse<{ appointment: AppointmentItem }>>(`/appointments/${id}`, input);
  return res.data.data!.appointment;
}
