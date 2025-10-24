import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // HOLLY's Identity Colors
        'holly-purple': {
          50: '#faf5ff',
          100: '#f3e8ff',
          200: '#e9d5ff',
          300: '#d8b4fe',
          400: '#c084fc',
          500: '#a855f7',
          600: '#8B5CF6', // Primary
          700: '#7c3aed',
          800: '#6d28d9',
          900: '#5b21b6',
        },
        'holly-blue': {
          400: '#60a5fa',
          500: '#3B82F6', // Accent
          600: '#2563eb',
        },
        'holly-gold': {
          400: '#fbbf24',
          500: '#f59e0b',
        },
        'holly-bg': {
          darker: '#0A0A0A',
          dark: '#1A1A1A',
          medium: '#2A2A2A',
        }
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite',
      },
      keyframes: {
        glow: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-1000px 0' },
          '100%': { backgroundPosition: '1000px 0' },
        }
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'holly-gradient': 'linear-gradient(135deg, #8B5CF6 0%, #3B82F6 100%)',
        'holly-shimmer': 'linear-gradient(90deg, transparent, rgba(139, 92, 246, 0.5), transparent)',
      },
    },
  },
  plugins: [],
}

export default config
