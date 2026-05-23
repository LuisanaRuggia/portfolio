import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

// `base` define el path desde el que se sirve el sitio. Para GitHub Pages
// publicado en `<usuario>.github.io/portfolio/`, debe coincidir con el
// nombre del repo. Si más adelante usás dominio custom, cambialo a '/'.
export default defineConfig({
  base: '/portfolio/',
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
