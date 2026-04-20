export default function UpgradeProModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-md ds-card overflow-hidden animate-in fade-in zoom-in duration-300" style={{ borderRadius: '24px' }}>
        
        {/* Gradient Header */}
        <div className="relative bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 px-8 py-10 text-center overflow-hidden">
          {/* Floating particles */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute w-32 h-32 -top-10 -left-10 bg-white/10 rounded-full blur-2xl animate-pulse" />
            <div className="absolute w-24 h-24 -bottom-8 -right-8 bg-white/10 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '1s' }} />
          </div>

          <div className="relative">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Desbloqueie a I.A.</h2>
            <p className="text-sm text-white/80">
              Transforme suas anotações em resumos clínicos profissionais com inteligência artificial.
            </p>
          </div>
        </div>

        {/* Benefits */}
        <div className="px-8 py-6 space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-indigo-500/10 flex items-center justify-center shrink-0 mt-0.5">
              <svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            </div>
            <div>
              <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Resumos em segundos</p>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>A I.A. transforma suas notas brutas em texto clínico estruturado instantaneamente.</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-purple-500/10 flex items-center justify-center shrink-0 mt-0.5">
              <svg className="w-4 h-4 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            </div>
            <div>
              <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Prontuários impecáveis</p>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Resumos de anamnese e evolução com linguagem técnica e profissional.</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-pink-500/10 flex items-center justify-center shrink-0 mt-0.5">
              <svg className="w-4 h-4 text-pink-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <div>
              <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Economize horas</p>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Pare de gastar tempo formatando. Foque no que importa: seus pacientes.</p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="px-8 pb-8 space-y-3">
          <button
            onClick={() => { alert('Funcionalidade de pagamento em breve!'); }}
            className="w-full py-3.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:from-indigo-600 hover:via-purple-600 hover:to-pink-600 text-white text-sm font-bold rounded-xl shadow-lg shadow-purple-500/20 transition-all hover:shadow-purple-500/40 hover:scale-[1.02] active:scale-[0.98]"
          >
            Assinar PRO — R$ 59,90/mês
          </button>
          <button
            onClick={onClose}
            className="w-full py-2.5 text-sm transition-colors"
            style={{ color: 'var(--text-muted)' }}
          >
            Agora não
          </button>
        </div>
      </div>
    </div>
  );
}
