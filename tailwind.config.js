/** @type {import('tailwindcss').Config} */
export default {
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
          primary: '#f5f5f7',
          secondary: '#ffffff',
          tertiary: '#fafafa',
          elevated: 'rgba(255, 255, 255, 0.72)',
        },
        spatial: {
          text: '#1d1d1f',
          'text-secondary': '#6e6e73',
          'text-tertiary': '#86868b',
          border: 'rgba(0, 0, 0, 0.06)',
          'border-strong': 'rgba(0, 0, 0, 0.12)',
          accent: '#0071e3',
          'accent-hover': '#0077ed',
          'accent-subtle': 'rgba(0, 113, 227, 0.08)',
          'accent-light': 'rgba(0, 113, 227, 0.12)',
          success: '#34c759',
          'success-bg': 'rgba(52, 199, 89, 0.08)',
          'success-border': 'rgba(52, 199, 89, 0.20)',
          warning: '#ff9f0a',
          'warning-bg': 'rgba(255, 159, 10, 0.08)',
          'warning-border': 'rgba(255, 159, 10, 0.20)',
          error: '#ff3b30',
          'error-bg': 'rgba(255, 59, 48, 0.08)',
          'error-border': 'rgba(255, 59, 48, 0.20)',
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
