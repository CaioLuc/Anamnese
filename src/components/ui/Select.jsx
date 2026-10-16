import { useState, useRef, useEffect } from 'react';

export default function Select({ 
  value, 
  onChange, 
  options, 
  placeholder = "Selecione...", 
  disabled = false, 
  className = "",
  size = "md" // sm | md
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside, { passive: true });
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, []);

  const selectedOption = options.find(o => (typeof o === 'string' ? o : o.value) === value);
  const displayLabel = selectedOption ? (typeof selectedOption === 'string' ? selectedOption : selectedOption.label) : placeholder;

  const sizeClasses = {
    sm: "min-h-[32px] px-2.5 py-1 text-xs",
    md: "min-h-[42px] px-3 py-2 text-sm"
  };

  const handleKeyDown = (e) => {
    if (disabled) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setIsOpen((prev) => !prev);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div ref={containerRef} className={`relative ${className} ${disabled ? 'opacity-50 pointer-events-none' : ''}`}>
      <div 
        role="combobox"
        aria-expanded={isOpen}
        tabIndex={disabled ? -1 : 0}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        className={`ds-input cursor-pointer flex items-center justify-between w-full bg-[var(--bg-card)] ${sizeClasses[size]}`}
      >
        <span className={`truncate ${!value ? "text-[var(--text-muted)]" : "text-[var(--text-primary)]"}`}>
          {displayLabel}
        </span>
        <svg 
          className={`w-4 h-4 ml-2 shrink-0 text-[var(--text-muted)] transition-transform ${isOpen ? 'rotate-180' : ''}`} 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
      
      {isOpen && (
        <div 
          role="listbox"
          className="absolute left-0 right-0 z-50 w-full min-w-[140px] mt-1 bg-[var(--bg-card)] rounded-xl shadow-xl overflow-hidden py-1"
          style={{ border: '1px solid var(--border)' }}
        >
          <div className="max-h-60 overflow-y-auto custom-scrollbar">
            {options.map((opt, i) => {
              const val = typeof opt === 'string' ? opt : opt.value;
              const label = typeof opt === 'string' ? opt : opt.label;
              const isSelected = val === value;
              
              return (
                <div 
                  key={i}
                  role="option"
                  aria-selected={isSelected}
                  onClick={(e) => {
                    e.stopPropagation();
                    onChange(val);
                    setIsOpen(false);
                  }}
                  className={`px-3 py-2.5 sm:py-2 min-h-[42px] sm:min-h-0 text-sm cursor-pointer transition-colors flex items-center ${isSelected ? 'font-bold' : 'font-medium'}`}
                  style={{ 
                    backgroundColor: isSelected ? 'var(--accent-light)' : 'transparent',
                    color: isSelected ? 'var(--accent)' : 'var(--text-secondary)',
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.backgroundColor = 'var(--bg-secondary)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }
                  }}
                >
                  {label}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
