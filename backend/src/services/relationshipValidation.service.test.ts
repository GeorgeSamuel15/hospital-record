import { prismaMock, resetPrismaMock } from '../test/prismaMock';

jest.mock('../config/prisma', () => ({ prisma: prismaMock }));

import { assertVisitBelongsToPatient } from './relationshipValidation.service';

describe('assertVisitBelongsToPatient (fixes C4)', () => {
  beforeEach(() => resetPrismaMock());

  it('does nothing when no visitId is supplied (visit is optional on these records)', async () => {
    await expect(assertVisitBelongsToPatient(undefined, 'patient_A')).resolves.toBeUndefined();
    expect(prismaMock.visit.findUnique).not.toHaveBeenCalled();
  });

  it('throws 404 when the referenced visit does not exist', async () => {
    prismaMock.visit.findUnique.mockResolvedValue(null);
    await expect(assertVisitBelongsToPatient('visit_1', 'patient_A')).rejects.toMatchObject({ statusCode: 404 });
  });

  it('rejects when the visit belongs to a different patient (the core cross-patient bug)', async () => {
    prismaMock.visit.findUnique.mockResolvedValue({ patientId: 'patient_B' } as never);
    await expect(assertVisitBelongsToPatient('visit_1', 'patient_A')).rejects.toMatchObject({ statusCode: 400 });
  });

  it('succeeds when the visit belongs to the same patient', async () => {
    prismaMock.visit.findUnique.mockResolvedValue({ patientId: 'patient_A' } as never);
    await expect(assertVisitBelongsToPatient('visit_1', 'patient_A')).resolves.toBeUndefined();
  });
});
