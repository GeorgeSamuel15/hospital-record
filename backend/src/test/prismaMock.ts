import { PrismaClient } from '@prisma/client';
import { mockDeep, mockReset, DeepMockProxy } from 'jest-mock-extended';

// A fully-typed deep mock of PrismaClient. Tests import `prismaMock` to set
// up return values (e.g. `prismaMock.patient.findUnique.mockResolvedValue(...)`)
// and call `resetPrismaMock()` in beforeEach to avoid state leaking between tests.
export const prismaMock = mockDeep<PrismaClient>() as unknown as DeepMockProxy<PrismaClient>;

export function resetPrismaMock() {
  mockReset(prismaMock);
}
