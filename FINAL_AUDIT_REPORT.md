# Final Audit Report — Hospital Record Management System

This follows `AUDIT_REPORT.md`, which was written first and documents every
issue found before any code was changed. This report documents what was
actually done about it, and — critically — what verification each claim
rests on.

---

## Fixed

### 🔴 Critical

| # | Issue | Fix |
|---|-------|-----|
| C1 | `GET /api/patients/:id` returned every field to every role | Added `getPatientForRole()` with per-role Prisma `select` projections (full record for Admin/Doctor/Nurse; front-desk, lab, and pharmacy-specific subsets for the other three roles). Wired into the controller. Also dropped `bloodGroup` from the general patient list projection (M1), which had the same problem in miniature. |
| C2 | `/api/dashboard/recent-activity` exposed the full audit trail to every role | Restricted to `Role.ADMIN` at the route level. Updated the frontend dashboard to only fetch/render that panel for admins, so non-admins don't even see a 403 in their network tab. |
| C3 | Admission `admittingDoctorId` was always `req.user.id`, regardless of role | Added a required `doctorId` field to the admission schema, validated it references an actual `DOCTOR`-role user, and store that instead of the submitter's own ID. Added the missing doctor picker to the frontend admission form (it didn't exist before, since the old backend never asked for one). |
| C4 | No check that a supplied `visitId` belongs to the supplied `patientId` | Added `assertVisitBelongsToPatient()` and wired it into all four places that accept both IDs: vitals, diagnoses, prescriptions, and lab requests. |

### 🟠 High

| # | Issue | Fix |
|---|-------|-----|
| H1 | Prescription status had no state machine | Explicit transition map: `PENDING → {DISPENSED, CANCELLED}`, `DISPENSED → {COMPLETED}`, both terminal states → nothing. |
| H2 | Lab request status had no state machine | Same approach: `PENDING → {IN_PROGRESS, CANCELLED}`, `IN_PROGRESS → {COMPLETED, CANCELLED}`. Also tightened result entry to require `IN_PROGRESS` (previously only blocked `CANCELLED`, so a still-`PENDING` or already-`COMPLETED` request could silently accept a "new" result). |
| H3 | No appointment conflict detection | Added `assertNoDoctorConflict()`, checked on both creation and rescheduling (updating `scheduledAt`), using the configurable `appointmentSlotMinutes` from `SystemSetting` as the overlap window. |
| H4 | Seed script had no production guard | Added a hard `process.exit(1)` guard when `NODE_ENV=production` unless `ALLOW_PROD_SEED=true` is explicitly set. Also stopped `docker-compose.yml` from auto-seeding on every container start — it's now opt-in via `SEED_ON_START=true`. |
| H5 | Hardcoded fallback JWT secrets in `docker-compose.yml` | Removed the fallback values entirely. `env.ts`'s existing 32-character minimum means the backend now refuses to start with a clear error if the secrets aren't set, instead of silently running with a known-bad one. |
| H6 | Patient/employee ID generation used `count()+1` with retry | Replaced with a real atomic counter (`IdSequence` table + `INSERT ... ON CONFLICT ... DO UPDATE ... RETURNING`), race-free in a single round trip. **Caught during implementation:** the seed script's hardcoded `PAT-000001`/`EMP-000001..6` would have collided with the new counter (which starts at 0) on the very first real registration after seeding — fixed by syncing the counter to match the seeded count at the end of `seed.ts`. |

### 🟡 Medium
- M1 fixed as part of C1 (see above).
- M2 was investigated and found to already be correct (no change needed) — documented in `AUDIT_REPORT.md`.
- M3 (error message specificity) addressed as part of H1/H2 — each rejected transition now names the current and attempted status explicitly.

### 🔵 Low
- L2 fixed as part of C2 (frontend no longer calls the now-restricted endpoint for non-admins).

---

## Remaining (intentionally not addressed)

- **No CI pipeline** runs the test suite automatically. Out of scope for this
  audit pass — flagged in the main README as a known gap.
- **No automated dependency vulnerability scanning.**
- **Docker images remain unbuilt/untested** — the compose and Dockerfile
  changes in this audit (H4, H5) were reviewed by reading, not by running
  `docker compose up`, since this sandbox has no network access to pull base
  images.
- **The appointment conflict window is slot-based, not calendar-aware of
  doctor working hours** — it prevents double-booking within one slot width
  of an existing appointment, but doesn't know about lunch breaks, shift
  ends, or days off. That's a reasonable v1, not a full scheduling engine.

---

## Security summary

The most significant change is closing the patient-data-exposure gap (C1):
previously, *any* authenticated staff member — including Receptionist, Lab
Technician, and Pharmacist — could pull a patient's full allergy history,
genotype, and next-of-kin details through an endpoint the frontend already
called routinely. That's now enforced server-side with role-specific
projections, matching the spec's Section 4 permission table exactly.

The second most significant change is data-integrity, not access-control:
C3 and C4 both address ways the system could silently record clinically
false information (the wrong doctor as "admitting," or a vital/diagnosis
linked to the wrong patient's visit) without ever throwing an error. Neither
was an access-control bug — a fully-authorized Doctor or Nurse could trigger
either one by innocent mistake, not by malice — but both would have produced
incorrect medical records with no indication anything was wrong.

H4/H5 (seed guard, hardcoded secrets) close two "it works in dev, forgotten
in prod" foot-guns rather than active vulnerabilities as-shipped.

---

## Testing

New test files added this session (all use a fully mocked Prisma client —
no live database required):

- `patient.roleProjection.test.ts` — verifies each role receives exactly the
  fields it should from `GET /patients/:id` (fixes C1), including asserting
  on the actual `select` clause passed to Prisma, not just the response
  shape.
- `relationshipValidation.service.test.ts` — verifies the visit/patient
  cross-check rejects mismatched IDs and accepts matched ones (fixes C4).
- `statusTransitions.test.ts` — integration tests via Supertest covering
  invalid prescription transitions (H1), invalid lab transitions (H2), and
  appointment conflict rejection (H3).
- `rbacBoundaries.test.ts` — the exact scenarios named in the audit brief:
  Receptionist/Pharmacist cannot create diagnoses, Lab Technician/Nurse
  cannot create prescriptions, non-admin roles cannot read the audit log or
  dashboard recent-activity, a deactivated user is locked out even with a
  technically-valid token, unauthenticated requests are rejected.
- Updated `patient.service.test.ts` — the existing "generates a sequential
  patient number" test mocked the now-removed `count()`-based logic; fixed
  to mock the new atomic counter instead (caught by re-reading the test
  against the H6 change, not by running it).

### What was and wasn't actually run

| Check | Status | Detail |
|---|---|---|
| `npm install` (backend/frontend) | **NOT RUN** | No network access in this sandbox. `node_modules` does not exist for either package. |
| TypeScript check (`tsc --noEmit`) | **PARTIAL / INCONCLUSIVE** | Attempted with the sandbox's globally-installed `tsc`. First attempt failed on a TypeScript-version mismatch unrelated to this code (`moduleResolution=node10` deprecation — the project targets TS ^5.6.2, the global tool is a newer 6.x). Bypassing that surfaced only "cannot find module" errors for every third-party import (`express`, `zod`, `@prisma/client`, `jest`, etc.) — expected and uninformative given `node_modules` doesn't exist. **This did not produce a real signal on whether the code type-checks.** |
| ESLint | **NOT RUN** | Same dependency blocker. |
| Frontend build (`vite build`) | **NOT RUN** | Same blocker. |
| Backend build (`tsc -p tsconfig.json`) | **NOT RUN** | Same blocker. |
| Prisma validation (`prisma validate`) | **NOT RUN** | Requires the `prisma` CLI, which isn't installed. The schema was reviewed manually for the `IdSequence`/`SystemSetting` additions (correct field types, no `@@map` mismatch with the raw SQL in `idSequence.service.ts` — verified by inspection). |
| Prisma generate | **NOT RUN** | Same blocker. |
| Unit/integration tests (`npm test`) | **NOT RUN** | Same blocker — Jest itself isn't installed. |
| Manual code review / cross-reference | **DONE** | Every changed file was re-read after editing. Ran an automated unused-import sweep (a Node script checking each imported identifier appears more than once in its file) across every backend file touched this session — zero flagged. Verified call-site signatures match function signatures after refactors (e.g. `admitPatient()`'s new signature, `getPatientForRole` replacing `getPatientById` in the controller). Caught and fixed three real bugs *during this review process itself*: a stray field that would have broken Prisma's typed `create()` in the admission fix, a seed/counter collision introduced by the H6 fix, and a test mock that would have silently misrepresented which user was "the doctor" in an appointment-conflict test. |

**Bottom line on Phase 4:** static checks could not be genuinely run in this
environment, for the same reason noted throughout this project's history —
no network access means no installed dependencies, and no installed
dependencies means no compiler, linter, or test runner actually executes.
What's reported above as "DONE" is careful manual review, which is real
verification but a different and weaker guarantee than a passing build.
**Run `npm install && npm run prisma:generate && npm test` yourself as the
true first check** — if anything surfaces, it's far more likely to be a
small, fixable mismatch than a structural problem, given the density of
manual cross-checking this went through, but it hasn't been proven by
execution.

---

## Known limitations

- The appointment conflict check and the two status state machines are new
  logic added in direct response to this audit — they've never been
  exercised against a real database, only against a mocked one in the new
  test files (which themselves haven't been executed, per above).
- Role-based patient field projection (C1) changes the *shape* of the
  `Patient` object the frontend receives for non-clinical roles. The
  frontend was updated defensively (optional fields simply don't render),
  but this hasn't been visually verified in a running browser.
- This audit focused on the specific items enumerated in the audit brief.
  It is not a certification that no other issues exist — it's a record of
  what was actually checked and what was found.
