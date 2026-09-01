import { Router } from 'express';
import { Role } from '@prisma/client';
import { requireAuth, requireRole } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { createPatientSchema, listPatientsQuerySchema, updatePatientSchema } from '../validators/patient.validator';
import { create, getById, getHistory, getOverview, list, update } from '../controllers/patient.controller';

const router = Router();

router.use(requireAuth());

// Registering/editing demographic records: front-desk + clinical roles + admin.
const canManagePatients = requireRole(Role.ADMIN, Role.NURSE, Role.RECEPTIONIST);

// Basic lookup (ID, name, phone — no clinical detail): every role needs this
// at some point (e.g. lab tech and pharmacist confirming they have the right
// patient), so no extra role restriction beyond being authenticated.
router.get('/', validate(listPatientsQuerySchema, 'query'), list);
router.get('/:id', getById);

router.post('/', canManagePatients, validate(createPatientSchema), create);
router.put('/:id', canManagePatients, validate(updatePatientSchema), update);

// Clinical detail (diagnoses, prescriptions, lab results, admissions,
// full visit history) — restricted to clinical staff, not front-desk,
// lab, or pharmacy, who each get their own purpose-built views instead.
const canViewClinicalDetail = requireRole(Role.ADMIN, Role.DOCTOR, Role.NURSE);
router.get('/:id/overview', canViewClinicalDetail, getOverview);
router.get('/:id/history', canViewClinicalDetail, getHistory);

export default router;
