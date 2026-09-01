import { api, ApiResponse } from './api';
import { StaffMember, Department } from '@/types/clinical';

// --- Staff --------------------------------------------------------------

export async function listStaff(params: { role?: string; search?: string; page?: number; pageSize?: number }) {
  const res = await api.get<ApiResponse<{ staff: StaffMember[]; pagination: { total: number; page: number; pageSize: number; totalPages: number } }>>(
    '/staff',
    { params }
  );
  return res.data.data!;
}

export async function createStaff(input: { firstName: string; lastName: string; email: string; phone?: string; role: string; departmentId?: string }) {
  const res = await api.post<ApiResponse<{ user: StaffMember; tempPassword: string }>>('/staff', input);
  return res.data.data!;
}

export async function updateStaff(id: string, input: Partial<{ firstName: string; lastName: string; phone: string; role: string; departmentId: string }>) {
  const res = await api.put<ApiResponse<{ user: StaffMember }>>(`/staff/${id}`, input);
  return res.data.data!.user;
}

export async function setStaffActive(id: string, active: boolean) {
  const res = await api.put<ApiResponse<{ user: StaffMember }>>(`/staff/${id}/${active ? 'activate' : 'deactivate'}`);
  return res.data.data!.user;
}

export async function resetStaffPassword(id: string) {
  const res = await api.put<ApiResponse<{ tempPassword: string }>>(`/staff/${id}/reset-password`);
  return res.data.data!.tempPassword;
}

// --- Departments ----------------------------------------------------------

export async function listDepartments() {
  const res = await api.get<ApiResponse<{ departments: Department[] }>>('/departments');
  return res.data.data!.departments;
}

export async function createDepartment(input: { name: string; description?: string }) {
  const res = await api.post<ApiResponse<{ department: Department }>>('/departments', input);
  return res.data.data!.department;
}

export async function updateDepartment(id: string, input: Partial<{ name: string; description: string }>) {
  const res = await api.put<ApiResponse<{ department: Department }>>(`/departments/${id}`, input);
  return res.data.data!.department;
}

// --- Visits / vitals / diagnoses ------------------------------------------

export async function createVisit(input: { patientId: string; appointmentId?: string; chiefComplaint: string; historyOfPresentIllness?: string; examination?: string; assessment?: string; treatmentPlan?: string; notes?: string }) {
  const res = await api.post<ApiResponse<{ visit: { id: string } }>>('/visits', input);
  return res.data.data!.visit;
}

export async function createVital(input: { patientId: string; visitId?: string; temperatureC?: number; bloodPressureSystolic?: number; bloodPressureDiastolic?: number; pulseRate?: number; respiratoryRate?: number; oxygenSaturation?: number; weightKg?: number; heightCm?: number }) {
  const res = await api.post<ApiResponse<{ vital: { id: string } }>>('/vitals', input);
  return res.data.data!.vital;
}

export async function createDiagnosis(input: { patientId: string; visitId?: string; diagnosis: string; description?: string }) {
  const res = await api.post<ApiResponse<{ diagnosis: { id: string } }>>('/diagnoses', input);
  return res.data.data!.diagnosis;
}

// --- Dashboard --------------------------------------------------------

export interface DashboardSummary {
  totalPatients: number;
  todaysAppointments: number;
  activeAdmissions: number;
  pendingLabTests: number;
  activePrescriptions: number;
  doctorCount: number;
  nurseCount: number;
  staffCount: number;
}

export async function getDashboardSummary() {
  const res = await api.get<ApiResponse<DashboardSummary>>('/dashboard/summary');
  return res.data.data!;
}

export async function getRegistrationTrend() {
  const res = await api.get<ApiResponse<{ trend: { date: string; count: number }[] }>>('/dashboard/registration-trend');
  return res.data.data!.trend;
}

export async function getTodaysSchedule() {
  const res = await api.get<ApiResponse<{ appointments: unknown[] }>>('/dashboard/todays-schedule');
  return res.data.data!.appointments;
}

export async function getPendingLabTests() {
  const res = await api.get<ApiResponse<{ labRequests: unknown[] }>>('/dashboard/pending-lab-tests');
  return res.data.data!.labRequests;
}

export async function getRecentActivity() {
  const res = await api.get<ApiResponse<{ logs: unknown[] }>>('/dashboard/recent-activity');
  return res.data.data!.logs;
}

// --- System settings ----------------------------------------------------

export interface SystemSettings {
  id: string;
  hospitalName: string;
  supportEmail: string | null;
  appointmentSlotMinutes: number;
  sessionTimeoutMinutes: number;
  updatedAt: string;
}

export async function getSettings() {
  const res = await api.get<ApiResponse<{ settings: SystemSettings }>>('/settings');
  return res.data.data!.settings;
}

export async function updateSettings(input: {
  hospitalName: string;
  supportEmail?: string;
  appointmentSlotMinutes: number;
  sessionTimeoutMinutes: number;
}) {
  const res = await api.put<ApiResponse<{ settings: SystemSettings }>>('/settings', input);
  return res.data.data!.settings;
}

// --- Audit logs -------------------------------------------------------

export async function listAuditLogs(params: { action?: string; resource?: string; page?: number; pageSize?: number }) {
  const res = await api.get<ApiResponse<{ logs: unknown[]; pagination: { total: number; page: number; pageSize: number; totalPages: number } }>>(
    '/audit-logs',
    { params }
  );
  return res.data.data!;
}
