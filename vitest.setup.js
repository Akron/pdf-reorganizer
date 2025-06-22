import 'vitest-canvas-mock';

// Polyfill Promise.withResolvers for environments that don't support it
// This must be done before any PDF.js imports
if (!Promise.withResolvers) {
  Promise.withResolvers = function() {
    let resolve, reject;
    const promise = new Promise((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return { promise, resolve, reject };
  };
}

// Also set it globally for consistency
globalThis.Promise = Promise;

// Set up environment variables for PDF.js
globalThis.process = globalThis.process || {};
globalThis.process.env = globalThis.process.env || {};
globalThis.process.env.NODE_ENV = 'test';

// Set up PDF.js worker to avoid legacy build warnings in tests
import { GlobalWorkerOptions } from 'pdfjs-dist';

// Configure PDF.js worker for test environment
// Use a simpler worker configuration that should work in all environments
GlobalWorkerOptions.workerSrc = `./node_modules/pdfjs-dist/build/pdf.worker.min.mjs`;

// Mock canvas-related operations for tests
Object.defineProperty(window, 'devicePixelRatio', {
  writable: true,
  value: 1,
});

// Mock ResizeObserver if not available
global.ResizeObserver = class ResizeObserver {
  constructor(cb) {
    this.cb = cb;
  }
  observe() {
    this.cb([{ borderBoxSize: { inlineSize: 0, blockSize: 0 } }], this);
  }
  unobserve() {}
  disconnect() {}
};