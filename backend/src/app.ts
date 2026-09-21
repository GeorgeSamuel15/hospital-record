import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { env } from './config/env';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { AppError } from './utils/AppError';
import authRoutes from './routes/auth.routes';
import patientRoutes from './routes/patient.routes';
import visitRoutes from './routes/visit.routes';
import vitalRoutes from './routes/vital.routes';
import diagnosisRoutes from './routes/diagnosis.routes';
import appointmentRoutes from './routes/appointment.routes';
import labRoutes from './routes/lab.routes';
import prescriptionRoutes from './routes/prescription.routes';
import admissionRoutes from './routes/admission.routes';
import staffRoutes from './routes/staff.routes';
import directoryRoutes from './routes/directory.routes';
import departmentRoutes from './routes/department.routes';
import auditRoutes from './routes/audit.routes';
import dashboardRoutes from './routes/dashboard.routes';
import settingsRoutes from './routes/settings.routes';
import notificationRoutes from './routes/notification.routes';

const app = express();

// Render and most production platforms forward the original protocol/IP.
// Trust exactly the first proxy so secure-cookie and rate-limit behaviour is
// correct without accepting arbitrary forwarded headers from the internet.
if (env.NODE_ENV === 'production') app.set('trust proxy', 1);

// --- Security headers -------------------------------------------------
app.use(helmet());

// --- CORS ---------------------------------------------------------------
app.use(
  cors({
    origin: (origin, callback) => {
      // Requests without Origin include health checks and server-to-server
      // calls. Browser origins must match the explicit allowlist exactly.
      if (!origin || env.APP_ORIGINS.includes(origin.replace(/\/$/, ''))) return callback(null, true);
      return callback(AppError.forbidden(`Origin not allowed: ${origin}`));
    },
    credentials: true,
  })
);

// --- Body / cookie parsing ----------------------------------------------
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

// --- Logging --------------------------------------------------------------
app.use(morgan(env.NODE_ENV === 'development' ? 'dev' : 'combined'));

// --- General rate limiting (auth routes have their own stricter limiter) --
app.use(
  rateLimit({
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    max: env.RATE_LIMIT_MAX,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

// --- Health check -----------------------------------------------------
app.get('/api/health', (_req, res) => {
  res.json({ success: true, message: 'Hospital RMS API is running', timestamp: new Date().toISOString() });
});

// --- Routes -------------------------------------------------------------
app.use('/api/auth', authRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/visits', visitRoutes);
app.use('/api/vitals', vitalRoutes);
app.use('/api/diagnoses', diagnosisRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/lab', labRoutes);
app.use('/api/prescriptions', prescriptionRoutes);
app.use('/api/admissions', admissionRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/staff-directory', directoryRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/audit-logs', auditRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/notifications', notificationRoutes);

// --- 404 + centralized error handling (must be last) --------------------
app.use(notFoundHandler);
app.use(errorHandler);

// Note: this file deliberately does NOT call app.listen(). That happens in
// server.ts, so this module can be safely imported by tests (via supertest)
// without binding a real port as a side effect of import.
export default app;
