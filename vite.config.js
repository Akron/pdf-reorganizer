/// <reference types="vitest" />
import { defineConfig } from 'vite'

export default defineConfig({
  test: {
    environment: 'jsdom',
    coverage : {
      provider : 'istanbul' // or 'v8'
    },
  }
});
