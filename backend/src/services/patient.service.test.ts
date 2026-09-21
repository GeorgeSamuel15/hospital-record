import { prismaMock, resetPrismaMock } from '../test/prismaMock';

jest.mock('../config/prisma', () => ({ prisma: prismaMock }));

// Imported after the mock is registered so the service picks up the mocked client.
import { createPatient, getPatientById, updatePatient } from './patient.service';
import { AppError } from '../utils/AppError';

describe('patient.service', () => {
  beforeEach(() => {
    resetPrismaMock();
  });

  describe('createPatient', () => {
    it('uses the atomic sequence counter to generate a zero-padded patient number', async () => {
      // generatePatientNumber() calls prisma.$queryRaw under the hood (see
      // idSequence.service.ts) — mock that instead of patient.count(), which
      // this service no longer uses after the H6 audit fix.
      prismaMock.$queryRaw.mockResolvedValue([{ value: 6 }] as never);
      prismaMock.patient.create.mockResolvedValue({ id: 'p1', patientNumber: 'PAT-000006' } as never);

      const result = await createPatient(
        {
          firstName: 'Ngozi',
          lastName: 'Eze',
          dateOfBirth: new Date('1990-01-01'),
          gender: 'FEMALE',
        } as never,
        'user_registered_by'
      );

      expect(result.patientNumber).toBe('PAT-000006');
      expect(prismaMock.patient.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ patientNumber: 'PAT-000006', registeredById: 'user_registered_by' }),
        })
      );
    });

    it('strips empty-string optional fields to undefined rather than saving blanks', async () => {
      prismaMock.$queryRaw.mockResolvedValue([{ value: 1 }] as never);
      prismaMock.patient.create.mockResolvedValue({ id: 'p1', patientNumber: 'PAT-000001' } as never);

      await createPatient(
        {
          firstName: 'Test',
          lastName: 'Patient',
          dateOfBirth: new Date('2000-01-01'),
          gender: 'MALE',
          phone: '',
          email: '',
          allergies: '',
        } as never,
        'user_1'
      );

      const callArgs = prismaMock.patient.create.mock.calls[0][0];
      expect(callArgs.data.phone).toBeUndefined();
      expect(callArgs.data.email).toBeUndefined();
      expect(callArgs.data.allergies).toBeUndefined();
    });
  });

  describe('getPatientById', () => {
    it('throws a 404 AppError when the patient does not exist', async () => {
      prismaMock.patient.findUnique.mockResolvedValue(null);

      await expect(getPatientById('missing-id')).rejects.toMatchObject({
        statusCode: 404,
      } satisfies Partial<AppError>);
    });

    it('returns the patient when found', async () => {
      prismaMock.patient.findUnique.mockResolvedValue({ id: 'p1', firstName: 'Ada' } as never);
      const result = await getPatientById('p1');
      expect(result).toMatchObject({ id: 'p1', firstName: 'Ada' });
    });
  });

  describe('updatePatient', () => {
    it('throws 404 rather than attempting an update when the patient is missing', async () => {
      prismaMock.patient.findUnique.mockResolvedValue(null);

      await expect(updatePatient('missing-id', { firstName: 'New Name' })).rejects.toMatchObject({
        statusCode: 404,
      });
      expect(prismaMock.patient.update).not.toHaveBeenCalled();
    });
  });
});
