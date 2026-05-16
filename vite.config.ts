import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

const API_TARGET = process.env.VITE_PROXY_TARGET ?? 'https://api.gitgalaxy.org'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    // 개발 환경 CORS 해결 — EC2 백엔드로 프록시
    // 로컬 백엔드 쓰려면: VITE_PROXY_TARGET=http://localhost:8080 pnpm dev
    proxy: {
      '/repos':  { target: API_TARGET, changeOrigin: true },
      '/auth':   { target: API_TARGET, changeOrigin: true },
      '/users':  { target: API_TARGET, changeOrigin: true },
      '/oauth2': { target: API_TARGET, changeOrigin: true },
      '/login':  { target: API_TARGET, changeOrigin: true },
      '/user':   { target: API_TARGET, changeOrigin: true },
      '/admin':  { target: API_TARGET, changeOrigin: true },
    },
  },
})
