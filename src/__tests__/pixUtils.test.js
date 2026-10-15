import { describe, it, expect } from 'vitest';
import { generatePixPayload, normalizarChavePix } from '../utils/pixUtils';

describe('normalizarChavePix', () => {
  it('deixa a chave no formato do DICT', () => {
    expect(normalizarChavePix(' 123.456.789-09 ')).toBe('12345678909');
    expect(normalizarChavePix('12.345.678/0001-90')).toBe('12345678000190');
    expect(normalizarChavePix('+55 (11) 98765-4321')).toBe('+5511987654321');
    expect(normalizarChavePix('+55 55 99876-5432')).toBe('+5555998765432');
    expect(normalizarChavePix(' Fulano@Exemplo.COM ')).toBe('fulano@exemplo.com');
    expect(normalizarChavePix('123E4567-E89B-42D3-A456-426614174000')).toBe('123e4567-e89b-42d3-a456-426614174000');
  });

  it('recusa chaves inválidas', () => {
    expect(() => normalizarChavePix('joão@x.com')).toThrow();
    expect(() => normalizarChavePix('abc')).toThrow();
  });
});

describe('generatePixPayload', () => {
  const base = { chave: '+55 (11) 98765-4321', nome: 'José Ação', cidade: 'São Paulo' };

  it('gera BR Code só com ASCII e valor fechado', () => {
    const p = generatePixPayload({ ...base, valor: 150 });
    expect(p).toContain('0114+5511987654321');
    expect(p).toContain('5406150.00');
    expect(p).toContain('5909JOSE ACAO');
    expect(p).toContain('6009SAO PAULO');
    expect(p).toMatch(/^[\x20-\x7E]+$/);
  });

  it('não gera QR de valor aberto nem com nome/cidade vazios', () => {
    expect(() => generatePixPayload({ ...base, valor: 0 })).toThrow(/maior que zero/);
    expect(() => generatePixPayload({ ...base, valor: NaN })).toThrow(/maior que zero/);
    expect(() => generatePixPayload({ ...base, valor: 0.004 })).toThrow(/maior que zero/);
    expect(() => generatePixPayload({ ...base, nome: '***', valor: 1 })).toThrow(/Nome do titular/);
    expect(() => generatePixPayload({ ...base, cidade: '   ', valor: 1 })).toThrow(/cidade/);
  });
});
