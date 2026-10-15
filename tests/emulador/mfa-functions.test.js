// Testes das Cloud Functions de 2FA (functions/index.js) no Functions + Auth + Firestore emulator.
// Usam ID tokens reais do Auth emulator: provam que auth_time chega às regras e que o id
// `${uid}_${auth_time}` gravado pela Function é o mesmo que mfaOk() procura.
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { cadastrar, chamar, claims, criarAmbiente, entrar, lerComToken, limparAuth } from './emulador.js'

let amb

async function admin(fn) {
  let resultado
  await amb.withSecurityRulesDisabled(async (ctx) => { resultado = await fn(ctx.firestore()) })
  return resultado
}

// O código só existe no e-mail enfileirado para a extensão Trigger Email
async function ultimoCodigo(email) {
  const snap = await admin((db) => db.collection('mail').where('to', '==', email).get())
  const textos = snap.docs.map((d) => d.data().message.text)
  return textos.at(-1).match(/é (\d{6})/)[1]
}

const codigoErrado = (codigo) => String((Number(codigo) + 1) % 1_000_000).padStart(6, '0')

beforeAll(async () => {
  amb = await criarAmbiente()
})

afterAll(async () => {
  await amb?.cleanup()
})

beforeEach(async () => {
  await amb.clearFirestore()
  await limparAuth()
})

describe('fluxo completo com token real', () => {
  it('auth_time existe no token, a sessão usa o mesmo id e libera psicologos/{uid}', async () => {
    const email = 'fluxo@teste.com'
    const { uid, idToken } = await cadastrar(email)
    const authTime = claims(idToken).auth_time
    expect(typeof authTime).toBe('number')
    await admin((db) => db.doc(`psicologos/${uid}`).set({ nome: 'Fluxo' }))

    expect(await lerComToken(`psicologos/${uid}`, idToken)).toBe(403)

    const envio = await chamar('enviarCodigoMfa', idToken)
    expect(envio.result.reenviarEmSegundos).toBe(60)
    const verificacao = await chamar('verificarCodigoMfa', idToken, { codigo: await ultimoCodigo(email) })
    expect(verificacao.result.ok).toBe(true)

    const sessao = await admin((db) => db.doc(`mfa_sessoes/${uid}_${authTime}`).get())
    expect(sessao.exists).toBe(true)
    expect(await lerComToken(`mfa_sessoes/${uid}_${authTime}`, idToken)).toBe(200)
    expect(await lerComToken(`psicologos/${uid}`, idToken)).toBe(200)
  })

  it('código usado não vale de novo', async () => {
    const email = 'reuso@teste.com'
    const { idToken } = await cadastrar(email)
    await chamar('enviarCodigoMfa', idToken)
    const codigo = await ultimoCodigo(email)
    expect((await chamar('verificarCodigoMfa', idToken, { codigo })).result.ok).toBe(true)
    expect((await chamar('verificarCodigoMfa', idToken, { codigo })).error.status).toBe('FAILED_PRECONDITION')
  })

  it('sem login a Function recusa', async () => {
    const res = await chamar('enviarCodigoMfa', 'token-invalido')
    expect(res.error.status).toBe('UNAUTHENTICATED')
  })
})

describe('verificarCodigoMfa', () => {
  it('5 tentativas erradas invalidam o código', async () => {
    const email = 'tentativas@teste.com'
    const { uid, idToken } = await cadastrar(email)
    await chamar('enviarCodigoMfa', idToken)
    const codigo = await ultimoCodigo(email)

    for (let restantes = 4; restantes >= 1; restantes--) {
      const res = await chamar('verificarCodigoMfa', idToken, { codigo: codigoErrado(codigo) })
      expect(res.error.status).toBe('INVALID_ARGUMENT')
      expect(res.error.message).toContain(`${restantes} tentativa(s)`)
    }
    const quinta = await chamar('verificarCodigoMfa', idToken, { codigo: codigoErrado(codigo) })
    expect(quinta.error.status).toBe('RESOURCE_EXHAUSTED')

    const depois = await chamar('verificarCodigoMfa', idToken, { codigo })
    expect(depois.error.status).toBe('FAILED_PRECONDITION')
    const sessoes = await admin((db) => db.collection('mfa_sessoes').where('uid', '==', uid).get())
    expect(sessoes.empty).toBe(true)
  })

  it('código expira em 10 minutos', async () => {
    const email = 'expira@teste.com'
    const { uid, idToken } = await cadastrar(email)
    const antes = Date.now()
    await chamar('enviarCodigoMfa', idToken)
    const codigo = await ultimoCodigo(email)

    const { expiraEm, hash } = (await admin((db) => db.doc(`mfa_codigos/${uid}`).get())).data()
    expect(expiraEm - antes).toBeGreaterThanOrEqual(10 * 60 * 1000)
    expect(expiraEm - antes).toBeLessThan(10 * 60 * 1000 + 15_000)
    // Guarda só o hash, nunca o código
    expect(hash).not.toContain(codigo)

    await admin((db) => db.doc(`mfa_codigos/${uid}`).update({ expiraEm: Date.now() - 1 }))
    const res = await chamar('verificarCodigoMfa', idToken, { codigo })
    expect(res.error.status).toBe('FAILED_PRECONDITION')
  })

  it('rejeita código fora do formato sem gastar tentativa', async () => {
    const email = 'formato@teste.com'
    const { uid, idToken } = await cadastrar(email)
    await chamar('enviarCodigoMfa', idToken)
    expect((await chamar('verificarCodigoMfa', idToken, { codigo: '123' })).error.status).toBe('INVALID_ARGUMENT')
    const { tentativas } = (await admin((db) => db.doc(`mfa_codigos/${uid}`).get())).data()
    expect(tentativas).toBe(0)
  })
})

describe('enviarCodigoMfa', () => {
  it('reenvio respeita 60 s', async () => {
    const email = 'reenvio@teste.com'
    const { uid, idToken } = await cadastrar(email)
    expect((await chamar('enviarCodigoMfa', idToken)).result).toBeTruthy()

    const cedo = await chamar('enviarCodigoMfa', idToken)
    expect(cedo.error.status).toBe('RESOURCE_EXHAUSTED')
    expect(cedo.error.message).toMatch(/Aguarde \d+s/)

    // Simula 61 s depois do último envio
    await admin((db) => db.doc(`mfa_codigos/${uid}`).update({ envios: [Date.now() - 61_000] }))
    expect((await chamar('enviarCodigoMfa', idToken)).result).toBeTruthy()
    const emails = await admin((db) => db.collection('mail').where('to', '==', email).get())
    expect(emails.size).toBe(2)
  })
})

describe('validarDispositivoMfa', () => {
  it('dispositivo lembrado libera o próximo login só para o mesmo usuário', async () => {
    const email = 'dispositivo@teste.com'
    const { idToken } = await cadastrar(email)
    await chamar('enviarCodigoMfa', idToken)
    const { result } = await chamar('verificarCodigoMfa', idToken, { codigo: await ultimoCodigo(email), lembrar: true })
    expect(result.tokenDispositivo).toBeTruthy()

    // Novo login = novo auth_time (granularidade de 1 s)
    await new Promise((r) => setTimeout(r, 1100))
    const novo = await entrar(email)
    const authTime = claims(novo.idToken).auth_time
    expect(authTime).toBeGreaterThan(claims(idToken).auth_time)
    expect(await lerComToken(`psicologos/${novo.uid}`, novo.idToken)).toBe(403)

    expect((await chamar('validarDispositivoMfa', novo.idToken, { token: 'falso' })).result.ok).toBe(false)
    expect((await chamar('validarDispositivoMfa', novo.idToken, { token: result.tokenDispositivo })).result.ok).toBe(true)
    await admin((db) => db.doc(`psicologos/${novo.uid}`).set({ nome: 'D' }))
    expect(await lerComToken(`psicologos/${novo.uid}`, novo.idToken)).toBe(200)

    const intruso = await cadastrar('intruso@teste.com')
    expect((await chamar('validarDispositivoMfa', intruso.idToken, { token: result.tokenDispositivo })).result.ok).toBe(false)
  })
})
