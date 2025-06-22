/// <reference types="vitest" />
import { defineConfig } from 'vite'

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.js'],
    coverage : {
      provider : 'istanbul' // or 'v8'
    },
  },
  define: {
    // Define globals for PDF.js to avoid legacy build warnings
    global: 'globalThis',
  }
});
