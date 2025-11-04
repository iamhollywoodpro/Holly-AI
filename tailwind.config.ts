import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Map CSS variables to Tailwind classes
        'holly-purple': {
          DEFAULT: '#8B5CF6',
          50: '#F5F3FF',
          100: '#EDE9FE',
          200: '#DDD6FE',
          300: '#C4B5FD',
          400: '#A78BFA',
          500: '#8B5CF6',
          600: '#7C3AED',
          700: '#6D28D9',
          800: '#5B21B6',
          900: '#4C1D95',
        },
        'holly-blue': {
          DEFAULT: '#3B82F6',
          50: '#EFF6FF',
          100: '#DBEAFE',
          200: '#BFDBFE',
          300: '#93C5FD',
          400: '#60A5FA',
          500: '#3B82F6',
          600: '#2563EB',
          700: '#1D4ED8',
          800: '#1E40AF',
          900: '#1E3A8A',
        },
        'holly-gold': {
          DEFAULT: '#F59E0B',
          50: '#FFFBEB',
          100: '#FEF3C7',
          200: '#FDE68A',
          300: '#FCD34D',
          400: '#FBBF24',
          500: '#F59E0B',
          600: '#D97706',
          700: '#B45309',
          800: '#92400E',
          900: '#78350F',
        },
        bg: {
          primary: '#0A0A0A',
          secondary: '#1A1A1A',
          tertiary: '#2A2A2A',
          elevated: '#1F1F1F',
        },
        text: {
          primary: '#FFFFFF',
          secondary: '#A0A0A0',
          tertiary: '#6B6B6B',
        },
        border: {
          primary: 'rgba(255, 255, 255, 0.1)',
          secondary: 'rgba(255, 255, 255, 0.05)',
        },
      },
      backgroundColor: {
        'bg-primary': '#0A0A0A',
        'bg-secondary': '#1A1A1A',
        'bg-tertiary': '#2A2A2A',
        'bg-elevated': '#1F1F1F',
      },
      textColor: {
        'text-primary': '#FFFFFF',
        'text-secondary': '#A0A0A0',
        'text-tertiary': '#6B6B6B',
      },
      borderColor: {
        'border-primary': 'rgba(255, 255, 255, 0.1)',
        'border-secondary': 'rgba(255, 255, 255, 0.05)',
      },
    },
  },
  plugins: [],
};

export default config;
