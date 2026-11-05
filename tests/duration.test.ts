import { describe, it, expect } from 'vitest';
import { parseDurationToSeconds, secondsToDuration } from '../src/roblox/restrictions.js';

describe('duration utils', () => {
  it('parseDurationToSeconds', () => {
    expect(parseDurationToSeconds('30m')).toBe(1800);
    expect(parseDurationToSeconds('12h')).toBe(43200);
    expect(parseDurationToSeconds('7d')).toBe(604800);
    expect(parseDurationToSeconds('2w')).toBe(1209600);
    expect(parseDurationToSeconds('3600')).toBe(3600);
    expect(parseDurationToSeconds('perm')).toBeNull();
    expect(parseDurationToSeconds('permanente')).toBeNull();
    expect(parseDurationToSeconds('invalid')).toBeNull();
  });

  it('secondsToDuration', () => {
    expect(secondsToDuration(60)).toBe('60s');
    expect(secondsToDuration(86400)).toBe('86400s');
  });
});
