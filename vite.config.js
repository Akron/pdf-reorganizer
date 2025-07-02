/// <reference types="vitest" />
import { defineConfig } from 'vite'
import { readFileSync, writeFileSync, unlinkSync } from 'fs'
import { join } from 'path'

// Plugin to move demo content to root during build
function demoBuildPlugin() {
  return {
    name: 'demo-build',
    writeBundle(options, bundle) {
      // After Vite has written all files, copy the transformed demo/index.html to the root
      const outputDir = options.dir || 'dist'
      const demoIndexPath = join(outputDir, 'demo', 'index.html')
      const rootIndexPath = join(outputDir, 'index.html')
      
      try {
        // Copy the already-transformed demo index.html to root
        const demoIndexContent = readFileSync(demoIndexPath, 'utf-8')
        writeFileSync(rootIndexPath, demoIndexContent)
        // Remove the original demo/index.html since it's no longer needed
        unlinkSync(demoIndexPath)
      } catch (error) {
        console.error('Failed to copy demo index.html:', error)
      }
    }
  }
}

export default defineConfig(({ command, mode }) => {
  const isGitHubPagesBuild = process.env.GITHUB_PAGES_BUILD === 'true'
  
  return {
    plugins: [demoBuildPlugin()],
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
    },
    build: {
      outDir: 'dist',
      rollupOptions: {
        input: 'demo/index.html'
      },
      assetsDir: 'assets'
    },
    // Use GitHub Pages base only when explicitly building for GitHub Pages
    base: isGitHubPagesBuild ? '/pdf-reorganizer/' : '/',
    publicDir: 'demo',
    preview: {
      port: 4174,
      strictPort: true
    }
  }
});
