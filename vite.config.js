/// <reference types="vitest" />
import { defineConfig } from 'vite'

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.js'],
    globals: true,
    coverage : {
      provider : 'istanbul' // or 'v8'
    },
  },
  define: {
    // Define globals for PDF.js to avoid legacy build warnings
    global: 'globalThis',
    // Ensure proper browser-like environment
    'process.env.NODE_ENV': '"test"',
  },
  optimizeDeps: {
    include: ['pdfjs-dist']
  }
});
