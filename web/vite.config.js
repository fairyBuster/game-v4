import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5188,
    // the games/balance endpoints live in the Xaxino Casino-App backend
    proxy: { '/api': { target: 'http://127.0.0.1:8015', changeOrigin: true } },
  },
})
