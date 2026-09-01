import { Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { AppError } from '../utils/AppError';
import { logAudit } from '../services/audit.service';
import {
  createPatient,
  getPatientForRole,
  getPatientMedicalHistory,
  getPatientOverview,
  listPatients,
  updatePatient,
} from '../services/patient.service';
import type { CreatePatientInput, ListPatientsQuery, UpdatePatientInput } from '../validators/patient.validator';

export const create = asyncHandler(async (req: Request<unknown, unknown, CreatePatientInput>, res: Response) => {
  if (!req.user) throw AppError.unauthorized();

  const patient = await createPatient(req.body, req.user.id);

  await logAudit({
    userId: req.user.id,
    action: 'PATIENT_CREATED',
    resource: 'Patient',
    resourceId: patient.id,
    metadata: { patientNumber: patient.patientNumber },
    req,
  });

  res.status(201).json({ success: true, message: 'Patient registered successfully.', data: { patient } });
});

export const list = asyncHandler(async (req: Request<unknown, unknown, unknown, ListPatientsQuery>, res: Response) => {
  const result = await listPatients(req.query);
  res.json({ success: true, data: result });
});

export const getById = asyncHandler(async (req: Request<{ id: string }>, res: Response) => {
  if (!req.user) throw AppError.unauthorized();
  const patient = await getPatientForRole(req.params.id, req.user.role);

  if (req.user) {
    await logAudit({
      userId: req.user.id,
      action: 'PATIENT_VIEWED',
      resource: 'Patient',
      resourceId: patient.id,
      req,
    });
  }

  res.json({ success: true, data: { patient } });
});

/** Clinical overview for the patient profile screen — restricted to clinical roles at the route level. */
export const getOverview = asyncHandler(async (req: Request<{ id: string }>, res: Response) => {
  const overview = await getPatientOverview(req.params.id);

  if (req.user) {
    await logAudit({
      userId: req.user.id,
      action: 'MEDICAL_RECORD_VIEWED',
      resource: 'Patient',
      resourceId: req.params.id,
      metadata: { view: 'overview' },
      req,
    });
  }

  res.json({ success: true, data: overview });
});

export const getHistory = asyncHandler(async (req: Request<{ id: string }>, res: Response) => {
  const history = await getPatientMedicalHistory(req.params.id);

  if (req.user) {
    await logAudit({
      userId: req.user.id,
      action: 'MEDICAL_RECORD_VIEWED',
      resource: 'Patient',
      resourceId: req.params.id,
      metadata: { view: 'history' },
      req,
    });
  }

  res.json({ success: true, data: history });
});

export const update = asyncHandler(async (req: Request<{ id: string }, unknown, UpdatePatientInput>, res: Response) => {
  if (!req.user) throw AppError.unauthorized();

  const patient = await updatePatient(req.params.id, req.body);

  await logAudit({
    userId: req.user.id,
    action: 'PATIENT_UPDATED',
    resource: 'Patient',
    resourceId: patient.id,
    req,
  });

  res.json({ success: true, message: 'Patient updated successfully.', data: { patient } });
});
