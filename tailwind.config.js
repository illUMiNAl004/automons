/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Fredoka', 'ui-rounded', 'system-ui', 'sans-serif'],
        display: ['Fredoka', 'ui-rounded', 'system-ui', 'sans-serif'],
      },
      colors: {
        // Per-element palette (DESIGN.md §14) — used for type badges & placeholder art.
        fire: '#f97316',
        nature: '#22c55e',
        water: '#3b82f6',
        earth: '#a16207',
      },
    },
  },
  plugins: [],
};
