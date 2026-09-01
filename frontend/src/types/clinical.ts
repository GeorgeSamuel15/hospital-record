export type LabPriority = 'ROUTINE' | 'URGENT' | 'STAT';
export type LabRequestStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
export type PrescriptionStatus = 'PENDING' | 'DISPENSED' | 'CANCELLED' | 'COMPLETED';
export type AppointmentStatus = 'SCHEDULED' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
export type AdmissionStatus = 'ADMITTED' | 'DISCHARGED' | 'TRANSFERRED';

export interface PersonRef {
  firstName: string;
  lastName: string;
}

export interface PatientRef {
  firstName: string;
  lastName: string;
  patientNumber: string;
}

export interface Department {
  id: string;
  name: string;
  description: string | null;
  _count?: { users: number };
}

export interface AppointmentItem {
  id: string;
  patientId: string;
  doctorId: string;
  scheduledAt: string;
  reason: string;
  status: AppointmentStatus;
  notes: string | null;
  patient: PatientRef;
  doctor: PersonRef;
  department: Department | null;
}

export interface LabRequestItem {
  id: string;
  patientId: string;
  testName: string;
  priority: LabPriority;
  status: LabRequestStatus;
  clinicalNotes: string | null;
  requestedAt: string;
  patient: PatientRef;
  doctor?: PersonRef;
  result?: { resultData: string; remarks: string | null; completedAt: string } | null;
}

export interface PrescriptionItemLine {
  id: string;
  medication: string;
  dosage: string;
  frequency: string;
  duration: string;
  quantity: number;
  instructions: string | null;
}

export interface PrescriptionItem {
  id: string;
  patientId: string;
  status: PrescriptionStatus;
  createdAt: string;
  patient: PatientRef;
  doctor: PersonRef;
  items: PrescriptionItemLine[];
}

export interface AdmissionItem {
  id: string;
  patientId: string;
  ward: string;
  room: string;
  bed: string;
  reason: string;
  status: AdmissionStatus;
  admissionDate: string;
  dischargeDate: string | null;
  patient: PatientRef;
  admittingDoctor: PersonRef;
}

export interface StaffMember {
  id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  role: string;
  isActive: boolean;
  isDemo: boolean;
  department: { id: string; name: string } | null;
  lastLoginAt: string | null;
  createdAt: string;
}
