import { describe, it, expect, vi } from 'vitest';
import { createRequire } from 'module';

// functions/ é CommonJS: carregado via require
const require = createRequire(import.meta.url);
const { tratarWebhookAsaas, montarReferencia, PLANOS_COBRANCA } = require('../../functions/asaas.js');

const TOKEN = 'token-secreto-de-teste-123';
const UID = 'psi-123';

function criarDependencias({ pagamento, assinatura, aplicado = 'aplicado' } = {}) {
  return {
    consultarPagamento: vi.fn(async () => pagamento),
    consultarAssinatura: vi.fn(async () => assinatura),
    aplicarEvento: vi.fn(async () => aplicado),
    registrarErro: vi.fn(),
  };
}

const pagamentoBase = {
  id: 'pay_1',
  status: 'CONFIRMED',
  value: PLANOS_COBRANCA.profissional.preco,
  externalReference: montarReferencia(UID, 'profissional'),
  billingType: 'PIX',
  paymentDate: '2026-10-15',
};

const headersOk = { 'asaas-access-token': TOKEN };

describe('webhook Asaas (tratarWebhookAsaas)', () => {
  it('rejeita requisição sem token correto (401) e não consulta nada', async () => {
    const dep = criarDependencias({ pagamento: pagamentoBase });
    const res = await tratarWebhookAsaas({
      headers: { 'asaas-access-token': 'errado' },
      corpo: { event: 'PAYMENT_CONFIRMED', payment: { id: 'pay_1' } },
      tokenEsperado: TOKEN,
      dependencias: dep,
    });
    expect(res.status).toBe(401);
    expect(dep.consultarPagamento).not.toHaveBeenCalled();
    expect(dep.aplicarEvento).not.toHaveBeenCalled();
  });

  it('rejeita requisição sem header de token', async () => {
    const res = await tratarWebhookAsaas({
      headers: {},
      corpo: {},
      tokenEsperado: TOKEN,
      dependencias: criarDependencias(),
    });
    expect(res.status).toBe(401);
  });

  it('pagamento confirmado ativa o plano do pagamento confirmado na API', async () => {
    const dep = criarDependencias({ pagamento: pagamentoBase });
    const res = await tratarWebhookAsaas({
      headers: headersOk,
      corpo: { event: 'PAYMENT_CONFIRMED', payment: { id: 'pay_1', status: 'PENDING' } },
      tokenEsperado: TOKEN,
      dependencias: dep,
    });
    expect(res.status).toBe(200);
    expect(dep.consultarPagamento).toHaveBeenCalledWith('pay_1');
    expect(dep.aplicarEvento).toHaveBeenCalledWith(expect.objectContaining({
      eventoId: 'PAYMENT_CONFIRMED_pay_1',
      uid: UID,
      status: 'ativo',
      planoId: 'profissional',
      fatura: expect.objectContaining({ id: 'pay_1', valor: PLANOS_COBRANCA.profissional.preco, status: 'PAGO' }),
    }));
  });

  it('PAYMENT_RECEIVED também ativa (cartão recorrente)', async () => {
    const dep = criarDependencias({ pagamento: { ...pagamentoBase, status: 'RECEIVED', billingType: 'CREDIT_CARD' } });
    await tratarWebhookAsaas({
      headers: headersOk,
      corpo: { event: 'PAYMENT_RECEIVED', payment: { id: 'pay_1' } },
      tokenEsperado: TOKEN,
      dependencias: dep,
    });
    expect(dep.aplicarEvento).toHaveBeenCalledWith(expect.objectContaining({ status: 'ativo' }));
  });

  it('pagamento vencido marca inadimplente sem mudar o plano', async () => {
    const dep = criarDependencias({ pagamento: { ...pagamentoBase, status: 'OVERDUE' } });
    await tratarWebhookAsaas({
      headers: headersOk,
      corpo: { event: 'PAYMENT_OVERDUE', payment: { id: 'pay_1' } },
      tokenEsperado: TOKEN,
      dependencias: dep,
    });
    expect(dep.aplicarEvento).toHaveBeenCalledWith(expect.objectContaining({ status: 'inadimplente', eventoId: 'PAYMENT_OVERDUE_pay_1' }));
  });

  it('não ativa se a API diz que o pagamento ainda não foi confirmado', async () => {
    const dep = criarDependencias({ pagamento: { ...pagamentoBase, status: 'PENDING' } });
    const res = await tratarWebhookAsaas({
      headers: headersOk,
      corpo: { event: 'PAYMENT_CONFIRMED', payment: { id: 'pay_1' } },
      tokenEsperado: TOKEN,
      dependencias: dep,
    });
    expect(res.status).toBe(200);
    expect(dep.aplicarEvento).not.toHaveBeenCalled();
  });

  it('não ativa se o valor divergir do preço do plano', async () => {
    const dep = criarDependencias({ pagamento: { ...pagamentoBase, value: 0.5 } });
    await tratarWebhookAsaas({
      headers: headersOk,
      corpo: { event: 'PAYMENT_CONFIRMED', payment: { id: 'pay_1' } },
      tokenEsperado: TOKEN,
      dependencias: dep,
    });
    expect(dep.aplicarEvento).not.toHaveBeenCalled();
    expect(dep.registrarErro).toHaveBeenCalled();
  });

  it('não ativa pagamento sem referência válida (plano inexistente)', async () => {
    const dep = criarDependencias({ pagamento: { ...pagamentoBase, externalReference: `${UID}|plano-falso` } });
    await tratarWebhookAsaas({
      headers: headersOk,
      corpo: { event: 'PAYMENT_CONFIRMED', payment: { id: 'pay_1' } },
      tokenEsperado: TOKEN,
      dependencias: dep,
    });
    expect(dep.aplicarEvento).not.toHaveBeenCalled();
  });

  it('assinatura cancelada (SUBSCRIPTION_DELETED) marca cancelado', async () => {
    const dep = criarDependencias({
      assinatura: { id: 'sub_1', status: 'INACTIVE', externalReference: montarReferencia(UID, 'basico') },
    });
    await tratarWebhookAsaas({
      headers: headersOk,
      corpo: { event: 'SUBSCRIPTION_DELETED', subscription: { id: 'sub_1' } },
      tokenEsperado: TOKEN,
      dependencias: dep,
    });
    expect(dep.consultarAssinatura).toHaveBeenCalledWith('sub_1');
    expect(dep.aplicarEvento).toHaveBeenCalledWith(expect.objectContaining({
      eventoId: 'SUBSCRIPTION_DELETED_sub_1',
      uid: UID,
      status: 'cancelado',
      assinaturaCancelada: 'sub_1',
    }));
  });

  it('assinatura ainda ACTIVE não é cancelada', async () => {
    const dep = criarDependencias({
      assinatura: { id: 'sub_1', status: 'ACTIVE', externalReference: montarReferencia(UID, 'basico') },
    });
    await tratarWebhookAsaas({
      headers: headersOk,
      corpo: { event: 'SUBSCRIPTION_DELETED', subscription: { id: 'sub_1' } },
      tokenEsperado: TOKEN,
      dependencias: dep,
    });
    expect(dep.aplicarEvento).not.toHaveBeenCalled();
  });

  it('evento duplicado (retry do Asaas) não altera nada e responde 200', async () => {
    const dep = criarDependencias({ pagamento: pagamentoBase, aplicado: 'duplicado' });
    const res = await tratarWebhookAsaas({
      headers: headersOk,
      corpo: { event: 'PAYMENT_CONFIRMED', payment: { id: 'pay_1' } },
      tokenEsperado: TOKEN,
      dependencias: dep,
    });
    expect(res).toEqual({ status: 200, mensagem: 'duplicado' });
  });

  it('evento sem efeito no acesso é ignorado com 200', async () => {
    const dep = criarDependencias();
    const res = await tratarWebhookAsaas({
      headers: headersOk,
      corpo: { event: 'PAYMENT_CREATED', payment: { id: 'pay_9' } },
      tokenEsperado: TOKEN,
      dependencias: dep,
    });
    expect(res.status).toBe(200);
    expect(dep.consultarPagamento).not.toHaveBeenCalled();
    expect(dep.aplicarEvento).not.toHaveBeenCalled();
  });
});
