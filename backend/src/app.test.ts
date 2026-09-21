import './test/setupEnv';
import { prismaMock, resetPrismaMock } from './test/prismaMock';

jest.mock('./config/prisma', () => ({ prisma: prismaMock }));

import request from 'supertest';
import app from './app';

describe('GET /api/health', () => {
  it('returns a success envelope without touching the database', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ success: true });
  });

  it('allows the configured frontend origin', async () => {
    const res = await request(app).get('/api/health').set('Origin', 'http://localhost:5173');
    expect(res.status).toBe(200);
    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:5173');
  });

  it('rejects an origin that is not configured', async () => {
    const res = await request(app).get('/api/health').set('Origin', 'https://lookalike.example');
    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/origin not allowed/i);
  });
});

describe('POST /api/auth/login', () => {
  beforeEach(() => resetPrismaMock());

  it('returns 422 with field errors when the body fails validation', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'not-an-email' });
    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
    expect(res.body.errors).toHaveProperty('email');
    expect(res.body.errors).toHaveProperty('password');
  });

  it('returns 401 with a generic message when the user does not exist', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);

    const res = await request(app).post('/api/auth/login').send({ email: 'nobody@hospital.demo', password: 'whatever123' });

    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/invalid email or password/i);
  });
});

describe('unknown routes', () => {
  it('returns a 404 JSON envelope rather than an HTML error page', async () => {
    const res = await request(app).get('/api/this-route-does-not-exist');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
});
