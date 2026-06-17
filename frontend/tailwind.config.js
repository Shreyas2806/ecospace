/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        eco: {
          50: '#f2fbf5',
          100: '#e2f7ea',
          200: '#c5eed4',
          300: '#97deaf',
          400: '#60c582',
          500: '#3ba760',
          600: '#2c8849',
          700: '#256c3c',
          800: '#205632',
          900: '#1b472b',
          950: '#0d2817',
        },
      },
    },
  },
  plugins: [],
}
