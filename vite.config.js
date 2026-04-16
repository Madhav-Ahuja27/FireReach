import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:8000',
      '/run-agent': 'http://localhost:8000',
      '/select-company': 'http://localhost:8000',
      '/send-email': 'http://localhost:8000',
    },
  },
})
