/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./services/**/*.{js,ts,jsx,tsx}",
    "./*.{js,ts,jsx,tsx}"
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: 'rgb(var(--rgb-950) / <alpha-value>)',
        surface: 'rgb(var(--rgb-900) / <alpha-value>)',
        border: 'rgb(var(--rgb-800) / <alpha-value>)',
        white: 'rgb(var(--rgb-white) / <alpha-value>)',
        black: 'rgb(var(--rgb-black) / <alpha-value>)',
        primary: '#6366f1',
        secondary: '#0ea5e9',
        success: '#10b981',
        warning: '#f59e0b',
        danger: '#f43f5e',
        slate: {
          50: 'rgb(var(--rgb-50) / <alpha-value>)',
          100: 'rgb(var(--rgb-100) / <alpha-value>)',
          200: 'rgb(var(--rgb-200) / <alpha-value>)',
          300: 'rgb(var(--rgb-300) / <alpha-value>)',
          400: 'rgb(var(--rgb-400) / <alpha-value>)',
          500: 'rgb(var(--rgb-500) / <alpha-value>)',
          600: 'rgb(var(--rgb-600) / <alpha-value>)',
          700: 'rgb(var(--rgb-700) / <alpha-value>)',
          800: 'rgb(var(--rgb-800) / <alpha-value>)',
          900: 'rgb(var(--rgb-900) / <alpha-value>)',
          950: 'rgb(var(--rgb-950) / <alpha-value>)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      animation: {
        'fade-in-up': 'fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'pulse-glow': 'pulseGlow 3s infinite',
        'float': 'float 6s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite',
        'spin-slow': 'spin 8s linear infinite',
        'wiggle': 'wiggle 0.3s ease-in-out',
        'pulse-soft': 'pulse-soft 2s infinite',
        'icon-bounce': 'icon-bounce 0.5s ease-out',
        'bell-ring': 'bell-ring 2s ease-in-out infinite',
        'scale-pulse': 'scale-pulse 2s ease-in-out infinite',
        'heartbeat': 'heartbeat 1.5s ease-in-out infinite',
      },
      keyframes: {
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseGlow: {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.8', transform: 'scale(1.05)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '0.8', transform: 'scale(1)' },
          '50%': { opacity: '1', transform: 'scale(1.05)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
        wiggle: {
          '0%, 100%': { transform: 'rotate(-5deg)' },
          '50%': { transform: 'rotate(5deg)' },
        },
        'icon-bounce': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-4px)' },
        },
        'bell-ring': {
          '0%, 100%': { transform: 'rotate(0deg)' },
          '20%': { transform: 'rotate(-15deg)' },
          '40%': { transform: 'rotate(10deg)' },
          '60%': { transform: 'rotate(-5deg)' },
          '80%': { transform: 'rotate(2deg)' },
        },
        'scale-pulse': {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.1)' },
        },
        heartbeat: {
          '0%': { transform: 'scale(1)' },
          '14%': { transform: 'scale(1.15)' },
          '28%': { transform: 'scale(1)' },
          '42%': { transform: 'scale(1.15)' },
          '70%': { transform: 'scale(1)' },
        }
      }
    }
  },
  plugins: [],
}
