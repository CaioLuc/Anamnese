import { describe, it, expect, vi } from 'vitest';
import { createRequire } from 'module';
import * as svc from '../services/paymentService';
import {
  PLANOS_CARITAS,
  detectarBandeiraCartao,
  validarNumeroCartao,
  verificarStatusAssinatura,
  DIAS_CARENCIA_BLOQUEIO
} from '../services/paymentService';
import { dataLocalISO } from '../utils/formatUtils';

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

      expect(PLANOS_CARITAS.basico.preco).toBe(59.90);
      expect(PLANOS_CARITAS.profissional.preco).toBe(119.90);
      // Clínica: preço negociado, fora do checkout
      expect(PLANOS_CARITAS.clinica.preco).toBeNull();
      expect(PLANOS_CARITAS.clinica.sobConsulta).toBe(true);
      expect(svc.PLANOS_CONTRATAVEIS.map((p) => p.id)).toEqual(['basico', 'profissional']);
      expect(svc.formatarPrecoPlano(PLANOS_CARITAS.clinica)).toBe('Sob consulta');
      expect(svc.formatarPrecoPlano(PLANOS_CARITAS.basico)).toBe('R$ 59,90/mês');
      // Plano fora do catálogo (ids legados 'pro'/'premium', 'isento') não pode derrubar a tela
      expect(svc.formatarPrecoPlano(PLANOS_CARITAS.pro)).toBe('');
      expect(svc.planoContratavel('profissional')).toBe('profissional');
      expect(svc.planoContratavel('clinica')).toBe('basico');
      expect(svc.planoContratavel('pro')).toBe('basico');
      expect(svc.planoContratavel(undefined)).toBe('basico');

      // Pacientes ilimitados: nenhum plano carrega teto de pacientes
      Object.values(PLANOS_CARITAS).forEach((p) => expect(p.maxPacientes).toBeUndefined());
    });
  });

  describe('Conta nova paga antes de usar', () => {
    it('bloqueia perfil pendente de pagamento', () => {
      const res = verificarStatusAssinatura({ plano: 'basico', statusPagamento: 'pendente' });
      expect(res.emDia).toBe(false);
      expect(res.status).toBe('pendente');
    });

    it('isenção do admin vale mesmo para conta pendente', () => {
      expect(verificarStatusAssinatura({ statusPagamento: 'pendente', isIsento: true }).emDia).toBe(true);
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
        trialAte: dataLocalISO(dataFutura),
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
        trialAte: dataLocalISO(dataPassada),
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
        proximoVencimento: dataLocalISO(dataVencidaRecente),
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
        proximoVencimento: dataLocalISO(dataMuitoVencida),
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
        proximoVencimento: dataLocalISO(dataFutura),
      };

      const res = verificarStatusAssinatura(perfilAtivo);
      expect(res.emDia).toBe(true);
      expect(res.status).toBe('ativo');
    });
  });

  describe('Cobrança no servidor (sem ativação no cliente)', () => {
    it('não exporta mais nenhuma função que grava plano ou fatura no cliente', () => {
      expect(svc.cadastrarCartaoEAtivarPlano).toBeUndefined();
      expect(svc.gerarDadosPixMensal).toBeUndefined();
    });

    it('expõe apenas os callables de cobrança', () => {
      expect(typeof svc.iniciarAssinaturaCartao).toBe('function');
      expect(typeof svc.gerarCobrancaPix).toBe('function');
    });

    it('preços do cliente batem com os do servidor (functions/asaas.js)', () => {
      const { PLANOS_COBRANCA } = createRequire(import.meta.url)('../../functions/asaas.js');
      expect(Object.keys(PLANOS_COBRANCA).sort()).toEqual(svc.PLANOS_CONTRATAVEIS.map((p) => p.id).sort());
      svc.PLANOS_CONTRATAVEIS.forEach((p) => {
        expect(PLANOS_COBRANCA[p.id].preco).toBeCloseTo(p.preco, 2);
        expect(PLANOS_COBRANCA[p.id].maxLocais).toBe(p.maxLocais);
      });
    });
  });
});
