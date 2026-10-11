import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'

// One-off build used to produce a single self-contained HTML/JS/CSS bundle
// for publishing as a Claude Artifact. Not used for normal dev/deploy.
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  build: {
    outDir: 'dist-artifact',
    assetsInlineLimit: 100000000,
    cssCodeSplit: false,
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
        entryFileNames: 'bundle.js',
      },
    },
  },
})
