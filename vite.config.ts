// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // If using GitHub Pages under /<repo>/, set base:
  base: '/zenOut/', // <-- change to your repo name or remove if using a custom domain
  build: {
    outDir: 'docs'
  }
})
