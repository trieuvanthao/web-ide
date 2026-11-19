/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'vsc-bg': '#1e1e1e',
        'vsc-sidebar': '#252526',
        'vsc-activity': '#333333',
        'vsc-border': '#3c3c3c',
        'vsc-hover': '#2a2d2e',
        'vsc-selected': '#37373d',
        'vsc-text': '#d4d4d4',
        'vsc-dim': '#8a8a8a',
        'vsc-accent': '#0e639c',
        'vsc-accent-hover': '#1177bb',
        'vsc-status': '#007acc',
      },
    },
  },
  plugins: [],
};
