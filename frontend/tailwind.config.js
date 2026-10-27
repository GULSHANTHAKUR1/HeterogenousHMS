/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        heading: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        navy: {
          DEFAULT: '#0B2450',
          800: '#0B2450',
          900: '#071838',
          950: '#041026',
        },
        blue: {
          brand: '#1769E8',
          DEFAULT: '#1769E8',
          50: '#EDF5FF',
          100: '#D9EBFF',
          500: '#1769E8',
          600: '#1769E8',
          700: '#0F57C8',
        },
        mint: {
          DEFAULT: '#DDF7EC',
          50: '#F0FBF6',
          100: '#DDF7EC',
          border: '#A7F3D0',
          text: '#059669',
        },
        lavender: {
          DEFAULT: '#EFE7FF',
          50: '#F7F3FF',
          100: '#EFE7FF',
          border: '#D8C5FD',
          text: '#7C3AED',
        },
        coral: {
          DEFAULT: '#FEE2E2',
          border: '#FECDD3',
          text: '#DC2626',
        },
        brand: {
          50: '#EDF5FF',
          100: '#D9EBFF',
          500: '#1769E8',
          600: '#1769E8',
          700: '#0F57C8',
        },
        pastel: {
          blue: '#EDF5FF',
          'blue-border': '#D9EBFF',
          mint: '#DDF7EC',
          'mint-border': '#A7F3D0',
          purple: '#EFE7FF',
          'purple-border': '#D8C5FD',
        }
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.25rem',
      }
    },
  },
  plugins: [],
}
