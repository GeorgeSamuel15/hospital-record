# Hospital Record Management System

A full-stack hospital record management platform: React + TypeScript frontend,
Node.js/Express + TypeScript backend, PostgreSQL via Prisma, cookie-based JWT
authentication, and server-enforced role-based access control for six staff
roles (Admin, Doctor, Nurse, Receptionist, Lab Technician, Pharmacist).

## ⚠️ Current build status

This codebase was generated incrementally, following the phased plan below.
**All 15 phases have a working implementation, and the previously-identified
gaps have been addressed:**

- **Dark mode** — a real theme toggle in the header, wired through every
  shared component style and swept across all pages.
- **Calendar view for Appointments** — a proper month-grid calendar
  (`MonthCalendar.tsx`) with a Calendar/List toggle, not just a day-grouped
  list.
- **Concrete Settings** — a real `SystemSetting` database model, admin-only
  update endpoint, and a working form (hospital name, support email,
  default appointment length, session timeout) — not a placeholder page.
- **Shaped skeleton loaders** — `SkeletonListRows`, `SkeletonTable`, and
  `SkeletonCards` replace the generic gray boxes across every list/table
  page.
- **Micro-interactions** — a fade-slide-in animation on every inline
  "new record" form.
- **Automated tests** — a real Jest + Supertest suite for the backend
  (using a fully mocked Prisma client, so tests run without a live
  database) covering `AppError`, password hashing, JWT round-trips, the
  validation middleware, the patient service, and a Supertest integration
  test against the actual Express app. A Vitest + Testing Library suite for
  the frontend covers shared utilities/components, login validation, and
  appointment notification deep-linking. The current verified total is
  **55 backend tests plus 12 frontend tests**. See "Running tests" below.
- **Docker Compose** — `docker-compose.yml` plus Dockerfiles for both
  frontend (nginx) and backend, for a one-command local stack.
- **Email service** — a real `EmailService` (`nodemailer`-based) wired into
  password reset and staff account creation. Falls back to logging emails
  to the console when SMTP isn't configured, so local dev still works
  without real credentials, but production paths are genuinely implemented
  now rather than only returning tokens in API responses.
- **Deployment guide** — see `DEPLOYMENT.md` for reverse proxy/TLS,
  secrets management, and database guidance beyond local dev.
- **CI and dependency checks** — GitHub Actions now runs lint, tests, builds,
  Prisma generation, and production dependency audits for both packages;
  Dependabot is configured for weekly npm and Actions updates.
- **Reliable appointment notifications** — appointment notifications now
  carry the appointment ID, use in-app navigation, and open a focused,
  highlighted record with clear not-found/retry behavior.
- **Safer staff lifecycle** — administrators can set or generate an initial
  password, recover it even if email delivery fails, reset credentials with
  token invalidation, and bulk-deactivate all demo accounts without deleting
  their clinical history.

## What's still genuinely not done

Being direct rather than declaring total completion:

1. **No live-database/browser end-to-end run yet.** Unit and integration
   suites use mocked Prisma, so production migrations and all six roles still
   need a final smoke test against a disposable PostgreSQL database and a
   running browser build.
2. **No load test or professional penetration test.** CI now performs
   production dependency audits, but that does not replace an independent
   security review for a system holding patient records.
3. **Docker images are not runtime-verified here.** The source builds pass,
   but the complete Compose stack still needs to be built and smoke-tested
   in an environment that can pull the base images.
4. **Operations remain deployment-owned.** Automated database backups,
   log aggregation, alerting, and health-check restart policies must be
   configured in the chosen hosting platform.

## What's genuinely solid

- Every role's permissions are enforced **server-side** via `requireRole()`
  middleware — not just hidden buttons — matching Section 4 of the spec
  exactly (e.g. receptionists can search/register patients but cannot view
  diagnoses or prescriptions; lab technicians and pharmacists get their own
  purpose-built views).
- Every sensitive action is audit-logged with user, action, resource,
  resource ID, timestamp, and IP address, and the admin-only Audit Logs page
  can search them.
- Patient numbers (`PAT-000001`) and employee IDs (`EMP-000001`) are
  generated with race-safe atomic database counters.
- Centralized error handling returns the `{ success, message }` shape from
  Section 22 everywhere, with Prisma errors (duplicate emails, missing
  records) translated into clean messages rather than leaking internals.

## Tech stack

- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, React Router,
  TanStack Query, React Hook Form + Zod, Lucide icons
- **Backend:** Node.js, Express, TypeScript, REST API
- **Database:** PostgreSQL + Prisma ORM
- **Auth:** Argon2 password hashing, JWT access + refresh tokens in
  `httpOnly` cookies, server-side RBAC middleware

## Project structure

```
hospital-record-management/
├── frontend/               React + Vite app
│   └── src/
│       ├── components/     Shared UI (ProtectedRoute, spinners, etc.)
│       ├── layouts/        AppLayout (sidebar/header shell)
│       ├── pages/          Route-level pages (auth/, dashboard, ...)
│       ├── hooks/          useAuth, etc.
│       ├── services/       api.ts (axios client), auth.service.ts
│       └── types/          Shared TS types
├── backend/                 Express API
│   ├── prisma/
│   │   ├── schema.prisma    Full data model (13 domain models)
│   │   └── seed.ts          Demo accounts + sample patient
│   └── src/
│       ├── controllers/     auth.controller.ts (more to come)
│       ├── routes/          auth.routes.ts (more to come)
│       ├── services/        auth.service.ts, audit.service.ts
│       ├── middleware/      auth.ts (RBAC), validate.ts, errorHandler.ts
│       ├── validators/      Zod schemas
│       ├── utils/           AppError, password hashing, JWT helpers
│       ├── config/          env.ts, prisma.ts
│       └── app.ts           Express app entry point
├── .gitignore
└── README.md
```

## Requirements

- Node.js 20+
- PostgreSQL 14+ (local install, Docker, or a hosted instance)
- npm

## Setup

### 1. Database

Create a PostgreSQL database, e.g.:

```bash
createdb hospital_rms
```

Or with Docker:

```bash
docker run --name hospital-rms-db -e POSTGRES_USER=hospital_user \
  -e POSTGRES_PASSWORD=hospital_password -e POSTGRES_DB=hospital_rms \
  -p 5432:5432 -d postgres:16
```

### 2. Backend

```bash
cd backend
cp .env.example .env
```

Edit `.env`:
- Set `DATABASE_URL` to match your Postgres instance.
- Generate real secrets for `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET`:
  ```bash
  node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
  ```
  Run it twice — the two secrets must be different from each other.

Then:

```bash
npm install
npm run prisma:generate
npm run prisma:migrate      # creates the database tables
npm run seed                # creates demo accounts + a sample patient
npm run dev                 # starts the API on http://localhost:4000
```

### 3. Frontend

In a second terminal:

```bash
cd frontend
cp .env.example .env        # defaults already point at localhost:4000
npm install
npm run dev                 # starts the app on http://localhost:5173
```

Open `http://localhost:5173` and log in with one of the demo accounts below.

### Option: Docker Compose

Instead of steps 1–3 above, you can run the whole stack with:

```bash
export JWT_ACCESS_SECRET=$(node -e "console.log(require('crypto').randomBytes(48).toString('hex'))")
export JWT_REFRESH_SECRET=$(node -e "console.log(require('crypto').randomBytes(48).toString('hex'))")
docker compose up --build
```

This builds and runs Postgres, the backend (running migrations + seed on
startup), and the frontend (served via nginx on port 5173). See
`DEPLOYMENT.md` for production considerations — the compose file as written
is meant for local use.

## Running tests

```bash
# Backend — Jest + Supertest, with a fully mocked Prisma client (no live DB needed)
cd backend
npm install
npm run prisma:generate   # required first — @prisma/client's types don't exist until this runs
npm test

# Frontend — Vitest + React Testing Library
cd frontend
npm install
npm test
```

Backend tests cover password hashing, JWT signing/verification, the Zod
validation middleware, the patient service's business logic (empty-field
stripping, 404 handling), an integration test against the real Express app
via Supertest, and — from the security audit — role-based patient data
projection, the visit/patient relationship guard, the prescription/lab
status state machines, appointment conflict detection, appointment-ID
filtering, notification links, staff account creation/reset, demo-account
deactivation, CORS policy, and RBAC boundaries for the exact scenarios named
in the audit brief (Receptionist/Pharmacist cannot create diagnoses, Lab
Technician/Nurse cannot create prescriptions, non-admins cannot read the
audit trail, deactivated users are locked out). Frontend tests cover the
`calculateAge` utility, the `InitialsAvatar` component, login validation, and
opening the exact appointment selected from a notification.

The verified result on 2026-09-21 is **55/55 backend tests and 12/12 frontend
tests passing**, with lint and production builds passing in both packages.

## Demo credentials

All demo accounts use the password `Demo@1234`. **These are clearly labeled
development-only accounts** (`isDemo: true` in the database) — do not reuse
this pattern for real deployments.

| Role                | Email                     |
|---------------------|---------------------------|
| Administrator       | admin@hospital.demo       |
| Doctor              | doctor@hospital.demo      |
| Nurse               | nurse@hospital.demo       |
| Receptionist        | reception@hospital.demo   |
| Laboratory Technician | labtech@hospital.demo   |
| Pharmacist          | pharmacist@hospital.demo  |

## API overview (implemented so far)

| Method | Endpoint                    | Auth required | Description |
|--------|------------------------------|---------------|--------------|
| POST   | `/api/auth/login`            | No | Log in, sets access + refresh cookies |
| POST   | `/api/auth/logout`           | Yes | Clears session cookies |
| GET    | `/api/auth/me`                | Yes | Returns the current user |
| POST   | `/api/auth/refresh`          | No (needs refresh cookie) | Rotates the access token |
| POST   | `/api/auth/forgot-password`  | No | Requests a password reset token |
| POST   | `/api/auth/reset-password`   | No | Resets password using a valid token |
| POST   | `/api/auth/change-password`  | Yes | Changes password for the logged-in user |
| GET    | `/api/health`                 | No | Health check |
| GET    | `/api/patients`               | Yes | Search/list patients (paginated) |
| POST   | `/api/patients`               | Admin, Nurse, Receptionist | Register a new patient |
| GET    | `/api/patients/:id`            | Yes | Basic patient record |
| PUT    | `/api/patients/:id`            | Admin, Nurse, Receptionist | Update patient demographics |
| GET    | `/api/patients/:id/overview`   | Admin, Doctor, Nurse | Clinical overview (latest vitals, recent diagnoses, active prescriptions, recent lab results) |
| GET    | `/api/patients/:id/history`    | Admin, Doctor, Nurse | Full history (visits, vitals, diagnoses, prescriptions, lab requests, admissions, appointments) |

| POST   | `/api/visits`                  | Doctor | Create a consultation |
| GET    | `/api/visits/:id`              | Admin, Doctor, Nurse | Full visit detail |
| POST   | `/api/vitals`                  | Admin, Doctor, Nurse | Record vital signs |
| GET    | `/api/vitals/patient/:patientId` | Admin, Doctor, Nurse | Vitals history |
| POST   | `/api/diagnoses`               | Doctor | Add a diagnosis |
| GET    | `/api/appointments`            | Yes | List/search appointments |
| POST   | `/api/appointments`            | Admin, Doctor, Nurse, Receptionist | Schedule an appointment |
| PUT    | `/api/appointments/:id`        | Admin, Doctor, Nurse, Receptionist | Update/reschedule/cancel |
| GET    | `/api/lab/requests`             | Admin, Doctor, Lab Technician | List lab requests |
| POST   | `/api/lab/requests`             | Doctor | Request a lab test |
| PUT    | `/api/lab/requests/:id/status`  | Lab Technician, Admin | Update test status |
| POST   | `/api/lab/results`              | Lab Technician | Enter a result (auto-completes the request) |
| GET    | `/api/prescriptions`           | Admin, Doctor, Pharmacist | List prescriptions |
| POST   | `/api/prescriptions`           | Doctor | Create a prescription |
| PUT    | `/api/prescriptions/:id`       | Pharmacist, Admin | Update status (dispense/cancel/complete) |
| GET    | `/api/admissions`              | Yes | List admissions |
| POST   | `/api/admissions`              | Admin, Doctor, Nurse | Admit a patient |
| PUT    | `/api/admissions/:id/discharge`| Admin, Doctor, Nurse | Discharge a patient |
| GET    | `/api/staff`                    | Admin | List staff |
| POST   | `/api/staff`                    | Admin | Create a staff account (returns a one-time temp password) |
| PUT    | `/api/staff/:id`                | Admin | Update role/department/details |
| PUT    | `/api/staff/:id/deactivate`     | Admin | Deactivate an account |
| PUT    | `/api/staff/:id/activate`       | Admin | Reactivate an account |
| PUT    | `/api/staff/:id/reset-password` | Admin | Force a password reset |
| PUT    | `/api/staff/demo/deactivate-all` | Non-demo Admin | Deactivate all demo accounts while preserving records |
| GET    | `/api/departments`              | Yes | List departments |
| POST   | `/api/departments`              | Admin | Create a department |
| PUT    | `/api/departments/:id`          | Admin | Update a department |
| GET    | `/api/audit-logs`               | Admin | Search the audit trail |
| GET    | `/api/dashboard/summary`        | Yes | Dashboard stat cards |
| GET    | `/api/dashboard/registration-trend` | Yes | 14-day patient registration trend |
| GET    | `/api/dashboard/todays-schedule`| Yes | Today's appointments |
| GET    | `/api/dashboard/pending-lab-tests` | Yes | Outstanding lab requests |
| GET    | `/api/dashboard/recent-activity`| Admin | Recent audit log entries |
| GET    | `/api/settings`                 | Yes | Read system settings |
| PUT    | `/api/settings`                 | Admin | Update system settings |
| GET    | `/api/staff-directory`          | Yes | Minimal staff lookup (id/name/role/department) for populating dropdowns |

Every backend endpoint from the original spec is implemented and mounted in
`app.ts`, with corresponding frontend workflows for the core record,
scheduling, laboratory, prescription, admission, staff, and settings flows.

## Build plan / roadmap

- [x] **Phase 1** — Project setup
- [x] **Phase 2** — Database + Prisma schema (all 13 models)
- [x] **Phase 3** — Backend architecture (config, middleware, error handling)
- [x] **Phase 4** — Authentication + RBAC
- [x] **Phase 5** — Patient management (register, search, profile with tabs)
- [x] **Phase 6** — Medical records (visits, vitals, diagnoses) + full sidebar/header shell
- [x] **Phase 7** — Appointments (day-grouped list + scheduling form; no drag/drop calendar)
- [x] **Phase 8** — Laboratory (request → in progress → result workflow)
- [x] **Phase 9** — Prescriptions (multi-line prescribe → dispense/cancel)
- [x] **Phase 10** — Admissions (admit → discharge, one active admission per patient)
- [x] **Phase 11** — Staff/department admin (create/deactivate/reset password)
- [x] **Phase 12** — Dashboard analytics (stat cards, 14-day trend chart, today's schedule, pending labs, recent activity)
- [x] **Phase 13** — Security hardening (see below)
- [x] **Phase 14** — Testing — Jest+Supertest (backend, mocked Prisma) and Vitest+RTL (frontend); 67 tests executed and passing on 2026-09-21
- [x] **Phase 15** — Final UI polish — dark mode, shaped skeleton loaders, and fade-in micro-interactions added; a full month-grid calendar replaces the day-list-only Appointments view

### Phase 13 security checklist (self-review, not a professional audit)

- [x] Passwords hashed with Argon2id
- [x] Every role's permissions enforced server-side, not just hidden UI
- [x] Zod validation on every write endpoint
- [x] Centralized error handler never leaks stack traces (dev mode shows
      messages; production mode returns a generic message)
- [x] `httpOnly` cookies for access and refresh tokens; production defaults
      to `secure` + `sameSite=none` for cross-origin hosting, while local
      development defaults to `sameSite=lax`
- [x] Rate limiting: stricter on `/auth/*`, general limiter on everything else
- [x] `helmet()` security headers, proxy trust in production, and explicit
      CORS allowlisting via `APP_ORIGINS`/`FRONTEND_URL`
- [x] Audit logging on every sensitive action with IP address
- [x] `.env` git-ignored, `.env.example` has no real secrets
- [x] GitHub Actions production dependency audits and weekly Dependabot
      updates
- [ ] Still external: professional penetration testing and TLS termination;
      production also needs managed secrets, backups, and monitoring

### Phase 14 testing note (updated)

A real test suite exists for both backend and frontend (see "Running tests"
above). Dependencies were installed, Prisma Client generated, lint/tests/
production builds executed, and production dependency audits run on
2026-09-21. Backend: 55 tests passed and zero production vulnerabilities.
Frontend: 12 tests passed; the high-severity audit threshold passed, with two
moderate React Router advisories retained because npm's available fix is a
breaking v7 upgrade. The app is client-rendered (not SSR), and notification
navigation accepts only same-app absolute paths, reducing exposure while that
upgrade is planned.

## Troubleshooting

- **`Invalid environment configuration` on backend start** — you likely
  copied `.env.example` to `.env` but didn't fill in `JWT_ACCESS_SECRET` /
  `JWT_REFRESH_SECRET` (must be ≥32 characters) or `DATABASE_URL`.
- **`P1001: Can't reach database server`** — Postgres isn't running, or
  `DATABASE_URL` doesn't match its host/port/credentials.
- **CORS errors in the browser console** — make sure the exact frontend
  origin (scheme, host, and port) appears in backend `APP_ORIGINS`; use a
  comma-separated list when serving multiple trusted frontends. The legacy
  single `FRONTEND_URL` value remains supported.
- **Login succeeds but `/auth/me` returns 401** — check that
  `COOKIE_SECURE=false` in development (cookies marked `secure` won't be
  sent over plain `http://localhost`). In production, leave secure cookies
  enabled and use HTTPS; `COOKIE_SAME_SITE=none` supports separate Render and
  Vercel origins.

## Notifications

The application includes staff notifications for prescriptions, laboratory
requests/results, appointments, and admissions. Notifications are stored in
PostgreSQL and displayed from the dashboard bell. The frontend polls every
15 seconds. Appointment notifications include the appointment ID; selecting
one navigates without a full page reload and opens a focused, highlighted
appointment record. Invalid or unavailable targets show an explicit retry or
not-found state instead of silently displaying an unrelated list.

After updating an existing database, run:

```bash
cd backend
npx prisma migrate deploy
npx prisma generate
```

For development, `npx prisma migrate dev` is also supported.
