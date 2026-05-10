/**
 * Gerador de Payload PIX (BR Code) — Padrão do Banco Central do Brasil
 * 
 * Gera a string "Copia e Cola" 100% no navegador (offline).
 * Formato: EMV® QR Code (TLV — Tag-Length-Value)
 * Referência: Manual BR Code v3.0.1 do Banco Central
 * 
 * ⚠️ Esse utilitário é agnóstico de banco de dados.
 *    Funciona igual no Firebase e no Supabase.
 */

/**
 * Monta um bloco TLV (Tag-Length-Value) do padrão EMV.
 * @param {string} id   — Tag numérica (2 dígitos)
 * @param {string} value — Valor do campo
 * @returns {string}
 */
function tlv(id, value) {
  const len = String(value.length).padStart(2, '0');
  return `${id}${len}${value}`;
}

/**
 * Calcula o CRC16-CCITT (polinômio 0x1021) exigido pelo BR Code.
 * @param {string} str — payload completo até "6304"
 * @returns {string} — 4 caracteres hex uppercase
 */
function crc16(str) {
  let crc = 0xFFFF;
  for (let i = 0; i < str.length; i++) {
    crc ^= str.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if (crc & 0x8000) {
        crc = (crc << 1) ^ 0x1021;
      } else {
        crc = crc << 1;
      }
      crc &= 0xFFFF;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

/**
 * Gera o payload completo do PIX (padrão BR Code).
 * 
 * @param {object} params
 * @param {string} params.chave       — Chave PIX (CPF, email, telefone ou aleatória)
 * @param {string} params.nome        — Nome do recebedor (até 25 chars, sem acentos)
 * @param {string} params.cidade      — Cidade do recebedor (até 15 chars, sem acentos)
 * @param {number} [params.valor]     — Valor da cobrança (ex: 150.00). Se omitido, fica aberto.
 * @param {string} [params.txid='***'] — Identificador da transação (até 25 chars)
 * @returns {string} — Payload "Copia e Cola" pronto para gerar QR Code
 */
export function generatePixPayload({ chave, nome, cidade, valor, txid = '***' }) {
  // Sanitiza nome e cidade (sem acentos, uppercase, max length)
  const sanitize = (str, maxLen) =>
    str
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .toUpperCase()
      .replace(/[^A-Z0-9 ]/g, '')
      .slice(0, maxLen);

  const sNome = sanitize(nome, 25);
  const sCidade = sanitize(cidade, 15);

  // Merchant Account Information (tag 26)
  // GUI do PIX (obrigatório): br.gov.bcb.pix
  // Chave (tag 01 dentro do 26)
  const merchantAccount = tlv('00', 'br.gov.bcb.pix') + tlv('01', chave);

  let payload = '';
  payload += tlv('00', '01');                        // Payload Format Indicator
  payload += tlv('26', merchantAccount);             // Merchant Account Information
  payload += tlv('52', '0000');                      // Merchant Category Code
  payload += tlv('53', '986');                       // Transaction Currency (BRL = 986)

  if (valor && valor > 0) {
    payload += tlv('54', valor.toFixed(2));           // Transaction Amount
  }

  payload += tlv('58', 'BR');                        // Country Code
  payload += tlv('59', sNome);                       // Merchant Name
  payload += tlv('60', sCidade);                     // Merchant City

  // Additional Data Field (tag 62) com txid (tag 05)
  const additionalData = tlv('05', txid);
  payload += tlv('62', additionalData);

  // CRC (tag 63) — calcula sobre tudo + "6304"
  payload += '6304';
  payload += crc16(payload);

  return payload;
}

/**
 * Verifica se uma chave PIX parece válida.
 * @param {string} chave
 * @returns {{ valid: boolean, tipo: string }}
 */
export function identificarTipoChave(chave) {
  if (!chave || !chave.trim()) return { valid: false, tipo: '' };
  const c = chave.trim();

  // CPF: 11 dígitos
  if (/^\d{11}$/.test(c.replace(/[.\-]/g, ''))) return { valid: true, tipo: 'CPF' };

  // CNPJ: 14 dígitos
  if (/^\d{14}$/.test(c.replace(/[.\-/]/g, ''))) return { valid: true, tipo: 'CNPJ' };

  // Telefone: +55XXXXXXXXXXX
  if (/^\+55\d{10,11}$/.test(c.replace(/[\s()-]/g, ''))) return { valid: true, tipo: 'Telefone' };

  // Email
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c)) return { valid: true, tipo: 'E-mail' };

  // Chave aleatória (UUID v4)
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(c)) return { valid: true, tipo: 'Aleatória' };

  return { valid: false, tipo: 'Desconhecido' };
}
