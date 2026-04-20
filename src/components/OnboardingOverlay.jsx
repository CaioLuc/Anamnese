import { useState, useEffect } from 'react';

const ONBOARDING_STEPS = [
  {
    title: 'Bem-vindo ao Caritas! 🎉',
    description: 'Sua plataforma inteligente para gestão de pacientes, anamneses e evolução clínica. Vamos fazer um tour rápido para você começar.',
    icon: (
      <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center shadow-xl shadow-indigo-500/30">
        <span className="text-3xl font-bold text-white">C</span>
      </div>
    ),
  },
  {
    title: 'Cadastre seus pacientes',
    description: 'Comece cadastrando seus pacientes na seção "Pacientes" do menu lateral. Preencha nome, data de nascimento e informações de contato. Em seguida, acesse o prontuário para criar a ficha de anamnese.',
    icon: (
      <div className="w-20 h-20 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
        <svg className="w-10 h-10 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
        </svg>
      </div>
    ),
  },
  {
    title: 'Registre cada sessão',
    description: 'Após cada atendimento, vá em "Nova Sessão" e registre observações clínicas, comportamento e sintomas. A nota de humor (1-10) ajuda a acompanhar a evolução ao longo do tempo.',
    icon: (
      <div className="w-20 h-20 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
        <svg className="w-10 h-10 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      </div>
    ),
  },
  {
    title: 'Explore todas as ferramentas',
    description: 'Use a Agenda para organizar horários, o Financeiro para acompanhar receitas, e os Questionários para criar modelos personalizados de anamnese. A Central de Ajuda (ícone "?" no menu) está sempre disponível!',
    icon: (
      <div className="w-20 h-20 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
        <svg className="w-10 h-10 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
        </svg>
      </div>
    ),
  },
];

export default function OnboardingOverlay({ onComplete }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Aparece com delay para animação
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const handleNext = () => {
    if (currentStep < ONBOARDING_STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      handleComplete();
    }
  };

  const handleComplete = () => {
    setIsVisible(false);
    setTimeout(() => {
      localStorage.setItem('caritas_onboarding_done', 'true');
      onComplete();
    }, 300);
  };

  const step = ONBOARDING_STEPS[currentStep];
  const isLast = currentStep === ONBOARDING_STEPS.length - 1;

  return (
    <div className={`fixed inset-0 z-[500] flex items-center justify-center p-6 transition-all duration-300 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-zinc-950/80 backdrop-blur-md" />

      {/* Card */}
      <div className={`relative w-full max-w-md ds-card overflow-hidden transition-all duration-500 ${isVisible ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'}`} style={{ borderRadius: '24px' }}>
        {/* Gradient accent top */}
        <div className="h-1" style={{ background: 'linear-gradient(to right, var(--accent), var(--status-info), var(--status-success))' }} />

        {/* Content */}
        <div className="p-8 text-center">
          {/* Icon */}
          <div className="flex justify-center mb-6">
            {step.icon}
          </div>

          {/* Texts */}
          <h2 className="text-xl font-heading font-bold mb-3" style={{ color: 'var(--text-primary)' }}>
            {step.title}
          </h2>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            {step.description}
          </p>
        </div>

        {/* Footer */}
        <div className="px-8 pb-8">
          {/* Progress Dots */}
          <div className="flex justify-center gap-2 mb-6">
            {ONBOARDING_STEPS.map((_, idx) => (
              <div
                key={idx}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  idx === currentStep
                    ? 'w-8'
                    : idx < currentStep
                    ? 'w-1.5'
                    : 'w-1.5'
                }`}
                style={{
                  backgroundColor: idx === currentStep ? 'var(--accent)' : idx < currentStep ? 'var(--accent)' : 'var(--border)',
                  opacity: idx < currentStep ? 0.5 : 1
                }}
              />
            ))}
          </div>

          {/* Buttons */}
          <div className="flex gap-3">
            <button
              onClick={handleComplete}
              className="flex-1 py-3 text-sm font-medium transition-colors rounded-xl"
              style={{ color: 'var(--text-muted)' }}
            >
              Pular tour
            </button>
            <button
              onClick={handleNext}
              className="ds-btn ds-btn-primary flex-1 py-3 text-sm font-bold shadow-lg transition-all active:scale-[0.98]"
            >
              {isLast ? 'Começar a usar!' : 'Próximo'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
