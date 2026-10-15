// Utilitários compartilhados pelos testes que rodam contra o Firebase Emulator Suite.
// As variáveis de ambiente são definidas por `firebase emulators:exec`; os padrões batem com firebase.json.
import { readFileSync } from 'node:fs'
import { initializeTestEnvironment } from '@firebase/rules-unit-testing'

export const PROJETO = process.env.GCLOUD_PROJECT || 'demo-caritas'
const AUTH_HOST = process.env.FIREBASE_AUTH_EMULATOR_HOST || '127.0.0.1:9099'
const FIRESTORE_HOST = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080'
const FUNCTIONS_HOST = process.env.FUNCTIONS_EMULATOR_HOST || '127.0.0.1:5001'
const REGIAO = 'southamerica-east1'

export function criarAmbiente() {
  const [host, port] = FIRESTORE_HOST.split(':')
  return initializeTestEnvironment({
    projectId: PROJETO,
    firestore: { rules: readFileSync('firestore.rules', 'utf8'), host, port: Number(port) },
  })
}

export async function limparAuth() {
  await fetch(`http://${AUTH_HOST}/emulator/v1/projects/${PROJETO}/accounts`, { method: 'DELETE' })
}

async function identityToolkit(acao, corpo) {
  const res = await fetch(`http://${AUTH_HOST}/identitytoolkit.googleapis.com/v1/accounts:${acao}?key=chave-falsa`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...corpo, returnSecureToken: true }),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(`Auth emulator ${acao}: ${JSON.stringify(json)}`)
  return { uid: json.localId, idToken: json.idToken }
}

export const cadastrar = (email, senha = 'senha-teste-123') => identityToolkit('signUp', { email, password: senha })
export const entrar = (email, senha = 'senha-teste-123') => identityToolkit('signInWithPassword', { email, password: senha })

export function claims(idToken) {
  return JSON.parse(Buffer.from(idToken.split('.')[1], 'base64url').toString())
}

// Protocolo de callable (onCall): { data } → { result } ou { error: { status, message } }
export async function chamar(nome, idToken, data = {}) {
  const res = await fetch(`http://${FUNCTIONS_HOST}/${PROJETO}/${REGIAO}/${nome}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
    body: JSON.stringify({ data }),
  })
  return res.json()
}

// Leitura REST no Firestore emulator com o ID token real do Auth emulator: as regras são avaliadas
// com o mesmo request.auth.token que o app enviaria.
export async function lerComToken(caminho, idToken) {
  const res = await fetch(`http://${FIRESTORE_HOST}/v1/projects/${PROJETO}/databases/(default)/documents/${caminho}`, {
    headers: { Authorization: `Bearer ${idToken}` },
  })
  return res.status
}
