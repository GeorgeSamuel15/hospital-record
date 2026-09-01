import { prismaMock, resetPrismaMock } from '../test/prismaMock';

jest.mock('../config/prisma', () => ({ prisma: prismaMock }));

import { getPatientForRole } from './patient.service';

const FULL_PATIENT = {
  id: 'p1',
  patientNumber: 'PAT-000001',
  firstName: 'Ngozi',
  lastName: 'Eze',
  dateOfBirth: new Date('1990-01-01'),
  gender: 'FEMALE',
  phone: '+2348012345678',
  email: 'ngozi@example.com',
  address: '12 Allen Avenue',
  bloodGroup: 'O+',
  genotype: 'AA',
  allergies: 'Penicillin',
  emergencyContactName: 'Tunde Eze',
  emergencyContactPhone: '+2348098765432',
  nextOfKinName: 'Tunde Eze',
  nextOfKinPhone: '+2348098765432',
  registeredById: 'staff_1',
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('getPatientForRole (fixes C1: patient data over-exposure)', () => {
  beforeEach(() => resetPrismaMock());

  it('ADMIN, DOCTOR, and NURSE receive the full record including clinical and contact fields', async () => {
    for (const role of ['ADMIN', 'DOCTOR', 'NURSE'] as const) {
      prismaMock.patient.findUnique.mockResolvedValue(FULL_PATIENT as never);
      const result = await getPatientForRole('p1', role);
      expect(result).toMatchObject({ allergies: 'Penicillin', nextOfKinName: 'Tunde Eze', bloodGroup: 'O+' });
    }
  });

  it('RECEPTIONIST does not receive clinical fields (allergies, blood group, genotype)', async () => {
    prismaMock.patient.findUnique.mockResolvedValue({
      id: 'p1',
      patientNumber: 'PAT-000001',
      firstName: 'Ngozi',
      lastName: 'Eze',
      dateOfBirth: new Date('1990-01-01'),
      gender: 'FEMALE',
      phone: '+2348012345678',
      email: 'ngozi@example.com',
      address: '12 Allen Avenue',
      emergencyContactName: 'Tunde Eze',
      emergencyContactPhone: '+2348098765432',
      nextOfKinName: 'Tunde Eze',
      nextOfKinPhone: '+2348098765432',
      createdAt: new Date(),
      updatedAt: new Date(),
    } as never);

    const result = await getPatientForRole('p1', 'RECEPTIONIST');

    expect(result).not.toHaveProperty('allergies');
    expect(result).not.toHaveProperty('bloodGroup');
    expect(result).not.toHaveProperty('genotype');
    expect(result).toMatchObject({ firstName: 'Ngozi', emergencyContactName: 'Tunde Eze' });

    // Verify the actual Prisma call excluded those fields via `select`,
    // not just that the test fixture happened not to include them.
    expect(prismaMock.patient.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        select: expect.not.objectContaining({ allergies: true }),
      })
    );
  });

  it('LAB_TECHNICIAN receives only minimal identifying + blood group fields, not allergies or contacts', async () => {
    prismaMock.patient.findUnique.mockResolvedValue({
      id: 'p1',
      patientNumber: 'PAT-000001',
      firstName: 'Ngozi',
      lastName: 'Eze',
      dateOfBirth: new Date('1990-01-01'),
      gender: 'FEMALE',
      bloodGroup: 'O+',
      createdAt: new Date(),
    } as never);

    await getPatientForRole('p1', 'LAB_TECHNICIAN');

    expect(prismaMock.patient.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        select: expect.objectContaining({ bloodGroup: true }),
      })
    );
    const selectArg = (prismaMock.patient.findUnique.mock.calls[0][0] as { select: Record<string, unknown> }).select;
    expect(selectArg).not.toHaveProperty('allergies');
    expect(selectArg).not.toHaveProperty('emergencyContactName');
  });

  it('PHARMACIST receives allergies (safety-critical for dispensing) but not contact/address fields', async () => {
    prismaMock.patient.findUnique.mockResolvedValue({
      id: 'p1',
      patientNumber: 'PAT-000001',
      firstName: 'Ngozi',
      lastName: 'Eze',
      dateOfBirth: new Date('1990-01-01'),
      gender: 'FEMALE',
      allergies: 'Penicillin',
      createdAt: new Date(),
    } as never);

    await getPatientForRole('p1', 'PHARMACIST');

    const selectArg = (prismaMock.patient.findUnique.mock.calls[0][0] as { select: Record<string, unknown> }).select;
    expect(selectArg).toHaveProperty('allergies', true);
    expect(selectArg).not.toHaveProperty('address');
    expect(selectArg).not.toHaveProperty('emergencyContactName');
  });
});
