export type Role = 'ADMIN' | 'DOCTOR' | 'NURSE' | 'RECEPTIONIST' | 'LAB_TECHNICIAN' | 'PHARMACIST';

export interface CurrentUser {
  id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  email: string;
  role: Role;
  departmentId: string | null;
  isDemo?: boolean;
}

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: 'Administrator',
  DOCTOR: 'Doctor',
  NURSE: 'Nurse',
  RECEPTIONIST: 'Receptionist',
  LAB_TECHNICIAN: 'Laboratory Technician',
  PHARMACIST: 'Pharmacist',
};
