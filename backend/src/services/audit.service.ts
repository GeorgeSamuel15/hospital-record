import { Request } from 'express';
import { prisma } from '../config/prisma';

type AuditRequest = Pick<Request, 'headers' | 'socket'>;

export type AuditAction =
  | 'LOGIN'
  | 'LOGIN_FAILED'
  | 'LOGOUT'
  | 'PASSWORD_CHANGED'
  | 'PASSWORD_RESET_REQUESTED'
  | 'PASSWORD_RESET_COMPLETED'
  | 'PATIENT_CREATED'
  | 'PATIENT_UPDATED'
  | 'PATIENT_VIEWED'
  | 'MEDICAL_RECORD_VIEWED'
  | 'VISIT_CREATED'
  | 'VITALS_RECORDED'
  | 'DIAGNOSIS_CREATED'
  | 'PRESCRIPTION_CREATED'
  | 'PRESCRIPTION_DISPENSED'
  | 'LAB_REQUEST_CREATED'
  | 'LAB_RESULT_ADDED'
  | 'APPOINTMENT_CREATED'
  | 'APPOINTMENT_UPDATED'
  | 'ADMISSION_CREATED'
  | 'ADMISSION_DISCHARGED'
  | 'STAFF_CREATED'
  | 'STAFF_UPDATED'
  | 'STAFF_PASSWORD_RESET'
  | 'STAFF_DEACTIVATED'
  | 'STAFF_ACTIVATED'
  | 'DEMO_ACCOUNTS_DEACTIVATED'
  | 'DEPARTMENT_CREATED'
  | 'DEPARTMENT_UPDATED'
  | 'SETTINGS_UPDATED';

interface LogAuditParams {
  userId?: string | null;
  action: AuditAction;
  resource: string;
  resourceId?: string | null;
  metadata?: Record<string, unknown>;
  req?: AuditRequest;
}

export function getClientIp(req: AuditRequest): string | undefined {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') return forwarded.split(',')[0].trim();
  return req.socket.remoteAddress ?? undefined;
}

export async function logAudit({ userId, action, resource, resourceId, metadata, req }: LogAuditParams) {
  await prisma.auditLog.create({
    data: {
      userId: userId ?? undefined,
      action,
      resource,
      resourceId: resourceId ?? undefined,
      metadata: metadata as never,
      ipAddress: req ? getClientIp(req) : undefined,
    },
  });
}
