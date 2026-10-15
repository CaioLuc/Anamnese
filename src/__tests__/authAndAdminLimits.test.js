import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  isSessaoMfaValida,
  liberarPorDispositivoConfiavel,
  enviarCodigoMfa,
  verificarCodigoMfa,
  redefinirSenhaFirebase
} from '../services/authService';
import {
  salvarClienteClinica,
  listarClientesClinicas,
  atualizarLimitesCliente,
  deletarClienteClinica,
  obterConfigClientePorEmail,
  excluirPerfilPsicologo,
  obterLogsAuditoria
} from '../services/adminService';
import {
  obterLimitePsicologosEquipe
} from '../services/liderService';

const createStorageMock = () => {
  let store = {};
  return {
    getItem: (k) => store[k] || null,
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; },
    clear: () => { store = {}; },
  };
};

if (typeof globalThis.localStorage === 'undefined') {
  globalThis.localStorage = createStorageMock();
}
if (typeof globalThis.sessionStorage === 'undefined') {
  globalThis.sessionStorage = createStorageMock();
}

// Mock logService to avoid Firestore calls in unit tests
vi.mock('../services/logService', () => ({
  trackAction: vi.fn().mockResolvedValue(true),
  obterLogsLocais: vi.fn().mockReturnValue([]),
  limparLogsLocais: vi.fn(),
}));

// Usuário logado falso (o token traz auth_time, como o Firebase real) e respostas das Functions.
// vi.hoisted: os mocks abaixo são içados para o topo e precisam destes objetos prontos.
const { usuario, respostasFunctions, sessaoMfa } = vi.hoisted(() => ({
  usuario: {
    uid: 'test-uid',
    email: 'admin@caritas.com',
    getIdTokenResult: vi.fn().mockResolvedValue({ claims: { auth_time: 1760000000 } }),
    getIdToken: vi.fn().mockResolvedValue('token'),
  },
  respostasFunctions: {},
  sessaoMfa: { doc: null },
}));

vi.mock('../services/firebaseConfig', () => ({
  app: {},
  auth: { currentUser: usuario },
  db: {},
}));

vi.mock('firebase/auth', () => ({
  signInWithEmailAndPassword: vi.fn(),
  createUserWithEmailAndPassword: vi.fn(),
  updateProfile: vi.fn(),
  signOut: vi.fn(),
  onAuthStateChanged: vi.fn(),
  sendPasswordResetEmail: vi.fn().mockResolvedValue(true),
}));

// Cloud Functions do 2FA: cada teste define a resposta
vi.mock('firebase/functions', () => ({
  getFunctions: vi.fn(() => ({})),
  httpsCallable: vi.fn((_fns, nome) => vi.fn(async (dados) => {
    const r = respostasFunctions[nome];
    if (r instanceof Error) throw r;
    return { data: typeof r === 'function' ? r(dados) : r };
  })),
}));

// Mock firestore operations
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  doc: vi.fn((_db, ...caminho) => caminho.join('/')),
  getDocs: vi.fn().mockResolvedValue({ empty: true, docs: [] }),
  getDoc: vi.fn(async (ref) => {
    if (String(ref).startsWith('mfa_sessoes/')) {
      return { exists: () => !!sessaoMfa.doc, data: () => sessaoMfa.doc };
    }
    return { exists: () => false };
  }),
  setDoc: vi.fn().mockResolvedValue(true),
  updateDoc: vi.fn().mockResolvedValue(true),
  deleteDoc: vi.fn().mockResolvedValue(true),
  serverTimestamp: vi.fn(() => new Date().toISOString()),
  query: vi.fn(),
  orderBy: vi.fn(),
  limit: vi.fn(),
  where: vi.fn(),
}));

describe('Verificação em 2 etapas (2FA) validada no servidor', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    sessaoMfa.doc = null;
    Object.keys(respostasFunctions).forEach((k) => delete respostasFunctions[k]);
  });

  it('sessão só vale se o documento do auth_time atual existe e não expirou', async () => {
    expect(await isSessaoMfaValida(usuario)).toBe(false);

    sessaoMfa.doc = { expiraEm: { toMillis: () => Date.now() + 60_000 } };
    expect(await isSessaoMfaValida(usuario)).toBe(true);

    sessaoMfa.doc = { expiraEm: { toMillis: () => Date.now() - 1 } };
    expect(await isSessaoMfaValida(usuario)).toBe(false);
  });

  it('o código nunca volta para o cliente: enviar só informa o e-mail mascarado', async () => {
    respostasFunctions.enviarCodigoMfa = { enviadoPara: 'ad•••@caritas.com', reenviarEmSegundos: 60 };
    const res = await enviarCodigoMfa();
    expect(res).toEqual({ enviadoPara: 'ad•••@caritas.com', reenviarEmSegundos: 60 });
    expect(JSON.stringify(res)).not.toMatch(/\d{6}/);
  });

  it('código errado propaga a mensagem do servidor e não confia no dispositivo', async () => {
    respostasFunctions.verificarCodigoMfa = Object.assign(new Error('Código incorreto. 4 tentativa(s) restante(s).'), { code: 'functions/invalid-argument' });
    await expect(verificarCodigoMfa('000000', true)).rejects.toThrow('Código incorreto');
    expect(localStorage.getItem('caritas_dispositivo_mfa_test-uid')).toBeNull();
  });

  it('código certo com "lembrar" guarda só o token opaco do servidor', async () => {
    respostasFunctions.verificarCodigoMfa = { ok: true, tokenDispositivo: 'tok-opaco-123' };
    await expect(verificarCodigoMfa('123456', true)).resolves.toBe(true);
    expect(localStorage.getItem('caritas_dispositivo_mfa_test-uid')).toBe('tok-opaco-123');
    expect(usuario.getIdToken).toHaveBeenCalledWith(true);
  });

  it('dispositivo confiável recusado pelo servidor é esquecido', async () => {
    expect(await liberarPorDispositivoConfiavel(usuario)).toBe(false);

    localStorage.setItem('caritas_dispositivo_mfa_test-uid', 'tok-expirado');
    respostasFunctions.validarDispositivoMfa = { ok: false };
    expect(await liberarPorDispositivoConfiavel(usuario)).toBe(false);
    expect(localStorage.getItem('caritas_dispositivo_mfa_test-uid')).toBeNull();

    localStorage.setItem('caritas_dispositivo_mfa_test-uid', 'tok-valido');
    respostasFunctions.validarDispositivoMfa = ({ token }) => ({ ok: token === 'tok-valido' });
    expect(await liberarPorDispositivoConfiavel(usuario)).toBe(true);
  });

  it('deve validar que redefinirSenhaFirebase exige e-mail válido', async () => {
    await expect(redefinirSenhaFirebase('')).rejects.toThrow('Informe o endereço de e-mail.');
    await expect(redefinirSenhaFirebase('psicologo.teste@caritas.com')).resolves.toBe(true);
  });
});

describe('Gestão de Clientes / Clínicas e Limites de Líder no Super Admin', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('deve cadastrar cliente/clínica com líder clínico e limites customizados', async () => {
    const novoCliente = {
      nomeClinica: 'Clínica Humanizar',
      emailLider: 'lider.humanizar@clinica.com',
      maxPsicologos: 12,
      maxPacientesPorPsicologo: 35,
      psicologos: ['psi1@humanizar.com', 'psi2@humanizar.com'],
      status: 'ativo',
    };

    const salvo = await salvarClienteClinica(novoCliente);
    expect(salvo.id).toBeDefined();
    expect(salvo.emailLider).toBe('lider.humanizar@clinica.com');
    expect(salvo.maxPsicologos).toBe(12);
    expect(salvo.maxPacientesPorPsicologo).toBe(35);

    const lista = await listarClientesClinicas();
    expect(lista.some(c => c.emailLider === 'lider.humanizar@clinica.com')).toBe(true);
  });

  it('deve identificar permissão de líder clínico pelo e-mail configurado', () => {
    const cliente = {
      id: 'cli-teste-1',
      nomeClinica: 'Espaço Renovar',
      emailLider: 'lider.renovar@clinica.com',
      maxPsicologos: 10,
      maxPacientesPorPsicologo: 25,
      psicologos: ['membro1@renovar.com'],
      status: 'ativo',
    };
    salvarClienteClinica(cliente);

    const configLider = obterConfigClientePorEmail('lider.renovar@clinica.com');
    expect(configLider).not.toBeNull();
    expect(configLider.isLider).toBe(true);
    expect(configLider.maxPsicologos).toBe(10);
    expect(configLider.maxPacientesPorPsicologo).toBe(25);

    const configMembro = obterConfigClientePorEmail('membro1@renovar.com');
    expect(configMembro).not.toBeNull();
    expect(configMembro.isLider).toBe(false);
  });

  it('deve refletir limites dinâmicos no liderService para psicólogo e líder', () => {
    // Sem cliente configurado -> fallback padrão (8 psicólogos; pacientes são ilimitados)
    expect(obterLimitePsicologosEquipe('avulso@email.com')).toBe(8);

    // Com cliente configurado
    salvarClienteClinica({
      id: 'cli-vip',
      nomeClinica: 'Clínica VIP',
      emailLider: 'vip.lider@clinica.com',
      maxPsicologos: 15,
      maxPacientesPorPsicologo: 40,
      psicologos: ['vip.psi@clinica.com'],
    });

    expect(obterLimitePsicologosEquipe('vip.lider@clinica.com')).toBe(15);
  });

  it('deve permitir atualizar e excluir cliente/clínica', async () => {
    await salvarClienteClinica({
      id: 'cli-temp',
      nomeClinica: 'Temp Clinic',
      emailLider: 'temp@lider.com',
      maxPsicologos: 5,
      maxPacientesPorPsicologo: 15,
    });

    await atualizarLimitesCliente('cli-temp', { maxPsicologos: 7, maxPacientesPorPsicologo: 22 });
    const atualizado = obterConfigClientePorEmail('temp@lider.com');
    expect(atualizado.maxPsicologos).toBe(7);
    expect(atualizado.maxPacientesPorPsicologo).toBe(22);

    await deletarClienteClinica('cli-temp');
    expect(obterConfigClientePorEmail('temp@lider.com')).toBeNull();
  });

  it('deve permitir excluir perfil de psicólogo com log de auditoria CFP/LGPD', async () => {
    const res = await excluirPerfilPsicologo('psi-excluir-123', 'psi.excluir@caritas.app');
    expect(res).toBe(true);
  });

  it('deve obter logs de auditoria e suportar fallback resiliente', async () => {
    const logs = await obterLogsAuditoria(100);
    expect(Array.isArray(logs)).toBe(true);
  });
});

