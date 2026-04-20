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
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        heading: ['Sora', 'Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
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
      },
      borderColor: {
        'ds': 'var(--border)',
      },
      animation: {
        blob: "blob 7s infinite",
        shimmer: "shimmer 2s linear infinite",
        fall: "fall linear infinite",
      },
      keyframes: {
        blob: {
          "0%": { transform: "translate(0px, 0px) scale(1)" },
          "33%": { transform: "translate(30px, -50px) scale(1.1)" },
          "66%": { transform: "translate(-20px, 20px) scale(0.9)" },
          "100%": { transform: "translate(0px, 0px) scale(1)" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
        fall: {
          "0%": { transform: "translateY(-10vh)", opacity: 0 },
          "10%": { opacity: 1 },
          "90%": { opacity: 1 },
          "100%": { transform: "translateY(110vh)", opacity: 0 },
        }
      }
    }
  },
  plugins: [],
}
