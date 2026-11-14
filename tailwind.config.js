/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // --- AstroLink design system (see ASTROLINK design tokens) ---
        // Surfaces (dark space theme)
        surface: {
          base: '#080D1B',     // primary background
          panel: '#101A2D',    // secondary background
          card: '#17243A',     // card background
          elevated: '#1E2E48', // raised card / hover
          border: '#243550'    // hairline borders
        },
        // Accents
        brand: {
          DEFAULT: '#398BFF',  // primary accent
          soft: '#5AA2FF',
          cyan: '#36D6E7'      // secondary accent
        },
        // Text
        ink: {
          DEFAULT: '#F4F7FF',  // primary text
          soft: '#B7C4D8',     // secondary text
          muted: '#899BB5'     // muted text
        },
        // Semantic states
        state: {
          success: '#39D6A0',
          warning: '#FFBE55',
          error: '#FF6878'
        },
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
