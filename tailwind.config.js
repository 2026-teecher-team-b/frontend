/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // 우주 테마 컬러 팔레트
        space: {
          950: '#030712',
          900: '#0a0f1e',
          800: '#0f172a',
        },
        star: {
          blue: '#60a5fa',
          yellow: '#fbbf24',
          red: '#f87171',
          white: '#f8fafc',
        },
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
    },
  },
  plugins: [],
}
