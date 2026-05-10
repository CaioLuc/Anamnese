import { useState, useEffect, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { generatePixPayload, identificarTipoChave } from '../utils/pixUtils';
import { X, Copy, Check, MessageCircle, QrCode } from 'lucide-react';
import logger from '../utils/logger';

/**
 * Modal de Cobrança PIX — gera QR Code + Copia e Cola + WhatsApp.
 *
 * Props:
 * @param {boolean} isOpen
 * @param {function} onClose
 * @param {object} sessao       — { data_sessao, pago, forma_pagamento, ... }
 * @param {object} paciente     — { nome, telefone, ... }
 * @param {number} valor        — valor numérico já calculado
 * @param {object} pixConfig    — { pix_chave, pix_titular, pix_cidade } do psicólogo
 */
export default function ModalCobrancaPix({ isOpen, onClose, sessao, paciente, valor, pixConfig }) {
  const [copied, setCopied] = useState(false);
  const [payload, setPayload] = useState('');
  const [error, setError] = useState('');
  const modalRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    setCopied(false);
    setError('');

    if (!pixConfig?.pix_chave || !pixConfig?.pix_titular || !pixConfig?.pix_cidade) {
      setError('Configure sua chave PIX nas Configurações da Agenda antes de cobrar.');
      setPayload('');
      return;
    }

    const { valid } = identificarTipoChave(pixConfig.pix_chave);
    if (!valid) {
      setError('A chave PIX configurada parece inválida. Verifique nas Configurações.');
      setPayload('');
      return;
    }

    try {
      const pix = generatePixPayload({
        chave: pixConfig.pix_chave.trim(),
        nome: pixConfig.pix_titular,
        cidade: pixConfig.pix_cidade,
        valor: valor || 0,
        txid: `C${Date.now().toString(36).slice(-8).toUpperCase()}`
      });
      setPayload(pix);
    } catch (e) {
      logger.error('Erro ao gerar payload PIX:', e);
      setError('Erro ao gerar o código PIX. Verifique as configurações.');
      setPayload('');
    }
  }, [isOpen, pixConfig, valor]);

  // Close on ESC
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  // Close on backdrop click
  const handleBackdropClick = (e) => {
    if (modalRef.current && !modalRef.current.contains(e.target)) onClose();
  };

  if (!isOpen) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(payload);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = payload;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  const formatDateBR = (dateStr) => {
    if (!dateStr) return '—';
    const parts = dateStr.split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return dateStr;
  };

  const formatCurrency = (val) => {
    return (val || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  /**
   * Converte o QR Code SVG renderizado na tela em uma imagem PNG (blob).
   */
  const qrToImageBlob = () => {
    return new Promise((resolve, reject) => {
      const svgEl = modalRef.current?.querySelector('svg.qr-code-svg');
      if (!svgEl) return reject(new Error('QR SVG não encontrado'));

      const svgData = new XMLSerializer().serializeToString(svgEl);
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);

      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const padding = 32;
        canvas.width = img.width + padding * 2;
        canvas.height = img.height + padding * 2;
        const ctx = canvas.getContext('2d');
        // Fundo branco com padding
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, padding, padding);
        URL.revokeObjectURL(url);

        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Falha ao gerar PNG'));
        }, 'image/png');
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Falha ao carregar SVG')); };
      img.src = url;
    });
  };

  const handleWhatsApp = async () => {
    const nomeP = paciente?.nome || 'Paciente';
    const dataFormatada = formatDateBR(sessao?.data_sessao);
    const valorFormatado = `R$ ${formatCurrency(valor)}`;

    const mensagem = `Olá, ${nomeP}! 😊\n\nSegue o PIX para pagamento da sessão do dia *${dataFormatada}* no valor de *${valorFormatado}*.\n\n📋 *Código Copia e Cola:*\n${payload}\n\nBasta copiar o código acima e colar no app do seu banco na opção "PIX Copia e Cola". 🙏`;

    try {
      const blob = await qrToImageBlob();
      const file = new File([blob], `pix-${nomeP.replace(/\s/g, '-')}.png`, { type: 'image/png' });

      // Tenta a Web Share API (funciona no celular e PWA — envia imagem + texto junto)
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          text: mensagem,
          files: [file],
        });
        return;
      }
    } catch (e) {
      // Se o usuário cancelou o share ou não suporta, cai no fallback abaixo
      if (e.name === 'AbortError') return; // Usuário cancelou, não faz nada
      logger.warn('Web Share não disponível, usando fallback:', e);
    }

    // Fallback: baixa a imagem e abre o WhatsApp com o texto
    try {
      const blob = await qrToImageBlob();
      const downloadUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `pix-${nomeP.replace(/\s/g, '-')}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(downloadUrl);
    } catch (e) {
      logger.warn('Falha ao baixar QR:', e);
    }

    // Abre WhatsApp com o texto
    let tel = '';
    if (paciente?.telefone) {
      tel = paciente.telefone.replace(/\D/g, '');
      if (!tel.startsWith('55')) tel = '55' + tel;
    }

    const url = tel
      ? `https://wa.me/${tel}?text=${encodeURIComponent(mensagem)}`
      : `https://wa.me/?text=${encodeURIComponent(mensagem)}`;
    window.open(url, '_blank');
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
      onClick={handleBackdropClick}
    >
      <div
        ref={modalRef}
        className="w-full max-w-md rounded-2xl shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden"
        style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl" style={{ backgroundColor: 'var(--accent-light)', color: 'var(--accent)' }}>
              <QrCode size={20} />
            </div>
            <div>
              <h2 className="text-base font-heading font-bold" style={{ color: 'var(--text-primary)' }}>Cobrar via PIX</h2>
              <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                {paciente?.nome || 'Paciente'} • {formatDateBR(sessao?.data_sessao)}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg transition-colors hover:bg-slate-100 dark:hover:bg-white/5" style={{ color: 'var(--text-secondary)' }}>
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 pb-5 space-y-4">
          {error ? (
            <div className="p-4 rounded-xl text-center" style={{ backgroundColor: 'var(--status-danger-bg)', border: '1px solid var(--status-danger)' }}>
              <p className="text-sm font-medium" style={{ color: 'var(--status-danger-text)' }}>⚠️ {error}</p>
            </div>
          ) : (
            <>
              {/* Valor em Destaque */}
              <div className="text-center py-2">
                <p className="text-[10px] uppercase tracking-wider font-bold" style={{ color: 'var(--text-muted)' }}>Valor da cobrança</p>
                <p className="text-3xl font-black" style={{ color: 'var(--accent)' }}>
                  <span className="text-lg mr-0.5">R$</span>{formatCurrency(valor)}
                </p>
              </div>

              {/* QR Code */}
              <div className="flex justify-center">
                <div className="p-4 rounded-xl bg-white">
                  <QRCodeSVG
                    value={payload}
                    size={200}
                    bgColor="#FFFFFF"
                    fgColor="#000000"
                    level="M"
                    includeMargin={false}
                    className="qr-code-svg"
                  />
                </div>
              </div>

              {/* Copia e Cola */}
              <div>
                <label className="block text-[10px] uppercase tracking-wider font-bold mb-1.5" style={{ color: 'var(--text-muted)' }}>
                  Código Copia e Cola
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={payload}
                    readOnly
                    className="ds-input flex-1 text-[11px] font-mono truncate"
                    onClick={(e) => e.target.select()}
                  />
                  <button
                    onClick={handleCopy}
                    className="ds-btn px-3 py-2 font-bold text-xs transition-all flex items-center gap-1.5 shrink-0"
                    style={{
                      backgroundColor: copied ? 'var(--status-success-bg)' : 'var(--bg-secondary)',
                      color: copied ? 'var(--status-success-text)' : 'var(--text-primary)',
                      border: `1px solid ${copied ? 'var(--status-success)' : 'var(--border)'}`
                    }}
                  >
                    {copied ? <><Check size={14} /> Copiado!</> : <><Copy size={14} /> Copiar</>}
                  </button>
                </div>
              </div>

              {/* Botão WhatsApp */}
              <button
                onClick={handleWhatsApp}
                className="w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all hover:opacity-90 active:scale-[0.98]"
                style={{ backgroundColor: '#25D366', color: '#FFFFFF' }}
              >
                <MessageCircle size={18} />
                Enviar QR Code pelo WhatsApp
              </button>

              <p className="text-[10px] text-center" style={{ color: 'var(--text-muted)' }}>
                📱 No celular: envia a imagem + texto direto pelo WhatsApp.
                💻 No PC: baixa a imagem do QR e abre o WhatsApp Web com o texto.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
