# Audit Report — Hospital Record Management System

Every issue below was verified by reading the actual code (not inferred from
the README or from memory of writing it). File paths and line-level context
are given so each can be checked independently. Nothing here is invented —
if an area was checked and found correct, it's noted as verified rather than
padded with a manufactured issue.

---

## 🔴 CRITICAL

### C1. `GET /api/patients/:id` returns every field to every authenticated role
**File:** `backend/src/services/patient.service.ts`, `getPatientById()`
**File:** `backend/src/routes/patient.routes.ts`, `router.get('/:id', getById)`

**Problem:** `getPatientById` calls `prisma.patient.findUnique({ where: { id } })`
with no `select` clause, so it returns the complete row — `allergies`,
`genotype`, `bloodGroup`, `emergencyContactName/Phone`, `nextOfKinName/Phone`,
`address` — everything. The route only requires `requireAuth()`, no role
restriction, so a Receptionist, Lab Technician, or Pharmacist hitting this
endpoint (which the frontend's Patient Profile page and `PatientPicker` do
for any authenticated user) receives full clinical and personal data they
have no legitimate need for.

**Impact:** Direct violation of the role-based data minimization the system
is supposed to enforce (spec Section 4). This is the single most significant
issue in the audit — patient allergy/genotype/next-of-kin data is exposed to
front-desk, lab, and pharmacy roles.

**Fix:** Implement role-based field projection: full record for
Admin/Doctor/Nurse; a front-desk projection (demographics + contacts, no
clinical fields) for Receptionist; a minimal clinical-safety projection
(name, ID, DOB, gender, allergies) for Pharmacist; a minimal projection
(name, ID, DOB, gender, blood group) for Lab Technician.

---

### C2. `GET /api/dashboard/recent-activity` exposes the full audit trail to every role
**File:** `backend/src/routes/dashboard.routes.ts`

**Problem:** `router.use(requireAuth())` is the only guard on the entire
dashboard router. `getRecentActivity` returns the 15 most recent `AuditLog`
rows — including `LOGIN`, `MEDICAL_RECORD_VIEWED`, `PATIENT_VIEWED`,
`STAFF_DEACTIVATED`, etc., with the acting user's name and role — to any
authenticated user, including Receptionist, Lab Technician, and Pharmacist.

**Impact:** Ordinary staff can see who logged in, who viewed which patient's
records, and administrative actions like staff deactivation. This is
system-wide activity surveillance data with no legitimate reason to be
visible outside Admin (spec's own Section 18: "Create an admin-only audit
log page" — this is the same data via a different endpoint).

**Fix:** Restrict `/recent-activity` to `Role.ADMIN`. The other dashboard
endpoints (summary counts, today's schedule, pending labs) are legitimately
useful to all staff and are correctly left open.

---

### C3. Admission `admittingDoctorId` is silently set to whoever is logged in, regardless of role
**File:** `backend/src/routes/admission.routes.ts`, `admitPatient()` and `create` handler

**Problem:** `router.post('/', canManage, ...)` allows `ADMIN`, `DOCTOR`, and
`NURSE` to create an admission, but `admitPatient(req.body, req.user.id)`
always stores `req.user.id` as `admittingDoctorId` — with no field in the
request body to specify the doctor at all. If a Nurse or Admin creates the
admission, **their own user ID is stored as the admitting doctor**, even
though they aren't a doctor.

**Impact:** Corrupts a clinically meaningful field. `Admission.admittingDoctor`
is a foreign key to `User` with no role check, so the data itself doesn't
even guarantee a doctor is referenced — reports, discharge summaries, and
any downstream logic that assumes `admittingDoctor` is a physician are
working with false data.

**Fix:** Add a required `doctorId` field to the admission request body,
validate that the referenced user exists and has `role: DOCTOR`, and store
that ID — independent of who is physically submitting the form.

---

### C4. No validation that a supplied `visitId` actually belongs to the supplied `patientId`
**Files:** `backend/src/services/vital.service.ts`, `backend/src/services/diagnosis.service.ts`,
`backend/src/routes/prescription.routes.ts`, `backend/src/routes/lab.routes.ts`

**Problem:** Vitals, diagnoses, prescriptions, and lab requests all accept an
optional `visitId` alongside `patientId`. None of the four creation paths
verify the visit belongs to the patient. Prisma's foreign key only confirms
the visit *exists* — not that it belongs to the same patient. A client could
submit `patientId: A, visitId: <belongs to patient B>` and the record would
be created without error.

**Impact:** Real clinical data integrity risk — a vital sign, diagnosis,
prescription, or lab result could be linked to the wrong patient's visit,
which is exactly the kind of cross-patient data corruption a hospital system
cannot tolerate.

**Fix:** Add a shared `assertVisitBelongsToPatient(visitId, patientId)`
helper and call it from all four creation paths before writing.

---

## 🟠 HIGH

### H1. Prescription status has no state machine — any status can be set from any status
**File:** `backend/src/routes/prescription.routes.ts`, `updatePrescriptionStatus()`

**Problem:** The only guard is:
```ts
if (existing.status === 'CANCELLED' || existing.status === 'COMPLETED') {
  throw AppError.badRequest(...)
}
```
This blocks changes *from* a terminal state, but does not restrict *which*
status a `PENDING` or `DISPENSED` prescription can move to. A `PENDING`
prescription can jump straight to `COMPLETED` (skipping `DISPENSED`
entirely), and a `DISPENSED` prescription can be flipped back to `PENDING`.

**Impact:** Violates the explicit workflow in the spec
(`PENDING → DISPENSED → COMPLETED` or `PENDING → CANCELLED`). A dispensed
medication being marked back to pending, or completed without ever being
recorded as dispensed, undermines the medication audit trail.

**Fix:** Implement an explicit transition map and reject anything not in it.

### H2. Lab request status has the same missing state machine
**File:** `backend/src/routes/lab.routes.ts`, `updateLabRequestStatus()`

**Problem:** Identical pattern to H1 — only blocks changes away from
`COMPLETED`. A `CANCELLED` request can be resurrected to `IN_PROGRESS`; a
`PENDING` request can jump directly to `COMPLETED` without ever passing
through `IN_PROGRESS`.

**Fix:** Same transition-map approach as H1.

### H3. No appointment conflict detection
**File:** `backend/src/routes/appointment.routes.ts`, `createAppointment()`

**Problem:** The function checks that the patient exists and the doctor is
actually a doctor, but does not check for scheduling overlaps. Two
appointments can be created for the same doctor at the exact same
`scheduledAt` timestamp.

**Impact:** Double-booking with no warning to the scheduler — directly
contradicts spec Section 14 ("Prevent a doctor from having two appointments
at the same time").

**Fix:** Before creating, query for existing non-cancelled appointments for
that doctor within a slot-width window (using the configurable
`appointmentSlotMinutes` from `SystemSetting`) and reject with a clear error
if one overlaps.

### H4. Seed script has no production guard
**File:** `backend/prisma/seed.ts`

**Problem:** The script is clearly commented as dev-only, but nothing in the
code actually prevents it from running against a production database. Worse,
`docker-compose.yml`'s backend `command` runs `npx prisma db seed`
unconditionally on every container start, in the same block that sets
`NODE_ENV: production`.

**Impact:** If this compose file (or a copy of the seed command) were ever
pointed at a real database, it would silently (re-)create demo accounts with
a publicly-known password (`Demo@1234`) with real staff-level roles,
including Admin.

**Fix:** Add a guard at the top of `seed.ts` that refuses to run when
`NODE_ENV === 'production'` unless an explicit `ALLOW_PROD_SEED=true`
override is set, and stop auto-seeding in `docker-compose.yml`.

### H5. Hardcoded fallback JWT secrets in `docker-compose.yml`
**File:** `docker-compose.yml`

**Problem:**
```yaml
JWT_ACCESS_SECRET: ${JWT_ACCESS_SECRET:-dev-only-access-secret-change-me-please-32chars}
JWT_REFRESH_SECRET: ${JWT_REFRESH_SECRET:-dev-only-refresh-secret-change-me-please-32ch}
```
If the operator forgets to `export` real secrets before running
`docker compose up`, the stack starts anyway using these known,
publicly-visible-in-the-repo fallback strings.

**Impact:** A silent, working-but-insecure default is worse than a loud
failure — anyone who has ever seen this repository knows these fallback
secrets, so any deployment that forgets to override them has forgeable auth
tokens.

**Fix:** Remove the fallback values entirely. `env.ts`'s Zod schema already
requires 32+ character secrets — with no fallback, an empty string fails
that validation and the backend refuses to start with a clear error, instead
of starting with a known-bad secret.

### H6. Patient/employee ID generation is race-tolerant but not race-free, and gives no ordering guarantee
**File:** `backend/src/services/patient.service.ts`, `generatePatientNumber()`
**File:** `backend/src/routes/staff.routes.ts`, `generateEmployeeId()`

**Problem:** Both use `count() + 1` and rely on the database's `@unique`
constraint plus an application-level retry loop to survive collisions.
**Correction to how this might first appear:** the `@unique` constraint on
`patientNumber`/`employeeId` (confirmed in `schema.prisma`) does prevent an
actual duplicate from ever being committed — so this is not a
data-corruption bug. It is, however, inefficient under concurrent load (each
collision costs a full round trip and retry, capped at 5 attempts before
returning a 500), and numbers are not guaranteed sequential/gapless, which
matters for an ID meant to look like a stable medical record number.

**Fix:** Replace with a dedicated atomic counter using
`INSERT ... ON CONFLICT ... DO UPDATE SET value = value + 1 RETURNING value`
in a single round trip — race-free without retries, and Postgres guarantees
atomicity of that statement even under concurrent access.

---

## 🟡 MEDIUM

### M1. `bloodGroup` (a clinical field) is exposed in the general patient list
**File:** `backend/src/services/patient.service.ts`, `listPatients()` select clause

**Problem:** The list endpoint's `select` includes `bloodGroup` and is
reachable by every authenticated role, including Receptionist. This is a
smaller version of C1's problem, in the search/list view rather than the
detail view.

**Fix:** Remove `bloodGroup` from the shared list projection; it's already
available to clinical roles via the overview/history endpoints.

### M2. Diagnosis creation doesn't confirm the acting doctor is the one recorded
This was checked and is **not actually a bug** — `createDiagnosis` always
uses the authenticated user's ID (`req.user.id`) as `doctorId`, and the route
is already gated to `requireRole(Role.DOCTOR)` only, so the recorded doctor
and the acting user are always the same, correctly-roled person. Noted here
only because the original brief asked this to be checked explicitly (item 9)
— verified correct, no change made.

### M3. New "invalid transition" errors need to stay specific
Once the state machines from H1/H2 are added, the resulting error messages
need to stay specific enough to be useful to the frontend (e.g. "Cannot mark
as dispensed — this prescription was already cancelled" rather than a
generic 400) rather than collapsing into one generic message.

---

## 🔵 LOW

### L1. `DEPLOYMENT.md` already documents H4/H5 in prose but the code didn't enforce them
Not a bug in itself, but worth noting: the deployment guide already warns
against relying on the compose file's seed step and against real secrets —
this audit closes the gap between "documented" and "enforced."

### L2. Frontend `DashboardPage.tsx` calls `getRecentActivity()` unconditionally for every role
Once C2 is fixed server-side, non-admin users will get a 403 from this call
on every dashboard load. Functionally harmless (React Query will just show
the panel's error/empty state) but wasteful and would surface a console
error. Should be gated to `user.role === 'ADMIN'` on the frontend too, both
for cleanliness and as the normal "don't call it if you can't use it"
practice — the backend restriction remains the actual security boundary.

---

## Areas checked and found correct (no changes made)

- **Authentication/deactivation** (`middleware/auth.ts`, `auth.controller.ts`
  refresh handler): both the access-token middleware and the refresh-token
  endpoint re-check `isActive` against the database on every request, not
  just at login. A deactivated user is correctly locked out immediately,
  including mid-session.
- **Password hashing**: Argon2id, verified.
- **RBAC on staff/department/settings management**: correctly admin-gated.
- **CORS/Helmet/rate limiting**: CORS locked to `FRONTEND_URL`, `helmet()`
  applied, general + stricter auth-specific rate limits both present.
- **Zod validation coverage**: every POST/PUT endpoint checked has a
  `validate(...)` middleware call with a real schema; none accept
  unvalidated bodies.
- **Error handler**: confirmed it never leaks stack traces outside
  `NODE_ENV=development`, and translates known Prisma error codes (P2002,
  P2025) into safe messages.
- **`.env` / `.gitignore`**: `.env` correctly ignored in both root and
  package-level `.gitignore` entries; `.env.example` contains no real
  secrets.
