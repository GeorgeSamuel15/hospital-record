import '../test/setupEnv';
import { prismaMock, resetPrismaMock } from '../test/prismaMock';

jest.mock('../config/prisma', () => ({ prisma: prismaMock }));

import request from 'supertest';
import app from '../app';
import { signAccessToken, ACCESS_TOKEN_COOKIE } from '../utils/tokens';

interface FakeUser {
  id: string;
  role: string;
  email: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
}

// A registry of "known users" keyed by id, so prisma.user.findUnique can
// discriminate between the authenticated caller's own lookup (in
// requireAuth) and an unrelated lookup for a *different* id, such as
// createAppointment validating the selected doctor. Returning the same
// mocked object for every call regardless of id (the naive approach) would
// silently make every "doctor" in a test actually be the logged-in user.
const knownUsers = new Map<string, FakeUser>();

function registerUser(user: FakeUser) {
  knownUsers.set(user.id, user);
}

function authCookieFor(role: 'DOCTOR' | 'NURSE' | 'PHARMACIST' | 'LAB_TECHNICIAN' | 'ADMIN' | 'RECEPTIONIST') {
  const userId = `user_${role.toLowerCase()}`;
  registerUser({ id: userId, role, email: `${role.toLowerCase()}@hospital.demo`, firstName: 'Test', lastName: 'User', isActive: true });

  const token = signAccessToken({ sub: userId, role: role as never });
  return `${ACCESS_TOKEN_COOKIE}=${token}`;
}

beforeEach(() => {
  resetPrismaMock();
  knownUsers.clear();
  prismaMock.user.findUnique.mockImplementation(((args: { where: { id?: string } }) => {
    const id = args.where.id;
    return Promise.resolve((id ? knownUsers.get(id) : undefined) ?? null);
  }) as never);
});

describe('Prescription status transitions (fixes H1)', () => {
  it('rejects moving a PENDING prescription directly to COMPLETED (must go through DISPENSED first)', async () => {
    const cookie = authCookieFor('PHARMACIST');
    prismaMock.prescription.findUnique.mockResolvedValue({ id: 'rx_1', status: 'PENDING' } as never);

    const res = await request(app)
      .put('/api/prescriptions/rx_1')
      .set('Cookie', cookie)
      .send({ status: 'COMPLETED' });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/cannot change/i);
    expect(prismaMock.prescription.update).not.toHaveBeenCalled();
  });

  it('rejects moving a DISPENSED prescription back to PENDING', async () => {
    const cookie = authCookieFor('PHARMACIST');
    prismaMock.prescription.findUnique.mockResolvedValue({ id: 'rx_1', status: 'DISPENSED' } as never);

    const res = await request(app).put('/api/prescriptions/rx_1').set('Cookie', cookie).send({ status: 'PENDING' });

    expect(res.status).toBe(400);
    expect(prismaMock.prescription.update).not.toHaveBeenCalled();
  });

  it('allows the valid PENDING -> DISPENSED transition', async () => {
    const cookie = authCookieFor('PHARMACIST');
    prismaMock.prescription.findUnique.mockResolvedValue({ id: 'rx_1', status: 'PENDING' } as never);
    prismaMock.prescription.update.mockResolvedValue({ id: 'rx_1', status: 'DISPENSED' } as never);

    const res = await request(app).put('/api/prescriptions/rx_1').set('Cookie', cookie).send({ status: 'DISPENSED' });

    expect(res.status).toBe(200);
    expect(prismaMock.prescription.update).toHaveBeenCalled();
  });
});

describe('Lab request status transitions (fixes H2)', () => {
  it('rejects resurrecting a CANCELLED request to IN_PROGRESS', async () => {
    const cookie = authCookieFor('LAB_TECHNICIAN');
    prismaMock.labRequest.findUnique.mockResolvedValue({ id: 'lr_1', status: 'CANCELLED' } as never);

    const res = await request(app)
      .put('/api/lab/requests/lr_1/status')
      .set('Cookie', cookie)
      .send({ status: 'IN_PROGRESS' });

    expect(res.status).toBe(400);
    expect(prismaMock.labRequest.update).not.toHaveBeenCalled();
  });

  it('rejects a PENDING request jumping straight to COMPLETED', async () => {
    const cookie = authCookieFor('LAB_TECHNICIAN');
    prismaMock.labRequest.findUnique.mockResolvedValue({ id: 'lr_1', status: 'PENDING' } as never);

    const res = await request(app).put('/api/lab/requests/lr_1/status').set('Cookie', cookie).send({ status: 'COMPLETED' });

    expect(res.status).toBe(400);
  });
});

describe('Appointment conflict detection (fixes H3)', () => {
  it('rejects creating an appointment that overlaps an existing one for the same doctor', async () => {
    const cookie = authCookieFor('RECEPTIONIST');
    registerUser({ id: 'doctor_1', role: 'DOCTOR', email: 'doc@hospital.demo', firstName: 'Bola', lastName: 'Adeyemi', isActive: true });

    prismaMock.patient.findUnique.mockResolvedValue({ id: 'patient_1' } as never);
    prismaMock.systemSetting.findFirst.mockResolvedValue({ appointmentSlotMinutes: 30 } as never);
    prismaMock.appointment.findFirst.mockResolvedValue({
      id: 'existing_appt',
      scheduledAt: new Date('2026-09-01T10:00:00Z'),
    } as never);

    const res = await request(app)
      .post('/api/appointments')
      .set('Cookie', cookie)
      .send({
        patientId: 'patient_1',
        doctorId: 'doctor_1',
        scheduledAt: '2026-09-01T10:15:00Z', // within the same 30-minute slot
        reason: 'Follow-up',
      });

    expect(res.status).toBe(409);
    expect(prismaMock.appointment.create).not.toHaveBeenCalled();
  });

  it('filters by appointmentId so a notification can load its exact appointment', async () => {
    const cookie = authCookieFor('DOCTOR');
    const appointment = {
      id: 'appointment_1',
      doctorId: 'user_doctor',
      patientId: 'patient_1',
      scheduledAt: new Date('2026-09-01T10:00:00Z'),
      reason: 'Follow-up',
      status: 'SCHEDULED',
      patient: { firstName: 'Ngozi', lastName: 'Eze', patientNumber: 'PAT-000001' },
      doctor: { firstName: 'Test', lastName: 'User' },
      department: null,
    };
    prismaMock.$transaction.mockResolvedValue([1, [appointment]] as never);

    const res = await request(app)
      .get('/api/appointments?appointmentId=appointment_1&pageSize=1')
      .set('Cookie', cookie);

    expect(res.status).toBe(200);
    expect(res.body.data.appointments).toHaveLength(1);
    expect(prismaMock.appointment.count).toHaveBeenCalledWith({ where: { id: 'appointment_1' } });
    expect(prismaMock.appointment.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'appointment_1' }, take: 1 }));
  });

  it('stores an appointment-specific notification link when an appointment is created', async () => {
    const cookie = authCookieFor('RECEPTIONIST');
    registerUser({ id: 'doctor_1', role: 'DOCTOR', email: 'doc@hospital.demo', firstName: 'Bola', lastName: 'Adeyemi', isActive: true });
    prismaMock.patient.findUnique.mockResolvedValue({ id: 'patient_1' } as never);
    prismaMock.systemSetting.findFirst.mockResolvedValue({ appointmentSlotMinutes: 30 } as never);
    prismaMock.appointment.findFirst.mockResolvedValue(null);
    prismaMock.appointment.create.mockResolvedValue({
      id: 'appointment_1',
      doctorId: 'doctor_1',
      patient: { firstName: 'Ngozi', lastName: 'Eze', patientNumber: 'PAT-000001' },
    } as never);
    prismaMock.notification.create.mockResolvedValue({ id: 'notification_1' } as never);
    prismaMock.auditLog.create.mockResolvedValue({ id: 'audit_1' } as never);
    prismaMock.$transaction.mockImplementation(((operations: Promise<unknown>[]) => Promise.all(operations)) as never);

    const res = await request(app)
      .post('/api/appointments')
      .set('Cookie', cookie)
      .send({
        patientId: 'patient_1',
        doctorId: 'doctor_1',
        scheduledAt: '2026-09-01T10:00:00Z',
        reason: 'Follow-up',
      });

    expect(res.status).toBe(201);
    expect(prismaMock.notification.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ link: '/appointments?appointmentId=appointment_1', userId: 'doctor_1' }),
    });
  });
});
