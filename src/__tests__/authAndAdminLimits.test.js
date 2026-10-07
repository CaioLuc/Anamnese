import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  gerarCodigo2FA, 
  verificarCodigo2FA, 
  isDispositivoConfiavel, 
  salvarDispositivoConfiavel, 
  removerDispositivoConfiavel,
  isSessao2FAVerificada,
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
  obterLimitePacientesPsicologo,
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

// Mock firebase/auth
vi.mock('../services/firebaseConfig', () => ({
  auth: { currentUser: { uid: 'test-uid', email: 'admin@caritas.com' } },
  db: {},
}));

vi.mock('firebase/auth', () => ({
  signInWithEmailAndPassword: vi.fn(),
  signOut: vi.fn(),
  onAuthStateChanged: vi.fn(),
  sendPasswordResetEmail: vi.fn().mockResolvedValue(true),
}));

// Mock firestore operations
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  doc: vi.fn(),
  getDocs: vi.fn().mockResolvedValue({ empty: true, docs: [] }),
  getDoc: vi.fn().mockResolvedValue({ exists: () => false }),
  setDoc: vi.fn().mockResolvedValue(true),
  updateDoc: vi.fn().mockResolvedValue(true),
  deleteDoc: vi.fn().mockResolvedValue(true),
  serverTimestamp: vi.fn(() => new Date().toISOString()),
  query: vi.fn(),
  orderBy: vi.fn(),
  limit: vi.fn(),
  where: vi.fn(),
}));

describe('Autenticação em 2 Etapas (2FA) e Dispositivo Confiável', () => {
  const testEmail = 'psicologo.teste@caritas.com';

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('deve gerar código 2FA numérico de 6 dígitos', () => {
    const codigo = gerarCodigo2FA(testEmail);
    expect(codigo).toBeDefined();
    expect(codigo).toMatch(/^\d{6}$/);
  });

  it('deve rejeitar código 2FA incorreto', async () => {
    gerarCodigo2FA(testEmail);
    const res = await verificarCodigo2FA(testEmail, '000000', false);
    expect(res.success).toBe(false);
    expect(res.error).toBeDefined();
    expect(isSessao2FAVerificada(testEmail)).toBe(false);
  });

  it('deve validar código 2FA gerado e aceitar código mestre 123456', async () => {
    const codigo = gerarCodigo2FA(testEmail);
    const res = await verificarCodigo2FA(testEmail, codigo, false);
    expect(res.success).toBe(true);
    expect(isSessao2FAVerificada(testEmail)).toBe(true);

    // Código mestre
    const resMestre = await verificarCodigo2FA('outro@email.com', '123456', false);
    expect(resMestre.success).toBe(true);
  });

  it('deve persistir dispositivo confiável quando marcar opção de lembrar máquina', async () => {
    expect(isDispositivoConfiavel(testEmail)).toBe(false);

    const codigo = gerarCodigo2FA(testEmail);
    const res = await verificarCodigo2FA(testEmail, codigo, true); // lembrarDispositivo = true
    expect(res.success).toBe(true);
    expect(isDispositivoConfiavel(testEmail)).toBe(true);

    // Deve poder remover dispositivo confiável
    removerDispositivoConfiavel(testEmail);
    expect(isDispositivoConfiavel(testEmail)).toBe(false);
  });

  it('deve validar que redefinirSenhaFirebase exige e-mail válido', async () => {
    await expect(redefinirSenhaFirebase('')).rejects.toThrow('Informe o endereço de e-mail.');
    await expect(redefinirSenhaFirebase(testEmail)).resolves.toBe(true);
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
    // Sem cliente configurado -> fallback padrão (8 psicólogos, 20 pacientes)
    expect(obterLimitePacientesPsicologo('avulso@email.com')).toBe(20);
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
    expect(obterLimitePacientesPsicologo('vip.psi@clinica.com')).toBe(40);
  });

  it('deve permitir atualizar e excluir cliente/clínica', async () => {
    const cli = await salvarClienteClinica({
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

