import '../test/setupEnv';
import { prismaMock, resetPrismaMock } from '../test/prismaMock';

jest.mock('../config/prisma', () => ({ prisma: prismaMock }));

import request from 'supertest';
import app from '../app';
import { ACCESS_TOKEN_COOKIE, signAccessToken } from '../utils/tokens';

const realAdmin = {
  id: 'admin_real',
  role: 'ADMIN',
  email: 'admin@hospital.example',
  firstName: 'Real',
  lastName: 'Admin',
  isActive: true,
  isDemo: false,
};

function adminCookie(user = realAdmin) {
  prismaMock.user.findUnique.mockImplementation(((args: { where: { id?: string; email?: string } }) => {
    if (args.where.id === user.id) return Promise.resolve(user);
    return Promise.resolve(null);
  }) as never);
  return `${ACCESS_TOKEN_COOKIE}=${signAccessToken({ sub: user.id, role: 'ADMIN' })}`;
}

beforeEach(() => resetPrismaMock());

describe('staff account setup and demo cleanup', () => {
  it('allows an administrator to choose a valid initial password', async () => {
    const cookie = adminCookie();
    prismaMock.$queryRaw.mockResolvedValue([{ value: 7 }] as never);
    prismaMock.user.create.mockResolvedValue({
      id: 'staff_1',
      employeeId: 'EMP-000007',
      firstName: 'New',
      lastName: 'Doctor',
      email: 'new.doctor@hospital.example',
      role: 'DOCTOR',
      isActive: true,
    } as never);
    prismaMock.auditLog.create.mockResolvedValue({ id: 'audit_1' } as never);

    const res = await request(app)
      .post('/api/staff')
      .set('Cookie', cookie)
      .send({
        firstName: 'New',
        lastName: 'Doctor',
        email: 'new.doctor@hospital.example',
        role: 'DOCTOR',
        initialPassword: 'SecurePass1',
      });

    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ tempPassword: 'SecurePass1', emailSent: true });
    expect(prismaMock.user.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ email: 'new.doctor@hospital.example', passwordHash: expect.any(String) }),
    }));
    expect(prismaMock.user.create.mock.calls[0][0].data.passwordHash).not.toBe('SecurePass1');
  });

  it('rejects a weak administrator-supplied initial password', async () => {
    const res = await request(app)
      .post('/api/staff')
      .set('Cookie', adminCookie())
      .send({
        firstName: 'New',
        lastName: 'Doctor',
        email: 'new.doctor@hospital.example',
        role: 'DOCTOR',
        initialPassword: 'weak',
      });

    expect(res.status).toBe(422);
    expect(prismaMock.user.create).not.toHaveBeenCalled();
  });

  it('requires the signed-in administrator to be non-demo before bulk deactivation', async () => {
    const demoAdmin = { ...realAdmin, id: 'admin_demo', email: 'admin@hospital.demo', isDemo: true };
    const res = await request(app)
      .put('/api/staff/demo/deactivate-all')
      .set('Cookie', adminCookie(demoAdmin));

    expect(res.status).toBe(409);
    expect(prismaMock.user.updateMany).not.toHaveBeenCalled();
  });

  it('deactivates demo accounts while preserving their records', async () => {
    const cookie = adminCookie();
    prismaMock.user.findFirst.mockResolvedValue({ id: realAdmin.id } as never);
    prismaMock.user.updateMany.mockResolvedValue({ count: 6 });
    prismaMock.auditLog.create.mockResolvedValue({ id: 'audit_1' } as never);

    const res = await request(app)
      .put('/api/staff/demo/deactivate-all')
      .set('Cookie', cookie);

    expect(res.status).toBe(200);
    expect(res.body.data.count).toBe(6);
    expect(prismaMock.user.updateMany).toHaveBeenCalledWith({
      where: { isDemo: true, isActive: true },
      data: { isActive: false, passwordHash: expect.any(String) },
    });
  });
});
