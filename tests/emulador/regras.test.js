// Testes de firestore.rules no Firestore emulator (npm run test:rules).
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest'
import { assertFails, assertSucceeds } from '@firebase/rules-unit-testing'
import { criarAmbiente } from './emulador.js'

const AUTH_TIME = 1760500000
const DONO = 'psi-dono'
const OUTRO = 'psi-outro'
const EMAIL_BOOTSTRAP = '241.14.035@uniriosead.com'

let amb

// Contexto autenticado com as claims que o ID token real traz (auth_time em segundos)
const comoUsuario = (uid, extra = {}) =>
  amb.authenticatedContext(uid, { auth_time: AUTH_TIME, email: `${uid}@teste.com`, email_verified: false, ...extra }).firestore()
const anonimo = () => amb.unauthenticatedContext().firestore()

async function semRegras(fn) {
  await amb.withSecurityRulesDisabled((ctx) => fn(ctx.firestore()))
}

// Mesmo formato gravado por liberarSessao() em functions/index.js
async function liberarMfa(uid, { authTime = AUTH_TIME, expiraEm = new Date(Date.now() + 3600_000) } = {}) {
  await semRegras((db) => db.doc(`mfa_sessoes/${uid}_${authTime}`).set({ uid, authTime, expiraEm }))
}

beforeAll(async () => {
  amb = await criarAmbiente()
})

afterAll(async () => {
  await amb?.cleanup()
})

beforeEach(async () => {
  await amb.clearFirestore()
  await semRegras(async (db) => {
    await db.doc(`psicologos/${DONO}`).set({ nome: 'Dona', plano: 'basico', statusPagamento: 'trial' })
    await db.doc(`psicologos/${DONO}/pacientes/p1`).set({ nome: 'Paciente' })
    await db.doc(`psicologos/${OUTRO}`).set({ nome: 'Outro', plano: 'basico' })
  })
})

describe('2FA no servidor (mfaOk)', () => {
  it('sem documento mfa_sessoes nega leitura e escrita em psicologos/{uid}/**', async () => {
    const db = comoUsuario(DONO)
    await assertFails(db.doc(`psicologos/${DONO}`).get())
    await assertFails(db.doc(`psicologos/${DONO}/pacientes/p1`).get())
    await assertFails(db.doc(`psicologos/${DONO}/pacientes/p2`).set({ nome: 'Novo' }))
    await assertFails(db.doc(`psicologos/${DONO}/pacientes/p1/sessoes/s1`).set({ texto: 'x' }))
  })

  it('com sessão do auth_time atual permite leitura e escrita', async () => {
    await liberarMfa(DONO)
    const db = comoUsuario(DONO)
    await assertSucceeds(db.doc(`psicologos/${DONO}`).get())
    await assertSucceeds(db.doc(`psicologos/${DONO}/pacientes/p1`).get())
    await assertSucceeds(db.doc(`psicologos/${DONO}/pacientes/p2`).set({ nome: 'Novo' }))
    await assertSucceeds(db.doc(`psicologos/${DONO}/pacientes/p1/anamneses/a1`).set({ queixa: 'x' }))
  })

  it('sessão de outro login (auth_time diferente) não vale', async () => {
    await liberarMfa(DONO, { authTime: AUTH_TIME - 1 })
    await assertFails(comoUsuario(DONO).doc(`psicologos/${DONO}`).get())
  })

  it('sessão expirada não vale', async () => {
    await liberarMfa(DONO, { expiraEm: new Date(Date.now() - 1000) })
    await assertFails(comoUsuario(DONO).doc(`psicologos/${DONO}`).get())
  })

  it('2FA válido não abre dados de outro psicólogo', async () => {
    await liberarMfa(DONO)
    await assertFails(comoUsuario(DONO).doc(`psicologos/${OUTRO}`).get())
  })

  it('mfa_sessoes: só lê a própria sessão atual e nunca escreve', async () => {
    await liberarMfa(DONO)
    await liberarMfa(OUTRO)
    const db = comoUsuario(DONO)
    await assertSucceeds(db.doc(`mfa_sessoes/${DONO}_${AUTH_TIME}`).get())
    await assertFails(db.doc(`mfa_sessoes/${OUTRO}_${AUTH_TIME}`).get())
    await assertFails(db.doc(`mfa_sessoes/${DONO}_${AUTH_TIME + 1}`).set({ expiraEm: new Date(Date.now() + 3600_000) }))
    await assertFails(db.collection('mfa_sessoes').get())
    await assertFails(db.doc(`mfa_codigos/${DONO}`).get())
  })
})

describe('admins', () => {
  it('e-mail bootstrap verificado e com 2FA cria o próprio admin', async () => {
    await liberarMfa(DONO)
    const db = comoUsuario(DONO, { email: EMAIL_BOOTSTRAP, email_verified: true })
    await assertSucceeds(db.doc(`admins/${DONO}`).set({ criadoEm: new Date() }))
  })

  it('e-mail bootstrap sem email_verified é negado', async () => {
    await liberarMfa(DONO)
    await assertFails(comoUsuario(DONO, { email: EMAIL_BOOTSTRAP }).doc(`admins/${DONO}`).set({}))
  })

  it('outro e-mail, sem 2FA ou para outro uid é negado', async () => {
    await liberarMfa(DONO)
    await assertFails(comoUsuario(DONO, { email_verified: true }).doc(`admins/${DONO}`).set({}))
    await assertFails(comoUsuario(DONO, { email: EMAIL_BOOTSTRAP, email_verified: true }).doc(`admins/${OUTRO}`).set({}))
    await amb.clearFirestore()
    await assertFails(comoUsuario(DONO, { email: EMAIL_BOOTSTRAP, email_verified: true }).doc(`admins/${DONO}`).set({}))
  })

  it('admin não é alterado nem removido pelo cliente', async () => {
    await liberarMfa(DONO)
    await semRegras((db) => db.doc(`admins/${DONO}`).set({ ok: true }))
    const db = comoUsuario(DONO, { email: EMAIL_BOOTSTRAP, email_verified: true })
    await assertFails(db.doc(`admins/${DONO}`).update({ ok: false }))
    await assertFails(db.doc(`admins/${DONO}`).delete())
  })
})

describe('slugs', () => {
  it('leitura pública', async () => {
    await semRegras((db) => db.doc('slugs/dra-ana').set({ uid: DONO }))
    await assertSucceeds(anonimo().doc('slugs/dra-ana').get())
  })

  it('dono com 2FA cria slug para o próprio uid; para outro uid ou sem 2FA é negado', async () => {
    await assertFails(comoUsuario(DONO).doc('slugs/dra-ana').set({ uid: DONO }))
    await liberarMfa(DONO)
    const db = comoUsuario(DONO)
    await assertFails(db.doc('slugs/dra-ana').set({ uid: OUTRO }))
    await assertSucceeds(db.doc('slugs/dra-ana').set({ uid: DONO }))
  })

  it('só o dono atualiza ou apaga, e não transfere para outro uid', async () => {
    await semRegras((db) => db.doc('slugs/dra-ana').set({ uid: DONO }))
    await liberarMfa(DONO)
    await liberarMfa(OUTRO)
    const intruso = comoUsuario(OUTRO)
    await assertFails(intruso.doc('slugs/dra-ana').set({ uid: OUTRO }))
    await assertFails(intruso.doc('slugs/dra-ana').delete())
    const dono = comoUsuario(DONO)
    await assertFails(dono.doc('slugs/dra-ana').update({ uid: OUTRO }))
    await assertSucceeds(dono.doc('slugs/dra-ana').update({ uid: DONO, atualizado: true }))
    await assertSucceeds(dono.doc('slugs/dra-ana').delete())
  })
})

describe('agendamento público', () => {
  const valido = {
    data: '2026-10-20',
    hora: '14:00',
    nome_paciente: 'Maria',
    telefone_paciente: '(21) 99999-0000',
    status: 'pendente',
    origem: 'publico',
  }
  const espelho = { data: '2026-10-20', hora: '14:00', duracao_min: 50, status: 'pendente' }

  // Mesmo padrão de criarAgendamentoPublico(): agendamento + espelho no mesmo batch
  function batchPublico(agendamento, slot, id = 'ag1') {
    const db = anonimo()
    const batch = db.batch()
    batch.set(db.doc(`psicologos/${DONO}/agendamentos/${id}`), agendamento)
    if (slot) batch.set(db.doc(`psicologos/${DONO}/horarios_ocupados/${id}`), slot)
    return batch.commit()
  }

  it('aceita o formato da página de agendamento com espelho igual', async () => {
    await assertSucceeds(batchPublico(valido, espelho))
  })

  it('rejeita formato inválido', async () => {
    await assertFails(batchPublico({ ...valido, data: '20/10/2026' }, null))
    await assertFails(batchPublico({ ...valido, hora: '14h' }, null))
    await assertFails(batchPublico({ ...valido, status: 'confirmado' }, null))
    await assertFails(batchPublico({ ...valido, origem: 'painel' }, null))
    await assertFails(batchPublico({ ...valido, id_paciente: 'p1' }, null))
    await assertFails(batchPublico({ ...valido, nome_paciente: 'x'.repeat(121) }, null))
    await assertFails(batchPublico({ ...valido, observacoes: 'x'.repeat(501) }, null))
  })

  it('espelho precisa bater data e hora do agendamento (getAfter)', async () => {
    await assertFails(batchPublico(valido, { ...espelho, hora: '15:00' }))
    await assertFails(batchPublico(valido, { ...espelho, data: '2026-10-21' }))
    await assertFails(batchPublico(valido, { ...espelho, nome_paciente: 'Maria' }))
    await assertFails(batchPublico(valido, { ...espelho, status: 'confirmado' }))
  })

  it('espelho sem agendamento é negado', async () => {
    await assertFails(anonimo().doc(`psicologos/${DONO}/horarios_ocupados/solto`).set(espelho))
  })

  it('público não lê agendamentos, mas lê horários ocupados', async () => {
    await semRegras(async (db) => {
      await db.doc(`psicologos/${DONO}/agendamentos/ag1`).set(valido)
      await db.doc(`psicologos/${DONO}/horarios_ocupados/ag1`).set(espelho)
    })
    await assertFails(anonimo().doc(`psicologos/${DONO}/agendamentos/ag1`).get())
    await assertSucceeds(anonimo().doc(`psicologos/${DONO}/horarios_ocupados/ag1`).get())
  })
})

describe('action_logs (append-only)', () => {
  const log = (uid) => ({ psicologoId: uid, actionType: 'LOGIN', metadata: {}, createdAt: new Date() })

  it('cria o próprio log mesmo antes do 2FA', async () => {
    await assertSucceeds(comoUsuario(DONO).collection('action_logs').add(log(DONO)))
  })

  it('nega log em nome de outro, campo extra ou sem login', async () => {
    await assertFails(comoUsuario(DONO).collection('action_logs').add(log(OUTRO)))
    await assertFails(comoUsuario(DONO).collection('action_logs').add({ ...log(DONO), ip: '1.2.3.4' }))
    await assertFails(anonimo().collection('action_logs').add(log(DONO)))
  })

  it('nega update e delete, mesmo do autor com 2FA', async () => {
    await semRegras((db) => db.doc('action_logs/l1').set(log(DONO)))
    await liberarMfa(DONO)
    const db = comoUsuario(DONO)
    await assertFails(db.doc('action_logs/l1').update({ actionType: 'EDITADO' }))
    await assertFails(db.doc('action_logs/l1').delete())
  })
})

describe('perfil e cobrança (psicologos/{uid})', () => {
  it('dono cria perfil só pendente de pagamento, no plano básico', async () => {
    await liberarMfa('psi-novo')
    const db = comoUsuario('psi-novo')
    await assertFails(db.doc('psicologos/psi-novo').set({ nome: 'N', plano: 'profissional', statusPagamento: 'pendente' }))
    await assertFails(db.doc('psicologos/psi-novo').set({ nome: 'N', statusPagamento: 'ativo' }))
    await assertFails(db.doc('psicologos/psi-novo').set({ nome: 'N', statusPagamento: 'trial' }))
    // Sem status o paywall liberaria o acesso
    await assertFails(db.doc('psicologos/psi-novo').set({ nome: 'N', plano: 'basico' }))
    await assertFails(db.doc('psicologos/psi-novo').set({ nome: 'N', statusPagamento: 'pendente', trialAte: '2099-01-01' }))
    await assertFails(db.doc('psicologos/psi-novo').set({ nome: 'N', statusPagamento: 'pendente', isIsento: false }))
    await assertSucceeds(db.doc('psicologos/psi-novo').set({ nome: 'N', plano: 'basico', statusPagamento: 'pendente', max_locais: 1, ativo: true }))
  })

  it('dono edita cadastro, mas não plano, pagamento nem apaga o perfil', async () => {
    await liberarMfa(DONO)
    const db = comoUsuario(DONO)
    await assertSucceeds(db.doc(`psicologos/${DONO}`).update({ nome: 'Dona Ana' }))
    await assertFails(db.doc(`psicologos/${DONO}`).update({ plano: 'profissional' }))
    await assertFails(db.doc(`psicologos/${DONO}`).update({ statusPagamento: 'ativo' }))
    await assertFails(db.doc(`psicologos/${DONO}`).delete())
  })
})
