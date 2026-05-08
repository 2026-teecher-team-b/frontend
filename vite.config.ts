import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    // 개발 환경 CORS 해결 — 백엔드(8080)로 프록시
    proxy: {
      '/repos':  { target: 'http://localhost:8080', changeOrigin: true },
      '/auth':   { target: 'http://localhost:8080', changeOrigin: true },
      '/users':  { target: 'http://localhost:8080', changeOrigin: true },
      '/oauth2': { target: 'http://localhost:8080', changeOrigin: true },
      '/login':  { target: 'http://localhost:8080', changeOrigin: true },
      '/user':   { target: 'http://localhost:8080', changeOrigin: true },
    },
  },
})
