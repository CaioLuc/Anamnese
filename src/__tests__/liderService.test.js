import { describe, it, expect, beforeEach } from 'vitest';
import {
  MAX_PSICOLOGOS_EQUIPE,
  MAX_PACIENTES_POR_PSICOLOGO,
  obterEquipeLider,
  salvarEquipeLider,
  adicionarMembroEquipe,
  removerMembroEquipe,
  calcularMetricasEquipe,
  obterFilaTriagem,
  salvarFilaTriagem,
  encaminharPacienteTriagem,
  limparStorageLider,
} from '../services/liderService';

describe('liderService', () => {
  beforeEach(() => {
    limparStorageLider();
  });

  it('should have MAX_PSICOLOGOS_EQUIPE equal to 8 and MAX_PACIENTES_POR_PSICOLOGO equal to 20', () => {
    expect(MAX_PSICOLOGOS_EQUIPE).toBe(8);
    expect(MAX_PACIENTES_POR_PSICOLOGO).toBe(20);
  });

  it('should load initial team when storage is empty', () => {
    const equipe = obterEquipeLider();
    expect(equipe.length).toBeGreaterThan(0);
    expect(equipe.length).toBeLessThanOrEqual(MAX_PSICOLOGOS_EQUIPE);
  });

  it('should calculate team metrics accurately', () => {
    const mockEquipe = [
      { id: '1', nome: 'Psi 1', maxPacientes: 20, pacientesAtivos: 10, sessoesMes: 30, evolucoesPendentes: 0, taxaPresenca: 90 },
      { id: '2', nome: 'Psi 2', maxPacientes: 20, pacientesAtivos: 10, sessoesMes: 30, evolucoesPendentes: 2, taxaPresenca: 100 },
    ];

    const metricas = calcularMetricasEquipe(mockEquipe);
    expect(metricas.totalProfissionais).toBe(2);
    expect(metricas.capacidadeEquipe).toBe(8);
    expect(metricas.totalPacientesAtivos).toBe(20);
    expect(metricas.capacidadeTotal).toBe(40);
    expect(metricas.taxaOcupacaoGeral).toBe(50); // 20 / 40 = 50%
    expect(metricas.totalSessoesMes).toBe(60);
    expect(metricas.totalPendencias48h).toBe(2);
    expect(metricas.mediaPresenca).toBe(95);
  });

  it('should enforce limit of 8 psychologists per clinical leader', () => {
    const eightPsychologists = Array.from({ length: 8 }, (_, i) => ({
      id: `p-${i}`,
      nome: `Psi ${i}`,
      crp: `06/12345${i}`,
      maxPacientes: 20,
      pacientesAtivos: 5,
    }));
    salvarEquipeLider(eightPsychologists);

    expect(() => {
      adicionarMembroEquipe({ nome: 'Nono Psicólogo', crp: '06/999999' });
    }).toThrow(/Limite máximo atingido/);
  });

  it('should allow adding a psychologist when below limit of 8', () => {
    const equipe = [
      { id: '1', nome: 'Psi 1', crp: '06/111111', maxPacientes: 25 },
    ];
    salvarEquipeLider(equipe);

    const novo = adicionarMembroEquipe({
      nome: 'Dra. Vanessa',
      crp: '06/222222',
      especialidade: 'Neuropsicologia',
    });

    expect(novo.id).toBeDefined();
    expect(novo.nome).toBe('Dra. Vanessa');
    const atualizada = obterEquipeLider();
    expect(atualizada.length).toBe(2);
  });

  it('should remove a member from the team', () => {
    const equipe = [
      { id: 'p1', nome: 'Psi 1' },
      { id: 'p2', nome: 'Psi 2' },
    ];
    salvarEquipeLider(equipe);

    const restante = removerMembroEquipe('p1');
    expect(restante.length).toBe(1);
    expect(restante[0].id).toBe('p2');
  });

  it('should route patient from triage queue to psychologist', () => {
    const triagem = [
      { id: 't1', nome: 'Paciente Fila', queixaResumo: 'Ansiedade' },
    ];
    salvarFilaTriagem(triagem);

    const equipe = [
      { id: 'psi-dest', nome: 'Psi Destino', pacientesAtivos: 5 },
    ];
    salvarEquipeLider(equipe);

    const resultado = encaminharPacienteTriagem('t1', 'psi-dest');
    expect(resultado.paciente.nome).toBe('Paciente Fila');
    expect(resultado.psicologo.pacientesAtivos).toBe(6);

    const novaFila = obterFilaTriagem();
    expect(novaFila.length).toBe(0);
  });
});
