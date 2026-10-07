import { describe, it, expect } from 'vitest';
import { formatCPF, cleanCPF, validarCPF, formatTelefone, parseDate, formatCurrency, formatDuration } from '../utils/formatUtils';

describe('formatCPF', () => {
  it('should format a raw CPF string with dots and dash', () => {
    expect(formatCPF('12345678901')).toBe('123.456.789-01');
  });

  it('should handle partial input', () => {
    expect(formatCPF('123')).toBe('123');
    expect(formatCPF('1234')).toBe('123.4');
    expect(formatCPF('12345678')).toBe('123.456.78');
  });

  it('should strip non-digit characters', () => {
    expect(formatCPF('123.456.789-01')).toBe('123.456.789-01');
  });

  it('should return empty string for null/undefined', () => {
    expect(formatCPF(null)).toBe('');
    expect(formatCPF(undefined)).toBe('');
    expect(formatCPF('')).toBe('');
  });

  it('should truncate to max 14 chars (with mask)', () => {
    expect(formatCPF('1234567890199999')).toBe('123.456.789-01');
  });
});

describe('cleanCPF', () => {
  it('should remove mask and return only digits', () => {
    expect(cleanCPF('123.456.789-01')).toBe('12345678901');
  });

  it('should return empty string for falsy input', () => {
    expect(cleanCPF(null)).toBe('');
    expect(cleanCPF('')).toBe('');
  });
});

describe('validarCPF', () => {
  it('should return true for empty (CPF is optional)', () => {
    expect(validarCPF('')).toBe(true);
    expect(validarCPF(null)).toBe(true);
  });

  it('should return true for a valid CPF', () => {
    // 529.982.247-25 is a valid CPF
    expect(validarCPF('52998224725')).toBe(true);
    expect(validarCPF('529.982.247-25')).toBe(true);
  });

  it('should return false for invalid length', () => {
    expect(validarCPF('1234')).toBe(false);
    expect(validarCPF('123456789012')).toBe(false);
  });

  it('should reject repeated digits', () => {
    expect(validarCPF('00000000000')).toBe(false);
    expect(validarCPF('11111111111')).toBe(false);
    expect(validarCPF('99999999999')).toBe(false);
  });

  it('should reject CPF with wrong check digits', () => {
    expect(validarCPF('52998224700')).toBe(false);
    expect(validarCPF('12345678900')).toBe(false);
  });
});

describe('formatTelefone', () => {
  it('should format a full cell phone number', () => {
    expect(formatTelefone('21999990000')).toBe('(21) 99999-0000');
  });

  it('should format a landline number', () => {
    expect(formatTelefone('2133330000')).toBe('(21) 3333-0000');
  });

  it('should handle partial input', () => {
    expect(formatTelefone('21')).toBe('21');
    expect(formatTelefone('219')).toBe('(21) 9');
  });

  it('should return empty for null/undefined', () => {
    expect(formatTelefone(null)).toBe('');
    expect(formatTelefone('')).toBe('');
  });

  it('should strip non-digit characters', () => {
    expect(formatTelefone('(21) 99999-0000')).toBe('(21) 99999-0000');
  });

  it('should truncate to 11 digits max', () => {
    expect(formatTelefone('219999900001234')).toBe('(21) 99999-0000');
  });
});

describe('parseDate', () => {
  it('should parse YYYY-MM-DD string correctly', () => {
    const d = parseDate('2026-05-15');
    expect(d).toBeInstanceOf(Date);
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(4); // 0-indexed maio
    expect(d.getDate()).toBe(15);
  });

  it('should support Firestore Timestamp-like objects with toDate()', () => {
    const fakeTimestamp = { toDate: () => new Date(2026, 3, 20) };
    const d = parseDate(fakeTimestamp);
    expect(d).toBeInstanceOf(Date);
    expect(d.getMonth()).toBe(3);
  });

  it('should return null for invalid or null inputs', () => {
    expect(parseDate(null)).toBeNull();
    expect(parseDate(undefined)).toBeNull();
    expect(parseDate('invalid-date-xyz')).toBeNull();
  });
});

describe('formatCurrency', () => {
  it('should format numbers to BRL currency string', () => {
    expect(formatCurrency(150)).toBe('150,00');
    expect(formatCurrency(1250.5)).toBe('1.250,50');
    expect(formatCurrency(0)).toBe('0,00');
  });

  it('should handle string values gracefully', () => {
    expect(formatCurrency('200')).toBe('200,00');
    expect(formatCurrency('200,50')).toBe('200,50');
  });
});

describe('formatDuration', () => {
  it('should format minutes under an hour', () => {
    expect(formatDuration(50)).toBe('50 min');
  });

  it('should format full hours and mixed hour/minutes', () => {
    expect(formatDuration(60)).toBe('1h');
    expect(formatDuration(90)).toBe('1h 30min');
    expect(formatDuration(120)).toBe('2h');
  });

  it('should return 0 min for zero or negative values', () => {
    expect(formatDuration(0)).toBe('0 min');
    expect(formatDuration(-10)).toBe('0 min');
  });
});
