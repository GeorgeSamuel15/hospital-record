import '../test/setupEnv';
import { prismaMock, resetPrismaMock } from '../test/prismaMock';

jest.mock('../config/prisma', () => ({ prisma: prismaMock }));

import request from 'supertest';
import app from '../app';
import { signAccessToken, ACCESS_TOKEN_COOKIE } from '../utils/tokens';

function authCookieFor(role: string) {
  const userId = `user_${role.toLowerCase()}`;
  prismaMock.user.findUnique.mockResolvedValue({
    id: userId,
    role,
    email: `${role.toLowerCase()}@hospital.demo`,
    firstName: 'Test',
    lastName: 'User',
    isActive: true,
  } as never);
  const token = signAccessToken({ sub: userId, role: role as never });
  return `${ACCESS_TOKEN_COOKIE}=${token}`;
}

beforeEach(() => resetPrismaMock());

describe('RBAC boundaries named explicitly in the audit brief', () => {
  it('Receptionist cannot create a diagnosis', async () => {
    const cookie = authCookieFor('RECEPTIONIST');
    const res = await request(app)
      .post('/api/diagnoses')
      .set('Cookie', cookie)
      .send({ patientId: 'p1', diagnosis: 'Hypertension' });
    expect(res.status).toBe(403);
  });

  it('Pharmacist cannot create a diagnosis', async () => {
    const cookie = authCookieFor('PHARMACIST');
    const res = await request(app)
      .post('/api/diagnoses')
      .set('Cookie', cookie)
      .send({ patientId: 'p1', diagnosis: 'Hypertension' });
    expect(res.status).toBe(403);
  });

  it('Laboratory Technician cannot create a prescription', async () => {
    const cookie = authCookieFor('LAB_TECHNICIAN');
    const res = await request(app)
      .post('/api/prescriptions')
      .set('Cookie', cookie)
      .send({ patientId: 'p1', items: [{ medication: 'Amoxicillin', dosage: '500mg', frequency: 'TID', duration: '7 days', quantity: 21 }] });
    expect(res.status).toBe(403);
  });

  it('Nurse cannot create a prescription (only doctors can)', async () => {
    const cookie = authCookieFor('NURSE');
    const res = await request(app)
      .post('/api/prescriptions')
      .set('Cookie', cookie)
      .send({ patientId: 'p1', items: [{ medication: 'Amoxicillin', dosage: '500mg', frequency: 'TID', duration: '7 days', quantity: 21 }] });
    expect(res.status).toBe(403);
  });

  it('Non-admin roles cannot access the audit log', async () => {
    for (const role of ['DOCTOR', 'NURSE', 'RECEPTIONIST', 'LAB_TECHNICIAN', 'PHARMACIST']) {
      const cookie = authCookieFor(role);
      const res = await request(app).get('/api/audit-logs').set('Cookie', cookie);
      expect(res.status).toBe(403);
    }
  });

  it('Non-admin roles cannot access dashboard recent-activity (fixes C2)', async () => {
    for (const role of ['DOCTOR', 'NURSE', 'RECEPTIONIST', 'LAB_TECHNICIAN', 'PHARMACIST']) {
      const cookie = authCookieFor(role);
      const res = await request(app).get('/api/dashboard/recent-activity').set('Cookie', cookie);
      expect(res.status).toBe(403);
    }
  });

  it('Admin can access dashboard recent-activity', async () => {
    const cookie = authCookieFor('ADMIN');
    prismaMock.auditLog.findMany.mockResolvedValue([]);
    const res = await request(app).get('/api/dashboard/recent-activity').set('Cookie', cookie);
    expect(res.status).toBe(200);
  });

  it('A deactivated user cannot access a protected route even with a technically-valid token', async () => {
    const userId = 'user_deactivated';
    prismaMock.user.findUnique.mockResolvedValue({
      id: userId,
      role: 'DOCTOR',
      email: 'exdoctor@hospital.demo',
      firstName: 'Former',
      lastName: 'Doctor',
      isActive: false,
    } as never);
    const token = signAccessToken({ sub: userId, role: 'DOCTOR' as never });

    const res = await request(app).get('/api/auth/me').set('Cookie', `${ACCESS_TOKEN_COOKIE}=${token}`);
    expect(res.status).toBe(403);
  });

  it('Unauthenticated requests are rejected on protected routes', async () => {
    const res = await request(app).get('/api/patients');
    expect(res.status).toBe(401);
  });
});
