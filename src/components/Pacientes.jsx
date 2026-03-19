import { useState, useEffect } from 'react';
import { deletarPaciente } from '../services/patientService';
import AddPatientModal from './AddPatientModal';
import PatientProfileModal from './PatientProfileModal';
import ConfirmDialog from './ConfirmDialog';

export default function Pacientes({ patients, isLoading, onPatientAddedLocal, autoOpenPatient, autoOpenTab, onAutoOpenDone }) {
  const [isPatientModalOpen, setIsPatientModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [profileInitialTab, setProfileInitialTab] = useState('evolucoes');
  const [searchTerm, setSearchTerm] = useState('');
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, patient: null });

  // Auto-open patient modal when coming from Agenda 'Atender'
  useEffect(() => {
    if (autoOpenPatient) {
      setSelectedPatient(autoOpenPatient);
      setProfileInitialTab(autoOpenTab || 'evolucoes');
      setIsProfileModalOpen(true);
      if (onAutoOpenDone) onAutoOpenDone();
    }
  }, [autoOpenPatient]);

  const openAnamnesisModal = (patient, e) => {
    e.stopPropagation();
    setSelectedPatient(patient);
    setProfileInitialTab('anamnese');
    setIsProfileModalOpen(true);
  };

  const openPatientProfile = (patient) => {
    setSelectedPatient(patient);
    setProfileInitialTab('evolucoes');
    setIsProfileModalOpen(true);
  };

  const handleExcluirPaciente = async (patient, e) => {
    e.stopPropagation();
    setConfirmDialog({ isOpen: true, patient });
  };

  const confirmExcluirPaciente = async () => {
    const patient = confirmDialog.patient;
    setConfirmDialog({ isOpen: false, patient: null });
    try {
      await deletarPaciente(patient.id);
      if (onPatientAddedLocal) onPatientAddedLocal();
    } catch (err) {
      console.error('Erro ao deletar:', err);
    }
  };

  const filteredPatients = patients.filter(p => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (p.nome && p.nome.toLowerCase().includes(term)) || 
           (p.cpf && p.cpf.includes(term));
  });

  return (
    <div className="animate-in fade-in duration-500 w-full">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Pacientes cadastrados</h2>
          <p className="mt-1 text-slate-600 dark:text-slate-400">Gerencie sua lista de pacientes e acompanhe as evoluções psicoterapêuticas.</p>
        </div>
        <button
          onClick={() => setIsPatientModalOpen(true)}
          className="inline-flex items-center justify-center px-5 py-2.5 text-sm font-medium text-white transition-all bg-indigo-500 border border-transparent rounded-xl hover:bg-indigo-600 shadow-lg shadow-indigo-500/20 flex-shrink-0"
        >
          <svg className="w-5 h-5 mr-2 -ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Adicionar Paciente
        </button>
      </div>

      <div className="bg-white/50 dark:bg-zinc-900/50 backdrop-blur-xl border border-slate-200 dark:border-white/5 shadow-2xl rounded-3xl overflow-hidden relative">
        {/* Barra de Busca Exclusiva */}
        <div className="p-4 sm:p-6 border-b border-slate-200 dark:border-white/5 bg-zinc-950/30 flex items-center justify-between gap-4 flex-col sm:flex-row">
            <div className="relative w-full sm:max-w-md">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="w-5 h-5 text-slate-600 dark:text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                </div>
                <input
                    type="text"
                    placeholder="Buscar por nome ou CPF..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2 border border-slate-300 dark:border-white/10 rounded-xl leading-5 bg-white dark:bg-zinc-900 text-slate-700 dark:text-slate-300 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-colors"
                />
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-400 shrink-0">
                {filteredPatients.length} {filteredPatients.length === 1 ? 'paciente' : 'pacientes'}
            </div>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-64 p-8">
            <svg className="w-8 h-8 animate-spin text-indigo-500 mb-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span className="text-slate-600 dark:text-slate-400 font-medium">Buscando dados no Firebase...</span>
          </div>
        ) : patients.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-16 text-center">
            <div className="w-20 h-20 bg-slate-100 dark:bg-white/5 rounded-full flex items-center justify-center mb-6">
              <svg className="w-10 h-10 text-slate-600 dark:text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-slate-700 dark:text-slate-300">Nenhum paciente na base</h3>
            <p className="mt-2 text-slate-600 dark:text-slate-400 max-w-sm">Você ainda não possui pacientes cadastrados. Clique no botão acima para registrar seu primeiro atendimento.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-zinc-800/30 border-b border-slate-200 dark:border-white/5 text-xs uppercase tracking-wider text-slate-600 dark:text-slate-400 font-semibold">
                  <th className="px-6 py-4 whitespace-nowrap">Paciente</th>
                  <th className="px-6 py-4 whitespace-nowrap">CPF</th>
                  <th className="px-6 py-4 whitespace-nowrap hidden sm:table-cell">Idade / Nasc.</th>
                  <th className="px-6 py-4 whitespace-nowrap hidden md:table-cell">Contato</th>
                  <th className="px-6 py-4 whitespace-nowrap text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredPatients.length === 0 ? (
                    <tr>
                        <td colSpan="5" className="px-6 py-12 text-center text-slate-600 dark:text-slate-400">
                            Nenhum paciente encontrado com base na busca: "{searchTerm}"
                        </td>
                    </tr>
                ) : filteredPatients.map((patient) => {
                  // Simple age calculation
                  const dob = new Date(patient.data_nascimento);
                  const today = new Date();
                  let age = today.getFullYear() - dob.getFullYear();
                  const m = today.getMonth() - dob.getMonth();
                  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) { age--; }

                  return (
                    <tr 
                      key={patient.id} 
                      onClick={() => openPatientProfile(patient)}
                      className="hover:bg-slate-100 dark:hover:bg-white/5 transition-colors group cursor-pointer"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 mr-4">
                            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-500/10 to-cyan-500/10 border border-indigo-500/20 dark:border-indigo-500/30 flex items-center justify-center text-sm font-bold text-indigo-600 dark:text-indigo-300">
                              {patient.nome ? patient.nome.charAt(0).toUpperCase() : '?'}
                            </div>
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-slate-900 dark:text-white group-hover:text-indigo-400 transition-colors">
                              {patient.nome}
                            </div>
                            <div className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">ID: {patient.id.substring(0, 8)}...</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-zinc-800 text-slate-800 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700">
                          {patient.cpf}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap hidden sm:table-cell">
                        <div className="text-sm text-slate-700 dark:text-slate-300">{age > 0 ? `${age} anos` : '-'}</div>
                        <div className="text-xs text-slate-600 dark:text-slate-400">{new Date(patient.data_nascimento).toLocaleDateString()}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap hidden md:table-cell">
                        {patient.telefone ? (
                          <div className="flex items-center text-sm text-slate-600 dark:text-slate-400">
                            <svg className="w-4 h-4 mr-1.5 text-slate-600 dark:text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                            </svg>
                            {patient.telefone}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-600 italic">Não informado</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                            <button 
                              onClick={(e) => openAnamnesisModal(patient, e)}
                              className="inline-flex items-center px-3 py-1.5 border border-indigo-500/30 shadow-sm text-xs font-medium rounded-lg text-indigo-600 dark:text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500 hover:text-white dark:hover:text-white hover:border-transparent transition-all"
                            >
                              <svg className="w-3.5 h-3.5 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                              </svg>
                              Nova Anamnese
                            </button>
                            <button 
                              onClick={(e) => handleExcluirPaciente(patient, e)}
                              className="p-1.5 text-red-600 dark:text-red-400 bg-red-500/10 hover:bg-red-500 hover:text-white dark:hover:text-white rounded-lg transition-colors border border-red-500/20 shadow-sm"
                              title="Remover Paciente"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Internal Modals */}
      <AddPatientModal 
        isOpen={isPatientModalOpen} 
        onClose={() => setIsPatientModalOpen(false)} 
        onPatientAdded={onPatientAddedLocal}
      />
      <PatientProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        patient={selectedPatient}
        initialTab={profileInitialTab}
      />
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title="Remover Paciente"
        message={`Tem certeza que deseja apagar ${confirmDialog.patient?.nome}? Esta ação é permanente e removerá todo o prontuário.`}
        onConfirm={confirmExcluirPaciente}
        onCancel={() => setConfirmDialog({ isOpen: false, patient: null })}
        variant="danger"
      />
    </div>
  );
}
