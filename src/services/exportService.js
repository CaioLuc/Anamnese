import { lerPacientes, lerSessoesDoPaciente, lerAnamnesesDoPaciente } from './patientService';

/**
 * Gera um CSV a partir de um array de objetos.
 * @param {Array<Object>} rows - Dados
 * @param {string[]} columns - Colunas a incluir
 * @param {Object} headers - Mapeamento coluna → header legível
 * @returns {string} Conteúdo CSV
 */
function toCSV(rows, columns, headers = {}) {
  const headerRow = columns.map(c => headers[c] || c).join(';');
  const dataRows = rows.map(row =>
    columns.map(c => {
      let val = row[c];
      if (val === null || val === undefined) val = '';
      if (typeof val === 'object' && val.toDate) val = val.toDate().toISOString();
      if (typeof val === 'object') val = JSON.stringify(val);
      // Escape CSV: envolve em aspas se contém ; ou quebra de linha
      val = String(val).replace(/"/g, '""');
      if (val.includes(';') || val.includes('\n') || val.includes('"')) {
        val = `"${val}"`;
      }
      return val;
    }).join(';')
  );
  return [headerRow, ...dataRows].join('\n');
}

/**
 * Dispara download de um arquivo texto no navegador.
 */
function downloadFile(content, filename, mimeType = 'text/csv;charset=utf-8;') {
  const blob = new Blob(['\uFEFF' + content], { type: mimeType }); // BOM para Excel reconhecer UTF-8
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Exporta todos os pacientes, sessões e anamneses do psicólogo logado em 3 arquivos CSV.
 * @param {Function} onProgress - Callback de progresso (mensagem: string)
 * @returns {Promise<{pacientes: number, sessoes: number, anamneses: number}>}
 */
export async function exportarDadosCSV(onProgress = () => {}) {
  onProgress('Buscando pacientes...');
  const pacientes = await lerPacientes();
  
  const todasSessoes = [];
  const todasAnamneses = [];

  for (let i = 0; i < pacientes.length; i++) {
    const pac = pacientes[i];
    onProgress(`Processando ${pac.nome || 'paciente'} (${i + 1}/${pacientes.length})...`);
    
    try {
      const sessoes = await lerSessoesDoPaciente(pac.id);
      sessoes.forEach(s => todasSessoes.push({ ...s, nome_paciente: pac.nome || '' }));
    } catch (e) { /* skip */ }

    try {
      const anamneses = await lerAnamnesesDoPaciente(pac.id);
      anamneses.forEach(a => todasAnamneses.push({ ...a, nome_paciente: pac.nome || '' }));
    } catch (e) { /* skip */ }
  }

  // CSV de Pacientes
  const csvPacientes = toCSV(pacientes, 
    ['nome', 'cpf', 'data_nascimento', 'telefone', 'email', 'clinica', 'valor_sessao', 'observacoes'],
    { nome: 'Nome', cpf: 'CPF', data_nascimento: 'Data Nascimento', telefone: 'Telefone', email: 'E-mail', clinica: 'Local', valor_sessao: 'Valor Sessão', observacoes: 'Observações' }
  );

  // CSV de Sessões
  const csvSessoes = toCSV(todasSessoes,
    ['nome_paciente', 'data_sessao', 'status', 'humor', 'valor', 'pago', 'forma_pagamento', 'observacoes', 'comportamento', 'sintomas'],
    { nome_paciente: 'Paciente', data_sessao: 'Data', status: 'Status', humor: 'Humor', valor: 'Valor', pago: 'Pago', forma_pagamento: 'Forma Pgto', observacoes: 'Observações', comportamento: 'Comportamento', sintomas: 'Sintomas' }
  );

  // CSV de Anamneses
  const csvAnamneses = toCSV(todasAnamneses,
    ['nome_paciente', 'tipo', 'createdAt'],
    { nome_paciente: 'Paciente', tipo: 'Tipo', createdAt: 'Data Criação' }
  );

  onProgress('Gerando arquivos...');
  const dataStr = new Date().toISOString().slice(0, 10);
  downloadFile(csvPacientes, `caritas_pacientes_${dataStr}.csv`);
  downloadFile(csvSessoes, `caritas_sessoes_${dataStr}.csv`);
  downloadFile(csvAnamneses, `caritas_anamneses_${dataStr}.csv`);

  return {
    pacientes: pacientes.length,
    sessoes: todasSessoes.length,
    anamneses: todasAnamneses.length,
  };
}
