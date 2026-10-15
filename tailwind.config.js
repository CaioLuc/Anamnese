/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: ['selector', '[data-theme="dark"]'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Public Sans"', 'system-ui', '-apple-system', 'sans-serif'],
        heading: ['Newsreader', 'Georgia', 'serif'],
      },
      colors: {
        // Petróleo: cor da marca CARITAS (ações, seleção, foco)
        brand: {
          50: '#EEF7F6',
          100: '#D5ECE9',
          200: '#AED9D4',
          300: '#7FBFB8',
          400: '#4FA39B',
          500: '#2A877F',
          600: '#0E6B66',
          700: '#0B5753',
          800: '#0A4643',
          900: '#083835',
          950: '#04201F',
        },
        // Terracota: acento quente, uso pontual (destaques de marca, "hoje")
        clay: {
          50: '#FBF1EB',
          100: '#F5DECF',
          200: '#EBBE9F',
          300: '#E09E72',
          400: '#D9875A',
          500: '#C46A3D',
          600: '#A9532A',
          700: '#8A4222',
          800: '#6B331B',
          900: '#4D2513',
        },
        ds: {
          'bg-primary': 'var(--bg-primary)',
          'bg-secondary': 'var(--bg-secondary)',
          'bg-sidebar': 'var(--bg-sidebar)',
          'bg-card': 'var(--bg-card)',
          'text-primary': 'var(--text-primary)',
          'text-secondary': 'var(--text-secondary)',
          'text-muted': 'var(--text-muted)',
          'text-sidebar': 'var(--text-sidebar)',
          'text-sidebar-active': 'var(--text-sidebar-active)',
          'accent': 'var(--accent)',
          'accent-light': 'var(--accent-light)',
          'accent-hover': 'var(--accent-hover)',
          'border': 'var(--border)',
          'table-stripe': 'var(--table-stripe)',
          'badge-bg': 'var(--badge-bg)',
          'badge-text': 'var(--badge-text)',
          'input-bg': 'var(--input-bg)',
          'input-border': 'var(--input-border)',
          'success': 'var(--status-success)',
          'success-bg': 'var(--status-success-bg)',
          'success-text': 'var(--status-success-text)',
          'warning': 'var(--status-warning)',
          'warning-bg': 'var(--status-warning-bg)',
          'warning-text': 'var(--status-warning-text)',
          'danger': 'var(--status-danger)',
          'danger-bg': 'var(--status-danger-bg)',
          'danger-text': 'var(--status-danger-text)',
          'info': 'var(--status-info)',
          'info-bg': 'var(--status-info-bg)',
          'info-text': 'var(--status-info-text)',
        }
      },
      boxShadow: {
        'ds': 'var(--shadow)',
        'ds-lg': 'var(--shadow-lg)',
      },
      borderColor: {
        'ds': 'var(--border)',
      },
      borderRadius: {
        'ds': 'var(--radius)',
        'ds-sm': 'var(--radius-sm)',
      },
      transitionTimingFunction: {
        'out-expo': 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
      animation: {
        shimmer: "shimmer 1.6s linear infinite",
        'fade-up': "fade-up 260ms cubic-bezier(0.16, 1, 0.3, 1) both",
      },
      keyframes: {
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
        'fade-up': {
          "0%": { opacity: 0, transform: "translateY(6px)" },
          "100%": { opacity: 1, transform: "translateY(0)" },
        },
      }
    }
  },
  plugins: [],
}
