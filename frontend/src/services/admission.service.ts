import { api, ApiResponse } from './api';
import { AdmissionItem, AdmissionStatus } from '@/types/clinical';

export async function listAdmissions(params: { status?: AdmissionStatus; page?: number; pageSize?: number }) {
  const res = await api.get<ApiResponse<{ admissions: AdmissionItem[]; pagination: { total: number; page: number; pageSize: number; totalPages: number } }>>(
    '/admissions',
    { params }
  );
  return res.data.data!;
}

export async function admitPatient(input: { patientId: string; doctorId: string; ward: string; room: string; bed: string; reason: string }) {
  const res = await api.post<ApiResponse<{ admission: AdmissionItem }>>('/admissions', input);
  return res.data.data!.admission;
}

export async function dischargePatient(id: string, input: { dischargeDiagnosis?: string; dischargeNotes?: string }) {
  const res = await api.put<ApiResponse<{ admission: AdmissionItem }>>(`/admissions/${id}/discharge`, input);
  return res.data.data!.admission;
}
