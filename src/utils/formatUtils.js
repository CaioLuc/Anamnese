/**
 * Aplica a máscara de CPF: XXX.XXX.XXX-XX
 * @param {string} value 
 * @returns {string} CPF formatado
 */
export const formatCPF = (value) => {
  if (!value) return '';
  // Remove tudo que não é dígito
  let cpf = value.replace(/\D/g, '');
  
  // Aplica a máscara
  if (cpf.length <= 11) {
    cpf = cpf.replace(/(\d{3})(\d)/, '$1.$2');
    cpf = cpf.replace(/(\d{3})(\d)/, '$1.$2');
    cpf = cpf.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  }
  return cpf.slice(0, 14); // Limita o tamanho máximo com a máscara
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

