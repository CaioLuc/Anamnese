/**
 * Aplica a máscara de CPF: XXX.XXX.XXX-XX
 * @param {string} value 
 * @returns {string} CPF formatado
 */
export const formatCPF = (value) => {
  if (!value) return '';
  // Remove tudo que não é dígito e limita a 11 dígitos
  let cpf = value.replace(/\D/g, '').slice(0, 11);
  
  // Aplica a máscara
  cpf = cpf.replace(/(\d{3})(\d)/, '$1.$2');
  cpf = cpf.replace(/(\d{3})(\d)/, '$1.$2');
  cpf = cpf.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  
  return cpf;
};

/**
 * Remove a máscara de CPF, retornando apenas os dígitos numéricos.
 * útil para salvar no backend.
 * @param {string} value 
 * @returns {string} CPF numérico
 */
export const cleanCPF = (value) => {
  if (!value) return '';
  return value.replace(/\D/g, '');
};

/**
 * Valida um CPF usando os dígitos verificadores.
 * @param {string} cpf — pode estar com máscara ou só dígitos
 * @returns {boolean} true se válido
 */
export const validarCPF = (cpf) => {
  if (!cpf) return true; // CPF é opcional, vazio = ok
  const digits = cpf.replace(/\D/g, '');
  if (digits.length !== 11) return false;
  
  // Rejeitar sequências repetidas (000.000.000-00, 111.111.111-11, etc.)
  if (/^(\d)\1{10}$/.test(digits)) return false;

  // Validar primeiro dígito verificador
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(digits[i]) * (10 - i);
  let remainder = (sum * 10) % 11;
  if (remainder === 10) remainder = 0;
  if (remainder !== parseInt(digits[9])) return false;

  // Validar segundo dígito verificador
  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(digits[i]) * (11 - i);
  remainder = (sum * 10) % 11;
  if (remainder === 10) remainder = 0;
  if (remainder !== parseInt(digits[10])) return false;

  return true;
};

/**
 * Aplica máscara de telefone: (XX) XXXXX-XXXX ou (XX) XXXX-XXXX
 * @param {string} value
 * @returns {string} Telefone formatado
 */
export const formatTelefone = (value) => {
  if (!value) return '';
  let tel = value.replace(/\D/g, '');
  if (tel.length > 11) tel = tel.slice(0, 11);

  if (tel.length > 6) {
    // (XX) XXXXX-XXXX ou (XX) XXXX-XXXX
    tel = tel.replace(/^(\d{2})(\d)/, '($1) $2');
    tel = tel.replace(/(\d{4,5})(\d{4})$/, '$1-$2');
  } else if (tel.length > 2) {
    tel = tel.replace(/^(\d{2})(\d)/, '($1) $2');
  }
  return tel;
};

/**
 * Converte com segurança diversos formatos de data (Firestore Timestamp, string 'YYYY-MM-DD', Date) em objeto Date válido.
 * Unificado para evitar duplicação em Dashboard.jsx e Financas.jsx.
 * @param {any} d 
 * @returns {Date|null}
 */
export const parseDate = (d) => {
  if (!d) return null;
  if (typeof d.toDate === 'function') {
    const res = d.toDate();
    return res instanceof Date && !isNaN(res.getTime()) ? res : null;
  }
  if (d instanceof Date) return isNaN(d.getTime()) ? null : d;
  if (typeof d === 'string') {
    const parts = d.split('-');
    if (parts.length === 3) {
      const [y, m, day] = parts;
      if (!isNaN(+y) && !isNaN(+m) && !isNaN(+day)) {
        const dateObj = new Date(+y, +m - 1, +day);
        return isNaN(dateObj.getTime()) ? null : dateObj;
      }
    }
    const parsed = new Date(d);
    return isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
};

/**
 * Formata valor monetário em padrão Real brasileiro (R$ 0,00).
 * @param {number|string} val 
 * @returns {string}
 */
export const formatCurrency = (val) => {
  const num = typeof val === 'number' ? val : parseFloat(String(val).replace(',', '.')) || 0;
  return num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

/**
 * Formata duração em minutos para formato amigável (ex: '50 min', '1h 30min').
 * @param {number} minutes 
 * @returns {string}
 */
export const formatDuration = (minutes) => {
  if (!minutes || minutes <= 0) return '0 min';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0 && m > 0) return `${h}h ${m}min`;
  if (h > 0) return `${h}h`;
  return `${m} min`;
};

