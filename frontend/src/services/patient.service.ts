import { api, ApiResponse } from './api';
import { Patient, PaginatedPatients, PatientFormValues } from '@/types/patient';

export interface ListPatientsParams {
  search?: string;
  gender?: string;
  sortBy?: 'createdAt' | 'firstName' | 'lastName' | 'dateOfBirth';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}

export async function listPatients(params: ListPatientsParams) {
  const res = await api.get<ApiResponse<PaginatedPatients>>('/patients', { params });
  return res.data.data!;
}

export async function getPatient(id: string) {
  const res = await api.get<ApiResponse<{ patient: Patient }>>(`/patients/${id}`);
  return res.data.data!.patient;
}

export async function getPatientOverview(id: string) {
  const res = await api.get<ApiResponse<Record<string, unknown>>>(`/patients/${id}/overview`);
  return res.data.data!;
}

export async function getPatientHistory(id: string) {
  const res = await api.get<ApiResponse<Record<string, unknown>>>(`/patients/${id}/history`);
  return res.data.data!;
}

export async function createPatient(values: PatientFormValues) {
  const res = await api.post<ApiResponse<{ patient: Patient }>>('/patients', values);
  return res.data.data!.patient;
}

export async function updatePatient(id: string, values: Partial<PatientFormValues>) {
  const res = await api.put<ApiResponse<{ patient: Patient }>>(`/patients/${id}`, values);
  return res.data.data!.patient;
}
