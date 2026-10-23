/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Unbounded"', 'system-ui', 'sans-serif'],
        sans: ['"Manrope"', 'system-ui', '-apple-system', 'sans-serif'],
      },
      colors: {
        brand: {
          50: '#FDF2F7',
          100: '#FCE7F1',
          200: '#FAD0E4',
          300: '#F5A8CC',
          400: '#EC73AC',
          500: '#E13D8B',
          600: '#D82376',
          700: '#BA1762',
          800: '#9A1652',
          900: '#801747',
        },
        ink: {
          900: '#111115',
          700: '#34343E',
          500: '#6B7280',
          400: '#9CA3AF',
        },
        surface: {
          soft: '#F7F7FA',
          muted: '#F1F2F6',
        },
      },
      boxShadow: {
        card: '0 2px 12px rgba(17, 17, 21, 0.04)',
        elevated: '0 12px 32px rgba(17, 17, 21, 0.08)',
        brand: '0 8px 22px rgba(216, 35, 118, 0.28)',
      },
    },
  },
  plugins: [],
};
