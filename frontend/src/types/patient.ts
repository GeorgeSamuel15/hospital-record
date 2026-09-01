export type Gender = 'MALE' | 'FEMALE' | 'OTHER';

export interface PatientListItem {
  id: string;
  patientNumber: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: Gender;
  phone: string | null;
  email: string | null;
  createdAt: string;
}

// Note: the backend now returns a role-based subset of these fields from
// GET /patients/:id — Admin/Doctor/Nurse get everything below, but
// Receptionist/Lab Technician/Pharmacist get a smaller projection (see
// backend/src/services/patient.service.ts, getPatientForRole). Fields not
// returned for the current user's role will simply be undefined at runtime;
// existing UI code already renders those defensively (e.g. "None recorded"
// fallbacks), so this is safe, but the type below reflects the "full access"
// shape rather than a role-specific one.
export interface Patient extends PatientListItem {
  address: string | null;
  bloodGroup: string | null;
  genotype: string | null;
  allergies: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  nextOfKinName: string | null;
  nextOfKinPhone: string | null;
  registeredById: string;
  updatedAt: string;
}

export interface PaginatedPatients {
  patients: PatientListItem[];
  pagination: { total: number; page: number; pageSize: number; totalPages: number };
}

export interface PatientFormValues {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: Gender | '';
  phone?: string;
  email?: string;
  address?: string;
  bloodGroup?: string;
  genotype?: string;
  allergies?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  nextOfKinName?: string;
  nextOfKinPhone?: string;
}

export function calculateAge(dateOfBirth: string): number {
  const dob = new Date(dateOfBirth);
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const monthDiff = now.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < dob.getDate())) age--;
  return age;
}
