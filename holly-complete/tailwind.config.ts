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
        
        // Tesla/Apple Dark Theme
        'bg-primary': '#0A0A0A',
        'bg-secondary': '#1A1A1A',
        'bg-tertiary': '#2A2A2A',
        'bg-elevated': '#1F1F1F',
        
        // Text Hierarchy
        'text-primary': '#FFFFFF',
        'text-secondary': '#A0A0A0',
        'text-tertiary': '#6B6B6B',
        
        // Borders
        'border-primary': 'rgba(255, 255, 255, 0.1)',
        'border-secondary': 'rgba(255, 255, 255, 0.05)',
        
        // Status Colors
        'success': '#10B981',
        'warning': '#F59E0B',
        'error': '#EF4444',
        'info': '#3B82F6',
      },
      
      spacing: {
        'xs': '4px',
        'sm': '8px',
        'md': '12px',
        'lg': '16px',
        'xl': '24px',
        '2xl': '32px',
        '3xl': '48px',
        '4xl': '64px',
      },
      
      borderRadius: {
        'sm': '6px',
        'md': '8px',
        'lg': '12px',
        'xl': '16px',
      },
      
      boxShadow: {
        'sm': '0 1px 2px 0 rgba(0, 0, 0, 0.3)',
        'md': '0 4px 6px -1px rgba(0, 0, 0, 0.4)',
        'lg': '0 10px 15px -3px rgba(0, 0, 0, 0.5)',
        'xl': '0 20px 25px -5px rgba(0, 0, 0, 0.6)',
        'glow-purple': '0 0 20px rgba(139, 92, 246, 0.3), 0 0 40px rgba(139, 92, 246, 0.2)',
        'glow-blue': '0 0 20px rgba(59, 130, 246, 0.3), 0 0 40px rgba(59, 130, 246, 0.2)',
        'glow-gold': '0 0 20px rgba(245, 158, 11, 0.3), 0 0 40px rgba(245, 158, 11, 0.2)',
      },
      
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite',
        'slide-up': 'slide-up 0.3s ease-out',
        'slide-in-right': 'slide-in-right 0.3s ease-out',
        'fade-in': 'fade-in 0.2s ease-out',
      },
      
      keyframes: {
        glow: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-1000px 0' },
          '100%': { backgroundPosition: '1000px 0' },
        },
        'slide-up': {
          'from': { transform: 'translateY(10px)', opacity: '0' },
          'to': { transform: 'translateY(0)', opacity: '1' },
        },
        'slide-in-right': {
          'from': { transform: 'translateX(100%)', opacity: '0' },
          'to': { transform: 'translateX(0)', opacity: '1' },
        },
        'fade-in': {
          'from': { opacity: '0' },
          'to': { opacity: '1' },
        },
      },
      
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'holly-gradient': 'linear-gradient(135deg, #8B5CF6 0%, #3B82F6 100%)',
        'holly-shimmer': 'linear-gradient(90deg, transparent, rgba(139, 92, 246, 0.5), transparent)',
      },
      
      transitionDuration: {
        'fast': '150ms',
        'base': '200ms',
        'slow': '300ms',
      },
      
      letterSpacing: {
        'apple': '-0.011em', // Apple's optical spacing
      },
    },
  },
  plugins: [],
}

export default config
