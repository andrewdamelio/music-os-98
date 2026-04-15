import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/music-os-98/',
  plugins: [react()],
  server: {
    port: 3456,
  },
})
