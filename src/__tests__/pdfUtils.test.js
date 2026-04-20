import { describe, it, expect } from 'vitest';
import { calcularIdade, formatDateBR } from '../services/pdfUtils';

describe('calcularIdade', () => {
  it('should return "Nao informada" for null/undefined', () => {
    expect(calcularIdade(null)).toBe('Nao informada');
    expect(calcularIdade(undefined)).toBe('Nao informada');
    expect(calcularIdade('')).toBe('Nao informada');
  });

  it('should calculate age correctly from ISO date string', () => {
    const today = new Date();
    const birthYear = today.getFullYear() - 30;
    const birthDate = `${birthYear}-01-15`;
    const result = calcularIdade(birthDate);
    // Depending on month, age could be 29 or 30
    expect(result).toMatch(/^\d+ anos$/);
    const age = parseInt(result);
    expect(age).toBeGreaterThanOrEqual(29);
    expect(age).toBeLessThanOrEqual(30);
  });

  it('should handle date with T suffix', () => {
    const today = new Date();
    const birthYear = today.getFullYear() - 25;
    const birthDate = `${birthYear}-06-01T00:00:00`;
    const result = calcularIdade(birthDate);
    const age = parseInt(result);
    expect(age).toBeGreaterThanOrEqual(24);
    expect(age).toBeLessThanOrEqual(25);
  });
});

describe('formatDateBR', () => {
  it('should convert YYYY-MM-DD to DD/MM/YYYY', () => {
    expect(formatDateBR('2024-03-15')).toBe('15/03/2024');
    expect(formatDateBR('2023-12-01')).toBe('01/12/2023');
  });

  it('should return N/D for null/undefined/empty', () => {
    expect(formatDateBR(null)).toBe('N/D');
    expect(formatDateBR(undefined)).toBe('N/D');
    expect(formatDateBR('')).toBe('N/D');
  });

  it('should return as-is if already in DD/MM/YYYY format', () => {
    expect(formatDateBR('15/03/2024')).toBe('15/03/2024');
  });

  it('should return as-is for unrecognized formats', () => {
    expect(formatDateBR('some string')).toBe('some string');
  });
});
