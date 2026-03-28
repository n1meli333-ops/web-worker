/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          red: '#DC2626',
          'red-light': '#EF4444',
          'red-dark': '#991B1B',
          dark: '#0A0A0A',
          'dark-2': '#111111',
          'dark-3': '#1A1A1A',
          'dark-4': '#222222',
          'dark-5': '#2A2A2A',
          gray: '#888888',
        }
      }
    },
  },
  plugins: [],
}
