import { describe, it, expect, vi } from 'vitest';
import {
  PLANOS_CARITAS,
  detectarBandeiraCartao,
  validarNumeroCartao,
  verificarStatusAssinatura,
  gerarDadosPixMensal,
  DIAS_CARENCIA_BLOQUEIO
} from '../services/paymentService';

// Mock dependencies to avoid real Firebase calls
vi.mock('../services/firebaseConfig', () => ({
  auth: { currentUser: { uid: 'psi-test-123', email: 'psicologo@caritas.app' } },
  db: {},
}));

vi.mock('../services/logService', () => ({
  trackAction: vi.fn().mockResolvedValue(true),
}));

describe('Serviço de Pagamentos e Planos (paymentService)', () => {
  describe('Catálogo de Planos CARITAS', () => {
    it('deve conter planos basico, profissional e clinica com regras definidas', () => {
      expect(PLANOS_CARITAS.basico).toBeDefined();
      expect(PLANOS_CARITAS.profissional).toBeDefined();
      expect(PLANOS_CARITAS.clinica).toBeDefined();

      expect(PLANOS_CARITAS.basico.preco).toBe(79.90);
      expect(PLANOS_CARITAS.profissional.preco).toBe(139.90);
      expect(PLANOS_CARITAS.clinica.preco).toBe(299.90);

      expect(PLANOS_CARITAS.basico.maxPacientes).toBe(20);
      expect(PLANOS_CARITAS.profissional.maxPacientes).toBe(50);
      expect(PLANOS_CARITAS.clinica.maxPacientes).toBe(160);
    });
  });

  describe('Detecção de Bandeira e Validação de Cartão', () => {
    it('deve identificar bandeiras comuns de cartão', () => {
      expect(detectarBandeiraCartao('4111111111111111')).toBe('Visa');
      expect(detectarBandeiraCartao('5500000000000004')).toBe('Mastercard');
      expect(detectarBandeiraCartao('378282246310005')).toBe('Amex');
      expect(detectarBandeiraCartao('6011000000000000')).toBe('Discover');
      expect(detectarBandeiraCartao('0000000000000000')).toBe('Cartão');
    });

    it('deve validar cartões com algoritmo de Luhn', () => {
      expect(validarNumeroCartao('49927398716')).toBe(true);
      expect(validarNumeroCartao('49927398717')).toBe(false);
      expect(validarNumeroCartao('123')).toBe(false);
    });
  });

  describe('Verificação de Status de Assinatura (Paywall & Bloqueio)', () => {
    it('deve liberar psicólogo isento pelo administrador', () => {
      const perfilIsento = { isIsento: true, plano: 'profissional' };
      const res = verificarStatusAssinatura(perfilIsento);
      expect(res.emDia).toBe(true);
      expect(res.status).toBe('isento');
    });

    it('deve liberar psicólogo em período de testes (Trial ativo)', () => {
      const dataFutura = new Date();
      dataFutura.setDate(dataFutura.getDate() + 7);

      const perfilTrial = {
        statusPagamento: 'trial',
        trialAte: dataFutura.toISOString().split('T')[0],
      };

      const res = verificarStatusAssinatura(perfilTrial);
      expect(res.emDia).toBe(true);
      expect(res.status).toBe('trial');
      expect(res.diasRestantesTrial).toBeGreaterThanOrEqual(6);
    });

    it('deve bloquear psicólogo quando o período de testes (Trial) tiver expirado', () => {
      const dataPassada = new Date();
      dataPassada.setDate(dataPassada.getDate() - 3);

      const perfilTrialExpirado = {
        statusPagamento: 'trial',
        trialAte: dataPassada.toISOString().split('T')[0],
      };

      const res = verificarStatusAssinatura(perfilTrialExpirado);
      expect(res.emDia).toBe(false);
      expect(res.status).toBe('trial_expirado');
    });

    it('deve bloquear quando statusPagamento estiver inadimplente', () => {
      const perfilInadimplente = {
        statusPagamento: 'inadimplente',
        proximoVencimento: '2026-04-01',
      };
      const res = verificarStatusAssinatura(perfilInadimplente);
      expect(res.emDia).toBe(false);
      expect(res.status).toBe('inadimplente');
    });

    it('deve manter liberado com carência de 3 dias caso vença há 1 dia', () => {
      const dataVencidaRecente = new Date();
      dataVencidaRecente.setDate(dataVencidaRecente.getDate() - 1);

      const perfilCarencia = {
        statusPagamento: 'ativo',
        proximoVencimento: dataVencidaRecente.toISOString().split('T')[0],
      };

      const res = verificarStatusAssinatura(perfilCarencia);
      expect(res.emDia).toBe(true);
      expect(res.status).toBe('carencia');
    });

    it('deve bloquear quando ultrapassar a carência de tolerância', () => {
      const dataMuitoVencida = new Date();
      dataMuitoVencida.setDate(dataMuitoVencida.getDate() - (DIAS_CARENCIA_BLOQUEIO + 2));

      const perfilVencido = {
        statusPagamento: 'ativo',
        proximoVencimento: dataMuitoVencida.toISOString().split('T')[0],
      };

      const res = verificarStatusAssinatura(perfilVencido);
      expect(res.emDia).toBe(false);
      expect(res.status).toBe('inadimplente');
    });

    it('deve manter liberado quando a data de vencimento estiver no futuro', () => {
      const dataFutura = new Date();
      dataFutura.setDate(dataFutura.getDate() + 25);

      const perfilAtivo = {
        statusPagamento: 'ativo',
        proximoVencimento: dataFutura.toISOString().split('T')[0],
      };

      const res = verificarStatusAssinatura(perfilAtivo);
      expect(res.emDia).toBe(true);
      expect(res.status).toBe('ativo');
    });
  });

  describe('Geração de PIX Mensal', () => {
    it('deve gerar payload PIX com cópia e cola e valor do plano correspondente', () => {
      const pixPro = gerarDadosPixMensal('profissional', 'psicologo@email.com');
      expect(pixPro.valor).toBe(139.90);
      expect(pixPro.copiaECola).toContain('00020126580014br.gov.bcb.pix');
      expect(pixPro.txid).toBeDefined();
    });
  });
});
