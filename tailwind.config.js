/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        nasa: {
          blue: '#0B3D91',
          red: '#FC3D21',
          dark: '#0c1445',
          light: '#1a237e'
        },
        space: {
          50: '#f0f4ff',
          100: '#e0e9ff',
          200: '#c7d6fe',
          300: '#a5b8fc',
          400: '#8b93f8',
          500: '#7c6df2',
          600: '#6d4ce6',
          700: '#5d3bcb',
          800: '#4c32a4',
          900: '#402d82',
          950: '#261b4f'
        }
      },
      animation: {
        'spin-slow': 'spin 3s linear infinite',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce-slow': 'bounce 2s infinite',
        'float': 'float 6s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite alternate'
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' }
        },
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(124, 109, 242, 0.5)' },
          '100%': { boxShadow: '0 0 20px rgba(124, 109, 242, 0.8)' }
        }
      },
      backgroundImage: {
        'space-gradient': 'linear-gradient(135deg, #0c1445 0%, #1a237e 100%)',
        'mars-gradient': 'linear-gradient(135deg, #cd5c5c 0%, #8b4513 100%)',
        'nebula-gradient': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
      }
    },
  },
  plugins: [],
}