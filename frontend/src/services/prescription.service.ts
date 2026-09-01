import { api, ApiResponse } from './api';
import { PrescriptionItem, PrescriptionStatus } from '@/types/clinical';

export async function listPrescriptions(params: { status?: PrescriptionStatus; patientId?: string; page?: number; pageSize?: number }) {
  const res = await api.get<ApiResponse<{ prescriptions: PrescriptionItem[]; pagination: { total: number; page: number; pageSize: number; totalPages: number } }>>(
    '/prescriptions',
    { params }
  );
  return res.data.data!;
}

export interface PrescriptionLineInput {
  medication: string;
  dosage: string;
  frequency: string;
  duration: string;
  quantity: number;
  instructions?: string;
}

export async function createPrescription(input: { patientId: string; visitId?: string; items: PrescriptionLineInput[] }) {
  const res = await api.post<ApiResponse<{ prescription: PrescriptionItem }>>('/prescriptions', input);
  return res.data.data!.prescription;
}

export async function updatePrescriptionStatus(id: string, status: PrescriptionStatus) {
  const res = await api.put<ApiResponse<{ prescription: PrescriptionItem }>>(`/prescriptions/${id}`, { status });
  return res.data.data!.prescription;
}
