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
