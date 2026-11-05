/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          'Avenir',
          'Avenir Next',
          '-apple-system',
          'BlinkMacSystemFont',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
        mono: [
          'SF Mono',
          'JetBrains Mono',
          'Menlo',
          'Consolas',
          'monospace',
        ],
      },
      colors: {
        surface: {
          primary: 'var(--color-surface-primary)',
          secondary: 'var(--color-surface-secondary)',
          tertiary: 'var(--color-surface-tertiary)',
          elevated: 'var(--color-surface-elevated)',
        },
        spatial: {
          text: 'var(--color-spatial-text)',
          'text-secondary': 'var(--color-spatial-text-secondary)',
          'text-tertiary': 'var(--color-spatial-text-tertiary)',
          border: 'var(--color-spatial-border)',
          'border-strong': 'var(--color-spatial-border-strong)',
          accent: 'rgb(var(--spatial-accent-rgb) / <alpha-value>)',
          'accent-hover': '#0077ed',
          'accent-subtle': 'rgba(0, 113, 227, 0.08)',
          'accent-light': 'rgba(0, 113, 227, 0.14)',
          success: '#34c759',
          'success-bg': 'var(--color-success-bg)',
          'success-border': 'var(--color-success-border)',
          warning: '#ff9f0a',
          'warning-bg': 'var(--color-warning-bg)',
          'warning-border': 'var(--color-warning-border)',
          error: '#ff3b30',
          'error-bg': 'var(--color-error-bg)',
          'error-border': 'var(--color-error-border)',
        },
      },
      borderRadius: {
        'spatial-sm': '10px',
        'spatial': '14px',
        'spatial-lg': '20px',
        'spatial-xl': '24px',
      },
      boxShadow: {
        'spatial-xs': '0 0.5px 1px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.04)',
        'spatial-sm': '0 1px 3px rgba(0,0,0,0.04), 0 2px 8px rgba(0,0,0,0.04)',
        'spatial': '0 2px 8px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.04)',
        'spatial-md': '0 4px 12px rgba(0,0,0,0.05), 0 8px 24px rgba(0,0,0,0.05)',
        'spatial-lg': '0 8px 24px rgba(0,0,0,0.06), 0 16px 48px rgba(0,0,0,0.06)',
        'spatial-inset': 'inset 0 1px 2px rgba(0,0,0,0.06)',
      },
      backdropBlur: {
        'spatial': '20px',
        'spatial-lg': '40px',
      },
      animation: {
        'fade-in': 'fadeIn 0.25s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.97)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
    },
  },
  plugins: [],
}
