/* eslint-disable no-console */
import { PrismaClient, Role, Gender } from '@prisma/client';
import argon2 from 'argon2';

const prisma = new PrismaClient();

// NOTE: These are clearly-labeled DEMO/DEVELOPMENT accounts only.
// Do not use these credentials or this seed data in a production deployment.
const DEMO_PASSWORD = 'Demo@1234';

// Refuse to seed a production database by accident. This is a real,
// enforced guard — not just a comment — since seeding creates accounts
// (including an Admin) with a publicly-known password. Set
// ALLOW_PROD_SEED=true only for a genuinely intentional one-off case
// (e.g. bootstrapping a fresh staging environment you control).
if (process.env.NODE_ENV === 'production' && process.env.ALLOW_PROD_SEED !== 'true') {
  console.error(
    '❌ Refusing to run the demo seed script with NODE_ENV=production.\n' +
      '   This would create accounts with a publicly-known password.\n' +
      '   If you genuinely intend this (e.g. bootstrapping a fresh staging\n' +
      '   environment), re-run with ALLOW_PROD_SEED=true.'
  );
  process.exit(1);
}

async function hash(password: string) {
  return argon2.hash(password, { type: argon2.argon2id });
}

async function main() {
  console.log('Seeding demo data (development only)...');

  const passwordHash = await hash(DEMO_PASSWORD);

  // --- Departments ---------------------------------------------------
  const departmentNames = [
    'General Medicine',
    'Pediatrics',
    'Surgery',
    'Emergency',
    'Laboratory',
    'Pharmacy',
    'Radiology',
    'Cardiology',
  ];

  const departments = await Promise.all(
    departmentNames.map((name) =>
      prisma.department.upsert({
        where: { name },
        update: {},
        create: { name, description: `${name} department` },
      })
    )
  );

  const deptByName = Object.fromEntries(departments.map((d) => [d.name, d]));

  // --- Demo staff accounts, one per role ------------------------------
  const staffSeed = [
    { employeeId: 'EMP-000001', firstName: 'Ada', lastName: 'Okafor', email: 'admin@hospital.demo', role: Role.ADMIN, department: null },
    { employeeId: 'EMP-000002', firstName: 'Bola', lastName: 'Adeyemi', email: 'doctor@hospital.demo', role: Role.DOCTOR, department: 'General Medicine' },
    { employeeId: 'EMP-000003', firstName: 'Chika', lastName: 'Nwosu', email: 'nurse@hospital.demo', role: Role.NURSE, department: 'Emergency' },
    { employeeId: 'EMP-000004', firstName: 'Dayo', lastName: 'Balogun', email: 'reception@hospital.demo', role: Role.RECEPTIONIST, department: null },
    { employeeId: 'EMP-000005', firstName: 'Efe', lastName: 'Igbinedion', email: 'labtech@hospital.demo', role: Role.LAB_TECHNICIAN, department: 'Laboratory' },
    { employeeId: 'EMP-000006', firstName: 'Fola', lastName: 'Adebayo', email: 'pharmacist@hospital.demo', role: Role.PHARMACIST, department: 'Pharmacy' },
  ];

  const staff: Record<string, { id: string }> = {};

  for (const s of staffSeed) {
    const user = await prisma.user.upsert({
      where: { email: s.email },
      update: {},
      create: {
        employeeId: s.employeeId,
        firstName: s.firstName,
        lastName: s.lastName,
        email: s.email,
        passwordHash,
        role: s.role,
        departmentId: s.department ? deptByName[s.department].id : undefined,
        isDemo: true,
      },
    });
    staff[s.role] = user;
  }

  // --- A sample patient so the app isn't empty on first login ---------
  await prisma.patient.upsert({
    where: { patientNumber: 'PAT-000001' },
    update: {},
    create: {
      patientNumber: 'PAT-000001',
      firstName: 'Ngozi',
      lastName: 'Eze',
      dateOfBirth: new Date('1990-04-12'),
      gender: Gender.FEMALE,
      phone: '+2348012345678',
      email: 'ngozi.eze@example.demo',
      address: '12 Allen Avenue, Ikeja, Lagos',
      bloodGroup: 'O+',
      genotype: 'AA',
      allergies: 'Penicillin',
      emergencyContactName: 'Tunde Eze',
      emergencyContactPhone: '+2348098765432',
      nextOfKinName: 'Tunde Eze',
      nextOfKinPhone: '+2348098765432',
      registeredById: staff[Role.RECEPTIONIST].id,
    },
  });

  // --- Sync ID sequence counters ---------------------------------------
  // The staff/patient rows above use hardcoded IDs (so demo accounts always
  // have predictable, memorable numbers). Real registrations now use an
  // atomic IdSequence counter (see idSequence.service.ts) instead of
  // count()+1. Without this step, that counter would still be at 0 after
  // seeding, and the very first real registration would generate
  // "EMP-000001" / "PAT-000001" again — colliding with the seed data's
  // unique constraint and failing outright. Setting (not incrementing) the
  // counter here keeps re-running the seed idempotent.
  await prisma.idSequence.upsert({
    where: { name: 'employeeId' },
    create: { name: 'employeeId', value: staffSeed.length },
    update: { value: staffSeed.length },
  });
  await prisma.idSequence.upsert({
    where: { name: 'patientNumber' },
    create: { name: 'patientNumber', value: 1 },
    update: { value: 1 },
  });

  console.log('✅ Seed complete.');
  console.log('');
  console.log('Demo accounts (all use password: ' + DEMO_PASSWORD + '):');
  staffSeed.forEach((s) => console.log(`  ${s.role.padEnd(15)} ${s.email}`));
  console.log('');
  console.log('⚠️  These are development-only demo accounts. Do not use in production.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
