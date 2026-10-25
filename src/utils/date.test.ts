import {describe, expect, it} from 'vitest';
import {formatDateShort, formatIndonesianDate} from './date';

// These lock in the formatting the WhatsApp report and every date label depend on.
// The revamp must not change any of it.
describe('formatIndonesianDate', () => {
  it('renders the Indonesian weekday, day, month and year', () => {
    expect(formatIndonesianDate('2026-10-25')).toBe('Minggu, 25 Oktober 2026');
    expect(formatIndonesianDate('2026-01-01')).toBe('Kamis, 1 Januari 2026');
    expect(formatIndonesianDate('2026-08-17')).toBe('Senin, 17 Agustus 2026');
  });

  it('parses component-wise, so the date never shifts with the timezone', () => {
    // A UTC-midnight parse would render the 30th in any negative-offset zone.
    expect(formatIndonesianDate('2026-09-01')).toContain('1 September');
    expect(formatIndonesianDate('2026-03-01')).toContain('1 Maret');
  });

  it('returns the input unchanged when it is not a y-m-d string', () => {
    expect(formatIndonesianDate('')).toBe('');
    expect(formatIndonesianDate('besok')).toBe('besok');
    expect(formatIndonesianDate('2026-10')).toBe('2026-10');
  });
});

describe('formatDateShort', () => {
  it('renders day/month without leading zeros', () => {
    expect(formatDateShort('2026-10-25')).toBe('25/10');
    expect(formatDateShort('2026-09-07')).toBe('7/9');
    expect(formatDateShort('2026-01-01')).toBe('1/1');
  });

  it('returns an empty string for malformed input', () => {
    expect(formatDateShort('2026-10')).toBe('');
    expect(formatDateShort('')).toBe('');
  });
});
