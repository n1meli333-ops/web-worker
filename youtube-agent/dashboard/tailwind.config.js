/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        dark: {
          DEFAULT: '#0f0f0f',
          50: '#1a1a2e',
          100: '#16213e',
          200: '#1b2838',
          300: '#222831',
          400: '#2d3436',
        },
        accent: {
          DEFAULT: '#6c5ce7',
          light: '#a29bfe',
          dark: '#5f3dc4',
        },
        success: '#00b894',
        danger: '#e17055',
        warning: '#fdcb6e',
      },
    },
  },
  plugins: [],
};
