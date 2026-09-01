import { api, ApiResponse } from './api';
import { LabRequestItem, LabRequestStatus } from '@/types/clinical';

export async function listLabRequests(params: { status?: LabRequestStatus; page?: number; pageSize?: number }) {
  const res = await api.get<ApiResponse<{ requests: LabRequestItem[]; pagination: { total: number; page: number; pageSize: number; totalPages: number } }>>(
    '/lab/requests',
    { params }
  );
  return res.data.data!;
}

export async function createLabRequest(input: { patientId: string; visitId?: string; testName: string; priority: string; clinicalNotes?: string }) {
  const res = await api.post<ApiResponse<{ labRequest: LabRequestItem }>>('/lab/requests', input);
  return res.data.data!.labRequest;
}

export async function updateLabRequestStatus(id: string, status: LabRequestStatus) {
  const res = await api.put<ApiResponse<{ labRequest: LabRequestItem }>>(`/lab/requests/${id}/status`, { status });
  return res.data.data!.labRequest;
}

export async function createLabResult(input: { labRequestId: string; resultData: string; remarks?: string }) {
  const res = await api.post<ApiResponse<{ result: unknown }>>('/lab/results', input);
  return res.data.data!.result;
}
