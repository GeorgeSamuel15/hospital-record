import { describe, it, expect, vi, afterEach } from 'vitest';
import { calculateAge } from './patient';

describe('calculateAge', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('calculates a straightforward whole-year age', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-15'));
    expect(calculateAge('2000-06-15')).toBe(26);
  });

  it('has not yet had this year\'s birthday', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-14'));
    expect(calculateAge('2000-06-15')).toBe(25);
  });

  it('has already had this year\'s birthday', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-16'));
    expect(calculateAge('2000-06-15')).toBe(26);
  });

  it('handles a birthday exactly today', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-01'));
    expect(calculateAge('2020-03-01')).toBe(6);
  });
});
