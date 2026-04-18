import type { Config } from 'tailwindcss';
import typography from '@tailwindcss/typography';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        serif: [
          'var(--font-serif)',
          'Didot',
          'Bodoni 72',
          'Georgia',
          'serif',
        ],
        sans: [
          'var(--font-sans)',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'Helvetica',
          'Arial',
          'sans-serif',
        ],
      },
      colors: {
        ink: '#1e3a5f',   // navy periodistico
        paper: '#f0ebe0', // crema papel
        accent: '#c0392b',// rojo blip calido
        // Aliases utiles
        navy: '#1e3a5f',
        cream: '#f0ebe0',
      },
    },
  },
  plugins: [typography],
};

export default config;
