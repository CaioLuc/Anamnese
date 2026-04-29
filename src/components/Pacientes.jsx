import logger from '../utils/logger';
import { useState, useEffect } from 'react';
import { deletarPaciente } from '../services/patientService';
import AddPatientModal from './AddPatientModal';
import PatientProfileModal from './PatientProfileModal';
import ConfirmDialog from './ConfirmDialog';
import { formatCPF } from '../utils/formatUtils';
import Pagination from './ui/Pagination';
import Button from './ui/Button';
import Badge from './ui/Badge';
import { Plus, Search, Users, Phone, FileText, Trash2 } from 'lucide-react';

export default function Pacientes({ patients, isLoading, onPatientAddedLocal, autoOpenPatient, autoOpenTab, onAutoOpenDone }) {
  const [isPatientModalOpen, setIsPatientModalOpen] = useState(false);
  const [isEditPatientModalOpen, setIsEditPatientModalOpen] = useState(false);
  const [patientToEdit, setPatientToEdit] = useState(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [profileInitialTab, setProfileInitialTab] = useState('evolucoes');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterClinica, setFilterClinica] = useState(''); // '' = todas
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, patient: null });

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Auto-open patient modal when coming from Agenda 'Atender' or Dashboard 'Novo Paciente'
  useEffect(() => {
    if (autoOpenPatient === '__add__') {
      setIsPatientModalOpen(true);
      if (onAutoOpenDone) onAutoOpenDone();
    } else if (autoOpenPatient) {
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
      logger.error('Erro ao deletar:', err);
    }
  };

  const clinicas = [...new Set(patients.map(p => p.clinica).filter(Boolean))].sort();

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterClinica]);

  const filteredPatients = patients.filter(p => {
    const matchSearch = !searchTerm || 
      (p.nome && p.nome.toLowerCase().includes(searchTerm.toLowerCase())) || 
      (p.cpf && p.cpf.includes(searchTerm));
    const matchClinica = !filterClinica || p.clinica === filterClinica;
    return matchSearch && matchClinica;
  });

  const totalPages = Math.ceil(filteredPatients.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedPatients = filteredPatients.slice(startIndex, startIndex + itemsPerPage);

  const Spinner = () => (
    <div className="flex flex-col items-center justify-center h-64 p-8">
      <svg className="w-8 h-8 animate-spin mb-4" style={{ color: 'var(--accent)' }} fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      <span className="font-medium" style={{ color: 'var(--text-secondary)' }}>Buscando dados no Firebase...</span>
    </div>
  );

  return (
    <div className="w-full">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
        <div>
          <h2 className="text-3xl font-heading font-semibold tracking-tight" style={{ color: 'var(--text-primary)' }}>Pacientes cadastrados</h2>
          <p className="mt-1" style={{ color: 'var(--text-secondary)' }}>Gerencie sua lista de pacientes e acompanhe as evoluções psicoterapêuticas.</p>
        </div>
        <Button onClick={() => setIsPatientModalOpen(true)} className="flex-shrink-0">
          <Plus size={18} />
          Adicionar Paciente
        </Button>
      </div>

      <div className="ds-card overflow-hidden">
        {/* Barra de Busca Exclusiva */}
        <div 
          className="p-4 sm:p-6 flex items-center justify-between gap-4 flex-col sm:flex-row"
          style={{ borderBottom: '0.5px solid var(--border)', backgroundColor: 'var(--bg-secondary)' }}
        >
            <div className="relative w-full sm:max-w-md">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search size={18} style={{ color: 'var(--text-muted)' }} />
                </div>
                <input
                    type="text"
                    placeholder="Buscar por nome ou CPF..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="ds-input pl-10"
                />
            </div>
            {clinicas.length > 0 && (
              <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
                <select
                  value={filterClinica}
                  onChange={(e) => setFilterClinica(e.target.value)}
                  className="ds-input"
                >
                  <option value="">Todos os locais</option>
                  {clinicas.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            )}
            <div className="text-sm shrink-0" style={{ color: 'var(--text-muted)' }}>
                {filteredPatients.length} {filteredPatients.length === 1 ? 'paciente' : 'pacientes'}
            </div>
        </div>

        {isLoading ? (
          <Spinner />
        ) : patients.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-16 text-center">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mb-6" style={{ backgroundColor: 'var(--bg-secondary)', border: '0.5px solid var(--border)' }}>
              <Users size={32} style={{ color: 'var(--text-muted)' }} />
            </div>
            <h3 className="text-xl font-heading font-semibold" style={{ color: 'var(--text-primary)' }}>Nenhum paciente na base</h3>
            <p className="mt-2 max-w-sm" style={{ color: 'var(--text-secondary)' }}>Você ainda não possui pacientes cadastrados. Clique no botão acima para registrar seu primeiro atendimento.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="text-xs uppercase tracking-wider font-semibold" style={{ backgroundColor: 'var(--bg-secondary)', borderBottom: '0.5px solid var(--border)', color: 'var(--text-muted)' }}>
                  <th className="px-6 py-4 whitespace-nowrap">Paciente</th>
                  <th className="px-6 py-4 whitespace-nowrap text-center">CPF</th>
                  <th className="px-6 py-4 whitespace-nowrap hidden sm:table-cell">Idade / Nasc.</th>
                  <th className="px-6 py-4 whitespace-nowrap hidden md:table-cell">Contato</th>
                  <th className="px-6 py-4 whitespace-nowrap text-right">Ações</th>
                </tr>
              </thead>
              <tbody style={{ borderTop: '0.5px solid var(--border)' }}>
                {paginatedPatients.length === 0 ? (
                    <tr>
                        <td colSpan="5" className="px-6 py-12 text-center" style={{ color: 'var(--text-secondary)' }}>
                            Nenhum paciente encontrado com base na busca: "{searchTerm}"
                        </td>
                    </tr>
                ) : paginatedPatients.map((patient) => {
                  // Simple age calculation
                  const dobStr = (patient.data_nascimento || '').includes('T') ? patient.data_nascimento : (patient.data_nascimento || '') + 'T12:00:00';
                  const dob = new Date(dobStr);
                  const today = new Date();
                  let age = today.getFullYear() - dob.getFullYear();
                  const m = today.getMonth() - dob.getMonth();
                  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) { age--; }

                  return (
                    <tr 
                      key={patient.id} 
                      onClick={() => openPatientProfile(patient)}
                      className="transition-colors group cursor-pointer"
                      style={{ borderBottom: '0.5px solid var(--border)' }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 mr-4">
                            <div className="h-10 w-10 rounded-full flex items-center justify-center text-sm font-bold" style={{ backgroundColor: 'var(--accent-light)', color: 'var(--accent)', border: '0.5px solid var(--accent)' }}>
                              {patient?.nome?.charAt(0)?.toUpperCase() || '?'}
                            </div>
                          </div>
                          <div>
                            <div className="text-sm font-semibold transition-colors" style={{ color: 'var(--text-primary)' }}>
                              {patient.nome}
                            </div>
                            <div className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>{patient.clinica || 'Sem local definido'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <Badge variant="neutral">
                          {patient.cpf ? formatCPF(patient.cpf) : '-'}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap hidden sm:table-cell">
                        <div className="text-sm" style={{ color: 'var(--text-primary)' }}>{age >= 0 ? `${age} anos` : '-'}</div>
                        <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>{dob.toLocaleDateString()}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap hidden md:table-cell">
                        {patient.telefone ? (
                          <div className="flex items-center text-sm" style={{ color: 'var(--text-secondary)' }}>
                            <Phone size={14} className="mr-1.5" />
                            {patient.telefone}
                          </div>
                        ) : (
                          <span className="text-xs italic" style={{ color: 'var(--text-muted)' }}>Não informado</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                            <Button 
                              variant="secondary"
                              size="sm"
                              onClick={(e) => openAnamnesisModal(patient, e)}
                            >
                              <FileText size={14} />
                              Nova Anamnese
                            </Button>
                            <Button 
                              variant="danger"
                              size="sm"
                              className="px-2"
                              onClick={(e) => handleExcluirPaciente(patient, e)}
                              title="Remover Paciente"
                            >
                              <Trash2 size={16} />
                            </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            
            {/* Pagination Controls */}
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={filteredPatients.length}
              startIndex={startIndex}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
              itemLabel="pacientes"
            />
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
        onEditRequest={(p) => {
          setPatientToEdit(p);
          setIsEditPatientModalOpen(true);
        }}
        onPatientUpdated={(updated) => {
          setSelectedPatient(updated);
          if (onPatientAddedLocal) onPatientAddedLocal();
        }}
      />
      <AddPatientModal
        isOpen={isEditPatientModalOpen}
        onClose={() => { setIsEditPatientModalOpen(false); setPatientToEdit(null); }}
        patientToEdit={patientToEdit}
        onPatientAdded={(updatedData) => {
          setSelectedPatient(updatedData);
          setIsEditPatientModalOpen(false);
          setPatientToEdit(null);
          if (onPatientAddedLocal) onPatientAddedLocal();
        }}
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
