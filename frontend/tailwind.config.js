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
        brand: {
          50: '#f0fdfa',
          100: '#ccfbf1',
          200: '#99f6e4',
          500: '#14b8a6',
          600: '#0d9488',
          700: '#0f766e',
          800: '#115e59',
          900: '#134e4a',
        },
        navy: {
          800: '#0f2942',
          900: '#0b1d30',
          950: '#071321',
        },
        pastel: {
          blue: '#f0f7ff',
          'blue-border': '#dbeafe',
          mint: '#ecfdf5',
          'mint-border': '#a7f3d0',
          purple: '#faf5ff',
          'purple-border': '#e9d5ff',
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
